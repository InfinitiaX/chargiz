import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Building2, Users, Car } from "lucide-react";

export const Route = createFileRoute("/dashboard/entreprises")({
  component: EntreprisesPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Entreprises" },
      { name: "description", content: "Gestion des entreprises clientes ChargiZ." },
    ],
  }),
});

const mockEntreprises = [
  { nom: "ACME Corp", siren: "123 456 789", filiales: 3, sites: 8, collaborateurs: 45, vehicules: 38, statut: "Active" },
  { nom: "TechVolt SAS", siren: "987 654 321", filiales: 1, sites: 2, collaborateurs: 12, vehicules: 10, statut: "Active" },
  { nom: "GreenMove", siren: "456 789 123", filiales: 2, sites: 5, collaborateurs: 28, vehicules: 25, statut: "Active" },
  { nom: "ElectraDrive", siren: "321 654 987", filiales: 1, sites: 1, collaborateurs: 6, vehicules: 5, statut: "Archivée" },
];

function EntreprisesPage() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Entreprises</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestion des entreprises clientes</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-chargiz-teal-light">
          <Plus className="h-4 w-4" />
          Créer une entreprise
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher une entreprise..."
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {mockEntreprises.map((e, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">{e.nom}</h3>
                  <p className="text-xs text-muted-foreground font-mono">SIREN {e.siren}</p>
                </div>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                e.statut === "Active"
                  ? "bg-chargiz-teal/10 text-chargiz-teal"
                  : "bg-muted text-muted-foreground"
              }`}>
                {e.statut}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <p className="text-lg font-bold text-card-foreground">{e.filiales}</p>
                <p className="text-xs text-muted-foreground">Filiales</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <p className="text-lg font-bold text-card-foreground">{e.collaborateurs}</p>
                <p className="text-xs text-muted-foreground">Collab.</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Car className="h-3.5 w-3.5" />
                </div>
                <p className="text-lg font-bold text-card-foreground">{e.vehicules}</p>
                <p className="text-xs text-muted-foreground">Véhicules</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
