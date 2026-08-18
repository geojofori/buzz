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
| `desktop/src-tauri/Info.plist` | `CFBundleDisplayName`, `CFBundleName` → `Whisper Work`; the three permission prompts now read "Whisper Work needs/uses …". Tauri merges this plist over its generated one, so these strings beat `productName` in Finder, the menu bar and every macOS permission dialog |
| `desktop/src-tauri/tauri.dev.conf.json` | dev `identifier` → `com.whispercreate.work.dev`; dev `productName` → `Whisper Work Dev` |
| `desktop/src-tauri/Cargo.toml` | `description` → `Whisper Work desktop app` (the package name `buzz-desktop` is unchanged: it is the executable name, see below) |
| `desktop/src-tauri/src/builderlab.rs` | The Builder Lab OAuth completion page: `<title>`, the mark's `aria-label`, and "return to Whisper Work" |
| `desktop/src-tauri/src/managed_agents/managed_node_paths.rs` | App-managed Node/npm root moved from `<data-dir>/Buzz` to `<data-dir>/Whisper Work`, via one constant `MANAGED_TOOLS_DATA_DIR` |

### Artwork

| File | Change |
|---|---|
| `desktop/src-tauri/icons/source/whisper-work-1024.png` | New icon source: the white WhisperCreate logomark centred on a `#0F0F0F` rounded square |
| `desktop/src-tauri/icons/**` | Regenerated from that source by `tauri icon` (52 files: PNG set, `icon.icns`, `icon.ico`, Windows Square*Logo, `android/`, `ios/`) |
| `desktop/public/app-icon@2x.png`, `app-icon@3x.png` | Redrawn from the same logomark at 112px and 168px |
| `desktop/public/whisper-work.svg` | New favicon: the logomark on the brand ground |
| `admin-web/public/favicon.svg` | Replaced the bee mark with the logomark |
| `desktop/src/shared/ui/buzz-logo/whisper-mark-dark.png`, `whisper-mark-light.png` | New: the WhisperCreate logomark, cropped to its alpha bounds and centred on a shared 512×316 transparent canvas, white artwork for dark themes, black for light |
| `desktop/src/shared/ui/buzz-logo/*.tsx`, `buzz-logo-animation.css` | The bee geometry is gone from `BuzzMark`, `FuzzyLogo`, `BuzzLogoAnimation` and `FlappingBee`; see section 5 |
| `desktop/src/features/onboarding/ui/LandingBees.tsx` | The 38-bee pointer-repelled field is gone; the corner mark remains |

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

### Typography

Space Grotesk Variable is now the UI face.
`@fontsource-variable/space-grotesk@^5.3.0` is a dependency of
`desktop/package.json`, pinned in the root `pnpm-lock.yaml`, imported in
`desktop/src/main.tsx` beside Inter, and first in the body stack in
`desktop/src/shared/styles/globals/theme.css`:

```css
font-family:
  "Space Grotesk Variable", "Space Grotesk", "Inter Variable", Inter,
  "Avenir Next", "Segoe UI", sans-serif;
```

Inter stays behind it as the fallback, and JetBrains Mono is untouched: code,
the terminal and anything else on `terminal.css` still render in mono.

The font files themselves are not linked into `node_modules` yet. The lockfile
entry and the package tarball are in place (`pnpm store add` fetched it), so
one `corepack pnpm install` links it offline. Until that runs, `pnpm dev` and
`pnpm build` will fail to resolve the import; `tsc`, `biome` and the unit
suite do not (Vite's ambient `*.css` module declaration covers the specifier).

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

---

## 5. The bundle identifier: one fact, one place

`desktop/src-tauri/tauri.conf.json` holds the release identifier
(`com.whispercreate.work`) and `tauri.dev.conf.json` the dev one
(`com.whispercreate.work.dev`). Tauri derives the app-data directory from the
identifier, so the identifier is what actually decides where a profile lives.

Rust used to spell `xyz.block.buzz.app` in thirteen places. It now reads the
value in one of two ways, in this order of preference:

1. **From the running config.** Anything holding a Tauri `AppHandle` already
   gets the identifier for free: `app.path().app_data_dir()` resolves it, and
   `app.config().identifier` reads it directly. `reset.rs` never held a
   literal at runtime, it takes the bundle id from
   `app_data_dir.file_name()`, and that is unchanged.
2. **From one shared constant,** for the callers that have no handle:
   `crates/buzz-core/src/app_identity.rs`.

   ```rust
   pub const DESKTOP_APP_IDENTIFIER: &str = "com.whispercreate.work";
   pub const DESKTOP_APP_IDENTIFIER_DEV: &str = concat!(…, ".dev");
   ```

   The literal is spelled exactly once, inside a private macro, and the `.dev`
   form is built from it with `concat!` at compile time. `buzz-core` was
   chosen because it is the only crate both `buzz-cli` and `buzz-desktop`
   already depend on (`buzz_core_pkg` in the desktop crate).

Who reads it now:

| Site | Reads |
|---|---|
| `desktop/src-tauri/src/migration.rs` | `CANONICAL_DEV_IDENTIFIER` / `RELEASE_IDENTIFIER` alias the two constants |
| `desktop/src-tauri/src/migration_tests.rs`, `migration_sync_guard_tests.rs` | The same two aliases, so the fixtures cannot drift from the app |
| `desktop/src-tauri/src/reset.rs` | Runtime derives from `app_data_dir`; the test fixtures use the constants, and `.reset-trash` is derived with `format!` rather than spelled |
| `crates/buzz-cli/src/commands/channel_templates.rs` | `PROD_BUNDLE_IDENTIFIER` is the shared constant. The CLI has no `AppHandle`, which is exactly the case the constant exists for |

### Existing Buzz data is not migrated, deliberately

Whisper Work starts with a **fresh data directory beside** any Buzz install.
`~/Library/Application Support/com.whispercreate.work` is a new, empty
directory; `xyz.block.buzz.app` is left untouched, with its identity key,
channels, agents and settings intact.

This is the choice, not an oversight. Buzz stores a Nostr identity key; a
silent copy would give two apps the same key with no way to tell which wrote
what, and a silent *move* would take a working install away from someone who
only wanted to try the fork. Both apps can be installed and run side by side.

Two knock-on effects follow from the same change, and both are correct:

- `migration.rs::legacy_app_data_dir` and
  `commands/legacy_storage.rs::legacy_identifier` map the *current*
  identifier back to the Sprout-era one. Since the current identifier is no
  longer `xyz.block.buzz.app`, the Sprout→current import is now inert on a
  Whisper Work build. There are no Sprout profiles beside a WhisperCreate
  bundle id, so there is nothing to import.
- The app-managed Node runtime moved to `<data-dir>/Whisper Work`, so a first
  run re-downloads Node and the ACP shims rather than reusing Buzz's copy.
  That directory is a bare literal (`dirs::data_dir()` knows nothing of
  `productName`) and follows no upstream tool convention, so it renames with
  the app.

### The executable name did not change

`DESKTOP_BINARY_NAMES` in
`desktop/src-tauri/src/managed_agents/runtime/instance_reaper.rs` gates
dead-instance detection on the desktop process name. Evidence from the
installed bundle:

```
$ /usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' /Applications/Buzz.app/Contents/Info.plist
buzz-desktop
$ ls /Applications/Buzz.app/Contents/MacOS/
buzz  buzz-acp  buzz-agent  buzz-backend-kubernetes  buzz-desktop  buzz-dev-mcp  git-credential-nostr
```

`CFBundleName` there is `Buzz`, yet the executable is `buzz-desktop`, the
Cargo package name. Tauri only renames the binary when `mainBinaryName` is
set, and it is not set in either config. So `productName: "Whisper Work"`
produces `Whisper Work.app` with `Contents/MacOS/buzz-desktop` inside, and the
existing `buzz-desktop` / `buzz_desktop` / `buzz-desktop.bi` entries still
match. The stale product-name entry `"Buzz"` was changed to `"Whisper Work"`
for consistency; it is belt-and-braces for a future build that does set
`mainBinaryName`. A false negative in this list reaps a live instance's
agents, so the list stays permissive rather than exact.

---

## 6. The mark

Upstream's bee was an SVG that assembled itself out of SMIL keyframes under a
looping `feTurbulence` texture. Whisper Work paints the WhisperCreate logomark
instead. Every export name and prop is unchanged, so 15 of the 17 call sites
are untouched; the two exceptions are inside `LandingBees`, which is itself a
decoration component and is rewritten below.

| Component | Now |
|---|---|
| `BuzzMark` | Both PNG variants, always in the DOM; CSS hides one off the `dark` class on `<html>`. No theme hook, so nothing re-renders on a theme switch and there is no wrong-artwork flash before scripting starts. `className` lands on each `<img>`, not on a wrapper, so callers' sizing utilities still work |
| `BuzzLogoAnimation` | A wrapper around `BuzzMark`. The SMIL morph, the texture filter and the variant table are gone; `loop`, `loopRestSeconds`, `reverse`, `textured` and `variant` remain in the prop type for call-site compatibility and drive nothing. 19,401 bytes → 2,158 |
| `FuzzyLogo` | The loading treatment: the same mark on a slow CSS opacity pulse (`buzz-logo--pulse`, 1.8s). `pulse={false}` still turns it off where a parent animates opacity itself |
| `FlappingBee` | Renders the static mark. Its four remaining call sites (`App.tsx`, `HuddleStartingView`, `PendingInviteGate`, `SetupStep`) are all boot or wait gates that need a visual anchor, so `null` would leave them blank |
| `LandingBees` | The corner mark only; the 38-bee pointer-repelled field and its `requestAnimationFrame` loop are gone |

The theme swap is CSS, in `buzz-logo-animation.css`, deliberately **unlayered**
so it beats Tailwind's `display` utilities (which sit in `@layer utilities`)
whatever a call site passes. Only `display` and `object-fit` are set there;
sizing stays with the caller.

`prefers-reduced-motion: reduce` drops the pulse to a steady, slightly dimmed
mark. `.buzz-logo--background` no longer paints the bee-yellow dot field; it
uses `var(--card)`.

Both PNGs are cropped to their alpha bounds and centred on the same 512×316
canvas, so switching theme never shifts layout. Sources:
`~/agentic-brain/Whisper Create Logo's/brand/Logo types/Logomarks/White logomark.png`
and `Black logo mark.png`. To regenerate:

```bash
python3 - <<'PY'
from PIL import Image
TARGET_W, TARGET_H = 512, 316
for dest, src in {
    "desktop/src/shared/ui/buzz-logo/whisper-mark-dark.png": "White logomark.png",
    "desktop/src/shared/ui/buzz-logo/whisper-mark-light.png": "Black logo mark.png",
}.items():
    im = Image.open(src).convert("RGBA")
    im = im.crop(im.getchannel("A").getbbox())
    scale = min(TARGET_W / im.width, TARGET_H / im.height)
    w, h = round(im.width * scale), round(im.height * scale)
    im = im.resize((w, h), Image.LANCZOS)
    canvas = Image.new("RGBA", (TARGET_W, TARGET_H), (0, 0, 0, 0))
    canvas.paste(im, ((TARGET_W - w) // 2, (TARGET_H - h) // 2), im)
    canvas.save(dest, optimize=True)
PY
```

Coverage: `desktop/src/shared/ui/buzz-logo/whisperMark.test.mjs` (6 tests)
pins the two-variant DOM contract, the caller's classes reaching the images,
the four stylesheet rules that do the theme swap, the absence of bee geometry,
and the pulse being on by default and off under `pulse={false}`.

---

## 7. Still to do

| Item | Why it is not done |
|---|---|
| `desktop/tests/e2e/boot-splash.spec.ts` | **Will fail.** It asserts `.bee-wing-left` inside the boot-splash overlay has `animation-name: bee-wing-left-flap` in the `running` state. There are no wings any more. The spec needs rewriting against the new mark; e2e is outside this change's fence and was not run |
| `desktop/tests/e2e/huddle-transcription.spec.ts:962` | **Will fail.** It waits for `.bee-sprite` inside `huddle-starting-view`; `FlappingBee` no longer emits that class. Same fence, same reason |
| `App.tsx`'s `BeeLoader` layers a pulsing `FuzzyLogo` over a static `BuzzMark` | Upstream did that so the animated bee could take over from the static one. Both are now the same artwork, so the pulse composites away and the loader reads as still. Fixing it means editing a call site, which this card deliberately did not touch |
| `desktop/src-tauri/src/builderlab.rs` OAuth page styling | The page is still bee-yellow (`#d7d72e`) with a bee SVG behind the renamed strings. Restyling it to the brand ground is a design change, not a rename |
| `scripts/reset-desktop-standalone-state.sh`, `scripts/test-reset-desktop-standalone-state.sh` | Both hard-code `xyz.block.buzz.app.dev` and will no-op against a Whisper Work dev profile. Outside this change's fence |
| `benchmarks/harbor-buzz-orchestra/scripts/benchmark.py` | `GUI_BUNDLE_IDENTIFIER = "xyz.block.buzz.app.benchmark"`. Outside this change's fence |
| `.github/workflows/release.yml`, `signed-macos-canary.yml` | Both name `Buzz.app` in the bundle paths; a release build now produces `Whisper Work.app`. Outside this change's fence, and untested here |
| `desktop/scripts/verify-macos-entitlements.sh` | Only its usage string says Buzz; it reads `CFBundleExecutable` from the plist, so it works unchanged |
| Doc comments naming `xyz.block.buzz.app` | `managed_agents/nest.rs`, `runtime/process.rs`, `runtime/instance_reaper.rs`, `runtime/tests.rs` and `commands/legacy_storage.rs` still spell it in comments and pure-function test fixtures. All still compile and pass; rewriting them buys nothing but rebase conflicts |
| `bee-wing*` CSS in `animations.css` | Now unused. Left in place rather than widening the diff |
| Font files in `node_modules` | Lockfile and pnpm store are ready; `corepack pnpm install` links them |
