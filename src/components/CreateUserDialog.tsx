import { useMemo, useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { type AppRole, type Profile } from "@/hooks/useAuth";

function friendlyError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("email") && (m.includes("déjà") || m.includes("taken") || m.includes("exist")))
    return "Cette adresse email est déjà utilisée par un autre compte.";
  if (m.includes("username") && (m.includes("déjà") || m.includes("taken") || m.includes("exist")))
    return "Cet identifiant est déjà utilisé. Veuillez en choisir un autre.";
  if (m.includes("session expir") || m.includes("401"))
    return "Votre session a expiré. Veuillez vous reconnecter.";
  if (m.includes("accès refusé") || m.includes("403") || m.includes("forbidden"))
    return "Vous n'avez pas les droits pour effectuer cette action.";
  return raw;
}

interface Props {
  actorRole: AppRole;
  profile: Profile | null;
  open: boolean;
  defaultRole?: AppRole;
  onClose: () => void;
  onCreated: () => void;
}

const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Superadmin",
  gestionnaire_entreprise: "Gestionnaire entreprise",
  gestionnaire_filiale: "Gestionnaire filiale",
  gestionnaire_site: "Gestionnaire site",
  collaborateur: "Collaborateur",
};

// Lot 1 scope: only superadmin and gestionnaire_entreprise can create accounts.
// gestionnaire_filiale / gestionnaire_site target roles are deferred to Lot 2 (CDC §6.2).
const MANAGEABLE_ROLES: Record<AppRole, AppRole[]> = {
  superadmin: ["gestionnaire_entreprise", "collaborateur"],
  gestionnaire_entreprise: ["gestionnaire_entreprise", "collaborateur"],
  // [Lot 2] role-scoped account creation:
  // gestionnaire_filiale: ["gestionnaire_site", "collaborateur"],
  // gestionnaire_site: ["collaborateur"],
  gestionnaire_filiale: [],
  gestionnaire_site: [],
  collaborateur: [],
};

export default function CreateUserDialog({ actorRole, profile, open, defaultRole, onClose, onCreated }: Props) {
  const availableRoles = useMemo(() => MANAGEABLE_ROLES[actorRole], [actorRole]);
  const initialRole = defaultRole && availableRoles.includes(defaultRole) ? defaultRole : availableRoles[0];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    username: "",
    password: "",
    role: initialRole,
    entreprise_id: profile?.entreprise_id || "",
    filiale_id: profile?.filiale_id || "",
    site_id: profile?.site_id || "",
  });

  if (!open || availableRoles.length === 0) return null;

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          username: form.username,
          password: form.password,
          full_name: [form.prenom, form.nom].filter(Boolean).join(" "),
          role: form.role,
          entreprise_id: form.entreprise_id || null,
          filiale_id: form.filiale_id || null,
          site_id: form.site_id || null,
          is_active: true,
        }),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : "Impossible de créer le compte."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-card-foreground">Créer un compte</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Rôle *</label>
            <select className={inputCls} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AppRole }))}>
              {availableRoles.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Prénom *</label>
              <input required className={inputCls} value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Nom *</label>
              <input required className={inputCls} value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Email *</label>
            <input type="email" required className={inputCls} value={form.email} onChange={(e) => {
              const email = e.target.value;
              setForm((f) => ({ ...f, email, username: f.username || email.split("@")[0] }));
            }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Identifiant *</label>
              <input required minLength={3} className={inputCls} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Mot de passe temporaire *</label>
              <input type="password" required minLength={8} className={inputCls} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
          </div>

          {actorRole === "superadmin" && (
            <div className="grid grid-cols-1 gap-3 border-t border-border pt-4">
              <div>
                <label className="text-sm font-medium text-foreground">Entreprise ID</label>
                <input className={inputCls} value={form.entreprise_id} onChange={(e) => setForm((f) => ({ ...f, entreprise_id: e.target.value }))} />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive leading-snug">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">Annuler</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light disabled:opacity-50">
              {loading ? "Creation..." : "Creer le compte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
