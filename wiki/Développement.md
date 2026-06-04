# Développement

## Stack technique
- **Electron** + **electron-vite**
- **React** + **TypeScript** (interface)
- **rss-parser** (flux), **linkedom** + **@mozilla/readability** (texte intégral)
- Résumé IA **local** (extractif) ou via **Ollama** (HTTP local)
- Stockage **JSON** local (pas de serveur, pas de base de données)

## Pré-requis
- Node.js 20+ et npm.

## Installation des dépendances
```bash
npm install
```

## Lancer en développement
```bash
npm run dev         # hot reload (Electron + Vite)
npm run typecheck   # vérification TypeScript (node + web)
```

## Compiler / distribuer
```bash
npm run build       # compile main + preload + renderer dans out/
npm run package     # app non empaquetée dans release/win-unpacked
npm run dist        # installeur NSIS -> release/Vigie-Setup-<version>.exe
npm run dist:msi    # (optionnel) MSI via electron-wix-msi (WiX 3.14 requis dans build/wix3/)
npm run icons       # régénère build/icon.png et build/icon.ico depuis build/icon.svg
```

## Structure du projet
```
src/
├── main/        # Processus principal Electron
│   ├── store.ts        # Persistance JSON locale
│   ├── fetchers.ts     # Collecte RSS / GitHub / HN / Reddit / Mastodon (+ images)
│   ├── summarizer.ts   # Résumé extractif local
│   ├── ai.ts           # Aiguillage résumé local / Ollama + traduction + brief
│   ├── langdetect.ts   # Détection de langue
│   ├── fulltext.ts     # Extraction texte intégral (Readability)
│   ├── opml.ts         # Import / export OPML
│   ├── ipc.ts          # Handlers IPC + orchestration
│   └── index.ts        # Entrée, fenêtre, tray, timers
├── preload/     # Pont sécurisé (contextBridge → window.vigie)
├── renderer/    # Interface React + Vite
│   └── src/
│       ├── App.tsx
│       └── components/ # ArticleDetail, SourcesModal, SettingsModal, Dashboard,
│                       # ReadingMode, BriefModal, OnboardingModal
└── shared/      # Types partagés + utilitaires (types.ts, text.ts)
```

## Icône
L'icône est dessinée dans `build/icon.svg` (radar/sentinelle). `npm run icons` la rasterise en
`build/icon.png` (512px) et `build/icon.ico` (multi-tailles) via **sharp** + **png-to-ico**.

## Licence
Logiciel propriétaire — voir le fichier `LICENSE`. Toute redistribution est interdite sans autorisation écrite.
