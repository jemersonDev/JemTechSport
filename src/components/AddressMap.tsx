import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type * as LeafletNamespace from "leaflet";

/**
 * Mapa baseado em Leaflet + OpenStreetMap (gratuito, sem chave).
 * Geocoding via Nominatim (https://nominatim.org/) — também gratuito.
 *
 * Uso:
 *   <AddressMap address="Av. Paulista 1000, São Paulo" />
 *
 * Se `lat`/`lng` forem passados explicitamente, usa essas coords e não geocoda.
 * Caso contrário, faz fetch ao Nominatim (com debounce) para obter as coords.
 *
 * IMPORTANTE: Carrega Leaflet dinamicamente (apenas no cliente) para evitar
 * erros de SSR (Leaflet acessa `window`/`document` no top-level).
 */

type Props = {
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  height?: number;
  className?: string;
  onResolved?: (coords: { lat: number; lng: number; displayName: string } | null) => void;
};

type Coords = { lat: number; lng: number; displayName?: string };

async function geocode(query: string): Promise<Coords | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

export function AddressMap({
  address,
  lat,
  lng,
  height = 220,
  className,
  onResolved,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const LRef = useRef<typeof LeafletNamespace | null>(null);
  const [coords, setCoords] = useState<Coords | null>(
    lat != null && lng != null ? { lat, lng } : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Geocode address (debounced) when no explicit lat/lng
  useEffect(() => {
    if (lat != null && lng != null) {
      setCoords({ lat, lng });
      return;
    }
    if (!address || address.trim().length < 4) {
      setCoords(null);
      onResolved?.(null);
      return;
    }
    setLoading(true);
    setError(null);
    const handle = setTimeout(async () => {
      const c = await geocode(address.trim());
      setLoading(false);
      if (c) {
        setCoords(c);
        onResolved?.({ lat: c.lat, lng: c.lng, displayName: c.displayName ?? address });
      } else {
        setCoords(null);
        setError("Endereço não encontrado");
        onResolved?.(null);
      }
    }, 700);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, lat, lng]);

  // Init / update Leaflet map (client-only, dynamic import)
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || !coords) return;

    let cancelled = false;
    (async () => {
      const L = LRef.current ?? (await import("leaflet"));
      if (cancelled) return;
      LRef.current = L;

      // Inject Leaflet CSS once
      const cssId = "leaflet-css";
      if (!document.getElementById(cssId)) {
        const link = document.createElement("link");
        link.id = cssId;
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Default marker icon (Leaflet's default assets break with bundlers)
      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current!, {
          center: [coords.lat, coords.lng],
          zoom: 15,
          scrollWheelZoom: false,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 19,
        }).addTo(mapRef.current);
        markerRef.current = L.marker([coords.lat, coords.lng], { icon }).addTo(mapRef.current);
      } else {
        mapRef.current.setView([coords.lat, coords.lng], 15);
        if (markerRef.current) {
          markerRef.current.setLatLng([coords.lat, coords.lng]);
        } else {
          markerRef.current = L.marker([coords.lat, coords.lng], { icon }).addTo(mapRef.current);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coords]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  const q = encodeURIComponent(address ?? coords?.displayName ?? "");
  const mapsUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
    : q
    ? `https://www.google.com/maps/search/?api=1&query=${q}`
    : null;
  const uberUrl = coords
    ? `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${coords.lat}&dropoff[longitude]=${coords.lng}&dropoff[nickname]=${q}`
    : null;

  return (
    <div className={className}>
      {coords ? (
        <div
          ref={containerRef}
          className="w-full rounded-md overflow-hidden border border-border"
          style={{ height }}
        />
      ) : (
        <div
          className="w-full rounded-md border border-dashed border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground"
          style={{ height }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> A localizar endereço…
            </span>
          ) : error ? (
            <span className="flex items-center gap-2">
              <MapPin className="w-3 h-3" /> {error}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Escreve o endereço para ver o mapa
            </span>
          )}
        </div>
      )}
      {(mapsUrl || uberUrl) && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-neon/30 bg-neon/5 text-neon text-xs font-bold hover:bg-neon/10 transition"
            >
              <MapPin className="w-3.5 h-3.5" /> Abrir no Maps
            </a>
          )}
          {uberUrl && (
            <a
              href={uberUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-white/20 bg-black text-white text-xs font-bold hover:bg-white/5 transition"
            >
              🚗 Chamar Uber
            </a>
          )}
        </div>
      )}
    </div>
  );
}
