import { useEffect, useMemo, useRef, useState } from "react";
import { Phone, ChevronDown } from "lucide-react";

/**
 * BugID_036 — Téléphone avec sélecteur de code pays + validation par pays.
 *
 * UX :
 *  - Dropdown à gauche : code pays ISO + indicatif (ex « FR +33 »)
 *  - Input à droite : numéro national (sans le 0 initial)
 *  - Stockage interne : format international E.164 (ex `+33612345678`)
 *
 * Le composant accepte aussi un format national à l'entrée (ex `0612345678`)
 * et le normalise au blur en E.164 selon le pays sélectionné.
 *
 * Couverture : UE + UK + CH + NO — aligné avec la liste pays de l'EV database (CDC §5.7).
 */

export interface PhoneCountry {
  code: string;         // ISO 3166-1 alpha-2
  label: string;        // nom français
  dial: string;         // indicatif sans le "+"
  /** Regex sur le numéro NATIONAL (sans indicatif, sans 0 initial). */
  nationalRegex: RegExp;
  /** Longueur attendue du numéro national (chiffres uniquement). */
  nationalLen: number | [number, number];
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "FR", label: "France",          dial: "33",  nationalRegex: /^[1-9]\d{8}$/,        nationalLen: 9 },
  { code: "BE", label: "Belgique",        dial: "32",  nationalRegex: /^[1-9]\d{7,8}$/,      nationalLen: [8, 9] },
  { code: "LU", label: "Luxembourg",      dial: "352", nationalRegex: /^[1-9]\d{5,10}$/,     nationalLen: [6, 11] },
  { code: "DE", label: "Allemagne",       dial: "49",  nationalRegex: /^[1-9]\d{6,11}$/,     nationalLen: [7, 12] },
  { code: "CH", label: "Suisse",          dial: "41",  nationalRegex: /^[1-9]\d{8}$/,        nationalLen: 9 },
  { code: "ES", label: "Espagne",         dial: "34",  nationalRegex: /^[6-9]\d{8}$/,        nationalLen: 9 },
  { code: "IT", label: "Italie",          dial: "39",  nationalRegex: /^\d{9,10}$/,          nationalLen: [9, 10] },
  { code: "PT", label: "Portugal",        dial: "351", nationalRegex: /^[1-9]\d{8}$/,        nationalLen: 9 },
  { code: "NL", label: "Pays-Bas",        dial: "31",  nationalRegex: /^[1-9]\d{8}$/,        nationalLen: 9 },
  { code: "GB", label: "Royaume-Uni",     dial: "44",  nationalRegex: /^[1-9]\d{8,9}$/,      nationalLen: [9, 10] },
  { code: "IE", label: "Irlande",         dial: "353", nationalRegex: /^[1-9]\d{6,9}$/,      nationalLen: [7, 10] },
  { code: "AT", label: "Autriche",        dial: "43",  nationalRegex: /^[1-9]\d{3,12}$/,     nationalLen: [4, 13] },
  { code: "DK", label: "Danemark",        dial: "45",  nationalRegex: /^\d{8}$/,             nationalLen: 8 },
  { code: "SE", label: "Suède",           dial: "46",  nationalRegex: /^[1-9]\d{7,9}$/,      nationalLen: [8, 10] },
  { code: "NO", label: "Norvège",         dial: "47",  nationalRegex: /^[1-9]\d{7}$/,        nationalLen: 8 },
  { code: "FI", label: "Finlande",        dial: "358", nationalRegex: /^[1-9]\d{5,11}$/,     nationalLen: [6, 12] },
  { code: "PL", label: "Pologne",         dial: "48",  nationalRegex: /^[1-9]\d{8}$/,        nationalLen: 9 },
  { code: "CZ", label: "Tchéquie",        dial: "420", nationalRegex: /^[1-9]\d{8}$/,        nationalLen: 9 },
  { code: "SK", label: "Slovaquie",       dial: "421", nationalRegex: /^[1-9]\d{8}$/,        nationalLen: 9 },
  { code: "HU", label: "Hongrie",         dial: "36",  nationalRegex: /^[1-9]\d{7,8}$/,      nationalLen: [8, 9] },
  { code: "RO", label: "Roumanie",        dial: "40",  nationalRegex: /^[1-9]\d{8}$/,        nationalLen: 9 },
  { code: "BG", label: "Bulgarie",        dial: "359", nationalRegex: /^[1-9]\d{7,8}$/,      nationalLen: [8, 9] },
  { code: "GR", label: "Grèce",           dial: "30",  nationalRegex: /^[1-9]\d{9}$/,        nationalLen: 10 },
  { code: "HR", label: "Croatie",         dial: "385", nationalRegex: /^[1-9]\d{7,8}$/,      nationalLen: [8, 9] },
  { code: "SI", label: "Slovénie",        dial: "386", nationalRegex: /^[1-9]\d{7}$/,        nationalLen: 8 },
  { code: "EE", label: "Estonie",         dial: "372", nationalRegex: /^[1-9]\d{6,7}$/,      nationalLen: [7, 8] },
  { code: "LV", label: "Lettonie",        dial: "371", nationalRegex: /^[1-9]\d{7}$/,        nationalLen: 8 },
  { code: "LT", label: "Lituanie",        dial: "370", nationalRegex: /^[1-9]\d{7}$/,        nationalLen: 8 },
  { code: "MT", label: "Malte",           dial: "356", nationalRegex: /^[1-9]\d{7}$/,        nationalLen: 8 },
  { code: "CY", label: "Chypre",          dial: "357", nationalRegex: /^[1-9]\d{7}$/,        nationalLen: 8 },
];

const COUNTRY_BY_DIAL = (() => {
  const m = new Map<string, PhoneCountry>();
  // Tri par longueur d'indicatif décroissante : on matche "352" avant "32"
  [...PHONE_COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .forEach(c => { if (!m.has(c.dial)) m.set(c.dial, c); });
  return m;
})();

/**
 * Détecte le pays depuis un numéro E.164 (`+33612345678`).
 * Renvoie le pays + numéro national si reconnu, sinon `null`.
 */
function parseE164(value: string): { country: PhoneCountry; national: string } | null {
  const v = (value || "").replace(/\s/g, "");
  if (!v.startsWith("+")) return null;
  const digits = v.slice(1);
  // On essaie les indicatifs du plus long au plus court
  for (const [dial, country] of [...COUNTRY_BY_DIAL.entries()].sort((a, b) => b[0].length - a[0].length)) {
    if (digits.startsWith(dial)) {
      return { country, national: digits.slice(dial.length) };
    }
  }
  return null;
}

/**
 * Convertit une saisie utilisateur (libre) en E.164 selon le pays sélectionné.
 * Stratégie :
 *  - Si commence par "+" → on essaie parseE164 (override le pays)
 *  - Sinon : on garde uniquement les chiffres ; si commence par "0", on retire le 0 ; on préfixe +<dial>
 */
export function normalizePhone(raw: string, countryCode: string): { e164: string; national: string; country: PhoneCountry | null } {
  const country = PHONE_COUNTRIES.find(c => c.code === countryCode) || null;
  const trimmed = (raw || "").replace(/\s/g, "");
  if (trimmed.startsWith("+")) {
    const parsed = parseE164(trimmed);
    if (parsed) return { e164: `+${parsed.country.dial}${parsed.national}`, national: parsed.national, country: parsed.country };
    // numéro international mal formé → on garde tel quel
    return { e164: trimmed, national: trimmed.replace(/^\+\d+/, ""), country };
  }
  const digits = trimmed.replace(/[^\d]/g, "").replace(/^0+/, "");
  if (!country) return { e164: digits ? `+${digits}` : "", national: digits, country: null };
  return { e164: digits ? `+${country.dial}${digits}` : "", national: digits, country };
}

export function isValidPhone(value: string, countryCode?: string): boolean {
  const v = (value || "").trim();
  if (!v) return false;
  const parsed = parseE164(v);
  if (parsed) return parsed.country.nationalRegex.test(parsed.national);
  // Fallback : valider le numéro selon le pays courant
  if (!countryCode) return false;
  const country = PHONE_COUNTRIES.find(c => c.code === countryCode);
  if (!country) return false;
  const digits = v.replace(/[^\d]/g, "").replace(/^0+/, "");
  return country.nationalRegex.test(digits);
}

interface Props {
  /** Valeur stockée (E.164 idéalement : `+33612345678`) */
  value: string;
  onChange: (e164: string) => void;
  /** Pays par défaut (ISO 3166-1 alpha-2). Défaut "FR". */
  defaultCountry?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
  /** Désactive le composant entier */
  disabled?: boolean;
  /** Affichage erreur (cadre rouge) */
  hasError?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  defaultCountry = "FR",
  required = false,
  className = "",
  placeholder,
  disabled = false,
  hasError = false,
}: Props) {
  // Initialise pays + numéro national depuis la valeur reçue
  const initial = useMemo(() => {
    const parsed = parseE164(value || "");
    if (parsed) return { country: parsed.country, national: parsed.national };
    return {
      country: PHONE_COUNTRIES.find(c => c.code === defaultCountry) || PHONE_COUNTRIES[0],
      national: (value || "").replace(/^\+?\d+\s*/, "") || "",
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [country, setCountry] = useState<PhoneCountry>(initial.country);
  const [national, setNational] = useState<string>(initial.national);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Resync si la prop value change depuis le parent
  useEffect(() => {
    const parsed = parseE164(value || "");
    if (parsed) {
      setCountry(parsed.country);
      setNational(parsed.national);
    }
  }, [value]);

  // Fermer dropdown au clic extérieur
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const emitChange = (nextCountry: PhoneCountry, nextNational: string) => {
    const digits = nextNational.replace(/[^\d]/g, "").replace(/^0+/, "");
    onChange(digits ? `+${nextCountry.dial}${digits}` : "");
  };

  const baseInputCls = `w-full rounded-r-lg border border-l-0 ${hasError ? "border-destructive bg-destructive/5" : "border-input bg-background"} px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed`;
  const selectorCls = `inline-flex items-center gap-1 px-3 py-2.5 rounded-l-lg border ${hasError ? "border-destructive bg-destructive/5" : "border-input bg-background"} text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed`;

  const validNow = !national || country.nationalRegex.test(national.replace(/^0+/, ""));

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(o => !o)}
          className={selectorCls}
          aria-label={`Code pays — ${country.label} (+${country.dial})`}
        >
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono">{country.code}</span>
          <span className="text-muted-foreground">+{country.dial}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
        <input
          type="tel"
          inputMode="tel"
          disabled={disabled}
          required={required}
          value={national}
          onChange={e => {
            const raw = e.target.value;
            // Accepte chiffres, espaces, "+" en tête seulement
            if (raw.startsWith("+")) {
              const parsed = parseE164(raw.replace(/\s/g, ""));
              if (parsed) {
                setCountry(parsed.country);
                setNational(parsed.national);
                emitChange(parsed.country, parsed.national);
                return;
              }
            }
            const cleaned = raw.replace(/[^\d\s]/g, "");
            setNational(cleaned);
            emitChange(country, cleaned);
          }}
          onBlur={() => {
            // Strip leading 0 + reformat
            const digits = national.replace(/[^\d]/g, "").replace(/^0+/, "");
            setNational(digits);
            emitChange(country, digits);
          }}
          placeholder={placeholder || (country.code === "FR" ? "6 12 34 56 78" : "Numéro national")}
          className={baseInputCls}
          aria-invalid={!validNow}
        />
      </div>

      {open && !disabled && (
        <ul className="absolute z-50 left-0 mt-1 max-h-72 w-72 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          {PHONE_COUNTRIES.map(c => (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => {
                  setCountry(c);
                  setOpen(false);
                  emitChange(c, national);
                }}
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-muted/50 ${c.code === country.code ? "bg-primary/5 font-medium" : ""}`}
              >
                <span className="font-mono mr-2">{c.code}</span>
                <span>{c.label}</span>
                <span className="text-muted-foreground ml-2">+{c.dial}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {national && !validNow && (
        <p className="mt-1 text-[11px] text-destructive">
          Numéro {country.label} invalide — {typeof country.nationalLen === "number" ? `${country.nationalLen} chiffres attendus` : `${country.nationalLen[0]} à ${country.nationalLen[1]} chiffres attendus`}.
        </p>
      )}
    </div>
  );
}
