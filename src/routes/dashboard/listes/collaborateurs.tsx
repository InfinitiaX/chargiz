import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { AlertCircle, Archive, ArchiveRestore, Download, Eye, Plus, Search, Upload, Trash2, Users } from "lucide-react";
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
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<{ created: number; skipped: number; errors: { ligne: number; email: string; raison: string }[] } | null>(null);
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
  }, [loading, entrepriseId, includeArchived]);

  async function loadData() {
    // BugID_034 — par défaut, on demande explicitement active_only=true (archivés masqués) ;
    // le toggle "Inclure archivés" repasse à l'appel non filtré (back-end renvoie tout).
    const qs = new URLSearchParams();
    if (entrepriseId) qs.set("entreprise_id", entrepriseId);
    if (!includeArchived) qs.set("active_only", "true");
    const params = qs.toString() ? `?${qs.toString()}` : "";
    const [collabs, ents, vehicules, sessions] = await Promise.all([
      apiFetch<Collab[]>(`/api/collaborateurs${params}`),
      isSuperadmin ? apiFetch<any[]>("/api/entreprises") : Promise.resolve([] as any[]),
      apiFetch<Vehicule[]>(`/api/vehicules${entrepriseId ? `?entreprise_id=${entrepriseId}` : ""}`).catch(() => [] as Vehicule[]),
      apiFetch<Session[]>(`/api/sessions${entrepriseId ? `?entreprise_id=${entrepriseId}` : ""}`).catch(() => [] as Session[]),
    ]);

    // Indexe le véhicule de chaque collab (1 véhicule par collab actuellement)
    const vMap = new Map<string, Vehicule>();
    for (const v of vehicules) {
      if (v.collaborateur_id) vMap.set(v.collaborateur_id, v);
    }
    setVehiculesByCollab(vMap);

    // Agrège les sessions par collab : kWh dom, € dom, kWh hors dom
    const agg = new Map<string, { domKwh: number; domEur: number; horsKwh: number }>();
    for (const s of sessions) {
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

    // Charge les KPIs serveur (conso moyenne, CO2, dernier km) en parallèle
    const kpisResults = await Promise.all(
      collabs.map(async (c) => {
        try {
          const k = await apiFetch<any>(`/api/collaborateurs/${c.id}/kpis`);
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
        const result = await apiFetch<{ created: number; skipped: number; errors: { ligne: number; email: string; raison: string }[] }>(
          "/api/collaborateurs/import/csv",
          { method: "POST", body: JSON.stringify({ file_content: text }) }
        );
        setImportReport(result);
        if (result.created > 0) {
          toast.success(`${result.created} collaborateur${result.created > 1 ? "s" : ""} importé${result.created > 1 ? "s" : ""}`);
          loadData();
        } else {
          toast.error("Aucun collaborateur importé", { description: "Vérifiez le rapport ci-dessous." });
        }
      } catch (err) {
        console.error(err);
        toast.error("Erreur d'importation", {
          description: "Vérifiez le format du CSV : Nom, Prénom, Email, Téléphone.",
        });
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
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
          <button
            onClick={() => {
              const bom = "﻿";
              const header = "Nom,Prénom,Email,Téléphone\n";
              const blob = new Blob([bom + header], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "template_import_collaborateurs.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            title="Télécharger le modèle CSV vierge à remplir"
          >
            <Download className="h-4 w-4" /> Modèle CSV
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

      {/* BugID_031/032 — Rapport d'import CSV */}
      {importReport && (
        <div className={`mb-6 rounded-xl border p-4 text-sm ${importReport.created > 0 ? "border-chargiz-teal/30 bg-chargiz-teal/5" : "border-destructive/30 bg-destructive/5"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground mb-1">Rapport d'importation</p>
              <p className="text-muted-foreground">
                {importReport.created} créé{importReport.created > 1 ? "s" : ""}
                {importReport.skipped > 0 && ` · ${importReport.skipped} ignoré${importReport.skipped > 1 ? "s" : ""} (doublon)`}
                {importReport.errors.filter(e => !e.raison.startsWith("Email déjà")).length > 0 &&
                  ` · ${importReport.errors.filter(e => !e.raison.startsWith("Email déjà")).length} erreur${importReport.errors.filter(e => !e.raison.startsWith("Email déjà")).length > 1 ? "s" : ""}`}
              </p>
              {importReport.errors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {importReport.errors.map((e, i) => (
                    <li key={i} className="text-xs text-destructive">
                      Ligne {e.ligne}{e.email ? ` (${e.email})` : ""} — {e.raison}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={() => setImportReport(null)} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">✕</button>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, email..."
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
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

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 whitespace-nowrap">
                <SortableHeader sortKey="prenom" sort={sort} onChange={setSort}>Prénom</SortableHeader>
                <SortableHeader sortKey="nom" sort={sort} onChange={setSort}>Nom</SortableHeader>
                {isSuperadmin && <SortableHeader sortKey="entreprise" sort={sort} onChange={setSort}>Entreprise</SortableHeader>}
                <SortableHeader sortKey="immatriculation" sort={sort} onChange={setSort}>Immatriculation</SortableHeader>
                <SortableHeader sortKey="domKwh" sort={sort} onChange={setSort} align="right">Rech. Dom (kWh)</SortableHeader>
                <SortableHeader sortKey="domEur" sort={sort} onChange={setSort} align="right">Rech. Dom (€)</SortableHeader>
                <SortableHeader sortKey="horsKwh" sort={sort} onChange={setSort} align="right">Rech. Hors (kWh)</SortableHeader>
                <SortableHeader sortKey="km" sort={sort} onChange={setSort} align="right">Km</SortableHeader>
                <SortableHeader sortKey="conso" sort={sort} onChange={setSort} align="right">
                  <span>Conso. moy.<br/><span className="text-[10px] font-normal">kWh/100km</span></span>
                </SortableHeader>
                <SortableHeader sortKey="co2" sort={sort} onChange={setSort} align="right">
                  <span>CO₂ évité<br/><span className="text-[10px] font-normal">kg</span></span>
                </SortableHeader>
                <SortableHeader sortKey="etat" sort={sort} onChange={setSort}>État</SortableHeader>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={isSuperadmin ? 12 : 11}>
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
              ) : paginated.map((collab) => {
                const ent = isSuperadmin ? entreprises.get(collab.entreprise_id) : null;
                const veh = vehiculesByCollab.get(collab.id);
                const sess = sessionsAgg.get(collab.id) || { domKwh: 0, domEur: 0, horsKwh: 0 };
                const kpi = kpisByCollab.get(collab.id) || { conso: null, co2: null, km: null };
                return (
                <tr key={collab.id} className="hover:bg-muted/30 transition-colors whitespace-nowrap">
                  <td className="px-4 py-3 font-medium text-card-foreground">{collab.prenom}</td>
                  <td className="px-4 py-3 font-medium text-card-foreground">{collab.nom}</td>
                  {isSuperadmin && (
                    <td className="px-4 py-3">
                      {ent ? (
                        <Link to="/dashboard/listes/entreprises/$id" params={{ id: ent.id }} className="text-card-foreground hover:underline text-xs">
                          {ent.nom}
                        </Link>
                      ) : <span className="text-muted-foreground italic text-xs">—</span>}
                    </td>
                  )}
                  <td className="px-4 py-3 font-mono text-xs text-card-foreground">{veh?.immatriculation || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-card-foreground">{sess.domKwh.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-card-foreground">{sess.domEur.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-card-foreground">{sess.horsKwh.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{kpi.km != null ? kpi.km.toFixed(0) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{kpi.conso != null ? kpi.conso.toFixed(1) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{kpi.co2 != null ? kpi.co2.toFixed(0) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${collab.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-destructive/10 text-destructive"}`}>
                      {collab.is_active ? "Actif" : "Archivé"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <IconTooltip label="Voir la fiche">
                        <Link to="/dashboard/collaborateur/$id" params={{ id: collab.id }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </IconTooltip>
                      {collab.is_active ? (
                        <IconTooltip label="Archiver">
                          <button
                            onClick={() => handleArchive(collab)}
                            disabled={processingId === collab.id}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {processingId === collab.id
                              ? <span className="h-4 w-4 block animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                              : <Archive className="h-4 w-4" />}
                          </button>
                        </IconTooltip>
                      ) : (
                        <IconTooltip label="Réactiver">
                          <button
                            onClick={() => handleUnarchive(collab)}
                            disabled={processingId === collab.id}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-chargiz-teal/10 hover:text-chargiz-teal transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {processingId === collab.id
                              ? <span className="h-4 w-4 block animate-spin rounded-full border-2 border-chargiz-teal border-t-transparent" />
                              : <ArchiveRestore className="h-4 w-4" />}
                          </button>
                        </IconTooltip>
                      )}
                      <IconTooltip label="Supprimer définitivement">
                        <button
                          onClick={() => setDeleteTarget(collab)}
                          disabled={processingId === collab.id}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </IconTooltip>
                    </div>
                  </td>
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
    </div>
  );
}
