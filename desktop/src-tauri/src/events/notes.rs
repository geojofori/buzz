//! NIP-23 long-form note builders (kind:30023) for the desktop Notes tab.
//!
//! These are the desktop half of the same event contract the `buzz notes`
//! CLI writes and reads (`crates/buzz-cli/src/commands/notes.rs`). A note is
//! a parameterized-replaceable event keyed by `(kind=30023, pubkey, d-tag)`;
//! the `d` tag is the human slug. Keeping the two halves byte-compatible is
//! the whole point of the feature: George writes a note in the app, an agent
//! reads it back with `buzz notes get --name <slug> --content-only`.
//!
//! Contract mirrored from the CLI, tag for tag:
//! - `d` = slug, validated by [`parse_slug`] (1..=80 chars, `[a-z0-9._-]`).
//! - `title` = NIP-23 title. Required on first publish, carried on update.
//! - `summary` = optional NIP-23 summary.
//! - `t` = repeated topic tags.
//! - `published_at` = unix seconds, preserved across updates; set to `now`
//!   only on first publish.
//! - Tag order is `d`, `title`, optional `summary`, `t`*, `published_at`,
//!   same as the CLI, so two events written by the two halves diff empty.
//! - Deletion is a kind:5 carrying ONLY an `a` tag coordinate (never an `e`
//!   tag); see [`build_rm_note`] for why that is load-bearing.
//!
//! Everything here is a pure function over its arguments (no clock, no I/O)
//! so the carry-forward matrix and the deletion shape are unit-testable.
//! `commands/notes.rs` owns the relay round trips.

use buzz_core_pkg::kind::KIND_LONG_FORM;
use nostr::{EventBuilder, Kind, Tag, Timestamp};

use super::tag;

/// Hard cap on slug length. Matches `buzz-cli`'s `SLUG_MAX_LEN` so a slug
/// accepted by one half is never rejected by the other.
pub const SLUG_MAX_LEN: usize = 80;

/// Body-size guardrail for a note.
///
/// Deliberately NOT the desktop's 64 KiB `MAX_CONTENT_BYTES`: that cap is
/// sized for chat messages. `buzz notes set` accepts 1 MiB from stdin, so a
/// 64 KiB desktop cap would let an agent publish a note the app could no
/// longer save an edit to. Matching the CLI keeps both halves writable over
/// the same set of notes.
pub const NOTE_CONTENT_MAX_BYTES: usize = 1024 * 1024;

/// Validate a slug for use as the NIP-23 `d` tag.
///
/// Rules are the CLI's verbatim: non-empty, at most [`SLUG_MAX_LEN`] chars,
/// and only lowercase ascii, digits, `-`, `_`, `.`. Being strict costs
/// nothing and removes the "is `Dco-Recipe` the same slug as `dco-recipe`?"
/// ambiguity for anything addressing the note by coordinate.
pub fn parse_slug(raw: &str) -> Result<String, String> {
    if raw.is_empty() {
        return Err("slug cannot be empty".to_string());
    }
    if raw.len() > SLUG_MAX_LEN {
        return Err(format!(
            "slug too long ({} > {SLUG_MAX_LEN} chars)",
            raw.len()
        ));
    }
    for c in raw.chars() {
        let ok = c.is_ascii_lowercase() || c.is_ascii_digit() || matches!(c, '-' | '_' | '.');
        if !ok {
            return Err(format!(
                "slug contains invalid character {c:?}; allowed: a-z 0-9 - _ ."
            ));
        }
    }
    Ok(raw.to_string())
}

/// The NIP-23 fields carried in an event's tags.
///
/// Split out from [`NoteSnapshot`] so the tag parser is pure over the raw tag
/// matrix and can be tested without signing an event.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct NoteTagFields {
    /// `d` tag. `None` means the event is not a well-formed NIP-23 note.
    pub slug: Option<String>,
    /// `title` tag; empty when the author omitted it.
    pub title: String,
    /// `summary` tag.
    pub summary: Option<String>,
    /// Repeated `t` topic tags, in event order.
    pub tags: Vec<String>,
    /// `published_at` tag as unix seconds; `None` when absent or unparseable.
    pub published_at: Option<u64>,
}

/// Parse the NIP-23 tag matrix. Unknown tags are ignored; a repeated `d` /
/// `title` / `summary` keeps the last occurrence, matching the CLI's loop.
pub fn parse_note_tags(tags: &[Vec<String>]) -> NoteTagFields {
    let mut out = NoteTagFields::default();
    for parts in tags {
        let Some(name) = parts.first().map(String::as_str) else {
            continue;
        };
        let val = parts.get(1).map(String::as_str).unwrap_or("");
        match name {
            "d" => out.slug = Some(val.to_string()),
            "title" => out.title = val.to_string(),
            "summary" => out.summary = Some(val.to_string()),
            "t" if !val.is_empty() => out.tags.push(val.to_string()),
            "published_at" => out.published_at = val.parse::<u64>().ok(),
            _ => {}
        }
    }
    out
}

/// A parsed kind:30023 event.
///
/// `updated_at` is the event's `created_at`: for a parameterized-replaceable
/// coordinate that is the last-write-wins key, so it is the honest "last
/// updated" value. `published_at` is the separate NIP-23 tag that survives
/// every edit.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoteSnapshot {
    /// Event id of this incarnation, hex. Not the addressable coordinate.
    pub event_id: String,
    /// Author pubkey, hex.
    pub pubkey: String,
    pub slug: String,
    pub title: String,
    pub summary: Option<String>,
    pub tags: Vec<String>,
    pub published_at: Option<u64>,
    pub updated_at: u64,
    pub content: String,
}

impl NoteSnapshot {
    /// Parse a relay event into a snapshot. Errors on the wrong kind or a
    /// missing `d` tag, which are the two ways an event cannot be a note.
    pub fn from_event(event: &nostr::Event) -> Result<Self, String> {
        if event.kind != Kind::Custom(KIND_LONG_FORM as u16) {
            return Err(format!(
                "expected kind:{KIND_LONG_FORM}, got {}",
                event.kind.as_u16()
            ));
        }
        let raw_tags: Vec<Vec<String>> = event.tags.iter().map(|t| t.as_slice().to_vec()).collect();
        let fields = parse_note_tags(&raw_tags);
        let slug = fields.slug.ok_or_else(|| {
            format!("kind:{KIND_LONG_FORM} event is missing the required `d` tag")
        })?;

        Ok(NoteSnapshot {
            event_id: event.id.to_hex(),
            pubkey: event.pubkey.to_hex(),
            slug,
            title: fields.title,
            summary: fields.summary,
            tags: fields.tags,
            published_at: fields.published_at,
            updated_at: event.created_at.as_secs(),
            content: event.content.clone(),
        })
    }

    /// Canonical addressable coordinate for this note.
    pub fn coordinate(&self) -> String {
        note_coordinate(&self.pubkey, &self.slug)
    }
}

/// The addressable coordinate `30023:<pubkey-hex>:<slug>`: the string form
/// an `a` tag and a `naddr` both resolve to.
pub fn note_coordinate(author_pubkey_hex: &str, slug: &str) -> String {
    format!("{KIND_LONG_FORM}:{author_pubkey_hex}:{slug}")
}

/// Build the unsigned kind:30023 event for a create-or-update.
///
/// Carry-forward matrix, identical to `buzz-cli`'s `build_set_event`:
/// - `title: None` carries `prior.title`; on first publish it is an error,
///   because NIP-23 requires a title. `Some("")` is an explicit clear.
/// - `summary: None` carries `prior.summary`; `None` on first publish simply
///   emits no summary tag, since NIP-23 makes it optional.
/// - `tags: None` carries `prior.tags`; `Some(&[])` clears; `Some(slice)`
///   replaces the whole set verbatim (never merges).
/// - `published_at` is preserved from `prior` when present, and set to `now`
///   only on first publish.
///
/// `now` is unix SECONDS, not millis, and is injected so a test can assert
/// `published_at` preservation without touching the clock.
pub fn build_set_note(
    prior: Option<&NoteSnapshot>,
    slug: &str,
    title: Option<&str>,
    summary: Option<&str>,
    tags: Option<&[String]>,
    content: &str,
    now: u64,
) -> Result<EventBuilder, String> {
    let slug = parse_slug(slug)?;
    if content.len() > NOTE_CONTENT_MAX_BYTES {
        return Err(format!(
            "note body exceeds maximum size of {NOTE_CONTENT_MAX_BYTES} bytes (got {})",
            content.len()
        ));
    }

    let title_value: &str = match (title, prior) {
        (Some(t), _) => t,
        (None, Some(p)) => p.title.as_str(),
        (None, None) => return Err("a title is required on first publish (NIP-23)".to_string()),
    };

    let summary_value: Option<&str> = match (summary, prior) {
        (Some(s), _) => Some(s),
        (None, Some(p)) => p.summary.as_deref(),
        (None, None) => None,
    };

    let topic_tags: Vec<String> = match (tags, prior) {
        (Some(ts), _) => ts.to_vec(),
        (None, Some(p)) => p.tags.clone(),
        (None, None) => Vec::new(),
    };

    let published_at: u64 = prior.and_then(|p| p.published_at).unwrap_or(now);

    let mut evt_tags: Vec<Tag> = Vec::with_capacity(3 + topic_tags.len());
    evt_tags.push(tag(vec!["d", slug.as_str()])?);
    evt_tags.push(tag(vec!["title", title_value])?);
    if let Some(s) = summary_value {
        evt_tags.push(tag(vec!["summary", s])?);
    }
    for t in &topic_tags {
        evt_tags.push(tag(vec!["t", t.as_str()])?);
    }
    let published_at_str = published_at.to_string();
    evt_tags.push(tag(vec!["published_at", published_at_str.as_str()])?);

    Ok(
        EventBuilder::new(Kind::Custom(KIND_LONG_FORM as u16), content)
            .tags(evt_tags)
            .custom_created_at(Timestamp::from(now)),
    )
}

/// Build the NIP-09 deletion (kind:5) for a note's addressable coordinate.
///
/// The event carries ONLY an `a` tag and never an `e` tag. That is
/// load-bearing, not tidiness: the relay routes to its coordinate
/// soft-delete path only when the kind:5 has no `e` target ids. An `e` tag
/// routes to the per-event path instead, which leaves the live replaceable
/// row intact and the note survives its own deletion. Same reasoning, and
/// same shape, as `buzz-cli`'s `build_rm_event`.
pub fn build_rm_note(coordinate: &str) -> Result<EventBuilder, String> {
    if coordinate.is_empty() {
        return Err("coordinate cannot be empty".to_string());
    }
    let tags = vec![tag(vec!["a", coordinate])?];
    Ok(EventBuilder::new(Kind::Custom(5), "").tags(tags))
}

#[cfg(test)]
mod tests {
    use super::*;
    use nostr::Keys;

    const AUTHOR_HEX: &str = "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";

    fn snapshot(
        title: &str,
        summary: Option<&str>,
        tags: &[&str],
        published_at: Option<u64>,
    ) -> NoteSnapshot {
        NoteSnapshot {
            event_id: "a".repeat(64),
            pubkey: AUTHOR_HEX.to_string(),
            slug: "dco-recipe".to_string(),
            title: title.to_string(),
            summary: summary.map(str::to_string),
            tags: tags.iter().map(|t| (*t).to_string()).collect(),
            published_at,
            updated_at: 1_000,
            content: "prior body".to_string(),
        }
    }

    /// Signing is the only way to read tags back off an `EventBuilder`, so
    /// every builder assertion goes through a throwaway key.
    fn tags_of(builder: EventBuilder) -> (nostr::Event, Vec<Vec<String>>) {
        let event = builder.sign_with_keys(&Keys::generate()).expect("sign");
        let tags = event.tags.iter().map(|t| t.as_slice().to_vec()).collect();
        (event, tags)
    }

    #[test]
    fn first_publish_has_the_cli_tag_layout_and_kind() {
        let builder = build_set_note(
            None,
            "dco-recipe",
            Some("DCO recipe"),
            Some("How we sign off"),
            Some(&["process".to_string(), "git".to_string()]),
            "# body",
            1_700_000_000,
        )
        .expect("build");
        let (event, tags) = tags_of(builder);

        assert_eq!(event.kind, Kind::Custom(30023));
        assert_eq!(event.content, "# body");
        assert_eq!(event.created_at.as_secs(), 1_700_000_000);
        // Order is the CLI's: d, title, summary, t*, published_at.
        assert_eq!(tags[0], vec!["d", "dco-recipe"]);
        assert_eq!(tags[1], vec!["title", "DCO recipe"]);
        assert_eq!(tags[2], vec!["summary", "How we sign off"]);
        assert_eq!(tags[3], vec!["t", "process"]);
        assert_eq!(tags[4], vec!["t", "git"]);
        assert_eq!(tags[5], vec!["published_at", "1700000000"]);
        assert_eq!(tags.len(), 6);
    }

    #[test]
    fn first_publish_without_a_title_is_refused() {
        let err = build_set_note(None, "dco-recipe", None, None, None, "body", 10).unwrap_err();
        assert!(err.contains("title is required"), "got {err}");
    }

    #[test]
    fn first_publish_without_a_summary_emits_no_summary_tag() {
        let builder =
            build_set_note(None, "dco-recipe", Some("T"), None, None, "body", 10).expect("build");
        let (_, tags) = tags_of(builder);
        assert!(!tags.iter().any(|t| t[0] == "summary"), "{tags:?}");
        assert!(!tags.iter().any(|t| t[0] == "t"), "{tags:?}");
    }

    #[test]
    fn update_carries_published_at_forward_and_moves_created_at() {
        let prior = snapshot(
            "Old title",
            Some("Old summary"),
            &["process"],
            Some(1_600_000_000),
        );
        let builder = build_set_note(
            Some(&prior),
            "dco-recipe",
            Some("New title"),
            None,
            None,
            "new body",
            1_700_000_000,
        )
        .expect("build");
        let (event, tags) = tags_of(builder);

        assert_eq!(event.created_at.as_secs(), 1_700_000_000);
        assert_eq!(tags[1], vec!["title", "New title"]);
        // summary and topics carried, published_at preserved from the prior.
        assert_eq!(tags[2], vec!["summary", "Old summary"]);
        assert_eq!(tags[3], vec!["t", "process"]);
        assert_eq!(tags[4], vec!["published_at", "1600000000"]);
    }

    #[test]
    fn update_without_a_title_carries_the_existing_one() {
        let prior = snapshot("Old title", None, &[], Some(500));
        let builder = build_set_note(Some(&prior), "dco-recipe", None, None, None, "body", 900)
            .expect("build");
        let (_, tags) = tags_of(builder);
        assert_eq!(tags[1], vec!["title", "Old title"]);
    }

    #[test]
    fn explicit_empty_values_clear_rather_than_carry() {
        let prior = snapshot("Old title", Some("Old summary"), &["process"], Some(500));
        let builder = build_set_note(
            Some(&prior),
            "dco-recipe",
            Some(""),
            Some(""),
            Some(&[]),
            "body",
            900,
        )
        .expect("build");
        let (_, tags) = tags_of(builder);
        assert_eq!(tags[0], vec!["d", "dco-recipe"]);
        assert_eq!(tags[1], vec!["title", ""]);
        assert_eq!(tags[2], vec!["summary", ""]);
        assert!(!tags.iter().any(|t| t[0] == "t"), "{tags:?}");
        assert_eq!(tags[3], vec!["published_at", "500"]);
    }

    #[test]
    fn explicit_tags_replace_rather_than_merge() {
        let prior = snapshot("T", None, &["process", "git"], Some(500));
        let builder = build_set_note(
            Some(&prior),
            "dco-recipe",
            None,
            None,
            Some(&["release".to_string()]),
            "body",
            900,
        )
        .expect("build");
        let (_, tags) = tags_of(builder);
        let topics: Vec<&Vec<String>> = tags.iter().filter(|t| t[0] == "t").collect();
        assert_eq!(topics, vec![&vec!["t".to_string(), "release".to_string()]]);
    }

    #[test]
    fn a_prior_without_published_at_gets_now() {
        let prior = snapshot("T", None, &[], None);
        let builder = build_set_note(Some(&prior), "dco-recipe", None, None, None, "body", 4_242)
            .expect("build");
        let (_, tags) = tags_of(builder);
        assert_eq!(tags.last().unwrap(), &vec!["published_at", "4242"]);
    }

    #[test]
    fn slug_validation_matches_the_cli_rules() {
        assert_eq!(parse_slug("dco-recipe.v2_1").unwrap(), "dco-recipe.v2_1");
        assert!(parse_slug("").is_err());
        assert!(
            parse_slug("Dco-Recipe").is_err(),
            "uppercase must be refused"
        );
        assert!(parse_slug("has space").is_err());
        assert!(parse_slug("has/slash").is_err());
        assert_eq!(
            parse_slug(&"a".repeat(SLUG_MAX_LEN)).unwrap().len(),
            SLUG_MAX_LEN
        );
        assert!(parse_slug(&"a".repeat(SLUG_MAX_LEN + 1)).is_err());
    }

    #[test]
    fn build_set_note_rejects_an_invalid_slug() {
        let err = build_set_note(None, "Not A Slug", Some("T"), None, None, "b", 1).unwrap_err();
        assert!(err.contains("invalid character"), "got {err}");
    }

    #[test]
    fn build_set_note_rejects_an_oversized_body() {
        let body = "x".repeat(NOTE_CONTENT_MAX_BYTES + 1);
        let err = build_set_note(None, "slug", Some("T"), None, None, &body, 1).unwrap_err();
        assert!(err.contains("exceeds maximum size"), "got {err}");
    }

    #[test]
    fn deletion_is_kind_5_with_an_a_tag_and_no_e_tag() {
        let coord = note_coordinate(AUTHOR_HEX, "dco-recipe");
        assert_eq!(coord, format!("30023:{AUTHOR_HEX}:dco-recipe"));

        let (event, tags) = tags_of(build_rm_note(&coord).expect("build"));
        assert_eq!(event.kind, Kind::Custom(5));
        assert_eq!(event.content, "");
        assert_eq!(tags, vec![vec!["a".to_string(), coord]]);
        // An `e` tag would route the relay to the per-event delete path and
        // leave the live replaceable row alive. It must never appear.
        assert!(!tags.iter().any(|t| t[0] == "e"), "{tags:?}");
    }

    #[test]
    fn empty_coordinate_is_refused() {
        assert!(build_rm_note("").is_err());
    }

    #[test]
    fn tag_parser_reads_every_nip23_field() {
        let fields = parse_note_tags(&[
            vec!["d".into(), "dco-recipe".into()],
            vec!["title".into(), "DCO recipe".into()],
            vec!["summary".into(), "How we sign off".into()],
            vec!["t".into(), "process".into()],
            vec!["t".into(), "git".into()],
            vec!["t".into(), String::new()],
            vec!["published_at".into(), "1600000000".into()],
            vec!["unknown".into(), "ignored".into()],
            vec![],
        ]);
        assert_eq!(fields.slug.as_deref(), Some("dco-recipe"));
        assert_eq!(fields.title, "DCO recipe");
        assert_eq!(fields.summary.as_deref(), Some("How we sign off"));
        // The empty `t` value is dropped, matching the CLI's `t if !val.is_empty()`.
        assert_eq!(fields.tags, vec!["process".to_string(), "git".to_string()]);
        assert_eq!(fields.published_at, Some(1_600_000_000));
    }

    #[test]
    fn tag_parser_tolerates_missing_and_unparseable_values() {
        let fields = parse_note_tags(&[
            vec!["title".into()],
            vec!["published_at".into(), "not-a-number".into()],
        ]);
        assert_eq!(fields.slug, None);
        assert_eq!(fields.title, "");
        assert_eq!(fields.published_at, None);
    }

    #[test]
    fn snapshot_round_trips_a_signed_event() {
        let keys = Keys::generate();
        let event = build_set_note(
            None,
            "dco-recipe",
            Some("DCO recipe"),
            Some("How we sign off"),
            Some(&["process".to_string()]),
            "# body",
            1_700_000_000,
        )
        .expect("build")
        .sign_with_keys(&keys)
        .expect("sign");

        let snap = NoteSnapshot::from_event(&event).expect("parse");
        assert_eq!(snap.slug, "dco-recipe");
        assert_eq!(snap.title, "DCO recipe");
        assert_eq!(snap.summary.as_deref(), Some("How we sign off"));
        assert_eq!(snap.tags, vec!["process".to_string()]);
        assert_eq!(snap.published_at, Some(1_700_000_000));
        assert_eq!(snap.updated_at, 1_700_000_000);
        assert_eq!(snap.content, "# body");
        assert_eq!(snap.pubkey, keys.public_key().to_hex());
        assert_eq!(
            snap.coordinate(),
            format!("30023:{}:dco-recipe", keys.public_key().to_hex())
        );
    }

    #[test]
    fn snapshot_refuses_the_wrong_kind() {
        let event = EventBuilder::new(Kind::Custom(1), "hi")
            .sign_with_keys(&Keys::generate())
            .expect("sign");
        let err = NoteSnapshot::from_event(&event).unwrap_err();
        assert!(err.contains("expected kind:30023"), "got {err}");
    }

    #[test]
    fn snapshot_refuses_an_event_without_a_d_tag() {
        let event = EventBuilder::new(Kind::Custom(30023), "hi")
            .tags(vec![tag(vec!["title", "T"]).unwrap()])
            .sign_with_keys(&Keys::generate())
            .expect("sign");
        let err = NoteSnapshot::from_event(&event).unwrap_err();
        assert!(err.contains("`d` tag"), "got {err}");
    }
}
