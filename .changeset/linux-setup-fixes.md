---
'cli': patch
---

Three Linux setup fixes found while building the Linux sandbox:

- The keychain-unavailable message no longer hardcodes `apt-get` — it now lists the Ubuntu/Debian, Fedora/RHEL, and Arch commands, matching what `install.sh` already prints. Fedora and Arch users were being told to run a command that doesn't exist on their system.
- Desktop AppImage selection is now architecture-aware in both `deadrop desktop install` and `install-desktop.sh`. Previously either would take the first `.AppImage` on a release regardless of arch, which would have handed x64 users an aarch64 binary as soon as a second Linux build shipped. A release with no build for your platform now says so explicitly instead of reporting "no release found".
- `deadrop init` accepts `-y`/`--yes` and skips its `.gitignore` prompt automatically in a non-TTY shell or when `CI` is set, so it can complete unattended in Dockerfiles, CI, and provisioning scripts.
