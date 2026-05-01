import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { type AppRole, type Profile } from "@/hooks/useAuth";

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
  admin: "Admin",
  gestionnaire_entreprise: "Gestionnaire entreprise",
  gestionnaire_filiale: "Gestionnaire filiale",
  gestionnaire_site: "Gestionnaire site",
  collaborateur: "Collaborateur",
};

const MANAGEABLE_ROLES: Record<AppRole, AppRole[]> = {
  superadmin: ["admin"],
  admin: ["gestionnaire_entreprise", "gestionnaire_filiale", "gestionnaire_site", "collaborateur"],
  gestionnaire_entreprise: ["gestionnaire_filiale", "gestionnaire_site", "collaborateur"],
  gestionnaire_filiale: ["gestionnaire_site", "collaborateur"],
  gestionnaire_site: ["collaborateur"],
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

  const showScopeFields = actorRole !== "superadmin" && form.role !== "admin";
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
      setError(err instanceof Error ? err.message : "Impossible de creer le compte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-card-foreground">Creer un compte</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Role *</label>
            <select className={inputCls} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AppRole }))}>
              {availableRoles.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Prenom *</label>
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

          {showScopeFields && form.role !== "admin" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border pt-4">
              <div>
                <label className="text-sm font-medium text-foreground">Entreprise ID</label>
                <input className={inputCls} value={form.entreprise_id} onChange={(e) => setForm((f) => ({ ...f, entreprise_id: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Filiale ID</label>
                <input className={inputCls} value={form.filiale_id} onChange={(e) => setForm((f) => ({ ...f, filiale_id: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Site ID</label>
                <input className={inputCls} value={form.site_id} onChange={(e) => setForm((f) => ({ ...f, site_id: e.target.value }))} />
              </div>
            </div>
          )}

          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

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
