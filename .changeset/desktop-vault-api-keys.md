---
'desktop': minor
'shared': minor
---

Manage CI service tokens from the desktop app. Each environment in a cloud vault you own now splits into Secrets and API Keys sections: the API Keys section lists the keys already scoped to that vault and environment with their active, expired, or revoked state, and issues new ones without dropping to the CLI. A new key is shown once when it is created, since that is the only time it can be read back. A local vault, or a cloud vault shared with you, keeps the plain secrets list it had before, because neither has keys to manage.

Adding a secret moved into a dialog behind an "Add secret" row rather than a form sitting open at the bottom of the list, and both dialogs name the vault and environment being written to so a secret cannot be added to the wrong environment by accident.

`shared` gains the `AuthScopes` enum, previously worker-only, so any surface can name the scope it is filtering keys on.
