/**
 * NIP-23 long-form note types (kind:30023) for the Notes tab.
 *
 * These mirror the event contract the `buzz notes` CLI reads and writes, so a
 * note written here is the same event an agent picks up with
 * `buzz notes get --name <slug> --content-only`.
 */

/** Hard cap on slug length. Matches `SLUG_MAX_LEN` in the Rust builder and
 * in `crates/buzz-cli/src/commands/notes.rs`; a slug this side accepts must
 * never be one the CLI rejects. */
export const SLUG_MAX_LEN = 80;

/** One note, camelCased for the UI. */
export type Note = {
  /** Event id of this incarnation, hex. Changes on every save. */
  eventId: string;
  /** Author pubkey, hex. */
  pubkey: string;
  /** Addressable coordinate `30023:<pubkey>:<slug>`, the durable reference. */
  coordinate: string;
  /** The `d` tag: the human slug an agent addresses the note by. */
  slug: string;
  title: string;
  summary: string | null;
  /** NIP-23 `t` topic tags. */
  tags: string[];
  /** Publication date in unix seconds. Survives every edit. */
  publishedAt: number | null;
  /** The event's `created_at` in unix seconds: when it was last saved. */
  updatedAt: number;
  /** Markdown body. */
  content: string;
};

/** The note payload exactly as the Rust command serialises it. */
export type RawNote = {
  event_id: string;
  pubkey: string;
  coordinate: string;
  slug: string;
  title: string;
  summary: string | null;
  tags: string[];
  published_at: number | null;
  updated_at: number;
  content: string;
};

/** Relay acknowledgement for a delete. */
export type RawDeleteNoteResult = {
  event_id: string;
  accepted: boolean;
  message: string;
};

export type DeleteNoteResult = {
  eventId: string;
  accepted: boolean;
  message: string;
};

export type SetNoteInput = {
  slug: string;
  /** Empty means "keep the note's existing title". Required on first save. */
  title: string;
  content: string;
  /** Omitted keeps the existing summary; an empty string clears it. */
  summary?: string;
  /** The complete topic-tag set: it replaces rather than merges. */
  tags?: string[];
};

/**
 * Map the Rust payload onto the UI shape.
 *
 * `summary` and `published_at` are normalised to `null` rather than left
 * `undefined` when a key is absent, because the editor distinguishes "the
 * note has no summary" from "we do not know yet", and `undefined !== null`
 * would blur the two.
 */
export function fromRawNote(raw: RawNote): Note {
  return {
    eventId: raw.event_id,
    pubkey: raw.pubkey,
    coordinate: raw.coordinate,
    slug: raw.slug,
    title: raw.title,
    summary: raw.summary ?? null,
    tags: raw.tags ?? [],
    publishedAt: raw.published_at ?? null,
    updatedAt: raw.updated_at,
    content: raw.content,
  };
}

/**
 * Derive a slug from a title.
 *
 * The output must satisfy the Rust `parse_slug` rules exactly, because the
 * command refuses anything else: lowercase ascii, digits, and `-`, `_`, `.`
 * only, at most {@link SLUG_MAX_LEN} characters. Everything else collapses to
 * a single hyphen, and leading/trailing separators are trimmed so a title
 * like "  Hello, World!  " produces `hello-world` rather than `-hello-world-`.
 *
 * Returns an empty string when the title has no usable characters at all; the
 * caller treats that as "ask for a slug" rather than publishing an empty `d`
 * tag, which the relay would key every untitled note to the same coordinate.
 */
export function slugifyTitle(title: string): string {
  const lowered = title.toLowerCase();
  // Strip combining marks so "Café" becomes "cafe" rather than "caf".
  const unaccented = lowered.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const collapsed = unaccented
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-");
  const trimmed = collapsed.replace(/^[-._]+/, "").replace(/[-._]+$/, "");
  // Trim again after the length cut: slicing can leave a trailing separator.
  return trimmed.slice(0, SLUG_MAX_LEN).replace(/[-._]+$/, "");
}

/** Whether a slug is one the Rust `parse_slug` will accept. */
export function isValidSlug(slug: string): boolean {
  return (
    slug.length > 0 &&
    slug.length <= SLUG_MAX_LEN &&
    /^[a-z0-9._-]+$/.test(slug)
  );
}
