import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Building2, User, Shield, Save, Clock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/reglages")({
  component: ReglagesPage,
  head: () => ({ meta: [{ title: "ChargiZ — Réglages" }] }),
});

const JOUR_LABELS: Record<string, string> = { lun: "Lun", mar: "Mar", mer: "Mer", jeu: "Jeu", ven: "Ven", sam: "Sam", dim: "Dim" };
const JOURS_DEFAULT = ["lun", "mar", "mer", "jeu", "ven"];
// Encode jours_eligibles as a bitmask packed in `jours_fermeture` to avoid a DB migration in Lot 1.
// bit0 = lun, bit1 = mar, ... bit6 = dim
const JOUR_BITS: Record<string, number> = { lun: 1, mar: 2, mer: 4, jeu: 8, ven: 16, sam: 32, dim: 64 };
function joursToMask(jours: string[]): number {
  return jours.reduce((acc, j) => acc | (JOUR_BITS[j] || 0), 0);
}
function maskToJours(mask: number | null | undefined): string[] {
  if (!mask) return [...JOURS_DEFAULT];
  return Object.keys(JOUR_BITS).filter(j => mask & JOUR_BITS[j]);
}

function ReglagesPage() {
  const { profile, role, user, updatePassword } = useAuth();
  const isGestEntreprise = role === "gestionnaire_entreprise" || role === "superadmin";
  const entrepriseId = profile?.entreprise_id || "";

  // ─── Entreprise (editable) ───
  const [entreprise, setEntreprise] = useState<any>({});
  const [entSaving, setEntSaving] = useState(false);
  const [entStatus, setEntStatus] = useState<{ ok?: string; err?: string }>({});

  // ─── Mon compte (editable) ───
  const [accountFullName, setAccountFullName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountStatus, setAccountStatus] = useState<{ ok?: string; err?: string }>({});

  // ─── Politique recharge ───
  const [politique, setPolitique] = useState<any>(null);
  const [delegation, setDelegation] = useState<"entreprise" | "collaborateur">("entreprise");
  const [prixKwh, setPrixKwh] = useState("0.21");
  const [joursEligibles, setJoursEligibles] = useState<string[]>(JOURS_DEFAULT);
  const [polSaving, setPolSaving] = useState(false);
  const [polStatus, setPolStatus] = useState<{ ok?: string; err?: string }>({});

  // ─── Mot de passe ───
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

  useEffect(() => {
    setAccountFullName(`${profile?.prenom || ""} ${profile?.nom || ""}`.trim());
    setAccountEmail(profile?.email || user?.email || "");
  }, [profile, user]);

  useEffect(() => {
    if (!entrepriseId) return;
    loadData();
  }, [entrepriseId]);

  async function loadData() {
    try {
      const ent = await api.entreprises.get(entrepriseId);
      if (ent) setEntreprise(ent);

      const pols = await api.politiques.list({ entreprise_id: entrepriseId });
      if (pols.length > 0) {
        const p = pols[0];
        setPolitique(p);
        if (p.prix_kwh != null) setPrixKwh(String(p.prix_kwh));
        if (p.delegation_prix) setDelegation(p.delegation_prix === "collaborateur" ? "collaborateur" : "entreprise");
        setJoursEligibles(maskToJours(p.jours_fermeture));
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  }

  // ─── Save handlers ───
  const saveEntreprise = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntStatus({});
    setEntSaving(true);
    try {
      const updated = await api.entreprises.update(entrepriseId, {
        nom: entreprise.nom,
        siren: entreprise.siren || null,
        siret: entreprise.siret || null,
        numero_tva: entreprise.numero_tva || null,
        adresse: entreprise.adresse || null,
        code_postal: entreprise.code_postal || null,
        ville: entreprise.ville || null,
        telephone: entreprise.telephone || null,
        email: entreprise.email || null,
      });
      setEntreprise(updated);
      setEntStatus({ ok: "Informations entreprise enregistrées." });
    } catch (err: any) {
      setEntStatus({ err: err.message || "Erreur lors de l'enregistrement." });
    } finally {
      setEntSaving(false);
    }
  };

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setAccountStatus({});
    setAccountSaving(true);
    try {
      await api.users.update(user.id, {
        email: accountEmail,
        full_name: accountFullName,
      });
      setAccountStatus({ ok: "Profil mis à jour." });
    } catch (err: any) {
      setAccountStatus({ err: err.message || "Erreur lors de la mise à jour." });
    } finally {
      setAccountSaving(false);
    }
  };

  const savePolitique = async () => {
    if (!entrepriseId) return;
    setPolStatus({});
    setPolSaving(true);
    try {
      await api.politiques.save({
        entreprise_id: entrepriseId,
        prix_kwh: parseFloat(prixKwh) || 0.21,
        devise: "EUR",
        jours_fermeture: joursToMask(joursEligibles),
        delegation_prix: delegation,
        delegation_jours: delegation,
      });
      setPolStatus({ ok: "Politique de recharge enregistrée." });
    } catch (err: any) {
      setPolStatus({ err: err.message || "Erreur lors de l'enregistrement." });
    } finally {
      setPolSaving(false);
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
    if (newPassword.length < 8) {
      setPassError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    try {
      await updatePassword(oldPassword, newPassword);
      setPassSuccess("Mot de passe mis à jour.");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      setPassError(err.message || "Erreur lors du changement de mot de passe.");
    }
  };

  const toggleJour = (j: string) =>
    setJoursEligibles(prev => prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j]);

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  const Status = ({ s }: { s: { ok?: string; err?: string } }) => (
    <>
      {s.ok && <div className="mb-3 flex items-start gap-2 rounded-lg bg-chargiz-teal/10 p-3 text-xs text-chargiz-teal"><CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> {s.ok}</div>}
      {s.err && <div className="mb-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{s.err}</div>}
    </>
  );

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Réglages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paramètres de l'entreprise, du compte et politique de recharge</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Informations entreprise (editable) */}
        {isGestEntreprise && entrepriseId && (
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-card-foreground">Informations entreprise</h3>
            </div>
            <form onSubmit={saveEntreprise} className="p-6 space-y-4">
              <Status s={entStatus} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Dénomination *</label>
                  <input required className={`mt-1 ${inputCls}`} value={entreprise.nom || ""} onChange={e => setEntreprise({ ...entreprise, nom: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <input type="email" className={`mt-1 ${inputCls}`} value={entreprise.email || ""} onChange={e => setEntreprise({ ...entreprise, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">SIREN</label>
                  <input maxLength={9} className={`mt-1 ${inputCls} font-mono`} value={entreprise.siren || ""} onChange={e => setEntreprise({ ...entreprise, siren: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">SIRET</label>
                  <input maxLength={14} className={`mt-1 ${inputCls} font-mono`} value={entreprise.siret || ""} onChange={e => setEntreprise({ ...entreprise, siret: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">N° TVA</label>
                  <input className={`mt-1 ${inputCls}`} value={entreprise.numero_tva || ""} onChange={e => setEntreprise({ ...entreprise, numero_tva: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Téléphone</label>
                  <input className={`mt-1 ${inputCls}`} value={entreprise.telephone || ""} onChange={e => setEntreprise({ ...entreprise, telephone: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground">Adresse</label>
                  <input className={`mt-1 ${inputCls}`} value={entreprise.adresse || ""} onChange={e => setEntreprise({ ...entreprise, adresse: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Code postal</label>
                  <input maxLength={5} className={`mt-1 ${inputCls}`} value={entreprise.code_postal || ""} onChange={e => setEntreprise({ ...entreprise, code_postal: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Ville</label>
                  <input className={`mt-1 ${inputCls}`} value={entreprise.ville || ""} onChange={e => setEntreprise({ ...entreprise, ville: e.target.value })} />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={entSaving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50">
                  <Save className="h-4 w-4" /> {entSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Mon compte */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Mon compte</h3>
          </div>
          <div className="p-6 space-y-6">
            <form onSubmit={saveAccount} className="space-y-4">
              <Status s={accountStatus} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Nom complet</label>
                  <input className={`mt-1 ${inputCls}`} value={accountFullName} onChange={e => setAccountFullName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email *</label>
                  <input type="email" required className={`mt-1 ${inputCls}`} value={accountEmail} onChange={e => setAccountEmail(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Rôle</label>
                  <input disabled className={`mt-1 ${inputCls} bg-muted`} value={role?.replace(/_/g, " ") || "—"} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Identifiant</label>
                  <input disabled className={`mt-1 ${inputCls} bg-muted font-mono`} value={user?.username || "—"} />
                </div>
              </div>
              <div className="pt-1">
                <button type="submit" disabled={accountSaving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50">
                  <Save className="h-4 w-4" /> {accountSaving ? "Enregistrement..." : "Enregistrer le profil"}
                </button>
              </div>
            </form>

            <div className="pt-6 border-t border-border">
              <h4 className="text-sm font-semibold text-card-foreground mb-4">Changer le mot de passe</h4>
              {passError && <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{passError}</div>}
              {passSuccess && <div className="mb-4 rounded-lg bg-chargiz-teal/10 p-3 text-xs text-chargiz-teal">{passSuccess}</div>}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Ancien mot de passe</label>
                    <input type="password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Nouveau mot de passe</label>
                    <input type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Confirmer</label>
                    <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="••••••••" />
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
        {isGestEntreprise && entrepriseId && (
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-card-foreground">Politique de recharge</h3>
            </div>
            <div className="p-6 space-y-6">
              <Status s={polStatus} />

              <div>
                <label className="text-sm font-medium text-foreground">Mode de gestion</label>
                <p className="text-xs text-muted-foreground mb-3">Choix du niveau qui définit le prix du kWh et les jours éligibles.</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setDelegation("entreprise")}
                    className={`flex-1 rounded-lg border px-4 py-3 text-left transition-colors ${delegation === "entreprise" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                    <p className="text-sm font-semibold text-card-foreground">Mode global entreprise</p>
                    <p className="mt-1 text-xs text-muted-foreground">Un prix kWh + jours éligibles partagés par tous les collaborateurs.</p>
                  </button>
                  <button type="button" onClick={() => setDelegation("collaborateur")}
                    className={`flex-1 rounded-lg border px-4 py-3 text-left transition-colors ${delegation === "collaborateur" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                    <p className="text-sm font-semibold text-card-foreground">Mode individuel collaborateur</p>
                    <p className="mt-1 text-xs text-muted-foreground">Le prix kWh et les jours sont gérés au niveau de chaque collaborateur.</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  {delegation === "entreprise" ? "Prix du kWh (€ TTC)" : "Prix du kWh par défaut (€ TTC)"}
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  {delegation === "entreprise"
                    ? "Appliqué à toutes les recharges domicile remboursables."
                    : "Valeur par défaut héritée par les nouveaux collaborateurs (modifiable sur la fiche)."}
                </p>
                <div className="flex items-center gap-3">
                  <input type="number" step="0.001" min="0" max="5" value={prixKwh} onChange={e => setPrixKwh(e.target.value)} className={`${inputCls} max-w-[160px]`} />
                  <span className="text-xs text-muted-foreground">Tarif moyen en France : 0,21 €/kWh</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-1">
                  <Clock className="h-4 w-4" /> Jours éligibles au remboursement
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Recharges effectuées les autres jours = non remboursables.
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(JOUR_LABELS).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => toggleJour(key)}
                      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${joursEligibles.includes(key) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={savePolitique} disabled={polSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50">
                <Save className="h-4 w-4" /> {polSaving ? "Enregistrement..." : "Enregistrer la politique"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
