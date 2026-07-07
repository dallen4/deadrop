---
"cli": patch
---

Fix broken `drop`/`grab` in the published v1.0.0 CLI.

TURN credentials were never baked into either compiled distribution
(the npm package's esbuild bundle, and the standalone Bun release
binaries), so every real install crashed on first peer connection with
`InvalidAccessError: IceServers username cannot be null`. Both build
scripts now require and bake `TURN_USERNAME`/`TURN_PWD` alongside the
other platform constants.

Also fixes the printed grab link pointing at the Worker API domain
instead of the web app — `deadrop drop`'s grab link/QR code now
resolves to a page a recipient can actually open.
