/**
 * Unit tests for localFiles.ts — the pure parts of the local-file bridge.
 * The two `invokeTauri` wrappers are thin by design and covered by the Rust
 * tests on the other side of the boundary; what is worth pinning here is the
 * `data:` URL shape the CSP has to keep allowing, and the size formatter.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { formatLocalFileSize, localFileDataUrl } from "@/shared/api/localFiles";

function preview(overrides) {
  return {
    kind: "image",
    path: "/Users/ada/shot.png",
    name: "shot.png",
    size: 3,
    mime: "image/png",
    text: null,
    dataBase64: "AAAA",
    ...overrides,
  };
}

test("builds a data: URL from a preview's bytes", () => {
  assert.equal(localFileDataUrl(preview()), "data:image/png;base64,AAAA");
});

test("returns null when a preview carries no bytes", () => {
  assert.equal(
    localFileDataUrl(preview({ dataBase64: null, kind: "markdown" })),
    null,
  );
});

test("formats sizes across unit boundaries", () => {
  assert.equal(formatLocalFileSize(0), "0 B");
  assert.equal(formatLocalFileSize(512), "512 B");
  assert.equal(formatLocalFileSize(1024), "1 KB");
  assert.equal(formatLocalFileSize(1536), "1.5 KB");
  assert.equal(formatLocalFileSize(20 * 1024), "20 KB");
  assert.equal(formatLocalFileSize(8 * 1024 * 1024), "8 MB");
  assert.equal(formatLocalFileSize(3 * 1024 * 1024 * 1024), "3 GB");
});

test("formats nonsense sizes as empty rather than guessing", () => {
  assert.equal(formatLocalFileSize(Number.NaN), "");
  assert.equal(formatLocalFileSize(-1), "");
});
