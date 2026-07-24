---
'deadrop-vsc': patch
---

Fix vault row action buttons rendering literal `\uXXXX` text instead of their icons — bare unicode escapes in JSX text nodes aren't parsed as string escapes; wrap them in expressions.
