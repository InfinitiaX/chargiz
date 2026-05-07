import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, User, Car, Database, Filter, Save, Trash2, Edit3, X, CheckCircle2, Download, Zap, Battery, Leaf, Home, Euro } from "lucide-react";
import { apiFetch, api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/dashboard/collaborateur/$id")({
  component: CollaborateurDetails,
  head: () => ({ meta: [{ title: "ChargiZ — Fiche Collaborateur" }] }),
});

interface Collaborateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  adresse?: string | null;
  ville?: string | null;
  is_active: boolean;
  created_at: string;
  entreprise_id: string;
}

interface Vehicule {
  id: string;
  marque: string | null;
  modele: string | null;
  immatriculation: string | null;
  vin: string | null;
  capacite_batterie: number | null;
  statut_smartcar: string;
}

interface Session {
  id: string;
  date_session: string;
  energie_kwh: number;
  cout_euro: number;
  is_domicile: boolean;
}

function CollaborateurDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const canEdit = role === "superadmin" || role === "gestionnaire_entreprise";

  const [collab, setCollab] = useState<Collaborateur | null>(null);
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [politique, setPolitique] = useState<{ prix_kwh: number | null; jours_fermeture: number | null; delegation_prix: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingInfos, setEditingInfos] = useState(false);
  const [editingVehicule, setEditingVehicule] = useState(false);
  const [collabDraft, setCollabDraft] = useState<Partial<Collaborateur>>({});
  const [vehiculeDraft, setVehiculeDraft] = useState<Partial<Vehicule>>({});
  const [savingMsg, setSavingMsg] = useState<string | null>(null);

  // Date filter (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const c = await apiFetch<Collaborateur>(`/api/collaborateurs/${id}`);
      setCollab(c);

      const vs = await apiFetch<Vehicule[]>(`/api/vehicules?collaborateur_id=${id}`);
      setVehicule(vs.length > 0 ? vs[0] : null);

      const ss = await apiFetch<Session[]>(`/api/sessions?collaborateur_id=${id}`);
      setSessions(ss);

      // Politique entreprise (read-only on the fiche)
      try {
        const pols = await api.politiques.list({ entreprise_id: c.entreprise_id });
        if (pols.length > 0) setPolitique(pols[0]);
      } catch {/* politique optional */}
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  // ─── Sessions filter ───
  const filteredSessions = useMemo(() => {
    if (selectedMonth === "all") return sessions;
    return sessions.filter(s => {
      const date = new Date(s.date_session);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthStr === selectedMonth;
    });
  }, [sessions, selectedMonth]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    sessions.forEach(s => {
      const date = new Date(s.date_session);
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
  }, [sessions]);

  // ─── Bloc 3 KPIs (always computed on filteredSessions) ───
  const kpis = useMemo(() => {
    const energieDom = filteredSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
    const energieHors = filteredSessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
    const coutDom = filteredSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.cout_euro || 0), 0);
    const coutTotal = filteredSessions.reduce((a, s) => a + (s.cout_euro || 0), 0);
    return {
      energieDom,
      energieHors,
      energieTotale: energieDom + energieHors,
      coutDom,
      coutTotal,
      // km / conso / CO2 require Smartcar odometer data — left as null until wired.
      // [Smartcar TODO] compute from real km when premium API is connected.
      km: null as number | null,
      consoMoyenne: null as number | null,
      co2Evite: null as number | null,
    };
  }, [filteredSessions]);

  // ─── Edit handlers ───
  const startEditInfos = () => {
    if (!collab) return;
    setCollabDraft({
      nom: collab.nom,
      prenom: collab.prenom,
      email: collab.email,
      telephone: collab.telephone,
    });
    setEditingInfos(true);
  };
  const saveInfos = async () => {
    if (!collab) return;
    try {
      const updated = await api.collaborateurs.update(collab.id, collabDraft);
      setCollab({ ...collab, ...updated });
      setEditingInfos(false);
      setSavingMsg("Informations mises à jour.");
      setTimeout(() => setSavingMsg(null), 2500);
    } catch (err: any) {
      alert(err.message || "Erreur lors de la mise à jour.");
    }
  };

  const startEditVehicule = () => {
    if (!vehicule) return;
    setVehiculeDraft({
      marque: vehicule.marque,
      modele: vehicule.modele,
      immatriculation: vehicule.immatriculation,
      vin: vehicule.vin,
      capacite_batterie: vehicule.capacite_batterie,
    });
    setEditingVehicule(true);
  };
  const saveVehicule = async () => {
    if (!vehicule) return;
    try {
      const updated = await api.vehicules.update(vehicule.id, vehiculeDraft);
      setVehicule({ ...vehicule, ...updated });
      setEditingVehicule(false);
      setSavingMsg("Véhicule mis à jour.");
      setTimeout(() => setSavingMsg(null), 2500);
    } catch (err: any) {
      alert(err.message || "Erreur lors de la mise à jour.");
    }
  };

  const handleDelete = async () => {
    if (!collab) return;
    if (!confirm(`Supprimer définitivement ${collab.prenom} ${collab.nom} ? Cette action est irréversible.`)) return;
    try {
      await apiFetch(`/api/collaborateurs/${collab.id}`, { method: "DELETE" });
      navigate({ to: "/dashboard/listes/collaborateurs" });
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>;
  if (!collab) return <div className="p-8 text-center text-muted-foreground">Collaborateur introuvable.</div>;

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="p-4 sm:p-6 md:p-8 print:p-0 print:m-0">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link to="/dashboard/listes/collaborateurs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Récap PDF
          </button>
          {canEdit && (
            <button onClick={handleDelete} className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <User className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{collab.prenom} {collab.nom}</h1>
          <p className="text-sm text-muted-foreground">{collab.is_active ? "Compte actif" : "Compte archivé"}</p>
        </div>
      </div>

      {savingMsg && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-chargiz-teal/10 p-3 text-sm text-chargiz-teal">
          <CheckCircle2 className="h-4 w-4 mt-0.5" /> {savingMsg}
        </div>
      )}

      {/* Bloc 1 — Informations collaborateur */}
      <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-semibold text-card-foreground">Informations collaborateur</h3>
          {canEdit && !editingInfos && (
            <button onClick={startEditInfos} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Edit3 className="h-4 w-4" /> Modifier
            </button>
          )}
        </div>
        <div className="p-6">
          {editingInfos ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Prénom</label>
                  <input className={`mt-1 ${inputCls}`} value={collabDraft.prenom || ""} onChange={e => setCollabDraft(d => ({ ...d, prenom: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Nom</label>
                  <input className={`mt-1 ${inputCls}`} value={collabDraft.nom || ""} onChange={e => setCollabDraft(d => ({ ...d, nom: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <input type="email" className={`mt-1 ${inputCls}`} value={collabDraft.email || ""} onChange={e => setCollabDraft(d => ({ ...d, email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Téléphone</label>
                  <input className={`mt-1 ${inputCls}`} value={collabDraft.telephone || ""} onChange={e => setCollabDraft(d => ({ ...d, telephone: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveInfos} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-95">
                  <Save className="h-4 w-4" /> Enregistrer
                </button>
                <button onClick={() => setEditingInfos(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Annuler</button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Nom</p><p className="mt-0.5 font-medium text-card-foreground">{collab.nom}</p></div>
                <div><p className="text-xs text-muted-foreground">Prénom</p><p className="mt-0.5 font-medium text-card-foreground">{collab.prenom}</p></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p className="mt-0.5 text-card-foreground">{collab.email}</p></div>
                <div><p className="text-xs text-muted-foreground">Téléphone</p><p className="mt-0.5 text-card-foreground">{collab.telephone || "—"}</p></div>
              </div>
              {politique && (
                <div className="mt-6 rounded-lg bg-muted/40 p-4 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Politique de recharge appliquée</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-muted-foreground">Coût du kWh</p><p className="mt-0.5 font-medium">{politique.prix_kwh != null ? `${politique.prix_kwh.toFixed(3)} €` : "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Mode</p><p className="mt-0.5 capitalize">{politique.delegation_prix === "collaborateur" ? "Individuel collaborateur" : "Global entreprise"}</p></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bloc 2 — Véhicule */}
      <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2"><Car className="h-4 w-4" /> Véhicule affecté</h3>
          {canEdit && vehicule && !editingVehicule && (
            <button onClick={startEditVehicule} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Edit3 className="h-4 w-4" /> Modifier
            </button>
          )}
        </div>
        <div className="p-6">
          {!vehicule ? (
            <p className="text-sm text-muted-foreground italic">Aucun véhicule affecté.</p>
          ) : editingVehicule ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Marque</label>
                  <input className={`mt-1 ${inputCls}`} value={vehiculeDraft.marque || ""} onChange={e => setVehiculeDraft(d => ({ ...d, marque: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Modèle</label>
                  <input className={`mt-1 ${inputCls}`} value={vehiculeDraft.modele || ""} onChange={e => setVehiculeDraft(d => ({ ...d, modele: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Immatriculation</label>
                  <input className={`mt-1 ${inputCls} font-mono`} value={vehiculeDraft.immatriculation || ""} onChange={e => setVehiculeDraft(d => ({ ...d, immatriculation: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Capacité batterie (kWh)</label>
                  <input type="number" step="0.1" className={`mt-1 ${inputCls}`} value={vehiculeDraft.capacite_batterie ?? ""} onChange={e => setVehiculeDraft(d => ({ ...d, capacite_batterie: e.target.value === "" ? null : parseFloat(e.target.value) }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveVehicule} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-95">
                  <Save className="h-4 w-4" /> Enregistrer
                </button>
                <button onClick={() => setEditingVehicule(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Annuler</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Marque / Modèle</p><p className="mt-0.5 font-medium text-card-foreground">{vehicule.marque || "—"} {vehicule.modele || ""}</p></div>
              <div><p className="text-xs text-muted-foreground">Immatriculation</p><p className="mt-0.5 font-mono text-card-foreground">{vehicule.immatriculation || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Capacité batterie</p><p className="mt-0.5 text-card-foreground">{vehicule.capacite_batterie ? `${vehicule.capacite_batterie} kWh` : "—"}</p></div>
              <div>
                <p className="text-xs text-muted-foreground">Statut Smartcar</p>
                <p className={`mt-0.5 font-medium ${vehicule.statut_smartcar === "connecte" ? "text-chargiz-teal" : "text-muted-foreground"}`}>
                  {vehicule.statut_smartcar === "connecte" ? "Connecté" : "Déconnecté"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bloc 3 — Statistiques collaborateur */}
      <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2"><Zap className="h-4 w-4" /> Statistiques de recharge</h3>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiBox label="Énergie domicile" value={`${kpis.energieDom.toFixed(1)} kWh`} icon={Home} />
          <KpiBox label="Énergie hors domicile" value={`${kpis.energieHors.toFixed(1)} kWh`} icon={Battery} />
          <KpiBox label="Coût total remb." value={`${kpis.coutDom.toFixed(2)} €`} icon={Euro} />
          <KpiBox label="Sessions" value={String(filteredSessions.length)} icon={Zap} />
          <KpiBox label="Conso. moy. (kWh/100km)" value={kpis.consoMoyenne != null ? kpis.consoMoyenne.toFixed(1) : "—"} icon={Battery} hint={kpis.consoMoyenne == null ? "Smartcar requis" : undefined} />
          <KpiBox label="CO₂ évité" value={kpis.co2Evite != null ? `${kpis.co2Evite.toFixed(0)} kg` : "—"} icon={Leaf} hint={kpis.co2Evite == null ? "Smartcar requis" : undefined} />
          <KpiBox label="Km parcourus" value={kpis.km != null ? `${kpis.km.toFixed(0)} km` : "—"} icon={Car} hint={kpis.km == null ? "Smartcar requis" : undefined} />
        </div>
      </div>

      {/* Bloc 4 — Sessions de recharge */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2">
            <Database className="h-4 w-4" /> Sessions de recharge
          </h3>
          <div className="flex items-center gap-2 print:hidden">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:border-primary">
              <option value="all">Toutes les périodes</option>
              {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-6 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Lieu</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Énergie (kWh)</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Coût (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSessions.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Aucune session enregistrée</td></tr>
              ) : filteredSessions.map(s => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 text-card-foreground">{new Date(s.date_session).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.is_domicile ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-kpi-away/10 text-kpi-away"}`}>
                      {s.is_domicile ? "Domicile" : "Hors domicile"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">{s.energie_kwh.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-medium">{s.cout_euro.toFixed(2)} €</td>
                </tr>
              ))}
              {filteredSessions.length > 0 && (
                <tr className="bg-muted/10 font-bold border-t-2 border-border">
                  <td colSpan={2} className="px-6 py-4 text-right">Total</td>
                  <td className="px-6 py-4 text-right">{kpis.energieTotale.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-primary">{kpis.coutTotal.toFixed(2)} €</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiBox({ label, value, icon: Icon, hint }: { label: string; value: string; icon: React.ElementType; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-xl font-bold text-card-foreground">{value}</p>
      {hint && <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
