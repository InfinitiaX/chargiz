import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  entrepriseId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCollaborateurDialog({ entrepriseId, open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [filiales, setFiliales] = useState<{ id: string; nom: string }[]>([]);
  const [sites, setSites] = useState<{ id: string; nom: string }[]>([]);
  const [vehiculesLibres, setVehiculesLibres] = useState<{ id: string; marque: string; modele: string; immatriculation: string; statut_smartcar: string }[]>([]);
  const [vehicleOption, setVehicleOption] = useState<"nouveau" | "existant">("nouveau");
  const [selectedVehiculeId, setSelectedVehiculeId] = useState("");
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    adresse: "",
    code_postal: "",
    ville: "",
    pays: "France",
    filiale_id: "",
    site_id: "",
  });

  useEffect(() => {
    if (open) {
      supabase.from("filiales").select("id, nom").eq("entreprise_id", entrepriseId).then(({ data }) => {
        if (data) setFiliales(data);
      });
      supabase.from("vehicules").select("id, marque, modele, immatriculation, statut_smartcar")
        .eq("entreprise_id", entrepriseId)
        .eq("statut_affectation", "non_affecte")
        .then(({ data }) => { if (data) setVehiculesLibres(data); });
    }
  }, [open, entrepriseId]);

  useEffect(() => {
    if (form.filiale_id) {
      supabase.from("sites").select("id, nom").eq("filiale_id", form.filiale_id).then(({ data }) => {
        if (data) setSites(data);
      });
    } else {
      setSites([]);
    }
  }, [form.filiale_id]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create profile (without user_id - will be linked when collaborateur activates account)
      const { data: profileData, error: profileError } = await supabase.from("profiles").insert({
        ...form,
        entreprise_id: entrepriseId,
        filiale_id: form.filiale_id || null,
        site_id: form.site_id || null,
      }).select("id").single();
      if (profileError) throw profileError;

      // If existing vehicle selected, assign it
      if (vehicleOption === "existant" && selectedVehiculeId && profileData) {
        await supabase.from("vehicules").update({
          collaborateur_id: profileData.id,
          statut_affectation: "affecte",
        }).eq("id", selectedVehiculeId);
      }

      onCreated();
      onClose();
    } catch (err) {
      console.error("Erreur création collaborateur:", err);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-card-foreground">Ajouter un collaborateur</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Nom *</label>
              <input required className={inputCls} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Prénom *</label>
              <input required className={inputCls} value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Email *</label>
            <input type="email" required className={inputCls} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="nom@entreprise.fr" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Téléphone</label>
            <input className={inputCls} value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Adresse</label>
            <input className={inputCls} value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} placeholder="Adresse complète" />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Filiale</label>
              <select className={inputCls} value={form.filiale_id} onChange={e => setForm(f => ({ ...f, filiale_id: e.target.value, site_id: "" }))}>
                <option value="">Sélectionner</option>
                {filiales.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Site</label>
              <select className={inputCls} value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}>
                <option value="">Sélectionner</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
          </div>

          {/* Vehicle Assignment */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Affectation véhicule</p>
            <div className="flex gap-3 mb-3">
              <button type="button" onClick={() => setVehicleOption("nouveau")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${vehicleOption === "nouveau" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                Nouveau véhicule
              </button>
              <button type="button" onClick={() => setVehicleOption("existant")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${vehicleOption === "existant" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                Véhicule existant
              </button>
            </div>
            {vehicleOption === "nouveau" && (
              <p className="text-xs text-muted-foreground">Le collaborateur renseignera les informations du véhicule lors de son inscription.</p>
            )}
            {vehicleOption === "existant" && (
              <div>
                {vehiculesLibres.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun véhicule non affecté disponible.</p>
                ) : (
                  <select className={inputCls} value={selectedVehiculeId} onChange={e => setSelectedVehiculeId(e.target.value)}>
                    <option value="">Sélectionner un véhicule</option>
                    {vehiculesLibres.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.marque} {v.modele} — {v.immatriculation} ({v.statut_smartcar === "connecte" ? "Connecté" : "Suspendu"})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
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
