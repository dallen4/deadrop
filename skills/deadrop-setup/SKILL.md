---
name: deadrop-setup
description: Move a project's existing .env file into an encrypted deadrop vault and switch its scripts over to `deadrop inject`, so plaintext secrets stop living on disk. Use when the user wants to set up deadrop, adopt a secrets vault, get rid of a committed or lingering .env, or stop passing secrets around as files.
allowed-tools: Bash(deadrop --version), Bash(deadrop init:*), Bash(deadrop vault list:*), Bash(deadrop vault env:*), Bash(deadrop vault use:*), Bash(deadrop vault import:*), Bash(deadrop inject:*), Bash(git check-ignore:*), Bash(git status:*), Bash(ls:*), Bash(test:*), Read, Edit, Write
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
- **Never run `deadrop apiKeys create`.** It prints the key to stdout, once —
  running it here puts a live credential in the transcript and nowhere the
  user can retrieve it. Tell them to run it themselves.
- **Verify by name, never by value.** `--verbose` prints variable names only.

If you cannot complete a step without breaking one of these, stop and say so.

`allowed-tools` above deliberately lists individual subcommands rather than
`deadrop:*`, so `vault export`, `vault sync`, `secret add`, and `apiKeys` are
not permitted at all rather than merely discouraged. Keep it that way.

## Scope

This skill handles: *a project that already has a `.env`.*

It does not handle creating brand-new secrets from scratch — there is no
agent-safe input path for that yet (see the `secret add` rule above).

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
falls back to the user's global vault (shared with the desktop app). Importing
against that fallback would write the project's secrets into their global
vault, which is not what was asked.

## 2. Initialize

```bash
deadrop init -y
```

Creates `.deadroprc` and a `.deadrop/` vault directory, seeded with
`development` and `production` environments. `-y` also appends both to
`.gitignore`. Re-running is safe — an existing config is left alone.

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

## Common follow-ups

```bash
# run any one-off command with secrets present
deadrop inject -- <cmd>

# add an environment
deadrop vault env add staging

# share the vault with a teammate (needs a cloud vault; they run `deadrop grab`)
deadrop vault drop
```

## CI

CI skips the config file entirely. Two variables, nothing else:

```yaml
env:
  DEADROP_API_KEY: ${{ secrets.DEADROP_API_KEY }}
  DEADROP_VAULT_KEY: ${{ secrets.DEADROP_VAULT_KEY }}
run: deadrop inject --ci -- npm run build
```

The API key is scoped to one vault and one environment at issue time, so both
come off its claims — no `.deadroprc`, no `DEADROP_VAULT`, no
`DEADROP_ENVIRONMENT`. Each run mints its own read-only token that expires in
five minutes. `--ci` fails immediately naming whichever variable is missing,
rather than falling back to an interactive sign-in that cannot succeed in a
container. Needs 1.10.0.

The user issues the key themselves — see the hard rule above:

```
deadrop apiKeys create -v <vault> -e <environment>
```

`DEADROP_VAULT_KEY` is that environment's decryption key from `.deadroprc`,
which you must not read. Have them copy it out.

Secrets reach only the one command `inject` spawns, so each step that needs
them takes its own `deadrop inject --ci --` wrapper.
