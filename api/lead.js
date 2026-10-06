/**
 * M-INFRA — Relais serveur Vercel : /api/lead
 * Le formulaire envoie la demande ici (même site → aucun blocage, mobile compris).
 * Ce relais la transmet au script Google et renvoie sa VRAIE réponse au navigateur.
 */

// URL de l'application Web Google Apps Script (se termine par /exec).
// Vous pouvez aussi la définir sur Vercel : Settings › Environment Variables › GOOGLE_SCRIPT_URL
const RAW_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbzBRv1BE9Xzg5KshoOaAnQZWT8F4ok_mXYq572G_Y6El8bymj3dZao70B3p0xRZ1zOC/exec";

// Nettoyage automatique : espaces, guillemets, paramètres ou « / » en trop, format compte Google professionnel (/a/macros/…)
const SCRIPT_URL = String(RAW_SCRIPT_URL).trim().replace(/^["']|["']$/g, '').split(/[?#]/)[0].replace(/\/+$/, '');
const URL_OK = /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+|macros)\/s\/[\w-]+\/exec$/.test(SCRIPT_URL);
const mask = u => u.replace(/\/s\/([\w-]{6})[\w-]+([\w-]{4})\//, '/s/$1…$2/');

const https = require('https');
const http = require('http');

// Requête GET robuste vers Google : IPv4, redirections suivies à la main, délai maîtrisé
function getText(url, timeoutMs, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.get(u, { family: 4, headers: { 'User-Agent': 'M-INFRA-relais/1.0', 'Accept': 'application/json,*/*' } }, (resp) => {
      const loc = resp.headers.location;
      if (resp.statusCode >= 300 && resp.statusCode < 400 && loc) {
        resp.resume();
        if (redirectsLeft <= 0) return reject(new Error('Trop de redirections'));
        return resolve(getText(new URL(loc, u).toString(), timeoutMs, redirectsLeft - 1));
      }
      let data = '';
      resp.setEncoding('utf8');
      resp.on('data', c => { data += c; if (data.length > 200000) req.destroy(new Error('Réponse trop longue')); });
      resp.on('end', () => resolve({ status: resp.statusCode, text: data, finalUrl: u.hostname }));
    });
    req.setTimeout(timeoutMs, () => req.destroy(Object.assign(new Error('Google ne répond pas (délai de ' + Math.round(timeoutMs / 1000) + ' s dépassé)'), { name: 'TimeoutError' })));
    req.on('error', reject);
  });
}

const FIELDS = { nom: 120, telephone: 30, email: 120, ville: 120, profil: 60, travaux: 300,
                 surface: 120, demarrage: 60, message: 1500, source: 300, page: 300, rid: 64, website: 200 };

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  // Diagnostic sans rien écrire : ouvrir https://VOTRE-SITE/api/lead dans le navigateur
  if (req.method === 'GET') {   // toute ouverture dans le navigateur = diagnostic (n'écrit rien)
    const out = { relais: 'en ligne', urlConfiguree: RAW_SCRIPT_URL !== 'COLLEZ_ICI_L_URL_DE_VOTRE_SCRIPT_GOOGLE',
                  urlValide: URL_OK, url: URL_OK ? mask(SCRIPT_URL) : String(RAW_SCRIPT_URL).slice(0, 40) + '…',
                  source: process.env.GOOGLE_SCRIPT_URL ? 'variable Vercel GOOGLE_SCRIPT_URL' : 'fichier api/lead.js' };
    if (URL_OK) {
      try {
        const t0 = Date.now();
        const r = await getText(SCRIPT_URL, 25000);
        out.dureeGoogle = ((Date.now() - t0) / 1000).toFixed(1) + ' s';
        try { out.google = JSON.parse(r.text); }
        catch { out.google = 'Réponse non JSON (HTTP ' + r.status + ', ' + r.finalUrl + ') : ' + r.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200); }
      } catch (e) { out.google = 'Injoignable : ' + (e.message || e); }
    }
    return res.status(200).json(out);
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  if (!URL_OK) {
    return res.status(500).json({ ok: false, error: "URL du script Google manquante ou invalide dans api/lead.js (ouvrez /api/lead dans le navigateur)" });
  }

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  // Anti-robot : champ caché rempli → on répond OK sans rien enregistrer
  if (body.website) return res.status(200).json({ ok: true });

  const params = new URLSearchParams({ action: 'add' });
  for (const [k, max] of Object.entries(FIELDS)) {
    if (k === 'website') continue;
    params.set(k, String(body[k] ?? '').trim().slice(0, max));
  }
  if (!params.get('nom') || !params.get('telephone') || !params.get('ville')) {
    return res.status(400).json({ ok: false, error: 'Nom, téléphone et ville sont obligatoires' });
  }
  if (!/^[+0-9 ().-]{8,20}$/.test(params.get('telephone'))) {
    return res.status(400).json({ ok: false, error: 'Numéro de téléphone invalide' });
  }

  try {
    const r = await getText(SCRIPT_URL + '?' + params.toString(), 25000);
    let data;
    try { data = JSON.parse(r.text); }
    catch {
      return res.status(502).json({ ok: false, error: 'Le script Google ne répond pas en JSON (HTTP ' + r.status + ', ' + r.finalUrl + ') : accès « Tout le monde » ? autorisations accordées ? version 5 déployée ?' });
    }
    if (!data.ok) return res.status(502).json({ ok: false, error: data.error || 'Erreur du script Google' });
    if (data.saved !== true) {
      return res.status(502).json({ ok: false, error: "Le script Google déployé est une ANCIENNE version (il n'enregistre pas) : collez google-apps-script.gs v5 puis Déployer › Gérer les déploiements › Nouvelle version" });
    }
    return res.status(200).json({ ok: true, duplicate: !!data.duplicate, sheet: data.sheet, onglet: data.onglet, ligne: data.ligne });
  } catch (err) {
    return res.status(504).json({ ok: false, error: String(err.message || err) });
  }
};
