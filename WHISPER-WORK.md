# Whisper work notes

Downstream product work in this fork, written for whoever picks it up next:
a person or an agent. One section per feature, describing the contract rather
than the code, so the section stays true after a refactor.

## Notes

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
