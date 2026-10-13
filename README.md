# Simulateur de messagerie Instagram

Démo jetable : un téléphone, un chat Instagram DM et un agent IA (Claude). Site statique, sans backend.

## Utilisation
1. Ouvre `https://demo.otomizy.tn` sur ton ordinateur et clique sur ⚙️ (en haut à droite).
2. Colle ta clé API Anthropic, choisis le modèle, puis remplis pseudo, nom, photo, badge, heure, message d'accueil, instructions et base de connaissances.
3. Clique sur « Appliquer et recommencer », puis partage ton écran pendant l'appel.

Les réglages sont enregistrés dans ce navigateur uniquement (`localStorage`) : ils ne sont jamais transmis ni écrits sur GitHub. Un visiteur qui ouvre le lien voit les valeurs par défaut, sans ta clé.

Utilise une clé dédiée avec une limite de dépense basse, et supprime-la après les démos.

## Test en local
```
python -m http.server 8000
```
