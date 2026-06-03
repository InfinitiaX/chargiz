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

/**
 * Génère et télécharge un justificatif PDF directement (sans ouvrir la fenêtre
 * d'impression du navigateur). Utilise jsPDF + autotable, chargés dynamiquement.
 * BugID — Le bouton "Justificatif PDF" sur Mes Consommations doit télécharger
 * un fichier `.pdf` avec nom explicite `Recap_<nom>_<prenom>_<periode>.pdf`.
 */
export async function exportJustificatifPDF(data: JustificatifData) {
  try {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    // ── Helpers format FR — ASCII-safe pour jsPDF (Latin-1 uniquement) ─────
    // toLocaleString("fr-FR") insère U+202F (espace fine insécable) absent de
    // la police helvetica de jsPDF → rendu cassé. On formate à la main.
    const nf = (n: number, dec = 0): string => {
      const v = Number.isFinite(n) ? n : 0;
      const s = Math.abs(v).toFixed(dec);
      const [intPart, fracPart] = s.split(".");
      const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      const sign = v < 0 ? "-" : "";
      return fracPart ? `${sign}${grouped},${fracPart}` : `${sign}${grouped}`;
    };
    const fmt0 = (n: number) => nf(n, 0);
    const fmt2 = (n: number) => nf(n, 2);
    const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("fr-FR") : "-";

    const totalKwh = data.sessions.reduce((a, s) => a + (s.energie_kwh || 0), 0);
    const totalCout = data.sessions.reduce((a, s) => a + (s.cout_euro || 0), 0);
    const totalKm = data.sessions.reduce((a, s) => a + (s.kilometrage || 0), 0);
    const sessionsDomicile = data.sessions.filter(s => s.is_domicile);
    const totalKwhDomicile = sessionsDomicile.reduce((a, s) => a + (s.energie_kwh || 0), 0);
    const totalRemboursable = sessionsDomicile.reduce((a, s) => a + (s.cout_euro || 0), 0);
    const now = new Date().toLocaleDateString("fr-FR");

    const vehiculeStr = data.vehicule
      ? [data.vehicule.marque, data.vehicule.modele].filter(Boolean).join(" ") + (data.vehicule.immatriculation ? ` - ${data.vehicule.immatriculation}` : "")
      : "";

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const periodeLabel = `${fmtDate(data.periode.from)} au ${fmtDate(data.periode.to)}`;

    // Couleurs CDC §8.2
    const BRAND_TEAL: [number, number, number] = [34, 85, 96];
    const BRAND_DARK: [number, number, number] = [15, 23, 42];
    const BRAND_MUTED: [number, number, number] = [107, 114, 128];

    // ── Header bandeau ───────────────────────────────────────────────────
    doc.setFillColor(...BRAND_TEAL);
    doc.rect(0, 0, W, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("ChargiZ", 14, 13);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Justificatif de recharge", 14, 19);
    doc.setFontSize(8);
    doc.text(`Édité le ${now}`, W - 14, 13, { align: "right" });

    // ── Bloc identité collab + véhicule ──────────────────────────────────
    doc.setTextColor(...BRAND_DARK);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(`${data.collaborateur.prenom} ${data.collaborateur.nom}`, 14, 38);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND_MUTED);
    doc.text(data.collaborateur.email, 14, 44);
    if (data.entreprise?.nom) doc.text(`Entreprise : ${data.entreprise.nom}`, 14, 49);
    doc.text(`Période : ${periodeLabel}`, 14, 54);

    if (vehiculeStr) {
      doc.setTextColor(...BRAND_DARK);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Véhicule", W - 14, 44, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_MUTED);
      doc.text(vehiculeStr, W - 14, 49, { align: "right" });
      if (data.vehicule?.vin) doc.text(`VIN : ${data.vehicule.vin}`, W - 14, 54, { align: "right" });
    }

    // ── Bandeau totaux (4 cartes uniformes) ──────────────────────────────
    autoTable(doc, {
      startY: 62,
      head: [["Sessions", "Énergie totale", "kWh domicile", "Remboursable"]],
      body: [[
        fmt0(data.sessions.length),
        `${fmt2(totalKwh)} kWh`,
        `${fmt2(totalKwhDomicile)} kWh`,
        `${fmt2(totalRemboursable)} €`,
      ]],
      theme: "grid",
      headStyles: {
        fillColor: BRAND_TEAL,
        textColor: [255, 255, 255],
        halign: "center",
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: { halign: "center", fontStyle: "bold", fontSize: 12, textColor: BRAND_DARK },
      styles: { cellPadding: 4, lineColor: [226, 232, 224] },
      margin: { left: 14, right: 14 },
    });

    // ── Tableau sessions — colonnes strictement alignées ─────────────────
    const finalY = (doc as any).lastAutoTable?.finalY ?? 110;

    if (data.sessions.length === 0) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 224);
      doc.rect(14, finalY + 8, W - 28, 22, "FD");
      doc.setTextColor(...BRAND_MUTED);
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text(
        "Aucune session de recharge sur la période sélectionnée.",
        W / 2, finalY + 22, { align: "center" }
      );
    } else {
      autoTable(doc, {
        startY: finalY + 8,
        head: [["Date", "Jour", "Lieu", "Km", "Énergie (kWh)", "Coût (€)"]],
        body: data.sessions.map(s => [
          fmtDate(s.date_debut),
          s.jour_semaine || "-",
          s.is_domicile ? "Domicile" : "Hors domicile",
          s.kilometrage != null ? fmt0(s.kilometrage) : "-",
          fmt2(s.energie_kwh || 0),
          fmt2(s.cout_euro || 0),
        ]),
        foot: [[
          { content: "TOTAL", colSpan: 3, styles: { halign: "left", fontStyle: "bold" } },
          { content: fmt0(totalKm),  styles: { halign: "right", fontStyle: "bold" } },
          { content: fmt2(totalKwh), styles: { halign: "right", fontStyle: "bold" } },
          { content: fmt2(totalCout),styles: { halign: "right", fontStyle: "bold" } },
        ]],
        theme: "striped",
        headStyles: {
          fillColor: [50, 50, 80],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
        },
        bodyStyles: { fontSize: 9, textColor: BRAND_DARK },
        footStyles: {
          fillColor: BRAND_TEAL,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
        },
        columnStyles: {
          0: { halign: "left",  cellWidth: 26 },
          1: { halign: "left",  cellWidth: 14 },
          2: { halign: "left",  cellWidth: 32 },
          3: { halign: "right", cellWidth: 22 },
          4: { halign: "right", cellWidth: 36 },
          5: { halign: "right", cellWidth: 26 },
        },
        didParseCell: (cellData) => {
          // Force l'alignement de l'en-tête à correspondre à la colonne :
          // les 3 dernières colonnes (numériques) doivent être right-aligned,
          // les 3 premières left-aligned. Sans cette règle jsPDF centre par défaut.
          if (cellData.section === "head") {
            cellData.cell.styles.halign = cellData.column.index >= 3 ? "right" : "left";
          }
        },
        styles: { cellPadding: { top: 2, right: 3, bottom: 2, left: 3 }, lineColor: [226, 232, 224] },
        margin: { left: 14, right: 14 },
      });
    }

    // ── Mention légale + footer pagination ───────────────────────────────
    const finalY2 = (doc as any).lastAutoTable?.finalY ?? 200;
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_MUTED);
    doc.setFont("helvetica", "italic");
    const footerText = "Ce justificatif est généré automatiquement par la plateforme ChargiZ et atteste des sessions de recharge effectuées par le collaborateur sur le véhicule ci-dessus, durant la période indiquée. Document à valeur informative pour remboursement employeur.";
    const lines = doc.splitTextToSize(footerText, W - 28);
    doc.text(lines, 14, finalY2 + 10);

    const pageCount = (doc as any).internal.getNumberOfPages?.() ?? 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(...BRAND_MUTED);
      doc.setFont("helvetica", "normal");
      doc.text("ChargiZ - Justificatif de recharge", 14, H - 8);
      doc.text(`Page ${i} / ${pageCount}`, W - 14, H - 8, { align: "right" });
    }

    // Nom de fichier explicite
    const slug = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
    const periodeSlug = `${data.periode.from}_${data.periode.to}`;
    const fileName = `Recap_${slug(data.collaborateur.nom)}_${slug(data.collaborateur.prenom)}_${periodeSlug}.pdf`;
    doc.save(fileName);
    toast.success("Justificatif téléchargé", { description: fileName, duration: 3500 });
  } catch (err: any) {
    console.error("Justificatif PDF error:", err);
    toast.error("Téléchargement impossible", { description: err.message || "Erreur lors de la génération du PDF." });
  }
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
