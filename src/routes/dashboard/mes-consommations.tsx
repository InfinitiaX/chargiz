import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Download } from "lucide-react";
import { exportJustificatifPDF, exportXLSX } from "@/lib/export";

export const Route = createFileRoute("/dashboard/mes-consommations")({
  component: MesConsommationsPage,
  head: () => ({ meta: [{ title: "ChargiZ — Mes consommations" }] }),
});

const JOURS_SEMAINE = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

interface Session {
  id: string;
  date_session: string | null;
  energie_kwh: number | null;
  cout_euro: number | null;
  is_domicile: boolean | null;
  vehicule_id: string;
  kilometrage: number | null;
}

interface Vehicule {
  id: string;
  marque: string | null;
  modele: string | null;
  immatriculation: string | null;
  vin: string | null;
}

function MesConsommationsPage() {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [entrepriseNom, setEntrepriseNom] = useState<string>("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!user) return;
    Promise.all([api.vehicules.list(), api.entreprises.list()]).then(([vehicles, entreprises]) => {
      if (vehicles.length > 0) setVehicule(vehicles[0] as Vehicule);
      if (entreprises.length > 0) setEntrepriseNom((entreprises[0] as any).nom);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.sessions.list({ date_from: dateFrom, date_to: dateTo }).then(data =>
      setSessions(data as Session[])
    );
  }, [user, dateFrom, dateTo]);

  const getJour = (dateStr: string | null) =>
    dateStr ? JOURS_SEMAINE[new Date(dateStr).getDay()] : "—";

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Mes consommations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Historique de vos sessions de recharge{vehicule ? ` — ${vehicule.marque} ${vehicule.modele}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">De</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-transparent text-xs outline-none" />
            <span className="text-xs text-muted-foreground">À</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-transparent text-xs outline-none" />
          </div>
          <button
            onClick={() =>
              exportXLSX(
                `ChargiZ_Mes_Consommations_${dateFrom}_${dateTo}`,
                sessions.map(s => ({
                  "Date": s.date_session ? new Date(s.date_session).toLocaleDateString("fr-FR") : "",
                  "Jour": getJour(s.date_session),
                  "Lieu": s.is_domicile ? "Domicile" : "Bureau/Public",
                  "Kilométrage (km)": s.kilometrage ?? "",
                  "Énergie (kWh)": s.energie_kwh ?? "",
                  "Coût (€)": s.cout_euro ?? "",
                })),
                `Sessions ${dateFrom} → ${dateTo}`,
              )
            }
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Download className="h-4 w-4" /> Export Excel
          </button>
          <button
            onClick={() =>
              profile &&
              exportJustificatifPDF({
                collaborateur: { nom: profile.nom, prenom: profile.prenom, email: profile.email },
                entreprise: entrepriseNom ? { nom: entrepriseNom } : null,
                vehicule,
                periode: { from: dateFrom, to: dateTo },
                sessions: sessions.map(s => ({
                  date_debut: s.date_session,
                  jour_semaine: getJour(s.date_session),
                  energie_kwh: s.energie_kwh,
                  cout_euro: s.cout_euro,
                  kilometrage: s.kilometrage ?? null,
                  is_domicile: s.is_domicile,
                })),
              })
            }
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light"
          >
            <Download className="h-4 w-4" /> Justificatif PDF
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Jour</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Lieu</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Kilométrage</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Énergie</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Coût</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Aucune session pour cette période
                  </td>
                </tr>
              ) : (
                sessions.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 text-card-foreground">{getJour(s.date_session)}</td>
                    <td className="px-6 py-3 text-card-foreground">
                      {s.date_session ? new Date(s.date_session).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                          s.is_domicile
                            ? "bg-chargiz-accent/30 text-chargiz-teal"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {s.is_domicile ? "Domicile" : "Bureau / Public"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-card-foreground">
                    {s.kilometrage ? s.kilometrage.toLocaleString("fr-FR") + " km" : <span className="text-muted-foreground text-xs italic">—</span>}
                  </td>
                    <td className="px-6 py-3 text-right text-card-foreground">
                      {s.energie_kwh?.toFixed(2) ?? "0"} kWh
                    </td>
                    <td className="px-6 py-3 text-right text-card-foreground">
                      {s.cout_euro?.toFixed(2) ?? "0"} €
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {sessions.length > 0 && (
              <tfoot>
                <tr className="bg-chargiz-teal/5 font-semibold">
                  <td colSpan={3} className="px-6 py-3 text-card-foreground">Total</td>
                  <td className="px-6 py-3 text-right text-muted-foreground text-xs italic">—</td>
                  <td className="px-6 py-3 text-right text-card-foreground">
                    {sessions.reduce((a, s) => a + (s.energie_kwh || 0), 0).toFixed(2)} kWh
                  </td>
                  <td className="px-6 py-3 text-right text-card-foreground">
                    {sessions.reduce((a, s) => a + (s.cout_euro || 0), 0).toFixed(2)} €
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
