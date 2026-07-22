# Pricing Tiers — deadrop

## Context

deadrop currently has a single vague "premium" Stripe link (lifetime license) in a commented-out `Premium.tsx` component, plus a hard-coded `DAILY_DROP_LIMIT=5` in the worker. There is no `/pricing` page, no tier comparison, no naming, and no structured feature breakdown.

This spec covers three things:
1. The four-tier product design
2. The Clerk Billing enforcement architecture (JWT claims, plan constants, worker helpers, webhooks)
3. The `/pricing` page implementation plan

---

## Tier Design

| Tier | Pricing | Core pitch |
|------|---------|------------|
| **Free** | $0 | Drops + local vaults |
| **Supporter** | **$15 one-time** | Solo dev with cloud vault + CI/CD injection |
| **Pro** | **$8/mo or $69/yr** | Delegate write access to collaborators |
| **Org** | **$6/seat/mo** (3-seat min) | Teams: SSO, RBAC, audit, service accounts |

### Naming rationale

"Supporter" replaces "Personal/Lifetime." Lifetime is a promise we can't underwrite (cost of indefinite Turso storage, support liability), but a one-time "Supporter" / "Founding" framing signals belief in the project without committing to perpetual support semantics.

### Capability axis

The axis between tiers is **who can touch the vault**, not "tokens vs. no tokens":

- **Supporter**: you and your machines (CLI, VSCode, CI/CD pipelines)
- **Pro**: you, your machines, *and other humans you delegate to* (capped at 5)
- **Org**: full team, SSO-backed, with first-class service accounts and audit

Service tokens for CI/CD are baseline from Supporter onward — gating pipeline injection behind a subscription feels punitive for the audience paying a one-time fee.

### Drops vs. vaults

Drops stay ephemeral one-shots. We deliberately **do not** offer custom drop expiry as a paid feature. If a user wants on-demand or repeated access to a secret, the answer is a vault, not a longer-lived drop. This keeps the two primitives semantically distinct:

- **Drop**: "send this secret once, then forget it"
- **Vault**: "share these secrets persistently with humans or machines, revocable"

Extending drops would blur that line and cannibalize the vault upsell path.

### Feature Matrix

| Feature | Free | Supporter | Pro | Org |
|---------|------|-----------|-----|-----|
| Daily drops | 5 | 15 | Unlimited | Unlimited |
| Local vaults | ✓ | ✓ | ✓ | ✓ |
| CLI access | ✓ | ✓ | ✓ | ✓ |
| VSCode extension | ✗ | ✓ | ✓ | ✓ |
| Cloud-synced vaults | ✗ | 1 vault | 3 vaults | Unlimited |
| Environments per vault | — | 3 (renamable) | Unlimited | Unlimited |
| CI/CD service tokens | ✗ | ✓ (cap: 10 active) | ✓ (unlimited) | ✓ (unlimited) |
| hCaptcha on drops | Yes | No | No | No |
| Read-only vault sharing (humans) | ✗ | ✗ | ✓ | ✓ |
| Write delegation to humans | ✗ | ✗ | ✓ (up to 5) | Unlimited |
| Audit log | ✗ | ✗ | Last 30d | Full + export |
| SSO | ✗ | ✗ | ✗ | ✓ |
| Role-based env access | ✗ | ✗ | ✗ | ✓ |
| Priority support | ✗ | ✗ | ✗ | ✓ |

---

## Billing Architecture

### Hybrid billing model

Clerk Billing handles Pro and Org natively. Supporter cannot be a Clerk Billing plan (Dashboard doesn't allow one-time purchases) — it uses direct Stripe Checkout + a webhook that sets `publicMetadata.plan = 'supporter'` on the Clerk user.

| Tier | Billing mechanism |
|------|------------------|
| Free | No plan (absence = Free) |
| Supporter | Stripe Checkout (one-time $15) → webhook → `publicMetadata.plan = 'supporter'` |
| Pro | Clerk Billing user plan |
| Org | Clerk Billing org plan |

### JWT claims — no API calls needed

Clerk embeds billing data directly in the session token JWT:
- `pla` — active plan slug (`u:pro` for user plans, `o:org_team` for org plans)
- `fea` — active feature slugs (e.g. `u:cloud_vault`)
- `public_metadata` — includes `{ plan: 'supporter' }` for Supporter users

The Cloudflare Worker reads these from `sessionClaims` via `@hono/clerk-auth`. No Clerk Backend API call needed on the hot path.

### Clerk Dashboard setup

**Membership mode**: set to **"Membership optional"** (Dashboard → Organizations settings). This is required because Free/Supporter/Pro are user-level (B2C) and Org is org-level (B2B). "Membership required" (the default) breaks personal accounts.

**User plans to create:**

| Plan slug | Pricing |
|-----------|---------|
| `pro` | $8/mo or $69/yr |

**Org plans to create:**

| Plan slug | Pricing | Seat limit |
|-----------|---------|------------|
| `org_team` | $6/seat/mo | 3-seat minimum |

**Features to create and attach to plans:**

| Feature slug | Supporter | Pro | Org | What it gates |
|---|---|---|---|---|
| `cloud_vault` | yes | yes | yes | Cloud-synced vault creation |
| `vscode_extension` | yes | yes | yes | VSCode extension access |
| `no_captcha` | yes | yes | yes | Skip hCaptcha on drops |
| `ci_tokens` | yes | yes | yes | CI/CD service token issuance |
| `vault_sharing_read` | no | yes | yes | Read-only vault sharing |
| `vault_sharing_write` | no | yes | yes | Write delegation (cap differs by plan) |
| `audit_log` | no | yes | yes | Audit log (30d at Pro, full at Org) |
| `sso` | no | no | yes | SSO (SAML/OIDC) |
| `rbac` | no | no | yes | Role-based environment access |
| `priority_support` | no | no | yes | Priority support |

Supporter features (`cloud_vault`, `vscode_extension`, `no_captcha`, `ci_tokens`) are **hardcoded** in `shared/config/plans.ts` since Supporter isn't a Clerk plan. Pro/Org features come from the `fea` JWT claim.

### Plan & feature constants — `shared/config/plans.ts` (new)

```ts
export const PLAN_SLUGS = {
  SUPPORTER: 'supporter',   // Stripe-only; stored in publicMetadata
  PRO: 'pro',               // Clerk Billing user plan
  ORG: 'org_team',          // Clerk Billing org plan
} as const

export const FEATURE_SLUGS = {
  CLOUD_VAULT:          'cloud_vault',
  VSCODE_EXTENSION:     'vscode_extension',
  NO_CAPTCHA:           'no_captcha',
  CI_TOKENS:            'ci_tokens',
  VAULT_SHARING_READ:   'vault_sharing_read',
  VAULT_SHARING_WRITE:  'vault_sharing_write',
  AUDIT_LOG:            'audit_log',
  SSO:                  'sso',
  RBAC:                 'rbac',
  PRIORITY_SUPPORT:     'priority_support',
} as const

// Numeric limits — not expressible as boolean features, enforced in code
export const PLAN_LIMITS = {
  free:      { dailyDrops: 5,        cloudVaults: 0,        envsPerVault: 0,        ciTokens: 0 },
  supporter: { dailyDrops: 15,       cloudVaults: 1,        envsPerVault: 3,        ciTokens: 10 },
  pro:       { dailyDrops: Infinity, cloudVaults: 3,        envsPerVault: Infinity, ciTokens: Infinity },
  org:       { dailyDrops: Infinity, cloudVaults: Infinity, envsPerVault: Infinity, ciTokens: Infinity },
} as const

// Supporter features hardcoded since Supporter isn't a Clerk Billing plan
export const SUPPORTER_FEATURES = [
  FEATURE_SLUGS.CLOUD_VAULT,
  FEATURE_SLUGS.VSCODE_EXTENSION,
  FEATURE_SLUGS.NO_CAPTCHA,
  FEATURE_SLUGS.CI_TOKENS,
] as const
```

### Worker billing helpers — `worker/src/lib/billing.ts` (new)

```ts
import { PLAN_LIMITS, SUPPORTER_FEATURES, FEATURE_SLUGS } from '@shared/config/plans'

type PlanKey = keyof typeof PLAN_LIMITS

export function getUserPlan(claims: Record<string, unknown>): PlanKey {
  const pla = claims.pla as string | undefined
  if (pla?.startsWith('u:')) return pla.slice(2) as PlanKey  // "u:pro" → "pro"
  if (pla?.startsWith('o:')) return pla.slice(2) as PlanKey  // "o:org_team" → "org"

  const metadata = claims.public_metadata as { plan?: string } | undefined
  if (metadata?.plan === 'supporter') return 'supporter'

  return 'free'
}

export function getPlanLimits(claims: Record<string, unknown>) {
  return PLAN_LIMITS[getUserPlan(claims)]
}

export function hasFeature(
  claims: Record<string, unknown>,
  feature: string,
): boolean {
  const plan = getUserPlan(claims)
  // Pro/Org: Clerk embeds features in the `fea` JWT claim
  const fea = claims.fea as string | undefined
  if (fea?.includes(feature)) return true
  // Supporter: check against hardcoded feature list
  if (plan === 'supporter') {
    return (SUPPORTER_FEATURES as readonly string[]).includes(feature)
  }
  return false
}
```

### Drop limit enforcement — `worker/src/lib/cache.ts`

Replace IP-based limiting with user-based:
- **Authenticated**: resolve plan via `getUserPlan(sessionClaims)` → look up `PLAN_LIMITS[plan].dailyDrops` → count per `userId` per day in KV
- **Unauthenticated**: keep IP-based limit at 5 (Free tier equivalent)

The KV key changes from `ip:<hash>:drops:<date>` to `user:<userId>:drops:<date>` for authenticated users.

### Feature gating in routes

```ts
// worker/src/routes/vault.ts
app.post('/vault', authMiddleware, async (c) => {
  const claims = getAuth(c)?.sessionClaims ?? {}
  if (!hasFeature(claims, FEATURE_SLUGS.CLOUD_VAULT)) {
    return c.json({ error: 'cloud_vault requires Supporter or above' }, 403)
  }
  const { cloudVaults } = getPlanLimits(claims)
  const existing = await countUserVaults(c, getAuth(c)!.userId!)
  if (existing >= cloudVaults) {
    return c.json({ error: 'vault limit reached for your plan' }, 403)
  }
  // ...
})
```

### Web: feature gating in UI

```tsx
// Server component (pages/drop.tsx or getServerSideProps)
const { has } = await auth()
const canShareVault = has({ feature: 'vault_sharing_read' })

// Client component
const { has } = useAuth()
has?.({ feature: 'ci_tokens' })
```

---

## Webhooks

Two handlers needed.

### a) Stripe webhook — `web/pages/api/webhooks/stripe.ts` (new)

Handles the Supporter one-time purchase flow:
- Event: `checkout.session.completed`
- Look up Clerk user by email from `session.customer_details.email`
- Set `publicMetadata.plan = 'supporter'` via `clerkClient.users.updateUser()`
- Verify with `stripe.webhooks.constructEvent()` (Stripe-Webhook-Signature header)
- Route must be public (no Clerk auth middleware)

After metadata update the user's next session token includes the plan — worker reads it from JWT claims.

### b) Clerk Billing webhook — `web/pages/api/webhooks/clerk-billing.ts` (new)

Handles Pro/Org subscription lifecycle:
- `subscription.created` / `subscription.active` → upsert subscription record (optional; JWT is the source of truth)
- `subscription.pastDue` → flag for grace period handling
- `subscriptionItem.canceled` → trigger any cleanup (e.g. lock cloud vaults)
- Verify with `verifyWebhook(req)` from `@clerk/nextjs/webhooks`
- Route must be public

---

## CI/CD Service Token Architecture

### Design principles

1. **Worker is an identity gateway, not a data path.** Same as drops — the Worker never sees plaintext.
2. **Two-factor for CI by construction**: API key (transport auth) + local config file (decryption material). Compromising one is useless.
3. **Same code path as the CLI.** CI is not a special mode — it's the CLI running with credentials from env vars + a mounted config file.

### Artifacts issued per service token

When a user creates a CI key in the dashboard they receive **two** things:

1. `deadrop-ci.json` — config file with the wrapped vault key (same shape as `~/.deadrop/config`). Mount as a file secret in the CI platform.
2. `drk_live_<random>` — the API key. Set as `DEADROP_API_KEY` env var in CI.

Both are required. Either alone is useless.

### Issue flow (server-side)

1. User clicks "Create CI key" → Worker:
   - Verifies `has({ feature: 'ci_tokens' })` + checks active token count against `PLAN_LIMITS[plan].ciTokens`
   - Mints a Turso token scoped to the vault DB
   - Generates `drk_live_<random>`
   - Derives `lookup_hash = HKDF(api_key, "lookup")`
   - Stores in KV: `lookup_hash → { vault_id, turso_token, created_at, last_used_at, label }`
   - Generates `deadrop-ci.json` with the vault's wrapped data key
2. Returns `{ deadrop-ci.json, drk_live_xxx }` to the user **once**. Neither is stored in plaintext server-side.

### Inject flow (CI-side, `deadrop inject -- pnpm build`)

1. CLI reads `DEADROP_API_KEY` + local `deadrop-ci.json`
2. CLI hits Worker `POST /service-tokens/exchange` with the API key
3. Worker computes `lookup_hash`, looks up KV row, returns a **short-lived Turso token** (15 min TTL)
4. CLI uses libSQL embedded replica sync to pull the vault DB locally
5. CLI decrypts rows locally using vault key from `deadrop-ci.json`
6. CLI injects plaintext env vars into the wrapped child process
7. On process exit, CLI tears down the local DB file

### Revocation

Delete the KV row → API key stops working immediately. Optionally revoke the underlying Turso token. The vault's data key and other tokens are untouched.

### What the Worker stores vs. doesn't

| | Stored | Not stored |
|---|---|---|
| API key (`drk_live_xxx`) | hash only | plaintext |
| `deadrop-ci.json` contents | ✗ | wrapped vault key (user's hands only) |
| Turso token (long-lived) | ✓ (KV, encrypted at rest) | ✗ |
| Plaintext secrets | ✗ | always client-side decryption |

---

## CLI Tier Awareness

- `lib/auth/clerk.ts` already holds the Clerk session — extend to read `pla`/`fea` claims (same `getUserPlan` / `hasFeature` helpers from `shared/config/plans.ts`)
- Gate `vault create --cloud` behind `ci_tokens` feature check
- Gate `vault sync` against `cloudVaults` limit
- Gate `deadrop inject` behind `ci_tokens` feature check
- Show plan name in `deadrop login` output

---

## Web: Pricing Page

### New files

- `web/pages/pricing.tsx` — page entry, no auth required
- `web/molecules/sections/PricingSection.tsx` — tier cards + comparison table + FAQ accordion (full, all 4 tiers)
- `web/molecules/sections/PricingSection.module.css`
- `web/molecules/sections/PricingTeaser.tsx` — home-page mini-teaser (3 cards, Free/Supporter/Pro)
- `web/molecules/sections/PricingTeaser.module.css`
- `web/molecules/PricingTierCard.tsx` — per-tier Mantine Card with CTA, used by both PricingSection and PricingTeaser
- `web/atoms/FeatureCheckmark.tsx` — check/dash/lock icon + label + optional tooltip
- `shared/config/tiers.ts` — single source of truth for tier data (consumed by both PricingSection and PricingTeaser; prevents drift)

### Modified files

- `shared/config/paths.ts` — add `export const PRICING_PATH = '/pricing'`
- `web/molecules/Header.tsx` — add "Pricing" nav link
- `web/molecules/sections/index.ts` — export `PricingSection` and `PricingTeaser`
- `web/pages/index.tsx` — replace commented `<Premium />` with `<PricingTeaser />`

### Deleted files

- `web/molecules/sections/Premium.tsx` — superseded by `PricingTeaser`. Hardcoded the lifetime Stripe link and used inline styles instead of CSS modules; cleaner to rewrite than refactor.

### Component design

**`FeatureCheckmark`** props: `label: string`, `included: boolean | 'partial'`, `tooltip?: string`. Icons: `IconCheck` (blue), `IconMinus` (dimmed), `IconLock` (partial/locked).

**`PricingTierCard`** — `Card withBorder shadow="md" radius="md" padding="xl"` (matches the "Grab a Secret" card on the home page). Props:
- `tierName`, `tagline`, `price`, `priceSubLabel?`
- `badge?: 'founding' | 'most-popular' | 'best-value'` → Mantine `Badge` positioned above title
- `features: Array<{ label, included, tooltip? }>` — rendered as a `Stack` of `FeatureCheckmark`s
- `ctaLabel`, `ctaHref?`, `ctaVariant: 'filled' | 'outline' | 'light'` — Mantine `Button` full-width
- `highlighted?: boolean` → 2px theme-blue border ring (Pro card); applied via CSS module class, not inline style
- `compact?: boolean` → shows `tagline` + price + first 3 features only (used by `PricingTeaser`)

**CTA behavior:**
- Free → `router.push(DROP_PATH)`
- Supporter → `window.location.href = process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_LINK`
- Pro → `<CheckoutButton planId="..." />` from `@clerk/nextjs/experimental`
- Org → "Contact Us" mailto (or `<CheckoutButton for="organization" />` if self-serve later)

**`PricingSection`** (full pricing page) renders:
1. `SectionTitle` ("Plans")
2. `SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl"` → four `PricingTierCard`s
3. Full-width `Table` comparison (mirrors `FeaturesSupport.tsx` pattern, same `<colgroup>` + compact-on-mobile via `useMediaQuery`)
4. `Accordion variant="separated"` with 3–4 FAQs (matches existing `Faq.tsx` component family)

Pro card shows both prices inline (`"$8/mo"` as `price`, `"or $69/yr — save 28%"` as `priceSubLabel`) — no monthly/annual toggle. A toggle only affects one card and adds mechanism for no information gain.

**`PricingTeaser`** (home page) renders:
1. `SectionTitle` ("Plans") with a small "See full comparison →" link to `/pricing`
2. `SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl"` → three `PricingTierCard`s for **Free, Supporter, Pro** (Org excluded — not the home-page audience)
3. Below the grid, a single `Center` with a subtle outlined `Button` → `/pricing` ("Compare all plans, including Org")

The teaser reuses `PricingTierCard` with a `compact` prop that trims the feature list to 3 items max, so the home page doesn't become a wall of text. Tier data is sourced from `shared/config/tiers.ts` so feature lists and prices can't drift between the two surfaces.

Placement on home page: replace the commented `<Premium />` at `web/pages/index.tsx:165`. Sits after `<FeaturesSupport />` and before the "Check out the Docs" button.

### Tier data constant — `shared/config/tiers.ts`

Single source of truth shared between `PricingSection` (full page) and `PricingTeaser` (home page). Lives in `shared/` so the CLI/VSCode extension can also reference tier copy in the future.

```ts
export const TIERS = [
  {
    tierName: 'Free', price: '$0',
    tagline: 'Get started with secure drops.',
    features: [
      { label: '5 drops/day', included: true },
      { label: 'Local vaults', included: true },
      { label: 'CLI access', included: true },
      { label: 'Cloud-synced vault', included: false },
      { label: 'VSCode extension', included: false },
      { label: 'CI/CD pipeline injection', included: false },
    ],
    ctaLabel: 'Start for Free', ctaVariant: 'outline',
  },
  {
    tierName: 'Supporter', price: '$15', priceSubLabel: 'one-time',
    tagline: 'Solo dev. Cloud vault + pipelines.',
    badge: 'founding',
    features: [
      { label: '15 drops/day', included: true },
      { label: '1 cloud vault (3 environments)', included: true },
      { label: 'VSCode extension', included: true },
      { label: 'CI/CD service tokens (up to 10)', included: true },
      { label: 'No captcha on drops', included: true },
      { label: 'Share write access with humans', included: false },
    ],
    ctaLabel: 'Become a Supporter', ctaVariant: 'filled',
    ctaHref: process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_LINK,
  },
  {
    tierName: 'Pro', price: '$8/mo', priceSubLabel: 'or $69/yr — save 28%',
    tagline: 'Delegate access to collaborators.',
    badge: 'most-popular',
    highlighted: true,
    features: [
      { label: 'Unlimited drops', included: true },
      { label: '3 cloud vaults (unlimited environments)', included: true },
      { label: 'Unlimited CI/CD service tokens', included: true },
      { label: 'Read-only sharing for humans', included: true },
      { label: 'Write delegation (up to 5 humans)', included: true },
      { label: '30-day audit log', included: true },
    ],
    ctaLabel: 'Go Pro', ctaVariant: 'filled',
  },
  {
    tierName: 'Org', price: '$6/seat/mo', priceSubLabel: '3-seat minimum',
    tagline: 'Teams with SSO, RBAC, and audit.',
    features: [
      { label: 'Unlimited everything', included: true },
      { label: 'SSO (SAML / OIDC)', included: true },
      { label: 'Role-based env access', included: true },
      { label: 'Service accounts as members', included: true },
      { label: 'Full audit log + export', included: true },
      { label: 'Priority support', included: true },
    ],
    ctaLabel: 'Contact Us', ctaVariant: 'light',
  },
]
```

---

## Migration Path

1. **Phase 1** — Add `shared/config/plans.ts`, deploy Stripe webhook handler, enable Clerk Billing in dev instance, create plans + features in Clerk Dashboard. No breaking changes.
2. **Phase 2** — Switch drop limit enforcement from IP-based to user-based (keep IP fallback for unauthenticated). Deploy `/pricing` page.
3. **Phase 3** — Wire feature gates in web UI + worker routes (`/vault`, `/service-tokens`).
4. **Phase 4** — Add Org tier: Clerk Organizations, `<OrganizationSwitcher />`, org-scoped vault access.
5. **Phase 5** — Remove old `premium: boolean` metadata flag and deprecated Stripe lifetime link.

**Existing lifetime purchasers**: run a one-time script to set `publicMetadata.plan = 'supporter'` on users who bought the old $15 license via Clerk Backend API (`clerkClient.users.updateUser`).

---

## Open Questions

1. **Org billing per-seat enforcement**: Clerk's org plan seat limit is enforced on invitations — confirm this covers service accounts too, or whether we need a secondary check.
2. **Stripe Checkout for Supporter**: confirm we're using a Payment Link (no Checkout Session server-side) to avoid needing a Next.js API route for the one-time purchase flow.

---

## Verification

1. `pnpm start` → `/pricing` renders four tier cards side-by-side on desktop, stacked on mobile
2. Pro card shows both monthly + annual prices inline (no toggle)
3. Home page renders `<PricingTeaser />` with three cards (Free/Supporter/Pro) plus "Compare all plans" button → `/pricing`
4. `PricingSection` and `PricingTeaser` show identical prices and feature labels (sourced from `shared/config/tiers.ts`)
5. "Become a Supporter" reads `NEXT_PUBLIC_STRIPE_SUPPORTER_LINK`
6. "Start for Free" navigates to drop page
7. Header shows "Pricing" nav link
8. `Premium.tsx` is deleted; no dangling import in `web/pages/index.tsx`
9. Free user: hits 5-drop daily limit; no cloud vault creation
10. Supporter metadata set via webhook: drop limit → 15, cloud vault creation allowed
11. Pro: `has({ feature: 'vault_sharing_read' })` returns true; `has({ feature: 'sso' })` false
12. Org: `has({ feature: 'sso' })` true; seat cap enforced on org invitations
13. CI token issuance blocked for Free users; count enforced for Supporter (cap: 10)

---

## Future Work (Backend — Out of Scope for Pricing Page)

- `POST /service-tokens` (issue), `DELETE /service-tokens/:id` (revoke), `POST /service-tokens/exchange` (short-lived Turso token) worker routes
- `deadrop inject -- <cmd>` CLI subcommand with libSQL embedded replica sync
- Dashboard UI: list tokens per vault, show last-used, copy-once for new tokens
- `vault_members` table for write delegation (Pro/Org): invite flow, role + wrapped vault key per member
- Audit log persistence (Turso or D1) with export endpoint for Org
- RBAC: env-level permissions stored alongside `vault_members`
