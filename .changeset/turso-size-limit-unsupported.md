---
'shared': patch
'worker': patch
---

Turning a local vault into a cloud vault works again. Turso stopped accepting a size limit on new databases, and the worker was deleting the new vault when it refused.
