import { Panel } from "./Block";

interface SourceNoteProps {
  internal: string;
  external: string;
}

/** Bloco fixo de proveniência no topo de cada sub-aba de Fonte externa: o que veio de dentro, o que veio de fora. */
export function SourceNote({ internal, external }: SourceNoteProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Panel quiet className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          fonte interna
        </p>
        <p className="text-sm leading-relaxed text-foreground">{internal}</p>
      </Panel>
      <Panel quiet className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          fonte externa
        </p>
        <p className="text-sm leading-relaxed text-foreground">{external}</p>
      </Panel>
    </div>
  );
}
