import { Panel } from "./Block";
import type { Treatment } from "@/lib/novara/engine";

/** Tratamentos aplicados antes da agregação. */
export function TreatmentList({ items }: { items: Treatment[] }) {
  return (
    <Panel className="p-0">
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li
            key={item.label}
            className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[14rem_1fr] sm:gap-5"
          >
            <div className="flex items-baseline justify-between gap-3 sm:flex-col sm:items-start sm:justify-start sm:gap-1">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="num text-sm text-primary">{item.figure}</p>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
