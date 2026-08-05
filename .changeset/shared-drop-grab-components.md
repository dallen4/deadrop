---
'shared': minor
---

Extracted the drop/grab flow into reusable, headless pieces so a
platform only has to supply its own shell: `hooks/use-drop` and
`hooks/use-grab` drive the machines with platform deps injected via
context, and `components/` gained the Mantine drop/grab UI
(`DropFlow`, `GrabFlow`, `SharePane`, `GrabbersList`, and supporting
atoms/molecules) shared between `web` and the new `desktop` app.
