import { Panel } from "./Block";
import type { ColumnSpec } from "@/lib/novara/engine";

interface ColumnTableProps {
  columns: ColumnSpec[];
  headers: { name: string; what: string; example: string; role: string };
}

/** As 12 colunas do CSV. Rola na horizontal dentro do próprio container. */
export function ColumnTable({ columns, headers }: ColumnTableProps) {
  return (
    <Panel className="p-0">
      <div className="w-full overflow-x-auto rounded-xl">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {[headers.name, headers.what, headers.example, headers.role].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => (
              <tr key={col.name} className="border-b border-border last:border-b-0">
                <td className="num px-5 py-3 font-medium text-foreground">{col.name}</td>
                <td className="px-5 py-3 text-muted-foreground">{col.what}</td>
                <td className="num px-5 py-3 text-foreground">{col.example}</td>
                <td className="px-5 py-3">
                  <span
                    className={
                      col.role === "chave"
                        ? "rounded-md border border-border bg-surface-sunken px-2 py-0.5 text-xs text-muted-foreground"
                        : "rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary"
                    }
                  >
                    {col.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
