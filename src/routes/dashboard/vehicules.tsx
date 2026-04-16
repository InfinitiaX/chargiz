import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Filter, Car } from "lucide-react";

export const Route = createFileRoute("/dashboard/vehicules")({
  component: VehiculesPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Véhicules" },
      { name: "description", content: "Gestion de la flotte de véhicules électriques." },
    ],
  }),
});

const mockVehicles = [
  { marque: "Tesla", modele: "Model 3", immat: "AB-123-CD", collaborateur: "Marie Dupont", batterie: "60 kWh", statut: "Connecté", abonnement: "Actif" },
  { marque: "Renault", modele: "Megane E-Tech", immat: "EF-456-GH", collaborateur: "Julien Martin", batterie: "60 kWh", statut: "Connecté", abonnement: "Actif" },
  { marque: "Peugeot", modele: "e-208", immat: "IJ-789-KL", collaborateur: "Sophie Bernard", batterie: "50 kWh", statut: "Déconnecté", abonnement: "Actif" },
  { marque: "BMW", modele: "iX1", immat: "MN-012-OP", collaborateur: "Thomas Petit", batterie: "64.7 kWh", statut: "Connecté", abonnement: "Suspendu" },
  { marque: "Tesla", modele: "Model Y", immat: "QR-345-ST", collaborateur: "Camille Moreau", batterie: "75 kWh", statut: "Connecté", abonnement: "Actif" },
];

function VehiculesPage() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Véhicules</h1>
          <p className="mt-1 text-sm text-muted-foreground">Flotte de véhicules électriques enregistrés</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-chargiz-teal-light">
          <Plus className="h-4 w-4" />
          Ajouter un véhicule
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un véhicule..."
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
          <Filter className="h-4 w-4" />
          Filtres
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Véhicule</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Immatriculation</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Collaborateur</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Batterie</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Smartcar</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Abonnement</th>
              </tr>
            </thead>
            <tbody>
              {mockVehicles.map((v, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Car className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-card-foreground">{v.marque}</p>
                        <p className="text-xs text-muted-foreground">{v.modele}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-card-foreground">{v.immat}</td>
                  <td className="px-6 py-4 text-card-foreground">{v.collaborateur}</td>
                  <td className="px-6 py-4 text-card-foreground">{v.batterie}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      v.statut === "Connecté" ? "text-chargiz-teal" : "text-muted-foreground"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        v.statut === "Connecté" ? "bg-chargiz-teal" : "bg-muted-foreground"
                      }`} />
                      {v.statut}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      v.abonnement === "Actif"
                        ? "bg-chargiz-teal/10 text-chargiz-teal"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {v.abonnement}
                    </span>
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
