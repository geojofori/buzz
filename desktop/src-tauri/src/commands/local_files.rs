//! Read-only previews of local files an agent has linked in a message.
//!
//! Agents routinely answer with a path ("wrote it to ~/notes/plan.md"). Opening
//! that in the OS pulls the reader out of the app, so the desktop renders it in
//! a right-hand panel instead. This module is the only door to the filesystem
//! that panel has, and it is deliberately narrow:
//!
//! - the resolved path must sit inside the user's home directory,
//! - resolution happens through `canonicalize`, so a symlink pointing out of
//!   home is rejected on its target, not on its name,
//! - directories, sockets and other non-files are refused,
//! - anything over [`MAX_PREVIEW_BYTES`] is refused rather than truncated,
//! - nothing is ever executed, written or deleted; the panel reads bytes only.

use std::path::{Path, PathBuf};

use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use tauri_plugin_opener::OpenerExt;
use tokio::io::AsyncReadExt;

/// Hard ceiling on a previewable file. A preview crosses the IPC boundary as
/// one JSON payload (base64 for binary), so the cap bounds both the read and
/// the renderer's memory.
pub const MAX_PREVIEW_BYTES: u64 = 8 * 1024 * 1024;

/// How the file-viewer panel should render a file.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum LocalFileKind {
    /// Rendered through the app's existing Markdown renderer.
    Markdown,
    /// Rendered as plain text in a `<pre>`.
    Text,
    /// Rendered as an image.
    Image,
    /// Offered to the OS opener; the webview has no safe inline PDF surface.
    Pdf,
    /// Rendered in a sandboxed frame, or as text when that is unavailable.
    Html,
    /// Recognised as a file, but the panel has no viewer for it.
    Unsupported,
}

/// A single file's contents, prepared for the file-viewer panel.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFilePreview {
    pub kind: LocalFileKind,
    /// The canonical path, so the panel keys tabs on identity rather than on
    /// whatever spelling the message happened to use.
    pub path: String,
    /// Final path component, used as the tab label.
    pub name: String,
    pub size: u64,
    pub mime: String,
    /// UTF-8 (lossy) contents for `markdown`, `text` and `html`.
    pub text: Option<String>,
    /// Standard base64 contents for `image` and `pdf`.
    pub data_base64: Option<String>,
}

/// Extensions rendered through the Markdown renderer.
const MARKDOWN_EXTENSIONS: &[&str] = &["md", "markdown", "mdown", "mdx"];

/// Extensions rendered as an image.
///
/// `svg` is included: an SVG referenced by an `<img>` element is a passive
/// image everywhere the app runs, so its scripts never execute and it cannot
/// fetch subresources. It is only unsafe when navigated to or framed, which
/// this panel never does.
const IMAGE_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "ico", "svg",
];

/// Extensions rendered in a sandboxed frame.
const HTML_EXTENSIONS: &[&str] = &["html", "htm"];

/// Extensions rendered verbatim as plain text. Deliberately an allowlist: an
/// unknown extension is far more likely to be binary than to be readable, and
/// a wrong guess paints control characters into the panel.
const TEXT_EXTENSIONS: &[&str] = &[
    "txt",
    "text",
    "log",
    "json",
    "jsonc",
    "json5",
    "ndjson",
    "yaml",
    "yml",
    "toml",
    "ini",
    "conf",
    "cfg",
    "csv",
    "tsv",
    "env",
    "diff",
    "patch",
    "rs",
    "ts",
    "tsx",
    "js",
    "jsx",
    "mjs",
    "cjs",
    "py",
    "rb",
    "go",
    "java",
    "kt",
    "kts",
    "swift",
    "c",
    "h",
    "cc",
    "cpp",
    "hpp",
    "cs",
    "m",
    "mm",
    "sh",
    "bash",
    "zsh",
    "fish",
    "ps1",
    "sql",
    "xml",
    "css",
    "scss",
    "sass",
    "less",
    "dart",
    "php",
    "lua",
    "pl",
    "r",
    "tf",
    "tfvars",
    "gradle",
    "properties",
    "graphql",
    "gql",
    "proto",
    "svelte",
    "vue",
    "astro",
    "ex",
    "exs",
    "erl",
    "hs",
    "clj",
    "cljs",
    "scala",
    "zig",
    "nim",
    "sol",
    "vim",
    "make",
    "mk",
    "cmake",
    "dockerfile",
    "gitignore",
    "gitattributes",
    "editorconfig",
    "lock",
    "srt",
    "vtt",
];

/// Classify a file purely by its extension.
///
/// Extension-only on purpose: sniffing content would mean reading the file
/// before the size and containment gates have run.
pub fn classify_extension(path: &Path) -> LocalFileKind {
    let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
        return LocalFileKind::Unsupported;
    };
    let extension = extension.to_ascii_lowercase();
    let extension = extension.as_str();

    if MARKDOWN_EXTENSIONS.contains(&extension) {
        LocalFileKind::Markdown
    } else if IMAGE_EXTENSIONS.contains(&extension) {
        LocalFileKind::Image
    } else if extension == "pdf" {
        LocalFileKind::Pdf
    } else if HTML_EXTENSIONS.contains(&extension) {
        LocalFileKind::Html
    } else if TEXT_EXTENSIONS.contains(&extension) {
        LocalFileKind::Text
    } else {
        LocalFileKind::Unsupported
    }
}

/// The MIME type the panel should treat the file as.
///
/// Only the image branch needs the extension back; every other kind has one
/// canonical type, and `text/plain` is the honest answer for the long tail.
pub fn mime_for(path: &Path, kind: LocalFileKind) -> String {
    match kind {
        LocalFileKind::Markdown => "text/markdown".to_owned(),
        LocalFileKind::Html => "text/html".to_owned(),
        LocalFileKind::Pdf => "application/pdf".to_owned(),
        LocalFileKind::Text | LocalFileKind::Unsupported => "text/plain".to_owned(),
        LocalFileKind::Image => {
            let extension = path
                .extension()
                .and_then(|value| value.to_str())
                .unwrap_or_default()
                .to_ascii_lowercase();
            match extension.as_str() {
                "png" => "image/png",
                "jpg" | "jpeg" => "image/jpeg",
                "gif" => "image/gif",
                "webp" => "image/webp",
                "avif" => "image/avif",
                "bmp" => "image/bmp",
                "ico" => "image/x-icon",
                "svg" => "image/svg+xml",
                _ => "application/octet-stream",
            }
            .to_owned()
        }
    }
}

/// Expand a leading `~` against `home`.
///
/// `~` and `~/…` only. A `~name` prefix names another user's home, which this
/// command has no business resolving, so it is left untouched and fails the
/// absolute-path gate instead.
pub fn expand_home(raw: &str, home: &Path) -> PathBuf {
    if raw == "~" {
        return home.to_path_buf();
    }
    if let Some(rest) = raw.strip_prefix("~/") {
        return home.join(rest);
    }
    PathBuf::from(raw)
}

/// Whether `candidate` is `root` or sits underneath it.
///
/// Component-wise by construction (`Path::starts_with`), so a sibling whose
/// name merely shares a prefix (`/Users/ada-backup` against `/Users/ada`) is
/// correctly outside. Both arguments must already be canonical; comparing
/// uncanonicalised paths would let `..` walk straight out.
pub fn is_contained_in(candidate: &Path, root: &Path) -> bool {
    candidate == root || candidate.starts_with(root)
}

/// Resolve a caller-supplied path to a canonical path inside the user's home.
///
/// Every failure is a refusal, not a fallback: a path this returns `Err` for is
/// never read, never opened and never reported on.
async fn resolve_home_path(raw: &str) -> Result<PathBuf, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("no file path was provided".to_owned());
    }

    let home = dirs::home_dir().ok_or_else(|| "no home directory is available".to_owned())?;
    let home = tokio::fs::canonicalize(&home)
        .await
        .map_err(|error| format!("cannot resolve the home directory: {error}"))?;

    let requested = expand_home(trimmed, &home);
    if !requested.is_absolute() {
        return Err("only absolute paths can be previewed".to_owned());
    }

    // `canonicalize` follows every symlink in the path, so the containment test
    // below runs against the real target. A link inside home that points at
    // /etc/passwd resolves to /etc/passwd and is refused here.
    let canonical = tokio::fs::canonicalize(&requested)
        .await
        .map_err(|error| format!("cannot open {}: {error}", requested.display()))?;

    if !is_contained_in(&canonical, &home) {
        return Err("only files inside your home directory can be opened here".to_owned());
    }

    Ok(canonical)
}

/// Open an already-canonicalised path once, without following a symlink in its
/// final component, and run the regular-file and size checks on that handle.
///
/// The checks and the later read all use this one descriptor, so a path that
/// is swapped for a symlink or a bigger file after canonicalisation cannot be
/// followed: `O_NOFOLLOW` refuses a symlink at open time, and the metadata is
/// `fstat` on the open file, not a second walk of the pathname. Residual: an
/// intermediate directory replaced by a symlink between canonicalisation and
/// open is not detected; that needs write access inside home, which already
/// grants everything this command can reach.
async fn open_checked_file(canonical: &Path) -> Result<(tokio::fs::File, u64), String> {
    let mut options = tokio::fs::OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    options.custom_flags(libc::O_NOFOLLOW);
    let file = options
        .open(canonical)
        .await
        .map_err(|error| format!("cannot open {}: {error}", canonical.display()))?;

    let metadata = file
        .metadata()
        .await
        .map_err(|error| format!("cannot read {}: {error}", canonical.display()))?;
    if !metadata.is_file() {
        return Err("only files can be previewed".to_owned());
    }

    let size = metadata.len();
    if size > MAX_PREVIEW_BYTES {
        return Err(format!(
            "file is {size} bytes; previews are capped at {MAX_PREVIEW_BYTES} bytes"
        ));
    }

    Ok((file, size))
}

/// Read from the checked handle, never more than the cap plus one byte, so a
/// file that grows after `fstat` is refused rather than swallowed whole.
async fn read_capped(file: tokio::fs::File, canonical: &Path) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();
    file.take(MAX_PREVIEW_BYTES + 1)
        .read_to_end(&mut bytes)
        .await
        .map_err(|error| format!("cannot read {}: {error}", canonical.display()))?;
    if bytes.len() as u64 > MAX_PREVIEW_BYTES {
        return Err(format!(
            "file grew past the {MAX_PREVIEW_BYTES} byte preview cap while it was being read"
        ));
    }
    Ok(bytes)
}

/// Read a local file for the in-app viewer panel.
///
/// Refuses anything outside the user's home directory, anything that is not a
/// regular file, and anything larger than 8 MiB.
#[tauri::command]
pub async fn read_local_file_preview(path: String) -> Result<LocalFilePreview, String> {
    let canonical = resolve_home_path(&path).await?;
    let (file, size) = open_checked_file(&canonical).await?;

    let kind = classify_extension(&canonical);
    let mime = mime_for(&canonical, kind);
    let name = canonical
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("file")
        .to_owned();

    let (text, data_base64) = match kind {
        LocalFileKind::Markdown | LocalFileKind::Text | LocalFileKind::Html => {
            let bytes = read_capped(file, &canonical).await?;
            (Some(String::from_utf8_lossy(&bytes).into_owned()), None)
        }
        LocalFileKind::Image | LocalFileKind::Pdf => {
            let bytes = read_capped(file, &canonical).await?;
            (None, Some(STANDARD.encode(bytes)))
        }
        // Nothing is read for an unsupported kind: the panel only offers to
        // hand it to the OS, so its bytes never need to cross the IPC boundary.
        LocalFileKind::Unsupported => (None, None),
    };

    Ok(LocalFilePreview {
        kind,
        path: canonical.to_string_lossy().into_owned(),
        name,
        size,
        mime,
        text,
        data_base64,
    })
}

/// Hand a local file to the OS default application.
///
/// Runs the same containment gate as the preview command, deliberately: the
/// renderer never gets an unscoped `open_path` capability, so the only paths it
/// can hand to the OS are ones this module has already resolved inside home.
#[tauri::command]
pub async fn open_local_file_externally(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let canonical = resolve_home_path(&path).await?;
    // Same checked open as the preview: a directory named `report.pdf`, a
    // socket, or a symlink swapped in after canonicalisation is refused here.
    // The pathname is still what LaunchServices receives, so a swap between
    // this check and the OS opening it is a residual that only an in-home
    // writer can exploit; documented in WHISPER-WORK.md.
    let (_file, _size) = open_checked_file(&canonical).await?;
    // Only kinds the panel itself would render (or a PDF) may be handed to the
    // OS. Everything else is refused: on macOS `open` will launch a `.command`,
    // `.app`, `.pkg` or `.dmg`, and a path in a chat message must never be one
    // click from executing.
    if classify_extension(&canonical) == LocalFileKind::Unsupported {
        return Err("this kind of file is not opened from the app".to_owned());
    }
    app.opener()
        .open_path(canonical.to_string_lossy().into_owned(), None::<&str>)
        .map_err(|error| format!("cannot open the file: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn launchable_kinds_are_unsupported_so_open_externally_refuses_them() {
        for name in [
            "run.command",
            "Thing.app",
            "setup.pkg",
            "disk.dmg",
            "tool.scpt",
            "flow.workflow",
        ] {
            assert_eq!(
                classify_extension(Path::new(name)),
                LocalFileKind::Unsupported,
                "{name} must not be a viewable kind"
            );
        }
    }

    #[test]
    fn classifies_markdown_by_extension() {
        assert_eq!(
            classify_extension(Path::new("/home/ada/notes/plan.md")),
            LocalFileKind::Markdown
        );
        assert_eq!(
            classify_extension(Path::new("/home/ada/notes/plan.MARKDOWN")),
            LocalFileKind::Markdown
        );
    }

    #[test]
    fn classifies_images_pdfs_html_and_text() {
        assert_eq!(
            classify_extension(Path::new("/home/ada/shot.PNG")),
            LocalFileKind::Image
        );
        assert_eq!(
            classify_extension(Path::new("/home/ada/logo.svg")),
            LocalFileKind::Image
        );
        assert_eq!(
            classify_extension(Path::new("/home/ada/report.pdf")),
            LocalFileKind::Pdf
        );
        assert_eq!(
            classify_extension(Path::new("/home/ada/page.htm")),
            LocalFileKind::Html
        );
        assert_eq!(
            classify_extension(Path::new("/home/ada/main.rs")),
            LocalFileKind::Text
        );
    }

    #[test]
    fn classifies_unknown_and_extensionless_paths_as_unsupported() {
        assert_eq!(
            classify_extension(Path::new("/home/ada/archive.zip")),
            LocalFileKind::Unsupported
        );
        assert_eq!(
            classify_extension(Path::new("/home/ada/Makefile")),
            LocalFileKind::Unsupported
        );
        assert_eq!(
            classify_extension(Path::new("/home/ada/notes")),
            LocalFileKind::Unsupported
        );
    }

    #[test]
    fn maps_each_kind_to_a_mime_type() {
        let markdown = Path::new("/home/ada/plan.md");
        assert_eq!(
            mime_for(markdown, classify_extension(markdown)),
            "text/markdown"
        );
        let jpeg = Path::new("/home/ada/shot.JPEG");
        assert_eq!(mime_for(jpeg, classify_extension(jpeg)), "image/jpeg");
        let pdf = Path::new("/home/ada/report.pdf");
        assert_eq!(mime_for(pdf, classify_extension(pdf)), "application/pdf");
        let unknown = Path::new("/home/ada/archive.zip");
        assert_eq!(mime_for(unknown, classify_extension(unknown)), "text/plain");
    }

    #[test]
    fn expands_only_a_leading_home_tilde() {
        let home = Path::new("/home/ada");
        assert_eq!(expand_home("~", home), PathBuf::from("/home/ada"));
        assert_eq!(
            expand_home("~/notes/plan.md", home),
            PathBuf::from("/home/ada/notes/plan.md")
        );
        // Another user's home is not ours to expand.
        assert_eq!(
            expand_home("~bob/secret", home),
            PathBuf::from("~bob/secret")
        );
        assert_eq!(
            expand_home("/etc/passwd", home),
            PathBuf::from("/etc/passwd")
        );
        // A tilde in the middle is an ordinary character.
        assert_eq!(
            expand_home("/home/ada/back~up.md", home),
            PathBuf::from("/home/ada/back~up.md")
        );
    }

    #[test]
    fn containment_accepts_the_root_and_its_descendants() {
        let home = Path::new("/home/ada");
        assert!(is_contained_in(home, home));
        assert!(is_contained_in(Path::new("/home/ada/notes/plan.md"), home));
    }

    #[test]
    fn containment_rejects_siblings_and_prefix_lookalikes() {
        let home = Path::new("/home/ada");
        assert!(!is_contained_in(Path::new("/etc/passwd"), home));
        assert!(!is_contained_in(Path::new("/home"), home));
        // The string prefix matches; the path does not.
        assert!(!is_contained_in(Path::new("/home/ada-backup/x.md"), home));
        assert!(!is_contained_in(Path::new("/home/adam/x.md"), home));
    }

    #[tokio::test]
    async fn refuses_an_empty_path() {
        let error = resolve_home_path("   ").await.unwrap_err();
        assert!(error.contains("no file path"), "unexpected error: {error}");
    }

    #[tokio::test]
    async fn refuses_a_relative_path() {
        let error = resolve_home_path("notes/plan.md").await.unwrap_err();
        assert!(error.contains("absolute"), "unexpected error: {error}");
    }

    #[tokio::test]
    async fn refuses_a_file_outside_the_home_directory() {
        // /etc/hosts exists on every platform this app ships to and is never
        // inside a home directory.
        let outside = if cfg!(windows) {
            "C:\\Windows\\win.ini"
        } else {
            "/etc/hosts"
        };
        let error = resolve_home_path(outside).await.unwrap_err();
        assert!(
            error.contains("home directory"),
            "unexpected error: {error}"
        );
    }

    #[tokio::test]
    async fn refuses_a_traversal_out_of_the_home_directory() {
        let error = resolve_home_path("~/../../etc/hosts").await.unwrap_err();
        assert!(
            error.contains("home directory") || error.contains("cannot open"),
            "unexpected error: {error}"
        );
    }

    #[tokio::test]
    async fn refuses_a_symlink_whose_target_escapes_home() {
        #[cfg(unix)]
        {
            let home = dirs::home_dir().expect("home directory");
            let link = home.join(format!("buzz-local-files-escape-{}.md", std::process::id()));
            let _ = std::fs::remove_file(&link);
            std::os::unix::fs::symlink("/etc/hosts", &link).expect("create symlink");

            let result = resolve_home_path(&link.to_string_lossy()).await;
            let _ = std::fs::remove_file(&link);

            let error = result.expect_err("symlink out of home must be refused");
            assert!(
                error.contains("home directory"),
                "unexpected error: {error}"
            );
        }
    }

    #[tokio::test]
    async fn refuses_a_file_larger_than_the_cap() {
        let home = dirs::home_dir().expect("home directory");
        let path = home.join(format!("buzz-local-files-big-{}.txt", std::process::id()));
        let _ = std::fs::remove_file(&path);
        std::fs::write(&path, vec![b'a'; (MAX_PREVIEW_BYTES + 1) as usize]).expect("write fixture");

        let result = read_local_file_preview(path.to_string_lossy().into_owned()).await;
        let _ = std::fs::remove_file(&path);

        let error = result.expect_err("oversized file must be refused");
        assert!(error.contains("capped at"), "unexpected error: {error}");
    }

    #[tokio::test]
    async fn reads_a_markdown_file_inside_home() {
        let home = dirs::home_dir().expect("home directory");
        let path = home.join(format!("buzz-local-files-ok-{}.md", std::process::id()));
        let _ = std::fs::remove_file(&path);
        std::fs::write(&path, "# Plan\n").expect("write fixture");

        let result = read_local_file_preview(path.to_string_lossy().into_owned()).await;
        let _ = std::fs::remove_file(&path);

        let preview = result.expect("markdown inside home must be readable");
        assert_eq!(preview.kind, LocalFileKind::Markdown);
        assert_eq!(preview.mime, "text/markdown");
        assert_eq!(preview.text.as_deref(), Some("# Plan\n"));
        assert_eq!(preview.data_base64, None);
        assert_eq!(preview.size, 7);
    }

    #[tokio::test]
    async fn refuses_a_directory() {
        let home = dirs::home_dir().expect("home directory");
        let error = read_local_file_preview(home.to_string_lossy().into_owned())
            .await
            .expect_err("a directory must be refused");
        assert!(error.contains("only files"), "unexpected error: {error}");
    }
}
