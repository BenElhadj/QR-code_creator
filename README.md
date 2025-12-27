# QR Code Creator

Outils pour générer des QR codes:
- Script Python (`qr_code_creator.py`) pour générer des PNG HD avec logo centré.
- Page web statique (`index.html`) pour générer des QR côté client, sans backend.

## Utilisation locale (script Python)

Prérequis:

```
pip install qrcode[pil] pillow
```

Commande:

```
py qr_code_creator.py "<url_ou_texte>" <chemin_logo.png> <fichier_sortie.png>
```

Exemple:

```
py qr_code_creator.py "https://benelhadj.github.io/Portfolio/#contact" messages.png qr_Email.png
```

Caractéristiques:
- Correction d'erreur élevée (H)
- PNG haute résolution
- Transparence du logo remplacée par fond blanc pour lisibilité

## Page Web (statique)

Fichiers:
- `index.html` (racine)
- `assets/css/styles.css`
- `assets/js/app.js`
- Librairie QR chargée via CDN (jsDelivr)

Fonctionnement:
1. Ouvrez `index.html` dans votre navigateur.
2. Saisissez un texte/URL.
3. (Optionnel) Importez un logo PNG/JPG.
4. Cliquez sur « Générer » puis « Télécharger PNG ».
5. Options de taille, bordure et ratio du logo disponibles.

## Déploiement GitHub Pages (GitHub Actions)

Le workflow `.github/workflows/deploy.yml` publie automatiquement le site statique à chaque push sur `main`.

Étapes:
1. Dans le dépôt GitHub: Settings → Pages → Source: « GitHub Actions ».
2. Poussez vos changements sur la branche `main`.
3. Attendez la fin du workflow; l'URL publique sera indiquée.

Aucun backend, Docker ou service externe n'est nécessaire. Le site est entièrement statique et hébergé par GitHub Pages.