import { useState } from "react";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateEntrepriseDialog({ open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    siren: "",
    siret: "",
    numero_tva: "",
    adresse: "",
    code_postal: "",
    ville: "",
    pays: "France",
    email: "",
    telephone: "",
    prix_kwh_defaut: "0.21",
    manager_email: "",
    manager_full_name: "",
  });

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/api/entreprises", {
        method: "POST",
        body: JSON.stringify({
          nom: form.nom,
          siren: form.siren || null,
          siret: form.siret || null,
          numero_tva: form.numero_tva || null,
          adresse: form.adresse || null,
          code_postal: form.code_postal || null,
          ville: form.ville || null,
          email: form.email || null,
          telephone: form.telephone || null,
          prix_kwh_defaut: parseFloat(form.prix_kwh_defaut) || 0.21,
          manager_email: form.manager_email,
          manager_full_name: form.manager_full_name,
        }),
      });
      onCreated();
      onClose();
      setForm({
        nom: "",
        siren: "",
        siret: "",
        numero_tva: "",
        adresse: "",
        code_postal: "",
        ville: "",
        pays: "France",
        email: "",
        telephone: "",
        prix_kwh_defaut: "0.21",
        manager_email: "",
        manager_full_name: "",
      });
    } catch (err) {
      console.error("Erreur création entreprise:", err);
      alert("Erreur lors de la création de l'entreprise");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-card-foreground">Créer une entreprise</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Dénomination *</label>
            <input required className={inputCls} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Acme SAS" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">SIREN</label>
              <input className={inputCls} value={form.siren} onChange={e => setForm(f => ({ ...f, siren: e.target.value }))} placeholder="9 chiffres" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">SIRET</label>
              <input className={inputCls} value={form.siret} onChange={e => setForm(f => ({ ...f, siret: e.target.value }))} placeholder="14 chiffres" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">N° TVA intracommunautaire</label>
            <input className={inputCls} value={form.numero_tva} onChange={e => setForm(f => ({ ...f, numero_tva: e.target.value }))} placeholder="FR12345678901" />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Téléphone</label>
              <input className={inputCls} value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Prix kWh par défaut (€)</label>
            <input type="number" step="0.0001" className={`${inputCls} max-w-xs`} value={form.prix_kwh_defaut} onChange={e => setForm(f => ({ ...f, prix_kwh_defaut: e.target.value }))} />
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-bold text-card-foreground mb-4">Compte Gestionnaire Entreprise</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Nom complet du gestionnaire *</label>
                <input required className={inputCls} value={form.manager_full_name} onChange={e => setForm(f => ({ ...f, manager_full_name: e.target.value }))} placeholder="Prénom Nom" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Email du gestionnaire *</label>
                <input required type="email" className={inputCls} value={form.manager_email} onChange={e => setForm(f => ({ ...f, manager_email: e.target.value }))} placeholder="nom@entreprise.fr" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">Annuler</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50">
              {loading ? "Création..." : "Créer l'entreprise"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
