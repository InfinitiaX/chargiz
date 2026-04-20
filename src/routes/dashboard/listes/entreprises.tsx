import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import CreateEntrepriseDialog from "@/components/CreateEntrepriseDialog";
import { Plus, Search, Eye, Archive, Download } from "lucide-react";
import { exportCSV } from "@/lib/export";

export const Route = createFileRoute("/dashboard/listes/entreprises")({
  component: ListeEntreprises,
  head: () => ({ meta: [{ title: "ChargiZ — Entreprises" }] }),
});

interface Entreprise {
  id: string;
  nom: string;
  siren: string | null;
  siret: string | null;
  ville: string | null;
  email: string | null;
  created_at: string;
}

function ListeEntreprises() {
  const { role, loading } = useAuth();
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const canAccess = role === "superadmin" || role === "admin";

  useEffect(() => {
    if (loading || !canAccess) return;
    loadData();
  }, [loading, canAccess]);
  async function loadData() {
    const { data } = await supabase
      .from("entreprises")
      .select("id, nom, siren, siret, ville, email, created_at")
      .order("nom");
    if (data) setEntreprises(data);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <p className="text-muted-foreground">Accès réservé aux SuperAdmin et Admin.</p>
      </div>
    );
  }

  const filtered = entreprises.filter(e =>
    !search || `${e.nom} ${e.siren || ""} ${e.ville || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Entreprises</h1>
          <p className="mt-1 text-sm text-muted-foreground">Liste de toutes les entreprises</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button onClick={() => exportCSV("entreprises", filtered.map(e => ({
            Nom: e.nom, SIREN: e.siren || "", SIRET: e.siret || "", Ville: e.ville || "", Email: e.email || "",
            "Date création": new Date(e.created_at).toLocaleDateString("fr-FR"),
          })))} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Exporter
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
            <Plus className="h-4 w-4" /> Ajouter une entreprise
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">SIREN</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Ville</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date de création</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Aucune entreprise</td></tr>
              ) : filtered.map(e => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-card-foreground">{e.nom}</td>
                  <td className="px-6 py-4 text-card-foreground">{e.siren || "—"}</td>
                  <td className="px-6 py-4 text-card-foreground">{e.ville || "—"}</td>
                  <td className="px-6 py-4 text-card-foreground">{e.email || "—"}</td>
                  <td className="px-6 py-4 text-card-foreground">{new Date(e.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4">
                    <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Voir">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateEntrepriseDialog open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadData} />
    </div>
  );
}
