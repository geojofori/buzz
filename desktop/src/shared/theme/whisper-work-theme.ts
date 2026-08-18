/**
 * Whisper Work theme palette.
 *
 * Whisper Work and Whisper Work Dark are the fork's first-party themes. They
 * follow the same shape as the Buzz pair: a name that is not a bundled Shiki
 * theme, a palette object that {@link extractThemeInfo} reads for base colours
 * and the terminal, and a sidebar gradient applied from CSS. The difference is
 * that these two carry their own colours rather than borrowing GitHub's, so the
 * WhisperCreate tokens land exactly rather than being derived by luminance.
 *
 * Colour source: `~/agentic-brain/sources/designs/Whisper-Create-Design.md`
 * sections 4.1 and 4.2. Values not present in that document are listed as
 * INFERRED in `WHISPER-WORK.md` at the repository root.
 */

import type { ThemeRegistrationRaw } from "shiki";
import { hexToHsl } from "./adaptive-theme";

/** Whisper Work theme name (light). */
export const WHISPER_WORK_THEME_NAME = "whisper-work";

/** Whisper Work Dark theme name; the dark half of the pair, and the default. */
export const WHISPER_WORK_DARK_THEME_NAME = "whisper-work-dark";

/**
 * Fixed accent for both Whisper Work themes: cobalt, the brand's focus and
 * cool accent. Like the Buzz pair, the accent is pinned rather than picked.
 */
export const WHISPER_WORK_ACCENT = "#2C4BFF";

/** Brand primitives, straight from the design system's token table. */
const BONE = "#E9E5DC";
const BONE_2 = "#F2EFE8";
const PLINTH = "#F7F5EF";
const INK = "#141414";
const INK_SOFT = "#6B6660";
const COBALT = "#2C4BFF";
const CORAL = "#FF6B5A";
const MINT = "#7FD9B9";
const VIOLET = "#9D7BFF";
const AMBER = "#FFB35C";
const FOOTER_INK = "#0F0F0F";

/** INFERRED values — see the table in WHISPER-WORK.md. */
const PANEL_DARK = "#141414";
const PANEL_DARK_RAISED = "#1A1A1A";
const INK_SOFT_ON_DARK = "#9A948C";
const BORDER_DARK = "#262626";
const BORDER_DARK_QUIET = "#1F1F1F";
const BORDER_LIGHT = "#D8D3C8";
const BORDER_LIGHT_QUIET = "#DDD8CD";
const ERROR_LIGHT = "#8E3429";
const GREEN_LIGHT = "#2E8B6B";
const YELLOW_LIGHT = "#8A5A12";
const MAGENTA_LIGHT = "#6B45C9";
const CYAN_LIGHT = "#1F6F7E";
const CYAN_DARK = "#6FD0E0";
const COBALT_ON_DARK = "#6C86FF";

/**
 * Whisper Work Dark palette. `editor.background` and `editor.foreground` are
 * the two colours every downstream derivation starts from; the terminal reads
 * the `terminal.ansi*` entries directly.
 */
export const WHISPER_WORK_DARK_THEME: ThemeRegistrationRaw = {
  name: WHISPER_WORK_DARK_THEME_NAME,
  type: "dark",
  colors: {
    "editor.background": FOOTER_INK,
    "editor.foreground": BONE,
    "gitDecoration.addedResourceForeground": MINT,
    "gitDecoration.deletedResourceForeground": CORAL,
    "gitDecoration.modifiedResourceForeground": AMBER,
    "terminal.ansiBlack": "#3B3B3B",
    "terminal.ansiRed": CORAL,
    "terminal.ansiGreen": MINT,
    "terminal.ansiYellow": AMBER,
    "terminal.ansiBlue": COBALT_ON_DARK,
    "terminal.ansiMagenta": VIOLET,
    "terminal.ansiCyan": CYAN_DARK,
    "terminal.ansiWhite": BONE,
    "terminalCursor.foreground": BONE_2,
    "terminalCursor.background": FOOTER_INK,
  },
  settings: [
    { scope: "comment", settings: { foreground: INK_SOFT_ON_DARK } },
    { scope: "string", settings: { foreground: MINT } },
    { scope: "keyword", settings: { foreground: CORAL } },
    { scope: "function", settings: { foreground: COBALT_ON_DARK } },
    { scope: "constant", settings: { foreground: VIOLET } },
    { scope: "type", settings: { foreground: AMBER } },
    { scope: "variable.parameter", settings: { foreground: CYAN_DARK } },
  ],
};

/** Whisper Work (light) palette: bone page, plinth panels, ink text. */
export const WHISPER_WORK_LIGHT_THEME: ThemeRegistrationRaw = {
  name: WHISPER_WORK_THEME_NAME,
  type: "light",
  colors: {
    "editor.background": BONE,
    "editor.foreground": INK,
    "gitDecoration.addedResourceForeground": GREEN_LIGHT,
    "gitDecoration.deletedResourceForeground": ERROR_LIGHT,
    "gitDecoration.modifiedResourceForeground": YELLOW_LIGHT,
    "terminal.ansiBlack": INK,
    "terminal.ansiRed": ERROR_LIGHT,
    "terminal.ansiGreen": GREEN_LIGHT,
    "terminal.ansiYellow": YELLOW_LIGHT,
    "terminal.ansiBlue": COBALT,
    "terminal.ansiMagenta": MAGENTA_LIGHT,
    "terminal.ansiCyan": CYAN_LIGHT,
    "terminal.ansiWhite": INK_SOFT,
    "terminalCursor.foreground": INK,
    "terminalCursor.background": BONE,
  },
  settings: [
    { scope: "comment", settings: { foreground: INK_SOFT } },
    { scope: "string", settings: { foreground: GREEN_LIGHT } },
    { scope: "keyword", settings: { foreground: ERROR_LIGHT } },
    { scope: "function", settings: { foreground: COBALT } },
    { scope: "constant", settings: { foreground: MAGENTA_LIGHT } },
    { scope: "type", settings: { foreground: YELLOW_LIGHT } },
    { scope: "variable.parameter", settings: { foreground: CYAN_LIGHT } },
  ],
};

/** Whether a theme name is one of the two Whisper Work themes. */
export function isWhisperWorkTheme(themeName: string): boolean {
  return (
    themeName === WHISPER_WORK_THEME_NAME ||
    themeName === WHISPER_WORK_DARK_THEME_NAME
  );
}

const DARK_SURFACE_VARS: Readonly<Record<string, string>> = {
  "--background": FOOTER_INK,
  "--card": PANEL_DARK,
  "--popover": PANEL_DARK_RAISED,
  "--muted": PANEL_DARK_RAISED,
  "--accent": PANEL_DARK_RAISED,
  "--secondary": PANEL_DARK_RAISED,
  "--foreground": BONE,
  "--card-foreground": BONE_2,
  "--popover-foreground": BONE_2,
  "--muted-foreground": INK_SOFT_ON_DARK,
  "--accent-foreground": BONE_2,
  "--secondary-foreground": BONE_2,
  "--border": BORDER_DARK,
  "--input": BORDER_DARK,
  "--ring": COBALT,
  "--sidebar-background": PANEL_DARK,
  "--sidebar-foreground": BONE,
  "--sidebar-accent": PANEL_DARK_RAISED,
  "--sidebar-accent-foreground": BONE_2,
  "--sidebar-border": BORDER_DARK_QUIET,
  "--sidebar-ring": COBALT,
};

const LIGHT_SURFACE_VARS: Readonly<Record<string, string>> = {
  "--background": BONE,
  "--card": PLINTH,
  "--popover": PLINTH,
  "--muted": BONE_2,
  "--accent": BONE_2,
  "--secondary": BONE_2,
  "--foreground": INK,
  "--card-foreground": INK,
  "--popover-foreground": INK,
  "--muted-foreground": INK_SOFT,
  "--accent-foreground": INK,
  "--secondary-foreground": INK,
  "--border": BORDER_LIGHT,
  "--input": BORDER_LIGHT,
  "--ring": COBALT,
  "--sidebar-background": PLINTH,
  "--sidebar-foreground": INK,
  "--sidebar-accent": BONE,
  "--sidebar-accent-foreground": INK,
  "--sidebar-border": BORDER_LIGHT_QUIET,
  "--sidebar-ring": COBALT,
};

/**
 * Exact surface tokens for a Whisper Work theme, or `null` for every other
 * theme.
 *
 * The adaptive engine derives surfaces from background luminance, which is
 * right for the bundled syntax themes but lands a few points off the brand's
 * fixed grounds (#0F0F0F page, #141414 and #1A1A1A panels). Callers merge this
 * over `createThemeVars`' result so the brand values are the ones applied and
 * cached; every other token stays derived.
 */
export function getWhisperWorkVarOverrides(
  themeName: string,
): Record<string, string> | null {
  const source =
    themeName === WHISPER_WORK_DARK_THEME_NAME
      ? DARK_SURFACE_VARS
      : themeName === WHISPER_WORK_THEME_NAME
        ? LIGHT_SURFACE_VARS
        : null;
  if (!source) return null;

  const vars: Record<string, string> = {};
  for (const [key, hex] of Object.entries(source)) {
    vars[key] = hexToHsl(hex);
  }
  return vars;
}
