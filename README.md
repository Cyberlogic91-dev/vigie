# Vigie 📡

> *La sentinelle de votre veille technologique.*

[![Téléchargements](https://img.shields.io/github/downloads/Cyberlogic91-dev/vigie/total?color=6e8bff&label=t%C3%A9l%C3%A9chargements&logo=github)](https://github.com/Cyberlogic91-dev/vigie/releases)
[![Dernière version](https://img.shields.io/github/v/release/Cyberlogic91-dev/vigie?color=9b6bff&label=version)](https://github.com/Cyberlogic91-dev/vigie/releases/latest)
![Licence](https://img.shields.io/badge/licence-propri%C3%A9taire-red)
![Plateforme](https://img.shields.io/badge/plateforme-Windows-0a7bbb?logo=windows)  
[![Téléchargements dernière version](https://img.shields.io/github/downloads/Cyberlogic91-dev/vigie/latest/total?color=6e8bff&label=t%C3%A9l.%20derni%C3%A8re%20version)](https://github.com/Cyberlogic91-dev/vigie/releases/latest)
![Date de publication](https://img.shields.io/github/release-date/Cyberlogic91-dev/vigie?label=publi%C3%A9e%20le)
![Dernière mise à jour](https://img.shields.io/github/last-commit/Cyberlogic91-dev/vigie?label=dernier%20commit)
![Étoiles](https://img.shields.io/github/stars/Cyberlogic91-dev/vigie?style=flat&color=f5c518)

Application bureau (Windows) de **veille technologique**. Agrège plusieurs sources, génère des résumés par IA, classe par catégories/tags, et vous notifie des nouveautés — le tout en local, sans serveur.

## Aperçu

![Interface de Vigie — flux et détail](images/vigie-interface.png)
*Le flux en vue magazine et le panneau de détail avec résumé IA.*

![Tableau de bord de Vigie](images/vigie-dashboard.png)
*Le tableau de bord : statistiques, activité et répartitions.*

> Visuels d'aperçu (rendu fidèle à l'interface réelle).

## Fonctionnalités

- **Multilingue** : 6 langues (FR, EN, ES, DE, IT, PT) — filtre du flux, langue des résumés IA, et **détection automatique** de la langue de chaque article + catalogue de sources recommandées par langue
- **Sources multiples** : flux RSS/Atom, releases GitHub, Hacker News, Reddit, Mastodon
- **Résumés IA gratuits, sans clé** : résumé + tags via une **IA locale intégrée** (extractive, hors-ligne, instantanée) ou via **Ollama** (modèles avancés exécutés localement) — aucune API payante ni clé requise
- **Organisation** : catégories par source, tags par article, favoris, état lu/non lu
- **Recherche & filtres** : par texte, catégorie, type de source, non lus, favoris
- **Automatisation** : actualisation périodique, digest quotidien, notifications système
- **Tableau de bord** : statistiques (activité sur 14 jours, répartition par type/catégorie, tags fréquents)
- **Mode lecture** : affichage plein écran d'un article avec typographie confortable (touche Échap pour quitter)
- **Regroupement par source** : liste articles groupés par source en sections repliables
- **Texte complet** : récupération de l'article intégral (algorithme Readability) au-delà de l'extrait RSS
- **Brief du jour IA** : synthèse des grands thèmes des nouveaux articles
- **Traduction** d'un article (via Ollama) et **export Markdown**
- **Raccourcis clavier** : `j/k` naviguer, `o` ouvrir, `m` lu/non-lu, `s` favori, `r` actualiser, `/` rechercher
- **Filtres par mots-clés** : masquer ou mettre en avant certains termes
- **Disposition** magazine / compacte, **favicons** des sources, **compteurs de non-lus** par source/catégorie
- **Santé des sources** : indicateur OK/erreur + dernière récupération
- **Apparence** : thème clair/sombre, couleur d'accent, taille du texte
- **Arrière-plan** : icône dans la zone de notification + actualisation fenêtre fermée
- **Productivité** : « tout marquer comme lu », résumé groupé, scroll infini, import/export **OPML**
- **Sauvegarde** : export/restauration de toutes les données (sources, articles, réglages) en JSON
- **Premier lancement** : onboarding (langue + sources) en deux clics
- **Stockage local** : données dans un fichier JSON (`%APPDATA%/Vigie/vigie-data.json`)

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev        # lance l'app en mode développement (hot reload)
npm run typecheck  # vérifie les types TypeScript
```

## Build / Distribution

```bash
npm run build      # compile main + preload + renderer dans out/
npm run package    # génère l'app non empaquetée (release/win-unpacked)
npm run dist       # installeur NSIS → release/Vigie-Setup-<version>.exe
npm run dist:msi   # (optionnel) MSI via electron-wix-msi (WiX 3.14, voir ci-dessous)
```

L'installeur **NSIS** (`.exe`) est le format par défaut : **par-utilisateur** (sans droits admin), icône
correcte, raccourcis bureau + menu Démarrer, choix du dossier d'installation, et **lancement de l'app à la fin**.

> **MSI optionnel** (`npm run dist:msi`) : nécessite les binaires **WiX Toolset 3.14** dans `build/wix3/`
> (`candle.exe`/`light.exe`, depuis [les releases WiX 3](https://github.com/wixtoolset/wix3/releases)).
> Limites connues du MSI : icône de raccourci générique et pas de lancement automatique en fin d'installation.

## Configuration

1. Les résumés IA fonctionnent **sans aucune configuration** : l'IA locale intégrée est active par défaut (hors-ligne, gratuite). Pour des résumés de meilleure qualité, choisissez **Ollama** dans *Réglages* (installez [Ollama](https://ollama.com), lancez `ollama serve` et `ollama pull llama3.2`).
2. Ouvrez **Gérer les sources** pour ajouter vos flux.
   - RSS : URL du flux (`https://…/rss`)
   - GitHub : `owner/repo` (releases du dépôt)
   - Hacker News : terme de recherche, ou vide pour la front page
   - Reddit / Mastodon : URL du flux `.rss`
3. Réglez l'intervalle d'actualisation et l'heure du digest selon vos besoins.

## Architecture

```
src/
├── main/        # Processus principal Electron (fenêtre, planification)
│   ├── store.ts     # Persistance JSON locale
│   ├── fetchers.ts  # Collecte RSS / GitHub / HN / Reddit / Mastodon
│   ├── ai.ts        # Résumés IA (local / Ollama)
│   ├── ipc.ts       # Handlers IPC + orchestration
│   └── index.ts     # Entrée, timers (refresh, digest)
├── preload/     # Pont sécurisé (contextBridge)
├── renderer/    # Interface React + Vite
└── shared/      # Types partagés
```

## Licence

**Logiciel propriétaire — Tous droits réservés.** © 2026 Cyberlogic — [www.cyberlogic.fr](https://www.cyberlogic.fr).
Toute redistribution, publication, revente ou modification est interdite sans
autorisation écrite. Voir le fichier [LICENSE](LICENSE) pour les conditions complètes.
