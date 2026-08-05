# shared

## 1.1.0

### Minor Changes

- 84acb4f: Extracted the drop/grab flow into reusable, headless pieces so a
  platform only has to supply its own shell: `hooks/use-drop` and
  `hooks/use-grab` drive the machines with platform deps injected via
  context, and `components/` gained the Mantine drop/grab UI
  (`DropFlow`, `GrabFlow`, `SharePane`, `GrabbersList`, and supporting
  atoms/molecules) shared between `web` and the new `desktop` app.

## 1.0.0

### Major Changes

- 3c4ef57: deadrop 1.0.0 — first stable platform release.

  Cloud vault subscription lifecycle: vaults are now locked (reads/writes
  blocked, tokens rotated) when a subscription is canceled and restored when
  it reactivates, driven by the Clerk billing webhook through a service-authed
  Worker endpoint. Turso provisioning + lifecycle helpers are consolidated into
  a single `shared/lib/turso` module.
