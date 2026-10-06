/**
 * M-INFRA — Réception des demandes de devis dans Google Sheets  (version 5)
 * À coller dans : Google Sheet > Extensions > Apps Script (remplace tout l'ancien code)
 * Puis : Déployer > Gérer les déploiements > ✏️ > Version : Nouvelle version > Déployer
 *   - Exécuter en tant que : Moi
 *   - Qui a accès : Tout le monde
 * v5 : confirmation explicite (saved + nom de la Sheet), anti-doublon, plus rapide.
 */

// Optionnel : l'ID de ta Google Sheet (la partie entre /d/ et /edit dans son adresse).
// Obligatoire seulement si le script a été créé depuis script.google.com et non depuis la Sheet.
const SHEET_ID = '';
const SHEET_NAME = 'Demandes';
// Email qui reçoit une alerte à chaque nouvelle demande (laisser '' pour désactiver)
const NOTIFY_EMAIL = '';

const HEADERS = ['Date', 'Nom', 'Téléphone', 'Email', 'Ville', 'Profil', 'Travaux',
                 'Surface / longueur', 'Démarrage', 'Message', 'Source pub', 'Page', 'Statut'];

/**
 * Le site (via /api/lead sur Vercel) envoie les demandes ici : GET avec action=add.
 * Tests dans le navigateur :
 *   URL_DU_SCRIPT          → {"ok":true,"status":"en ligne","version":5}
 *   URL_DU_SCRIPT?test=1   → ajoute une ligne « TEST » dans la Sheet
 */
function doGet(e) {
  const p = (e && e.parameter) || {};
  let result;
  try {
    if (p.action === 'add') {
      result = p.website ? { ok: true } : saveLead(p);
    } else if (p.test) {
      saveLead({ nom: 'TEST', telephone: '0600000000', ville: 'Test', profil: 'Test',
                 travaux: 'Test', message: 'Ligne de test envoyée depuis le navigateur', source: 'test' });
      result = { ok: true, status: 'ligne de test ajoutée dans la Sheet' };
    } else {
      result = { ok: true, status: 'en ligne', version: 5 };
    }
  } catch (err) {
    console.error(err);
    result = { ok: false, error: String(err) };
  }
  return respond(result, p.callback);
}

// Gardé pour compatibilité (anciens envois en POST)
function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    return respond(p.website ? { ok: true } : saveLead(p));
  } catch (err) {
    return respond({ ok: false, error: String(err) });
  }
}

// Test dans l'éditeur Apps Script : choisis « testAjout » puis clique Exécuter
function testAjout() {
  saveLead({ nom: 'TEST ÉDITEUR', telephone: '0600000000', ville: 'Test', profil: 'Test',
             travaux: 'Test', message: "Ligne de test depuis l'éditeur", source: 'test' });
  console.log("OK : une ligne a été ajoutée dans l'onglet " + SHEET_NAME);
}

function saveLead(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // Anti-doublon : si cette demande (même identifiant) a déjà été enregistrée, on ne la réécrit pas
    const rid = String(p.rid || '').replace(/[^\w-]/g, '').slice(0, 64);
    const cache = CacheService.getScriptCache();
    if (rid && cache.get('rid_' + rid)) return { ok: true, saved: true, duplicate: true, version: 5 };

    const ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('Aucune Google Sheet trouvée : remplis SHEET_ID en haut du script.');
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#F5B800');
    }
    const row = [
      new Date(),
      clean(p.nom), "'" + clean(p.telephone), clean(p.email), clean(p.ville),
      clean(p.profil), clean(p.travaux), clean(p.surface), clean(p.demarrage),
      clean(p.message), clean(p.source), clean(p.page), 'Nouveau'
    ];
    sh.appendRow(row);
    if (rid) cache.put('rid_' + rid, '1', 21600); // mémorisé 6 h

    if (NOTIFY_EMAIL) {
      try {
        MailApp.sendEmail(NOTIFY_EMAIL,
          'Nouvelle demande de devis VRD – ' + clean(p.nom) + ' (' + clean(p.ville) + ')',
          HEADERS.slice(0, 12).map((h, i) => h + ' : ' + String(row[i]).replace(/^'/, '')).join('\n'));
      } catch (mailErr) { console.error(mailErr); } // un souci d'email ne doit pas faire échouer l'enregistrement
    }
    return { ok: true, saved: true, version: 5, sheet: ss.getName(), onglet: SHEET_NAME, ligne: sh.getLastRow() };
  } finally {
    lock.releaseLock();
  }
}

// Nettoie les valeurs et empêche l'injection de formules dans le tableur
function clean(v) {
  v = String(v || '').trim().slice(0, 2000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

// Réponse JSON (ou JSONP si un nom de callback valide est fourni)
function respond(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback && /^[A-Za-z_$][\w$]{0,60}$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
