import * as React from "react";

import { useFileViewer } from "@/features/file-viewer/FileViewerContext";
import { openLocalFileExternally } from "@/shared/api/localFiles";
import { copyTextToClipboard } from "@/shared/lib/clipboard";
import { cn } from "@/shared/lib/cn";
import {
  MediaContextMenu,
  type MediaContextMenuPosition,
  useDismissMediaContextMenu,
} from "@/shared/ui/markdown/MediaContextMenu";
import { toast } from "sonner";

/**
 * A message link that points at a file on this machine.
 *
 * Rendered instead of {@link ExternalLinkAnchor} so a click opens the file in
 * the right-hand viewer rather than throwing the reader into Finder, Obsidian
 * or a browser tab. The escape hatch is still one right-click away.
 *
 * Deliberately carries no `href`: the webview must never be able to navigate to
 * a `file:` URL, not even if a click handler failed to run. The path is shown
 * in the tooltip and copied by the context menu instead.
 */
export function LocalFileLinkAnchor({
  children,
  path,
}: {
  children: React.ReactNode;
  path: string;
}) {
  const viewer = useFileViewer();
  const [menu, setMenu] = React.useState<MediaContextMenuPosition | null>(null);
  const closeMenu = React.useCallback(() => setMenu(null), []);
  useDismissMediaContextMenu(Boolean(menu), closeMenu);

  const openExternally = React.useCallback(() => {
    void openLocalFileExternally(path).catch((error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Could not open that file.",
      );
    });
  }, [path]);

  return (
    <>
      <button
        className={cn(
          "cursor-pointer font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80",
        )}
        data-local-file-path={path}
        data-testid="local-file-link"
        onClick={() => viewer?.openFile(path)}
        onContextMenuCapture={(event) => {
          event.preventDefault();
          setMenu({ x: event.clientX, y: event.clientY });
        }}
        title={path}
        type="button"
      >
        {children}
      </button>
      {menu ? (
        <MediaContextMenu
          dataAttributes={["data-link-context-menu"]}
          items={[
            {
              label: "Open here",
              onSelect: () => {
                closeMenu();
                viewer?.openFile(path);
              },
            },
            {
              label: "Open in default app",
              onSelect: () => {
                closeMenu();
                openExternally();
              },
            },
            {
              label: "Copy path",
              onSelect: () => {
                closeMenu();
                copyTextToClipboard(path, "Path copied to clipboard");
              },
            },
          ]}
          position={menu}
        />
      ) : null}
    </>
  );
}
