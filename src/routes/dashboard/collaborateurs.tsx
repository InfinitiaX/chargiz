import { createFileRoute } from "@tanstack/react-router";
import CollaborateurTable from "@/components/CollaborateurTable";
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

function CollaborateursPage() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Collaborateurs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez vos collaborateurs et suivez leurs recharges</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-chargiz-teal-light">
          <Plus className="h-4 w-4" />
          Ajouter un collaborateur
        </button>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un collaborateur..."
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
          <Filter className="h-4 w-4" />
          Filtres
        </button>
      </div>

      <CollaborateurTable />
    </div>
  );
}
