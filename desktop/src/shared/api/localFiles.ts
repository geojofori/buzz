import { invokeTauri } from "@/shared/api/tauri";

/**
 * How the file-viewer panel should render a file. Mirrors `LocalFileKind` in
 * `desktop/src-tauri/src/commands/local_files.rs`.
 */
export type LocalFileKind =
  | "markdown"
  | "text"
  | "image"
  | "pdf"
  | "html"
  | "unsupported";

/** A file's contents as prepared by the Rust side. */
export type LocalFilePreview = {
  kind: LocalFileKind;
  /** Canonical path; tabs are keyed on this, not on the linked spelling. */
  path: string;
  name: string;
  size: number;
  mime: string;
  /** Present for `markdown`, `text` and `html`. */
  text: string | null;
  /** Standard base64; present for `image` and `pdf`. */
  dataBase64: string | null;
};

/**
 * Read a local file for the viewer panel.
 *
 * Rust refuses anything outside the user's home directory, anything that is not
 * a regular file, and anything over 8 MiB. The rejection message is meant to be
 * shown to the reader as-is.
 */
export function readLocalFilePreview(path: string): Promise<LocalFilePreview> {
  return invokeTauri<LocalFilePreview>("read_local_file_preview", { path });
}

/**
 * Hand a local file to the OS default application.
 *
 * Routed through Rust rather than the opener plugin's JS command so the same
 * home-directory gate applies; the renderer never holds an unscoped
 * "open any path" capability.
 */
export function openLocalFileExternally(path: string): Promise<void> {
  return invokeTauri<void>("open_local_file_externally", { path });
}

/**
 * A `data:` URL for a preview's bytes, or `null` when the preview carries none.
 *
 * Used for images. The app's CSP already allows `data:` in `img-src`, so this
 * needs no policy change; the 8 MiB read cap bounds the string it produces.
 */
export function localFileDataUrl(preview: LocalFilePreview): string | null {
  if (!preview.dataBase64) return null;
  return `data:${preview.mime};base64,${preview.dataBase64}`;
}

/** Human-readable size for the tab's detail line. */
export function formatLocalFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}
