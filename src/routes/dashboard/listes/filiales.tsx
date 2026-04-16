import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Search, Building2, Eye, Edit, Archive } from "lucide-react";

export const Route = createFileRoute("/dashboard/listes/filiales")({
  component: ListeFiliales,
  head: () => ({ meta: [{ title: "ChargiZ — Filiales" }] }),
});

interface Filiale {
  id: string;
  nom: string;
  adresse: string | null;
  ville: string | null;
  responsable_nom: string | null;
  responsable_prenom: string | null;
  entreprise_id: string;
}

function ListeFiliales() {
  const { profile } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [stats, setStats] = useState<Record<string, { sites: number; collabs: number }>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!entrepriseId) return;
    loadData();
  }, [entrepriseId]);

  async function loadData() {
    const { data } = await supabase.from("filiales").select("id, nom, adresse, ville, responsable_nom, responsable_prenom, entreprise_id").order("nom");
    if (data) {
      setFiliales(data);
      const map: Record<string, { sites: number; collabs: number }> = {};
      for (const f of data) {
        const [s, c] = await Promise.all([
          supabase.from("sites").select("id", { count: "exact" }).eq("filiale_id", f.id),
          supabase.from("profiles").select("id", { count: "exact" }).eq("filiale_id", f.id),
        ]);
        map[f.id] = { sites: s.count || 0, collabs: c.count || 0 };
      }
      setStats(map);
    }
  }

  const filtered = filiales.filter(f => !search || `${f.nom} ${f.ville}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Filiales</h1>
        <p className="mt-1 text-sm text-muted-foreground">Liste des filiales de l'entreprise</p>
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
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Adresse</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Responsable</th>
                <th className="px-6 py-3 text-center font-medium text-muted-foreground">Nb sites</th>
                <th className="px-6 py-3 text-center font-medium text-muted-foreground">Nb collaborateurs</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Aucune filiale</td></tr>
              ) : filtered.map(f => {
                const s = stats[f.id] || { sites: 0, collabs: 0 };
                return (
                  <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-card-foreground">{f.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-card-foreground">{[f.adresse, f.ville].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-6 py-4 text-card-foreground">{[f.responsable_prenom, f.responsable_nom].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-6 py-4 text-center text-card-foreground">{s.sites}</td>
                    <td className="px-6 py-4 text-center text-card-foreground">{s.collabs}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-chargiz-teal/10 px-2.5 py-0.5 text-xs font-medium text-chargiz-teal">Actif</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button title="Voir" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Eye className="h-4 w-4" /></button>
                        <button title="Modifier" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Edit className="h-4 w-4" /></button>
                        <button title="Archiver" className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Archive className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
