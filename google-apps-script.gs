/**
 * M-INFRA — Réception des demandes de devis dans Google Sheets
 * À coller dans : Google Sheet > Extensions > Apps Script
 * Puis : Déployer > Nouveau déploiement > Application Web
 *   - Exécuter en tant que : Moi
 *   - Accès : Tout le monde
 */

const SHEET_NAME = 'Demandes';
// Email qui reçoit une alerte à chaque nouvelle demande (laisser '' pour désactiver)
const NOTIFY_EMAIL = '';

const HEADERS = ['Date', 'Nom', 'Téléphone', 'Email', 'Ville', 'Profil', 'Travaux',
                 'Surface / longueur', 'Démarrage', 'Message', 'Source pub', 'Page', 'Statut'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = (e && e.parameter) || {};
    if (p.website) return respond({ ok: true }); // anti-spam (champ caché rempli par un robot)

    const ss = SpreadsheetApp.getActiveSpreadsheet();
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
    return respond({ ok: true });
  } catch (err) {
    return respond({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Test rapide dans le navigateur : ouvrir l'URL du script doit afficher {"ok":true,"status":"en ligne"}
function doGet() {
  return respond({ ok: true, status: 'en ligne' });
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
