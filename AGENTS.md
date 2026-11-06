## Project Development
Use Test-driven development in this project.
- Write tests first: the agent to write tests based on the expected inputs and outputs. Be explicit you're doing TDD, so it doesn't create mock functions for code that doesn't exist yet.
- Confirm the tests fail: Run the tests and verify they fail. You're not trying to write feature code at this point.
- Commit the tests: When you're satisfied with the test coverage and quality, commit them. This locks in your requirements for the agent to build against.
- Write code: Make all tests pass without modifying the tests. Keep iterating until everything passes.
- Commit the code: Review the output, confirm it behaves as expected, and commit.
- use `git` skill to create PR and commit.
### Testing
- NOT ALLOW TO EDIT the tests when write codes.
- Use Playwright in headless mode (`npx playwright test`) for E2E tests.

### Automated AI-DLC Workflow & Project-Scoped Commands
- Execute the AI-DLC workflow (`aidlc-developer-agent` and `aidlc-quality-agent`) autonomously end-to-end (TDD tests -> failing test commit -> implementation -> unit/E2E/typecheck/lint/build verification -> code commit).
- **Feedback Rule**: Only pause or ask/notify the user when **changing the plan** or **editing `AGENTS.md`** (besides the final completion summary).
- **Allowed Project-Scoped Commands** (always run within the repository root without external paths or env-var prefixes so commands execute cleanly inside the project sandbox):
  - `npm run typecheck`
  - `npm run lint`
  - `npm test` / `npx vitest run`
  - `npm run test:e2e` / `npx playwright test`
  - `npm run build`
  - `git status`, `git diff`, `git log`, `git switch`, `git branch`, `git add`, `git commit`

<!-- BEGIN:thai-qr-payment -->[thai-qr-payment]|https://github.com/uunw/thai-qr-payment/blob/main/README.md<!-- END:thai-qr-payment -->
<!-- BEGIN:aidlc-harness -->[AI-DLC Harness Index]|root: ./aidlc|Two-agent AI-DLC workflow (aidlc-developer-agent & aidlc-quality-agent only) grounded in Next.js 16 Docs. Read before running AI-DLC stages or delegating subagents.|overview:{00-overview.md}|agents:{aidlc-developer-agent.md,aidlc-quality-agent.md}|guides:{lint-and-test.md}<!-- END:aidlc-harness -->
<!-- BEGIN:lint-and-test -->[Lint & Test Index]|guide: ./aidlc/guides/lint-and-test.md|next-docs: ./node_modules/next/dist/docs/01-app/03-api-reference/05-config/{02-typescript.md,03-eslint.md}, ./node_modules/next/dist/docs/01-app/02-guides/testing/{vitest.md,playwright.md,jest.md,cypress.md}|typecheck: `npm run typecheck` (`next typegen && tsc --noEmit`)|lint: `npx eslint .` or `npm run lint` (Flat config `eslint.config.mjs` with `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`; NOTE: `next lint` is removed in Next.js 16)|unit-test: `npx vitest run` or `npm test` (Vitest + React Testing Library for sync Server/Client components, `src/lib/*`, and `src/app/api/*`)|e2e-test: `npx playwright test` (Playwright for full user flows and `async` Server Components)|build-gate: `npm run build` (`next build`)<!-- END:lint-and-test -->

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
