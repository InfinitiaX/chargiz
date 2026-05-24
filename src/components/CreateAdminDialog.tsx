import { useState, useEffect } from "react";
import { X, ShieldCheck, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface FormErrors {
  email?: string;
  full_name?: string;
}

const INITIAL = { email: "", full_name: "" };

export default function CreateAdminDialog({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(INITIAL);
    setErrors({});
    setServerError(null);
  }, [open]);

  if (!open) return null;

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.full_name.trim()) e.full_name = "Le nom complet est requis.";
    if (!form.email.trim()) e.email = "L'email est requis.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Adresse email invalide.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await api.admins.create({ email: form.email, full_name: form.full_name.trim() });
      toast.success("Admin créé avec succès", {
        description: `Un email d'identifiants a été envoyé à ${form.email}.`,
        icon: <CheckCircle2 className="h-4 w-4" />,
        duration: 6000,
      });
      onCreated();
    } catch (err: any) {
      const msg = err.message || "Erreur lors de la création de l'admin.";
      if (msg.toLowerCase().includes("email"))
        setErrors({ email: "Cet email est déjà utilisé." });
      else
        setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (err?: string) =>
    `w-full rounded-lg border ${err ? "border-destructive bg-destructive/5" : "border-input bg-background"} px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Nouvel administrateur</h2>
              <p className="text-xs text-muted-foreground">Un email d'identifiants sera envoyé automatiquement.</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{serverError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Nom complet <span className="text-destructive">*</span>
            </label>
            <input
              className={inputCls(errors.full_name)}
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Prénom Nom"
            />
            {errors.full_name && <p className="mt-1 text-xs text-destructive">{errors.full_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Adresse email <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              className={inputCls(errors.email)}
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="admin@chargiz.io"
            />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              L'admin pourra gérer les entreprises clientes que vous lui attribuerez ensuite.
              Son mot de passe temporaire lui sera envoyé par email.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Création...
                </>
              ) : (
                <>Créer l'admin <ChevronRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
