# Whisper Work

WhisperCreate's downstream fork of [block/buzz](https://github.com/block/buzz),
Apache-2.0. Upstream is adopted as reviewed, pinned commits (see
SUNDAY-FORK.md); every downstream change lands as a small reviewable branch and
is recorded here, one section per piece of work, written for whoever picks it
up next, a person or an agent.

Sections 1 to 7 are the rename and brand work. Section 8 is the context
budget in the buzz-agent harness. Section 9 is the Notes tab. Section 10 is
the files panel and open-thread indicator.

The guiding rule for the rename is that **only user-visible identity changes**.
Every internal identifier stays on upstream's names: CSS classes and data
attributes (`buzz-*`, `data-buzz-sidebar`), TypeScript symbols, crate names,
storage keys (`buzz-theme`, `buzz-accent-color`), environment variables
(`BUZZ_*`), event kinds, deep-link schemes (`buzz://`), and the Flutter package
name `buzz`. That keeps upstream merges cheap: a rebase touches copy and
configuration, not structure.

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
| Raised panel (`--popover`, `--muted`, `--accent`, `--secondary`) | `#1A1A1A` | **INFERRED**: one step above the panel, matching the brief's panel pair |
| Primary text (`--foreground`) | `#E9E5DC` | Design doc: `--bone` |
| Raised text (`--card-foreground`, `--popover-foreground`) | `#F2EFE8` | Design doc: `--bone-2` |
| Muted text (`--muted-foreground`) | `#9A948C` | **INFERRED**: `--ink-soft` (`#6B6660`) lifted for a dark ground. `#6B6660` on `#0F0F0F` is 3.5:1; `#9A948C` is 6.3:1, and keeps the same warm-grey channel ratios |
| Border (`--border`, `--input`) | `#262626` | **INFERRED**: low-contrast on dark, 1.5:1 against the page ground |
| Sidebar border | `#1F1F1F` | **INFERRED**: quieter still, so the sidebar reads as one field |
| Focus ring (`--ring`, `--sidebar-ring`) | `#2C4BFF` | Design doc: `--cobalt` |
| Accent (pinned; `--primary`, `--sidebar-primary`) | `#2C4BFF` | Design doc: `--cobalt` |
| Selected nav fill (`--buzz-active-fill`) | `#2C4BFF` | Design doc: `--cobalt` |
| Sidebar gradient | `#1A1A1A` → `#0F0F0F` | **INFERRED**: a quiet vertical ramp replacing the bee gradient |
| Inset content canvas (`--buzz-content-dark`) | `#141414` | **INFERRED**: the panel value, so the reading surface lifts off the gradient |
| Destructive / git deleted | `#FF6B5A` | Design doc: `--coral`. This and the terminal's ANSI red are the only places coral appears |
| Git added | `#7FD9B9` | Design doc: `--mint` |
| Git modified | `#FFB35C` | Design doc: `--amber` |
| Terminal ANSI blue | `#6C86FF` | **INFERRED**: cobalt lifted for legibility on `#0F0F0F` |
| Terminal ANSI cyan | `#6FD0E0` | **INFERRED**: no cyan exists in the brand palette |
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
| Border (`--border`, `--input`) | `#D8D3C8` | **INFERRED**: approximately ink at 12% over bone, matching the doc's quiet-border band |
| Sidebar border | `#DDD8CD` | **INFERRED**: the quieter end of the same band |
| Focus ring, accent, selected nav fill | `#2C4BFF` | Design doc: `--cobalt` |
| Sidebar gradient | `#F7F5EF` → `#E9E5DC` | **INFERRED**: plinth settling into bone |
| Error / destructive / git deleted | `#8E3429` | Design doc: section 4.2 error text |
| Git added | `#2E8B6B` | **INFERRED**: no light-mode green in the brand palette |
| Git modified / ANSI yellow | `#8A5A12` | **INFERRED**: amber is unreadable on bone; darkened to hold contrast |
| Terminal ANSI magenta | `#6B45C9` | **INFERRED**: violet darkened for a light ground |
| Terminal ANSI cyan | `#1F6F7E` | **INFERRED**: no cyan exists in the brand palette |

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
code blocks. Every other colour, the UI surfaces and the whole terminal
palette, comes from `whisper-work-theme.ts`.

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

## 6b. Onboarding

The first-launch flow was upstream's loudest surface: a chartreuse (`#d7d72e`)
field under a dot grid, with a blurred `Buzz` wordmark bitmap on the landing.
It is now the brand's dark ground, and the landing leads with the logomark.

### The landing

`desktop/src/features/onboarding/ui/MachineOnboardingFlow.tsx`

| Was | Now |
|---|---|
| `<img src="/landing/buzz-wordmark.png">`, up to 600px wide | The logomark at `w-60` (240px), then the product name as UI text |
| Name baked into a bitmap | `<h1 class="text-title font-normal">Whisper Work</h1>`, Space Grotesk at 2.5rem / -0.02em, the display size every onboarding heading already uses |
| "Your people, your agents, your projects [em dash]<br>all in one place." | "Your people, your agents and your projects, in one place." on `text-muted-foreground`, one line of copy, no em dash |

This follows the logo law: the artwork is the logomark, and the name beside it
is UI text, never a typeset "logo". `desktop/public/landing/buzz-wordmark.png`
was deleted (nothing else referenced it) and the directory with it.

`OnboardingMark` (exported from `OnboardingChrome.tsx`) is new and small:
`BuzzMark` chooses artwork off `html.dark`, which is right wherever the page
ground follows the theme. The onboarding shell paints the dark ground on every
theme, so its mark is always the light-on-dark bitmap; the variant pair would
hide the mark completely under a light theme. The landing hero, the landing
corner mark and the step chrome all render `OnboardingMark`.

`LandingBees` keeps its corner mark for positional continuity with the step
chrome, which pins the same mark in the same place, but drops from `w-11` to
`w-8` at 50% opacity so it does not compete with the landing's own mark.

### The ground and the tokens

`desktop/src/shared/styles/globals/components.css`, `.buzz-onboarding-*` rules
only. Class names are unchanged; only values moved.

| Token / rule | Was | Now |
|---|---|---|
| `.buzz-onboarding-welcome` field | `#d7d72e` flat | `#0F0F0F` flat (page ground) |
| Dot grid | `rgb(0 0 0 / 0.08)` | `rgb(255 255 255 / 0.06)` |
| Step ramp | `#d7d72e` → `#d7e7f6` | `--buzz-onboarding-shell-top` `#141414` → `--buzz-onboarding-shell-bottom` `#0F0F0F` |
| `--buzz-welcome-chartreuse` | `#d7d72e` | `#2C4BFF` (cobalt) |
| `--buzz-onboarding-cta-label` (shell) | `#d7e6f0` | `#141414` (ink on the bone pill) |
| `--buzz-onboarding-backup-ink` (shell) | `#717106` olive | `rgb(233 229 220 / 0.9)` (bone at 90%) |

`--buzz-welcome-chartreuse` kept its name deliberately: `agentConfigControls.tsx`
and two `.buzz-onboarding-runtime-setup` rules read it from outside this
change's fence, so renaming it would have widened the diff into the agents
feature. It is now an accent (the setup chips and the runtime-setup flash
ring), never a page ground.

The startup shell's semantic tokens are the Whisper Work dark palette,
unconditionally:

```
.buzz-onboarding-neutral-theme.buzz-startup-shell:not(.buzz-onboarding-security-theme)
```

`--background` `0 0% 5.9%`, `--foreground` bone `41 23% 89%`, `--card`
`0 0% 7.8%`, `--popover`/`--secondary`/`--muted`/`--accent` `0 0% 10.2%`,
`--muted-foreground` `34 7% 57.6%`, `--border`/`--input` `0 0% 14.9%`,
`--primary` bone with `--primary-foreground` ink, `--destructive` coral,
`--ring` cobalt, plus `color-scheme: dark`.

Two things decide that selector. It sits *after* the
`[data-system-color-scheme]` blocks and carries a third class so it beats
them: several shells (recovery, keyring-locked, community) stamp the system
scheme on the same element, and a light token set on this ground would be
black text on near-black. And it excludes the backup-security subview, which
already owns a dark treatment of its own. Portaled onboarding dialogs are
separate surfaces: they keep the existing light and `.dark` blocks, and the
two that opt into light explicitly (`IdentityKeyHelpDialog`, the recovery
dialogs) still get olive key ink and the light-blue CTA label.

### Contrast repairs on the steps

Moving the ground from near-white to near-black turned several light chips
into bone-on-white. Fixed in the same pass:

| File | Change |
|---|---|
| `BackupStep.tsx` | The key card takes `textureTone="dark"`, so the bone key ink sits on the dark bake of the powder texture rather than the white one |
| `SetupStep.tsx` | Installing pill `bg-white/60` → `bg-foreground/10`; READY pill `bg-[#EBEFEF]` → `bg-foreground/10`; the empty-harness note `bg-white/70` → `bg-foreground/5` |
| `DefaultConfigStep.tsx` | Both harness selects `bg-white` → `bg-foreground/5` (they inherited bone label text) |
| `IdentityRecoveryPairing.tsx` | Copy-code button `bg-white` → `bg-foreground/5`. The QR frame stays white: a QR code needs it |
| `NostrKeyImportForm.tsx` | The backup-password field is on the neutral shell, not the security ground, so it follows the dark tokens instead of staying a white pill |
| `OnboardingChrome.tsx` | Secondary pill `bg-foreground/10` → `bg-secondary` (`#1A1A1A` with a bone label) |

Coverage: `desktop/src/features/onboarding/ui/machineOnboardingLanding.test.mjs`
(3 tests) pins the landing copy (named "Whisper Work", no em dash, the retired
wordmark path gone) and the shell's ground values.
`whisperMark.test.mjs`'s LandingBees test now pins one corner mark rather than
the theme-swap pair.

---

## 7. Still to do

| Item | Why it is not done |
|---|---|
| `desktop/tests/e2e/boot-splash.spec.ts` | **Will fail.** It asserts `.bee-wing-left` inside the boot-splash overlay has `animation-name: bee-wing-left-flap` in the `running` state. There are no wings any more. The spec needs rewriting against the new mark; e2e is outside this change's fence and was not run |
| `desktop/tests/e2e/identity-lost.spec.ts` | **Will fail.** It pins the old landing: gate `background-color: rgb(215, 215, 46)`, gate `color: rgb(23, 23, 23)`, the primary CTA's `background-color: rgb(23, 23, 23)`, and a ramp regex naming `rgb(215, 215, 46)` → `rgb(215, 231, 246)`. On the brand ground those become `rgb(15, 15, 15)`, `rgb(233, 229, 220)`, `rgb(233, 229, 220)` and a ramp of `rgb(20, 20, 20)` → `rgb(15, 15, 15)`. e2e is outside this card's fence and was not run |
| `desktop/tests/e2e/key-import-reveal.spec.ts:11` | **Will fail.** `BACKUP_INK = "rgb(113, 113, 6)"` is the olive key ink; on the startup shell the key ink is now `rgba(233, 229, 220, 0.9)`. Same fence, same reason |
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

---

## 8. Context budget (buzz-agent harness)

Every knob that bounds how many tokens a buzz-agent turn sends. The framing
that matters: a tool result, an image or a cached prefix is not paid once, it
is paid again on every later turn of the same session, because the whole
history is re-sent each round. So a cap on what enters the prompt is a
per-turn multiplier, and caching is what stops the unchanged part being
re-billed at full price.

### Per-request payload

| Knob | Default | What it bounds |
|---|---|---|
| `BUZZ_AGENT_MAX_TOOL_RESULT_TEXT_BYTES` | `16384` (16 KiB) | Text of a single tool result. Oversize is middle-elided, head and tail kept, with a marker naming how many bytes went, so the model knows to re-run something narrower rather than trust the gap. Was 50 KiB. `crates/buzz-agent/src/config.rs:395`, elision in `crates/buzz-agent/src/mcp.rs:916`. |
| `BUZZ_AGENT_KEEP_RECENT_IMAGES` | `2` | How many of the most recent image-bearing tool results still send their images. Older ones become `[image omitted from context: sent earlier in this session]`. Counted in image-bearing results, not turns or individual images: a result carrying several images uses one slot, and a run of text-only results never ages a screenshot out. Applied while the request body is built, so durable history keeps the real image and transcripts and handoffs are unaffected. `crates/buzz-agent/src/config.rs:403`, `crates/buzz-agent/src/llm.rs:744`. |
| `BUZZ_AGENT_MAX_CONTEXT_TOKENS` | `200000` | The provider window the handoff gate assumes. Compaction fires when the previous request's input tokens cross 90% of it, before the next request can exceed the window and 400. Not a cap on what is sent, a trigger for summarising and starting again. `crates/buzz-agent/src/config.rs:655`, threshold in `crates/buzz-agent/src/handoff.rs:499`. |

### Caching (what stops the unchanged prefix being re-billed)

| Knob | Default | What it bounds |
|---|---|---|
| `BUZZ_AGENT_PROMPT_CACHING` | `1` | The kill switch for every Anthropic `cache_control` breakpoint: the static prefix (tools plus system) and the rolling conversation tail. Reaches all three Anthropic-dialect routes, first-party Anthropic, the Databricks v2 Claude route, and OpenRouter `anthropic/*`. `0` removes the markers, and every cached read becomes a full-price input token. `crates/buzz-agent/src/config.rs:667`. |
| `BUZZ_AGENT_CACHE_TTL` | `1h` | How long a written cache entry lives on the first-party Anthropic route. `1h` stamps `"ttl": "1h"` on every breakpoint; `5m` emits no `ttl` field, which is Anthropic's own default. A 1-hour write costs 2x base input against 1.25x for the 5-minute one, and reads stay at 0.1x either way, so it pays for itself the first time a gap between turns exceeds five minutes. Not sent on the Databricks route, which Anthropic does not list among the providers offering the extended cache. Any value other than `5m` or `1h` is a startup error. `crates/buzz-agent/src/config.rs:1032`. |
| `BUZZ_AGENT_OPENROUTER_CACHE_TTL` | `1h` | The same, for OpenRouter's `anthropic/*` models. OpenRouter documents `"ttl": "1h"` as a supported and forwarded `cache_control` field. Set `5m` to fall back to today's shape if that ever regresses. `crates/buzz-agent/src/llm.rs:731`. |

Both TTL knobs resolve at the config boundary rather than at each marker: `5m`
parses to `None`, which is exactly the wire shape of a 5-minute cache, so no
call site has to compare strings and no request can end up with a TTL on some
breakpoints and not others. A mixed prefix would write two cache entries and
read neither, which is the one failure mode worse than not caching.

### Harness level (buzz-acp, not edited here)

| Knob | Default | What it bounds |
|---|---|---|
| `BUZZ_ACP_CONTEXT_MESSAGE_LIMIT` | `12` | How many prior Buzz messages are fetched and prepended as context for a thread reply or DM. Bounds the size of the very first prompt of a session; `0` disables the fetch, maximum 100. `crates/buzz-acp/src/config.rs:366`. |
| `BUZZ_ACP_MAX_TURNS_PER_SESSION` | `0` (off) | Turns before the session is proactively rotated and its history dropped. With it off, rotation happens only on `MaxTokens` or `MaxTurnRequests`, so the history keeps growing until something upstream forces the issue. `crates/buzz-acp/src/config.rs:372`. |

### Sources

- Anthropic prompt caching, including the 1-hour duration and the pricing
  multipliers: <https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching>
- OpenRouter prompt caching, "Cache TTL Options":
  <https://openrouter.ai/docs/features/prompt-caching>

---

## 9. Notes tab (NIP-23 long-form, kind 30023)

A Notes tab in the desktop app, backed by the NIP-23 long-form notes the
`buzz notes` CLI already reads and writes. The point of the feature is the
handoff: George writes a note in the app, and an agent reads that same note
from the relay with two CLI commands. Neither half owns a private store.

### The event contract

A note is a NIP-23 long-form event, kind `30023`. It is
parameterized-replaceable, so the note's identity is the coordinate
`(kind=30023, pubkey, d-tag)` and not any single event id. Saving a note
publishes a new event at the same coordinate, and the relay serves the newest
one.

Tags, in the order both halves emit them:

| Tag            | Meaning                                                       |
| -------------- | ------------------------------------------------------------- |
| `d`            | The slug. 1 to 80 chars, `a-z 0-9 - _ .` only.                |
| `title`        | Required on first publish; carried forward on later saves.    |
| `summary`      | Optional one-liner.                                           |
| `t`            | Repeated topic tags.                                          |
| `published_at` | Unix seconds. Set once on first publish, preserved after.     |

The Markdown body is the event content.

Two timestamps, deliberately distinct: `published_at` is when the note was
first published and survives every edit, while the event's `created_at` is
when it was last saved. The UI shows `created_at` as "updated".

Both halves do a read-before-write on save. That read is what carries
`published_at` forward and what lets an empty title mean "keep the existing
title". Skip it and every save from the app would reset the note's
publication date.

Deletion is a NIP-09 kind `5` event carrying **only** an `a` tag with the
coordinate (`30023:<pubkey>:<slug>`), and never an `e` tag. That is
load-bearing rather than tidy: the relay routes to its coordinate
soft-delete path only when the deletion has no `e` target ids. An `e` tag
routes to the per-event path instead, leaving the live replaceable row
intact, and the note survives its own deletion.

### How an agent reads a note

Two commands, no app involved:

```sh
buzz notes ls                                  # your notes, newest first, JSON
buzz notes get --name <slug> --content-only    # just the Markdown body
```

`buzz notes ls` also takes `--author <ref>`, `--tag <t>` and `--limit N`.
`buzz notes get` resolves either `--name <slug>` (add `--author` or
`--latest` when a slug exists for more than one author) or `--naddr`.

### Where it lives

| Half    | Path                                          | Role                                       |
| ------- | --------------------------------------------- | ------------------------------------------ |
| CLI     | `crates/buzz-cli/src/commands/notes.rs`       | `set` / `get` / `ls` / `rm`, pure builders |
| Desktop | `desktop/src-tauri/src/events/notes.rs`       | Pure builders and the tag parser           |
| Desktop | `desktop/src-tauri/src/commands/notes.rs`     | Four Tauri commands, relay round trips     |
| Desktop | `desktop/src/shared/api/notes.ts`             | Typed wrappers over `invokeTauri`          |
| Desktop | `desktop/src/features/notes/`                 | Hooks and the two-pane `NotesView`         |

The Tauri commands are `list_long_form_notes`, `get_long_form_note`,
`set_long_form_note` and `delete_long_form_note`. They carry the `long_form`
qualifier because the desktop already exposes a kind `1` `get_note` in
`commands/social.rs`, and two event kinds cannot share one command name.

The desktop returns the coordinate string rather than a bech32 `naddr`: it
has no bech32 helper, and the coordinate is what an `a` tag resolves to
anyway. Add the `naddr` field if a helper ever lands.

### Known duplication, to unify later

The pure event builder now exists twice: once in
`crates/buzz-cli/src/commands/notes.rs` and once in
`desktop/src-tauri/src/events/notes.rs`. Both encode the same carry-forward
matrix and the same a-tag-only deletion shape, and both have their own tests
for it.

The duplication is real but not accidental. The desktop is excluded from the
Cargo workspace and pins a different `nostr` version from the CLI, so the two
cannot share a builder today without first reconciling that. The follow-up is
to move the builder into one crate that both depend on, once the `nostr`
versions converge. Until then, a change to the contract has to land in both
files, and the tests in both files are the thing that catches a drift.

---

## 10. Files panel and open-thread indicator

### What opens where

An agent that answers with a path (`~/notes/plan.md`, `/Users/you/shot.png`,
`file:///Users/you/report.pdf`) used to send the reader out of the app: the OS
opener handed the file to Obsidian, Preview or a browser tab, and the reader
lost the conversation. Those links now open in a tabbed panel on the right.

- **Claimed as local files:** `file:` URLs; `~` and `~/…`; absolute paths
  (`/Users/…`, `C:\Users\…`) whose last segment carries an extension.
- **Left exactly as they were:** everything else. `https:`, `buzz://` deep
  links, relative paths, `//host/share`, `~otheruser/…`, and bare absolute
  paths with no extension (`/settings` is far likelier to be an in-app link
  than a file). The classifier is `parseLocalFileHref` in
  `desktop/src/features/file-viewer/lib/localFilePath.ts`; when it returns
  `null` the old anchor renders unchanged.
- **Rendering, by extension:** Markdown through the app's existing Markdown
  renderer; text in a `<pre>`; images fitted to the panel; HTML in a sandboxed
  frame with a "Show source" toggle; PDFs and unrecognised types offered to the
  OS default app. Every tab also has an "Open externally" action.
- **Where the panel sits:** the app shell's layout row, outboard of the whole
  channel surface (`desktop/src/app/AppShell.tsx`). The thread panel lives
  *inside* the channel surface, so a thread and a file can be open at once,
  thread nearest the conversation and file outermost, so they never contend for
  one slot. The panel renders nothing at all when no file is open, so it costs
  no width until asked for. Its width is remembered separately from the thread
  panel's (`buzz.desktop.file-viewer-width`).
- **Tabs persist across channel switches:** the provider
  (`desktop/src/features/file-viewer/FileViewerContext.tsx`) is mounted above
  the router in `desktop/src/main.tsx`. Tabs hold local file paths, which are
  not community-scoped, so nothing is reset on a community switch.

### Security boundary

One Rust module is the only door to the filesystem the panel has:
`desktop/src-tauri/src/commands/local_files.rs`.

- **Home only.** The requested path is expanded (`~` against `dirs::home_dir`),
  required to be absolute, then `canonicalize`d, and so is the home directory,
  before a component-wise containment test. Because canonicalisation runs
  first, a symlink inside home that points at `/etc/passwd` is judged on its
  target and refused. `..` traversal is refused for the same reason.
- **Files only.** Directories, sockets and devices are refused.
- **8 MiB ceiling.** Oversized files are refused, never truncated: a preview
  crosses the IPC boundary as one JSON payload, so the cap bounds both the read
  and the renderer's memory.
- **Read only.** Nothing is executed, written or deleted. Unsupported kinds are
  not even read; only their metadata crosses the boundary.
- **No unscoped opener capability.** "Open externally" goes through
  `open_local_file_externally`, which runs the same gate before handing the
  path to the OS. The renderer is deliberately *not* granted
  `opener:allow-open-path`, so it cannot ask the OS to open an arbitrary path.
  (The plugin's own path scope was considered and rejected: it matches globs
  literally, so it neither resolves symlinks nor, on Unix, matches any path
  with a dot-component, so `~/.config/notes.md` would silently fail.)
- **Links never carry a live href.** A claimed local-file link renders as a
  button, not an `<a href="file://…">`, so the webview cannot navigate to a
  `file:` URL even if a handler failed to run.
- **One handle, checked then read.** After canonicalisation the file is opened
  once with `O_NOFOLLOW`; the regular-file and size checks are `fstat` on that
  handle, and the read comes from the same handle, capped at 8 MiB plus one
  byte so a file that grows mid-read is refused. Added after the second-family
  review (GPT-5.6 Sol, 2026-08-18) found the earlier metadata-then-`read(path)`
  sequence racy. Residual, documented rather than hidden: a directory in the
  path swapped for a symlink between canonicalisation and open is not detected,
  and "Open externally" hands a pathname to LaunchServices that could be swapped
  after the check. Both need write access inside home, which already grants
  everything these commands can reach.
- **Launchable kinds are never opened.** `open_local_file_externally` refuses
  anything classified `Unsupported` (`.command`, `.app`, `.pkg`, `.dmg`,
  `.scpt`, `.workflow` and every unknown extension), and the panel shows no
  "open" action for them, so a link in a chat message is never one click from
  running something. Second-family review also noted that an origin-relative
  markdown href with an extension (`[guide](/docs/readme.md)`) is now claimed
  as a local file; that is intended (such an href never resolved to anything
  inside the app) and stays.

### CSP delta

**None. The policy in `desktop/src-tauri/tauri.conf.json` is unchanged.** What
the existing policy already permits, and what it forces:

- `img-src` already lists `data:` and `blob:`, so images render from a `data:`
  URL with no policy change.
- HTML renders in `<iframe sandbox="" srcdoc=…>`. A `srcdoc` document is a
  local-scheme child that inherits the parent policy rather than being fetched,
  so it needs no `frame-src` allowance; the empty `sandbox` gives it an opaque
  origin with no scripts, no forms and no top-level navigation, and the
  inherited `script-src 'self'` has nothing left to match.
- PDFs are **not** rendered inline. `object-src 'none'` blocks `<object>` and
  `<embed>`, and with no `frame-src` directive the policy falls back to
  `default-src 'self'`, which blocks a `blob:` frame. Widening the policy for
  one file type was not worth it, so PDFs get an "Open in your default app"
  button instead; the OS viewer is better at PDFs anyway.

### Thread indicator

Before this change nothing in the channel timeline said which thread the
right-hand panel had open: `TimelineMessageRow` and `MessageThreadSummaryRow`
had no notion of the open thread at all. Two quiet markers now do, both driven
by the same `openThreadHeadId` the thread panel reads, drilled from
`ChannelPane` through `MessageTimeline` and `TimelineMessageList`:

- `desktop/src/features/messages/ui/TimelineMessageRow.tsx`: the open thread's
  root message gets a left accent (inset `--primary` rule, no layout shift) and
  a faint tint.
- `desktop/src/features/messages/ui/MessageThreadSummaryRow.tsx`: its
  "N replies" row gains an "Open" pill and an accurate `aria-label`.

### Known limits

- Extensionless files (`Makefile`, `LICENSE`) classify as unsupported and are
  offered to the OS. A `file:` URL is the way to name one deliberately.
- A `#fragment` on a local path is treated as part of the filename, so
  `[plan](/Users/you/plan.md#top)` will not resolve.
- The classifier gates bare absolute paths on a file extension, so a genuine
  extensionless file linked as a bare path keeps the old OS-opener behaviour.
- Images are inlined as `data:` URLs; at the 8 MiB cap that is a ~11 MB string.
  Acceptable at this ceiling, worth revisiting if the cap ever rises.
- The sandboxed-`srcdoc` path has been reasoned from the CSP but not yet
  observed in a running WKWebView; the per-tab "Show source" toggle is the
  fallback if a frame ever comes back blank.
- `desktop/src-tauri/src/lib.rs` is at the 1000-line ratchet cap. Registering
  these two commands only fit because the three adjacent `huddle::` imports
  were merged into one group. The next command registered there will need the
  file split first.
