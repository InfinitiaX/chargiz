import { useState, useEffect, useRef } from "react";
import { X, Building2, User, ChevronRight, Search, Loader2, FileText, MapPin, Zap, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import AddressAutocomplete, { type AddressValue } from "./AddressAutocomplete";
import PhoneInput, { isValidPhone } from "./PhoneInput";

// BugID — Autocomplétion nom d'entreprise via l'annuaire officiel data.gouv.fr.
// Gratuit, sans clé, source SIRENE/INSEE. Renvoie SIREN/SIRET/adresse complète.
// Doc : https://recherche-entreprises.api.gouv.fr/docs/
interface RechercheEntrepriseResult {
  siren: string;
  nom_complet: string;
  nom_raison_sociale?: string;
  siege?: {
    siret?: string;
    adresse?: string;
    code_postal?: string;
    libelle_commune?: string;
    numero_tva_intra?: string;
  };
}
async function searchEntreprisesFR(query: string): Promise<RechercheEntrepriseResult[]> {
  if (!query || query.trim().length < 3) return [];
  try {
    const r = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&page=1&per_page=8`,
    );
    if (!r.ok) return [];
    const d = await r.json();
    return d.results || [];
  } catch {
    return [];
  }
}

/**
 * Calcul du n° de TVA intracommunautaire français à partir du SIREN.
 * Algorithme officiel INSEE — déterministe pour toute entreprise française.
 * Référence : https://www.insee.fr/fr/information/2406147
 *
 *   cle = (12 + 3 × (SIREN mod 97)) mod 97
 *   TVA = "FR" + cle(2 chiffres, zero-padded) + SIREN(9 chiffres)
 *
 * Ex : SIREN 552 120 222 → cle = (12 + 3 × (552120222 % 97)) % 97 = 40 → "FR40552120222"
 */
function computeTvaFromSiren(siren: string): string | null {
  const clean = (siren || "").replace(/\s/g, "");
  if (!/^\d{9}$/.test(clean)) return null;
  const sirenInt = parseInt(clean, 10);
  const cle = (12 + 3 * (sirenInt % 97)) % 97;
  return `FR${String(cle).padStart(2, "0")}${clean}`;
}

interface ExistingEntreprise {
  id: string;
  nom: string;
  siren?: string | null;
  siret?: string | null;
  numero_tva?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  email?: string | null;
  telephone?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Si fourni, le dialog passe en mode édition (PATCH au lieu de POST). */
  editing?: ExistingEntreprise | null;
}

interface FormErrors {
  nom?: string;
  siren?: string;
  siret?: string;
  numero_tva?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
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

function validate(form: typeof INITIAL_FORM, isEditMode: boolean): FormErrors {
  const errors: FormErrors = {};

  // Identification entreprise
  if (!form.nom.trim()) errors.nom = "La dénomination est requise.";

  if (!form.siren.trim()) errors.siren = "Le SIREN est requis.";
  else if (!/^\d{9}$/.test(form.siren))
    errors.siren = "Le SIREN doit contenir exactement 9 chiffres.";

  // SIRET reste optionnel mais valide si renseigné
  if (form.siret) {
    if (!/^\d{14}$/.test(form.siret))
      errors.siret = "Le SIRET doit contenir exactement 14 chiffres.";
    else if (form.siren && !form.siret.startsWith(form.siren))
      errors.siret = "Le SIRET doit commencer par le SIREN.";
  }

  // TVA reste optionnel (auto-entrepreneurs, assos, etc.)
  if (form.numero_tva && !/^FR\d{11}$/.test(form.numero_tva))
    errors.numero_tva = "Format attendu : FR + 11 chiffres (ex: FR12345678901).";

  // Email entreprise optionnel
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = "Adresse email invalide.";

  // BugID_036 — Téléphone : validation via PhoneInput (format international par pays).
  // La valeur stockée est en E.164 (`+33612345678`), validée par isValidPhone.
  if (!form.telephone.trim()) errors.telephone = "Le téléphone est requis.";
  else if (!isValidPhone(form.telephone))
    errors.telephone = "Numéro de téléphone invalide pour le pays sélectionné.";

  // Coordonnées postales obligatoires
  if (!form.adresse.trim()) errors.adresse = "L'adresse est requise.";

  if (!form.code_postal.trim()) errors.code_postal = "Le code postal est requis.";
  else if (!/^\d{5}$/.test(form.code_postal))
    errors.code_postal = "Le code postal doit contenir 5 chiffres.";

  if (!form.ville.trim()) errors.ville = "La ville est requise.";

  // Politique recharge
  const kwh = parseFloat(form.prix_kwh_defaut);
  if (isNaN(kwh) || kwh < 0 || kwh > 5)
    errors.prix_kwh_defaut = "Valeur entre 0 et 5 €/kWh.";

  // Gestionnaire — uniquement à la création (pas en mode édition)
  if (!isEditMode) {
    if (!form.manager_full_name.trim())
      errors.manager_full_name = "Le nom du gestionnaire est requis.";

    if (!form.manager_email)
      errors.manager_email = "L'email du gestionnaire est requis.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.manager_email))
      errors.manager_email = "Adresse email invalide.";
    else if (form.email && form.manager_email === form.email)
      errors.manager_email = "L'email du gestionnaire doit être différent de l'email de l'entreprise.";
  }

  return errors;
}

export default function CreateEntrepriseDialog({ open, onClose, onCreated, editing = null }: Props) {
  const isEditMode = !!editing;
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [form, setForm] = useState(INITIAL_FORM);

  // Autocomplete nom d'entreprise (France)
  const [nomSuggestions, setNomSuggestions] = useState<RechercheEntrepriseResult[]>([]);
  const [nomLoading, setNomLoading] = useState(false);
  const [nomOpen, setNomOpen] = useState(false);
  const nomDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        ...INITIAL_FORM,
        nom: editing.nom || "",
        siren: editing.siren || "",
        siret: editing.siret || "",
        numero_tva: editing.numero_tva || "",
        adresse: editing.adresse || "",
        code_postal: editing.code_postal || "",
        ville: editing.ville || "",
        email: editing.email || "",
        telephone: editing.telephone || "",
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setFieldErrors({});
    setServerError(null);
    setNomSuggestions([]);
    setNomOpen(false);
    setNomLoading(false);
  }, [open, editing]);

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

    const errors = validate(form, isEditMode);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        nom: form.nom.trim(),
        siren: form.siren.trim(),
        adresse: form.adresse.trim(),
        code_postal: form.code_postal.trim(),
        ville: form.ville.trim(),
        telephone: form.telephone.trim(),
        siret: form.siret || null,
        numero_tva: form.numero_tva || null,
        email: form.email || null,
      };

      let response: { nom: string };
      if (isEditMode && editing) {
        response = await apiFetch<{ nom: string }>(`/api/entreprises/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Entreprise mise à jour", {
          description: `« ${response.nom} » a été modifiée avec succès.`,
          duration: 5000,
        });
      } else {
        response = await apiFetch<{ nom: string }>("/api/entreprises", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            manager_email: form.manager_email,
            manager_full_name: form.manager_full_name.trim(),
            prix_kwh_defaut: parseFloat(form.prix_kwh_defaut) || 0.21,
          }),
        });
        toast.success("Entreprise créée avec succès", {
          description: `« ${response.nom} » a été ajoutée. Le gestionnaire recevra ses identifiants de connexion par email.`,
          duration: 7000,
        });
      }

      setForm(INITIAL_FORM);
      setFieldErrors({});
      onCreated();
      onClose();
    } catch (err: any) {
      const msg = err.message || "Erreur lors de l'enregistrement de l'entreprise.";
      if (msg.toLowerCase().includes("siren"))
        setFieldErrors(fe => ({ ...fe, siren: "Ce SIREN est déjà utilisé." }));
      else if (!isEditMode && (msg.toLowerCase().includes("email") || msg.toLowerCase().includes("username")))
        setFieldErrors(fe => ({ ...fe, manager_email: "Cet email gestionnaire est déjà utilisé." }));
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
      {required
        ? <span className="text-destructive ml-1">*</span>
        : <span className="text-muted-foreground text-xs ml-1 font-normal">(optionnel)</span>}
    </label>
  );

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive"><span className="inline-block h-1 w-1 rounded-full bg-destructive" /> {msg}</p> : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-card shadow-2xl shadow-primary/5 border border-border/60 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200">

        {/* Header avec dégradé subtil */}
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
                {isEditMode ? "Modifier l'entreprise" : "Nouvelle entreprise"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isEditMode ? "Modifier les informations de l'entreprise" : "Les champs marqués * sont obligatoires"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Server error */}
        {serverError && (
          <div className="mx-7 mt-5 flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-2xl">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/20">
              <span className="h-2 w-2 rounded-full bg-destructive" />
            </span>
            <p className="text-sm text-destructive">{serverError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-7 py-5 space-y-5">

          {/* Section 1 — Informations générales */}
          <div className="rounded-2xl border border-border/40 bg-muted/20 p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">Informations générales</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label required>Dénomination sociale</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    className={`${inputCls(fieldErrors.nom)} pl-10`}
                    value={form.nom}
                    onChange={e => {
                      const v = e.target.value;
                      setForm(f => ({ ...f, nom: v }));
                      if (fieldErrors.nom) setFieldErrors(fe => ({ ...fe, nom: undefined }));
                      // Lance l'autocomplete (debounced)
                      if (nomDebounceRef.current) window.clearTimeout(nomDebounceRef.current);
                      if (v.trim().length < 3) {
                        setNomSuggestions([]);
                        setNomOpen(false);
                        return;
                      }
                      setNomLoading(true);
                      setNomOpen(true);
                      nomDebounceRef.current = window.setTimeout(async () => {
                        const results = await searchEntreprisesFR(v);
                        setNomSuggestions(results);
                        setNomLoading(false);
                      }, 300);
                    }}
                    onFocus={() => nomSuggestions.length > 0 && setNomOpen(true)}
                    onBlur={() => window.setTimeout(() => setNomOpen(false), 200)}
                    placeholder="Tapez le nom de l'entreprise (3 lettres min.)"
                    autoComplete="off"
                  />
                  {nomLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}

                  {nomOpen && nomSuggestions.length > 0 && (
                    <ul className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                      {nomSuggestions.map(r => (
                        <li key={r.siren}>
                          <button
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              const s = r.siege || {};
                              // TVA calculée depuis le SIREN (algo INSEE) ; fallback si l'API renvoie un champ
                              const tva = s.numero_tva_intra || computeTvaFromSiren(r.siren) || "";
                              setForm(f => ({
                                ...f,
                                nom: r.nom_raison_sociale || r.nom_complet || f.nom,
                                siren: r.siren || f.siren,
                                siret: s.siret || f.siret,
                                numero_tva: tva || f.numero_tva,
                                adresse: s.adresse || f.adresse,
                                code_postal: s.code_postal || f.code_postal,
                                ville: s.libelle_commune || f.ville,
                              }));
                              setFieldErrors(fe => ({
                                ...fe,
                                nom: undefined, siren: undefined, siret: undefined,
                                adresse: undefined, code_postal: undefined, ville: undefined,
                              }));
                              setNomOpen(false);
                              setNomSuggestions([]);
                              toast.success("Entreprise pré-remplie depuis l'annuaire data.gouv.fr", {
                                description: `SIREN ${r.siren} · vérifiez les informations avant validation.`,
                                duration: 4000,
                              });
                            }}
                            className="block w-full text-left px-3 py-2 hover:bg-muted/50 border-b border-border/40 last:border-b-0"
                          >
                            <span className="block text-sm font-medium text-foreground">
                              {r.nom_raison_sociale || r.nom_complet}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              SIREN {r.siren}
                              {r.siege?.libelle_commune ? ` · ${r.siege.libelle_commune}` : ""}
                              {r.siege?.code_postal ? ` (${r.siege.code_postal})` : ""}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <FieldError msg={fieldErrors.nom} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required>SIREN</Label>
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

          {/* Section 2 — Coordonnées (BugID_007 — autocomplétion adresse) */}
          <div className="rounded-2xl border border-border/40 bg-muted/20 p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">Coordonnées</h3>
            </div>
            <div className="space-y-4">
              <AddressAutocomplete
                required
                value={{
                  pays_code: "FR",
                  adresse: form.adresse,
                  code_postal: form.code_postal,
                  ville: form.ville,
                  latitude: null,
                  longitude: null,
                }}
                onChange={(v: AddressValue) => {
                  setForm(f => ({
                    ...f,
                    adresse: v.adresse,
                    code_postal: v.code_postal,
                    ville: v.ville,
                  }));
                  // Efface les erreurs au fur et à mesure
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
          </div>

          {/* Section 3 — Politique de recharge */}
          <div className="rounded-2xl border border-border/40 bg-muted/20 p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">Politique de recharge</h3>
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

          {/* Section 4 — Compte gestionnaire (uniquement à la création) */}
          {!isEditMode && (
          <div className="rounded-2xl border border-border/40 bg-muted/20 p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">Compte gestionnaire</h3>
            </div>
            <div className="flex items-start gap-2 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
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
          )}

        </form>

        {/* Footer collé en bas (en dehors du form pour éviter le scroll) */}
        <div className="flex justify-end gap-3 px-7 py-4 border-t border-border/60 bg-muted/20 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            onClick={handleSubmit as any}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-sm disabled:hover:brightness-100 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEditMode ? "Enregistrement…" : "Création en cours…"}
              </>
            ) : (
              <>
                {isEditMode ? "Enregistrer" : "Créer l'entreprise"}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
