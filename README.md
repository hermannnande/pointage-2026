# OControle

**Plateforme SaaS de pointage et gestion de présence pour les entreprises africaines.**

## Démarrage rapide

### Prérequis

- Node.js 20+
- npm
- Compte Supabase (gratuit)

### Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Copier les variables d'environnement
cp .env.example .env.local

# 3. Configurer les variables Supabase dans .env.local

# 4. Générer le client Prisma
npx prisma generate

# 5. Lancer en développement
npm run dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000).

## Stack technique

| Technologie | Rôle |
|------------|------|
| Next.js 15 | Framework React full-stack |
| TypeScript | Typage statique |
| Tailwind CSS v4 | Styles utilitaires |
| shadcn/ui | Composants UI |
| Supabase | Auth, BDD PostgreSQL, Realtime, Storage |
| Prisma | ORM + migrations |
| Zod | Validation |
| TanStack Query | Fetching + cache |
| Recharts | Graphiques |
| Chariow | Paiement (mobile money, cartes) |

## Structure du projet

```
src/
├── app/              # Routes Next.js (App Router)
│   ├── (marketing)/  # Landing page, pricing
│   ├── (auth)/       # Login, signup
│   ├── (dashboard)/  # Application protégée
│   └── api/          # API Routes
├── components/       # Composants réutilisables
│   ├── ui/           # shadcn/ui
│   ├── layout/       # Header, sidebar, footer
│   ├── common/       # Composants génériques
│   └── ...
├── lib/              # Utilitaires, clients, config
├── services/         # Logique métier
├── hooks/            # React hooks custom
├── stores/           # State management (Zustand)
├── validations/      # Schémas Zod
├── types/            # Types TypeScript
└── config/           # Configuration app
```

## Commandes utiles

```bash
npm run dev          # Développement
npm run build        # Build production
npm run lint         # Linting
npx prisma studio    # Interface visuelle BDD
npx prisma migrate dev  # Appliquer les migrations
```

## Licence

Propriétaire. Tous droits réservés.
