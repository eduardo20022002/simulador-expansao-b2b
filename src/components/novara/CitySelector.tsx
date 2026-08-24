import { Check, ChevronsUpDown, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MUNICIPIOS, type Municipio } from "@/lib/novara/municipios";

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const RESULTADOS_MAXIMOS = 50;

interface CitySelectorProps {
  value: Municipio[];
  onChange: (cidades: Municipio[]) => void;
  max?: number;
}

/** Busca com autocomplete sobre os 5.571 municípios do Brasil, seleção múltipla com teto. */
export function CitySelector({ value, onChange, max = 5 }: CitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const cheio = value.length >= max;

  const resultados = useMemo(() => {
    const selecionados = new Set(value.map((c) => c.id));
    const termo = normalizar(busca.trim());
    if (!termo) {
      return MUNICIPIOS.filter((m) => !selecionados.has(m.id)).slice(0, RESULTADOS_MAXIMOS);
    }
    const out: Municipio[] = [];
    for (const m of MUNICIPIOS) {
      if (selecionados.has(m.id)) continue;
      if (normalizar(m.nome).includes(termo) || normalizar(m.uf).includes(termo)) {
        out.push(m);
        if (out.length >= RESULTADOS_MAXIMOS) break;
      }
    }
    return out;
  }, [busca, value]);

  function adicionar(cidade: Municipio) {
    if (cheio) return;
    const proximo = [...value, cidade];
    onChange(proximo);
    setBusca("");
    if (proximo.length >= max) setOpen(false);
  }

  function remover(id: number) {
    onChange(value.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={cheio}
            className="w-full justify-between text-muted-foreground sm:w-96"
          >
            {cheio ? `Máximo de ${max} cidades selecionadas` : "Buscar cidade por nome ou UF…"}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(24rem,calc(100vw-2.5rem))] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Ex.: Uberlândia, Joinville, PR…"
              value={busca}
              onValueChange={setBusca}
            />
            <CommandList>
              <CommandEmpty>Nenhum município encontrado.</CommandEmpty>
              <CommandGroup>
                {resultados.map((m) => (
                  <CommandItem key={m.id} value={String(m.id)} onSelect={() => adicionar(m)}>
                    <Check className="size-4 opacity-0" aria-hidden="true" />
                    <span className="flex-1">{m.nome}</span>
                    <span className="num text-xs text-muted-foreground">{m.uf}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {resultados.length === RESULTADOS_MAXIMOS ? (
                <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                  Mostrando os primeiros {RESULTADOS_MAXIMOS} — refine a busca para achar outros.
                </p>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="flex flex-wrap items-center gap-2">
        {value.map((c) => (
          <Badge key={c.id} variant="secondary" className="gap-1.5 py-1.5 pl-3 pr-2 text-sm">
            {c.nome} <span className="text-muted-foreground">({c.uf})</span>
            <button
              type="button"
              onClick={() => remover(c.id)}
              aria-label={`Remover ${c.nome}`}
              className={cn(
                "ml-1 inline-flex size-4 items-center justify-center rounded-full text-muted-foreground",
                "hover:bg-muted-foreground/20 hover:text-foreground",
              )}
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}
        {value.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma cidade selecionada ainda.</p>
        ) : (
          <p className="num text-xs text-muted-foreground">
            {value.length}/{max}
          </p>
        )}
      </div>
    </div>
  );
}
