# M-INFRA — Landing page VRD

Landing page avec formulaire de devis. Chaque demande arrive automatiquement dans une Google Sheet.

```
m-infra-landing/
├── index.html               ← la page (HTML + CSS + JS)
├── images/                  ← les 8 photos de chantier
├── api/lead.js              ← relais serveur Vercel (formulaire → Google Sheets)
├── google-apps-script.gs    ← le code à coller dans Google Sheets
└── README.md
```

---

## Étape 1 — Relier le formulaire à Google Sheets

Le formulaire envoie les demandes à **ton propre site** (`/api/lead`, fichier `api/lead.js`), qui les transmet à Google.
C'est fiable sur PC, mobile et dans le navigateur de Facebook/Instagram, et chaque demande n'est écrite qu'**une seule fois**.

1. Ouvre ta Google Sheet › **Extensions › Apps Script**, remplace tout par le contenu de `google-apps-script.gs` (version 4), enregistre.
2. **Déployer › Gérer les déploiements › ✏️ › Version : Nouvelle version › Déployer**
   (première fois : Nouveau déploiement › Application Web › Exécuter en tant que **Moi** › Accès **Tout le monde**).
3. Vérifie : ouvre l'URL du script (finit par `/exec`) → `{"ok":true,"status":"en ligne","version":4}`.
4. Colle cette URL dans **`api/lead.js`**, ligne `SCRIPT_URL` :

```js
const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/XXXX/exec";
```

   (ou, sur Vercel : Settings › Environment Variables › `GOOGLE_SCRIPT_URL` = ton URL, puis Redeploy.)

5. Dans `index.html`, bloc `CONFIG` en bas : ton numéro `WHATSAPP` et l'ID `META_PIXEL_ID` (optionnels).

> ⚠️ Le formulaire ne fonctionne qu'une fois le site **en ligne sur Vercel** (le dossier `api/` y devient un mini-serveur). En ouvrant `index.html` directement sur ton PC, l'envoi échoue : c'est normal.

**Diagnostic** : ouvre le site avec `?debug=1` à la fin de l'adresse ; en cas d'échec, le message affiche la cause exacte.

## Étape 2 — Mettre le projet sur GitHub

Dans un terminal, depuis le dossier `m-infra-landing` :

```bash
git init
git add .
git commit -m "Landing page M-INFRA"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/m-infra-landing.git
git push -u origin main
```

(Crée d'abord le dépôt vide `m-infra-landing` sur github.com › New repository.)

Sans terminal : sur GitHub, crée le dépôt puis **Add file › Upload files** et glisse tout le contenu du dossier (y compris le dossier `images`).

---

## Étape 3 — Mettre en ligne avec Vercel

1. Va sur **vercel.com** et connecte-toi avec ton compte GitHub.
2. **Add New › Project**, choisis le dépôt `m-infra-landing`, clique **Import**.
3. Framework Preset : **Other**. Ne change rien d'autre, clique **Deploy**.
4. Ta page est en ligne sur une adresse du type `m-infra-landing.vercel.app`.
5. (Optionnel) **Settings › Domains** pour brancher ton propre nom de domaine (ex. `m-infra.ma`).

À chaque `git push`, Vercel remet le site à jour automatiquement.

---

## Étape 4 — Relier tes pubs

- Lien de la pub : `https://ton-site.vercel.app/?utm_source=facebook&utm_campaign=vrd-video`
- La colonne **Source pub** de la Sheet indique d'où vient chaque demande.
- **Pixel Meta** : colle l'ID de ton pixel dans `CONFIG.META_PIXEL_ID` (en bas de `index.html`). La page envoie alors :
  - `PageView` à chaque visite,
  - `Lead` quand une demande est bien enregistrée dans la Sheet,
  - `Contact` au clic sur le bouton WhatsApp.

## Dans la Google Sheet

Colonnes : Date · Nom · Téléphone · Email · Ville · Profil · Travaux · Surface / longueur · Démarrage · Message · Source pub · Page · Statut.
La colonne **Statut** commence à « Nouveau » : change-la en « Rappelé », « Devis envoyé », « Gagné »… pour suivre tes prospects.

## À compléter dans index.html

Le pied de page contient `[ADRESSE] · [TÉLÉPHONE] · [EMAIL]` : remplace-les par tes vraies coordonnées.
