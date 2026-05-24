import { useState, useEffect } from "react";
import { X, Car, User as UserIcon, ChevronRight, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { api, apiFetch } from "@/lib/api";
import { toast } from "sonner";

/**
 * Dialog d'affectation véhicule ↔ collaborateur.
 *
 * Deux modes selon le contexte d'ouverture :
 * - `mode="from-collab"` : on est sur la fiche d'un collab sans véhicule → on liste
 *   les véhicules libres et on en sélectionne un.
 * - `mode="from-vehicule"` : on est sur un véhicule libre → on liste les collabs
 *   sans véhicule et on en sélectionne un.
 *
 * Dans les deux cas l'API appelée est la même : POST /vehicules/{id}/affecter.
 */

interface VehiculeOption {
  id: string;
  marque: string | null;
  modele: string | null;
  immatriculation: string | null;
  capacite_batterie: number | null;
  statut_smartcar: string | null;
  entreprise_id: string;
}

interface CollabOption {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  entreprise_id: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
  mode: "from-collab" | "from-vehicule";
  /** Quand mode = "from-collab", le collaborateur cible déjà connu. */
  collaborateur?: { id: string; prenom: string; nom: string; entreprise_id: string } | null;
  /** Quand mode = "from-vehicule", le véhicule cible déjà connu. */
  vehicule?: { id: string; marque: string | null; modele: string | null; immatriculation: string | null; entreprise_id: string } | null;
}

export default function AssignVehicleDialog({ open, onClose, onAssigned, mode, collaborateur, vehicule }: Props) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<(VehiculeOption | CollabOption)[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedId("");
    setSearch("");
    setError(null);
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, collaborateur?.id, vehicule?.id]);

  async function loadOptions() {
    setLoading(true);
    try {
      if (mode === "from-collab" && collaborateur) {
        // Véhicules libres de la même entreprise (statut_affectation = non_affecte)
        const data = await api.vehicules.list({
          entreprise_id: collaborateur.entreprise_id,
          statut_affectation: "non_affecte",
        });
        setOptions(data);
      } else if (mode === "from-vehicule" && vehicule) {
        // Collaborateurs de la même entreprise SANS véhicule
        const collabs = await api.collaborateurs.list({
          entreprise_id: vehicule.entreprise_id,
          active_only: "true",
        });
        // Filtre côté front : ceux qui n'ont aucun véhicule
        const allVeh = await api.vehicules.list({ entreprise_id: vehicule.entreprise_id });
        const collabIdsWithVehicule = new Set(allVeh.filter(v => v.collaborateur_id).map(v => v.collaborateur_id));
        const free = collabs.filter(c => !collabIdsWithVehicule.has(c.id));
        setOptions(free);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async () => {
    if (!selectedId) return;
    setError(null);
    setSubmitting(true);
    try {
      const vehiculeId = mode === "from-collab" ? selectedId : vehicule!.id;
      const collabId = mode === "from-collab" ? collaborateur!.id : selectedId;
      await api.vehicules_actions.affecter(vehiculeId, collabId);
      toast.success("Véhicule affecté", {
        description: mode === "from-collab"
          ? `Affecté à ${collaborateur!.prenom} ${collaborateur!.nom}.`
          : `${vehicule!.marque || ""} ${vehicule!.modele || ""} affecté.`.trim() + ".",
        duration: 5000,
      });
      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'affectation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // Filtre par recherche
  const filtered = options.filter(o => {
    if (!search) return true;
    if (mode === "from-collab") {
      const v = o as VehiculeOption;
      return `${v.marque || ""} ${v.modele || ""} ${v.immatriculation || ""}`
        .toLowerCase().includes(search.toLowerCase());
    } else {
      const c = o as CollabOption;
      return `${c.prenom} ${c.nom} ${c.email}`.toLowerCase().includes(search.toLowerCase());
    }
  });

  const targetIcon = mode === "from-collab" ? Car : UserIcon;
  const TargetIcon = targetIcon;
  const title = mode === "from-collab"
    ? `Affecter un véhicule à ${collaborateur?.prenom} ${collaborateur?.nom}`
    : `Affecter ce véhicule à un collaborateur`;
  const placeholderSearch = mode === "from-collab"
    ? "Rechercher par marque, modèle, immatriculation..."
    : "Rechercher par nom, email...";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-card shadow-2xl border border-border max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <TargetIcon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-card-foreground truncate">{title}</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={placeholderSearch}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-3 flex-1">
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive leading-snug">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
                <TargetIcon className="h-6 w-6 text-muted-foreground/70" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {mode === "from-collab" ? "Aucun véhicule libre" : "Aucun collaborateur disponible"}
              </p>
              <p className="mt-1 max-w-sm mx-auto text-xs text-muted-foreground">
                {mode === "from-collab"
                  ? "Tous les véhicules de l'entreprise sont déjà affectés. Détachez-en un d'abord ou créez un nouveau véhicule."
                  : "Tous les collaborateurs ont déjà un véhicule, ou aucun collaborateur n'existe encore dans cette entreprise."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map(o => {
                const isSelected = o.id === selectedId;
                if (mode === "from-collab") {
                  const v = o as VehiculeOption;
                  return (
                    <li key={v.id}>
                      <button
                        onClick={() => setSelectedId(v.id)}
                        className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary/15" : "bg-muted"}`}>
                          <Car className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-card-foreground text-sm truncate">
                            {v.marque || "—"} {v.modele || ""}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {v.immatriculation || "Sans immatriculation"}
                            {v.capacite_batterie && <span className="ml-2">· {v.capacite_batterie} kWh</span>}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 ${
                          v.statut_smartcar === "connecte"
                            ? "bg-chargiz-teal/10 text-chargiz-teal"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${v.statut_smartcar === "connecte" ? "bg-chargiz-teal" : "bg-muted-foreground"}`} />
                          {v.statut_smartcar === "connecte" ? "Connecté" : v.statut_smartcar === "suspendu" ? "Suspendu" : "Déconnecté"}
                        </span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    </li>
                  );
                } else {
                  const c = o as CollabOption;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary/15" : "bg-muted"}`}>
                          <UserIcon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-card-foreground text-sm truncate">{c.prenom} {c.nom}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    </li>
                  );
                }
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedId || submitting}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Affectation...
              </>
            ) : (
              <>
                Affecter
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
