"use client";

import { useId, useState } from "react";
import { HelpCircle } from "lucide-react";
import { getTermHelp, type TermHelpKey } from "@/lib/ui-ux";

export function TermHelp({ term }: { term: TermHelpKey }) {
  const help = getTermHelp(term);
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-flex items-center gap-1">
      <span>{help.label}</span>
      <button
        type="button"
        aria-label={`${help.label}: ${help.mobileHint}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) {
            setOpen(false);
          }
        }}
        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <HelpCircle className="size-3.5" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-6 z-20 w-64 rounded-md border border-border bg-background p-3 text-left text-xs font-normal leading-5 text-foreground shadow-lg"
        >
          <span className="block font-semibold">{help.label}</span>
          <span className="mt-1 block text-muted-foreground">{help.description}</span>
        </span>
      )}
    </span>
  );
}
