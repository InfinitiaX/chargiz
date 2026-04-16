import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import CreateCollaborateurDialog from "@/components/CreateCollaborateurDialog";
import { Plus, Search, Filter } from "lucide-react";

export const Route = createFileRoute("/dashboard/collaborateurs")({
  component: CollaborateursPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Collaborateurs" },
      { name: "description", content: "Gestion des collaborateurs et de leurs recharges." },
    ],
  }),
});

interface Collab {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  site_id: string | null;
  is_active: boolean;
}

function CollaborateursPage() {
  const { profile } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const [collaborateurs, setCollaborateurs] = useState<Collab[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!entrepriseId) return;
    loadCollabs();
  }, [entrepriseId]);

  async function loadCollabs() {
    const { data } = await supabase.from("profiles").select("id, nom, prenom, email, site_id, is_active").eq("entreprise_id", entrepriseId).order("nom");
    if (data) setCollaborateurs(data);
  }

  const filtered = collaborateurs.filter(c =>
    !search || `${c.nom} ${c.prenom} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Collaborateurs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez vos collaborateurs et suivez leurs recharges</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-chargiz-teal-light">
          <Plus className="h-4 w-4" /> Ajouter un collaborateur
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher un collaborateur..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-card-foreground">Collaborateurs</h3>
          <span className="text-sm text-muted-foreground">{filtered.length} résultats</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Aucun collaborateur</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-card-foreground">{c.nom} {c.prenom}</p>
                  </td>
                  <td className="px-6 py-4 text-card-foreground">{c.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-destructive/10 text-destructive"}`}>
                      {c.is_active ? "Actif" : "Révoqué"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link to="/dashboard/collaborateurs/$id" params={{ id: c.id }} className="text-sm font-medium text-primary hover:underline">
                      Voir fiche
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {entrepriseId && (
        <CreateCollaborateurDialog entrepriseId={entrepriseId} open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadCollabs} />
      )}
    </div>
  );
}
