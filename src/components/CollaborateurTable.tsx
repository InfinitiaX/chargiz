const mockData = [
  { nom: "Dupont", prenom: "Marie", email: "marie.dupont@acme.fr", site: "Paris HQ", vehicule: "Tesla Model 3", sessions: 24, energie: "312 kWh", domicile: "280 kWh", statut: "Actif" },
  { nom: "Martin", prenom: "Julien", email: "j.martin@acme.fr", site: "Lyon", vehicule: "Renault Megane E-Tech", sessions: 18, energie: "198 kWh", domicile: "175 kWh", statut: "Actif" },
  { nom: "Bernard", prenom: "Sophie", email: "s.bernard@acme.fr", site: "Paris HQ", vehicule: "Peugeot e-208", sessions: 31, energie: "405 kWh", domicile: "390 kWh", statut: "Actif" },
  { nom: "Petit", prenom: "Thomas", email: "t.petit@acme.fr", site: "Marseille", vehicule: "BMW iX1", sessions: 12, energie: "156 kWh", domicile: "120 kWh", statut: "Suspendu" },
  { nom: "Moreau", prenom: "Camille", email: "c.moreau@acme.fr", site: "Lyon", vehicule: "Tesla Model Y", sessions: 22, energie: "290 kWh", domicile: "265 kWh", statut: "Actif" },
];

export default function CollaborateurTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="text-lg font-semibold text-card-foreground">Collaborateurs</h3>
        <span className="text-sm text-muted-foreground">{mockData.length} résultats</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Site</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Véhicule</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Sessions</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Énergie</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Domicile</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Statut</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-card-foreground">{row.nom} {row.prenom}</p>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-card-foreground">{row.site}</td>
                <td className="px-6 py-4 text-card-foreground">{row.vehicule}</td>
                <td className="px-6 py-4 text-right text-card-foreground">{row.sessions}</td>
                <td className="px-6 py-4 text-right text-card-foreground">{row.energie}</td>
                <td className="px-6 py-4 text-right text-card-foreground">{row.domicile}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    row.statut === "Actif"
                      ? "bg-chargiz-teal/10 text-chargiz-teal"
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {row.statut}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
