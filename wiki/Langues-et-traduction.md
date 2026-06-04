# Langues et traduction

Vigie prend en charge **6 langues** : 🇫🇷 Français · 🇬🇧 Anglais · 🇪🇸 Espagnol · 🇩🇪 Allemand · 🇮🇹 Italien · 🇵🇹 Portugais.

## Langue du flux

Le sélecteur **🌐** de la barre d'outils (et dans *Réglages*) filtre votre flux :
- **Toutes langues** : aucun filtre.
- **Une langue précise** : n'affiche que les articles de cette langue.

Ce réglage pilote aussi la **langue des résumés IA** (voir **[[Résumés IA]]**).

## Langue d'une source

À l'ajout d'une source, vous choisissez sa langue (drapeau affiché dans la liste). Tous ses articles
en héritent par défaut.

## Détection automatique

Option **Détecter automatiquement la langue de chaque article** (Réglages, activée par défaut) :
à la récupération, Vigie analyse chaque article (mots fréquents + caractères distinctifs) et corrige sa
langue si nécessaire — pratique pour les sources multilingues. Si la détection n'est pas assez sûre,
la langue de la source est conservée.

## Traduction d'un article

Le bouton **🌐 Traduire** (panneau de détail) traduit le titre et le contenu vers le français
(ou l'anglais si l'article est déjà en français).

> La traduction nécessite le moteur **Ollama** (voir **[[Résumés IA]]**). En IA locale seule, Vigie vous
> l'indique. La traduction s'affiche au-dessus de l'article et n'écrase pas le contenu original.

## Sources recommandées par langue

Le catalogue intégré propose des sources de qualité pour chaque langue — voir **[[Sources]]**.
