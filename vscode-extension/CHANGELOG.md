# deadrop-vsc

## 0.1.7

### Patch Changes

- Updated dependencies [9786cb6]
  - shared@1.3.0

## 0.1.6

### Patch Changes

- 6dfbfb2: Vault sync URLs are now derived from the vault's remote name rather than stored in `.deadroprc`. Existing configs keep working with no migration, since the derived URL is identical to the one previously written. Importing a cloud vault also allocates a fresh local replica path instead of trusting the sender's, which fixes vaults imported from another machine.
- Updated dependencies [6dfbfb2]
- Updated dependencies [bb15b91]
- Updated dependencies [6dfbfb2]
  - shared@1.2.0

## 0.1.5

### Patch Changes

- Updated dependencies [84acb4f]
  - shared@1.1.0

## 0.1.4

### Patch Changes

- 739f85b: Fix vault row action buttons rendering literal `\uXXXX` text instead of their icons — bare unicode escapes in JSX text nodes aren't parsed as string escapes; wrap them in expressions.

## 0.1.3

### Patch Changes

- Updated dependencies [3c4ef57]
  - shared@1.0.0
