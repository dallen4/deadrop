# CLAUDE.md — web/

Next.js 14 (Pages Router) PWA deployed on Vercel. All WebRTC/crypto logic lives in `shared/`; this package handles UI, auth, and page routing.

## Commands

```bash
pnpm start          # Dev server on localhost:3000
pnpm build          # Production build
pnpm test:e2e       # Playwright e2e tests (requires running dev server)
pnpm vitest run --project web   # Unit tests only
```

## Directory Structure

```
web/
├── pages/              # Next.js Pages Router
│   ├── _app.tsx        # App shell: Clerk, Sentry, Mantine theming
│   ├── _document.tsx   # Custom document (security headers)
│   ├── drop.tsx        # Drop page → organisms/DropFlow
│   ├── grab.tsx        # Grab page → organisms/GrabFlow
│   ├── vault.tsx       # Vault management
│   ├── pricing.tsx     # Pricing tiers page
│   ├── index.tsx       # Landing page
│   ├── auth/           # Clerk auth pages
│   ├── api/            # captcha.ts (hCaptcha), stripe/checkout.ts, webhooks/{stripe,clerk-billing}.ts
│   └── docs/           # MDX documentation pages
├── atoms/              # Primitive UI components (QRCode, Captcha, Footer, etc.)
├── molecules/          # Composite components (Header, Layout, HeroBanner, SharePane, PricingTierCard, etc.)
├── organisms/          # Feature orchestrators (DropFlow.tsx, GrabFlow.tsx)
├── hooks/              # Custom React hooks
│   ├── use-drop.tsx       # Drives dropMachine from shared
│   ├── use-grab.tsx       # Drives grabMachine from shared
│   ├── use-api-headers.tsx# Builds Authorization header from Clerk token; shared by use-drop/use-grab
│   ├── use-vault.tsx      # Vault state
│   ├── use-worker.tsx     # Web Worker communication
│   └── use-mobile.tsx     # Mobile detection
├── contexts/           # React contexts (DropContext.tsx)
├── config/             # Environment & feature flags
├── types/              # Web-specific types (contexts, captcha, peerjs.d.ts, etc.)
├── tests/
│   ├── e2e/            # Playwright specs (drop-flow, drop-text-init)
│   └── unit/           # Vitest unit tests
├── next.config.mjs
├── playwright.config.ts
├── tsconfig.json
├── vitest.config.mts
└── sentry.{client,server,edge}.config.js
```

## Component Hierarchy

`atoms/` → `molecules/` → `organisms/`

- **atoms**: No business logic, pure presentational
- **molecules**: Composite UI without full-feature orchestration
- **organisms**: Full feature flows — `DropFlow.tsx`, `GrabFlow.tsx` consume XState machines via hooks

## State Management

Drop/Grab flows are driven by XState machines from `shared/lib/machines/`:

```
pages/drop.tsx
  └── organisms/DropFlow.tsx
        └── hooks/use-drop.tsx  ← drives dropMachine (XState)
```

Never manage drop/grab session state with local React state — use the XState machine.

## Path Aliases (tsconfig.json)

- `@shared/*` → `../shared/*`
- `@api/*` → `../worker/*`
- `@config/*` → `config/*`

## Testing

### E2E (Playwright)
- Config: `playwright.config.ts`
- 11 browser projects: chromium, firefox, webkit, mobile variants, cross-browser combos
- WebKit cross-browser tests are **disabled** (Playwright WebRTC limitation — see issue #97)
- Auto-starts dev server on port 3000
- Timeout: 30s, retries: 2

### Unit (Vitest)
- Config: `vitest.config.mts`
- Tests in `tests/unit/`

## Key Config Notes

### next.config.mjs
- Transpiles `shared/` package at build time
- PWA via `@ducanh2912/next-pwa`
- MDX support for `/docs` pages
- Sentry integration (source maps, error tunneling)
- Content Security Policy (CSP) with nonce — do NOT add `unsafe-inline` to script-src
- OPFS cross-origin isolation headers on `/vault` routes (required for browser SQLite)

### Sentry
- Three config files: `sentry.client.config.js`, `sentry.server.config.js`, `sentry.edge.config.js`
- Initialized in `pages/_app.tsx` via Sentry's Next.js instrumentation

## Auth

Clerk (`@clerk/nextjs`) handles authentication:
- Provider wraps the app in `pages/_app.tsx`
- Next.js middleware at `middleware.ts` protects routes
- Vault page requires auth; drop/grab are public, but signed-in identity is still attached to Worker API calls when present (see `hooks/use-api-headers.tsx`)
- The Worker lives on a different origin (`NEXT_PUBLIC_DEADROP_API_URL`), so Clerk session cookies never transmit cross-origin — every API-calling hook must source its `Authorization` header from `useApiHeaders()` rather than calling `getToken()` directly

## UI Library

Mantine v8 + `@tabler/icons-react`:
- Theme provider in `pages/_app.tsx`
- Use Mantine form hooks (`@mantine/form`) for all forms
- Avoid mixing Mantine with other component libraries

## Important Constraints

- All crypto happens client-side via `shared/lib/crypto/` — never server-side in API routes
- `pages/api/` is otherwise limited to hCaptcha verification and Stripe checkout/webhook handling — never add drop/grab business logic here
- Do not add `unsafe-inline` or `unsafe-eval` to CSP headers