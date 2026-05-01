## Objectif

Faire de ce projet Lovable un **front pur** : toute l'UI, le routing, la nav, les écrans, les dialogs, les états de chargement. **Zéro dépendance directe à Supabase dans les composants.** Toutes les données passent par une couche `api/` que tu remplaceras par des `fetch` vers ton FastAPI au moment de l'export.

## Principes

1. **Aucun composant n'importe `supabase` directement.** Ils appellent uniquement `api/<ressource>`.
2. **Une seule frontière à remplacer plus tard** : le contenu du dossier `src/api/`. Le reste du code (routes, composants, hooks) ne bouge pas lors de la bascule FastAPI.
3. **Mock data en mémoire** pour développer/voir tous les écrans sans backend. Données seedées dans `src/mocks/seed.ts`.
4. **Auth simulée** côté front : un store local qui simule un user connecté avec un rôle (switcher de rôle pour tester Superadmin / Admin / Gest. entreprise / etc.).
5. **Contrats d'API documentés** dans `docs/api-contracts.md` pour que tu saches exactement quoi implémenter en FastAPI.

## Architecture cible

```text
src/
├── api/                       ← LA frontière. Le seul code à réécrire pour FastAPI.
│   ├── client.ts              ← wrapper fetch (BASE_URL, headers, auth, erreurs)
│   ├── auth.ts                ← signIn, signOut, getCurrentUser
│   ├── entreprises.ts         ← list, get, create, update, archive
│   ├── filiales.ts            ← idem
│   ├── sites.ts
│   ├── collaborateurs.ts
│   ├── vehicules.ts
│   ├── sessions-recharge.ts
│   ├── politiques.ts
│   └── types.ts               ← types métier (Entreprise, Filiale, etc.)
│
├── mocks/                     ← Mode mock activable via VITE_USE_MOCKS=true
│   ├── store.ts               ← état en mémoire (Maps par ressource)
│   ├── seed.ts                ← données de démo (3 entreprises, 5 filiales, etc.)
│   └── handlers/              ← implémentations mock de chaque api/<ressource>
│
├── hooks/
│   ├── useAuth.ts             ← réécrit : utilise api/auth + un store local
│   ├── useRoleSwitcher.ts     ← outil dev pour tester les 6 rôles
│   └── ...
│
├── components/                ← inchangé visuellement, on remplace juste les imports supabase
├── routes/                    ← inchangé
└── lib/
    └── supabase.ts            ← SUPPRIMÉ
```

## Couche `api/client.ts`

Wrapper unique autour de `fetch` :

```ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (USE_MOCKS) return mockRouter(path, init);  // dispatch vers src/mocks/handlers/
  const token = getAuthToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}
```

Avec `VITE_USE_MOCKS=true` (défaut sur Lovable), tout passe par les mocks en mémoire. Tu pourras désactiver et brancher ton FastAPI en mettant `VITE_USE_MOCKS=false` + `VITE_API_BASE_URL=https://api.chargiz.fr`.

## Auth simulée

- `src/api/auth.ts` expose `signIn(email, password)` qui :
  - en mode mock : vérifie contre une liste de users de démo (1 par rôle), stocke un faux JWT en `localStorage`
  - en mode FastAPI plus tard : POST `/auth/login` → récupère le JWT
- `useAuth()` : interface inchangée (`user`, `role`, `profile`, `signIn`, `signOut`, `isAtLeast`, `canManage`) → aucun composant à modifier.
- Bonus : un **switcher de rôle flottant en dev** (en bas à droite, visible uniquement si `VITE_USE_MOCKS=true`) pour basculer instantanément entre Superadmin / Admin / Gest. entreprise / Gest. filiale / Gest. site / Collaborateur sans se relogger. Indispensable pour tester ton RBAC.

## Données de démo (seed)

Pour avoir une UI vivante immédiatement :
- 3 entreprises (ex: "ACME Corp", "Beta Industries", "Gamma SAS")
- 5 filiales réparties
- 8 sites
- 15 collaborateurs avec véhicules
- 50 sessions de recharge sur les 30 derniers jours (pour les graphes/KPI)
- 1 user de démo par rôle (login `superadmin@chargiz.dev` / `admin@chargiz.dev` / etc., mot de passe `demo`)

## Contrats API documentés

Création d'un `docs/api-contracts.md` listant pour chaque endpoint à implémenter en FastAPI :
- Méthode + path (ex: `GET /filiales?entreprise_id=...`)
- Auth requise (rôle minimum)
- Schéma de réponse (TS interface)
- Codes d'erreur attendus

Tu prends ce fichier, tu l'ouvres en face de FastAPI, tu codes endpoint par endpoint.

## Ce qui change dans les fichiers existants

Liste exhaustive (pour que tu voies l'ampleur) :

| Fichier | Changement |
|---|---|
| `src/lib/supabase.ts` | **Supprimé** |
| `src/integrations/supabase/*` | **Conservés** mais plus importés (Lovable les régénère, on les ignore) |
| `src/hooks/useAuth.ts` | Réécrit pour utiliser `api/auth` au lieu de `supabase.auth` |
| `src/components/Create*Dialog.tsx` (5 fichiers) | Remplacer `supabase.from(...).insert(...)` par `api.<ressource>.create(...)` |
| `src/routes/dashboard/listes/*.tsx` (6 fichiers) | Remplacer `supabase.from(...).select(...)` par `api.<ressource>.list(...)` |
| `src/routes/dashboard/*.tsx` (autres pages) | Idem |
| `src/routes/index.tsx` (page login) | Utilise `signIn` de `useAuth` (pas de changement visible) |
| `package.json` | `@supabase/supabase-js` reste pour l'instant (Lovable le réinstalle). On ne l'utilise juste plus. |

## Hors scope (volontairement)

- **Pas de TanStack Query pour l'instant.** On garde les `useState` + `useEffect` actuels pour minimiser la diff. Tu pourras ajouter Query après l'export (recommandé) si tu veux du cache propre.
- **Pas de génération PDF / OAuth Smartcar côté front** : ces flux passeront par FastAPI, donc côté Lovable on se contente d'afficher des boutons "Télécharger PDF" / "Connecter Smartcar" qui appelleront plus tard les bons endpoints.
- **Pas de RLS / sécurité côté front** : la sécurité reste **côté FastAPI**. Le front fait juste des UI guards (cacher des boutons selon le rôle), comme aujourd'hui.

## Plan d'exécution (pour info, je le ferai en plusieurs étapes)

1. Créer la couche `src/api/` + `src/mocks/` + types métier + seed
2. Réécrire `useAuth` (mode mock) + ajouter le switcher de rôle dev
3. Remplacer les imports Supabase dans les 5 dialogs de création
4. Remplacer les imports Supabase dans les pages de liste (entreprises, filiales, sites, collaborateurs, vehicules, admins)
5. Remplacer les imports Supabase dans les autres pages dashboard (statistiques, mes-consommations, mes-infos, reglages, etc.)
6. Supprimer `src/lib/supabase.ts`
7. Écrire `docs/api-contracts.md`
8. Vérifier que toute l'app tourne en mode mock (login → switch de rôle → CRUD sur chaque ressource)

## Question avant que je démarre

Pour le mode mock : tu préfères que la donnée soit **persistée en `localStorage`** (les créations/modifs survivent au refresh) ou **éphémère en mémoire** (refresh = retour au seed) ? Je recommande `localStorage` pour pouvoir tester des scénarios sur plusieurs sessions, mais ça dépend de ton usage.