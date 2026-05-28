import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

export function LessonPopover({
  title,
  why,
  how,
  drivenBy,
  codeRef,
}: {
  title: string;
  why: string;
  how: string;
  drivenBy: string;
  codeRef: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        title={`Why this matters: ${title}`}
        onClick={() => setOpen(true)}
        className="inline-flex size-7 items-center justify-center rounded-sm border text-muted-foreground hover:border-primary hover:text-primary"
      >
        <HelpCircle className="size-3.5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-md border bg-card shadow-xl sm:rounded-sm">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Learning Moment
                </div>
                <h3 className="text-base font-semibold">{title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="tap-target rounded-sm p-2 hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <Block label="Why" text={why} />
              <Block label="How" text={how} />
              <Block label="What drives this" text={drivenBy} />
              <div className="rounded-sm bg-muted/50 p-3 text-xs">
                <span className="font-mono uppercase tracking-wider text-muted-foreground">
                  Source basis:{" "}
                </span>
                {codeRef}
              </div>
              <p className="text-xs italic text-muted-foreground">
                Use this as decision support. Final selections must be checked against the governing
                code edition, project specifications, and responsible engineer review.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <p className="mt-0.5 text-foreground">{text}</p>
    </div>
  );
}
