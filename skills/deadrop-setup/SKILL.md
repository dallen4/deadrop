---
name: deadrop-setup
description: Move a project's existing .env file into an encrypted deadrop vault and switch its scripts over to `deadrop inject`, so plaintext secrets stop living on disk. Use when the user wants to set up deadrop, adopt a secrets vault, get rid of a committed or lingering .env, or stop passing secrets around as files.
allowed-tools: Bash(deadrop --version), Bash(deadrop whoami:*), Bash(deadrop init:*), Bash(deadrop vault list:*), Bash(deadrop vault create:*), Bash(deadrop vault env:*), Bash(deadrop vault use:*), Bash(deadrop vault import:*), Bash(deadrop inject:*), Bash(deadrop desktop install:*), Bash(git check-ignore:*), Bash(git status:*), Bash(ls:*), Bash(test:*), Read, Edit, Write
---

# deadrop setup from an existing .env

Imports an existing `.env` into an encrypted local vault, then rewrites the
project's scripts to run through `deadrop inject`. Secrets are decrypted
in-memory into the child process — nothing plaintext is written back to disk.

## Hard rules

These are the point of the skill. Breaking one leaks the secrets you were
asked to protect.

- **Never read `.env`** (or `.env.*`) — not with Read, not `cat`, not `grep`.
  You pass its *path* to deadrop. You never need its contents.
- **Never read `.deadroprc`.** The vault is encrypted, but the per-environment
  keys are stored in this file in plaintext. Reading it puts them in the
  transcript.
- **Never run `deadrop vault export` or `deadrop vault sync`.** Both write
  decrypted secrets to a plaintext file, which is the state you are removing.
- **Never run `deadrop secret add NAME VALUE`.** The value goes in argv, which
  means it lands in shell history and in this transcript. If a secret is not
  already in a file, stop and ask the user to add it themselves (in Claude
  Code they can run `! deadrop secret add NAME VALUE`).
- **Never run `deadrop apiKeys create`.** Since 1.11.0 the CLI defends itself
  here (it refuses a non-interactive stream, and needs `--print` to pipe), so
  you will get an error rather than a leak. Have the user run it anyway: the
  key is shown once, and a run you own is a run they cannot read.
- **Verify by name, never by value.** `--verbose` prints variable names only.

If you cannot complete a step without breaking one of these, stop and say so.

`allowed-tools` above deliberately lists individual subcommands rather than
`deadrop:*`, so `vault export`, `vault sync`, `secret add`, and `apiKeys` are
not permitted at all rather than merely discouraged. Keep it that way.

## Scope

This skill handles: *a project that already has a `.env`.*

It does not handle creating brand-new secrets from scratch, because you have no
agent-safe input path for a value (see the `secret add` rule above). The user
does: `! deadrop secret add NAME VALUE` in Claude Code, or "Add secret" on the
desktop vault page. Point them at one and carry on.

Importing a `.env` is CLI-only. The desktop app imports a vault, not an env
file, so the steps below stay on the CLI even for a desktop user.

## 1. Check state

```bash
deadrop --version                 # is the CLI installed, and new enough?
test -f .env && echo "env present"
test -f .deadroprc && echo "project config present"
```

Decide from the results:

| State | Action |
|---|---|
| No CLI | Stop. Have the user install it: `curl -fsSL https://deadrop.io/install.sh \| sh` |
| Version < 1.8.0 | Stop. Have the user run `deadrop update`. See the warning below. |
| No `.env` | Stop. This skill needs an existing file — ask which file holds their secrets. |
| No `.deadroprc` | Go to step 2. |
| `.deadroprc` present | Skip step 2, go to step 3. |

**1.8.0 is a hard minimum.** `deadrop init` only learned `-y` and the
non-interactive guard in 1.8.0. On an older CLI the `init` in step 2 blocks on a
`.gitignore` confirmation prompt that a non-interactive shell can never answer,
so it hangs rather than failing — check the version, do not just check that the
binary exists.

Test for `.deadroprc` **as a file in the project directory**. Do not infer it
from a deadrop command succeeding — when no project config exists, deadrop
falls back to the user's global vault (shared with the desktop app). Landing in
that fallback is a fine outcome if the user chose it in step 2, and a bad one
if you drifted into it, so establish which config you are writing to before you
import.

## 2. Pick a scope, then initialize

**Ask the user which they want before running anything.** This decides where
the vault lives, and there is no supported move afterwards that does not go
through `vault export`, which you must not run.

| | Project | Global |
|---|---|---|
| Command | `deadrop init -y` | `deadrop init --global` (1.11.0) |
| Config lands in | `.deadroprc` in the repo | OS app-data directory |
| Reach | this directory | every directory with no `.deadroprc` |
| Trade | encapsulation | ease of use |

**Recommend project when the secrets belong to the repo.** Each project gets
its own vault and environments, values cannot bleed between codebases, and the
config sits gitignored next to the code it serves. This is what you want for
anything with teammates, with CI, or with more than one set of credentials.

**Recommend global when it is one person with one set of secrets.** It is the
config the CLI falls back to anywhere, and the same one the desktop app reads,
so secrets are available everywhere with no per-repo setup and nothing to
gitignore.

Default to project when the user has no preference. It is the reversible
direction: a global vault can be added later, while pulling one project's
secrets back out of a shared global vault means exporting them to plaintext,
which this skill will not do.

Either way you get a vault seeded with `development` and `production`
environments. Re-running is safe, an existing config is left alone. `-y` on the
project path also appends `.deadroprc` and `.deadrop/` to `.gitignore`; the
global path has nothing to ignore and never prompts.

The vault this creates is **local**. That is all `inject` needs. Cloud is only
required for sharing and for CI keys, and step 6 covers it.

## 3. Import

```bash
deadrop vault import ./.env
```

Encrypts every variable into the **active environment** (`development` after a
fresh `init`). It prints a count, not the values.

For a second file, switch environments and restore afterwards:

```bash
deadrop vault list                # active vault is marked *  (e.g. "default")
deadrop vault env list            # active environment is marked *
deadrop vault use default -e production
deadrop vault import ./.env.production
deadrop vault use default -e development   # restore the original active env
```

**Always pass the vault name to `vault use`.** Omitting it opens an interactive
picker that will hang a non-interactive shell. Take the name from `vault list`
— it is `default` after a fresh `init`.

Always restore the environment the user started on. Leaving them switched is a
surprising side effect.

## 4. Verify

```bash
deadrop inject --verbose -- true
```

Prints the injected count and the variable *names*. Confirm they match what the
user expects to see. `true` is a no-op that just gives inject something to
wrap, and it keeps this step working in projects that have a `.env` but no
Node.

Do not proceed to step 5 until this succeeds. Step 5 deletes the only
plaintext copy.

## 5. Hand off

Two things, in this order.

**Rewrite the scripts** that consume the env so they go through inject. In
`package.json`:

```json
{
  "scripts": {
    "dev": "deadrop inject -- next dev",
    "build": "deadrop inject -- next build"
  }
}
```

Anything that used to depend on a `.env` being present on disk (dotenv loading,
`--env-file`, a compose file, a Procfile) needs the same treatment, or it will
silently run without secrets once the file is gone.

**Then remove the `.env`.** Confirm with the user first — the vault is now the
only copy, and this is not reversible from here. Make sure it is gitignored
either way:

```bash
git check-ignore -q .env && echo ignored
```

If it was ever committed, say so plainly — it is in the git history and
rotating those values is the only real fix. Removing the working-tree file does
not undo that.

## 6. CI (optional)

**An API key needs a cloud vault.** `apiKeys create` only offers vaults marked
`cloud`, and a local one from step 2 is not eligible. If the user wants CI,
that comes first:

```bash
deadrop vault create <name> --cloud     # needs `deadrop login`
```

Then CI skips the config file entirely. Two variables, nothing else:

```yaml
env:
  DEADROP_API_KEY: ${{ secrets.DEADROP_API_KEY }}
  DEADROP_VAULT_KEY: ${{ secrets.DEADROP_VAULT_KEY }}
run: deadrop inject --ci -- npm run build
```

The API key is scoped to one vault and one environment at issue time, so both
come off its claims. No `.deadroprc`, no `DEADROP_VAULT`, no
`DEADROP_ENVIRONMENT`. Each run mints its own read-only token that expires in
five minutes. `--ci` fails immediately naming whichever variable is missing,
rather than falling back to an interactive sign-in that cannot succeed in a
container. Needs 1.10.0. Do not pair it with `--no-sync`; `--ci` already reads
the vault directly.

The user issues the key themselves. See the hard rule above:

```
deadrop apiKeys create -v <vault> -e <environment> --copy
```

**`--copy` is the one to recommend** (1.11.0). It puts *both* variables on the
clipboard and prints only the key's name, so nothing sensitive reaches the
terminal or this transcript. Without it the pair is shown on an alternate
screen that leaves no scrollback. `--print` writes to stdout and only exists
for deliberate piping.

As of 1.11.0 `apiKeys create` hands back `DEADROP_VAULT_KEY` alongside the key.
Do not send the user digging it out of `.deadroprc`, which you must not read
anyway. Older CLIs printed the key alone.

Secrets reach only the one command `inject` spawns, so each step that needs
them takes its own `deadrop inject --ci --` wrapper.

## Desktop app

The desktop app and the CLI are two faces of one vault, so a user on both does
not set up twice.

```bash
deadrop desktop install     # 1.5.0; macOS, Windows, Linux
```

- **They share the global config.** With no project `.deadroprc`, the CLI falls
  back to the OS app-data config the desktop app writes. This is exactly the
  fallback step 1 warns you not to import into by accident.
- **A project vault shows up in the app** via "Import vault" on the vault page,
  which points at the `.deadroprc` you created in step 2.
- **API keys have a UI now** (desktop 0.4.0). A cloud vault the user owns
  splits each environment into Secrets and API Keys, and "Add API key" issues
  one against the same route as `apiKeys create`. Offer it as the alternative
  to step 6, since it keeps the key off their terminal entirely.
- **New secrets have a UI too**, under "Add secret". That is the agent-safe
  input path the Scope section points at.
- **Sharing** is "Share vault" in the app or `deadrop vault drop` (1.9.0). Both
  mint a read-only expiring token and hand it over a normal drop; the recipient
  runs `deadrop grab` or takes "Add to my vaults" on the desktop grab screen.
  Owner only, and the vault must be cloud.

A user who picked global in step 2 gets the most out of the app, since it is
the same config on both sides. A project vault still shows up, it just has to
be imported once.

## Common follow-ups

```bash
# run any one-off command with secrets present
deadrop inject -- <cmd>

# add an environment
deadrop vault env add staging

# inject a subset, or namespace what you inject
deadrop inject --only DATABASE_URL,REDIS_URL -- <cmd>
deadrop inject --prefix VITE_ -- <cmd>

# let real env vars win over vault values (default is vault wins)
deadrop inject --no-override -- <cmd>

# share the vault with a teammate (needs a cloud vault; they run `deadrop grab`)
deadrop vault drop
```
