//! NIP-23 long-form notes (kind:30023) for the desktop Notes tab.
//!
//! The desktop half of the `buzz notes` contract. George writes a note in the
//! app; an agent reads the same event back with
//! `buzz notes get --name <slug> --content-only`. Nothing here invents its
//! own storage: the relay's parameterized-replaceable coordinate
//! `(30023, pubkey, d=slug)` IS the note, exactly as
//! `crates/buzz-cli/src/commands/notes.rs` writes it.
//!
//! Command names carry the `long_form` qualifier because this desktop already
//! exposes a kind:1 `get_note` (see `commands/social.rs`). Two different event
//! kinds sharing one command name would be a live collision, so the qualifier
//! is deliberate rather than decorative.
//!
//! Event shaping and the carry-forward matrix live in `events::notes` as pure
//! functions; this module owns only the relay round trips and the payload the
//! UI consumes.

use serde::Serialize;
use tauri::State;

use buzz_core_pkg::kind::KIND_LONG_FORM;

use crate::app_state::AppState;
use crate::events::{build_rm_note, build_set_note, note_coordinate, parse_slug, NoteSnapshot};
use crate::relay::{query_relay, submit_event, SubmitEventResponse};

/// Default page size for the notes list. Matches `buzz notes ls`.
const DEFAULT_LIST_LIMIT: u32 = 50;

/// Ceiling on a caller-supplied limit. Matches `buzz notes ls`, which clamps
/// with `.min(200)` rather than erroring, so an over-large request degrades to
/// a big page instead of a failure.
const MAX_LIST_LIMIT: u32 = 200;

/// One note as the UI consumes it.
///
/// `updated_at` is the event's `created_at` (the last-write-wins key for the
/// coordinate). `published_at` is the NIP-23 tag that survives every edit, so
/// the two diverge as soon as a note is edited once.
///
/// `coordinate` is the `30023:<pubkey>:<slug>` string an `a` tag and an
/// `naddr` both resolve to. The desktop carries no bech32 helper, so no
/// `naddr` field is emitted; the coordinate is the durable reference the UI
/// shows and an agent can paste.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct LongFormNote {
    pub event_id: String,
    pub pubkey: String,
    pub coordinate: String,
    pub slug: String,
    pub title: String,
    pub summary: Option<String>,
    pub tags: Vec<String>,
    pub published_at: Option<u64>,
    pub updated_at: u64,
    pub content: String,
}

impl From<NoteSnapshot> for LongFormNote {
    fn from(snapshot: NoteSnapshot) -> Self {
        let coordinate = snapshot.coordinate();
        LongFormNote {
            event_id: snapshot.event_id,
            pubkey: snapshot.pubkey,
            coordinate,
            slug: snapshot.slug,
            title: snapshot.title,
            summary: snapshot.summary,
            tags: snapshot.tags,
            published_at: snapshot.published_at,
            updated_at: snapshot.updated_at,
            content: snapshot.content,
        }
    }
}

/// Resolve the author to read from. `None` means the desktop's own identity,
/// which is the common case: the Notes tab shows George's own notebook.
///
/// Read paths only. Write paths take their author from
/// [`AppState::signing_keys`] instead, so a locked keyring or a lost identity
/// blocks publishing rather than signing under an invalid identity.
fn resolve_read_author(author: Option<String>, state: &AppState) -> Result<String, String> {
    match author {
        Some(hex) => {
            nostr::PublicKey::from_hex(&hex)
                .map_err(|e| format!("author must be a 64-hex pubkey: {e}"))?;
            Ok(hex.to_ascii_lowercase())
        }
        None => {
            let keys = state.keys.lock().map_err(|e| e.to_string())?;
            Ok(keys.public_key().to_hex())
        }
    }
}

/// The identity that will sign, as lowercase hex.
fn signing_pubkey(state: &AppState) -> Result<String, String> {
    Ok(state.signing_keys()?.public_key().to_hex())
}

/// Turn relay events into snapshots, newest first.
///
/// A single malformed event is skipped rather than failing the whole listing:
/// one corrupt note must not deny the user the rest of their notes. Same
/// "drop bad apples" policy as `commands/engrams.rs`.
fn snapshots_newest_first(events: Vec<nostr::Event>) -> Vec<NoteSnapshot> {
    let mut snapshots: Vec<NoteSnapshot> = events
        .iter()
        .filter_map(|event| NoteSnapshot::from_event(event).ok())
        .collect();
    snapshots.sort_by_key(|s| std::cmp::Reverse(s.updated_at));
    snapshots
}

/// Fetch the single live event for `(30023, author, d=slug)`.
///
/// A replaceable coordinate has at most one live event, but if a relay hands
/// back several we keep the newest rather than trusting result order.
async fn fetch_note_event(
    state: &AppState,
    author_hex: &str,
    slug: &str,
) -> Result<Option<nostr::Event>, String> {
    let mut events = query_relay(
        state,
        &[serde_json::json!({
            "kinds": [KIND_LONG_FORM],
            "authors": [author_hex],
            "#d": [slug],
            "limit": 1,
        })],
    )
    .await?;
    events.sort_by_key(|e| std::cmp::Reverse(e.created_at));
    Ok(events.into_iter().next())
}

/// `list_long_form_notes`: the author's notes, newest first.
///
/// Mirrors `buzz notes ls`: kind 30023, filtered to one author, bounded
/// limit. Bodies come back with the list because the Notes tab renders the
/// selected note straight from the same payload, and because `ls` in the CLI
/// prints the body too, so the two halves stay comparable.
#[tauri::command]
pub async fn list_long_form_notes(
    author: Option<String>,
    limit: Option<u32>,
    state: State<'_, AppState>,
) -> Result<Vec<LongFormNote>, String> {
    let author_hex = resolve_read_author(author, &state)?;
    let limit = limit.unwrap_or(DEFAULT_LIST_LIMIT).min(MAX_LIST_LIMIT);

    let events = query_relay(
        &state,
        &[serde_json::json!({
            "kinds": [KIND_LONG_FORM],
            "authors": [author_hex],
            "limit": limit,
        })],
    )
    .await?;

    Ok(snapshots_newest_first(events)
        .into_iter()
        .map(LongFormNote::from)
        .collect())
}

/// `get_long_form_note`: one note by slug.
///
/// Always resolved by the exact coordinate `(30023, author, d=slug)`, never
/// by the CLI's cross-author `#d` scan: the app is looking at one author's
/// notebook, so there is no ambiguous-slug case to disambiguate here.
///
/// Returns `Ok(None)` for "no such note" rather than an error, so the UI can
/// tell a missing note apart from a relay failure.
#[tauri::command]
pub async fn get_long_form_note(
    slug: String,
    author: Option<String>,
    state: State<'_, AppState>,
) -> Result<Option<LongFormNote>, String> {
    let slug = parse_slug(&slug)?;
    let author_hex = resolve_read_author(author, &state)?;

    let Some(event) = fetch_note_event(&state, &author_hex, &slug).await? else {
        return Ok(None);
    };
    Ok(Some(LongFormNote::from(NoteSnapshot::from_event(&event)?)))
}

/// `set_long_form_note`: idempotent create-or-update, as `buzz notes set`.
///
/// Read-before-write: the current event for `(me, slug)` is fetched first so
/// `published_at` carries forward and an empty `title` keeps the existing one.
/// Without that read every save from the app would reset the note's
/// publication date, and an agent reading `published_at` would watch the note
/// spring into existence again on each edit.
///
/// Parameter mapping onto the pure builder's omit-vs-clear matrix:
/// - an empty `title` means "carry the existing title", and is an error on
///   first publish because NIP-23 requires one;
/// - `summary: None` carries the existing summary, `Some("")` clears it;
/// - `tags` is always the explicit, complete set (the editor submits every
///   tag it shows), so it replaces rather than merges.
#[tauri::command]
pub async fn set_long_form_note(
    slug: String,
    title: String,
    content: String,
    summary: Option<String>,
    tags: Vec<String>,
    state: State<'_, AppState>,
) -> Result<LongFormNote, String> {
    let slug = parse_slug(&slug)?;
    let me = signing_pubkey(&state)?;

    let prior_event = fetch_note_event(&state, &me, &slug).await?;
    let prior = prior_event
        .as_ref()
        .map(NoteSnapshot::from_event)
        .transpose()?;

    let trimmed_title = title.trim();
    let title_arg = if trimmed_title.is_empty() {
        None
    } else {
        Some(trimmed_title)
    };
    let now = nostr::Timestamp::now().as_secs();

    let builder = build_set_note(
        prior.as_ref(),
        &slug,
        title_arg,
        summary.as_deref(),
        Some(tags.as_slice()),
        &content,
        now,
    )?;

    // `submit_event` already turns a non-accepted relay response into an
    // `Err`, so reaching this line means the relay took the event.
    let response = submit_event(builder, &state).await?;
    // NIP-33 is last-write-wins, so acceptance alone is not success: the relay
    // accepts and reports `duplicate:` when a newer (or same-second) head
    // dominated this write, in which case it never became the live note.
    // Reporting success there would show the user a saved note the relay does
    // not serve. Same guard as `buzz notes set`.
    if response.message.starts_with("duplicate") {
        return Err(
            "the relay reported this note as a duplicate, so it was dominated by a newer \
             version. Reload the note and re-apply your edit."
                .to_string(),
        );
    }

    // Report what was actually written rather than echoing the request: the
    // resolved title may have been carried from the prior, and `published_at`
    // is only knowable after the carry-forward.
    let resolved_title = title_arg
        .map(str::to_string)
        .or_else(|| prior.as_ref().map(|p| p.title.clone()))
        .unwrap_or_default();
    let published_at = prior.as_ref().and_then(|p| p.published_at).or(Some(now));
    let resolved_summary = summary.or_else(|| prior.as_ref().and_then(|p| p.summary.clone()));

    Ok(LongFormNote {
        event_id: response.event_id,
        coordinate: note_coordinate(&me, &slug),
        pubkey: me,
        slug,
        title: resolved_title,
        summary: resolved_summary,
        tags,
        published_at,
        updated_at: now,
        content,
    })
}

/// `delete_long_form_note`: NIP-09 deletion of the caller's own note.
///
/// Read-before-write first, so "there is nothing to delete" is a clear message
/// rather than a kind:5 published against a coordinate that was never written.
/// The deletion itself carries only an `a` tag; see
/// `events::notes::build_rm_note` for why an `e` tag would leave the note
/// alive.
#[tauri::command]
pub async fn delete_long_form_note(
    slug: String,
    state: State<'_, AppState>,
) -> Result<SubmitEventResponse, String> {
    let slug = parse_slug(&slug)?;
    let me = signing_pubkey(&state)?;

    if fetch_note_event(&state, &me, &slug).await?.is_none() {
        return Err(format!("no note {slug:?} found for you; nothing to delete"));
    }

    let builder = build_rm_note(&note_coordinate(&me, &slug))?;
    submit_event(builder, &state).await
}

#[cfg(test)]
mod tests {
    use super::*;

    fn snapshot() -> NoteSnapshot {
        NoteSnapshot {
            event_id: "e".repeat(64),
            pubkey: "a".repeat(64),
            slug: "dco-recipe".to_string(),
            title: "DCO recipe".to_string(),
            summary: Some("How we sign off".to_string()),
            tags: vec!["process".to_string()],
            published_at: Some(1_600_000_000),
            updated_at: 1_700_000_000,
            content: "# body".to_string(),
        }
    }

    #[test]
    fn note_payload_carries_the_addressable_coordinate() {
        let note = LongFormNote::from(snapshot());
        assert_eq!(
            note.coordinate,
            format!("30023:{}:dco-recipe", "a".repeat(64))
        );
        // published_at and updated_at are separate facts and must not be
        // collapsed into one: the first is the publication date, the second
        // the last edit.
        assert_eq!(note.published_at, Some(1_600_000_000));
        assert_eq!(note.updated_at, 1_700_000_000);
        assert_eq!(note.content, "# body");
    }

    #[test]
    fn listing_drops_unparseable_events_and_sorts_newest_first() {
        use nostr::{EventBuilder, Keys, Kind, Timestamp};
        let keys = Keys::generate();
        let mk = |slug: &str, at: u64| {
            EventBuilder::new(Kind::Custom(30023), "body")
                .tags(vec![nostr::Tag::parse(["d", slug]).unwrap()])
                .custom_created_at(Timestamp::from(at))
                .sign_with_keys(&keys)
                .unwrap()
        };
        // Missing the `d` tag: not a note, so it is skipped rather than
        // failing the whole listing.
        let malformed = EventBuilder::new(Kind::Custom(30023), "body")
            .sign_with_keys(&keys)
            .unwrap();
        // Wrong kind entirely: also skipped.
        let wrong_kind = EventBuilder::new(Kind::Custom(1), "hi")
            .sign_with_keys(&keys)
            .unwrap();

        let out = snapshots_newest_first(vec![
            mk("older", 100),
            malformed,
            mk("newer", 200),
            wrong_kind,
        ]);
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].slug, "newer");
        assert_eq!(out[1].slug, "older");
    }
}
