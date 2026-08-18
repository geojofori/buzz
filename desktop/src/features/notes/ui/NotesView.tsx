import { FileText, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import * as React from "react";

import {
  useDeleteNoteMutation,
  useNotesQuery,
  useSetNoteMutation,
} from "@/features/notes/hooks";
import { isValidSlug, type Note, slugifyTitle } from "@/shared/api/notesTypes";
import { formatItemTimestamp } from "@/shared/lib/datetime";
import {
  isRelayUnreachableError,
  RELAY_UNREACHABLE_SHORT,
} from "@/shared/lib/relayError";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Markdown } from "@/shared/ui/markdown";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";

/** Copy for the zero-notes state. Names the read path an agent uses, because
 * that is the whole reason the tab exists. */
const EMPTY_STATE_COPY =
  "No notes yet. New note starts one; agents read them with buzz notes get.";

/**
 * What the right-hand pane is doing.
 *
 * `creating` carries its own draft rather than reusing the edit draft: a new
 * note needs a title before it has a slug, and conflating the two states let
 * a half-typed new note overwrite the selected one on save.
 */
type PaneMode =
  | { kind: "reading" }
  | { kind: "editing"; slug: string }
  | { kind: "creating" };

function errorMessage(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  return isRelayUnreachableError(error)
    ? RELAY_UNREACHABLE_SHORT
    : error.message;
}

function NotesListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {["first", "second", "third"].map((row) => (
        <div
          className="space-y-2 rounded-xl border border-border/60 p-3"
          key={row}
        >
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

type NotesListProps = {
  notes: Note[];
  onSelect: (slug: string) => void;
  selectedSlug: string | null;
};

function NotesList({ notes, onSelect, selectedSlug }: NotesListProps) {
  return (
    <ul className="space-y-1 p-2" data-testid="notes-list">
      {notes.map((note) => {
        const isSelected = note.slug === selectedSlug;
        return (
          <li key={note.slug}>
            <button
              className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                isSelected
                  ? "border-border bg-muted/70"
                  : "border-transparent hover:bg-muted/40"
              }`}
              data-testid={`notes-list-item-${note.slug}`}
              onClick={() => onSelect(note.slug)}
              type="button"
            >
              <span className="block truncate text-sm font-medium">
                {note.title || note.slug}
              </span>
              <span className="mt-0.5 block text-2xs text-muted-foreground">
                {formatItemTimestamp(note.updatedAt, { withTime: true })}
              </span>
              {note.summary ? (
                <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                  {note.summary}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

type NoteEditorProps = {
  content: string;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  saveLabel: string;
  summary: string;
  onSummaryChange: (value: string) => void;
};

/** Body + summary editor. Mirrors the channel Canvas editor so the two
 * Markdown surfaces in the app behave the same way. */
function NoteEditor({
  content,
  isSaving,
  onCancel,
  onChange,
  onSave,
  saveLabel,
  summary,
  onSummaryChange,
}: NoteEditorProps) {
  return (
    <div className="space-y-3">
      <Input
        aria-label="Note summary"
        data-testid="note-summary-input"
        disabled={isSaving}
        onChange={(event) => onSummaryChange(event.target.value)}
        placeholder="One-line summary (optional)"
        value={summary}
      />
      <Textarea
        aria-label="Note content"
        className="min-h-96 font-mono text-sm"
        data-testid="note-editor"
        disabled={isSaving}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Write your note in Markdown..."
        value={content}
      />
      <div className="flex gap-2">
        <Button
          data-testid="note-save"
          disabled={isSaving}
          onClick={onSave}
          size="sm"
          type="button"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : saveLabel}
        </Button>
        <Button
          data-testid="note-cancel"
          disabled={isSaving}
          onClick={onCancel}
          size="sm"
          type="button"
          variant="outline"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function NotesView() {
  const notesQuery = useNotesQuery();
  const setNoteMutation = useSetNoteMutation();
  const deleteNoteMutation = useDeleteNoteMutation();

  const [selectedSlug, setSelectedSlug] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<PaneMode>({ kind: "reading" });
  const [draft, setDraft] = React.useState("");
  const [draftSummary, setDraftSummary] = React.useState("");
  const [draftTitle, setDraftTitle] = React.useState("");
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  const notes = React.useMemo(() => notesQuery.data ?? [], [notesQuery.data]);
  const selectedNote = React.useMemo(
    () => notes.find((note) => note.slug === selectedSlug) ?? null,
    [notes, selectedSlug],
  );

  // Defer the Markdown parse so switching notes commits the surrounding
  // chrome immediately and the heavy render reconciles after.
  const deferredContent = React.useDeferredValue(selectedNote?.content ?? "");

  // A deleted note leaves a selection pointing at nothing. Clear it once the
  // refetched list no longer contains it, rather than rendering an empty pane
  // that looks like a load failure.
  React.useEffect(() => {
    if (selectedSlug && !notes.some((note) => note.slug === selectedSlug)) {
      setSelectedSlug(null);
      setMode({ kind: "reading" });
    }
  }, [notes, selectedSlug]);

  const derivedSlug = slugifyTitle(draftTitle);
  const canCreate = isValidSlug(derivedSlug) && !setNoteMutation.isPending;
  const slugIsTaken =
    mode.kind === "creating" && notes.some((note) => note.slug === derivedSlug);

  function handleSelect(slug: string) {
    setSelectedSlug(slug);
    setMode({ kind: "reading" });
    setNoteMutation.reset();
    deleteNoteMutation.reset();
  }

  function handleStartCreating() {
    setMode({ kind: "creating" });
    setDraft("");
    setDraftSummary("");
    setDraftTitle("");
    setNoteMutation.reset();
  }

  function handleStartEditing(note: Note) {
    setMode({ kind: "editing", slug: note.slug });
    setDraft(note.content);
    setDraftSummary(note.summary ?? "");
    setNoteMutation.reset();
  }

  function handleCancel() {
    setMode({ kind: "reading" });
    setDraft("");
    setDraftSummary("");
    setDraftTitle("");
  }

  async function handleSaveEdit(note: Note) {
    // An empty title asks Rust to carry the note's existing one, which is
    // exactly what an edit wants: the editor never shows the title field.
    await setNoteMutation.mutateAsync({
      slug: note.slug,
      title: "",
      content: draft,
      summary: draftSummary,
      tags: note.tags,
    });
    setMode({ kind: "reading" });
  }

  async function handleSaveNew() {
    const saved = await setNoteMutation.mutateAsync({
      slug: derivedSlug,
      title: draftTitle.trim(),
      content: draft,
      summary: draftSummary,
      tags: [],
    });
    setSelectedSlug(saved.slug);
    setMode({ kind: "reading" });
  }

  async function handleConfirmDelete(note: Note) {
    await deleteNoteMutation.mutateAsync(note.slug);
    setIsDeleteOpen(false);
  }

  const listError = errorMessage(notesQuery.error);
  const saveError = errorMessage(setNoteMutation.error);
  const deleteError = errorMessage(deleteNoteMutation.error);

  return (
    <div
      className="relative flex min-h-0 flex-1 overflow-hidden"
      data-testid="notes-view"
    >
      <aside className="flex min-h-0 w-72 shrink-0 flex-col border-r border-border/60">
        <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-4">
          <h2 className="text-sm font-semibold tracking-tight">Notes</h2>
          <Button
            data-testid="new-note"
            onClick={handleStartCreating}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New note
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {notesQuery.isLoading ? (
            <NotesListSkeleton />
          ) : listError ? (
            <p className="px-3 py-2 text-sm text-destructive">{listError}</p>
          ) : notes.length === 0 ? (
            <p
              className="px-3 py-2 text-sm text-muted-foreground"
              data-testid="notes-empty-state"
            >
              {EMPTY_STATE_COPY}
            </p>
          ) : (
            <NotesList
              notes={notes}
              onSelect={handleSelect}
              selectedSlug={selectedSlug}
            />
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-7 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          {mode.kind === "creating" ? (
            <>
              <PageHeader
                description="Give it a title. The slug beneath is how an agent will address it."
                title="New note"
              />
              <div className="space-y-2">
                <Input
                  aria-label="Note title"
                  data-testid="new-note-title"
                  disabled={setNoteMutation.isPending}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="Note title"
                  value={draftTitle}
                />
                <p className="text-xs text-muted-foreground">
                  {derivedSlug ? (
                    <>
                      Slug: <code className="font-mono">{derivedSlug}</code>
                      {slugIsTaken
                        ? " (a note already uses this slug and saving will replace it)"
                        : null}
                    </>
                  ) : (
                    "Add a title with letters or numbers to derive a slug."
                  )}
                </p>
              </div>
              <NoteEditor
                content={draft}
                isSaving={setNoteMutation.isPending}
                onCancel={handleCancel}
                onChange={setDraft}
                onSave={() => {
                  if (!canCreate) return;
                  void handleSaveNew().catch(() => {
                    // Surfaced through setNoteMutation.error below.
                  });
                }}
                onSummaryChange={setDraftSummary}
                saveLabel="Create note"
                summary={draftSummary}
              />
            </>
          ) : selectedNote === null ? (
            <div
              className="flex flex-col items-center justify-center gap-2 py-24 text-center text-muted-foreground"
              data-testid="notes-placeholder"
            >
              <FileText className="h-8 w-8" />
              <p className="text-sm">
                {notes.length === 0
                  ? EMPTY_STATE_COPY
                  : "Select a note to read it."}
              </p>
            </div>
          ) : mode.kind === "editing" && mode.slug === selectedNote.slug ? (
            <>
              <PageHeader
                description={`Slug: ${selectedNote.slug}`}
                title={selectedNote.title || selectedNote.slug}
              />
              <NoteEditor
                content={draft}
                isSaving={setNoteMutation.isPending}
                onCancel={handleCancel}
                onChange={setDraft}
                onSave={() => {
                  void handleSaveEdit(selectedNote).catch(() => {
                    // Surfaced through setNoteMutation.error below.
                  });
                }}
                onSummaryChange={setDraftSummary}
                saveLabel="Save note"
                summary={draftSummary}
              />
            </>
          ) : (
            <>
              <PageHeader
                action={
                  <div className="flex gap-2">
                    <Button
                      data-testid="note-edit"
                      onClick={() => handleStartEditing(selectedNote)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      data-testid="note-delete"
                      onClick={() => setIsDeleteOpen(true)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                }
                description={selectedNote.summary ?? undefined}
                title={selectedNote.title || selectedNote.slug}
              />
              <p className="text-2xs text-muted-foreground">
                <code className="font-mono">{selectedNote.slug}</code>
                {" · updated "}
                {formatItemTimestamp(selectedNote.updatedAt, {
                  withTime: true,
                })}
              </p>
              {selectedNote.content ? (
                <div
                  className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3"
                  data-testid="note-content"
                >
                  <Markdown content={deferredContent} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This note has no body yet.
                </p>
              )}
            </>
          )}

          {saveError ? (
            <p
              className="text-sm text-destructive"
              data-testid="note-save-error"
            >
              {saveError}
            </p>
          ) : null}
          {deleteError ? (
            <p
              className="text-sm text-destructive"
              data-testid="note-delete-error"
            >
              {deleteError}
            </p>
          ) : null}
        </div>
      </div>

      <AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedNote?.title || selectedNote?.slug}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This publishes a deletion for the note's address, so agents
              reading it with buzz notes will stop seeing it. It cannot be
              undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteNoteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="note-delete-confirm"
              disabled={deleteNoteMutation.isPending}
              onClick={(event) => {
                // Keep the dialog open until the relay answers, so a failure
                // is visible instead of closing over a note that still exists.
                event.preventDefault();
                if (!selectedNote) return;
                void handleConfirmDelete(selectedNote).catch(() => {
                  // Surfaced through deleteNoteMutation.error above.
                });
              }}
            >
              {deleteNoteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
