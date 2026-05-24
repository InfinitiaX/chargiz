import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { MapPin, Loader2, Lightbulb, Search, Check } from "lucide-react";

// BugID_007 — Fallback autocomplétion via la BAN (data.gouv.fr) quand pas de clé Google.
// Gratuit, sans clé, couvre toute la France. Utilisé pour pays_code === "FR".
interface BanFeature {
  properties: {
    label: string;
    postcode?: string;
    city?: string;
    name?: string;
    context?: string;
  };
  geometry: { coordinates: [number, number] };
}
async function searchBan(query: string): Promise<BanFeature[]> {
  if (!query || query.trim().length < 3) return [];
  try {
    const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=6&autocomplete=1`);
    if (!r.ok) return [];
    const d = await r.json();
    return d.features || [];
  } catch {
    return [];
  }
}

interface PaysOption {
  code: string;
  label: string;
  fe_electricite: number;
}

export interface AddressValue {
  pays_code: string;
  adresse: string;
  code_postal: string;
  ville: string;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  /** Affiche les libellés avec étoile rouge */
  required?: boolean;
  /** Cache le sélecteur pays (si déjà défini ailleurs) */
  hideCountry?: boolean;
}

/**
 * Composant d'autocomplétion d'adresse (CDC §5.3).
 *
 * Stratégie hybride :
 * 1. **Google Places API** si `VITE_GOOGLE_MAPS_API_KEY` est définie → autocomplétion native
 * 2. **Fallback saisie manuelle** sinon → l'utilisateur remplit adresse/CP/ville manuellement
 *
 * Dans les deux cas, on stocke pays_code (CDC §5.7) + adresse + lat/lng (si dispo).
 *
 * Le composant Google Maps est chargé dynamiquement pour ne pas bloquer le bundle
 * principal si la clé n'est pas configurée.
 */
export default function AddressAutocomplete({ value, onChange, required = false, hideCountry = false }: Props) {
  const [paysList, setPaysList] = useState<PaysOption[]>([]);
  const [loadingPays, setLoadingPays] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const useGoogle = !!apiKey;

  // BugID_007 — Fallback BAN data.gouv.fr (France uniquement) si pas de clé Google
  const useBan = !useGoogle && value.pays_code === "FR";
  const [banSuggestions, setBanSuggestions] = useState<BanFeature[]>([]);
  const [banLoading, setBanLoading] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const banDebounceRef = useRef<number | null>(null);

  // Chargement liste pays depuis le backend (CDC §5.3 — UE + UK)
  useEffect(() => {
    setLoadingPays(true);
    apiFetch<{ pays: PaysOption[] }>("/api/ev-database/pays")
      .then(d => setPaysList(d.pays))
      .catch(() => setPaysList([{ code: "FR", label: "France", fe_electricite: 0.05 }]))
      .finally(() => setLoadingPays(false));
  }, []);

  // Chargement dynamique de Google Maps Places API
  useEffect(() => {
    if (!useGoogle) return;
    if ((window as any).google?.maps?.places) {
      setGoogleReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=fr`;
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    script.onerror = () => console.warn("[Google Maps] Échec chargement — fallback manuel");
    document.head.appendChild(script);
  }, [useGoogle, apiKey]);

  // Initialise l'Autocomplete Google quand prêt + input monté
  useEffect(() => {
    if (!googleReady || !inputRef.current || autocompleteRef.current) return;
    const google = (window as any).google;
    if (!google?.maps?.places) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: value.pays_code ? { country: value.pays_code.toLowerCase() } : undefined,
      fields: ["address_components", "formatted_address", "geometry"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;

      let cp = "";
      let ville = "";
      for (const comp of place.address_components || []) {
        if (comp.types.includes("postal_code")) cp = comp.long_name;
        if (comp.types.includes("locality")) ville = comp.long_name;
      }

      onChange({
        ...value,
        adresse: place.formatted_address || value.adresse,
        code_postal: cp || value.code_postal,
        ville: ville || value.ville,
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
      });
    });

    autocompleteRef.current = autocomplete;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleReady, value.pays_code]);

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  const Label = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
    <label className="block text-xs font-medium text-foreground mb-1.5">
      {children} {req && <span className="text-destructive">*</span>}
    </label>
  );

  return (
    <div className="space-y-3">
      {!hideCountry && (
        <div>
          <Label req={required}>Pays</Label>
          <select
            className={inputCls}
            value={value.pays_code}
            onChange={e => onChange({ ...value, pays_code: e.target.value })}
            disabled={loadingPays}
          >
            <option value="">— Sélectionner —</option>
            {paysList.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
          </select>
        </div>
      )}

      <div>
        <Label req={required}>Adresse</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            className={`${inputCls} pl-10`}
            value={value.adresse}
            onChange={e => {
              const v = e.target.value;
              onChange({ ...value, adresse: v, latitude: null, longitude: null });
              // BugID_007 — fallback BAN data.gouv.fr (France)
              if (useBan) {
                if (banDebounceRef.current) window.clearTimeout(banDebounceRef.current);
                if (v.trim().length < 3) {
                  setBanSuggestions([]);
                  setBanOpen(false);
                  return;
                }
                setBanLoading(true);
                setBanOpen(true);
                banDebounceRef.current = window.setTimeout(async () => {
                  const features = await searchBan(v);
                  setBanSuggestions(features);
                  setBanLoading(false);
                }, 250);
              }
            }}
            onFocus={() => useBan && banSuggestions.length > 0 && setBanOpen(true)}
            onBlur={() => useBan && window.setTimeout(() => setBanOpen(false), 200)}
            placeholder={useGoogle || useBan ? "Commencez à taper pour l'autocomplétion..." : "Numéro, rue"}
            autoComplete="off"
          />
          {(useGoogle && !googleReady) || banLoading ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}

          {/* BugID_007 — Dropdown suggestions BAN */}
          {useBan && banOpen && banSuggestions.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
              {banSuggestions.map((f, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()} // empêche le blur avant click
                    onClick={() => {
                      const [lng, lat] = f.geometry.coordinates;
                      onChange({
                        ...value,
                        adresse: f.properties.label,
                        code_postal: f.properties.postcode || value.code_postal,
                        ville: f.properties.city || value.ville,
                        latitude: lat,
                        longitude: lng,
                      });
                      setBanOpen(false);
                      setBanSuggestions([]);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-muted/50 border-b border-border/40 last:border-b-0"
                  >
                    <span className="block font-medium text-foreground">{f.properties.label}</span>
                    {f.properties.context && (
                      <span className="block text-[11px] text-muted-foreground">{f.properties.context}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!useGoogle && !useBan && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lightbulb className="h-3 w-3" /> Autocomplétion disponible pour la France. Sélectionnez "France" comme pays.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label req={required}>Code postal</Label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            className={inputCls}
            value={value.code_postal}
            onChange={e => onChange({ ...value, code_postal: e.target.value })}
            placeholder="75001"
          />
        </div>
        <div>
          <Label req={required}>Ville</Label>
          <input
            type="text"
            className={inputCls}
            value={value.ville}
            onChange={e => onChange({ ...value, ville: e.target.value })}
            placeholder="Paris"
          />
        </div>
      </div>

      {value.latitude != null && value.longitude != null && (
        <p className="flex items-center gap-1 text-[11px] text-chargiz-teal">
          <Check className="h-3 w-3" /> Coordonnées GPS récupérées : {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
}
