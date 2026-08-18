import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

const NotesView = React.lazy(async () => {
  const module = await import("@/features/notes/ui/NotesView");
  return { default: module.NotesView };
});

// Notes is a first-class tab, not a preview feature, so there is no
// `usePreviewFeatureWarning` here: the route is always reachable.
export const Route = createFileRoute("/notes")({
  component: NotesRouteComponent,
});

function NotesRouteComponent() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading notes...
        </div>
      }
    >
      <NotesView />
    </React.Suspense>
  );
}
