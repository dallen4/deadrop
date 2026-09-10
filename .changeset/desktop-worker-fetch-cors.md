---
'desktop': patch
---

Fix worker API calls failing in the desktop app. The webview origin (`tauri://localhost` in a packaged build, `http://localhost:1420` under `tauri dev`) is not in the worker's CORS allowlist, so anything the window sent to the API was blocked before it left. Requests to the API now leave from Rust through `@tauri-apps/plugin-http`, the same path Clerk already used, which sidesteps CORS instead of asking the worker to trust a desktop origin any caller could claim. This covers vault API keys, cloud vault provisioning and token issuance, and drop/grab session calls.

Packaged builds can also opt into the webview inspector with `pnpm tauri build --features devtools`. Plain release builds still ship without it, so right-click and the inspector hotkey do nothing there.
