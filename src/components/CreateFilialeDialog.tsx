import { useState, useEffect } from "react";
import { X, Building2, User as UserIcon, ChevronRight, CheckCircle2, FileText, MapPin, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import PhoneInput, { isValidPhone } from "./PhoneInput";
import AddressAutocomplete, { type AddressValue } from "./AddressAutocomplete";

interface Entreprise {
  id: string;
  nom: string;
}

interface ExistingFiliale {
  id: string;
  nom: string;
  entreprise_id: string;
  siret?: string | null;
  numero_tva?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  entrepriseId?: string | null;
  isSuperadmin?: boolean;
  /** Si fourni, le dialog passe en mode édition (PATCH au lieu de POST). */
  editing?: ExistingFiliale | null;
}

interface FormErrors {
  nom?: string;
  entreprise_id?: string;
  siret?: string;
  numero_tva?: string;
  telephone?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  manager_email?: string;
  manager_full_name?: string;
}

const INITIAL_FORM = {
  nom: "",
  entreprise_id: "",
  // Identité légale + coordonnées (CDC §3.3.1)
  siret: "",
  numero_tva: "",
  telephone: "",
  adresse: "",
  code_postal: "",
  ville: "",
  // Gestionnaire (optionnel)
  manager_full_name: "",
  manager_email: "",
};

function validate(form: typeof INITIAL_FORM, withManager: boolean, isSuperadmin: boolean): FormErrors {
  const errors: FormErrors = {};
  if (!form.nom.trim()) errors.nom = "Le nom de la filiale est requis.";
  if (isSuperadmin && !form.entreprise_id) errors.entreprise_id = "Sélectionnez une entreprise.";

  // B2B obligatoires
  if (!form.siret.trim()) errors.siret = "Le SIRET est requis.";
  else if (!/^\d{14}$/.test(form.siret)) errors.siret = "Le SIRET doit contenir exactement 14 chiffres.";

  if (form.numero_tva && !/^FR\d{11}$/.test(form.numero_tva))
    errors.numero_tva = "Format : FR + 11 chiffres.";

  if (!form.telephone.trim()) errors.telephone = "Le téléphone est requis.";
  else if (!isValidPhone(form.telephone))
    errors.telephone = "Numéro de téléphone invalide pour le pays sélectionné.";

  if (!form.adresse.trim()) errors.adresse = "L'adresse est requise.";
  if (!form.code_postal.trim()) errors.code_postal = "Le code postal est requis.";
  else if (!/^\d{5}$/.test(form.code_postal)) errors.code_postal = "5 chiffres requis.";
  if (!form.ville.trim()) errors.ville = "La ville est requise.";

  if (withManager) {
    if (!form.manager_full_name.trim())
      errors.manager_full_name = "Le nom complet du gestionnaire est requis.";
    if (!form.manager_email) errors.manager_email = "L'email du gestionnaire est requis.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.manager_email))
      errors.manager_email = "Adresse email invalide.";
  }
  return errors;
}

export default function CreateFilialeDialog({ open, onClose, onCreated, entrepriseId, isSuperadmin = false, editing = null }: Props) {
  const isEditMode = !!editing;
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [form, setForm] = useState(INITIAL_FORM);
  const [withManager, setWithManager] = useState(false);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        ...INITIAL_FORM,
        nom: editing.nom || "",
        entreprise_id: editing.entreprise_id || "",
        siret: editing.siret || "",
        numero_tva: editing.numero_tva || "",
        telephone: editing.telephone || "",
        adresse: editing.adresse || "",
        code_postal: editing.code_postal || "",
        ville: editing.ville || "",
      });
    } else {
      setForm({ ...INITIAL_FORM, entreprise_id: entrepriseId ?? "" });
    }
    setFieldErrors({});
    setServerError(null);
    setSuccess(null);
    setWithManager(false);
    if (isSuperadmin) {
      api.entreprises.list().then(setEntreprises).catch(console.error);
    }
  }, [open, entrepriseId, isSuperadmin, editing]);

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

    const errs = validate(form, withManager, isSuperadmin);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        nom: form.nom.trim(),
        siret: form.siret.trim(),
        numero_tva: form.numero_tva.trim() || null,
        telephone: form.telephone.trim(),
        adresse: form.adresse.trim(),
        code_postal: form.code_postal.trim(),
        ville: form.ville.trim(),
      };

      let result;
      if (isEditMode && editing) {
        result = await api.filiales.update(editing.id, payload);
        setSuccess(`Filiale "${result.nom}" mise à jour.`);
      } else {
        result = await api.filiales.create({
          ...payload,
          entreprise_id: form.entreprise_id || entrepriseId,
          manager_email: withManager ? form.manager_email : null,
          manager_full_name: withManager ? form.manager_full_name.trim() : null,
        });
        setSuccess(`Filiale "${result.nom}" créée${withManager ? ". Email envoyé au gestionnaire." : "."}`);
      }

      onCreated();
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 2500);
    } catch (err: any) {
      const msg = err.message || "Erreur lors de la création de la filiale.";
      if (msg.toLowerCase().includes("siret"))
        setFieldErrors(fe => ({ ...fe, siret: "Ce SIRET est déjà utilisé." }));
      else if (msg.toLowerCase().includes("email") && withManager)
        setFieldErrors(fe => ({ ...fe, manager_email: msg }));
      else
        setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (err?: string) =>
    `w-full rounded-xl border ${err ? "border-destructive bg-destructive/5" : "border-input bg-background"} px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-primary/[0.02] hover:border-input/80 transition-all`;

  const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-sm font-medium text-foreground mb-1.5">
      {children}
      {required ? <span className="text-destructive ml-1">*</span> : <span className="text-muted-foreground text-xs ml-1 font-normal">(optionnel)</span>}
    </label>
  );
  const FieldError = ({ msg }: { msg?: string }) => msg ? <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive"><span className="inline-block h-1 w-1 rounded-full bg-destructive" /> {msg}</p> : null;

  const SectionTitle = ({ children, Icon }: { children: React.ReactNode; Icon: React.ComponentType<{ className?: string }> }) => (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-card shadow-2xl shadow-primary/5 border border-border/60 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="relative flex items-center justify-between px-7 py-5 border-b border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-card shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-md" />
              <div className="relative h-11 w-11 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
                {isEditMode ? "Modifier la filiale" : "Nouvelle filiale"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isEditMode ? "Modifier les informations de la filiale" : "Les champs marqués * sont obligatoires"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {success && (
          <div className="mx-7 mt-5 flex items-start gap-3 p-4 bg-chargiz-teal/10 border border-chargiz-teal/30 rounded-2xl">
            <CheckCircle2 className="h-5 w-5 text-chargiz-teal shrink-0 mt-0.5" />
            <p className="text-sm text-chargiz-teal">{success}</p>
          </div>
        )}

        {serverError && (
          <div className="mx-7 mt-5 flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-2xl">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/20">
              <span className="h-2 w-2 rounded-full bg-destructive" />
            </span>
            <p className="text-sm text-destructive">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="overflow-y-auto px-7 py-5 space-y-5">
          {/* Section 1 — Identification */}
          <div className="rounded-2xl border border-border/40 bg-muted/20 p-5">
            <SectionTitle Icon={FileText}>Identification</SectionTitle>
            <div className="space-y-4">
              {isSuperadmin && (
                <div>
                  <Label required>Entreprise</Label>
                  <select className={inputCls(fieldErrors.entreprise_id)} value={form.entreprise_id} onChange={set("entreprise_id")}>
                    <option value="">Sélectionner...</option>
                    {entreprises.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                  <FieldError msg={fieldErrors.entreprise_id} />
                </div>
              )}
              <div>
                <Label required>Nom de la filiale</Label>
                <input className={inputCls(fieldErrors.nom)} value={form.nom} onChange={set("nom")} placeholder="Ex : Acme Région Nord" />
                <FieldError msg={fieldErrors.nom} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required>SIRET</Label>
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
                <div>
                  <Label>N° TVA</Label>
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
          </div>

          {/* Section 2 — Coordonnées (autocomplétion adresse via BAN data.gouv.fr) */}
          <div className="rounded-2xl border border-border/40 bg-muted/20 p-5">
            <SectionTitle Icon={MapPin}>Coordonnées</SectionTitle>
            <div className="space-y-4">
              <AddressAutocomplete
                required
                hideCountry
                value={{
                  pays_code: "FR",
                  adresse: form.adresse,
                  code_postal: form.code_postal,
                  ville: form.ville,
                  latitude: null,
                  longitude: null,
                }}
                onChange={(v: AddressValue) => {
                  setForm(f => ({ ...f, adresse: v.adresse, code_postal: v.code_postal, ville: v.ville }));
                  setFieldErrors(fe => ({ ...fe, adresse: undefined, code_postal: undefined, ville: undefined }));
                }}
              />
              {(fieldErrors.adresse || fieldErrors.code_postal || fieldErrors.ville) && (
                <div className="space-y-1">
                  <FieldError msg={fieldErrors.adresse} />
                  <FieldError msg={fieldErrors.code_postal} />
                  <FieldError msg={fieldErrors.ville} />
                </div>
              )}
              <div>
                <Label required>Téléphone</Label>
                <PhoneInput
                  value={form.telephone}
                  onChange={(e164) => {
                    setForm(f => ({ ...f, telephone: e164 }));
                    if (fieldErrors.telephone) setFieldErrors(fe => ({ ...fe, telephone: undefined }));
                  }}
                  defaultCountry="FR"
                  required
                  hasError={!!fieldErrors.telephone}
                />
                <FieldError msg={fieldErrors.telephone} />
              </div>
            </div>
          </div>

          {/* Section 3 — Compte gestionnaire (uniquement à la création) */}
          {!isEditMode && (
          <div className="rounded-2xl border border-border/40 bg-muted/20 p-5">
            <SectionTitle Icon={UserIcon}>Compte gestionnaire</SectionTitle>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={withManager} onChange={e => setWithManager(e.target.checked)} className="h-4 w-4 rounded border-input text-primary focus:ring-primary/30" />
              <span className="text-sm text-foreground">Créer un compte gestionnaire pour cette filiale</span>
            </label>
            {withManager && (
              <>
                <div className="flex items-start gap-2 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">Le gestionnaire de filiale recevra ses identifiants par email et pourra gérer les sites et collaborateurs de cette filiale.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label required>Nom complet</Label>
                    <input className={inputCls(fieldErrors.manager_full_name)} value={form.manager_full_name} onChange={set("manager_full_name")} placeholder="Prénom Nom" />
                    <FieldError msg={fieldErrors.manager_full_name} />
                  </div>
                  <div>
                    <Label required>Adresse email</Label>
                    <input type="email" className={inputCls(fieldErrors.manager_email)} value={form.manager_email} onChange={set("manager_email")} placeholder="gestionnaire@filiale.fr" />
                    <FieldError msg={fieldErrors.manager_email} />
                  </div>
                </div>
              </>
            )}
          </div>
          )}

        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-7 py-4 border-t border-border/60 bg-muted/20 shrink-0">
          <button type="button" onClick={onClose} disabled={loading} className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors">Annuler</button>
          <button type="submit" onClick={handleSubmit as any} disabled={loading || !!success} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all">
            {loading ? (<><Loader2 className="h-4 w-4 animate-spin" />{isEditMode ? "Enregistrement…" : "Création…"}</>)
            : success ? (<><CheckCircle2 className="h-4 w-4" />{isEditMode ? "Enregistré !" : "Créée !"}</>)
            : (<>{isEditMode ? "Enregistrer" : "Créer la filiale"}<ChevronRight className="h-4 w-4" /></>)}
          </button>
        </div>
      </div>
    </div>
  );
}
