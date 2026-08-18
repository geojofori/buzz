import assert from "node:assert/strict";
import test from "node:test";

import {
  fromRawNote,
  isValidSlug,
  SLUG_MAX_LEN,
  slugifyTitle,
} from "./notesTypes.ts";

function raw(overrides = {}) {
  return {
    event_id: "e".repeat(64),
    pubkey: "a".repeat(64),
    coordinate: `30023:${"a".repeat(64)}:dco-recipe`,
    slug: "dco-recipe",
    title: "DCO recipe",
    summary: "How we sign off",
    tags: ["process", "git"],
    published_at: 1600000000,
    updated_at: 1700000000,
    content: "# body",
    ...overrides,
  };
}

test("maps every snake_case field onto the camelCase note", () => {
  assert.deepEqual(fromRawNote(raw()), {
    eventId: "e".repeat(64),
    pubkey: "a".repeat(64),
    coordinate: `30023:${"a".repeat(64)}:dco-recipe`,
    slug: "dco-recipe",
    title: "DCO recipe",
    summary: "How we sign off",
    tags: ["process", "git"],
    publishedAt: 1600000000,
    updatedAt: 1700000000,
    content: "# body",
  });
});

test("publishedAt and updatedAt stay separate facts", () => {
  // A note edited after publication has two different timestamps. Collapsing
  // them would make the list show the publication date as "last updated".
  const note = fromRawNote(raw({ published_at: 100, updated_at: 900 }));
  assert.equal(note.publishedAt, 100);
  assert.equal(note.updatedAt, 900);
});

test("absent summary, published_at and tags normalise rather than leak undefined", () => {
  const note = fromRawNote(
    raw({ summary: null, published_at: null, tags: undefined }),
  );
  assert.equal(note.summary, null);
  assert.equal(note.publishedAt, null);
  assert.deepEqual(note.tags, []);
});

test("an empty title and empty body survive the mapping untouched", () => {
  const note = fromRawNote(raw({ title: "", content: "" }));
  assert.equal(note.title, "");
  assert.equal(note.content, "");
});

test("slugify lowercases and hyphenates a plain title", () => {
  assert.equal(slugifyTitle("DCO Recipe"), "dco-recipe");
  assert.equal(slugifyTitle("How we sign off"), "how-we-sign-off");
});

test("slugify keeps the characters the Rust parse_slug allows", () => {
  assert.equal(slugifyTitle("release-v2.1_final"), "release-v2.1_final");
});

test("slugify drops punctuation and collapses runs of separators", () => {
  assert.equal(slugifyTitle("Hello,   World!!!"), "hello-world");
  assert.equal(slugifyTitle("a -- b"), "a-b");
});

test("slugify trims leading and trailing separators", () => {
  assert.equal(slugifyTitle("  Hello, World!  "), "hello-world");
  assert.equal(slugifyTitle("...dotted..."), "dotted");
});

test("slugify strips accents rather than deleting the letter", () => {
  assert.equal(slugifyTitle("Café notes"), "cafe-notes");
});

test("slugify caps at the Rust slug limit and never ends on a separator", () => {
  const long = slugifyTitle("word ".repeat(60));
  assert.ok(long.length <= SLUG_MAX_LEN, `got ${long.length}`);
  assert.ok(!long.endsWith("-"), long);
  assert.ok(isValidSlug(long), long);
});

test("a title with nothing usable slugifies to empty, not to a bare separator", () => {
  // An empty `d` tag would key every untitled note to the same coordinate, so
  // the caller must be able to detect this and ask for a slug instead.
  assert.equal(slugifyTitle("!!!"), "");
  assert.equal(slugifyTitle("   "), "");
  assert.equal(isValidSlug(slugifyTitle("!!!")), false);
});

test("every slugify output the helper produces is one Rust would accept", () => {
  const titles = [
    "DCO Recipe",
    "Hello, World!",
    "release-v2.1_final",
    "Café notes",
    "Ünïcödé tïtlé",
    "word ".repeat(60),
    "  leading and trailing  ",
  ];
  for (const title of titles) {
    const slug = slugifyTitle(title);
    if (slug === "") continue;
    assert.ok(isValidSlug(slug), `${title} produced an invalid slug: ${slug}`);
  }
});

test("isValidSlug mirrors the Rust rules", () => {
  assert.equal(isValidSlug("dco-recipe.v2_1"), true);
  assert.equal(isValidSlug(""), false);
  assert.equal(isValidSlug("Dco-Recipe"), false);
  assert.equal(isValidSlug("has space"), false);
  assert.equal(isValidSlug("has/slash"), false);
  assert.equal(isValidSlug("a".repeat(SLUG_MAX_LEN)), true);
  assert.equal(isValidSlug("a".repeat(SLUG_MAX_LEN + 1)), false);
});
