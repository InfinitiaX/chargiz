import { useState, useEffect } from "react";
import { X, Car, ShieldCheck, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import VehiculeSelector, { type VehiculeSelectorValue } from "@/components/VehiculeSelector";
import { normalizeImmat, getImmatError } from "@/lib/immat";

interface Props {
  entrepriseId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateVehiculeDialog({ entrepriseId, open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [collabs, setCollabs] = useState<{ id: string; nom: string; prenom: string }[]>([]);
  const [vehSelector, setVehSelector] = useState<VehiculeSelectorValue>({ marque: "", modele: "", capacite_batterie: null });
  const [form, setForm] = useState({
    immatriculation: "",
    vin: "",
    collaborateur_id: "",
  });

  useEffect(() => {
    if (open) {
      setVehSelector({ marque: "", modele: "", capacite_batterie: null });
      setForm({ immatriculation: "", vin: "", collaborateur_id: "" });
      apiFetch<{ id: string; nom: string; prenom: string }[]>(`/api/collaborateurs?entreprise_id=${entrepriseId}&active_only=true`)
        .then(setCollabs)
        .catch(console.error);
    }
  }, [open, entrepriseId]);

  if (!open) return null;

  const immatErr = form.immatriculation ? getImmatError(form.immatriculation) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehSelector.marque.trim() || !vehSelector.modele.trim()) return;
    // Si une immatriculation est saisie, elle doit être valide
    if (form.immatriculation && immatErr) return;
    setLoading(true);
    try {
      await apiFetch("/api/vehicules", {
        method: "POST",
        body: JSON.stringify({
          entreprise_id: entrepriseId,
          marque: vehSelector.marque || null,
          modele: vehSelector.modele || null,
          immatriculation: form.immatriculation || null,
          vin: form.vin || null,
          capacite_batterie: vehSelector.capacite_batterie,
          collaborateur_id: form.collaborateur_id || null,
          statut_affectation: form.collaborateur_id ? "affecte" : "non_affecte",
        }),
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error("Erreur création véhicule:", err);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Car className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-card-foreground">Nouveau véhicule</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sélecteur véhicule depuis base EV (marque/modèle/capacité) */}
          <VehiculeSelector value={vehSelector} onChange={setVehSelector} required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Immatriculation</label>
              <input
                className={`${inputCls} font-mono uppercase tracking-wide ${immatErr ? "border-destructive" : ""}`}
                value={form.immatriculation}
                onChange={e => setForm(f => ({ ...f, immatriculation: normalizeImmat(e.target.value) }))}
                placeholder="AB-123-CD"
                maxLength={9}
              />
              {immatErr ? (
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-destructive">
                  <AlertCircle className="h-3 w-3" /> {immatErr}
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">VIN</label>
              <input className={inputCls} value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value }))} placeholder="17 caractères (auto via Smartcar)" />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <label className="text-sm font-medium text-foreground flex items-center gap-1 mb-2">
              <ShieldCheck className="h-3 w-3 text-primary" /> Affectation
            </label>
            <select className={inputCls} value={form.collaborateur_id} onChange={e => setForm(f => ({ ...f, collaborateur_id: e.target.value }))}>
              <option value="">Laisser disponible (non affecté)</option>
              {collabs.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
            </select>
            <p className="mt-2 text-xs text-muted-foreground italic">
              Vous pourrez modifier l'affectation plus tard depuis la fiche véhicule.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !vehSelector.marque.trim() || !vehSelector.modele.trim() || !!(form.immatriculation && immatErr)}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50"
            >
              {loading ? "Création..." : "Ajouter au parc"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
