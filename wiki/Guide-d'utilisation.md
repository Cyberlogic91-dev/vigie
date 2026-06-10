# Guide d'utilisation

## L'interface

Vigie se compose de trois zones :

- **Barre latérale (gauche)** : navigation — Tableau de bord, filtres (Tout / Non lus / Favoris),
  types de source, catégories, et accès à *Gérer les sources*, *Réglages* et au site web.
- **Barre d'outils (haut)** : recherche, langue du flux, disposition, regroupement, actions (Tout lu, Résumer, Brief), et **↻ Actualiser**.
- **Zone principale** : la liste des articles et le panneau de détail.

## Lire des articles

- Cliquez un article pour l'ouvrir dans le panneau de détail (il est marqué **lu** automatiquement).
- **🔗 Ouvrir l'article** : ouvre la page d'origine dans votre navigateur.
- **📖 Lecture** : mode plein écran avec typographie confortable (quittez avec `Échap`).
- **📄 Texte complet** : récupère l'article intégral (algorithme Readability) au-delà de l'extrait du flux.
- **🤖 Résumer (IA)** : génère un résumé + des tags (voir **[[Résumés IA]]**).
- **🌐 Traduire** : traduit l'article (nécessite Ollama, voir **[[Langues et traduction]]**).
- **⬇ Markdown** : exporte l'article dans un fichier `.md`.
- **★** : ajoute/retire des favoris · **● Marquer non lu** : repasse l'article en non lu.

## Organiser

- **Catégories** : chaque source a une catégorie ; les articles en héritent. Filtrez via la barre latérale.
- **Tags** : ajoutez/retirez des tags par article dans le panneau de détail (champ *+ tag*). L'IA en propose aussi.
- **Favoris** : marquez les articles à conserver, filtrables via *★ Favoris*. Un article mis en favori est
  automatiquement enrichi en arrière-plan avec son **texte intégral**.

## Rechercher et filtrer

- **Recherche** : champ en haut (titre + contenu + résumé). Astuce : touche `/` pour y accéder au clavier.
- **Recherches enregistrées** : quand une recherche/des filtres sont actifs, le bouton **🔖** les sauvegarde sous
  un nom ; elles apparaissent dans la section **Recherches** de la barre latérale (un clic les réapplique, ✕ pour supprimer).
- **Filtres** : *Tout*, *Non lus*, *Favoris*, par **type de source** et par **catégorie** (barre latérale).
- **Filtres par mots-clés** (Réglages) : *masquer* les articles contenant certains mots, ou *mettre en avant* (surlignage).

## Affichage

- **▦ Magazine / ▤ Compact** : grande image en haut, ou vignette latérale (préférence mémorisée).
- **⊞ Grouper** : regroupe les articles par source en sections.
- **Scroll infini** : les articles se chargent au fur et à mesure du défilement.

## Tableau de bord

Le bouton **📊 Tableau de bord** affiche des statistiques : nombre d'articles, non lus, favoris, résumés,
activité sur 14 jours, répartition par type/catégorie et tags les plus fréquents.

## Brief du jour

Le bouton **📋 Brief** génère une synthèse des nouveaux articles : grands thèmes du jour (rédigés par
Ollama si configuré, sinon une liste extractive des têtes d'affiche).

## Actualisation

- **↻ Actualiser** : récupère manuellement toutes les sources actives.
- Automatique : configurable (intervalle en minutes) dans **[[Réglages]]**.
- En arrière-plan : avec l'option *zone de notification*, Vigie continue d'actualiser fenêtre fermée.
