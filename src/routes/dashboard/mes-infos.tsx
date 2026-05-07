import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { User, Car, Shield, Save } from "lucide-react";

export const Route = createFileRoute("/dashboard/mes-infos")({
  component: MesInfosPage,
  head: () => ({ meta: [{ title: "ChargiZ — Mes informations" }] }),
});

const JOURS_BITMASK = [
  { key: "lun", label: "Lun", bit: 1 },
  { key: "mar", label: "Mar", bit: 2 },
  { key: "mer", label: "Mer", bit: 4 },
  { key: "jeu", label: "Jeu", bit: 8 },
  { key: "ven", label: "Ven", bit: 16 },
  { key: "sam", label: "Sam", bit: 32 },
  { key: "dim", label: "Dim", bit: 64 },
];

function MesInfosPage() {
  const { user } = useAuth();
  const [collaborateur, setCollaborateur] = useState<any>(null);
  const [vehicule, setVehicule] = useState<any>(null);
  const [entrepriseNom, setEntrepriseNom] = useState("");
  const [politique, setPolitique] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", telephone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.collaborateurs.list(),
      api.vehicules.list(),
      api.entreprises.list(),
      api.politiques.list(),
    ]).then(([collabs, vehicles, entreprises, politiques]) => {
      const collab = (collabs as any[])[0] ?? null;
      setCollaborateur(collab);
      if (collab) setForm({ nom: collab.nom ?? "", prenom: collab.prenom ?? "", telephone: collab.telephone ?? "" });
      if ((vehicles as any[]).length > 0) setVehicule((vehicles as any[])[0]);
      if ((entreprises as any[]).length > 0) setEntrepriseNom((entreprises as any[])[0].nom);
      if ((politiques as any[]).length > 0) setPolitique((politiques as any[])[0]);
    });
  }, [user]);

  const handleSave = async () => {
    if (!collaborateur) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.collaborateurs.update(collaborateur.id, {
        nom: form.nom,
        prenom: form.prenom,
        telephone: form.telephone || null,
      });
      setCollaborateur(updated);
      setEditMode(false);
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const jourActif = (bit: number) => {
    if (politique?.jours_fermeture == null) return true;
    return !(politique.jours_fermeture & bit);
  };

  const inputCls =
    "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  const greyedCls =
    "w-full rounded-lg border border-input bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed";

  if (!user)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mes informations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez vos informations personnelles et véhicule</p>
        </div>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Modifier
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Informations personnelles */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground mb-4">
            <User className="h-5 w-5 text-primary" /> Informations personnelles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {editMode ? (
              <>
                <div>
                  <label className="text-muted-foreground text-xs">Nom</label>
                  <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-muted-foreground text-xs">Prénom</label>
                  <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-muted-foreground text-xs">Téléphone</label>
                  <input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className={inputCls} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-muted-foreground">Nom</p>
                  <p className="font-medium text-card-foreground">{collaborateur?.nom || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prénom</p>
                  <p className="font-medium text-card-foreground">{collaborateur?.prenom || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium text-card-foreground">{user.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Téléphone</p>
                  <p className="font-medium text-card-foreground">{collaborateur?.telephone || "—"}</p>
                </div>
              </>
            )}
            <div>
              <label className="text-muted-foreground text-xs">
                Entreprise <span className="text-[10px] uppercase">(non modifiable)</span>
              </label>
              <input value={entrepriseNom || "—"} disabled className={greyedCls} />
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          {editMode && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {saving ? "Sauvegarde..." : "Enregistrer"}
              </button>
              <button
                onClick={() => { setEditMode(false); setError(null); }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Annuler
              </button>
            </div>
          )}
        </div>

        {/* Politique de recharge */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
              <Shield className="h-5 w-5 text-primary" /> Politique de recharge
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-muted text-muted-foreground">
              Géré par l'entreprise
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-muted-foreground text-xs">Prix kWh entreprise (€)</label>
              <input
                value={politique?.prix_kwh != null ? `${politique.prix_kwh} €/kWh` : "—"}
                disabled
                className={greyedCls}
              />
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-2">Jours de recharge éligibles</p>
              <div className="flex gap-1.5 flex-wrap">
                {JOURS_BITMASK.map(j => (
                  <span
                    key={j.key}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      jourActif(j.bit) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {j.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Véhicule */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground mb-4">
            <Car className="h-5 w-5 text-primary" /> Véhicule
          </h3>
          {vehicule ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Marque</p>
                <p className="font-medium text-card-foreground">{vehicule.marque || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Modèle</p>
                <p className="font-medium text-card-foreground">{vehicule.modele || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Immatriculation</p>
                <p className="font-medium font-mono text-card-foreground">{vehicule.immatriculation || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">VIN</p>
                <p className="font-medium font-mono text-xs text-card-foreground">{vehicule.vin || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Capacité batterie</p>
                <p className="font-medium text-card-foreground">
                  {vehicule.capacite_batterie ? `${vehicule.capacite_batterie} kWh` : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Statut connexion</p>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    vehicule.statut_smartcar === "connecte" ? "text-chargiz-teal" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      vehicule.statut_smartcar === "connecte" ? "bg-chargiz-teal" : "bg-muted-foreground"
                    }`}
                  />
                  {vehicule.statut_smartcar === "connecte"
                    ? "Connecté"
                    : vehicule.statut_smartcar === "suspendu"
                    ? "Suspendu"
                    : "Déconnecté"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun véhicule affecté.</p>
          )}
        </div>
      </div>
    </div>
  );
}
