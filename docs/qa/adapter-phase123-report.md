# QA Report: Declarative Adapter Architecture Phase 1+2+3

> Date: 2026-02-07
> Reviewer: QA Agent (James Bach model)
> Scope: manifest infrastructure + platform definitions + comparison test setup

---

## 1. Build & Test Results

### Final Verification

| Task | Status | Details |
|------|--------|---------|
| Build (all packages) | PASS | 12/12 tasks successful |
| Typecheck (tsc) | PASS | Zero errors across all packages |
| Tests (vitest) | PASS | **50 tests** in core-adapters, **19 tests** in core-markdown |
| Extension build (WXT) | PASS | 670.24 KB total, all assets generated |

### Test Coverage Summary

| Test File | Tests | Status |
|-----------|-------|--------|
| `manifest-utils.test.ts` | 21 (was 12) | All pass |
| `manifest-adapter.test.ts` | 29 (was 20) | All pass |

QA supplemented **18 new test cases** covering edge cases and boundary conditions.

---

## 2. Code Review Findings

### 2.1 Architecture Conformance

The implementation correctly follows the ADR three-layer model (Declaration / Script / Core). Key observations:

- **Declaration layer**: `chatgptManifest` and `claudeManifest` are pure TypeScript objects with `satisfies AdapterManifest`, providing full type checking at compile time.
- **Script layer**: Hooks are properly defined as optional pure functions. ChatGPT uses `transformResponse` + `extractMessageText`, Claude uses `extractAuth` + `extractMessageText` + `afterParse`.
- **Core layer**: `ManifestAdapter` engine correctly orchestrates the lifecycle: auth -> request build -> fetch -> parse -> filter -> hooks.

### 2.2 Positive Findings

1. **Type safety is solid.** All manifest properties are strongly typed via TypeScript interfaces. The `satisfies` keyword ensures manifest objects conform at compile time.

2. **Backward compatibility preserved.** Old adapters (`chatGPTExtAdapter`, `claudeExtAdapter`) remain registered and functional. New manifest adapters run in parallel with different IDs (`chatgpt-ext-v2`, `claude-ext-v2`).

3. **Security boundary respected.** Hooks do not receive `fetch` reference -- all network requests go through the core engine. `encodeURIComponent` is used for URL template variable injection.

4. **Token lifecycle well-managed.** Bearer token caching with TTL, 401 auto-retry, concurrent request dedup via `tokenPromise` pattern.

5. **Injector is properly generic.** `ManifestInjector` drives all DOM injection from `manifest.injection` config with selector fallbacks, position options, and proper cleanup.

6. **Sub-path exports correctly configured.** `package.json` has proper `exports` entries for `./manifest` and `./manifest/schema`.

### 2.3 Issues Found

#### BUG-001 (Fixed): Invalid regex in `matchesPattern` could crash `shouldSkip`

- **File**: `packages/core-adapters/src/manifest/manifest-adapter.ts:303-309`
- **Severity**: Low
- **Description**: `new RegExp(rule.matchesPattern)` would throw an unhandled exception if the pattern string is invalid regex syntax. While manifest authors are developers (low probability of invalid regex), defense in depth dictates catching this.
- **Fix Applied**: Wrapped `new RegExp()` call in try/catch, silently skipping invalid patterns.

#### OBSERVATION-001: Schema uses TypeScript interfaces, not Zod runtime validation

- **File**: `packages/core-adapters/src/manifest/schema.ts`
- **Severity**: Info (Pragmatic deviation from ADR)
- **Description**: The ADR specifies Zod validation at registration time. The implementation uses plain TypeScript interfaces with `satisfies` for compile-time checking only. No runtime validation occurs at `registerManifestAdapter()`.
- **Impact**: Invalid manifests from future dynamic sources (community plugins, remote config) won't fail fast. For now, this is acceptable since all manifests are developer-authored TypeScript.
- **Recommendation**: Defer Zod validation to Phase 5 when community contributions are expected.

#### OBSERVATION-002: No `clearManifests()` function in manifest-registry

- **File**: `packages/core-adapters/src/manifest/manifest-registry.ts`
- **Severity**: Low
- **Description**: The module-level `manifests` array has no reset mechanism, unlike the main registry's `clearAdapters()`. This could cause test pollution if multiple test files register manifests.
- **Impact**: Minimal now (manifests are only registered via `registerBuiltinAdapters`), but should be addressed before Phase 4 adds more manifests.

#### OBSERVATION-003: ADR specifies sync `parseResponse`, implementation is async

- **File**: `packages/core-adapters/src/manifest/manifest-adapter.ts:218`
- **Severity**: Info (Improvement over ADR)
- **Description**: The implementation correctly made `parseResponse` async to support `extractMessageText` hooks that return `Promise<string>` (e.g., ChatGPT's dynamic import of content flatteners). This is better than the ADR's sync spec.

#### OBSERVATION-004: `buildRequestUrl` skips internal vars with `_` prefix

- **File**: `packages/core-adapters/src/manifest/manifest-adapter.ts:131`
- **Severity**: Info
- **Description**: Template variable keys starting with `_` (like `_bearerToken`) are excluded from URL substitution. This is an undocumented convention. Consider adding a comment in the schema or README.

---

## 3. Test Supplements Added

### manifest-utils.test.ts (+9 tests)

| Test Case | Category | Rationale |
|-----------|----------|-----------|
| Empty string path | getByPath boundary | `"".split(".")` returns `[""]` |
| Middle path is `undefined` | getByPath boundary | Distinguish from `null` |
| Non-object primitives as input | getByPath boundary | Numbers, strings, booleans |
| Non-existent intermediate node | getByPath boundary | Deep path with missing middle |
| Falsy values (0, false, "") | getByPath correctness | Ensure falsy != missing |
| Empty template | resolveTemplate boundary | Edge case |
| Empty vars object | resolveTemplate boundary | No substitution needed |
| Special characters encoding | resolveTemplate correctness | `&`, `=` |
| Unicode encoding | resolveTemplate correctness | CJK characters |

### manifest-adapter.test.ts (+9 tests)

| Test Case | Category | Rationale |
|-----------|----------|-----------|
| Homepage URL (non-conversation) | canHandle boundary | Should return false |
| URL with query params | canHandle boundary | Should still match |
| URL with fragment | canHandle boundary | Should still match |
| `exists: false` filter | shouldSkip coverage | Missing field detection |
| `equals: null` strict equality | shouldSkip correctness | `null !== undefined` |
| `matchesPattern` on non-string | shouldSkip type safety | Numbers should not match |
| No filters manifest | shouldSkip boundary | Default behavior |
| Descending sort order | sort coverage | Previously only ascending tested |
| Non-array messagesPath | parse boundary | Graceful error |

---

## 4. Bug Fix Summary

| ID | Severity | File | Description | Status |
|----|----------|------|-------------|--------|
| BUG-001 | Low | `manifest-adapter.ts` | Invalid regex in `matchesPattern` crashes `shouldSkip` | FIXED |

---

## 5. Phase 4 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Switching registry priority (manifest-first) breaks existing users | Medium | High | Feature flag or A/B by user percentage |
| `ManifestInjector` CSS selectors don't match after platform UI updates | High | Medium | Selector fallback arrays already in place; manual testing on live pages needed before switch |
| ChatGPT `transformResponse` hook produces different output than old adapter | Medium | High | **Critical**: Need diff-comparison test with real API responses before Phase 4 |
| Claude `extractAuth` cookie extraction fails on new cookie format | Low | High | Cookie extraction regex is simple and stable |
| No Zod runtime validation means invalid community manifests could register silently | Low (for now) | Medium | Add Zod validation in Phase 5 |
| Module-level `manifests` array lacks cleanup, could cause test issues in Phase 4 | Medium | Low | Add `clearManifests()` before Phase 4 starts |

### Recommended Pre-Phase-4 Actions

1. **Diff test with real API data**: Capture real ChatGPT and Claude API responses, run both old and new adapters, diff the `Conversation` output. This is the single most important validation before the switch.
2. **Add `clearManifests()` to manifest-registry**: Needed for test isolation.
3. **End-to-end browser test**: Install extension in dev mode, verify manifest-driven injector works on live ChatGPT and Claude pages.

---

## 6. Verdict

### GO for Phase 1+2+3

All code compiles, typechecks, and passes 69 tests (50 adapter + 19 markdown). The architecture is sound, backward compatible, and well-tested. One minor bug was found and fixed.

Phase 1+2+3 is **approved for merge**.

Phase 4 (switching to manifest adapter as primary) should NOT proceed until the diff-comparison test with real API responses is completed.
