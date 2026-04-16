import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  entrepriseId: string;
  defaultFilialeId?: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateSiteDialog({ entrepriseId, defaultFilialeId, open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [filiales, setFiliales] = useState<{ id: string; nom: string }[]>([]);
  const [form, setForm] = useState({
    nom: "",
    filiale_id: defaultFilialeId || "",
    adresse: "",
    code_postal: "",
    ville: "",
    pays: "France",
    siret: "",
    responsable_nom: "",
    responsable_prenom: "",
    responsable_email: "",
    responsable_telephone: "",
  });

  useEffect(() => {
    if (open) {
      supabase.from("filiales").select("id, nom").eq("entreprise_id", entrepriseId).then(({ data }) => {
        if (data) setFiliales(data);
      });
    }
  }, [open, entrepriseId]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("sites").insert(form);
      if (error) throw error;
      onCreated();
      onClose();
    } catch (err) {
      console.error("Erreur création site:", err);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-card-foreground">Ajouter un site</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Nom du site *</label>
            <input required className={inputCls} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Site Lyon Centre" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Filiale de rattachement *</label>
            <select required className={inputCls} value={form.filiale_id} onChange={e => setForm(f => ({ ...f, filiale_id: e.target.value }))}>
              <option value="">Sélectionner une filiale</option>
              {filiales.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Adresse</label>
            <input className={inputCls} value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Code postal</label>
              <input className={inputCls} value={form.code_postal} onChange={e => setForm(f => ({ ...f, code_postal: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Ville</label>
              <input className={inputCls} value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Pays</label>
              <input className={inputCls} value={form.pays} onChange={e => setForm(f => ({ ...f, pays: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">SIRET</label>
            <input className={inputCls} value={form.siret} onChange={e => setForm(f => ({ ...f, siret: e.target.value }))} />
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Responsable</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nom</label>
                <input className={inputCls} value={form.responsable_nom} onChange={e => setForm(f => ({ ...f, responsable_nom: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Prénom</label>
                <input className={inputCls} value={form.responsable_prenom} onChange={e => setForm(f => ({ ...f, responsable_prenom: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <input type="email" className={inputCls} value={form.responsable_email} onChange={e => setForm(f => ({ ...f, responsable_email: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                <input className={inputCls} value={form.responsable_telephone} onChange={e => setForm(f => ({ ...f, responsable_telephone: e.target.value }))} />
              </div>
            </div>
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
