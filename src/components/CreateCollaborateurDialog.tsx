import { useState, useEffect } from "react";
import { X, AlertCircle, Users, Car, ChevronRight, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import PhoneInput from "./PhoneInput";

function friendlyError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("email") && (m.includes("déjà") || m.includes("taken") || m.includes("exist") || m.includes("pris")))
    return "Cette adresse email est déjà utilisée par un autre compte.";
  if (m.includes("session expir") || m.includes("401"))
    return "Votre session a expiré. Veuillez vous reconnecter.";
  if (m.includes("accès refusé") || m.includes("403") || m.includes("forbidden"))
    return "Vous n'avez pas les droits pour effectuer cette action.";
  if (m.includes("réseau") || m.includes("network") || m.includes("fetch"))
    return "Impossible de joindre le serveur. Vérifiez votre connexion.";
  return raw;
}

interface Props {
  entrepriseId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCollaborateurDialog({ entrepriseId, open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  });

  useEffect(() => {
    if (open) {
      apiFetch<{ id: string; marque: string | null; modele: string | null; immatriculation: string | null; statut_smartcar: string | null }[]>(`/api/vehicules?entreprise_id=${entrepriseId}&statut_affectation=non_affecte`)
        .then((data) => setVehiculesLibres(data.map(v => ({ 
          id: v.id, 
          marque: v.marque ?? '', 
          modele: v.modele ?? '', 
          immatriculation: v.immatriculation ?? '', 
          statut_smartcar: v.statut_smartcar ?? '' 
        }))))
        .catch(console.error);
    }
  }, [open, entrepriseId]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const profileData = await apiFetch<any>("/api/collaborateurs", {
        method: "POST",
        body: JSON.stringify({
          nom: form.nom,
          prenom: form.prenom,
          email: form.email,
          telephone: form.telephone || null,
          adresse: form.adresse || null,
          code_postal: form.code_postal || null,
          entreprise_id: entrepriseId,
          is_active: true,
        }),
      });

      if (vehicleOption === "existant" && selectedVehiculeId && profileData) {
        await apiFetch(`/api/vehicules/${selectedVehiculeId}`, {
          method: "PATCH",
          body: JSON.stringify({
            collaborateur_id: profileData.id,
            statut_affectation: "affecte",
          }),
        });
      }

      onCreated();
      onClose();
      setForm({ nom: "", prenom: "", email: "", telephone: "", adresse: "", code_postal: "" });

      toast.success("Collaborateur ajouté avec succès", {
        description: `${form.prenom} ${form.nom} a été créé. Il recevra ses identifiants de connexion par email.`,
        duration: 7000,
      });
    } catch (err: any) {
      console.error("Erreur création collaborateur:", err);
      setError(friendlyError(err.message || "Une erreur est survenue lors de la création."));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-primary/[0.02] hover:border-input/80 transition-all";
  const sectionCls = "rounded-2xl border border-border/40 bg-muted/20 p-5";
  const sectionTitleCls = "flex items-center gap-2.5 mb-4";
  const sectionIconCls = "inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-card shadow-2xl shadow-primary/5 border border-border/60 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="relative flex items-center justify-between px-7 py-5 border-b border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-card shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-md" />
              <div className="relative h-11 w-11 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-card-foreground">Ajouter un collaborateur</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Les champs marqués * sont obligatoires</p>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mx-7 mt-5 flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-2xl">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive leading-snug">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="overflow-y-auto px-7 py-5 space-y-5">
          {/* Section identité */}
          <div className={sectionCls}>
            <div className={sectionTitleCls}>
              <span className={sectionIconCls}><Users className="h-3.5 w-3.5" /></span>
              <h3 className="text-sm font-semibold text-foreground">Identité</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Prénom <span className="text-destructive">*</span></label>
                  <input required className={inputCls} value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Marie" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nom <span className="text-destructive">*</span></label>
                  <input required className={inputCls} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Dupont" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email <span className="text-destructive">*</span></label>
                <input type="email" required className={inputCls} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="nom@entreprise.fr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Téléphone <span className="text-muted-foreground text-xs ml-1 font-normal">(optionnel)</span></label>
                <PhoneInput
                  value={form.telephone}
                  onChange={(e164) => setForm(f => ({ ...f, telephone: e164 }))}
                  defaultCountry="FR"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Adresse <span className="text-muted-foreground text-xs ml-1 font-normal">(optionnel)</span></label>
                  <input className={inputCls} value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} placeholder="Adresse complète" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Code postal <span className="text-muted-foreground text-xs ml-1 font-normal">(optionnel)</span></label>
                  <input className={inputCls} value={form.code_postal} onChange={e => setForm(f => ({ ...f, code_postal: e.target.value }))} placeholder="75001" maxLength={5} inputMode="numeric" />
                </div>
              </div>
            </div>
          </div>

          {/* Section véhicule */}
          <div className={sectionCls}>
            <div className={sectionTitleCls}>
              <span className={sectionIconCls}><Car className="h-3.5 w-3.5" /></span>
              <h3 className="text-sm font-semibold text-foreground">Affectation véhicule</h3>
            </div>
            <div className="flex gap-3 mb-3">
              <button type="button" onClick={() => setVehicleOption("nouveau")}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${vehicleOption === "nouveau" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>
                Nouveau véhicule
              </button>
              <button type="button" onClick={() => setVehicleOption("existant")}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${vehicleOption === "existant" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>
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
                        {v.marque} {v.modele} — {v.immatriculation}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-7 py-4 border-t border-border/60 bg-muted/20 shrink-0">
          <button type="button" onClick={onClose} disabled={loading} className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors">Annuler</button>
          <button type="submit" onClick={handleSubmit as any} disabled={loading} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all">
            {loading ? (<><Loader2 className="h-4 w-4 animate-spin" />Création…</>) : (<>Enregistrer<ChevronRight className="h-4 w-4" /></>)}
          </button>
        </div>
      </div>
    </div>
  );
}
