/**
 * À coller dans Google Apps Script (Feuille → Extensions → Apps Script),
 * ou https://script.google.com → projet lié au tableur.
 *
 * Déploiement : Déployer → Nouveau déploiement → Type « Application Web »
 * - Exécuter en tant que : Moi
 * - Qui a accès : Tout le monde (pour que les invités puissent envoyer sans compte)
 * Copier l’URL /exec dans main.js → GOOGLE_SHEETS_CONFIG.webAppUrl
 *
 * Optionnel — secret anti-spam : Fichier → Paramètres du projet → Propriétés du script
 * Clé : RSVP_SECRET   Valeur : (mot de passe) — la même dans main.js secretToken
 */
var SPREADSHEET_ID = "1iPO-9Uw9euOTOcM8pgetefg0dnAtEnwx9dfp4sTI3Ww";

/** Nom de l’onglet dans le classeur Google Sheet */
var SHEET_NAME = "J&J";

/** Retourne la feuille nommée SHEET_NAME, ou la crée si elle n’existe pas */
function getOrCreateSheet(ss) {
  if (!SHEET_NAME || String(SHEET_NAME).trim() === "") {
    return ss.getSheets()[0];
  }
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
  }
  return sh;
}

function decodeURIComponentSafe_(s) {
  try {
    return decodeURIComponent(String(s).replace(/\+/g, " "));
  } catch (err) {
    return String(s);
  }
}

/** Fusionne postData (corps brut) et e.parameter (souvent identiques côté Google). */
function parseUrlEncodedInto_(contents, target) {
  var pairs = String(contents).split("&");
  for (var i = 0; i < pairs.length; i++) {
    if (!pairs[i]) continue;
    var eq = pairs[i].indexOf("=");
    var rawKey = eq === -1 ? pairs[i] : pairs[i].substring(0, eq);
    var rawVal = eq === -1 ? "" : pairs[i].substring(eq + 1);
    var key = decodeURIComponentSafe_(rawKey);
    var val = decodeURIComponentSafe_(rawVal);
    target[key] = val;
  }
}

/** Lit les champs POST : corps brut d’abord, puis e.parameter écrase si besoin. */
function parsePostParameters_(e) {
  var p = {};
  if (!e) return p;
  if (e.postData && e.postData.contents) {
    parseUrlEncodedInto_(e.postData.contents, p);
  }
  if (e.parameter) {
    for (var k in e.parameter) {
      if (Object.prototype.hasOwnProperty.call(e.parameter, k)) {
        p[k] = e.parameter[k];
      }
    }
  }
  return p;
}

function doPost(e) {
  try {
    var p = parsePostParameters_(e || {});
    var secret = PropertiesService.getScriptProperties().getProperty("RSVP_SECRET");
    if (secret && String(secret).length > 0 && p.token !== secret) {
      return HtmlService.createHtmlOutput("denied");
    }

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = getOrCreateSheet(ss);

    var row = [
      new Date(),
      p["mairie-nom"] || "",
      p["mairie-prenom"] || "",
      p["mairie-nb"] || "",
      p["houppa-nom"] || "",
      p["houppa-prenom"] || "",
      p["houppa-nb"] || "",
      p["henne-nom"] || "",
      p["henne-prenom"] || "",
      p["henne-nb"] || "",
    ];
    sh.appendRow(row);
    return HtmlService.createHtmlOutput("ok");
  } catch (err) {
    return HtmlService.createHtmlOutput("error: " + err.message);
  }
}

function doGet() {
  return HtmlService.createHtmlOutput("RSVP — utilisez POST depuis le site.");
}

/** À exécuter une fois dans l’éditeur (▶) pour créer la ligne d’en-têtes */
function creerEnTetes() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = getOrCreateSheet(ss);
  sh
    .getRange(1, 1, 1, 10)
    .setValues([
      [
        "Horodatage",
        "Mairie — nom",
        "Mairie — prénom",
        "Mairie — nombre",
        "Houppa — nom",
        "Houppa — prénom",
        "Houppa — nombre",
        "Henné — nom",
        "Henné — prénom",
        "Henné — nombre",
      ],
    ]);
}
