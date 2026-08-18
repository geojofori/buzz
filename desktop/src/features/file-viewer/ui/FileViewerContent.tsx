import * as React from "react";
import { toast } from "sonner";

import type { FileViewerTab } from "@/features/file-viewer/FileViewerContext";
import {
  formatLocalFileSize,
  localFileDataUrl,
  openLocalFileExternally,
} from "@/shared/api/localFiles";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Markdown } from "@/shared/ui/markdown";

export function openTabExternally(tab: FileViewerTab) {
  const path = tab.preview?.path ?? tab.requestedPath;
  void openLocalFileExternally(path).catch((error: unknown) => {
    toast.error(
      error instanceof Error ? error.message : "Could not open that file.",
    );
  });
}

function CentredNotice({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "danger";
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm",
        tone === "danger" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {children}
    </div>
  );
}

/**
 * A file the panel cannot draw itself, handed to the OS instead.
 *
 * Used for PDFs and for recognised-but-unviewable files. The webview has no
 * inline PDF surface the app's CSP permits (`object-src 'none'`, and no
 * `frame-src` allowance for blob URLs), so rather than widen the policy for one
 * file type the panel offers the OS viewer, which is better at PDFs anyway.
 */
function ExternalOnly({ tab, reason }: { tab: FileViewerTab; reason: string }) {
  return (
    <CentredNotice>
      <p>{reason}</p>
      <Button
        onClick={() => openTabExternally(tab)}
        size="sm"
        type="button"
        variant="outline"
      >
        Open in your default app
      </Button>
    </CentredNotice>
  );
}

function HtmlContent({ tab, html }: { tab: FileViewerTab; html: string }) {
  const [showSource, setShowSource] = React.useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-end px-3 pb-1 pt-2">
        <Button
          onClick={() => setShowSource((current) => !current)}
          size="xs"
          type="button"
          variant="ghost"
        >
          {showSource ? "Show page" : "Show source"}
        </Button>
      </div>
      {showSource ? (
        <TextContent text={html} />
      ) : (
        // `sandbox` with no tokens is the tightest setting there is: opaque
        // origin, no scripts, no forms, no top-level navigation. The frame also
        // inherits the app's CSP, so even a script that slipped past the
        // sandbox would have no origin `script-src 'self'` could match.
        <iframe
          className="min-h-0 w-full flex-1 border-0 bg-white"
          sandbox=""
          srcDoc={html}
          title={`${tab.name} preview`}
        />
      )}
    </div>
  );
}

function TextContent({ text }: { text: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <pre className="whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-relaxed text-foreground">
        {text}
      </pre>
    </div>
  );
}

/** The body of the active tab. */
export function FileViewerContent({ tab }: { tab: FileViewerTab }) {
  if (tab.status === "loading") {
    return <CentredNotice>Opening {tab.name}…</CentredNotice>;
  }

  if (tab.status === "error" || !tab.preview) {
    return (
      <CentredNotice tone="danger">
        <p>{tab.errorMessage ?? "Could not open that file."}</p>
        <p className="break-all text-xs text-muted-foreground">
          {tab.requestedPath}
        </p>
      </CentredNotice>
    );
  }

  const { preview } = tab;

  switch (preview.kind) {
    case "markdown":
      return (
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          <Markdown content={preview.text ?? ""} />
        </div>
      );
    case "text":
      return <TextContent text={preview.text ?? ""} />;
    case "html":
      return <HtmlContent html={preview.text ?? ""} tab={tab} />;
    case "image": {
      const source = localFileDataUrl(preview);
      if (!source) {
        return <ExternalOnly reason="That image came back empty." tab={tab} />;
      }
      return (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
          <img
            alt={preview.name}
            className="max-h-full max-w-full object-contain"
            src={source}
          />
        </div>
      );
    }
    case "pdf":
      return (
        <ExternalOnly
          reason={`PDFs open in your system viewer (${formatLocalFileSize(preview.size)}).`}
          tab={tab}
        />
      );
    default:
      // Deliberately no "open externally" here: an unrecognised extension is
      // exactly where a launchable file (.command, .app, .pkg, .dmg) would sit,
      // and a link in a message must never be one click from running it. The
      // Rust side refuses the same kinds, so this is the second lock, not the
      // only one.
      return (
        <CentredNotice>
          <p>
            There is no preview for this kind of file, and it is not opened from
            here.
          </p>
          <p className="text-2xs">{tab.requestedPath}</p>
        </CentredNotice>
      );
  }
}
