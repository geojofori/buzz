import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteNote, listNotes, setNote } from "@/shared/api/notes";
import type { Note, SetNoteInput } from "@/shared/api/notesTypes";

/**
 * Query key for the caller's own notes.
 *
 * The list already carries every note's body, so there is no separate
 * per-note query to invalidate: one key covers the whole tab.
 */
export const notesQueryKey = ["long-form-notes"] as const;

/** The author's notes, newest first. Undefined author means "mine". */
export function useNotesQuery(author?: string) {
  return useQuery({
    queryKey: [...notesQueryKey, author ?? "me"],
    queryFn: () => listNotes(author ? { author } : undefined),
  });
}

/**
 * Create or update a note.
 *
 * Invalidates rather than patches the cache: the Rust command carries
 * `published_at` forward and may have resolved the title from the prior
 * event, so the relay's answer is the truth and a hand-patched cache entry
 * would be a guess at it.
 */
export function useSetNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation<Note, Error, SetNoteInput>({
    mutationFn: (input) => setNote(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notesQueryKey });
    },
  });
}

/** Delete one of the caller's own notes. */
export function useDeleteNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => deleteNote(slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notesQueryKey });
    },
  });
}
