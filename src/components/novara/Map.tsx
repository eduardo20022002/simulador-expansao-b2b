import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type * as ReactLeaflet from "react-leaflet";

import { Panel } from "./Block";
import { InfoDot } from "./InfoDot";
import type { MapPoint, MetricExplainer } from "@/lib/novara/engine";

interface NovaraMapProps {
  points: MapPoint[];
  /** Município selecionado. null = visão das 82 cidades. */
  selectedCity: { lat: number; lon: number } | null;
  explain?: MetricExplainer[];
  title: string;
}

const HEIGHT = "h-[520px]";

/**
 * Gate de montagem client-only: nenhum import estático de leaflet/react-leaflet
 * no topo do arquivo. `ssr: false` na rota já impede o servidor de tentar
 * renderizar esta árvore; este componente é a segunda camada de segurança,
 * seguindo (e estendendo) o único precedente do repo para API de navegador
 * (src/hooks/use-mobile.tsx: estado começa indefinido, leitura real só em efeito).
 */
export function NovaraMap(props: NovaraMapProps) {
  const [mod, setMod] = useState<{
    L: typeof Leaflet;
    RL: typeof ReactLeaflet;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import("leaflet"), import("react-leaflet"), import("leaflet/dist/leaflet.css")]).then(
      ([L, RL]) => {
        if (!cancelled) setMod({ L, RL });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Panel className="flex flex-col gap-3 p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <h3 className="text-sm font-semibold text-foreground">{props.title}</h3>
        {props.explain ? <InfoDot label={props.title} items={props.explain} /> : null}
      </div>
      {mod ? (
        <MapCanvas {...props} L={mod.L} RL={mod.RL} />
      ) : (
        <div className={`${HEIGHT} w-full animate-pulse rounded-lg bg-surface-sunken`} aria-hidden />
      )}
      <p className="text-[11px] text-muted-foreground">
        © OpenStreetMap contributors © CARTO
      </p>
    </Panel>
  );
}

function resolvePalette() {
  const s = getComputedStyle(document.documentElement);
  const g = (name: string) => s.getPropertyValue(name).trim();
  return {
    primary: g("--chart-1") || g("--primary"),
    border: g("--border"),
    isDark: document.documentElement.classList.contains("dark"),
  };
}

function MapCanvas({
  points,
  selectedCity,
  L,
  RL,
}: NovaraMapProps & { L: typeof Leaflet; RL: typeof ReactLeaflet }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const [palette, setPalette] = useState(() => resolvePalette());

  // Re-resolve os tokens de cor se o tema mudar (classe no <html> ou preferência do SO).
  useEffect(() => {
    const recompute = () => setPalette(resolvePalette());
    const mo = new MutationObserver(recompute);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", recompute);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", recompute);
    };
  }, []);

  // A sidebar colapsável muda a largura do container sem disparar resize da
  // janela — o Leaflet não percebe isso sozinho.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tileUrl = palette.isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const bounds = useMemo(() => {
    if (points.length === 0) return null;
    return L.latLngBounds(points.map((p) => [p.lat, p.lon]));
  }, [points, L]);

  return (
    <div ref={wrapperRef} className={`${HEIGHT} w-full overflow-hidden rounded-lg`}>
      <RL.MapContainer
        ref={mapRef}
        center={selectedCity ? [selectedCity.lat, selectedCity.lon] : [-7.5, -37.5]}
        zoom={selectedCity ? 13 : 7}
        scrollWheelZoom
        className="h-full w-full"
      >
        <FitToData bounds={bounds} selectedCity={selectedCity} RL={RL} points={points} />
        <RL.TileLayer
          key={tileUrl}
          url={tileUrl}
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />
        {points.map((p) => (
          <RL.CircleMarker
            key={p.id}
            center={[p.lat, p.lon]}
            radius={4 + p.radiusFraction * 22}
            pathOptions={{
              color: palette.primary,
              fillColor: palette.primary,
              fillOpacity: 0.55,
              weight: 1.5,
            }}
          >
            <RL.Popup>
              <p className="font-semibold text-foreground">{p.label}</p>
              <p className="num text-sm">
                {p.revenue} <span className="text-muted-foreground">· {p.share}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                margem {p.margin} · {p.clients} clientes-proxy
              </p>
            </RL.Popup>
          </RL.CircleMarker>
        ))}
      </RL.MapContainer>
    </div>
  );
}

/** Enquadra o mapa nos pontos do conjunto atual sempre que ele muda. */
function FitToData({
  bounds,
  selectedCity,
  points,
  RL,
}: {
  bounds: Leaflet.LatLngBounds | null;
  selectedCity: { lat: number; lon: number } | null;
  points: MapPoint[];
  RL: typeof ReactLeaflet;
}) {
  const map = RL.useMap();
  useEffect(() => {
    // Sem animação: o renderizador SVG do Leaflet tem uma falha conhecida em
    // que CircleMarkers adicionados durante um flyTo animado (antes do
    // primeiro "viewreset" completar) ficam com posição zerada até o próximo
    // pan manual. fitBounds/setView sem animação disparam o viewreset de
    // imediato, então todo marcador nasce na posição certa.
    if (points.length >= 2 && bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15, animate: false });
    } else if (selectedCity) {
      // Fallback para cidades com poucos bairros mapeados (ex.: Aquiraz tem só
      // 2) — fitBounds num conjunto quase degenerado dá um zoom sem sentido.
      map.setView([selectedCity.lat, selectedCity.lon], 13, { animate: false });
    } else if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], animate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, selectedCity, points.length]);
  return null;
}
