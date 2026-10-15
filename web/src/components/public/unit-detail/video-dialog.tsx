"use client";

import { useLayoutEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { youtubeEmbedUrl } from "@/lib/youtube";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  unitName: string;
};

/**
 * Iframe YouTube (youtube-nocookie). src diisi saat tampil dan dikosongkan saat dilepas, termasuk
 * ketika rute disembunyikan oleh <Activity> Next 16 (efek layout dibersihkan), supaya video berhenti.
 */
function VideoFrame({ videoId, title }: { videoId: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.src = youtubeEmbedUrl(videoId);
    return () => {
      frame.src = "about:blank";
    };
  }, [videoId]);

  return (
    <iframe
      ref={frameRef}
      title={title}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className="size-full border-0"
    />
  );
}

/** Modal "Video tur" (PRD 6.4). Iframe hanya ada selama modal terbuka. */
export function VideoDialog({ open, onOpenChange, videoId, unitName }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] gap-3 p-3 sm:max-w-3xl sm:p-4">
        <DialogHeader className="min-h-11 justify-center pl-1">
          <DialogTitle>Video tur</DialogTitle>
          <DialogDescription className="sr-only">Video tur {unitName}</DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full overflow-hidden rounded-control bg-night">
          {open ? <VideoFrame videoId={videoId} title={`Video tur ${unitName}`} /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
