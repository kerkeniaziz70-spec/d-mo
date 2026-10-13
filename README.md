# Simulateur de messagerie Instagram

Démo jetable : un téléphone, un chat Instagram DM, et un agent IA (Claude) qui répond à partir de la base de connaissances du client. Site statique (HTML, CSS, JS), sans backend.

Le code ne change jamais d'un client à l'autre : seul le dossier `clients/<nom>/` change.

> ⚠️ La clé API est lue par le navigateur : toute personne qui ouvre la démo peut la retrouver. Utilise une clé dédiée avec une limite de dépense basse, et supprime-la après les démos.

## 1. Créer le dépôt GitHub et activer GitHub Pages

1. Crée un dépôt sur GitHub et pousse-y ce projet.
2. Va dans **Settings → Pages**.
3. Dans *Build and deployment*, choisis **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
4. Après environ une minute, le site est disponible sur `https://<pseudo>.github.io/<repo>/`.

> GitHub Pages sur un dépôt **privé** demande un compte payant (Pro, Team ou Enterprise). Avec un compte gratuit, le dépôt doit être public pour être servi par Pages.

## 2. Créer la clé API

1. Va sur [console.anthropic.com](https://console.anthropic.com) et crée une clé dans **API Keys**.
2. Dans **Settings → Limits**, fixe une **limite de dépense mensuelle** basse.
3. Ouvre le fichier `config.js` à la racine et colle la clé :

   ```js
   const ANTHROPIC_API_KEY = "sk-ant-...";
   ```
4. Pousse la modification.

## 3. Ajouter un client

1. Copie `clients/exemple/` et renomme la copie, par exemple `boutique-xyz` (lettres, chiffres, `-` et `_` uniquement).
2. Remplis `config.js` (nom, compte Instagram, initiales, message d'accueil, instructions, langue) et `base.md` (Produits, Prix, Horaires, FAQ).
3. Pousse sur GitHub.
4. Envoie le lien : `https://<pseudo>.github.io/<repo>/?client=boutique-xyz`

L'agent répond uniquement à partir de `base.md`. Si l'information manque, il dit qu'il va vérifier et propose un contact humain.

## 4. Supprimer un client

Supprime son dossier `clients/<nom>/` et pousse. Le lien affichera « Démo introuvable ».

## 5. Après les démos

Supprime la clé dans [console.anthropic.com](https://console.anthropic.com) (**API Keys**), puis remets `COLLE_TA_CLE_ICI` dans `config.js`.

## Test en local

```
python -m http.server 8000
```

Puis ouvre `http://localhost:8000/?client=exemple`.
