"""Check Herd's synchronous rebuild and current assets without a browser."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import socket
import time
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://cybershield.test/'
HTTP = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def get(path=''):
    with HTTP.open(BASE + path, timeout=45) as response:
        assert response.status == 200
        return response.read(), dict(response.headers)


try:
    with socket.create_connection(('127.0.0.1', 80), timeout=2):
        pass
except OSError:
    raise SystemExit('Herd is not listening on local port 80. Start Herd normally before running this HTTP check.')

probe = ROOT / 'public' / ('herd-check-' + uuid.uuid4().hex + '.txt')
try:
    probe.write_text('fresh-one')
    html, headers = get()
    assert headers.get('X-CyberShield-Build') == 'rebuilt', headers
    assert get(probe.name)[0] == b'fresh-one'
    assert get()[1].get('X-CyberShield-Build') == 'current'
    # Same length, changed contents: the source fingerprint must still detect it.
    probe.write_text('fresh-two')
    assert get()[1].get('X-CyberShield-Build') == 'rebuilt'
    assert get(probe.name)[0] == b'fresh-two'
finally:
    probe.unlink(missing_ok=True)
    get()  # Rebuild the real game after removing the temporary verification file.
html, headers = get()
assert headers.get('X-CyberShield-Build') == 'current'
assert b'/@vite/client' not in html
assets = json.loads((ROOT / 'art/island-landscape/asset-verification.json').read_text())['files']
paths = [''] + [p.removeprefix('./').lstrip('/') for p in re.findall(r'(?:src|href)="([^" ]+\.(?:js|css))"', html.decode())]
paths += [a['path'].lstrip('/') for a in assets]
assert len(paths) == len(assets) + 3
verified = []
for path in paths:
    data, response_headers = get(path)
    assert response_headers.get('Cache-Control') == 'no-store'
    expected = (ROOT / 'dist' / (path or 'index.html')).read_bytes()
    assert data == expected, path
    verified.append({'path': path or 'index.html', 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
agent = Path.home() / 'Library/LaunchAgents/com.merunex.cybershield.dev.plist'
assert not agent.exists()
state = subprocess.run(['launchctl', 'print', f'gui/{os.getuid()}/com.merunex.cybershield.dev'], capture_output=True)
assert state.returncode != 0
for port in [5187]:
    listener = subprocess.run(['lsof', '-nP', f'-iTCP:{port}', '-sTCP:LISTEN'], capture_output=True)
    assert listener.returncode == 1, listener.stdout.decode()
output = ROOT / 'art/island-landscape/herd'
output.mkdir(parents=True, exist_ok=True)
(output / 'verification.json').write_text(json.dumps({
    'checked_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'url': BASE, 'serving': 'production files through LocalValetDriver',
    'changed_file_rebuild': True, 'same_length_edit_detected': True,
    'unchanged_request_reuses_build': True, 'temporary_file_removed': True,
    'launch_agent_absent': True, 'vite_listener_absent': True,
    'files': verified, 'browser_render_checked': False,
}, indent=2))
print(f'PASS: on-request rebuilding, cache reuse, {len(paths)} HTTP file hashes, no Vite service or login agent')
