import { useState } from "react";

import { Panel } from "./Block";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ChipListProps {
  title: string;
  hint?: string;
  items: string[];
  mono?: boolean;
  /**
   * Quantos chips mostrar antes de recolher o resto. Omitir mostra todos —
   * inventários curtos (12 colunas, 7 tratamentos) não precisam disso.
   */
  collapsedCount?: number;
}

function Chip({ item, mono }: { item: string; mono: boolean }) {
  return (
    <li
      className={
        mono
          ? "num rounded-md border border-border bg-surface-sunken px-2.5 py-1 text-xs text-foreground"
          : "rounded-md border border-border bg-surface-sunken px-2.5 py-1 text-xs text-foreground"
      }
    >
      {item}
    </li>
  );
}

/** Inventário de rótulos em chips. Sem número ao lado. */
export function ChipList({
  title,
  hint,
  items,
  mono = false,
  collapsedCount,
}: ChipListProps) {
  const [open, setOpen] = useState(false);
  const collapsible = collapsedCount !== undefined && items.length > collapsedCount;
  const visible = collapsible ? items.slice(0, collapsedCount) : items;
  const rest = collapsible ? items.slice(collapsedCount) : [];

  return (
    <Panel className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>

      {collapsible ? (
        <Collapsible open={open} onOpenChange={setOpen}>
          <ul className="flex flex-wrap gap-2">
            {visible.map((item) => (
              <Chip key={item} item={item} mono={mono} />
            ))}
          </ul>
          <CollapsibleContent>
            <ul className="mt-2 flex flex-wrap gap-2">
              {rest.map((item) => (
                <Chip key={item} item={item} mono={mono} />
              ))}
            </ul>
          </CollapsibleContent>
          <CollapsibleTrigger className="mt-3 text-xs font-medium text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {open ? "mostrar menos" : `ver todos os ${items.length}`}
          </CollapsibleTrigger>
        </Collapsible>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Chip key={item} item={item} mono={mono} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
