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
        const r = await fetch(SCRIPT_URL, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
        const t = await r.text();
        try { out.google = JSON.parse(t); }
        catch { out.google = 'Réponse non JSON (HTTP ' + r.status + ') : ' + t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 160); }
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

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(SCRIPT_URL + '?' + params.toString(), { redirect: 'follow', signal: ctrl.signal });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); }
    catch {
      return res.status(502).json({ ok: false, error: 'Le script Google ne répond pas en JSON (HTTP ' + r.status + ') : accès « Tout le monde » ? version 5 déployée ?' });
    }
    if (!data.ok) return res.status(502).json({ ok: false, error: data.error || 'Erreur du script Google' });
    if (data.saved !== true) {
      return res.status(502).json({ ok: false, error: "Le script Google déployé est une ANCIENNE version (il n'enregistre pas) : collez google-apps-script.gs v5 puis Déployer › Gérer les déploiements › Nouvelle version" });
    }
    return res.status(200).json({ ok: true, duplicate: !!data.duplicate, sheet: data.sheet, onglet: data.onglet, ligne: data.ligne });
  } catch (err) {
    return res.status(504).json({ ok: false, error: err.name === 'AbortError' ? 'Google ne répond pas (délai dépassé)' : String(err.message || err) });
  } finally {
    clearTimeout(timer);
  }
};
