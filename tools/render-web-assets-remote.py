"""Render the pack over an already configured SSH connection; never installs services.

python3 tools/render-web-assets-remote.py --connection /private/connection.json --output /review/pack
Configuration keys: host, user, identity_file, known_hosts_file,
blender_executable, remote_workspace. Do not commit private connection settings.
"""
import argparse
import base64
import hashlib
import json
import re
import subprocess
import uuid
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--connection', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--generator', type=Path, default=Path(__file__).with_name('build_web_asset_pack.py'))
args = parser.parse_args()
script = args.generator.resolve()
if not script.is_file():
    raise SystemExit('Generator does not exist: '+str(script))
config = json.loads(args.connection.read_text())
out = args.output.resolve()
if out.exists():
    raise SystemExit('Choose a new output directory to preserve existing files.')
out.mkdir(parents=True)
options = ['-i', config['identity_file'], '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
           '-o', 'StrictHostKeyChecking=yes', '-o', 'UserKnownHostsFile='+config['known_hosts_file'],
           '-o', 'ConnectTimeout=10']
host = config['user']+'@'+config['host']
run = 'web-assets-'+uuid.uuid4().hex[:12]
remote = config['remote_workspace'].rstrip('/')+'/'+run

def quote_ps(value):
    return "'"+value.replace("'", "''")+"'"

def powershell(script, output=None):
    preamble = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $ProgressPreference='SilentlyContinue'; $ErrorActionPreference='Stop'; "
    encoded = base64.b64encode((preamble+script).encode('utf-16le')).decode()
    cmd = ['ssh', *options, host, 'powershell.exe', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded]
    if output:
        with output.open('wb') as log:
            result = subprocess.run(cmd, stdout=log, stderr=subprocess.STDOUT)
        result.check_returncode()
        return ''
    result = subprocess.run(cmd, capture_output=True, check=True)
    return result.stdout.decode('utf-8', errors='replace').strip()

powershell('New-Item -ItemType Directory -Path '+quote_ps(remote)+' | Out-Null')
helper = Path(__file__).with_name('build_web_asset_pack.py').resolve()
# Modern scp uses SFTP. Absolute Windows paths avoid assumptions about the SSH home.
subprocess.run(['scp', *options, str(script), host+':'+remote+'/'+script.name], check=True)
if script != helper:
    subprocess.run(['scp', *options, str(helper), host+':'+remote+'/'+helper.name], check=True)
log = out/'remote-render.log'
print('Rendering on the configured workstation. Log: '+str(log), flush=True)
powershell('& '+quote_ps(config['blender_executable'])+' --background --debug-cycles --python-exit-code 1 --python '+
           quote_ps(remote+'/'+script.name)+' -- '+quote_ps(remote+'/pack')+'; exit $LASTEXITCODE', log)
remote_hash = powershell('Compress-Archive -Path '+quote_ps(remote+'/pack/*')+' -DestinationPath '+
                        quote_ps(remote+'/pack.zip')+'; (Get-FileHash '+quote_ps(remote+'/pack.zip')+' -Algorithm SHA256).Hash')
assert re.fullmatch('[A-Fa-f0-9]{64}', remote_hash), remote_hash
archive = out/'remote-pack.zip'
subprocess.run(['scp', *options, host+':'+remote+'/pack.zip', str(archive)], check=True)
assert hashlib.sha256(archive.read_bytes()).hexdigest().lower() == remote_hash.lower(), 'Transfer hash mismatch'
with zipfile.ZipFile(archive) as z:
    for item in z.infolist():
        target = out/item.filename.replace('\\', '/')
        assert target.resolve().is_relative_to(out), 'Unsafe archive path'
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(z.read(item))
receipt = {'remote_run': run, 'archive_sha256': remote_hash.lower(), 'transfer_verified': True,
           'generator': script.name, 'generator_sha256': hashlib.sha256(script.read_bytes()).hexdigest(),
           'helper_sha256': hashlib.sha256(helper.read_bytes()).hexdigest()}
(out/'transfer-receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')
print('Downloaded and hash-verified: '+str(out), flush=True)
