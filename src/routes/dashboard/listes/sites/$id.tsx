/**
 * Fiche détail Site — /dashboard/listes/sites/$id.
 *
 * Niveau le plus bas de la hiérarchie (Entreprise → Filiale → Site).
 * Fil d'Ariane complet vers l'entreprise et la filiale parente, KPIs sessions
 * du site, collaborateurs et véhicules rattachés.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, ArrowRight, Battery, Building2, Calendar, Car, Check, Euro,
  Hash, Mail, MapPin, MapPinned, Phone, ShieldCheck, Users, Zap,
} from "lucide-react";
import { normalizeImmat } from "@/lib/immat";

export const Route = createFileRoute("/dashboard/listes/sites/$id")({
  component: SiteDetail,
  head: () => ({ meta: [{ title: "ChargiZ — Détails site" }] }),
});

function SiteDetail() {
  const { id } = Route.useParams();
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [site, setSite] = useState<any>(null);
  const [filiale, setFiliale] = useState<any>(null);
  const [entreprise, setEntreprise] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [collabs, setCollabs] = useState<any[]>([]);
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const canAccess = role === "superadmin" || role === "admin"
    || role === "gestionnaire_entreprise" || role === "gestionnaire_filiale" || role === "gestionnaire_site";

  useEffect(() => {
    if (authLoading || !canAccess) return;
    (async () => {
      try {
        const s = await api.sites.get(id);
        const [fil, st, cs, vs] = await Promise.all([
          api.filiales.get(s.filiale_id).catch(() => null),
          api.sites.stats(id).catch(() => null),
          api.collaborateurs.list({ site_id: id }).catch(() => []),
          api.vehicules.list({ site_id: id }).catch(() => []),
        ]);
        setSite(s);
        setFiliale(fil);
        setStats(st);
        setCollabs(cs);
        setVehicules(vs);
        if (fil?.entreprise_id) {
          api.entreprises.get(fil.entreprise_id).then(setEntreprise).catch(() => {});
        }
      } catch (e: any) {
        setErr(e?.message ?? "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, canAccess, id]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!canAccess) {
    return <div className="p-8"><p className="text-muted-foreground">Accès non autorisé.</p></div>;
  }

  if (err || !site) {
    return (
      <div className="p-8 max-w-2xl">
        <button onClick={() => navigate({ to: "/dashboard/listes/sites" })}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </button>
        <p className="text-destructive">{err ?? "Site introuvable"}</p>
      </div>
    );
  }

  // Map collab.id → collab pour annoter le tableau véhicules
  const collabById = new Map(collabs.map((c: any) => [c.id, c]));

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl">
      {/* Fil d'Ariane complet */}
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link to="/dashboard/listes/sites" className="hover:text-foreground">Sites</Link>
        {entreprise && (
          <>
            <span>·</span>
            <Link
              to="/dashboard/listes/entreprises/$id"
              params={{ id: entreprise.id }}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Building2 className="h-3 w-3" /> {entreprise.nom}
            </Link>
          </>
        )}
        {filiale && (
          <>
            <ArrowRight className="h-3 w-3" />
            <Link
              to="/dashboard/listes/filiales/$id"
              params={{ id: filiale.id }}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Building2 className="h-3 w-3" /> {filiale.nom}
            </Link>
          </>
        )}
        <ArrowRight className="h-3 w-3" />
        <span className="font-medium text-foreground">{site.nom}</span>
      </nav>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPinned className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{site.nom}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {site.siret && <span className="font-mono">SIRET {site.siret}</span>}
              {site.ville && <> · {site.ville}</>}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
          site.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-muted text-muted-foreground"
        }`}>
          {site.is_active ? "Actif" : "Archivé"}
        </span>
      </div>

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiSmall icon={Users} label="Collaborateurs" value={collabs.length} />
        <KpiSmall icon={Car} label="Véhicules" value={vehicules.length} />
        <KpiSmall icon={Zap} label="Sessions" value={stats?.nb_sessions ?? 0} />
        <KpiSmall icon={Battery} label="Énergie" value={`${(stats?.energie_totale_kwh ?? 0).toFixed(1)} kWh`} />
        <KpiSmall icon={Euro} label="Coût total" value={`${(stats?.cout_total_euro ?? 0).toFixed(2)} €`} />
      </div>

      {/* Infos */}
      <Section title="Informations" icon={MapPinned}>
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <Info icon={Hash} label="SIRET" value={site.siret} />
          <Info icon={MapPin} label="Adresse" value={[site.adresse, site.code_postal, site.ville].filter(Boolean).join(", ") || null} />
          <Info icon={Phone} label="Téléphone" value={site.telephone} />
          <Info icon={Calendar} label="Créé le" value={site.created_at ? new Date(site.created_at).toLocaleDateString("fr-FR") : null} />
          {filiale && (
            <div className="flex items-start gap-3 sm:col-span-2">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Filiale de rattachement</p>
                <Link
                  to="/dashboard/listes/filiales/$id"
                  params={{ id: filiale.id }}
                  className="font-medium text-primary hover:underline"
                >
                  {filiale.nom}
                </Link>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Responsable */}
      {(site.responsable_prenom || site.responsable_nom || site.responsable_email) && (
        <Section title="Responsable du site" icon={ShieldCheck}>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <Info icon={ShieldCheck} label="Prénom" value={site.responsable_prenom} />
            <Info icon={ShieldCheck} label="Nom" value={site.responsable_nom} />
            <Info icon={Mail} label="Email" value={site.responsable_email} />
            <Info icon={Phone} label="Téléphone direct" value={site.responsable_telephone} />
          </div>
        </Section>
      )}

      {/* Collaborateurs */}
      <Section title={`Collaborateurs (${collabs.length})`} icon={Users}>
        {collabs.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Aucun collaborateur rattaché à ce site.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="cz-table-head">
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="px-4 py-2 font-medium text-muted-foreground">Nom</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Téléphone</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Actif</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {collabs.map((c: any) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">{c.prenom} {c.nom}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.email}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.telephone ?? "—"}</td>
                    <td className="px-4 py-2">{c.is_active ? <Check className="h-4 w-4 text-chargiz-teal" /> : "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <Link to="/dashboard/collaborateur/$id" params={{ id: c.id }} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        Voir <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Véhicules */}
      <Section title={`Véhicules (${vehicules.length})`} icon={Car}>
        {vehicules.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Aucun véhicule.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="cz-table-head">
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="px-4 py-2 font-medium text-muted-foreground">Marque / Modèle</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Immatriculation</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Collaborateur</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Smartcar</th>
                </tr>
              </thead>
              <tbody>
                {vehicules.map((v: any) => {
                  const collab = v.collaborateur_id ? collabById.get(v.collaborateur_id) : null;
                  return (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium">{v.marque} {v.modele}</td>
                      <td className="px-4 py-2 font-mono text-xs">{v.immatriculation ? normalizeImmat(v.immatriculation) : "—"}</td>
                      <td className="px-4 py-2">
                        {collab ? (
                          <span className="text-card-foreground">{collab.prenom} {collab.nom}</span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Non affilié</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs ${
                          v.statut_smartcar === "connecte" ? "text-chargiz-teal" : "text-muted-foreground"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            v.statut_smartcar === "connecte" ? "bg-chargiz-teal" : "bg-muted-foreground"
                          }`} />
                          {v.statut_smartcar === "connecte" ? "Connecté" : "Déconnecté"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-card-foreground">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function KpiSmall({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="text-lg font-bold text-card-foreground tabular-nums">{value}</p>
    </div>
  );
}
