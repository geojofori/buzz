# Whisper Work

WhisperCreate's downstream fork of [block/buzz](https://github.com/block/buzz),
Apache-2.0. This file records what the rename changed, what it deliberately left
alone, and where the theme values came from.

The guiding rule is that **only user-visible identity changes**. Every internal
identifier stays on upstream's names: CSS classes and data attributes
(`buzz-*`, `data-buzz-sidebar`), TypeScript symbols, crate names, storage keys
(`buzz-theme`, `buzz-accent-color`), environment variables (`BUZZ_*`), event
kinds, deep-link schemes (`buzz://`), and the Flutter package name `buzz`. That
keeps upstream merges cheap: a rebase touches copy and configuration, not
structure.

---

## 1. What was renamed

### Application identity

| File | Change |
|---|---|
| `desktop/src-tauri/tauri.conf.json` | `productName` → `Whisper Work`; `identifier` → `com.whispercreate.work`; main window `title` → `Whisper Work` |
| `desktop/package.json` | package `name` → `whisper-work` |
| `desktop/index.html` | favicon → `/whisper-work.svg`; first-launch boot seed now paints the Whisper Work Dark ground |
| `web/index.html` | `<title>` → `Whisper Work` |
| `admin-web/index.html` | `<title>` → `Whisper Work admin` |
| `mobile/ios/Runner/Info.plist` | `CFBundleName` → `Whisper Work` |
| `mobile/ios/Flutter/Debug.xcconfig`, `Release.xcconfig` | `APP_DISPLAY_NAME` → `Whisper Work`; `BUNDLE_IDENTIFIER` → `com.whispercreate.work` |
| `mobile/android/app/build.gradle.kts` | `applicationId` → `com.whispercreate.work`; `app_name` string resource → `Whisper Work` (release and worktree-debug variants) |

### Artwork

| File | Change |
|---|---|
| `desktop/src-tauri/icons/source/whisper-work-1024.png` | New icon source: the white WhisperCreate logomark centred on a `#0F0F0F` rounded square |
| `desktop/src-tauri/icons/**` | Regenerated from that source by `tauri icon` (52 files: PNG set, `icon.icns`, `icon.ico`, Windows Square*Logo, `android/`, `ios/`) |
| `desktop/public/app-icon@2x.png`, `app-icon@3x.png` | Redrawn from the same logomark at 112px and 168px |
| `desktop/public/whisper-work.svg` | New favicon: the logomark on the brand ground |
| `admin-web/public/favicon.svg` | Replaced the bee mark with the logomark |

### Theme

| File | Change |
|---|---|
| `desktop/src/shared/theme/whisper-work-theme.ts` | New: the Whisper Work light and dark palettes, the pinned cobalt accent, and the exact surface-token overrides |
| `desktop/src/shared/theme/theme-loader.ts` | Registered `whisper-work` / `whisper-work-dark` in `SYNTAX_THEMES`, `LIGHT_THEMES`, `THEME_PAIRS`, `themeImports`, and `resolveShikiThemeName` |
| `desktop/src/shared/theme/ThemeProvider.tsx` | `isBrandedTheme` helper; cobalt pinned as the Whisper Work accent; brand surface overrides merged over the derived vars; default theme is now `whisper-work-dark`; follow-system is opt-in rather than on by default for fresh profiles |
| `desktop/src/shared/theme/useThemePreviewVars.ts` | Picker preview tiles use the same overrides as the applied theme |
| `desktop/src/shared/styles/globals/whisper-work.css` | New: the quiet sidebar gradient and chrome tokens, re-pointing the shared `--buzz-*` tokens |
| `desktop/src/shared/styles/globals.css` | Imports the new stylesheet after `theme.css` |
| `desktop/src/features/settings/ui/SettingsPanels.tsx` | Accent picker and prominent-tab setting keyed off `isBrandedTheme` rather than Buzz alone |
| `desktop/src/main.tsx` | `<ThemeProvider defaultTheme="whisper-work-dark">` |

### Copy

190 lines of user-visible copy across 80 files in `desktop/src` (onboarding and
welcome copy, settings descriptions, toasts, dialog text, aria-labels, error
messages), plus 12 display strings in `mobile/lib`. Comments, identifiers and
wire-format strings were left untouched by construction: the sweep skipped
line and block comments and matched only the standalone word `Buzz`.

Test expectations were updated in nine `*.test.mjs` files where the assertion
pinned a string this rename changed, and the theme census in
`desktop/src/features/terminal/terminalBannerColor.test.mjs` moved from 62 to
64 shipped themes.

One upstream credit line is visible in the app, in the Settings sidebar footer
beside the version number (`desktop/src/features/settings/ui/SettingsView.tsx`):

> Built on Buzz by Block (Apache-2.0)

The same line appears at the top of `README.md`.

---

## 2. What was deliberately NOT renamed

| Left alone | Why |
|---|---|
| CSS classes, data attributes: `buzz-*`, `data-buzz-sidebar`, `data-buzz-theme`, `data-buzz-flat` | Internal identifiers. The Whisper Work theme reuses the whole branded-sidebar mechanism rather than forking it, so a rebase never conflicts on selectors |
| TypeScript symbols: `BuzzMark`, `isBuzzTheme`, `createBuzzQueryClient`, `findBuzzToolName` | Internal identifiers |
| Storage keys `buzz-theme`, `buzz-theme-cache`, `buzz-accent-color`, `buzz-follow-system`, `buzz-glass-*` | Renaming would orphan every existing profile's preferences |
| `BUZZ_*` environment variables, `buzz://` deep links, `buzz-media:` scheme | Wire contracts shared with the relay, the CLI and the mobile app |
| Flutter package name `buzz` (`mobile/pubspec.yaml`), Android `namespace = "xyz.block.buzz.mobile"` | Package and namespace are code identifiers; every Dart import and the generated `R`/`BuildConfig` classes resolve through them |
| `"Buzz event"` prompt-section header (parsed in `agentSessionTranscriptHelpers.ts` and `transcript_builder.dart`) | Wire format emitted by the ACP harness. The *displayed* fallback title is now "Whisper Work event"; the parsed header is not |
| `desktop/public/buzz.svg` | Still referenced as a generic test image by `desktop/tests/e2e/spoiler.spec.ts` and `profile.spec.ts`. The app favicon moved to `whisper-work.svg` instead |
| `desktop/src-tauri/icons/buzz-source.png` | Upstream's icon source, kept so an upstream icon change still diffs cleanly |
| `desktop/src/testing/e2eBridge.ts` (9 strings) | Playwright mock-relay fixture data, asserted verbatim by `desktop/tests/e2e/global-agent-config-screenshots.spec.ts` and `doctor-states.spec.ts`. Changing it without running the e2e suite would break those specs |
| `web/package.json` name `buzz-web`, `admin-web/package.json` name `buzz-admin-web` | Consumed as pnpm filters by `Dockerfile:116` (`pnpm install --frozen-lockfile --filter buzz-web --filter buzz-admin-web`), which is outside this change's scope |
| `mobile/lib/shared/theme/theme_provider.dart` `defaultSchemeDisplayName = 'Buzz'` | Mobile still ships upstream's Buzz theme. Renaming the label without restyling the theme would be a false label |
| `mobile/lib/shared/widgets/tappable_flapping_bee.dart` label `'Buzz bee'` | It is still the bee artwork; mobile theming is not part of this change |
| Trailing code comments mentioning Buzz | Internal documentation. Rewriting them adds merge conflicts for no user-facing gain |

---

## 3. Theme token table

Source of truth for anything not marked INFERRED:
`~/agentic-brain/sources/designs/Whisper-Create-Design.md`, sections 4.1 and 4.2.

### Whisper Work Dark (default)

| Token | Value | Origin |
|---|---|---|
| Page ground (`--background`) | `#0F0F0F` | Design doc: footer ink |
| Panel (`--card`, `--sidebar-background`) | `#141414` | Design doc: `--ink` |
| Raised panel (`--popover`, `--muted`, `--accent`, `--secondary`) | `#1A1A1A` | **INFERRED** — one step above the panel, matching the brief's panel pair |
| Primary text (`--foreground`) | `#E9E5DC` | Design doc: `--bone` |
| Raised text (`--card-foreground`, `--popover-foreground`) | `#F2EFE8` | Design doc: `--bone-2` |
| Muted text (`--muted-foreground`) | `#9A948C` | **INFERRED** — `--ink-soft` (`#6B6660`) lifted for a dark ground. `#6B6660` on `#0F0F0F` is 3.5:1; `#9A948C` is 6.3:1, and keeps the same warm-grey channel ratios |
| Border (`--border`, `--input`) | `#262626` | **INFERRED** — low-contrast on dark, 1.5:1 against the page ground |
| Sidebar border | `#1F1F1F` | **INFERRED** — quieter still, so the sidebar reads as one field |
| Focus ring (`--ring`, `--sidebar-ring`) | `#2C4BFF` | Design doc: `--cobalt` |
| Accent (pinned; `--primary`, `--sidebar-primary`) | `#2C4BFF` | Design doc: `--cobalt` |
| Selected nav fill (`--buzz-active-fill`) | `#2C4BFF` | Design doc: `--cobalt` |
| Sidebar gradient | `#1A1A1A` → `#0F0F0F` | **INFERRED** — a quiet vertical ramp replacing the bee gradient |
| Inset content canvas (`--buzz-content-dark`) | `#141414` | **INFERRED** — the panel value, so the reading surface lifts off the gradient |
| Destructive / git deleted | `#FF6B5A` | Design doc: `--coral`. This and the terminal's ANSI red are the only places coral appears |
| Git added | `#7FD9B9` | Design doc: `--mint` |
| Git modified | `#FFB35C` | Design doc: `--amber` |
| Terminal ANSI blue | `#6C86FF` | **INFERRED** — cobalt lifted for legibility on `#0F0F0F` |
| Terminal ANSI cyan | `#6FD0E0` | **INFERRED** — no cyan exists in the brand palette |
| Terminal ANSI black | `#3B3B3B` | Design doc: `--ink-2` |
| Terminal ANSI magenta | `#9D7BFF` | Design doc: `--violet` |

### Whisper Work (light)

| Token | Value | Origin |
|---|---|---|
| Page ground (`--background`) | `#E9E5DC` | Design doc: `--bone` |
| Panel (`--card`, `--popover`, `--sidebar-background`) | `#F7F5EF` | Design doc: `--plinth` |
| Quiet fill (`--muted`, `--accent`, `--secondary`) | `#F2EFE8` | Design doc: `--bone-2` |
| Primary text | `#141414` | Design doc: `--ink` |
| Muted text | `#6B6660` | Design doc: `--ink-soft` |
| Border (`--border`, `--input`) | `#D8D3C8` | **INFERRED** — approximately ink at 12% over bone, matching the doc's quiet-border band |
| Sidebar border | `#DDD8CD` | **INFERRED** — the quieter end of the same band |
| Focus ring, accent, selected nav fill | `#2C4BFF` | Design doc: `--cobalt` |
| Sidebar gradient | `#F7F5EF` → `#E9E5DC` | **INFERRED** — plinth settling into bone |
| Error / destructive / git deleted | `#8E3429` | Design doc: section 4.2 error text |
| Git added | `#2E8B6B` | **INFERRED** — no light-mode green in the brand palette |
| Git modified / ANSI yellow | `#8A5A12` | **INFERRED** — amber is unreadable on bone; darkened to hold contrast |
| Terminal ANSI magenta | `#6B45C9` | **INFERRED** — violet darkened for a light ground |
| Terminal ANSI cyan | `#1F6F7E` | **INFERRED** — no cyan exists in the brand palette |

### Typography — not changed

The design system's legibility voice is Space Grotesk variable. It was **not**
adopted: `@fontsource-variable/space-grotesk` is absent from `pnpm-lock.yaml`
and from the local pnpm store, so it cannot be installed offline, and adding it
would mean editing the root lockfile. The app keeps
`"Inter Variable", Inter, "Avenir Next", "Segoe UI", sans-serif`
(`desktop/src/shared/styles/globals/theme.css`). Swapping it is a one-line
change once the dependency is installed.

### Code highlighting

Like the Buzz pair, the Whisper Work themes are not bundled Shiki grammars.
`resolveShikiThemeName` maps them to `github-light` / `github-dark` for fenced
code blocks. Every other colour — the UI surfaces and the whole terminal
palette — comes from `whisper-work-theme.ts`.

---

## 4. Icons

Source artwork: the white WhisperCreate logomark,
`~/agentic-brain/Whisper Create Logo's/brand/Logo types/Logomarks/White logomark.png`,
cropped to its alpha bounds, scaled to fit an 18% margin, and centred on a
`#0F0F0F` rounded square with a 180px corner radius at 1024px (17.6%,
**INFERRED**).

Committed source: `desktop/src-tauri/icons/source/whisper-work-1024.png`.

To regenerate the whole icon set after changing that source:

```bash
cd desktop
corepack pnpm exec tauri icon src-tauri/icons/source/whisper-work-1024.png
```

That rewrites the PNG set, `icon.icns`, `icon.ico`, the Windows `Square*Logo`
files, and the `android/` and `ios/` subdirectories in
`desktop/src-tauri/icons/`. The two `desktop/public/app-icon@Nx.png` files and
the two favicons are not produced by `tauri icon`; they are composed from the
same logomark at 112px, 168px and 256px.
