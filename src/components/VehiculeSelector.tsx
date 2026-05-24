import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Search, Car, Loader2 } from "lucide-react";

interface EvModel {
  id: string;
  modele: string;
  capacite_batterie_kwh: number;
  type_vehicule: "BEV" | "PHEV";
}

export interface VehiculeSelectorValue {
  marque: string;
  modele: string;
  capacite_batterie: number | null;
  type_vehicule?: "BEV" | "PHEV";
}

interface Props {
  value: VehiculeSelectorValue;
  onChange: (v: VehiculeSelectorValue) => void;
  /** Affiche les libellés "Marque *" "Modèle *" "Capacité *" */
  required?: boolean;
  /** Désactive tous les inputs */
  disabled?: boolean;
}

/**
 * Sélecteur véhicule conforme CDC §3.3.7.1 + §5.1.1.1 :
 * 1. Marque en liste déroulante depuis la base EV
 * 2. Modèle en liste déroulante (filtrée par marque)
 * 3. Capacité batterie pré-remplie automatiquement
 * 4. **Fallback saisie manuelle** si le véhicule n'est pas dans la base
 */
export default function VehiculeSelector({ value, onChange, required = false, disabled = false }: Props) {
  const [marques, setMarques] = useState<string[]>([]);
  const [models, setModels] = useState<EvModel[]>([]);
  const [loadingMarques, setLoadingMarques] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chargement initial des marques
  useEffect(() => {
    setLoadingMarques(true);
    apiFetch<{ marques: string[] }>("/api/ev-database/marques")
      .then(d => {
        setMarques(d.marques);
        // Si la marque actuelle n'est pas dans la liste → mode manuel auto
        if (value.marque && !d.marques.includes(value.marque)) {
          setManualMode(true);
        }
      })
      .catch(() => setError("Impossible de charger la base véhicules."))
      .finally(() => setLoadingMarques(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chargement des modèles quand la marque change
  useEffect(() => {
    if (!value.marque || manualMode) {
      setModels([]);
      return;
    }
    setLoadingModels(true);
    apiFetch<{ modeles: EvModel[] }>(`/api/ev-database/modeles?marque=${encodeURIComponent(value.marque)}`)
      .then(d => setModels(d.modeles))
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, [value.marque, manualMode]);

  const handleMarqueChange = (newMarque: string) => {
    if (newMarque === "__manual__") {
      setManualMode(true);
      onChange({ marque: "", modele: "", capacite_batterie: null });
      return;
    }
    onChange({ marque: newMarque, modele: "", capacite_batterie: null });
  };

  const handleModeleChange = (modelId: string) => {
    if (modelId === "__manual__") {
      setManualMode(true);
      onChange({ ...value, modele: "", capacite_batterie: null });
      return;
    }
    const m = models.find(m => m.id === modelId);
    if (m) {
      onChange({
        marque: value.marque,
        modele: m.modele,
        capacite_batterie: m.capacite_batterie_kwh,
        type_vehicule: m.type_vehicule,
      });
    }
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50";
  const Label = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
    <label className="block text-xs font-medium text-foreground mb-1.5">
      {children} {req && <span className="text-destructive">*</span>}
    </label>
  );

  // ─── Mode manuel : tous les champs en saisie libre ────────────────────────
  if (manualMode) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">Saisie manuelle (véhicule non trouvé dans la base)</p>
          <button
            type="button"
            onClick={() => { setManualMode(false); onChange({ marque: "", modele: "", capacite_batterie: null }); }}
            className="text-xs text-primary hover:underline"
          >
            ← Revenir à la liste
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label req={required}>Marque</Label>
            <input
              className={inputCls}
              value={value.marque}
              onChange={e => onChange({ ...value, marque: e.target.value })}
              placeholder="Ex: Renault"
              disabled={disabled}
            />
          </div>
          <div>
            <Label req={required}>Modèle</Label>
            <input
              className={inputCls}
              value={value.modele}
              onChange={e => onChange({ ...value, modele: e.target.value })}
              placeholder="Ex: Megane E-Tech"
              disabled={disabled}
            />
          </div>
        </div>
        <div>
          <Label req={required}>Capacité batterie (kWh)</Label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="250"
            className={inputCls}
            value={value.capacite_batterie ?? ""}
            onChange={e => onChange({ ...value, capacite_batterie: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="60"
            disabled={disabled}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Smartcar pourra confirmer cette valeur lors de la connexion.
          </p>
        </div>
      </div>
    );
  }

  // ─── Mode liste déroulante ─────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label req={required}>Marque</Label>
          <div className="relative">
            <select
              className={inputCls}
              value={value.marque}
              onChange={e => handleMarqueChange(e.target.value)}
              disabled={disabled || loadingMarques}
            >
              <option value="">{loadingMarques ? "Chargement..." : "— Sélectionner —"}</option>
              {marques.map(m => <option key={m} value={m}>{m}</option>)}
              <option value="__manual__">+ Autre marque (saisie manuelle)</option>
            </select>
            {loadingMarques && <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
        <div>
          <Label req={required}>Modèle</Label>
          <div className="relative">
            <select
              className={inputCls}
              value={models.find(m => m.modele === value.modele && m.capacite_batterie_kwh === value.capacite_batterie)?.id || ""}
              onChange={e => handleModeleChange(e.target.value)}
              disabled={disabled || !value.marque || loadingModels}
            >
              <option value="">{!value.marque ? "Choisir la marque d'abord" : loadingModels ? "Chargement..." : "— Sélectionner —"}</option>
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.modele} — {m.capacite_batterie_kwh} kWh ({m.type_vehicule})
                </option>
              ))}
              {value.marque && !loadingModels && (
                <option value="__manual__">+ Mon modèle n'est pas listé (saisie manuelle)</option>
              )}
            </select>
            {loadingModels && <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Car className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          La capacité batterie est <strong>pré-remplie</strong> depuis la base véhicules.
          Smartcar pourra l'ajuster lors de la connexion.
        </span>
      </div>
      {value.capacite_batterie != null && (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
          <span className="text-muted-foreground">Capacité batterie : </span>
          <strong className="text-foreground">{value.capacite_batterie} kWh</strong>
        </div>
      )}
    </div>
  );
}
