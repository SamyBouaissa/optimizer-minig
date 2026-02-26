# Dofus Mining Optimizer

Optimiseur de vente de minerais pour Dofus - calcule la meilleure stratégie entre vendre directement tes minerais ou les transformer en alliages.

## Fonctionnalités

- **Gestion des minerais** : 20 minerais avec leurs prix (lot de 1, 10, 100)
- **Gestion des alliages** : 15 alliages avec leurs recettes de fabrication
- **Historique des prix** : Suivi de l'évolution des prix avec graphiques
- **Calculateur d'optimisation** : Algorithme qui détermine la stratégie la plus rentable

## Installation

```bash
# Installer les dépendances root
npm install

# Installer les dépendances backend
cd backend && npm install

# Installer les dépendances frontend
cd ../frontend && npm install
```

## Lancement

### Option 1 : Avec concurrently (depuis la racine)
```bash
npm run dev
```

### Option 2 : Séparément
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## Accès

- **Frontend** : http://localhost:5173
- **API Backend** : http://localhost:3001

## Structure des données

Les données sont stockées dans `backend/data/` :
- `minerals.json` : Liste des minerais
- `alloys.json` : Liste des alliages avec recettes
- `prices.json` : Prix actuels (persistés)
- `price_history.json` : Historique des prix

## API Endpoints

### Minerais
- `GET /api/minerals` - Liste des minerais
- `GET /api/prices/minerals` - Prix des minerais
- `PUT /api/prices/minerals/:id` - Mettre à jour un prix

### Alliages
- `GET /api/alloys` - Liste des alliages
- `GET /api/prices/alloys` - Prix des alliages
- `PUT /api/prices/alloys/:id` - Mettre à jour un prix

### Historique
- `GET /api/prices/history` - Tout l'historique
- `GET /api/prices/history/:type/:id` - Historique d'un item

### Optimisation
- `POST /api/optimize` - Calcul de la stratégie optimale
  - Body: `{ "inventory": { "fer": 100, "cuivre": 50, ... } }`

## Algorithme d'optimisation

L'algorithme utilise une approche gloutonne :
1. Calcule le profit de chaque alliage (prix vente - coût des minerais)
2. Fabrique les alliages les plus rentables en priorité
3. Vend les minerais restants directement
4. Retourne le total de kamas optimisé

## Technologies

- **Frontend** : React 18, Vite, TailwindCSS, Recharts
- **Backend** : Node.js, Express
- **Stockage** : Fichiers JSON locaux
