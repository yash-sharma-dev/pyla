# QA Report: Phase 4 -- Switch to Manifest Adapter

> Date: 2026-02-07
> Reviewer: QA Agent (James Bach model)
> Scope: ManifestAdapter as primary, old adapters as fallback, injector migration, extension-sites auto-generation

---

## 1. Build & Test Results

| Task | Status | Details |
|------|--------|---------|
| Build (all packages) | PASS | 12/12 tasks successful |
| Typecheck (tsc) | PASS | Zero errors across all packages |
| Tests (vitest) | PASS | **69 tests** total (50 core-adapters + 19 core-markdown) |
| Extension build (WXT) | PASS | 674.03 KB total (+3.76 KB from Phase 3, due to manifest-driven extension-sites) |

### Vite Warnings (Non-blocking)

Two warnings about dynamic imports in `chatgpt/manifest.ts` that are also statically imported elsewhere:
- `text-processor.ts` -- dynamically imported in hook, statically imported by content flatteners
- `content-flatteners/index.ts` -- dynamically imported in hook, statically imported by message-converter

**Impact**: The dynamic import won't create a separate chunk (Vite correctly bundles them together). The `await import()` in the hook still works -- it just resolves synchronously from the already-loaded module. No functional issue. The dynamic import pattern was chosen for tree-shaking intent (per ADR), but in the extension bundle context everything is included anyway.

---

## 2. Phase 4 Checklist Verification

### 2.1 Registration Order: ManifestAdapter First

**File**: `packages/core-adapters/src/index.ts:55-71`

```typescript
export function registerBuiltinAdapters(): void {
  // Manifest adapter 优先注册（主要实现）
  if (!_getAdapter(chatgptManifest.id)) {
    registerManifestAdapter({ manifest: chatgptManifest, hooks: chatgptHooks });
  }
  if (!_getAdapter(claudeManifest.id)) {
    registerManifestAdapter({ manifest: claudeManifest, hooks: claudeHooks });
  }
  // 旧 adapter 作为 fallback（id 已改为 -legacy）
  if (!_getAdapter(_chatGPTExtAdapter.id)) {
    _registerAdapter(_chatGPTExtAdapter);
  }
  if (!_getAdapter(_claudeExtAdapter.id)) {
    _registerAdapter(_claudeExtAdapter);
  }
}
```

**Verdict**: PASS. ManifestAdapters register first with canonical IDs (`chatgpt-ext`, `claude-ext`). Old adapters register with `-legacy` suffix IDs. Since `parseWithAdapters` iterates in registration order, ManifestAdapters will match first.

### 2.2 App.tsx Uses ManifestInjector

**File**: `apps/browser-extension/src/components/app.tsx`

- Imports `ManifestInjector` from `~/injectors/manifest-injector` (line 9)
- Imports `getRegisteredManifests` from `@ctxport/core-adapters/manifest` (line 14-16)
- `detectManifest()` and `isConversationPage()` now use manifest registry (lines 18-28)
- `ManifestInjector` created from `entry.manifest` (line 57)
- No imports of `ChatGPTInjector` or `ClaudeInjector`

**Verdict**: PASS.

### 2.3 Extension-sites Auto-generated from Manifests

**File**: `packages/core-adapters/src/extension-sites.ts`

- `manifestToSiteConfig()` bridge function generates `ExtensionSiteConfig` from `AdapterManifest`
- `CHATGPT_EXT_SITE` and `CLAUDE_EXT_SITE` generated via this function
- `getConversationId` correctly delegates to hooks or manifest patterns
- All downstream exports preserved: `EXTENSION_SITE_CONFIGS`, `EXTENSION_HOST_PERMISSIONS`, `EXTENSION_CONTENT_MATCHES`, `EXTENSION_HOST_PATTERNS`, `getExtensionSiteByUrl`, `getExtensionSiteByHost`, `resolveExtensionTheme`

**Verdict**: PASS. Interface fully compatible.

### 2.4 clearManifests() Available

**File**: `packages/core-adapters/src/manifest/manifest-registry.ts:44-46`

```typescript
export function clearManifests(): void {
  manifests.length = 0;
}
```

Exported in `manifest/index.ts` (line 11).

**Verdict**: PASS.

### 2.5 Old Adapters Marked Legacy

| Adapter | Old ID | New ID |
|---------|--------|--------|
| ChatGPTExtAdapter | `chatgpt-ext` | `chatgpt-ext-legacy` |
| ClaudeExtAdapter | `claude-ext` | `claude-ext-legacy` |
| chatgptManifest | `chatgpt-ext-v2` | `chatgpt-ext` |
| claudeManifest | `claude-ext-v2` | `claude-ext` |

**Verdict**: PASS. Clean ID scheme -- manifest adapters take canonical names.

---

## 3. Bugs Found & Fixed

### BUG-002 (Medium): Hardcoded platform class names in app.tsx floating fallback

**File**: `apps/browser-extension/src/components/app.tsx:72-73`
**Before**:
```typescript
const injected = document.querySelector(
  ".ctxport-chatgpt-copy-btn, .ctxport-claude-copy-btn",
);
```
**Issue**: Hardcoded platform names. Adding a new platform (e.g., Gemini) would not trigger the floating fallback correctly.
**Fix**: Changed to use `entry.manifest.provider` dynamically:
```typescript
const copyBtnClass = `ctxport-${entry.manifest.provider}-copy-btn`;
const injected = document.querySelector(`.${copyBtnClass}`);
```

### BUG-003 (Medium): Hardcoded platform selectors in content.tsx runtime message handler

**File**: `apps/browser-extension/src/entrypoints/content.tsx:93-95`
**Before**:
```typescript
".ctxport-copy-btn button, .ctxport-chatgpt-copy-btn button, .ctxport-claude-copy-btn button"
```
**Issue**: Hardcoded platform names for keyboard shortcut copy trigger.
**Fix**: Changed to attribute selector pattern:
```typescript
'[class^="ctxport-"][class$="-copy-btn"] button'
```
This matches any `ctxport-{provider}-copy-btn` pattern, making it future-proof.

---

## 4. Observations (Non-blocking)

### OBS-001: Vite dynamic import warnings

The `chatgptHooks.extractMessageText` uses `await import("./shared/content-flatteners")` for tree-shaking intent, but since the module is also statically imported by the old adapter, Vite cannot split it into a separate chunk. This is cosmetic -- no functional impact. Can be cleaned up in Phase 5 when old adapters are removed.

### OBS-002: Old injector files still exist

`chatgpt-injector.ts` and `claude-injector.ts` still exist in `apps/browser-extension/src/injectors/` but are no longer imported anywhere. They should be removed in Phase 5 cleanup.

### OBS-003: Old adapter classes still exist

`ChatGPTExtAdapter` and `ClaudeExtAdapter` classes are still exported from the package. They serve as fallback. Removal should happen in Phase 5.

---

## 5. Phase 5 Cleanup Recommendations

1. Delete `apps/browser-extension/src/injectors/chatgpt-injector.ts`
2. Delete `apps/browser-extension/src/injectors/claude-injector.ts`
3. Remove `ChatGPTExtAdapter` and `ClaudeExtAdapter` exports from `packages/core-adapters`
4. Remove legacy adapter registration from `registerBuiltinAdapters()`
5. Convert dynamic imports in `chatgptHooks.extractMessageText` to static imports (eliminates Vite warnings)
6. Remove `CHATGPT_EXT_SITE` config from `chatgpt/ext-adapter/index.ts` (it's duplicated via manifest now)

---

## 6. Verdict

### GO for Phase 4

All builds pass, all 69 tests green, architecture is correctly switched to manifest-first with legacy fallback. Two hardcoded selector bugs were found and fixed. The extension is ready for manual testing on live ChatGPT and Claude pages.

**Critical pre-release action**: Manual end-to-end test on live pages to verify:
1. Copy button injection works on ChatGPT conversation page
2. Copy button injection works on Claude conversation page
3. Sidebar list icons appear on hover
4. Keyboard shortcut copy works
5. Floating fallback appears when header selectors don't match
