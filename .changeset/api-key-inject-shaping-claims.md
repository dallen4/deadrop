---
'cli': minor
'worker': minor
'shared': minor
---

Let a CI API key carry the shaping for the runs that use it. `deadrop apiKeys create` takes `--only` to name the secrets the key injects and `--prefix` to rename them, both optional. The claims travel with the key, so a pipeline sets `DEADROP_API_KEY` and gets the right variables under the right names without repeating the flags at every call site.

A run can narrow what the key allows but never widen it. `inject --only` may pick a subset of the key's list, and naming anything outside it fails rather than injecting it. An `inject --prefix` that disagrees with the key's warns and the key's prefix is used.

These claims shape what `inject` writes into the process, not what the key can read. Secrets never pass through the worker, so filtering happens on your machine, and a short lived Turso token covers the whole vault database. What actually separates environments is that each one has its own encryption key: a key issued for `production` cannot decrypt anything from `development`. Secret names and environment names are stored unencrypted and stay visible across environments, the same way a committed `.env.example` lists names without values.
