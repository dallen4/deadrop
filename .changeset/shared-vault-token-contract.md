---
'shared': minor
---

Add a single schema for the vault token mint responses, so the worker binds to it when building a response and the CLI parses against it when reading one. A field renamed on one side now fails the worker build and, if it reaches the wire anyway, throws in the CLI instead of yielding undefined credentials and an unauthenticated sync.

`createVaultUtils` also takes the API token first and defaults the Turso organization to the shared constant, removing the org argument from every call site.
