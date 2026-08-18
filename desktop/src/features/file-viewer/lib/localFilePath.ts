/**
 * Decides whether a link in a message points at a file on this machine.
 *
 * Agents answer with paths constantly ("saved it to ~/notes/plan.md"), and a
 * plain anchor hands those to the OS, which throws the reader out of the app.
 * Anything this returns a path for is opened in the in-app file viewer instead;
 * anything it returns `null` for keeps today's behaviour exactly.
 *
 * The bar for claiming a link is deliberately high. Getting it wrong in one
 * direction costs a trip to Finder; getting it wrong in the other silently
 * breaks an ordinary link, so an ambiguous href is left alone.
 */

/** `C:\Users\…` or `C:/Users/…`. */
const WINDOWS_DRIVE_PREFIX = /^[A-Za-z]:[\\/]/;

/** Characters that cannot legitimately appear in a path we would open. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the point
const FORBIDDEN_PATH_CHARACTERS = /[\u0000-\u001f]/;

function lastSegment(path: string): string {
  const separator = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return separator === -1 ? path : path.slice(separator + 1);
}

/**
 * Whether the final path segment carries an extension.
 *
 * A leading dot does not count (`.zshrc` is a name, not an extension) and a
 * trailing dot does not either.
 */
export function hasFileExtension(path: string): boolean {
  const segment = lastSegment(path);
  const dot = segment.lastIndexOf(".");
  return dot > 0 && dot < segment.length - 1;
}

function fromFileUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "file:") return null;
  // A non-empty host is a UNC/remote share, which this viewer does not reach.
  if (url.host && url.host !== "localhost") return null;

  let path: string;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  // Windows file URLs carry the drive behind a leading slash (`/C:/Users/…`).
  const withoutLeadingSlash = path.slice(1);
  if (WINDOWS_DRIVE_PREFIX.test(withoutLeadingSlash)) {
    return withoutLeadingSlash;
  }

  return path.startsWith("/") ? path : null;
}

/**
 * The local path a link points at, or `null` when the link is not local.
 *
 * Accepts three shapes:
 * - a `file:` URL, which states the intent outright;
 * - `~` or `~/…`, expanded against the user's home in Rust;
 * - an absolute path (`/Users/…`, `C:\Users\…`).
 *
 * Bare absolute paths additionally have to look like a file: `/settings` is
 * far more likely to be an in-app or site-relative link than a file on disk,
 * so only a final segment with an extension is claimed. A `file:` URL is
 * unambiguous and needs no such hedge.
 */
export function parseLocalFileHref(
  href: string | null | undefined,
): string | null {
  if (!href) return null;

  const raw = href.trim();
  if (!raw || FORBIDDEN_PATH_CHARACTERS.test(raw)) return null;

  if (raw.toLowerCase().startsWith("file:")) {
    const path = fromFileUrl(raw);
    return path && !FORBIDDEN_PATH_CHARACTERS.test(path) ? path : null;
  }

  const isHomeRelative = raw === "~" || raw.startsWith("~/");
  // `//host/share` is a protocol-relative URL, not an absolute path.
  const isPosixAbsolute = raw.startsWith("/") && !raw.startsWith("//");
  const isWindowsAbsolute = WINDOWS_DRIVE_PREFIX.test(raw);

  if (!isHomeRelative && !isPosixAbsolute && !isWindowsAbsolute) return null;
  if (!hasFileExtension(raw)) return null;

  return raw;
}

/** Whether a link should open in the in-app file viewer rather than the OS. */
export function isLocalFileHref(href: string | null | undefined): boolean {
  return parseLocalFileHref(href) !== null;
}
