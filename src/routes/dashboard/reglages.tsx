import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Building2, User, Shield, Save, Clock, Calendar, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/dashboard/reglages")({
  component: ReglagesPage,
  head: () => ({ meta: [{ title: "ChargiZ — Réglages" }] }),
});

function ReglagesPage() {
  const [entreprise, setEntreprise] = useState<any>({});
  const [politique, setPolitique] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  const [prixKwh, setPrixKwh] = useState("0.21");
  const [joursAutorises, setJoursAutorises] = useState<string[]>(["lun", "mar", "mer", "jeu", "ven"]);
  const [heureDebut, setHeureDebut] = useState("00:00");
  const [heureFin, setHeureFin] = useState("23:59");
  const [congesNonRembourses, setCongesNonRembourses] = useState(true);
  const [fermetures, setFermetures] = useState<string[]>([]);
  const [newFermeture, setNewFermeture] = useState("");
  
  // Password change
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const { profile, role, user, updatePassword } = useAuth();

  useEffect(() => {
    if (!profile?.entreprise_id) return;
    loadData();
  }, [profile?.entreprise_id]);

  async function loadData() {
    try {
      const ent = await api.entreprises.get(profile!.entreprise_id!);
      if (ent) setEntreprise(ent);

      // Note: politique endpoint might need to be added to api.ts if needed
      // For now let's focus on user info and password change
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  }

  const savePolitique = async () => {
    // Placeholder for lot 1
    alert("Paramètres de politique bientôt disponibles");
  };

  const addFermeture = () => {
    if (newFermeture && !fermetures.includes(newFermeture)) {
      setFermetures([...fermetures, newFermeture]);
      setNewFermeture("");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");
    if (newPassword !== confirmPassword) {
      setPassError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    try {
      await updatePassword(oldPassword, newPassword);
      setPassSuccess("Mot de passe mis à jour avec succès.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPassError(err.message || "Erreur lors du changement de mot de passe");
    }
  };

  const jourLabels: Record<string, string> = { lun: "Lun", mar: "Mar", mer: "Mer", jeu: "Jeu", ven: "Ven", sam: "Sam", dim: "Dim" };
  const toggleJour = (j: string) => setJoursAutorises(prev => prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j]);
  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  const isGestEntreprise = role === "gestionnaire_entreprise" || role === "superadmin";
  const isGestFiliale = false;
  const isGestSite = false;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Réglages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paramètres de l'entreprise et politique de recharge</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Informations entreprise */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Informations entreprise</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><label className="text-muted-foreground text-xs">Dénomination</label><p className="mt-1 font-medium text-card-foreground">{(entreprise.nom as string) || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">SIREN</label><p className="mt-1 font-mono text-card-foreground">{(entreprise.siren as string) || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">SIRET</label><p className="mt-1 font-mono text-card-foreground">{(entreprise.siret as string) || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">N° TVA</label><p className="mt-1 text-card-foreground">{(entreprise.numero_tva as string) || "—"}</p></div>
              <div className="col-span-2"><label className="text-muted-foreground text-xs">Adresse</label><p className="mt-1 text-card-foreground">{[(entreprise.adresse as string), (entreprise.code_postal as string), (entreprise.ville as string)].filter(Boolean).join(", ") || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">Téléphone</label><p className="mt-1 text-card-foreground">{(entreprise.telephone as string) || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">Email</label><p className="mt-1 text-card-foreground">{(entreprise.email as string) || "—"}</p></div>
            </div>
          </div>
        </div>

        {/* Mon compte */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Mon compte</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-8">
              <div><label className="text-muted-foreground text-xs">Nom</label><p className="mt-1 text-card-foreground">{profile?.nom} {profile?.prenom}</p></div>
              <div><label className="text-muted-foreground text-xs">Email</label><p className="mt-1 text-card-foreground">{profile?.email || user?.email}</p></div>
              <div><label className="text-muted-foreground text-xs">Rôle</label><p className="mt-1 capitalize text-card-foreground">{role?.replace(/_/g, " ") || "—"}</p></div>
              <div><label className="text-muted-foreground text-xs">Téléphone</label><p className="mt-1 text-card-foreground">{profile?.telephone || "—"}</p></div>
            </div>

            <div className="pt-6 border-t border-border">
              <h4 className="text-sm font-semibold text-card-foreground mb-4">Changer le mot de passe</h4>
              {passError && <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{passError}</div>}
              {passSuccess && <div className="mb-4 rounded-lg bg-chargiz-teal/10 p-3 text-xs text-chargiz-teal">{passSuccess}</div>}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Ancien mot de passe</label>
                    <input type="password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Nouveau mot de passe</label>
                    <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Confirmer</label>
                    <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
                  </div>
                </div>
                <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-95">
                  Mettre à jour le mot de passe
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Politique de recharge */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Politique de recharge</h3>
          </div>
          <div className="p-6 space-y-6">
            {/* Delegation info */}
            {isGestEntreprise && (
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Délégation en cascade</p>
                <p>Chaque paramètre peut être géré au niveau entreprise, filiale, site ou collaborateur. Les niveaux inférieurs héritent de la valeur du niveau supérieur sauf si redéfinie.</p>
              </div>
            )}

            {/* Prix kWh */}
            <div>
              <label className="text-sm font-medium text-foreground">1. Prix du kWh (€ TTC)</label>
              <p className="text-xs text-muted-foreground mb-2">Seul paramètre configurable par le collaborateur via le lien d'inscription</p>
              <input type="number" step="0.0001" value={prixKwh} onChange={e => setPrixKwh(e.target.value)} className={`mt-1 ${inputCls} max-w-xs`} />
            </div>

            {/* Jours & horaires */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">2. Jours & horaires éligibles</label>
              <p className="text-xs text-muted-foreground mb-3">Non disponible via le lien d'inscription — espace connecté uniquement</p>
              <div className="flex gap-2 mb-4">
                {Object.entries(jourLabels).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => toggleJour(key)}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${joursAutorises.includes(key) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Début</label>
                  <input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} className={`mt-1 ${inputCls}`} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Fin</label>
                  <input type="time" value={heureFin} onChange={e => setHeureFin(e.target.value)} className={`mt-1 ${inputCls}`} />
                </div>
              </div>
            </div>

            {/* Fermetures */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">3. Dates de fermeture entreprise</label>
              <p className="text-xs text-muted-foreground mb-3">Gérées uniquement par entreprise / filiale / site — jamais par le collaborateur</p>
              <div className="flex gap-2 mb-3">
                <input type="date" value={newFermeture} onChange={e => setNewFermeture(e.target.value)} className={`${inputCls} max-w-xs`} />
                <button onClick={addFermeture} className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80">Ajouter</button>
              </div>
              {fermetures.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {fermetures.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive">
                      {new Date(f).toLocaleDateString("fr-FR")}
                      <button onClick={() => setFermetures(fermetures.filter((_, j) => j !== i))} className="ml-1 hover:text-destructive-foreground">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Congés */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">4. Gestion des congés</label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!congesNonRembourses} onChange={e => setCongesNonRembourses(!e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary" />
                <span className="text-sm text-foreground">Rembourser les recharges pendant les congés</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                {congesNonRembourses
                  ? "Les recharges effectuées pendant les congés déclarés sont automatiquement exclues du remboursement."
                  : "Les recharges pendant les congés seront remboursées normalement."
                }
              </p>
            </div>

            <button onClick={savePolitique} disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Appliquer la politique"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
