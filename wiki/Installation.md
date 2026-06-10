# Installation

## Pré-requis
- Windows 10 ou 11 (64 bits).
- Aucune connexion ni compte requis pour utiliser l'application.

## Installer Vigie

1. Récupérez le fichier **`Vigie-Setup-<version>.exe`**.
2. Double-cliquez dessus.
3. L'installeur (NSIS) s'installe **pour l'utilisateur courant** — aucun droit administrateur requis.
4. Choisissez éventuellement le dossier d'installation, puis laissez l'installation se terminer.
5. Vigie se lance automatiquement à la fin et crée des raccourcis **Bureau** et **menu Démarrer**.

> ℹ️ L'installeur est **signé numériquement** (éditeur **CYBERLOGIC**, signature horodatée). Sur les postes où
> ce certificat est approuvé (vos machines, parc d'entreprise via GPO), aucun avertissement. En revanche, comme
> le certificat est **auto-signé** (non émis par une autorité publique payante), un **téléchargement grand public**
> peut encore déclencher Windows SmartScreen : cliquez **Informations complémentaires → Exécuter quand même**.

## Premier lancement

Un assistant s'affiche :
- **Langue de la veille** : Français, Anglais, Espagnol, Allemand, Italien ou Portugais (ou « Toutes »).
- **Sources recommandées** : cochez pour ajouter automatiquement un bouquet de sources de qualité dans la langue choisie.

Cliquez **🚀 Commencer**. Vigie effectue une première actualisation et remplit votre flux.

## Mettre à jour

L'application se met à jour en **réinstallant** la dernière version de `Vigie-Setup-<version>.exe` par-dessus
l'installation existante. Vos données (sources, articles, réglages) sont conservées.

## Désinstaller

*Paramètres Windows → Applications → Vigie → Désinstaller.*
Vos données personnelles restent dans `%APPDATA%\Vigie` (voir **[[Sauvegarde et données]]**) ; supprimez ce
dossier manuellement si vous souhaitez tout effacer.

## Construire l'installeur soi-même

Voir **[[Développement]]** (`npm run dist`).
