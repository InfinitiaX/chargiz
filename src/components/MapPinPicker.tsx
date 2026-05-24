import { useEffect, useRef, useState } from "react";
import { MapPin, AlertCircle } from "lucide-react";

interface Props {
  /** Coordonnées initiales du pin (centre de la carte) */
  initialLat?: number | null;
  initialLng?: number | null;
  /** Callback à chaque déplacement du pin */
  onChange: (lat: number, lng: number) => void;
  /** Hauteur de la carte (Tailwind : "h-64" par défaut) */
  className?: string;
}

/**
 * Composant carte avec pin déplaçable pour préciser un point GPS
 * (CDC §5.3 — point de recharge distant > 100m du domicile).
 *
 * Utilise Google Maps si VITE_GOOGLE_MAPS_API_KEY est configurée.
 * Sinon, affiche un message expliquant que la carte est désactivée
 * et permet la saisie manuelle des coordonnées en repli.
 */
export default function MapPinPicker({ initialLat, initialLng, onChange, className = "h-72" }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [manualLat, setManualLat] = useState<string>(initialLat != null ? String(initialLat) : "");
  const [manualLng, setManualLng] = useState<string>(initialLng != null ? String(initialLng) : "");

  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const useGoogle = !!apiKey;

  // Chargement Google Maps (réutilise le script si déjà chargé par AddressAutocomplete)
  useEffect(() => {
    if (!useGoogle) return;
    if ((window as any).google?.maps) {
      setReady(true);
      return;
    }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=fr`;
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, [useGoogle, apiKey]);

  // Initialise la carte + marker
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstanceRef.current) return;
    const google = (window as any).google;
    const center = {
      lat: initialLat ?? 48.8566,    // Paris par défaut
      lng: initialLng ?? 2.3522,
    };

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: initialLat ? 17 : 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const marker = new google.maps.Marker({
      position: center,
      map,
      draggable: true,
      title: "Point de recharge — déplacez-moi !",
    });

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      const lat = pos.lat();
      const lng = pos.lng();
      setManualLat(String(lat.toFixed(6)));
      setManualLng(String(lng.toFixed(6)));
      onChange(lat, lng);
    });

    // Click sur la carte = déplacement du marker
    map.addListener("click", (e: any) => {
      marker.setPosition(e.latLng);
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setManualLat(String(lat.toFixed(6)));
      setManualLng(String(lng.toFixed(6)));
      onChange(lat, lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ─── Mode fallback : Google Maps non disponible ─────────────────────────
  if (!useGoogle) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-400">
            <p className="font-semibold">Carte interactive désactivée</p>
            <p className="mt-0.5">
              La clé Google Maps n'est pas configurée. Saisissez les coordonnées GPS manuellement
              ou contactez votre administrateur.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Latitude</label>
            <input
              type="number"
              step="0.000001"
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-mono"
              value={manualLat}
              onChange={e => {
                setManualLat(e.target.value);
                const lat = parseFloat(e.target.value);
                const lng = parseFloat(manualLng);
                if (!isNaN(lat) && !isNaN(lng)) onChange(lat, lng);
              }}
              placeholder="48.853000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Longitude</label>
            <input
              type="number"
              step="0.000001"
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-mono"
              value={manualLng}
              onChange={e => {
                setManualLng(e.target.value);
                const lat = parseFloat(manualLat);
                const lng = parseFloat(e.target.value);
                if (!isNaN(lat) && !isNaN(lng)) onChange(lat, lng);
              }}
              placeholder="2.349900"
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── Mode normal : carte Google Maps ────────────────────────────────────
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        <span>Cliquez ou faites glisser le marqueur pour positionner précisément votre point de recharge.</span>
      </div>
      <div ref={mapRef} className={`w-full ${className} rounded-lg overflow-hidden border border-border bg-muted`} />
      {markerRef.current && (
        <p className="text-[11px] font-mono text-chargiz-teal">
          📍 {manualLat}, {manualLng}
        </p>
      )}
    </div>
  );
}
