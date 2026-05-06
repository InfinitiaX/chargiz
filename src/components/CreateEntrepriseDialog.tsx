import { useState } from "react";
import { X, Building2, User, CheckCircle2, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface FormErrors {
  nom?: string;
  siren?: string;
  siret?: string;
  numero_tva?: string;
  email?: string;
  telephone?: string;
  code_postal?: string;
  prix_kwh_defaut?: string;
  manager_full_name?: string;
  manager_email?: string;
}

const INITIAL_FORM = {
  nom: "",
  siren: "",
  siret: "",
  numero_tva: "",
  adresse: "",
  code_postal: "",
  ville: "",
  email: "",
  telephone: "",
  prix_kwh_defaut: "0.21",
  manager_email: "",
  manager_full_name: "",
};

function validate(form: typeof INITIAL_FORM): FormErrors {
  const errors: FormErrors = {};

  if (!form.nom.trim()) errors.nom = "La dénomination est requise.";

  if (form.siren && !/^\d{9}$/.test(form.siren))
    errors.siren = "Le SIREN doit contenir exactement 9 chiffres.";

  if (form.siret) {
    if (!/^\d{14}$/.test(form.siret))
      errors.siret = "Le SIRET doit contenir exactement 14 chiffres.";
    else if (form.siren && !form.siret.startsWith(form.siren))
      errors.siret = "Le SIRET doit commencer par le SIREN.";
  }

  if (form.numero_tva && !/^FR\d{11}$/.test(form.numero_tva))
    errors.numero_tva = "Format attendu : FR + 11 chiffres (ex: FR12345678901).";

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = "Adresse email invalide.";

  if (form.telephone && !/^(\+33|0)[1-9](\d{8})$/.test(form.telephone.replace(/\s/g, "")))
    errors.telephone = "Format invalide (ex: 0612345678 ou +33612345678).";

  if (form.code_postal && !/^\d{5}$/.test(form.code_postal))
    errors.code_postal = "Le code postal doit contenir 5 chiffres.";

  const kwh = parseFloat(form.prix_kwh_defaut);
  if (isNaN(kwh) || kwh < 0 || kwh > 5)
    errors.prix_kwh_defaut = "Valeur entre 0 et 5 €/kWh.";

  if (!form.manager_full_name.trim())
    errors.manager_full_name = "Le nom du gestionnaire est requis.";

  if (!form.manager_email)
    errors.manager_email = "L'email du gestionnaire est requis.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.manager_email))
    errors.manager_email = "Adresse email invalide.";
  else if (form.email && form.manager_email === form.email)
    errors.manager_email = "L'email du gestionnaire doit être différent de l'email de l'entreprise.";

  return errors;
}

export default function CreateEntrepriseDialog({ open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);

  if (!open) return null;

  const set = (field: keyof typeof INITIAL_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (fieldErrors[field as keyof FormErrors]) {
      setFieldErrors(fe => ({ ...fe, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccess(null);

    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch("/api/entreprises", {
        method: "POST",
        body: JSON.stringify({
          nom: form.nom.trim(),
          siren: form.siren || null,
          siret: form.siret || null,
          numero_tva: form.numero_tva || null,
          adresse: form.adresse || null,
          code_postal: form.code_postal || null,
          ville: form.ville || null,
          email: form.email || null,
          telephone: form.telephone || null,
          prix_kwh_defaut: parseFloat(form.prix_kwh_defaut) || 0.21,
          manager_email: form.manager_email,
          manager_full_name: form.manager_full_name.trim(),
        }),
      });

      setSuccess(`L'entreprise "${response.nom}" a été créée. Un email a été envoyé au gestionnaire.`);
      setForm(INITIAL_FORM);
      setFieldErrors({});
      onCreated();

      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 3000);
    } catch (err: any) {
      const msg = err.message || "Erreur lors de la création de l'entreprise.";
      if (msg.toLowerCase().includes("siren"))
        setFieldErrors(fe => ({ ...fe, siren: "Ce SIREN est déjà utilisé." }));
      else if (msg.toLowerCase().includes("email") || msg.toLowerCase().includes("username"))
        setFieldErrors(fe => ({ ...fe, manager_email: "Cet email gestionnaire est déjà utilisé." }));
      else
        setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (err?: string) =>
    `w-full rounded-lg border ${err ? "border-destructive bg-destructive/5" : "border-input bg-background"} px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors`;

  const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-sm font-medium text-foreground mb-1.5">
      {children}
      {required
        ? <span className="text-destructive ml-1">*</span>
        : <span className="text-muted-foreground text-xs ml-1">(optionnel)</span>}
    </label>
  );

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? <p className="mt-1 text-xs text-destructive">{msg}</p> : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-card shadow-2xl border border-border max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Nouvelle entreprise</h2>
              <p className="text-xs text-muted-foreground">Les champs marqués * sont obligatoires</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Success */}
        {success && (
          <div className="mx-6 mt-4 flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Server error */}
        {serverError && (
          <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
            <p className="text-sm text-destructive">{serverError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-6">

          {/* Section 1 — Informations générales */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Informations générales</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-4">
              <div>
                <Label required>Dénomination sociale</Label>
                <input
                  className={inputCls(fieldErrors.nom)}
                  value={form.nom}
                  onChange={set("nom")}
                  placeholder="Ex : Acme SAS"
                />
                <FieldError msg={fieldErrors.nom} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>SIREN</Label>
                  <input
                    className={inputCls(fieldErrors.siren)}
                    value={form.siren}
                    onChange={set("siren")}
                    placeholder="9 chiffres"
                    maxLength={9}
                    inputMode="numeric"
                  />
                  <FieldError msg={fieldErrors.siren} />
                </div>
                <div>
                  <Label>SIRET</Label>
                  <input
                    className={inputCls(fieldErrors.siret)}
                    value={form.siret}
                    onChange={set("siret")}
                    placeholder="14 chiffres"
                    maxLength={14}
                    inputMode="numeric"
                  />
                  <FieldError msg={fieldErrors.siret} />
                </div>
              </div>
              <div>
                <Label>N° TVA intracommunautaire</Label>
                <input
                  className={inputCls(fieldErrors.numero_tva)}
                  value={form.numero_tva}
                  onChange={set("numero_tva")}
                  placeholder="FR12345678901"
                  maxLength={13}
                />
                <FieldError msg={fieldErrors.numero_tva} />
              </div>
            </div>
          </div>

          {/* Section 2 — Coordonnées */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Coordonnées</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-4">
              <div>
                <Label>Adresse</Label>
                <input
                  className={inputCls()}
                  value={form.adresse}
                  onChange={set("adresse")}
                  placeholder="12 rue de la Paix"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Code postal</Label>
                  <input
                    className={inputCls(fieldErrors.code_postal)}
                    value={form.code_postal}
                    onChange={set("code_postal")}
                    placeholder="75001"
                    maxLength={5}
                    inputMode="numeric"
                  />
                  <FieldError msg={fieldErrors.code_postal} />
                </div>
                <div>
                  <Label>Ville</Label>
                  <input
                    className={inputCls()}
                    value={form.ville}
                    onChange={set("ville")}
                    placeholder="Paris"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email entreprise</Label>
                  <input
                    type="email"
                    className={inputCls(fieldErrors.email)}
                    value={form.email}
                    onChange={set("email")}
                    placeholder="contact@entreprise.fr"
                  />
                  <FieldError msg={fieldErrors.email} />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <input
                    className={inputCls(fieldErrors.telephone)}
                    value={form.telephone}
                    onChange={set("telephone")}
                    placeholder="0612345678"
                    inputMode="tel"
                  />
                  <FieldError msg={fieldErrors.telephone} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 — Politique de recharge */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Politique de recharge</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div>
              <Label>Prix par défaut du kWh (€)</Label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="5"
                  className={`${inputCls(fieldErrors.prix_kwh_defaut)} max-w-[160px]`}
                  value={form.prix_kwh_defaut}
                  onChange={set("prix_kwh_defaut")}
                />
                <p className="text-xs text-muted-foreground">Tarif moyen en France : 0,21 €/kWh</p>
              </div>
              <FieldError msg={fieldErrors.prix_kwh_defaut} />
            </div>
          </div>

          {/* Section 4 — Compte gestionnaire */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Compte gestionnaire</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex items-start gap-2 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <User className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Un compte sera créé automatiquement. Le gestionnaire recevra ses identifiants par email.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <Label required>Nom complet</Label>
                <input
                  className={inputCls(fieldErrors.manager_full_name)}
                  value={form.manager_full_name}
                  onChange={set("manager_full_name")}
                  placeholder="Prénom Nom"
                />
                <FieldError msg={fieldErrors.manager_full_name} />
              </div>
              <div>
                <Label required>Adresse email</Label>
                <input
                  type="email"
                  className={inputCls(fieldErrors.manager_email)}
                  value={form.manager_email}
                  onChange={set("manager_email")}
                  placeholder="gestionnaire@entreprise.fr"
                />
                <FieldError msg={fieldErrors.manager_email} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !!success}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Création en cours...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Créée !
                </>
              ) : (
                <>
                  Créer l'entreprise
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
