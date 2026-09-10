---
'desktop': minor
---

Rework the actions on each secret in the desktop vault. The row had four cramped icon buttons; it now has three larger ones: reveal, edit, and an overflow menu. Editing opens a modal that renames the key and changes its value in one place, with the value masked until you toggle it.

The overflow menu adds two things. "Copy to" copies the secret to the clipboard or into another environment in the same vault, marking any environment that already holds a secret of that name so you can see it is a replacement before you click. "Drop secret" hands a single secret to the drop flow, rather than making you share the whole vault to send one value.

Clicking a secret name copies the name, and clicking a revealed value copies the value. Revealed values now render on their own line under the row and are clipped at the pane edge, so revealing a long secret no longer reflows the list.

The header also picks up a docs button that opens the documentation in your browser instead of navigating the app window away.
