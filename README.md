# M-INFRA — Landing page VRD

Landing page avec formulaire de devis. Chaque demande arrive automatiquement dans une Google Sheet.

```
m-infra-landing/
├── index.html               ← la page (HTML + CSS + JS)
├── images/                  ← les 8 photos de chantier
├── google-apps-script.gs    ← le code à coller dans Google Sheets
└── README.md
```

---

## Étape 1 — Relier le formulaire à Google Sheets

1. Crée une nouvelle Google Sheet, par exemple « M-INFRA – Demandes de devis ».
2. Menu **Extensions › Apps Script**.
3. Efface le code présent, colle tout le contenu de `google-apps-script.gs`, puis enregistre.
4. (Optionnel) Dans le code, mets ton email dans `NOTIFY_EMAIL` pour recevoir une alerte à chaque demande.
5. Clique **Déployer › Nouveau déploiement** :
   - Type : **Application Web**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
6. Autorise l'accès quand Google le demande (« Paramètres avancés › Accéder au projet »).
7. Copie l'**URL de l'application Web** (elle commence par `https://script.google.com/macros/s/…/exec`).
8. Ouvre `index.html`, cherche `CONFIG` en bas du fichier et colle l'URL :

```js
const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/XXXX/exec",
  WHATSAPP: "2126XXXXXXXX"   // optionnel : ton numéro WhatsApp, sans + ni espaces
};
```

Test : ouvre l'URL du script dans ton navigateur, tu dois voir `{"ok":true,"status":"en ligne"}`.

> Si tu modifies le code Apps Script plus tard : **Déployer › Gérer les déploiements › Modifier › Nouvelle version**, sinon l'ancienne version reste active.

---

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
- Si tu ajoutes le **Pixel Meta** dans le `<head>`, la page envoie automatiquement l'événement `Lead` à chaque demande envoyée.

## Dans la Google Sheet

Colonnes : Date · Nom · Téléphone · Email · Ville · Profil · Travaux · Surface / longueur · Démarrage · Message · Source pub · Page · Statut.
La colonne **Statut** commence à « Nouveau » : change-la en « Rappelé », « Devis envoyé », « Gagné »… pour suivre tes prospects.

## À compléter dans index.html

Le pied de page contient `[ADRESSE] · [TÉLÉPHONE] · [EMAIL]` : remplace-les par tes vraies coordonnées.
