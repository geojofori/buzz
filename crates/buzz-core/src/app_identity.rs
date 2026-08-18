//! Desktop bundle identifier, the single place Rust spells it.
//!
//! The authoritative value lives in `desktop/src-tauri/tauri.conf.json`
//! (`identifier`), with the dev override in `tauri.dev.conf.json`. Tauri
//! derives the app-data directory from it, so any code holding an
//! `AppHandle` should read `app.config().identifier` rather than these
//! constants. They exist only for the callers that have no handle: the
//! `buzz-cli` binary, which resolves the desktop's data directory from the
//! outside, and unit tests that construct data-directory paths by hand.
//!
//! Changing the identifier means editing the two Tauri config files and the
//! one literal below; every other spelling in Rust is derived from it.

/// The one literal. Kept as a macro so the `.dev` form can be built with
/// `concat!` at compile time instead of being spelled a second time.
macro_rules! desktop_app_identifier {
    () => {
        "com.whispercreate.work"
    };
}

/// Release bundle identifier of the desktop app.
///
/// Matches `identifier` in `desktop/src-tauri/tauri.conf.json`.
pub const DESKTOP_APP_IDENTIFIER: &str = desktop_app_identifier!();

/// Dev-build bundle identifier: the release identifier plus `.dev`.
///
/// Matches `identifier` in `desktop/src-tauri/tauri.dev.conf.json`. Per-worktree
/// dev instances append a further `.<slug>` to this value.
pub const DESKTOP_APP_IDENTIFIER_DEV: &str = concat!(desktop_app_identifier!(), ".dev");

#[cfg(test)]
mod tests {
    use super::{DESKTOP_APP_IDENTIFIER, DESKTOP_APP_IDENTIFIER_DEV};

    #[test]
    fn dev_identifier_is_the_release_identifier_plus_dev() {
        assert_eq!(
            DESKTOP_APP_IDENTIFIER_DEV,
            format!("{DESKTOP_APP_IDENTIFIER}.dev")
        );
    }

    /// A reverse-DNS identifier with no path separators is what Tauri joins
    /// onto the platform data dir; a stray slash would silently nest the
    /// app-data directory one level deeper.
    #[test]
    fn identifier_is_a_single_path_segment() {
        assert!(!DESKTOP_APP_IDENTIFIER.contains('/'));
        assert!(!DESKTOP_APP_IDENTIFIER.contains('\\'));
        assert!(!DESKTOP_APP_IDENTIFIER.is_empty());
    }
}
