/**
 * M-INFRA — Réception des demandes de devis dans Google Sheets
 * À coller dans : Google Sheet > Extensions > Apps Script
 * Puis : Déployer > Nouveau déploiement > Application Web
 *   - Exécuter en tant que : Moi
 *   - Qui a accès : Tout le monde   (PAS « Tout utilisateur disposant d'un compte Google »)
 */

// Optionnel : l'ID de ta Google Sheet (la partie entre /d/ et /edit dans son adresse).
// Obligatoire seulement si le script a été créé depuis script.google.com et non depuis la Sheet.
const SHEET_ID = '';
const SHEET_NAME = 'Demandes';
// Email qui reçoit une alerte à chaque nouvelle demande (laisser '' pour désactiver)
const NOTIFY_EMAIL = '';

const HEADERS = ['Date', 'Nom', 'Téléphone', 'Email', 'Ville', 'Profil', 'Travaux',
                 'Surface / longueur', 'Démarrage', 'Message', 'Source pub', 'Page', 'Statut'];

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.website) return respond({ ok: true }); // anti-spam (champ caché rempli par un robot)
    saveLead(p);
    return respond({ ok: true });
  } catch (err) {
    console.error(err);
    return respond({ ok: false, error: String(err) });
  }
}

// Test dans le navigateur :
//   URL_DU_SCRIPT            → {"ok":true,"status":"en ligne"}
//   URL_DU_SCRIPT?test=1     → ajoute une ligne « TEST » dans la Sheet
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.test) {
      saveLead({ nom: 'TEST', telephone: '0600000000', ville: 'Test', profil: 'Test',
                 travaux: 'Test', message: 'Ligne de test envoyée depuis le navigateur', source: 'test' });
      return respond({ ok: true, status: 'ligne de test ajoutée dans la Sheet' });
    }
    return respond({ ok: true, status: 'en ligne' });
  } catch (err) {
    return respond({ ok: false, error: String(err) });
  }
}

// Test dans l'éditeur Apps Script : choisis « testAjout » puis clique Exécuter
function testAjout() {
  saveLead({ nom: 'TEST ÉDITEUR', telephone: '0600000000', ville: 'Test', profil: 'Test',
             travaux: 'Test', message: 'Ligne de test depuis l\'éditeur', source: 'test' });
  console.log('OK : une ligne a été ajoutée dans l\'onglet ' + SHEET_NAME);
}

function saveLead(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
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

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL,
        'Nouvelle demande de devis VRD – ' + clean(p.nom) + ' (' + clean(p.ville) + ')',
        HEADERS.slice(0, 12).map((h, i) => h + ' : ' + String(row[i]).replace(/^'/, '')).join('\n'));
    }
  } finally {
    lock.releaseLock();
  }
}

// Nettoie les valeurs et empêche l'injection de formules dans le tableur
function clean(v) {
  v = String(v || '').trim().slice(0, 2000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
