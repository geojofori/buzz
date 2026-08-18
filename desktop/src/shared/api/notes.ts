/**
 * Tauri wrappers for NIP-23 long-form notes (kind:30023).
 *
 * The Rust commands carry a `long_form` qualifier because this app already
 * exposes a kind:1 `get_note` in `social.ts`. These wrapper names stay short
 * because they are module-scoped: import them as `notesApi` or by name.
 */

import {
  type DeleteNoteResult,
  fromRawNote,
  type Note,
  type RawDeleteNoteResult,
  type RawNote,
  type SetNoteInput,
} from "@/shared/api/notesTypes";

import { invokeTauri } from "./tauri";

/**
 * List an author's notes, newest first.
 *
 * `author` defaults to this desktop's own identity in Rust, so the common
 * case passes nothing.
 */
export async function listNotes(options?: {
  author?: string;
  limit?: number;
}): Promise<Note[]> {
  const raw = await invokeTauri<RawNote[]>("list_long_form_notes", {
    author: options?.author ?? null,
    limit: options?.limit ?? null,
  });
  return raw.map(fromRawNote);
}

/**
 * Fetch one note by slug. Resolves to `null` when the author has no note at
 * that slug, which is distinct from the promise rejecting on a relay error.
 */
export async function getNote(
  slug: string,
  author?: string,
): Promise<Note | null> {
  const raw = await invokeTauri<RawNote | null>("get_long_form_note", {
    slug,
    author: author ?? null,
  });
  return raw ? fromRawNote(raw) : null;
}

/**
 * Create or update a note, returning the note as it was actually written.
 *
 * An empty `title` asks Rust to carry the existing one, so the caller does
 * not have to read the note first just to re-save its body. `tags` is the
 * complete set and replaces what was there.
 */
export async function setNote(input: SetNoteInput): Promise<Note> {
  const raw = await invokeTauri<RawNote>("set_long_form_note", {
    slug: input.slug,
    title: input.title,
    content: input.content,
    summary: input.summary ?? null,
    tags: input.tags ?? [],
  });
  return fromRawNote(raw);
}

/** Delete one of your own notes (NIP-09 kind:5 against its coordinate). */
export async function deleteNote(slug: string): Promise<DeleteNoteResult> {
  const raw = await invokeTauri<RawDeleteNoteResult>("delete_long_form_note", {
    slug,
  });
  return {
    eventId: raw.event_id,
    accepted: raw.accepted,
    message: raw.message,
  };
}
