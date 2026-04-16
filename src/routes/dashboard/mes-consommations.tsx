import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Download } from "lucide-react";

export const Route = createFileRoute("/dashboard/mes-consommations")({
  component: MesConsommationsPage,
  head: () => ({ meta: [{ title: "ChargiZ — Mes consommations" }] }),
});

interface Session {
  id: string;
  jour_semaine: string | null;
  date_debut: string | null;
  energie_kwh: number | null;
  cout_euro: number | null;
  kilometrage: number | null;
}

function MesConsommationsPage() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!profile) return;
    loadSessions();
  }, [profile, dateFrom, dateTo]);

  async function loadSessions() {
    if (!profile) return;
    const { data } = await supabase.from("sessions_recharge").select("id, jour_semaine, date_debut, energie_kwh, cout_euro, kilometrage")
      .eq("collaborateur_id", profile.id)
      .gte("date_debut", dateFrom)
      .lte("date_debut", dateTo + "T23:59:59")
      .order("date_debut", { ascending: false });
    if (data) setSessions(data as Session[]);
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mes consommations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Historique de vos sessions de recharge</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">De</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-transparent text-xs outline-none" />
            <span className="text-xs text-muted-foreground">À</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-transparent text-xs outline-none" />
          </div>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
            <Download className="h-4 w-4" /> Télécharger PDF
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
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Kilométrage</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Énergie rechargée</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Coût</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Aucune session pour cette période</td></tr>
              ) : sessions.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-3 text-card-foreground">{s.jour_semaine || "—"}</td>
                  <td className="px-6 py-3 text-card-foreground">{s.date_debut ? new Date(s.date_debut).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="px-6 py-3 text-right text-card-foreground">{s.kilometrage?.toFixed(1) || "—"}</td>
                  <td className="px-6 py-3 text-right text-card-foreground">{s.energie_kwh?.toFixed(2) || "0"} kWh</td>
                  <td className="px-6 py-3 text-right text-card-foreground">{s.cout_euro?.toFixed(2) || "0"} €</td>
                </tr>
              ))}
            </tbody>
            {sessions.length > 0 && (
              <tfoot>
                <tr className="bg-chargiz-teal/5 font-semibold">
                  <td colSpan={2} className="px-6 py-3 text-card-foreground">Total</td>
                  <td className="px-6 py-3 text-right text-card-foreground">{sessions.reduce((a, s) => a + (s.kilometrage || 0), 0).toFixed(1)} km</td>
                  <td className="px-6 py-3 text-right text-card-foreground">{sessions.reduce((a, s) => a + (s.energie_kwh || 0), 0).toFixed(2)} kWh</td>
                  <td className="px-6 py-3 text-right text-card-foreground">{sessions.reduce((a, s) => a + (s.cout_euro || 0), 0).toFixed(2)} €</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
