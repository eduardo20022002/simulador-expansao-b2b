import { Panel } from "./Block";
import type { TableRow } from "@/lib/novara/engine";

interface DataTableProps {
  headers: string[];
  rows: TableRow[];
  /** Desenha uma barra de fundo proporcional na coluna do rótulo. */
  bars?: boolean;
  caption?: string;
  /**
   * Moldura mais leve, para tabelas de referência que não devem competir com
   * o número-herói da página. Nenhuma linha é escondida — só o peso visual cai.
   */
  quiet?: boolean;
}

/** Tabela de leitura. Rola na horizontal dentro do próprio container. */
export function DataTable({
  headers,
  rows,
  bars = false,
  caption,
  quiet = false,
}: DataTableProps) {
  const rule = quiet ? "border-border/60" : "border-border";
  return (
    <Panel className="p-0" quiet={quiet}>
      <div className="w-full overflow-x-auto rounded-xl">
        <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
          <thead>
            <tr className={`border-b ${rule}`}>
              {headers.map((h, i) => (
                <th
                  // O rótulo não serve de key: GROWTH_HEADERS repete "variação".
                  key={`${i}-${h}`}
                  scope="col"
                  className={`px-5 py-3 text-xs uppercase ${
                    quiet
                      ? "font-medium tracking-[0.08em] text-muted-foreground/70"
                      : "font-semibold tracking-[0.12em] text-muted-foreground"
                  } ${i === 0 ? "" : "text-right"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${quiet ? "divide-border/60" : "divide-border"}`}>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="relative px-5 py-3 text-left font-normal">
                  {bars && row.fraction !== undefined ? (
                    <span
                      className="absolute inset-y-1 left-2 rounded-sm bg-primary/10"
                      style={{ width: `calc(${(row.fraction * 100).toFixed(2)}% - 0.5rem)` }}
                      aria-hidden
                    />
                  ) : null}
                  <span className="relative text-foreground">{row.label}</span>
                </th>
                {row.cells.map((cell, i) => (
                  <td key={i} className="num px-5 py-3 text-right text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? (
        <p className={`border-t ${rule} px-5 py-3 text-xs leading-relaxed text-muted-foreground`}>
          {caption}
        </p>
      ) : null}
    </Panel>
  );
}
