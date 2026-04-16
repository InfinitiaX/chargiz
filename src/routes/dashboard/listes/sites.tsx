import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Search, MapPin, Eye, Edit, Archive } from "lucide-react";

export const Route = createFileRoute("/dashboard/listes/sites")({
  component: ListeSites,
  head: () => ({ meta: [{ title: "ChargiZ — Sites" }] }),
});

interface Site {
  id: string;
  nom: string;
  adresse: string | null;
  ville: string | null;
  responsable_nom: string | null;
  responsable_prenom: string | null;
  filiale_id: string;
}

function ListeSites() {
  const { profile } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const [sites, setSites] = useState<Site[]>([]);
  const [filiales, setFiliales] = useState<Record<string, string>>({});
  const [collabCounts, setCollabCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!entrepriseId) return;
    loadData();
  }, [entrepriseId]);

  async function loadData() {
    const { data: fil } = await supabase.from("filiales").select("id, nom").eq("entreprise_id", entrepriseId);
    const filMap: Record<string, string> = {};
    if (fil) fil.forEach(f => { filMap[f.id] = f.nom; });
    setFiliales(filMap);

    const filialeIds = Object.keys(filMap);
    if (filialeIds.length === 0) return;

    const { data } = await supabase.from("sites").select("id, nom, adresse, ville, responsable_nom, responsable_prenom, filiale_id").in("filiale_id", filialeIds).order("nom");
    if (data) {
      setSites(data);
      const counts: Record<string, number> = {};
      for (const s of data) {
        const { count } = await supabase.from("profiles").select("id", { count: "exact" }).eq("site_id", s.id);
        counts[s.id] = count || 0;
      }
      setCollabCounts(counts);
    }
  }

  const filtered = sites.filter(s => !search || `${s.nom} ${s.ville}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sites</h1>
        <p className="mt-1 text-sm text-muted-foreground">Liste des sites de l'entreprise</p>
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
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Filiale</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Adresse</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Responsable</th>
                <th className="px-6 py-3 text-center font-medium text-muted-foreground">Nb collaborateurs</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Aucun site</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-card-foreground">{s.nom}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-card-foreground">{filiales[s.filiale_id] || "—"}</td>
                  <td className="px-6 py-4 text-card-foreground">{[s.adresse, s.ville].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-6 py-4 text-card-foreground">{[s.responsable_prenom, s.responsable_nom].filter(Boolean).join(" ") || "—"}</td>
                  <td className="px-6 py-4 text-center text-card-foreground">{collabCounts[s.id] || 0}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
