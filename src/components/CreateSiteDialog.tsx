import { useState, useEffect } from "react";
import { X, MapPin, User as UserIcon, ChevronRight, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

interface Filiale {
  id: string;
  nom: string;
  entreprise_id: string;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Pre-selected filiale (when called from a filiale-scoped manager) */
  filialeId?: string | null;
  /** Optional list of selectable filiales for entreprise/superadmin */
  selectableFiliales?: Filiale[];
}

interface FormErrors {
  nom?: string;
  filiale_id?: string;
  code_postal?: string;
  siret?: string;
  responsable_email?: string;
  responsable_telephone?: string;
  manager_email?: string;
  manager_full_name?: string;
}

const INITIAL_FORM = {
  nom: "",
  filiale_id: "",
  adresse: "",
  code_postal: "",
  ville: "",
  siret: "",
  responsable_nom: "",
  responsable_prenom: "",
  responsable_email: "",
  responsable_telephone: "",
  manager_full_name: "",
  manager_email: "",
};

function validate(form: typeof INITIAL_FORM, withManager: boolean, fixedFiliale: boolean): FormErrors {
  const errors: FormErrors = {};
  if (!form.nom.trim()) errors.nom = "Le nom du site est requis.";
  if (!fixedFiliale && !form.filiale_id) errors.filiale_id = "Sélectionnez une filiale.";
  if (form.code_postal && !/^\d{5}$/.test(form.code_postal))
    errors.code_postal = "Le code postal doit contenir 5 chiffres.";
  if (form.siret && !/^\d{14}$/.test(form.siret))
    errors.siret = "Le SIRET doit contenir 14 chiffres.";
  if (form.responsable_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.responsable_email))
    errors.responsable_email = "Adresse email invalide.";
  if (form.responsable_telephone && !/^(\+33|0)[1-9](\d{8})$/.test(form.responsable_telephone.replace(/\s/g, "")))
    errors.responsable_telephone = "Numéro invalide (ex: 0612345678).";

  if (withManager) {
    if (!form.manager_full_name.trim())
      errors.manager_full_name = "Le nom complet du gestionnaire est requis.";
    if (!form.manager_email)
      errors.manager_email = "L'email du gestionnaire est requis.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.manager_email))
      errors.manager_email = "Adresse email invalide.";
  }
  return errors;
}

export default function CreateSiteDialog({ open, onClose, onCreated, filialeId, selectableFiliales }: Props) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [form, setForm] = useState(INITIAL_FORM);
  const [withManager, setWithManager] = useState(false);
  const [filiales, setFiliales] = useState<Filiale[]>([]);

  const fixedFiliale = !!filialeId;

  useEffect(() => {
    if (!open) return;
    setForm({ ...INITIAL_FORM, filiale_id: filialeId ?? "" });
    setFieldErrors({});
    setServerError(null);
    setSuccess(null);
    setWithManager(false);
    if (selectableFiliales) {
      setFiliales(selectableFiliales.filter(f => f.is_active));
    } else if (!fixedFiliale) {
      api.filiales.list().then(setFiliales).catch(console.error);
    }
  }, [open, filialeId, fixedFiliale, selectableFiliales]);

  if (!open) return null;

  const set = (field: keyof typeof INITIAL_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (fieldErrors[field as keyof FormErrors]) {
      setFieldErrors(fe => ({ ...fe, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccess(null);

    const errs = validate(form, withManager, fixedFiliale);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const created = await api.sites.create({
        filiale_id: form.filiale_id || filialeId,
        nom: form.nom.trim(),
        adresse: form.adresse || null,
        code_postal: form.code_postal || null,
        ville: form.ville || null,
        siret: form.siret || null,
        responsable_nom: form.responsable_nom || null,
        responsable_prenom: form.responsable_prenom || null,
        responsable_email: form.responsable_email || null,
        responsable_telephone: form.responsable_telephone || null,
        manager_email: withManager ? form.manager_email : null,
        manager_full_name: withManager ? form.manager_full_name.trim() : null,
      });
      setSuccess(`Site "${created.nom}" créé${withManager ? ". Email envoyé au gestionnaire." : "."}`);
      onCreated();
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 2500);
    } catch (err: any) {
      const msg = err.message || "Erreur lors de la création du site.";
      if (msg.toLowerCase().includes("email"))
        setFieldErrors(fe => ({ ...fe, manager_email: msg }));
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
      {required ? <span className="text-destructive ml-1">*</span> : <span className="text-muted-foreground text-xs ml-1">(optionnel)</span>}
    </label>
  );
  const FieldError = ({ msg }: { msg?: string }) => msg ? <p className="mt-1 text-xs text-destructive">{msg}</p> : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-card shadow-2xl border border-border max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Nouveau site</h2>
              <p className="text-xs text-muted-foreground">Les champs marqués * sont obligatoires</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {success && (
          <div className="mx-6 mt-4 flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}
        {serverError && (
          <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
            <p className="text-sm text-destructive">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Site</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-4">
              {!fixedFiliale && (
                <div>
                  <Label required>Filiale</Label>
                  <select className={inputCls(fieldErrors.filiale_id)} value={form.filiale_id} onChange={set("filiale_id")}>
                    <option value="">Sélectionner une filiale...</option>
                    {filiales.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                  <FieldError msg={fieldErrors.filiale_id} />
                </div>
              )}
              <div>
                <Label required>Nom du site</Label>
                <input className={inputCls(fieldErrors.nom)} value={form.nom} onChange={set("nom")} placeholder="Ex : Site Lyon Part-Dieu" />
                <FieldError msg={fieldErrors.nom} />
              </div>
              <div>
                <Label>Adresse</Label>
                <input className={inputCls()} value={form.adresse} onChange={set("adresse")} placeholder="12 rue de la Paix" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Code postal</Label>
                  <input className={inputCls(fieldErrors.code_postal)} value={form.code_postal} onChange={set("code_postal")} placeholder="69003" maxLength={5} inputMode="numeric" />
                  <FieldError msg={fieldErrors.code_postal} />
                </div>
                <div>
                  <Label>Ville</Label>
                  <input className={inputCls()} value={form.ville} onChange={set("ville")} placeholder="Lyon" />
                </div>
              </div>
              <div>
                <Label>SIRET</Label>
                <input className={inputCls(fieldErrors.siret)} value={form.siret} onChange={set("siret")} placeholder="14 chiffres" maxLength={14} inputMode="numeric" />
                <FieldError msg={fieldErrors.siret} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Responsable - Prénom</Label>
                  <input className={inputCls()} value={form.responsable_prenom} onChange={set("responsable_prenom")} />
                </div>
                <div>
                  <Label>Responsable - Nom</Label>
                  <input className={inputCls()} value={form.responsable_nom} onChange={set("responsable_nom")} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email responsable</Label>
                  <input type="email" className={inputCls(fieldErrors.responsable_email)} value={form.responsable_email} onChange={set("responsable_email")} placeholder="contact@site.fr" />
                  <FieldError msg={fieldErrors.responsable_email} />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <input className={inputCls(fieldErrors.responsable_telephone)} value={form.responsable_telephone} onChange={set("responsable_telephone")} placeholder="0612345678" />
                  <FieldError msg={fieldErrors.responsable_telephone} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gestionnaire de site</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={withManager} onChange={e => setWithManager(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm text-foreground">Créer un compte gestionnaire pour ce site</span>
            </label>
            {withManager && (
              <>
                <div className="flex items-start gap-2 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <UserIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">Le gestionnaire de site recevra ses identifiants par email et pourra gérer les collaborateurs de ce site.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label required>Nom complet</Label>
                    <input className={inputCls(fieldErrors.manager_full_name)} value={form.manager_full_name} onChange={set("manager_full_name")} placeholder="Prénom Nom" />
                    <FieldError msg={fieldErrors.manager_full_name} />
                  </div>
                  <div>
                    <Label required>Adresse email</Label>
                    <input type="email" className={inputCls(fieldErrors.manager_email)} value={form.manager_email} onChange={set("manager_email")} placeholder="gestionnaire@site.fr" />
                    <FieldError msg={fieldErrors.manager_email} />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 pb-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">Annuler</button>
            <button type="submit" disabled={loading || !!success} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {loading ? (<><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Création...</>)
              : success ? (<><CheckCircle2 className="h-4 w-4" />Créé !</>)
              : (<>Créer le site<ChevronRight className="h-4 w-4" /></>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
