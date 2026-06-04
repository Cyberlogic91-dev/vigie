# Résumés IA

Vigie génère des **résumés** et des **tags** sans aucune clé ni API payante. Deux moteurs, au choix dans
**[[Réglages]] → Moteur de résumé IA**.

## 1. IA locale intégrée (par défaut)

- **Hors-ligne, instantanée, gratuite** — aucune configuration.
- Résumé **extractif** : sélectionne les phrases les plus représentatives (fréquence des mots significatifs,
  recoupement avec le titre, position) et en déduit 2 à 4 tags.
- Idéale pour un usage quotidien sans rien installer.

## 2. Ollama (modèles avancés, en local)

Pour des résumés rédigés par un véritable modèle de langage, exécuté **sur votre machine** (gratuit, privé) :

1. Installez **[Ollama](https://ollama.com)**.
2. Lancez le service : `ollama serve`
3. Téléchargez un modèle : `ollama pull llama3.2` (ou `qwen2.5`, etc.)
4. Dans Vigie → *Réglages* → **Moteur** = *Ollama*, renseignez l'**URL** (`http://localhost:11434`) et le **modèle**.

Si Ollama est injoignable, Vigie l'indique clairement et vous invite à le démarrer ou à repasser sur l'IA locale.

## Utiliser les résumés

- **Par article** : bouton **🤖 Résumer (IA)** dans le panneau de détail.
- **En lot** : bouton **🤖 Résumer** de la barre d'outils (résume les articles non encore résumés affichés, max 25).
- **Automatique** : option *Résumer automatiquement les nouveaux articles* dans *Réglages*.

## Langue des résumés

La langue du résumé suit le réglage **Langue du flux** (voir **[[Langues et traduction]]**) :
en mode « Anglais » les résumés sont en anglais, etc. En mode « Toutes langues », le français est utilisé par défaut
(IA locale) ou la langue de l'article (Ollama).

## Brief du jour

Le bouton **📋 Brief** produit une synthèse globale des nouveaux articles. Avec Ollama, il dégage les
3 à 5 grands thèmes du jour ; en IA locale, il liste les têtes d'affiche.
