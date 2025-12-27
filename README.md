# QR Code Creator

Générateur de QR codes 100% statique, personnalisable et déployé automatiquement sur GitHub Pages.

Deux usages complémentaires:
- Script Python (`qr_code_creator.py`) pour produire des PNG HD avec logo.
- Page web (`index.html`) côté client sans backend ni service externe.

---

## 🚀 Page Web (statique)

Fichiers principaux:
- `index.html` (UI)
- `assets/css/styles.css` (styles)
- `assets/js/app.js` (logique)
- Librairie QR via CDN (jsDelivr)

### Fonctionnalités
- Saisie de texte/URL et aperçu en direct sur canvas.
- Import de logo (PNG/JPG) avec fond blanc sous le logo pour la lisibilité.
- Formats d’export: PNG, JPEG, SVG.
- Taille du QR: menu (256, 512, 1024, 2048) + option « Autre… » (saisie libre).
- Bordure (margin) configurable.
- Couleurs personnalisables (code et fond) avec validation (elles doivent être différentes).
- Ratio du logo avec boutons − / + et affichage en %.
- Personnalisation fine des formes:
	- Corps (modules): Carré, Rond, Arrondi.
	- Contour des marqueurs (les 3 gros repères): Carré, Rond, Arrondi, trait d’un module.
	- Centre des marqueurs (points internes 3×3): Carré, Rond, Arrondi.
- Comportement des repères:
	- Le centre ne touche que le 3×3 interne.
	- Le contour gère uniquement l’extérieur autour du centre.
	- La zone 7×7 des repères est nettoyée légèrement au‑delà (≈ 0,5 module) avant superposition pour éviter tout reste du corps.

### Essayer en local
Option 1 (recommandé): serveur local

```
python -m http.server 8000
```

Puis ouvrez: `http://localhost:8000/index.html`.

Option 2: ouvrir le fichier `index.html` directement. Selon le navigateur, certaines restrictions de fichiers locaux peuvent s’appliquer; le serveur local évite ces soucis.

### Export SVG: notes techniques
- Corps « Carré/Rond/Arrondi »: construit en SVG natif.
- Corps « par la librairie » n’est plus proposé dans l’UI: on reconstruit toujours les repères (contour + centre) après nettoyage.
- Le logo est ré‑encodé en PNG et intégré via `<image>` avec les bons namespaces (`xmlns`, `xmlns:xlink`).

---

## 📦 Déploiement GitHub Pages (via GitHub Actions)

Le workflow `.github/workflows/deploy.yml` publie automatiquement la page à chaque push sur `main`.

Étapes:
1. Dans GitHub → Settings → Pages → Source: « GitHub Actions ».
2. Poussez vos changements sur `main`.
3. Attendez la fin du workflow; l’URL publique sera disponible (en général: `https://<votre-utilisateur>.github.io/<nom-du-depot>/`).

Aucun backend, Docker ou service externe requis. Le site est entièrement statique.

### 🔗 Site déjà déployé

Accédez directement au générateur: https://benelhadj.github.io/QR-code_creator/

---

## 🐍 Script Python (PNG HD avec logo)

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
- Correction d’erreur élevée (H).
- PNG haute résolution.
- Fond blanc sous le logo pour une meilleure lisibilité.

---

## ❗ Dépannage (FAQ)
- « Les couleurs doivent être différentes »: choisissez des valeurs distinctes pour le code et le fond.
- « Le logo ne s’affiche pas »: vérifiez le format (PNG/JPG) et testez via `python -m http.server`.
- « L’export SVG n’affiche pas le logo »: le projet ré‑encode le logo en PNG et l’intègre avec les namespaces requis; si un viewer ne l’affiche pas, testez dans un navigateur moderne.
- GitHub Pages met du temps à se propager (quelques minutes). Rafraîchissez sans cache si besoin.

---

## 🔖 Licence et crédits
- Génération côté client via une librairie QR (CDN jsDelivr).
- Ce projet est purement statique et destiné à un usage éducatif / personnel.
