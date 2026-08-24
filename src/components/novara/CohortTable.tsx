import { Panel } from "./Block";
import type { CohortRow } from "@/lib/novara/engine";

interface CohortTableProps {
  title: string;
  hint?: string;
  months: string[];
  rows: CohortRow[];
}

/**
 * Matriz de coorte. A intensidade da célula é a retenção daquela coorte —
 * já calculada no engine, aqui só vira opacidade.
 */
export function CohortTable({ title, hint, months, rows }: CohortTableProps) {
  return (
    <Panel className="flex h-full flex-col gap-4 p-0">
      <div className="px-5 pt-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="w-full overflow-x-auto pb-5 rounded-xl">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="px-5 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                1ª compra
              </th>
              <th
                scope="col"
                className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                base
              </th>
              {months.map((m) => (
                <th
                  key={m}
                  scope="col"
                  className="num px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="num px-5 py-1.5 text-left font-normal text-foreground">
                  {row.label}
                </th>
                <td className="num px-2 py-1.5 text-right text-muted-foreground">{row.size}</td>
                {row.cells.map((cell, i) =>
                  cell === null ? (
                    <td key={i} className="px-1 py-1.5" />
                  ) : (
                    <td key={i} className="px-1 py-1.5">
                      <div
                        className="rounded-md px-1 py-1.5 text-center"
                        style={{
                          backgroundColor: `color-mix(in oklab, var(--color-primary) ${Math.round(
                            cell.intensity * 78,
                          )}%, transparent)`,
                        }}
                        title={`${cell.clients} clientes · ${cell.retained} da coorte`}
                      >
                        <span
                          className="num text-xs"
                          style={{
                            color:
                              cell.intensity > 0.55
                                ? "var(--color-primary-foreground)"
                                : "var(--color-foreground)",
                          }}
                        >
                          {cell.retained}
                        </span>
                      </div>
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
