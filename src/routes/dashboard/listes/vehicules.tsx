import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, Car, Eye, Edit } from "lucide-react";

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
}

function ListeVehicules() {
  const { profile } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [filterAbo, setFilterAbo] = useState("");

  useEffect(() => {
    if (!entrepriseId) return;
    loadVehicules();
  }, [entrepriseId]);

  async function loadVehicules() {
    const { data } = await supabase.from("vehicules").select("*").eq("entreprise_id", entrepriseId);
    if (data) setVehicules(data as Vehicule[]);
  }

  const filtered = vehicules.filter(v => {
    if (search && !`${v.marque} ${v.modele} ${v.immatriculation}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatut && v.statut_affectation !== filterStatut) return false;
    if (filterAbo && v.statut_smartcar !== filterAbo) return false;
    return true;
  });

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Véhicules</h1>
          <p className="mt-1 text-sm text-muted-foreground">Flotte de véhicules électriques</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
          <Plus className="h-4 w-4" /> Ajouter un véhicule
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary">
          <option value="">Tous statuts</option>
          <option value="affecte">Affecté</option>
          <option value="non_affecte">Non affecté</option>
          <option value="archive">Archivé</option>
        </select>
        <select value={filterAbo} onChange={e => setFilterAbo(e.target.value)}
          className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary">
          <option value="">Toutes connexions</option>
          <option value="connecte">Connecté</option>
          <option value="suspendu">Suspendu</option>
          <option value="deconnecte">Déconnecté</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Marque</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Modèle</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">VIN</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Immat</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Abonnement</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Aucun véhicule</td></tr>
              ) : filtered.map(v => (
                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-card-foreground">{v.marque || "—"}</td>
                  <td className="px-6 py-4 text-card-foreground">{v.modele || "—"}</td>
                  <td className="px-6 py-4 font-mono text-xs text-card-foreground">{v.vin || "—"}</td>
                  <td className="px-6 py-4 font-mono text-xs text-card-foreground">{v.immatriculation || "—"}</td>
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
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link to="/dashboard/listes/vehicules/$vehiculeId" params={{ vehiculeId: v.id }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Fiche">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button title="Modifier" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Edit className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
