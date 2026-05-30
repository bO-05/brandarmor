"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, Info, LinkIcon, ShieldCheck } from "lucide-react";
import type { MediaPreview } from "@/lib/ui-ux";

export function ListingMediaPanel({ preview }: { preview: MediaPreview }) {
  const [imageFailed, setImageFailed] = useState(false);
  const primaryImageUrl = preview.renderMode === "image" && !imageFailed ? preview.primaryUrl : null;
  const placeholderTitle = preview.renderMode === "demo_placeholder"
    ? "Demo placeholder visual"
    : preview.renderMode === "empty" || imageFailed
      ? "No inspectable image"
      : "Listing media";
  const placeholderCopy = preview.renderMode === "demo_placeholder"
    ? "The stored demo URL is a placeholder, so BrandArmor shows a safe visual stand-in instead of pretending a real marketplace image exists."
    : imageFailed
      ? "The stored media URL could not be displayed in the browser."
      : "Add a screenshot or image URL to anchor OCR and visual review.";

  return (
    <section className="surface-card rounded-lg p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Media evidence preview</p>
          <h2 className="mt-1 font-semibold">Listing visual anchor</h2>
        </div>
        <ImageIcon className="size-5 text-primary" />
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-muted">
        {primaryImageUrl ? (
          <Image
            src={primaryImageUrl}
            alt="Stored listing media"
            width={960}
            height={384}
            className="h-64 w-full object-cover"
            unoptimized
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 inline-flex size-12 items-center justify-center rounded-md bg-background text-primary">
              <ImageIcon className="size-6" />
            </div>
            <p className="font-semibold">{placeholderTitle}</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{placeholderCopy}</p>
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 text-sm">
        <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{preview.sourceLabel}</span>
        </div>
        <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{preview.visualStatusLabel} / {preview.referenceLabel}</span>
        </div>
        <p className="rounded-md border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
          {preview.limitationText}
        </p>
        {preview.sourceUrl && (
          <a href={preview.sourceUrl} target="_blank" className="inline-flex items-center gap-2 break-all text-xs text-primary">
            <LinkIcon className="size-3.5 shrink-0" />
            Stored media URL
          </a>
        )}
      </div>
    </section>
  );
}
