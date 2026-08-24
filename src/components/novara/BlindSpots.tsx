import { Panel } from "./Block";

interface BlindSpotsProps {
  items: string[];
  nextStep: string;
}

/** Limites da base e a ponte para a próxima etapa. */
export function BlindSpots({ items, nextStep }: BlindSpotsProps) {
  return (
    <div className="flex flex-col gap-4">
      <Panel className="p-0">
        <ul className="divide-y divide-border">
          {items.map((item, i) => (
            <li key={item} className="flex gap-4 px-5 py-4">
              <span className="num text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-sm leading-relaxed text-foreground">{item}</p>
            </li>
          ))}
        </ul>
      </Panel>
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-5 py-4 text-sm leading-relaxed text-foreground">
        {nextStep}
      </p>
    </div>
  );
}
