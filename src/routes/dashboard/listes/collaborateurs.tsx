import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { AlertCircle, Archive, ArchiveRestore, Download, Eye, Plus, Search, Upload, Trash2, Users, X } from "lucide-react";
import CreateCollaborateurDialog from "@/components/CreateCollaborateurDialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import TablePagination from "@/components/TablePagination";
import SortableHeader, { type SortState, compareValues } from "@/components/SortableHeader";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import IconTooltip from "@/components/IconTooltip";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { exportXLSX } from "@/lib/export";
import { normalizeImmat } from "@/lib/immat";
import { toast } from "sonner";

const PAGE_SIZE = 25;

export const Route = createFileRoute("/dashboard/listes/collaborateurs")({
  component: ListeCollaborateurs,
  head: () => ({ meta: [{ title: "ChargiZ — Collaborateurs" }] }),
});

interface Collab {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  is_active: boolean;
  created_at: string;
  entreprise_id: string;
}

interface Vehicule {
  id: string;
  collaborateur_id: string | null;
  immatriculation: string | null;
}

interface Session {
  collaborateur_id: string;
  energie_kwh: number;
  cout_euro: number;
  is_domicile: boolean;
}

interface CollabKpi {
  conso: number | null;
  co2: number | null;
  km: number | null;
}

type SortKey =
  | "prenom" | "nom" | "entreprise" | "immatriculation"
  | "domKwh" | "domEur" | "horsKwh"
  | "km" | "conso" | "co2"
  | "etat";

function ListeCollaborateurs() {
  const { profile, role, loading } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const isSuperadmin = role === "superadmin";
  const [collaborateurs, setCollaborateurs] = useState<Collab[]>([]);
  const [entreprises, setEntreprises] = useState<Map<string, any>>(new Map());
  // Données métier pour les colonnes CDC §6.1.3.3
  const [vehiculesByCollab, setVehiculesByCollab] = useState<Map<string, Vehicule>>(new Map());
  const [sessionsAgg, setSessionsAgg] = useState<Map<string, { domKwh: number; domEur: number; horsKwh: number }>>(new Map());
  const [kpisByCollab, setKpisByCollab] = useState<Map<string, CollabKpi>>(new Map());
  const [search, setSearch] = useState("");
  // BugID_034 — masquer les archivés par défaut, toggle pour les inclure
  const [includeArchived, setIncludeArchived] = useState(false);
  // Filtres organisationnels (filiale/site) + période — alignés sur le dashboard
  const [filiales, setFiliales] = useState<Array<{ id: string; nom: string }>>([]);
  const [sitesList, setSitesList] = useState<Array<{ id: string; nom: string; filiale_id?: string | null }>>([]);
  const [selectedFiliale, setSelectedFiliale] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  // Toggle unité affichage (kWh / €) — n'impacte QUE la colonne "Recharge domicile"
  const [unit, setUnit] = useState<"kwh" | "eur">("kwh");
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  // BugID_032 — rapport d'import detaille (modal)
  const [importReport, setImportReport] = useState<{
    total_rows: number;
    success_count: number;
    error_count: number;
    skipped_count: number;
    created: { row: number; email: string; nom: string; prenom: string }[];
    errors:  { row: number; email: string | null; field: string | null; reason: string }[];
    skipped: { row: number; email: string; reason: string }[];
  } | null>(null);
  /** ID du collaborateur en cours de traitement (archive/unarchive). */
  const [processingId, setProcessingId] = useState<string | null>(null);
  /** Collaborateur ciblé par la suppression — ouvre l'AlertDialog. */
  const [deleteTarget, setDeleteTarget] = useState<Collab | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  /** Tri courant — par défaut nom ascendant */
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "nom", dir: "asc" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    loadData();
  }, [loading, entrepriseId, includeArchived, selectedFiliale, selectedSite, dateFrom, dateTo]);

  // Charge filiales (au montage / changement entreprise) et sites (au changement filiale)
  useEffect(() => {
    if (loading || !entrepriseId) return;
    const qs = new URLSearchParams({ entreprise_id: entrepriseId, active_only: "true" });
    apiFetch<any[]>(`/api/filiales?${qs.toString()}`)
      .then((d) => setFiliales(d.map((f: any) => ({ id: f.id, nom: f.nom }))))
      .catch(() => setFiliales([]));
  }, [loading, entrepriseId]);

  useEffect(() => {
    if (loading) return;
    // Reset le site quand on change de filiale
    setSelectedSite("");
    if (!selectedFiliale) { setSitesList([]); return; }
    const qs = new URLSearchParams({ filiale_id: selectedFiliale, active_only: "true" });
    apiFetch<any[]>(`/api/sites?${qs.toString()}`)
      .then((d) => setSitesList(d.map((s: any) => ({ id: s.id, nom: s.nom, filiale_id: s.filiale_id }))))
      .catch(() => setSitesList([]));
  }, [loading, selectedFiliale]);

  async function loadData() {
    // BugID_034 — par défaut, on demande explicitement active_only=true (archivés masqués) ;
    // le toggle "Inclure archivés" repasse à l'appel non filtré (back-end renvoie tout).
    const qs = new URLSearchParams();
    if (entrepriseId) qs.set("entreprise_id", entrepriseId);
    if (selectedFiliale) qs.set("filiale_id", selectedFiliale);
    if (selectedSite) qs.set("site_id", selectedSite);
    if (!includeArchived) qs.set("active_only", "true");
    const params = qs.toString() ? `?${qs.toString()}` : "";

    // qsRoot — sert pour les listes véhicules/sessions (mêmes filtres organisationnels)
    const qsRoot = new URLSearchParams();
    if (entrepriseId) qsRoot.set("entreprise_id", entrepriseId);
    if (selectedFiliale) qsRoot.set("filiale_id", selectedFiliale);
    if (selectedSite) qsRoot.set("site_id", selectedSite);
    const paramsRoot = qsRoot.toString() ? `?${qsRoot.toString()}` : "";

    const [collabs, ents, vehicules, sessions] = await Promise.all([
      apiFetch<Collab[]>(`/api/collaborateurs${params}`),
      isSuperadmin ? apiFetch<any[]>("/api/entreprises") : Promise.resolve([] as any[]),
      apiFetch<Vehicule[]>(`/api/vehicules${paramsRoot}`).catch(() => [] as Vehicule[]),
      apiFetch<Session[]>(`/api/sessions${paramsRoot}`).catch(() => [] as Session[]),
    ]);

    // Indexe le véhicule de chaque collab (1 véhicule par collab actuellement)
    const vMap = new Map<string, Vehicule>();
    for (const v of vehicules) {
      if (v.collaborateur_id) vMap.set(v.collaborateur_id, v);
    }
    setVehiculesByCollab(vMap);

    // Filtre sessions par période (si plage valide)
    const validRange = dateFrom && dateTo && dateFrom <= dateTo;
    const fromTs = validRange ? `${dateFrom}T00:00:00` : null;
    const toTs   = validRange ? `${dateTo}T23:59:59`   : null;
    const filteredSessions = !validRange ? sessions : sessions.filter((s: any) => {
      const d = s.date_session || s.date_debut;
      return d && d >= fromTs! && d <= toTs!;
    });

    // Agrège les sessions par collab : kWh dom, € dom, kWh hors dom
    const agg = new Map<string, { domKwh: number; domEur: number; horsKwh: number }>();
    for (const s of filteredSessions) {
      const cur = agg.get(s.collaborateur_id) || { domKwh: 0, domEur: 0, horsKwh: 0 };
      if (s.is_domicile) {
        cur.domKwh += s.energie_kwh || 0;
        cur.domEur += s.cout_euro || 0;
      } else {
        cur.horsKwh += s.energie_kwh || 0;
      }
      agg.set(s.collaborateur_id, cur);
    }
    setSessionsAgg(agg);

    // Charge les KPIs serveur (conso moyenne, CO2, dernier km) en parallèle — scopés sur la période
    const kpiQs = validRange ? `?date_from=${dateFrom}&date_to=${dateTo}T23:59:59` : "";
    const kpisResults = await Promise.all(
      collabs.map(async (c) => {
        try {
          const k = await apiFetch<any>(`/api/collaborateurs/${c.id}/kpis${kpiQs}`);
          return [c.id, { conso: k.conso_moyenne_kwh_100km, co2: k.co2_evite_kg, km: k.dernier_km }] as const;
        } catch {
          return [c.id, { conso: null, co2: null, km: null }] as const;
        }
      })
    );
    setKpisByCollab(new Map(kpisResults));
    setCollaborateurs(collabs);
    setEntreprises(new Map((ents || []).map((e: any) => [e.id, e])));
  }

  async function doArchive(collab: Collab) {
    setProcessingId(collab.id);
    try {
      await apiFetch(`/api/collaborateurs/${collab.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: false }),
      });
      toast.warning("Collaborateur archivé", {
        description: `${collab.prenom} ${collab.nom} n'a plus accès à la plateforme.`,
        icon: <Archive className="h-4 w-4 text-amber-500" />,
        duration: 4000,
      });
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Archivage impossible", {
        description: "Une erreur est survenue. Veuillez réessayer.",
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 4000,
      });
    } finally {
      setProcessingId(null);
    }
  }

  function handleArchive(collab: Collab) {
    toast("Archiver le collaborateur ?", {
      description: `${collab.prenom} ${collab.nom} perdra immédiatement ses accès.`,
      icon: <Archive className="h-4 w-4 text-amber-500" />,
      duration: 8000,
      action: { label: "Archiver", onClick: () => doArchive(collab) },
      cancel: { label: "Annuler", onClick: () => {} },
    });
  }

  async function doUnarchive(collab: Collab) {
    setProcessingId(collab.id);
    try {
      await apiFetch(`/api/collaborateurs/${collab.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: true }),
      });
      toast.success("Collaborateur réactivé", {
        description: `${collab.prenom} ${collab.nom} a de nouveau accès à la plateforme.`,
        icon: <ArchiveRestore className="h-4 w-4 text-chargiz-teal" />,
        duration: 4000,
      });
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Réactivation impossible", {
        description: "Une erreur est survenue. Veuillez réessayer.",
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 4000,
      });
    } finally {
      setProcessingId(null);
    }
  }

  function handleUnarchive(collab: Collab) {
    toast("Réactiver le collaborateur ?", {
      description: `${collab.prenom} ${collab.nom} retrouvera l'accès complet.`,
      icon: <ArchiveRestore className="h-4 w-4 text-chargiz-teal" />,
      duration: 8000,
      action: { label: "Réactiver", onClick: () => doUnarchive(collab) },
      cancel: { label: "Annuler", onClick: () => {} },
    });
  }

  async function doDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/collaborateurs/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Collaborateur supprimé", {
        description: `${deleteTarget.prenom} ${deleteTarget.nom} a été supprimé définitivement.`,
        icon: <Trash2 className="h-4 w-4" />,
        duration: 4000,
      });
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Suppression impossible", {
        description: "Une erreur est survenue. Veuillez réessayer.",
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 4000,
      });
    } finally {
      setDeleting(false);
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        // BugID_032 — recupere le rapport detaille
        const report = await apiFetch<any>("/api/collaborateurs/import/csv", {
          method: "POST",
          body: JSON.stringify({ file_content: text }),
        });
        setImportReport(report);
        if (report.success_count > 0) {
          toast.success(`${report.success_count} collaborateur(s) importé(s)`, {
            description: report.message,
          });
          loadData();
        } else {
          toast.error("Aucun collaborateur importé", {
            description: report.message || "Voir le détail des erreurs dans la fenêtre.",
          });
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Erreur d'importation", {
          description: err?.message || "Vérifiez le format du CSV : Nom, Prénom, Email, Téléphone.",
        });
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // BugID_030 — modèle d'import téléchargeable (colonnes attendues par l'API)
  const downloadTemplate = () => {
    const headers = ["Nom", "Prénom", "Email", "Téléphone"];
    const examples = [
      ["Ndiaye", "Awa", "awa.ndiaye@exemple.com", "0612345678"],
      ["Martin", "Paul", "paul.martin@exemple.com", ""],
    ];
    const sep = ";"; // Excel FR ; l'import sniffe automatiquement ; , ou tab
    const lines = [headers.join(sep), ...examples.map((r) => r.join(sep))];
    const csv = "﻿" + lines.join("\r\n"); // BOM UTF-8 pour Excel
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele_import_collaborateurs.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Modèle téléchargé", {
      description: "Colonnes : Nom, Prénom, Email (requis) + Téléphone (optionnel).",
      duration: 4000,
    });
  };

  const filtered = collaborateurs.filter((collab) =>
    !search || `${collab.nom} ${collab.prenom} ${collab.email}`.toLowerCase().includes(search.toLowerCase())
  );

  // Tri par colonne (BugID — Tri par colonne)
  // Valeur de tri par défaut : nom alphabétique ascendant
  const getSortValue = (c: Collab, key: SortKey): string | number | null => {
    const veh = vehiculesByCollab.get(c.id);
    const sess = sessionsAgg.get(c.id) || { domKwh: 0, domEur: 0, horsKwh: 0 };
    const kpi = kpisByCollab.get(c.id) || { conso: null, co2: null, km: null };
    switch (key) {
      case "prenom": return c.prenom || "";
      case "nom": return c.nom || "";
      case "entreprise": return entreprises.get(c.entreprise_id)?.nom || "";
      case "immatriculation": return veh?.immatriculation || "";
      case "domKwh": return sess.domKwh;
      case "domEur": return sess.domEur;
      case "horsKwh": return sess.horsKwh;
      case "km": return kpi.km;
      case "conso": return kpi.conso;
      case "co2": return kpi.co2;
      case "etat": return c.is_active ? "1-actif" : "2-archive"; // tri logique : actifs en premier
      default: return null;
    }
  };
  const sorted = [...filtered].sort((a, b) => {
    if (!sort.key) return 0;
    return compareValues(getSortValue(a, sort.key), getSortValue(b, sort.key), sort.dir);
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  if (loading) {
    return <PageSkeleton kpiCount={0} rowCount={8} />;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Collaborateurs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez vos équipes et leurs accès</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          <button onClick={downloadTemplate} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Télécharger le modèle
          </button>
          <button onClick={handleImportClick} disabled={importing} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
            <Upload className="h-4 w-4" /> {importing ? "Import..." : "Importer CSV"}
          </button>
          <button onClick={() => exportXLSX("ChargiZ_Collaborateurs", filtered.map((collab) => {
            const v = vehiculesByCollab.get(collab.id);
            const sess = sessionsAgg.get(collab.id) || { domKwh: 0, domEur: 0, horsKwh: 0 };
            const kpi = kpisByCollab.get(collab.id) || { conso: null, co2: null, km: null };
            return {
              "Prénom": collab.prenom,
              "Nom": collab.nom,
              "Email": collab.email,
              "Téléphone": collab.telephone || "",
              "Immatriculation": v?.immatriculation || "—",
              "Rech. Dom (kWh)": Number(sess.domKwh.toFixed(2)),
              "Rech. Dom (€)": Number(sess.domEur.toFixed(2)),
              "Rech. Hors (kWh)": Number(sess.horsKwh.toFixed(2)),
              "Km": kpi.km != null ? Number(kpi.km.toFixed(0)) : "—",
              "Conso. moy. (kWh/100km)": kpi.conso != null ? Number(kpi.conso.toFixed(1)) : "—",
              "CO₂ évité (kg)": kpi.co2 != null ? Number(kpi.co2.toFixed(0)) : "—",
              "État": collab.is_active ? "Actif" : "Archivé",
              "Date création": new Date(collab.created_at).toLocaleDateString("fr-FR"),
            };
          }), "Collaborateurs")} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Export Excel
          </button>
          {entrepriseId && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
              <Plus className="h-4 w-4" /> Ajouter un collaborateur
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, email..."
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none shadow-sm transition-all hover:border-[#0f4b49]/40 focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20"
          />
        </div>

        {/* Filiale */}
        <select
          value={selectedFiliale}
          onChange={(e) => { setSelectedFiliale(e.target.value); setPage(1); }}
          className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm transition-all hover:border-[#0f4b49]/40 focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20"
        >
          <option value="">Toutes les filiales</option>
          {filiales.map((f) => (
            <option key={f.id} value={f.id}>{f.nom}</option>
          ))}
        </select>

        {/* Site (visible seulement si une filiale est choisie) */}
        <select
          value={selectedSite}
          onChange={(e) => { setSelectedSite(e.target.value); setPage(1); }}
          disabled={!selectedFiliale}
          className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm transition-all hover:border-[#0f4b49]/40 focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
        >
          <option value="">{selectedFiliale ? "Tous les sites" : "Choisir une filiale"}</option>
          {sitesList.map((s) => (
            <option key={s.id} value={s.id}>{s.nom}</option>
          ))}
        </select>

        {/* Période */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => {
              const v = e.target.value;
              setDateFrom(v);
              if (v && dateTo && v > dateTo) setDateTo(v);
              setPage(1);
            }}
            className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm transition-all hover:border-[#0f4b49]/40 focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => {
              const v = e.target.value;
              setDateTo(v);
              if (v && dateFrom && v < dateFrom) setDateFrom(v);
              setPage(1);
            }}
            className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm transition-all hover:border-[#0f4b49]/40 focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20"
          />
        </div>

        {/* Toggle unité kWh / € — n'impacte QUE la colonne Recharge domicile */}
        <div className="inline-flex overflow-hidden rounded-lg border border-border bg-card">
          <button
            type="button"
            onClick={() => setUnit("kwh")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${unit === "kwh" ? "bg-chargiz-teal text-white" : "text-foreground hover:bg-muted"}`}
          >
            kWh
          </button>
          <button
            type="button"
            onClick={() => setUnit("eur")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${unit === "eur" ? "bg-chargiz-teal text-white" : "text-foreground hover:bg-muted"}`}
          >
            €
          </button>
        </div>

        {/* BugID_034 — Toggle "Inclure archivés" (masqués par défaut) */}
        <label className="inline-flex select-none items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => { setIncludeArchived(e.target.checked); setPage(1); }}
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary/30"
          />
          <Archive className="h-4 w-4 text-muted-foreground" />
          <span>Inclure archivés</span>
        </label>
      </div>

      {/* ─── Tableau simplifié : exactement ces 7 colonnes (CDC + maquette) ─── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="text-sm cz-table-collab" style={{ width: "100%" }}>
            <thead className="cz-table-head">
              <tr className="whitespace-nowrap bg-[#0f4b49] text-white">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Prénom</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Nom</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Immat.</th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">Recharge domicile</th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">Recharge hors domicile</th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">Kilométrage</th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">Consommation moyenne</th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">CO₂ évité</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={Users}
                      title={search ? "Aucun résultat" : "Aucun collaborateur"}
                      description={search ? "Essayez d'autres mots-clés ou réinitialisez la recherche." : "Ajoutez votre premier collaborateur pour commencer le suivi de recharge."}
                      action={!search && entrepriseId ? (
                        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
                          <Plus className="h-4 w-4" /> Ajouter un collaborateur
                        </button>
                      ) : undefined}
                    />
                  </td>
                </tr>
              ) : paginated.map((collab, rowIdx) => {
                const sess = sessionsAgg.get(collab.id) || { domKwh: 0, domEur: 0, horsKwh: 0 };
                const kpi = kpisByCollab.get(collab.id) || { conso: null, co2: null, km: null };
                const veh = vehiculesByCollab.get(collab.id);
                const fmt0 = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
                const fmt1 = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                const fmt2 = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return (
                  <tr
                    key={collab.id}
                    className={`border-b border-border/60 last:border-0 cursor-pointer whitespace-nowrap transition-colors hover:bg-[#0f4b49]/[0.07] ${rowIdx % 2 === 1 ? "bg-[#0f4b49]/[0.03]" : "bg-card"} ${collab.is_active ? "" : "opacity-60"}`}
                    onClick={() => { window.location.href = `/dashboard/collaborateur/${collab.id}`; }}
                  >
                    <td className="px-6 py-4 text-left font-medium text-card-foreground">{collab.prenom}</td>
                    <td className="px-6 py-4 text-left text-card-foreground">{collab.nom}</td>
                    <td className="px-6 py-4 text-left">
                      {veh?.immatriculation ? (
                        <span className="inline-flex items-center rounded-md bg-[#0f4b49]/10 px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-[#0f4b49]">
                          {normalizeImmat(veh.immatriculation)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center tabular-nums text-card-foreground">
                      {unit === "kwh" ? `${fmt0(sess.domKwh)} kWh` : `${fmt2(sess.domEur)} €`}
                    </td>
                    <td className="px-6 py-4 text-center tabular-nums text-card-foreground">{`${fmt0(sess.horsKwh)} kWh`}</td>
                    <td className="px-6 py-4 text-center tabular-nums text-card-foreground">{kpi.km != null ? `${fmt0(kpi.km)} km` : "—"}</td>
                    <td className="px-6 py-4 text-center tabular-nums text-card-foreground">{kpi.conso != null ? `${fmt1(kpi.conso)} kWh/100km` : "—"}</td>
                    <td className="px-6 py-4 text-center tabular-nums text-card-foreground">{kpi.co2 != null ? `${fmt1(kpi.co2 / 1000)} t` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {entrepriseId && (
        <CreateCollaborateurDialog entrepriseId={entrepriseId} open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadData} />
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={deleteTarget ? `Supprimer ${deleteTarget.prenom} ${deleteTarget.nom} ?` : ""}
        description="Cette action est irréversible. Toutes les données associées (véhicule, sessions, compte) seront définitivement perdues."
        onConfirm={doDelete}
        loading={deleting}
      />

      {/* BugID_032 — Rapport d'import detaille */}
      {importReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-card shadow-2xl border border-border max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-card-foreground">Rapport d'import CSV</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{importReport.message}</p>
              </div>
              <button onClick={() => setImportReport(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cartes synthèse */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-border">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total lignes</p>
                <p className="mt-1 text-xl font-semibold text-card-foreground">{importReport.total_rows}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-xs text-emerald-700">Créés</p>
                <p className="mt-1 text-xl font-semibold text-emerald-700">{importReport.success_count}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-xs text-red-700">Erreurs</p>
                <p className="mt-1 text-xl font-semibold text-red-700">{importReport.error_count}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-xs text-amber-700">Ignorés</p>
                <p className="mt-1 text-xl font-semibold text-amber-700">{importReport.skipped_count}</p>
              </div>
            </div>

            {/* Liste détaillée scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {importReport.errors.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-700 mb-2">❌ Erreurs ({importReport.errors.length})</h3>
                  <div className="rounded-lg border border-red-200 bg-red-50/50 divide-y divide-red-200">
                    {importReport.errors.map((e, i) => (
                      <div key={i} className="px-3 py-2 text-xs flex items-start gap-2">
                        <span className="font-mono text-red-700 shrink-0">Ligne&nbsp;{e.row}</span>
                        <span className="text-card-foreground">{e.email || "—"}</span>
                        <span className="ml-auto text-red-700 font-medium">{e.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importReport.skipped.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-amber-700 mb-2">⚠ Ignorés ({importReport.skipped.length})</h3>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 divide-y divide-amber-200">
                    {importReport.skipped.map((s, i) => (
                      <div key={i} className="px-3 py-2 text-xs flex items-start gap-2">
                        <span className="font-mono text-amber-700 shrink-0">Ligne&nbsp;{s.row}</span>
                        <span className="text-card-foreground">{s.email}</span>
                        <span className="ml-auto text-amber-700 font-medium">{s.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importReport.created.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-emerald-700 mb-2">✅ Créés ({importReport.created.length})</h3>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 divide-y divide-emerald-200">
                    {importReport.created.map((c, i) => (
                      <div key={i} className="px-3 py-2 text-xs flex items-start gap-2">
                        <span className="font-mono text-emerald-700 shrink-0">Ligne&nbsp;{c.row}</span>
                        <span className="text-card-foreground">{c.prenom} {c.nom}</span>
                        <span className="ml-auto text-emerald-700">{c.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pied de modal */}
            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border">
              <button
                onClick={() => setImportReport(null)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-95"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
