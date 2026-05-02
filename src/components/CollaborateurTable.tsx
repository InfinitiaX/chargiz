interface CollabRow {
  nom: string;
  prenom: string;
  email: string;
  site?: string;
  vehicule?: string;
  sessions?: number;
  energie?: string;
  domicile?: string;
  statut: string;
}

interface Props {
  data: CollabRow[];
}

export default function CollaborateurTable({ data }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="text-lg font-semibold text-card-foreground">Collaborateurs</h3>
        <span className="text-sm text-muted-foreground">{data.length} résultats</span>
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
            {data.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Aucun collaborateur</td></tr>
            ) : data.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-card-foreground">{row.nom} {row.prenom}</p>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-card-foreground">{row.site || "—"}</td>
                <td className="px-6 py-4 text-card-foreground">{row.vehicule || "—"}</td>
                <td className="px-6 py-4 text-right text-card-foreground">{row.sessions || 0}</td>
                <td className="px-6 py-4 text-right text-card-foreground">{row.energie || "0 kWh"}</td>
                <td className="px-6 py-4 text-right text-card-foreground">{row.domicile || "0 kWh"}</td>
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
