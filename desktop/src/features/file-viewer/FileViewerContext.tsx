import * as React from "react";

import {
  type LocalFilePreview,
  readLocalFilePreview,
} from "@/shared/api/localFiles";

/**
 * One open file in the right-hand viewer.
 *
 * `requestedPath` is what the message linked (possibly `~/…`); `preview.path`
 * is the canonical path Rust resolved. Tabs are keyed on `requestedPath` so a
 * tab exists the instant a link is clicked, before the read has returned.
 */
export type FileViewerTab = {
  requestedPath: string;
  /** Best label available: the linked basename until the read returns. */
  name: string;
  status: "loading" | "ready" | "error";
  preview: LocalFilePreview | null;
  errorMessage: string | null;
};

/**
 * Tabs and focus live in one state object rather than two.
 *
 * Closing a tab has to pick the next focus from the list it just changed;
 * splitting them would mean calling one setter from inside the other's updater,
 * which React does not guarantee.
 */
type FileViewerState = {
  tabs: readonly FileViewerTab[];
  activePath: string | null;
};

type FileViewerContextValue = FileViewerState & {
  openFile: (path: string) => void;
  closeTab: (requestedPath: string) => void;
  focusTab: (requestedPath: string) => void;
  closeAll: () => void;
};

const EMPTY_STATE: FileViewerState = { tabs: [], activePath: null };

const FileViewerContext = React.createContext<FileViewerContextValue | null>(
  null,
);

function basename(path: string): string {
  const trimmed = path.replace(/[/\\]+$/, "");
  const separator = Math.max(
    trimmed.lastIndexOf("/"),
    trimmed.lastIndexOf("\\"),
  );
  const name = separator === -1 ? trimmed : trimmed.slice(separator + 1);
  return name || path;
}

function errorMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "Could not open that file.";
}

function updateTab(
  state: FileViewerState,
  requestedPath: string,
  patch: Partial<FileViewerTab>,
): FileViewerState {
  // A read that lands after its tab was closed must change nothing, not even
  // the state identity.
  if (!state.tabs.some((tab) => tab.requestedPath === requestedPath)) {
    return state;
  }

  return {
    ...state,
    tabs: state.tabs.map((tab) =>
      tab.requestedPath === requestedPath ? { ...tab, ...patch } : tab,
    ),
  };
}

/**
 * Holds the open file tabs for the whole app.
 *
 * Mounted above the router so tabs survive a channel switch: a reader who
 * opened a plan in one channel still has it open after following a mention
 * somewhere else, which is the entire point of not sending them to Finder.
 */
export function FileViewerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<FileViewerState>(EMPTY_STATE);
  // Read during the click handler to decide whether a re-read is needed. A
  // state updater must stay pure, so the decision cannot live inside one.
  const stateRef = React.useRef(state);
  stateRef.current = state;

  const openFile = React.useCallback((path: string) => {
    const requestedPath = path.trim();
    if (!requestedPath) return;

    const existing = stateRef.current.tabs.find(
      (tab) => tab.requestedPath === requestedPath,
    );

    setState((current) => {
      const index = current.tabs.findIndex(
        (tab) => tab.requestedPath === requestedPath,
      );
      if (index === -1) {
        return {
          activePath: requestedPath,
          tabs: [
            ...current.tabs,
            {
              requestedPath,
              name: basename(requestedPath),
              status: "loading",
              preview: null,
              errorMessage: null,
            },
          ],
        };
      }

      // The tab is already there. Focus it, and show a retry as a retry when
      // the previous attempt failed.
      const tabs =
        current.tabs[index].status === "error"
          ? current.tabs.map((tab, tabIndex) =>
              tabIndex === index
                ? { ...tab, status: "loading" as const, errorMessage: null }
                : tab,
            )
          : current.tabs;
      return { tabs, activePath: requestedPath };
    });

    // Clicking a link for a file that is already open (or still opening) just
    // focuses its tab; re-reading would pull up to 8 MiB across the IPC
    // boundary for nothing. A tab that failed is retried, so a click is still
    // the way to recover from a file that was missing a moment ago.
    if (existing && existing.status !== "error") return;

    void readLocalFilePreview(requestedPath).then(
      (preview) => {
        setState((current) =>
          updateTab(current, requestedPath, {
            name: preview.name,
            status: "ready",
            preview,
            errorMessage: null,
          }),
        );
      },
      (error: unknown) => {
        setState((current) =>
          updateTab(current, requestedPath, {
            status: "error",
            preview: null,
            errorMessage: errorMessageOf(error),
          }),
        );
      },
    );
  }, []);

  const closeTab = React.useCallback((requestedPath: string) => {
    setState((current) => {
      const index = current.tabs.findIndex(
        (tab) => tab.requestedPath === requestedPath,
      );
      if (index === -1) return current;

      const tabs = current.tabs.filter(
        (tab) => tab.requestedPath !== requestedPath,
      );
      if (current.activePath !== requestedPath) {
        return { ...current, tabs };
      }

      // Focus the neighbour on the left, matching editor tab behaviour.
      const neighbour = tabs[index - 1] ?? tabs[index] ?? null;
      return { tabs, activePath: neighbour?.requestedPath ?? null };
    });
  }, []);

  const focusTab = React.useCallback((requestedPath: string) => {
    setState((current) =>
      current.tabs.some((tab) => tab.requestedPath === requestedPath)
        ? { ...current, activePath: requestedPath }
        : current,
    );
  }, []);

  const closeAll = React.useCallback(() => setState(EMPTY_STATE), []);

  const value = React.useMemo(
    () => ({
      ...state,
      openFile,
      closeTab,
      focusTab,
      closeAll,
    }),
    [closeAll, closeTab, focusTab, openFile, state],
  );

  return (
    <FileViewerContext.Provider value={value}>
      {children}
    </FileViewerContext.Provider>
  );
}

/**
 * The file viewer, or `null` where no provider is mounted.
 *
 * Nullable on purpose: the Markdown renderer is used on surfaces outside the
 * app shell (tests, the forum post renderer), and a missing provider there must
 * leave link behaviour untouched rather than throw.
 */
export function useFileViewer(): FileViewerContextValue | null {
  return React.useContext(FileViewerContext);
}
