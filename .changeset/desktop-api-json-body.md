---
'desktop': patch
---

Requests to the deadrop API keep their JSON body. The desktop's API client dropped `Content-Type`, so the worker ignored what was sent: sync tokens came back read-only even when Full access was chosen and were scoped to the default vault, cloud vaults were provisioned under the default name, and API keys lost their vault and environment.
