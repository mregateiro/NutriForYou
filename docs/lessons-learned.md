# NutriForYou — Lessons Learned & Issues Tracker

This document tracks mistakes, bugs, and issues that were introduced during development and had to be fixed. It serves as a reference for future development to avoid repeating the same patterns.

---

## Table of Contents

1. [Deployment & Infrastructure](#deployment--infrastructure)
2. [Merge Conflicts](#merge-conflicts)
3. [Data & Schema Issues](#data--schema-issues)
4. [Business Logic Bugs](#business-logic-bugs)
5. [Accessibility](#accessibility)
6. [Testing & CI](#testing--ci)
7. [Key Takeaways](#key-takeaways)

---

## Deployment & Infrastructure

### 1. Nested `cd` Command in Vercel Build (PR #4)

**What went wrong:** Build command attempted `cd nutrifor-you && npm run build` but Vercel's Root Directory was already set to `nutrifor-you/`, so it tried entering `nutrifor-you/nutrifor-you/`.

**Root cause:** Misconfiguration between build command and Root Directory setting.

**Lesson:** When using Vercel's Root Directory setting, the build command runs from that directory — don't `cd` into it again.

---

### 2. Root `vercel.json` Breaks Next.js Routing (PR #6 → PR #7)

**What went wrong:** Added a root-level `vercel.json` with `installCommand`, `buildCommand`, and `outputDirectory` to fix 404s. This initially seemed to work but broke Next.js serverless routing because `outputDirectory` is incompatible with `@vercel/next` builder.

**Root cause:** Tried to solve the wrong problem — the fix was to set Vercel Root Directory in project settings, not create a config file.

**Lesson:** For monorepo-style projects, configure the Root Directory in Vercel project settings. Never use root-level `vercel.json` with Next.js apps in subdirectories.

---

### 3. Route Conflict: `app/page.tsx` vs `app/(dashboard)/page.tsx` (PR #7)

**What went wrong:** Both files mapped to `/`, causing `ENOENT` build errors. Route groups like `(dashboard)` don't add URL segments.

**Root cause:** Misunderstanding of Next.js App Router route group semantics.

**Lesson:** Route groups are purely organizational — `app/(dashboard)/page.tsx` serves `/`, not `/dashboard`. If you need `/dashboard`, use `app/(dashboard)/dashboard/page.tsx`.

---

### 4. Missing Prisma Migrations — Register Returns 500 (PR #8)

**What went wrong:** `POST /api/auth/register` returned 500 because no Prisma migrations existed; database tables were never created.

**Root cause:** Prisma schema was developed locally without creating production migrations.

**Lesson:** Always create and test migrations before deploying. Add `prisma migrate deploy` to the build pipeline.

---

### 5. P3009 Failed Migration Blocking All Deploys (PR #9)

**What went wrong:** After creating the initial migration, it failed on first run. The failure was recorded in `_prisma_migrations` table, blocking all subsequent builds.

**Root cause:** Prisma refuses to proceed past a failed migration. No error recovery mechanism existed.

**Lesson:** Implement a resilient migration wrapper that can handle failed migrations (resolve as rolled-back, use `db push` as fallback, then mark as applied).

---

### 6. Rate Limiter Memory Leak in Serverless (PR #5)

**What went wrong:** `setInterval`-based cleanup in rate limiter caused memory leaks across serverless cold starts.

**Root cause:** `setInterval` assumes long-running process, but serverless functions freeze and resume unpredictably.

**Lesson:** Never use `setInterval` in serverless environments. Use lazy cleanup triggered by usage thresholds instead.

---

## Merge Conflicts

### 7. Corrupted Test File from PR #15 + #16 Merge (Fixed in this PR)

**What went wrong:** `integrations.api.test.ts` had multiple corruption issues after merging PRs #15 and #16:
- Two `it()` declarations on the same line (lines 53-54)
- Duplicate `response` variable declarations (line 102-103)
- Two `it()` declarations merged together (lines 122-123)
- POST test body mixed with DELETE test code (lines 282-305)

**Root cause:** Both PRs modified the same test file independently. PR #15 added DELETE tests and basic POST tests. PR #16 added config validation POST tests. GitHub auto-merge interleaved them incorrectly.

**Lesson:** When multiple PRs modify the same file, always review the merged result manually. Auto-merge can interleave non-conflicting but semantically incompatible changes. Run tests immediately after each merge.

---

### 8. Corrupted Consultation Page from PR #13 + #14 Merge (Fixed in this PR)

**What went wrong:** `consultations/new/page.tsx` had the old `<select>` patient dropdown (from PR #13's accessibility fixes) interleaved with the new `<PatientSearch>` component (from PR #14). The result was invalid JSX with both components partially present.

**Root cause:** PR #13 (accessibility) added `htmlFor`/`id` and ARIA attributes to the `<select>` element. PR #14 (patient search) replaced the `<select>` with `<PatientSearch>`. The merge kept parts of both.

**Lesson:** When one PR modifies a component and another replaces it entirely, the merge will almost certainly produce garbage. Always manually verify merges that touch overlapping code regions.

---

### 9. Duplicate Prisma Mock Keys in setup.ts (Fixed in this PR)

**What went wrong:** `setup.ts` had duplicate `integration` and `webhookLog` property keys. PR #15 added these mocks, and PR #16 added them again. JavaScript silently uses the last duplicate key, but it generates build warnings and is confusing.

**Root cause:** Both PRs needed the same mocks and added them independently. The merge kept both copies.

**Lesson:** Shared test infrastructure files like `setup.ts` are high-conflict zones. When multiple PRs need the same mock, coordinate or check for duplicates after merge.

---

## Data & Schema Issues

### 10. Patient Dropdown: `perPage=200` Exceeds Schema Max of 100 (PR #14)

**What went wrong:** Appointment page requested `perPage=200` to fetch all patients, but the Zod schema enforced `max(100)`. API returned 500, dropdown rendered empty — silently.

**Root cause:** Schema limit wasn't checked when writing the component's fetch logic.

**Lesson:** Always check API validation schema limits when writing client-side fetch calls. Better yet, don't fetch "all" records — use search/pagination patterns.

---

### 11. Dashboard Displayed Hardcoded Em-Dashes Instead of Real Data (PR #17)

**What went wrong:** Dashboard cards showed `—` for all metrics despite the analytics service and API route being fully implemented.

**Root cause:** Component was written with placeholder values and the service was never wired in.

**Lesson:** Don't ship placeholder data in components. Wire the data layer immediately, even if the service returns zeros initially.

---

### 12. Hardcoded BRL Currency Instead of EUR (PR #11)

**What went wrong:** All pricing displayed in R$ (Brazilian Real) with `pt-BR` locale. The business needed EUR with `pt-PT` locale.

**Root cause:** Initial development was region-specific without parameterization.

**Lesson:** Externalize locale/currency settings from the start. Don't hardcode currency symbols or locale strings throughout the codebase.

---

### 13. AI Meal Plan Fallback Generated Useless Placeholder Content (PR #12)

**What went wrong:** When AI API calls failed, the fallback generated meals with names like `"Placeholder — customize this item"` with fake uniform macros. No user warning was shown.

**Root cause:** Fallback was a development stub that was never replaced with real data.

**Lesson:** Fallback data should be realistic and the user should be clearly informed when AI-generated content is unavailable. Never ship placeholder text to users.

---

## Business Logic Bugs

### 14. No Payment Gate on Plan Changes (PR #11)

**What went wrong:** Selecting a different subscription tier activated it immediately without any payment confirmation. Users could upgrade without paying.

**Root cause:** `changeSubscription` directly set status to `ACTIVE` with no payment step.

**Lesson:** Always implement payment gates for subscription changes. Use a two-phase pattern: create with `PAST_DUE` status → confirm payment → activate.

---

### 15. Disconnect Button Stuck on "Disconnect" After Disconnecting (PR #15)

**What went wrong:** After disconnecting an integration, the card still showed "Disconnect" instead of "Connect".

**Root cause:** `getConnected()` matched any integration record regardless of status. Disconnect was a soft-delete (`status = 'DISCONNECTED'`), but the filter didn't check status.

**Lesson:** When implementing soft-delete patterns, always update all queries that check for the entity's existence to also check the status field.

---

### 16. Connect Button Accepted Empty Credentials (PR #16)

**What went wrong:** Clicking "Connect" immediately set status to `CONNECTED` without prompting for API keys/credentials. The `config` field was optional in the schema.

**Root cause:** Schema didn't enforce required config fields; no client-side credential collection UI existed.

**Lesson:** Required fields should be required in the schema from the start. Don't make integration config optional if credentials are needed.

---

## Accessibility

### 17. Comprehensive WCAG 2.1 AA Violations (PR #13)

**What went wrong:** App relied on color alone for status indicators, lacked ARIA semantics for screen readers, had no keyboard navigation in mobile menu, and was missing `aria-current`, `aria-required`, `scope="col"`, etc. across 17 files.

**Root cause:** Early development focused on functionality without accessibility requirements.

**Lesson:** Build accessibility in from the start. Add `role`, `aria-*`, `scope`, and keyboard navigation as part of initial component development, not as a separate cleanup pass.

---

### 18. `aria-expanded` on Implicit `textbox` Role (Fixed in this PR)

**What went wrong:** `patient-search.tsx` used `aria-expanded` on an `<input type="text">`, which has an implicit `textbox` role that doesn't support `aria-expanded`. ESLint flagged this.

**Root cause:** The combobox pattern was implemented without explicitly setting `role="combobox"`.

**Lesson:** When building autocomplete/combobox patterns, always set `role="combobox"` explicitly on the input element so ARIA attributes like `aria-expanded` are valid.

---

## Testing & CI

### 19. No CI Pipeline — Tests Only Ran Manually (PR #10)

**What went wrong:** 287 tests existed but were never automatically run. No quality gates on push/PR. Regressions could merge undetected.

**Root cause:** CI workflow was never configured.

**Lesson:** Set up CI early. Run lint + test + build on every PR before merging. This would have caught many of the issues above (including merge conflicts).

---

### 20. No React Component Tests

**What went wrong:** The project has Vitest for unit/API tests and Selenium for E2E, but no component-level tests for React components. Interactive components like `PatientSearch`, the integration config modal, and subscription checkout flow have complex UI logic that's only tested via E2E (which requires a running server and is excluded from CI).

**Root cause:** Testing infrastructure was set up for service/API layer but not for the component layer.

**Recommendation:** Consider adding `@testing-library/react` with `jsdom` environment for component tests. Priority components:
- `PatientSearch` — debouncing, selection, dropdown behavior
- Integration config modal — per-provider field rendering, validation
- Subscription checkout flow — plan selection, payment confirmation
- Mobile navigation — focus trap, escape key, dialog semantics

This would catch merge issues like #8 (corrupted consultation page) at the test level instead of only through manual review.

---

## Key Takeaways

### Top 5 Patterns to Avoid

1. **Don't ship placeholder data** — Wire real services from the start (issues #11, #13)
2. **Always verify merged code** — Auto-merge can produce syntactically valid but semantically broken code (issues #7, #8, #9)
3. **Run CI on every PR** — Would have caught 80% of these issues before merge (issue #19)
4. **Don't hardcode environment-specific values** — Currency, locale, API limits (issues #10, #12)
5. **Build accessibility in from day one** — Retrofitting is 3-5x more work (issue #17)

### Process Improvements

- **After every merge:** Run lint + tests + build. Don't trust auto-merge.
- **Before deploying:** Verify database migrations in a staging environment first.
- **When modifying shared test infrastructure:** Check for duplicate keys/mocks after merge.
- **For interactive components:** Add React Testing Library tests for UI logic.

---

## Statistics

| Category | Count |
|----------|-------|
| Deployment/Infrastructure | 6 |
| Merge Conflicts | 3 |
| Data/Schema Issues | 4 |
| Business Logic Bugs | 3 |
| Accessibility | 2 |
| Testing/CI | 2 |
| **Total** | **20** |

| Severity | Count |
|----------|-------|
| Critical (blocks production) | 7 |
| High (feature broken) | 6 |
| Medium (UX/data issue) | 4 |
| Low (improvement) | 3 |
