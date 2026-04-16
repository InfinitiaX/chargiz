import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  entrepriseId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateVehiculeDialog({ entrepriseId, open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [collabs, setCollabs] = useState<{ id: string; nom: string; prenom: string }[]>([]);
  const [form, setForm] = useState({
    marque: "",
    modele: "",
    immatriculation: "",
    vin: "",
    capacite_batterie: "",
    collaborateur_id: "",
  });

  useEffect(() => {
    if (open) {
      supabase.from("profiles").select("id, nom, prenom").eq("entreprise_id", entrepriseId).eq("is_active", true).order("nom").then(({ data }) => {
        if (data) setCollabs(data);
      });
    }
  }, [open, entrepriseId]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("vehicules").insert({
        entreprise_id: entrepriseId,
        marque: form.marque || null,
        modele: form.modele || null,
        immatriculation: form.immatriculation || null,
        vin: form.vin || null,
        capacite_batterie: form.capacite_batterie ? parseFloat(form.capacite_batterie) : null,
        collaborateur_id: form.collaborateur_id || null,
        statut_affectation: form.collaborateur_id ? "affecte" : "non_affecte",
      });
      if (error) throw error;
      onCreated();
      onClose();
      setForm({ marque: "", modele: "", immatriculation: "", vin: "", capacite_batterie: "", collaborateur_id: "" });
    } catch (err) {
      console.error("Erreur création véhicule:", err);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-card-foreground">Ajouter un véhicule</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Marque *</label>
              <input required className={inputCls} value={form.marque} onChange={e => setForm(f => ({ ...f, marque: e.target.value }))} placeholder="Ex: Tesla" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Modèle *</label>
              <input required className={inputCls} value={form.modele} onChange={e => setForm(f => ({ ...f, modele: e.target.value }))} placeholder="Ex: Model 3" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Immatriculation</label>
              <input className={inputCls} value={form.immatriculation} onChange={e => setForm(f => ({ ...f, immatriculation: e.target.value }))} placeholder="AA-123-BB" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">VIN</label>
              <input className={inputCls} value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value }))} placeholder="17 caractères" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Capacité batterie (kWh)</label>
            <input type="number" step="0.1" className={inputCls} value={form.capacite_batterie} onChange={e => setForm(f => ({ ...f, capacite_batterie: e.target.value }))} placeholder="Ex: 60" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Affecter à un collaborateur</label>
            <select className={inputCls} value={form.collaborateur_id} onChange={e => setForm(f => ({ ...f, collaborateur_id: e.target.value }))}>
              <option value="">Non affecté</option>
              {collabs.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">Annuler</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50">
              {loading ? "Création..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
