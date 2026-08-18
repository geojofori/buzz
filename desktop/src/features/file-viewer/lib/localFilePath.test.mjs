/**
 * Unit tests for the link-interception classifier. These run against the
 * exported production functions, so any loosening of the rules that decide
 * "this link is a file on disk" shows up here first.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  hasFileExtension,
  isLocalFileHref,
  parseLocalFileHref,
} from "@/features/file-viewer/lib/localFilePath";

test("claims a home-relative path", () => {
  assert.equal(parseLocalFileHref("~/notes/plan.md"), "~/notes/plan.md");
});

test("claims an absolute POSIX path", () => {
  assert.equal(
    parseLocalFileHref("/Users/ada/notes/plan.md"),
    "/Users/ada/notes/plan.md",
  );
});

test("claims a Windows drive path in either slash direction", () => {
  assert.equal(
    parseLocalFileHref("C:\\Users\\ada\\plan.md"),
    "C:\\Users\\ada\\plan.md",
  );
  assert.equal(parseLocalFileHref("d:/work/plan.md"), "d:/work/plan.md");
});

test("decodes a file: URL to a plain path", () => {
  assert.equal(
    parseLocalFileHref("file:///Users/ada/notes/plan.md"),
    "/Users/ada/notes/plan.md",
  );
  assert.equal(
    parseLocalFileHref("file:///Users/ada/my%20notes/plan.md"),
    "/Users/ada/my notes/plan.md",
  );
  assert.equal(
    parseLocalFileHref("file://localhost/Users/ada/plan.md"),
    "/Users/ada/plan.md",
  );
});

test("decodes a Windows file: URL without its leading slash", () => {
  assert.equal(
    parseLocalFileHref("file:///C:/Users/ada/plan.md"),
    "C:/Users/ada/plan.md",
  );
});

test("claims an extensionless file: URL, which states its intent outright", () => {
  assert.equal(
    parseLocalFileHref("file:///Users/ada/Makefile"),
    "/Users/ada/Makefile",
  );
});

test("leaves a remote file: share alone", () => {
  assert.equal(parseLocalFileHref("file://fileserver/share/plan.md"), null);
});

test("leaves web and app links alone", () => {
  assert.equal(parseLocalFileHref("https://example.com/plan.md"), null);
  assert.equal(parseLocalFileHref("http://example.com/a/b.md"), null);
  assert.equal(parseLocalFileHref("buzz://channel/abc"), null);
  assert.equal(parseLocalFileHref("mailto:ada@example.com"), null);
  assert.equal(parseLocalFileHref("//cdn.example.com/a/b.md"), null);
});

test("leaves a bare absolute path with no extension alone", () => {
  // A site-relative or in-app link, not a file on disk.
  assert.equal(parseLocalFileHref("/settings"), null);
  assert.equal(parseLocalFileHref("/Users/ada/notes"), null);
});

test("leaves relative paths alone", () => {
  assert.equal(parseLocalFileHref("notes/plan.md"), null);
  assert.equal(parseLocalFileHref("./plan.md"), null);
  assert.equal(parseLocalFileHref("../plan.md"), null);
});

test("leaves another user's home alone", () => {
  assert.equal(parseLocalFileHref("~bob/plan.md"), null);
});

test("rejects empty and control-character input", () => {
  assert.equal(parseLocalFileHref(null), null);
  assert.equal(parseLocalFileHref(undefined), null);
  assert.equal(parseLocalFileHref(""), null);
  assert.equal(parseLocalFileHref("   "), null);
  assert.equal(parseLocalFileHref("/Users/ada/pl\nan.md"), null);
  assert.equal(parseLocalFileHref("/Users/ada/pl\u0000an.md"), null);
});

test("trims surrounding whitespace before deciding", () => {
  assert.equal(parseLocalFileHref("  ~/plan.md  "), "~/plan.md");
});

test("hasFileExtension ignores dotfiles and trailing dots", () => {
  assert.equal(hasFileExtension("/Users/ada/.zshrc"), false);
  assert.equal(hasFileExtension("/Users/ada/plan."), false);
  assert.equal(hasFileExtension("/Users/ada/plan.md"), true);
  assert.equal(hasFileExtension("C:\\Users\\ada\\plan.md"), true);
  // A dot in a parent directory does not make the target a file.
  assert.equal(hasFileExtension("/Users/ada/v1.2/notes"), false);
});

test("isLocalFileHref mirrors parseLocalFileHref", () => {
  assert.equal(isLocalFileHref("~/plan.md"), true);
  assert.equal(isLocalFileHref("https://example.com"), false);
});
