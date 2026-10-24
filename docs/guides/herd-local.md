# Local game in Herd, without a background development server

Open http://cybershield.test with Herd running. The domain links directly to this
working checkout. `LocalValetDriver.php` serves the production assets from `dist`.
There is no Vite watcher, Node server, proxy, scheduled task or login LaunchAgent.

On an HTML request, `tools/herd/index.php` fingerprints source files, public assets,
package/lock files and build configuration. If they changed, it runs TypeScript and
Vite synchronously, then serves the new build. Node exits when the build finishes.
If nothing changed, it serves the current build immediately. A build lock prevents
concurrent page requests from starting duplicate builds. Build errors return HTTP
503 and keep their diagnostics in `.herd-local/build.log` instead of silently
presenting an outdated version. Failed builds are retried on the next page request.

Refresh the page after edits; the first request following an edit may take a few
seconds. This always reflects local files, including uncommitted changes; it does
not pull GitHub changes or switch branches automatically. Node is expected at
`/usr/local/bin/node` or `/opt/homebrew/bin/node`. Install dependencies once with
`npm install`, then run `herd link cybershield` from this repository.

The local cache is `.herd-local/` (git-ignored). Remove it to force a rebuild.
`npm run build` remains available for manual builds. To disconnect the site,
run `herd unlink cybershield`. No project copy is created or moved.

Browser saves belong to their origin: progress at localhost:4173 or localhost:3000
remains there and is not automatically transferred to cybershield.test.

Future work in this checkout should retain this driver and request the Herd URL
once after changes to verify that the local build is current. Do not install a
persistent server, watcher or launch agent: the user explicitly rejected them.

## Initial setup verification on 24 October 2026

Herd resolves the domain to loopback and selects `LocalValetDriver`. PHP syntax,
TypeScript and production build checks pass. HTTP verification matches HTML, JS,
CSS and all thirteen model files against `dist` (16 files total). Static responses
use `Cache-Control: no-store` to avoid stale models with stable filenames.

Changed source/public contents trigger a rebuild, including same-length edits;
unchanged requests reuse the build. Concurrent requests build once. A deliberate
TypeScript error returns 503, and correcting the file recovers. Verification files
are removed afterwards. The removed LaunchAgent remains absent and port 5187 has
no listener. No browser rendering or FPS check was performed.

Evidence is in `art/herd-local/`. Repeat the HTTP/cache/no-service check with
`python3 tools/verify-herd.py`; it uses a temporary public file and cleans it up.

## Evening graphics update on 24 October 2026

The current model manifest has 14 GLBs (17 HTTP files including HTML, JS and CSS).
`tools/verify-herd.py` now reads `art/evening-island/asset-verification.json` and
writes new evidence to `art/evening-island/herd/`, preserving the earlier report.
Herd was stopped during this update: DNS resolution failed and port 80 refused a
direct loopback connection. It was not started automatically. The same PHP build
entry was run synchronously through CLI, producing a current `dist` and cache;
all 14 copied model hashes were checked. This does not constitute a new HTTP or
browser check. Start Herd normally and open the existing domain to play.
