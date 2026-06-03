/**
 * Utilitaires de gestion d'immatriculation (CDC §5.1.1.2).
 *
 * Convention ChargiZ — format français AA-123-BB :
 *   - 2 lettres majuscules
 *   - tiret
 *   - 3 chiffres
 *   - tiret
 *   - 2 lettres majuscules
 *
 * Le `normalizeImmat` ré-insère automatiquement les tirets à la saisie.
 * Pour rétro-compatibilité, le validateur accepte aussi le format sans tirets
 * (AB123CD), mais le formulaire affichera toujours la version avec tirets.
 */

const VALID_PATTERN = /^[A-Z]{2}-?[0-9]{3}-?[A-Z]{2}$/;

/**
 * Normalise la saisie en majuscules + auto-insertion des tirets aux positions
 * 2 et 5 (après les 2 lettres et les 3 chiffres).
 *
 * Exemples :
 *   "a"        → "A"
 *   "ab1"      → "AB-1"
 *   "ab123cd"  → "AB-123-CD"
 *   "AB-123-CD" → "AB-123-CD"
 *   "AB123CD9" → "AB-123-CD"  (le 8e caractère est ignoré)
 */
export function normalizeImmat(raw: string): string {
  // 1) Tout en majuscule + on ne garde que A-Z et 0-9 (max 7 caractères)
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  // 2) Ré-insertion des tirets aux positions 2 et 5
  let result = "";
  for (let i = 0; i < clean.length; i++) {
    if (i === 2 || i === 5) result += "-";
    result += clean[i];
  }
  return result;
}

/** True si la valeur respecte exactement le format AA-123-BB (ou AB123CD). */
export function isValidImmat(value: string): boolean {
  if (!value) return false;
  return VALID_PATTERN.test(value.toUpperCase().trim());
}

/**
 * Retourne un message d'erreur lisible si l'immatriculation est invalide,
 * ou null si elle est valide.
 */
export function getImmatError(value: string): string | null {
  if (!value || !value.trim()) return "Immatriculation requise.";
  const v = value.toUpperCase().trim();
  const clean = v.replace(/-/g, "");

  if (clean.length === 0) return "Immatriculation requise.";
  if (clean.length < 7) return "Format attendu : AA-123-BB (2 lettres, 3 chiffres, 2 lettres).";
  if (clean.length > 7) return "Format attendu : AA-123-BB (2 lettres, 3 chiffres, 2 lettres).";

  // Vérifie la structure : 2 lettres, 3 chiffres, 2 lettres
  if (!/^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(clean)) {
    return "Format attendu : AA-123-BB (2 lettres, 3 chiffres, 2 lettres).";
  }

  // Tirets : on accepte avec ou sans, mais si tirets présents ils doivent être au bon endroit
  if (v.includes("-") && !VALID_PATTERN.test(v)) {
    return "Format attendu : AA-123-BB (mauvaise position des tirets).";
  }

  return null;
}
