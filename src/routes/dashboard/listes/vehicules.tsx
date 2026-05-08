import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import CreateVehiculeDialog from "@/components/CreateVehiculeDialog";
import { Plus, Search, Car, Eye, Edit, Trash2, X, Download } from "lucide-react";
import { exportCSV } from "@/lib/export";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/dashboard/listes/vehicules")({
  component: ListeVehicules,
  head: () => ({ meta: [{ title: "ChargiZ — Véhicules" }] }),
});

interface Vehicule {
  id: string;
  marque: string | null;
  modele: string | null;
  vin: string | null;
  immatriculation: string | null;
  capacite_batterie: number | null;
  statut_smartcar: string;
  statut_affectation: string;
  collaborateur_id: string | null;
  entreprise_id: string;
}

function ListeVehicules() {
  const { profile, role, loading } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const isSuperadmin = role === "superadmin";
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [collabs, setCollabs] = useState<Map<string, any>>(new Map());
  const [entreprises, setEntreprises] = useState<Map<string, any>>(new Map());
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [filterAbo, setFilterAbo] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editVeh, setEditVeh] = useState<Vehicule | null>(null);

  useEffect(() => {
    if (loading) return;
    // Pour superadmin pas besoin d'entreprise_id (vue globale)
    if (!isSuperadmin && !entrepriseId) return;
    loadVehicules();
  }, [loading, entrepriseId, isSuperadmin]);

  async function loadVehicules() {
    try {
      const url = isSuperadmin ? "/api/vehicules" : `/api/vehicules?entreprise_id=${entrepriseId}`;
      const [vehs, collabsArr, entreprisesArr] = await Promise.all([
        apiFetch<Vehicule[]>(url),
        apiFetch<any[]>("/api/collaborateurs"),
        isSuperadmin ? apiFetch<any[]>("/api/entreprises") : Promise.resolve([]),
      ]);
      setVehicules(vehs);
      setCollabs(new Map(collabsArr.map((c: any) => [c.id, c])));
      setEntreprises(new Map((entreprisesArr || []).map((e: any) => [e.id, e])));
    } catch (err) {
      console.error("Error loading vehicles:", err);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous supprimer ce véhicule ?")) return;
    try {
      await apiFetch(`/api/vehicules/${id}`, { method: "DELETE" });
      loadVehicules();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  };

  const handleEditSave = async () => {
    if (!editVeh) return;
    try {
      await apiFetch(`/api/vehicules/${editVeh.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          marque: editVeh.marque,
          modele: editVeh.modele,
          immatriculation: editVeh.immatriculation,
          vin: editVeh.vin,
          capacite_batterie: editVeh.capacite_batterie,
        }),
      });
      setEditVeh(null);
      loadVehicules();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la modification");
    }
  };

  const filtered = vehicules.filter(v => {
    if (search && !`${v.marque} ${v.modele} ${v.immatriculation}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatut && v.statut_affectation !== filterStatut) return false;
    if (filterAbo && v.statut_smartcar !== filterAbo) return false;
    return true;
  });

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Véhicules</h1>
          <p className="mt-1 text-sm text-muted-foreground">Flotte de véhicules électriques</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button onClick={() => exportCSV("vehicules", filtered.map(v => ({
            Marque: v.marque || "", Modèle: v.modele || "", VIN: v.vin || "",
            Immatriculation: v.immatriculation || "",
            "Batterie (kWh)": v.capacite_batterie ?? "",
            "Statut affectation": v.statut_affectation,
            "Statut Smartcar": v.statut_smartcar,
          })))} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Exporter
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
            <Plus className="h-4 w-4" /> Ajouter un véhicule
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher par marque, immatriculation..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
            className="flex-1 sm:flex-none rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary">
            <option value="">Tous statuts</option>
            <option value="affecte">Affecté</option>
            <option value="non_affecte">Non affecté</option>
            <option value="archive">Archivé</option>
          </select>
          <select value={filterAbo} onChange={e => setFilterAbo(e.target.value)}
            className="flex-1 sm:flex-none rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary">
            <option value="">Toutes connexions</option>
            <option value="connecte">Connecté</option>
            <option value="suspendu">Suspendu</option>
            <option value="deconnecte">Déconnecté</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Véhicule</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Immat</th>
                {isSuperadmin && <th className="px-6 py-3 text-left font-medium text-muted-foreground">Entreprise</th>}
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Collaborateur affilié</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Batterie</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Smartcar</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={isSuperadmin ? 8 : 7} className="px-6 py-12 text-center text-muted-foreground">Aucun véhicule trouvé</td></tr>
              ) : filtered.map(v => {
                const collab = v.collaborateur_id ? collabs.get(v.collaborateur_id) : null;
                const ent = isSuperadmin ? entreprises.get(v.entreprise_id) : null;
                return (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-card-foreground">{v.marque || "—"} {v.modele || ""}</span>
                      <span className="text-xs text-muted-foreground font-mono">{v.vin || "VIN non renseigné"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-card-foreground">{v.immatriculation || "—"}</td>
                  {isSuperadmin && (
                    <td className="px-6 py-4">
                      {ent ? (
                        <Link to="/dashboard/listes/entreprises/$id" params={{ id: ent.id }} className="text-card-foreground hover:underline">
                          {ent.nom}
                        </Link>
                      ) : <span className="text-muted-foreground italic text-xs">—</span>}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    {collab ? (
                      <Link to="/dashboard/collaborateur/$id" params={{ id: collab.id }} className="text-card-foreground hover:underline">
                        {collab.prenom} {collab.nom}
                      </Link>
                    ) : <span className="text-muted-foreground italic text-xs">Non affilié</span>}
                  </td>
                  <td className="px-6 py-4 text-card-foreground">{v.capacite_batterie ? `${v.capacite_batterie} kWh` : "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      v.statut_affectation === "affecte" ? "bg-chargiz-teal/10 text-chargiz-teal"
                      : v.statut_affectation === "archive" ? "bg-muted text-muted-foreground"
                      : "bg-kpi-sessions/10 text-kpi-sessions"
                    }`}>
                      {v.statut_affectation === "affecte" ? "Affecté" : v.statut_affectation === "archive" ? "Archivé" : "Non affecté"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${v.statut_smartcar === "connecte" ? "text-chargiz-teal" : v.statut_smartcar === "suspendu" ? "text-kpi-away" : "text-muted-foreground"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${v.statut_smartcar === "connecte" ? "bg-chargiz-teal" : v.statut_smartcar === "suspendu" ? "bg-kpi-away" : "bg-muted-foreground"}`} />
                      {v.statut_smartcar === "connecte" ? "Connecté" : v.statut_smartcar === "suspendu" ? "Suspendu" : "Déconnecté"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to="/dashboard/listes/vehicules/$vehiculeId" params={{ vehiculeId: v.id }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Fiche">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button onClick={() => setEditVeh({ ...v })} title="Modifier" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(v.id)} title="Supprimer" className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {entrepriseId && <CreateVehiculeDialog entrepriseId={entrepriseId} open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadVehicules} />}

      {/* Edit Dialog */}
      {editVeh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-card-foreground">Modifier le véhicule</h2>
              <button onClick={() => setEditVeh(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-foreground">Marque</label><input className={inputCls} value={editVeh.marque || ""} onChange={e => setEditVeh({ ...editVeh, marque: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground">Modèle</label><input className={inputCls} value={editVeh.modele || ""} onChange={e => setEditVeh({ ...editVeh, modele: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-foreground">Immatriculation</label><input className={inputCls} value={editVeh.immatriculation || ""} onChange={e => setEditVeh({ ...editVeh, immatriculation: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground">VIN</label><input className={inputCls} value={editVeh.vin || ""} onChange={e => setEditVeh({ ...editVeh, vin: e.target.value })} /></div>
              </div>
              <div><label className="text-sm font-medium text-foreground">Capacité batterie (kWh)</label><input type="number" step="0.1" className={inputCls} value={editVeh.capacite_batterie || ""} onChange={e => setEditVeh({ ...editVeh, capacite_batterie: e.target.value ? parseFloat(e.target.value) : null })} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditVeh(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">Annuler</button>
                <button onClick={handleEditSave} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
