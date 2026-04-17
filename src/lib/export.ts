// Utilitaires d'export : CSV pour gestionnaires, PDF justificatif pour collaborateur

export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || rows.length === 0) {
    alert("Aucune donnée à exporter");
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    if (val === null || val === undefined) return "";
    const s = String(val).replace(/"/g, '""');
    return /[",;\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [
    headers.join(";"),
    ...rows.map(r => headers.map(h => escape(r[h])).join(";")),
  ].join("\n");
  // BOM pour Excel/UTF-8
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

interface JustificatifData {
  collaborateur: { nom: string; prenom: string; email: string };
  entreprise?: { nom?: string | null } | null;
  periode: { from: string; to: string };
  sessions: {
    date_debut: string | null;
    jour_semaine: string | null;
    energie_kwh: number | null;
    cout_euro: number | null;
    kilometrage: number | null;
  }[];
}

export function exportJustificatifPDF(data: JustificatifData) {
  const totalKwh = data.sessions.reduce((a, s) => a + (s.energie_kwh || 0), 0);
  const totalCout = data.sessions.reduce((a, s) => a + (s.cout_euro || 0), 0);
  const totalKm = data.sessions.reduce((a, s) => a + (s.kilometrage || 0), 0);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR");
  const now = new Date().toLocaleString("fr-FR");

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" />
<title>Justificatif de recharge — ${data.collaborateur.prenom} ${data.collaborateur.nom}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: Inter, Arial, sans-serif; color: #1a1a1a; font-size: 12px; }
  h1 { color: #225560; margin: 0 0 4px; font-size: 22px; }
  .sub { color: #666; margin-bottom: 24px; }
  .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 3px solid #225560; padding-bottom: 12px; margin-bottom: 20px; }
  .brand { font-size: 24px; font-weight: bold; color: #225560; }
  .brand small { display:block; font-size:10px; color:#666; font-weight:normal; }
  .infos { background:#f5f7f8; padding:12px 16px; border-radius:8px; margin-bottom:20px; }
  .infos p { margin: 2px 0; }
  table { width:100%; border-collapse:collapse; margin-top:8px; }
  th, td { padding:8px 10px; text-align:left; border-bottom:1px solid #e5e7eb; }
  th { background:#225560; color:white; font-weight:600; font-size:11px; }
  td.r, th.r { text-align:right; }
  tfoot td { background:#DCF763; font-weight:bold; border-top:2px solid #225560; }
  .footer { margin-top:30px; font-size:10px; color:#666; border-top:1px solid #e5e7eb; padding-top:12px; }
  @media print { .noprint { display:none; } }
</style></head><body>
<div class="header">
  <div>
    <h1>Justificatif de recharge</h1>
    <div class="sub">Période du ${fmtDate(data.periode.from)} au ${fmtDate(data.periode.to)}</div>
  </div>
  <div class="brand">ChargiZ<small>Recharge VE professionnelle</small></div>
</div>
<div class="infos">
  <p><strong>Collaborateur :</strong> ${data.collaborateur.prenom} ${data.collaborateur.nom}</p>
  <p><strong>Email :</strong> ${data.collaborateur.email}</p>
  ${data.entreprise?.nom ? `<p><strong>Entreprise :</strong> ${data.entreprise.nom}</p>` : ""}
  <p><strong>Document généré le :</strong> ${now}</p>
</div>
<table>
  <thead><tr>
    <th>Date</th><th>Jour</th>
    <th class="r">Kilométrage</th>
    <th class="r">Énergie (kWh)</th>
    <th class="r">Coût (€)</th>
  </tr></thead>
  <tbody>
    ${data.sessions.length === 0 ? `<tr><td colspan="5" style="text-align:center;padding:20px;color:#666">Aucune session sur cette période</td></tr>` :
      data.sessions.map(s => `<tr>
        <td>${s.date_debut ? fmtDate(s.date_debut) : "—"}</td>
        <td>${s.jour_semaine || "—"}</td>
        <td class="r">${s.kilometrage?.toFixed(1) ?? "—"}</td>
        <td class="r">${(s.energie_kwh || 0).toFixed(2)}</td>
        <td class="r">${(s.cout_euro || 0).toFixed(2)}</td>
      </tr>`).join("")}
  </tbody>
  <tfoot><tr>
    <td colspan="2">TOTAL</td>
    <td class="r">${totalKm.toFixed(1)} km</td>
    <td class="r">${totalKwh.toFixed(2)} kWh</td>
    <td class="r">${totalCout.toFixed(2)} €</td>
  </tr></tfoot>
</table>
<div class="footer">
  Ce justificatif est généré automatiquement par la plateforme ChargiZ et atteste des sessions de recharge effectuées par le collaborateur durant la période indiquée. Document à valeur informative pour remboursement employeur.
</div>
<script>window.onload = () => { setTimeout(() => window.print(), 300); };<\/script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) {
    alert("Impossible d'ouvrir la fenêtre d'impression. Autorisez les pop-ups.");
    return;
  }
  w.document.write(html);
  w.document.close();
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
