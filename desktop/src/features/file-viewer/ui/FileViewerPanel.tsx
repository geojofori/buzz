import { ExternalLink, X } from "lucide-react";

import { useFileViewer } from "@/features/file-viewer/FileViewerContext";
import {
  FileViewerContent,
  openTabExternally,
} from "@/features/file-viewer/ui/FileViewerContent";
import { RightAuxiliaryPane } from "@/features/channels/ui/RightAuxiliaryPane";
import { formatLocalFileSize } from "@/shared/api/localFiles";
import {
  FILE_VIEWER_WIDTH_SESSION_KEY,
  useThreadPanelWidth,
} from "@/shared/hooks/useThreadPanelWidth";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

/**
 * The right-hand panel that keeps linked local files inside the app.
 *
 * It sits in the app shell's layout row, to the right of the whole channel
 * surface, so it never contends with the thread panel for the same slot: a
 * thread and a file can be open at once, thread nearest the conversation and
 * file outermost. It renders nothing at all when no file is open, so it costs
 * no width until the reader asks for one.
 */
export function FileViewerPanel() {
  const viewer = useFileViewer();
  const { canReset, onResetWidth, onResizeStart, widthPx } =
    useThreadPanelWidth(undefined, FILE_VIEWER_WIDTH_SESSION_KEY);

  const tabs = viewer?.tabs ?? [];
  const activeTab =
    tabs.find((tab) => tab.requestedPath === viewer?.activePath) ?? tabs[0];

  if (!viewer || !activeTab) return null;

  return (
    <RightAuxiliaryPane
      canResetWidth={canReset}
      onResetWidth={onResetWidth}
      onResizeStart={onResizeStart}
      testId="file-viewer-panel"
      widthPx={widthPx}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1.5">
          <div
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
            data-testid="file-viewer-tabs"
            role="tablist"
          >
            {tabs.map((tab) => {
              const isActive = tab.requestedPath === activeTab.requestedPath;
              return (
                <div
                  className={cn(
                    "group/file-tab flex max-w-[12rem] shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60",
                  )}
                  key={tab.requestedPath}
                  role="presentation"
                >
                  <button
                    aria-selected={isActive}
                    className="min-w-0 truncate text-left"
                    onClick={() => viewer.focusTab(tab.requestedPath)}
                    role="tab"
                    title={tab.requestedPath}
                    type="button"
                  >
                    {tab.name}
                  </button>
                  <button
                    aria-label={`Close ${tab.name}`}
                    className="shrink-0 rounded-sm p-0.5 text-muted-foreground/70 opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/file-tab:opacity-100"
                    onClick={() => viewer.closeTab(tab.requestedPath)}
                    type="button"
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
          <Button
            aria-label={`Open ${activeTab.name} in your default app`}
            onClick={() => openTabExternally(activeTab)}
            size="icon-xs"
            title="Open externally"
            type="button"
            variant="ghost"
          >
            <ExternalLink aria-hidden />
          </Button>
        </div>

        <div
          className="truncate border-b border-border/40 px-3 py-1 text-2xs text-muted-foreground"
          title={activeTab.preview?.path ?? activeTab.requestedPath}
        >
          {activeTab.preview
            ? `${activeTab.preview.path} · ${formatLocalFileSize(activeTab.preview.size)}`
            : activeTab.requestedPath}
        </div>

        <div className="flex min-h-0 flex-1 flex-col" role="tabpanel">
          <FileViewerContent key={activeTab.requestedPath} tab={activeTab} />
        </div>
      </div>
    </RightAuxiliaryPane>
  );
}
