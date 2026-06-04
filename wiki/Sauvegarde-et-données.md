# Sauvegarde et données

## Où sont stockées mes données ?

Tout est **local**, dans un unique fichier JSON :

```
%APPDATA%\Vigie\vigie-data.json
```

(soit `C:\Users\<vous>\AppData\Roaming\Vigie\vigie-data.json`)

Ce fichier contient vos **sources**, vos **articles** (avec résumés, tags, favoris, état lu) et vos **réglages**.
Aucune donnée n'est envoyée sur un serveur. Les seules connexions sortantes sont :
- la récupération des flux/articles que vous avez configurés ;
- les appels à **Ollama en local** si vous l'activez (rien ne sort de votre machine).

> 💡 En développement (`npm run dev`), le dossier peut être `…\Roaming\vigie` ou `…\Roaming\Electron`
> selon le mode de lancement.

## Sauvegarder / restaurer

Dans **Réglages → Données** :
- **⬇ Exporter une sauvegarde** : enregistre un fichier JSON complet (sources + articles + réglages).
- **⬆ Restaurer une sauvegarde** : réimporte un fichier ; les sources et articles sont **fusionnés**
  (dédup), les réglages remplacés.

Utile pour migrer vers un autre PC ou faire un point de restauration.

## Limite de stockage

Vigie conserve jusqu'à **5000 articles** (les plus récents) pour éviter une croissance illimitée du fichier.

## Tout réinitialiser

Fermez Vigie et supprimez le fichier `vigie-data.json` : au prochain lancement, l'application repart
de zéro (avec quelques sources par défaut).
