# Sources

Vigie agrège cinq types de sources. Gérez-les via **⚙️ Gérer les sources** (barre latérale).

## Types pris en charge

| Type | Champ « URL / identifiant » à renseigner |
|---|---|
| **RSS / Atom** | URL du flux, ex. `https://www.numerama.com/feed/` |
| **GitHub (releases)** | Dépôt au format `owner/repo`, ex. `facebook/react` |
| **Hacker News** | Terme de recherche (vide = front page) |
| **Reddit** | URL du flux `.rss`, ex. `https://www.reddit.com/r/programming/.rss` |
| **Mastodon** | URL du flux `.rss` d'un compte ou d'un tag |

## Ajouter une source

1. Ouvrez **Gérer les sources**.
2. Choisissez le **type**, saisissez un **nom**, l'**URL/identifiant**, une **catégorie** et la **langue**.
3. Cliquez **+ Ajouter**.

## Gérer

- **Activer/désactiver** : la case à cocher (une source désactivée n'est plus actualisée).
- **↻** : actualiser une seule source.
- **🗑** : supprimer une source (et ses articles).
- **Indicateur de santé** : pastille **verte** (OK) / **rouge** (erreur) / grise (jamais récupérée),
  avec la date de dernière récupération au survol.

## Sources recommandées

Le bouton **➕ Ajouter les sources recommandées** (dans *Réglages*, selon la langue choisie, ou dans l'écran
vide quand aucune source de cette langue n'existe) ajoute un catalogue de qualité :

- **FR** : Numerama, Le Monde Informatique, Korben, LinuxFr, 01net, Génération-NT, Clubic, Frandroid,
  Les Numériques, Developpez.com, ZDNet France, Journal du Geek, Presse-citron, Next, Silicon.fr, r/france
- **EN** : Hacker News, The Verge, Ars Technica, TechCrunch, Wired, r/programming
- **ES** : Xataka, Genbeta, Hipertextual, MuyComputer, ADSLZone
- **DE** : heise, Golem, t3n, ComputerBase, Caschys Blog, netzpolitik.org, WinFuture
- **IT** : Punto Informatico, HTML.it, DDay.it, TuttoAndroid, Wired Italia
- **PT** : Tecnoblog, Olhar Digital, Canaltech, Pplware

## Import / export OPML

Dans *Gérer les sources* :
- **⬇ Exporter OPML** : sauvegarde toutes vos sources dans un fichier `.opml` (compatible avec les autres lecteurs RSS).
- **⬆ Importer OPML** : importe un fichier OPML (par ex. exporté depuis Feedly, Inoreader…), avec déduplication.

La langue et le type Vigie sont préservés à l'export/import.
