# Whisper fork: work log

Changes this fork carries on top of upstream Buzz. Upstream names ("Buzz",
`buzz-media:`, `xyz.block.buzz.app`) are left alone deliberately; nothing here
renames anything.

## Files panel and thread indicator

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
