import { Panel } from "./Block";
import type { ExternalSourceLegend } from "@/lib/novara/fontesExternas";

/** Legenda das fontes externas citadas por nome no resto da página — texto corrido, sem alinhamento numérico. */
export function SourceLegendTable({ items }: { items: ExternalSourceLegend[] }) {
  return (
    <Panel className="p-0">
      <div className="w-full overflow-x-auto rounded-xl">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {["fonte", "o que é", "acesso"].map((h) => (
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
            {items.map((item) => (
              <tr key={item.name} className="border-b border-border last:border-b-0">
                <td className="px-5 py-3 align-top font-medium text-foreground">{item.name}</td>
                <td className="px-5 py-3 align-top leading-relaxed text-muted-foreground">
                  {item.what}
                </td>
                <td className="num px-5 py-3 align-top leading-relaxed text-muted-foreground">
                  {item.access}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
