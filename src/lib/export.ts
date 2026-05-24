// Utilitaires d'export : CSV pour gestionnaires, PDF justificatif premium pour collaborateur
import { toast } from "sonner";

export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || rows.length === 0) {
    toast.warning("Aucune donnée à exporter");
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
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

/**
 * Export XLSX (Excel) natif via SheetJS \u2014 BugID_033.
 * Le fichier .xlsx s'ouvre directement dans Excel/LibreOffice/Numbers
 * avec largeurs auto + en-t\u00EAtes en gras.
 *
 * @param filename Nom du fichier (`.xlsx` ajout\u00E9 auto si absent)
 * @param rows Tableau d'objets \u2014 les cl\u00E9s deviennent les en-t\u00EAtes
 * @param sheetName Nom de l'onglet Excel (d\u00E9faut "Donn\u00E9es")
 */
export async function exportXLSX(
  filename: string,
  rows: Record<string, unknown>[],
  sheetName: string = "Donn\u00E9es",
) {
  if (!rows || rows.length === 0) {
    toast.warning("Aucune donn\u00E9e \u00E0 exporter");
    return;
  }
  try {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows);
    // Largeur auto bas\u00E9e sur la longueur maximale de chaque colonne
    const headers = Object.keys(rows[0]);
    ws["!cols"] = headers.map(h => {
      const maxLen = Math.max(
        h.length,
        ...rows.map(r => {
          const v = r[h];
          return v == null ? 0 : String(v).length;
        }),
      );
      return { wch: Math.min(maxLen + 2, 50) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    const finalName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, finalName);
    toast.success("Export Excel t\u00E9l\u00E9charg\u00E9", { description: finalName, duration: 3500 });
  } catch (err: any) {
    console.error("Export XLSX error:", err);
    toast.error("Export impossible", { description: err.message || "Erreur lors de la g\u00E9n\u00E9ration du fichier Excel." });
  }
}

interface JustificatifData {
  collaborateur: { nom: string; prenom: string; email: string };
  entreprise?: { nom?: string | null } | null;
  vehicule?: { marque?: string | null; modele?: string | null; immatriculation?: string | null; vin?: string | null } | null;
  periode: { from: string; to: string };
  sessions: {
    date_debut: string | null;
    jour_semaine: string | null;
    energie_kwh: number | null;
    cout_euro: number | null;
    kilometrage: number | null;
    is_domicile?: boolean | null;
  }[];
}

export function exportJustificatifPDF(data: JustificatifData) {
  const totalKwh = data.sessions.reduce((a, s) => a + (s.energie_kwh || 0), 0);
  const totalCout = data.sessions.reduce((a, s) => a + (s.cout_euro || 0), 0);
  const totalKm = data.sessions.reduce((a, s) => a + (s.kilometrage || 0), 0);
  const sessionsDomicile = data.sessions.filter(s => s.is_domicile);
  const totalKwhDomicile = sessionsDomicile.reduce((a, s) => a + (s.energie_kwh || 0), 0);
  const totalRemboursable = sessionsDomicile.reduce((a, s) => a + (s.cout_euro || 0), 0);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR");
  const now = new Date().toLocaleString("fr-FR");

  const vehiculeStr = data.vehicule
    ? [data.vehicule.marque, data.vehicule.modele].filter(Boolean).join(" ") + (data.vehicule.immatriculation ? ` — ${data.vehicule.immatriculation}` : "")
    : "";

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" />
<title>Justificatif ChargiZ — ${data.collaborateur.prenom} ${data.collaborateur.nom}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.5; margin: 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 4px solid #225560; margin-bottom: 24px; }
  .header h1 { color: #225560; margin: 0 0 4px; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
  .header .sub { color: #666; font-size: 12px; margin: 0; }
  .brand { text-align: right; }
  .brand .logo { font-size: 28px; font-weight: 900; color: #225560; letter-spacing: -1px; line-height: 1; }
  .brand .logo .accent { background: #DCF763; padding: 0 4px; border-radius: 3px; color: #225560; }
  .brand .tagline { font-size: 9px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
  .infos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .info-card { background: #f5f7f8; border-left: 3px solid #225560; padding: 12px 14px; border-radius: 0 6px 6px 0; }
  .info-card h3 { margin: 0 0 6px; font-size: 10px; color: #225560; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
  .info-card p { margin: 2px 0; font-size: 11px; }
  .info-card strong { color: #225560; }
  .totals-banner { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 20px 0; }
  .total-box { padding: 12px; border-radius: 8px; text-align: center; }
  .total-box.primary { background: #225560; color: white; }
  .total-box.accent { background: #DCF763; color: #225560; }
  .total-box.secondary { background: #f5f7f8; color: #225560; border: 1px solid #e0e4e7; }
  .total-box .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.85; margin-bottom: 4px; }
  .total-box .value { font-size: 20px; font-weight: 800; }
  .total-box .unit { font-size: 11px; font-weight: 600; opacity: 0.9; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #225560; color: white; padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
  th.r, td.r { text-align: right; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 10.5px; }
  tr:nth-child(even) td { background: #fafbfc; }
  .badge-dom { display: inline-block; background: #DCF763; color: #225560; font-size: 9px; padding: 2px 6px; border-radius: 10px; font-weight: 600; margin-left: 4px; }
  .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #666; line-height: 1.6; }
  .footer .signature { margin-top: 20px; display: flex; justify-content: space-between; }
  .footer .sig-block { width: 45%; }
  .footer .sig-line { border-top: 1px solid #999; margin-top: 30px; padding-top: 4px; font-size: 9px; color: #666; text-align: center; }
  @media print { .noprint { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>

<div class="header">
  <div>
    <h1>Justificatif de recharge</h1>
    <p class="sub">Période du <strong>${fmtDate(data.periode.from)}</strong> au <strong>${fmtDate(data.periode.to)}</strong></p>
  </div>
  <div class="brand">
    <div class="logo">Chargi<span class="accent">Z</span></div>
    <div class="tagline">Recharge VE professionnelle</div>
  </div>
</div>

<div class="infos-grid">
  <div class="info-card">
    <h3>Collaborateur</h3>
    <p><strong>${data.collaborateur.prenom} ${data.collaborateur.nom}</strong></p>
    <p>${data.collaborateur.email}</p>
    ${data.entreprise?.nom ? `<p>Entreprise : <strong>${data.entreprise.nom}</strong></p>` : ""}
  </div>
  <div class="info-card">
    <h3>Véhicule</h3>
    ${vehiculeStr ? `<p><strong>${vehiculeStr}</strong></p>` : `<p style="color:#999;font-style:italic">Aucun véhicule affecté</p>`}
    ${data.vehicule?.vin ? `<p style="font-family:monospace;font-size:9.5px">VIN : ${data.vehicule.vin}</p>` : ""}
    <p style="color:#666;font-size:9.5px">Document généré le ${now}</p>
  </div>
</div>

<div class="totals-banner">
  <div class="total-box primary">
    <div class="label">Sessions</div>
    <div class="value">${data.sessions.length}</div>
  </div>
  <div class="total-box secondary">
    <div class="label">Énergie totale</div>
    <div class="value">${totalKwh.toFixed(1)} <span class="unit">kWh</span></div>
  </div>
  <div class="total-box secondary">
    <div class="label">kWh domicile</div>
    <div class="value">${totalKwhDomicile.toFixed(1)} <span class="unit">kWh</span></div>
  </div>
  <div class="total-box accent">
    <div class="label">Remboursable</div>
    <div class="value">${totalRemboursable.toFixed(2)} <span class="unit">€</span></div>
  </div>
</div>

<table>
  <thead><tr>
    <th>Date</th>
    <th>Jour</th>
    <th>Lieu</th>
    <th class="r">Km</th>
    <th class="r">Énergie</th>
    <th class="r">Coût</th>
  </tr></thead>
  <tbody>
    ${data.sessions.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:24px;color:#666;font-style:italic">Aucune session sur cette période</td></tr>` :
      data.sessions.map(s => `<tr>
        <td>${s.date_debut ? fmtDate(s.date_debut) : "—"}</td>
        <td>${s.jour_semaine || "—"}</td>
        <td>${s.is_domicile ? `Domicile<span class="badge-dom">DOM</span>` : "Bureau / Public"}</td>
        <td class="r">${s.kilometrage != null ? s.kilometrage.toFixed(1) : "—"}</td>
        <td class="r">${(s.energie_kwh || 0).toFixed(2)} kWh</td>
        <td class="r">${(s.cout_euro || 0).toFixed(2)} €</td>
      </tr>`).join("")}
  </tbody>
  <tfoot>
    <tr style="background:#225560;color:white;font-weight:700">
      <td colspan="3" style="padding:10px 12px">TOTAL GÉNÉRAL</td>
      <td class="r" style="padding:10px 12px">${totalKm.toFixed(1)} km</td>
      <td class="r" style="padding:10px 12px">${totalKwh.toFixed(2)} kWh</td>
      <td class="r" style="padding:10px 12px">${totalCout.toFixed(2)} €</td>
    </tr>
  </tfoot>
</table>

<div class="footer">
  <p>Ce justificatif est généré automatiquement par la plateforme <strong>ChargiZ</strong> et atteste des sessions de recharge effectuées par le collaborateur sur le véhicule ci-dessus, durant la période indiquée. Les sessions des autres véhicules ou collaborateurs sont exclues. Document à valeur informative pour remboursement employeur.</p>
  <div class="signature">
    <div class="sig-block">
      <div class="sig-line">Signature du collaborateur</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Signature employeur / RH</div>
    </div>
  </div>
</div>

<script>window.onload = () => { setTimeout(() => window.print(), 300); };<\/script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) {
    toast.error("Fenêtre bloquée", {
      description: "Autorisez les pop-ups pour ce site afin de générer le PDF.",
    });
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
