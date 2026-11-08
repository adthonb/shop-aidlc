# Next.js 16 Lint, Typecheck & Test Guide (AI-DLC Quality Reference)

> Grounded in local Next.js 16.4.4 documentation (`./node_modules/next/dist/docs/`). Used by [`aidlc-developer-agent`](../agents/aidlc-developer-agent.md) and [`aidlc-quality-agent`](../agents/aidlc-quality-agent.md).

---

## 1. Typechecking (`next typegen` + `tsc`)

- **Local Doc**: [`01-app/03-api-reference/05-config/02-typescript.md`](../../node_modules/next/dist/docs/01-app/03-api-reference/05-config/02-typescript.md)
- **Command**:
  ```bash
  npm run typecheck
  # Executes: next typegen && tsc --noEmit
  ```
- **How it works**:
  - `next typegen` generates route-aware types (`PageProps`, `LayoutProps`, `RouteContext`, and typed routes) in `.next/types` and updates `next-env.d.ts` without running a full build.
  - `tsc --noEmit` validates the entire TypeScript project using `tsconfig.json`.
  - **Rule**: Never manually edit `next-env.d.ts`. Put custom types in `src/types/` or a separate `.d.ts` file included in `tsconfig.json`.

---

## 2. Linting (ESLint Flat Config in Next.js 16)

- **Local Doc**: [`01-app/03-api-reference/05-config/03-eslint.md`](../../node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md)
- **Important Next.js 16 Change**:
  - `next lint` and the `eslint` option in `next.config.ts` were **removed in Next.js 16**. Always run the **ESLint CLI** directly (`npx eslint .` or `npm run lint`).
- **Setup (if not yet installed)**:
  ```bash
  npm i -D eslint eslint-config-next
  ```
- **Recommended `eslint.config.mjs` (Core Web Vitals + TypeScript)**:
  ```js
  import { defineConfig, globalIgnores } from 'eslint/config'
  import nextVitals from 'eslint-config-next/core-web-vitals'
  import nextTs from 'eslint-config-next/typescript'

  const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    globalIgnores([
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ]),
  ])

  export default eslintConfig
  ```
- **Commands**:
  ```bash
  npm run lint          # npx eslint .
  npx eslint --fix .    # Auto-fix fixable lint issues
  ```

---

## 3. Unit & Integration Testing (Vitest + React Testing Library)

- **Local Doc**: [`01-app/02-guides/testing/vitest.md`](../../node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md)
- **Scope**:
  - Pure utilities & business logic (`src/lib/*`, PromptPay QR payload generation, queue number formatting)
  - Route Handlers (`src/app/api/*`)
  - Synchronous Server and Client Components (`src/components/*`)
  - *Note*: Vitest does not currently support `async` Server Components; test `async` Server Components via Playwright E2E tests.
- **Setup (if not yet installed)**:
  ```bash
  npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
  ```
- **Recommended `vitest.config.mts`**:
  ```ts
  import { defineConfig } from 'vitest/config'
  import react from '@vitejs/plugin-react'
  import tsconfigPaths from 'vite-tsconfig-paths'

  export default defineConfig({
    plugins: [tsconfigPaths(), react()],
    test: {
      environment: 'jsdom',
    },
  })
  ```
- **Commands**:
  ```bash
  npm test              # vitest (watch mode)
  npx vitest run        # Single CI/quality-gate run
  ```

---

## 4. End-to-End (E2E) Testing (Playwright CLI)

- **Local Doc & Skill**:
  - [`01-app/02-guides/testing/playwright.md`](../../node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md)
  - [`.agents/skills/playwright-cli/SKILL.md`](../../.agents/skills/playwright-cli/SKILL.md)
- **Scope**:
  - Full user journeys (selecting breakfast sets, sticky cart calculation, Dynamic PromptPay QR modal, slip upload, daily queue receipt `#A001`, `/admin` PIN login and menu toggle)
  - `async` Server Components and route navigation
- **Setup (if not yet installed)**:
  ```bash
  npm init playwright
  ```
- **Commands**:
  ```bash
  npm run build && npm run start   # Run against production build (or configure webServer in playwright.config.ts)
  npx playwright cli               # Execute E2E browser automation / tests via Playwright CLI skill
  ```
- **Commands for headed**:
  ```bash
  ../wsl-agent-cdp/cdp-bridge up brave  # Run the WSL CDP bridge and waiting user to accept on Windows side
  ../wsl-agent-cdp/cdp-bridge status    # Check CDP status
  npm run build && npm run start        # Run against production build (or configure webServer in playwright.config.ts)
  npx playwright cli open --cdp=http://localhost:9223  # Attach or run headed via Playwright CLI
  ```

---

## 5. Standard Quality Gate Execution Order

When [`aidlc-quality-agent`](../agents/aidlc-quality-agent.md) runs Stage `3.6 Build and Test`, execute in this exact sequence:

```bash
# 1. Generate Next.js route types & run TypeScript compiler check
npm run typecheck

# 2. Run ESLint flat config check
npm run lint

# 3. Run unit & integration tests (single pass)
npx vitest run

# 4. Verify production build succeeds cleanly
npm run build
```
