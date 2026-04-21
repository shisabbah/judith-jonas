(function () {
  /**
   * ─── Google Sheets (recommandé) ───
   * Feuille : https://docs.google.com/spreadsheets/d/1iPO-9Uw9euOTOcM8pgetefg0dnAtEnwx9dfp4sTI3Ww/edit
   * 1. Copie apps-script/Code.gs dans Extensions → Apps Script de cette feuille.
   * 2. Déploie comme application Web (voir commentaires dans Code.gs).
   * 3. Colle l’URL /exec dans webAppUrl ci‑dessous.
   *
   * ─── Fallback : Google Form ───
   * Si webAppUrl est vide mais formResponseUrl est rempli, envoi vers le Form (entry.xxx).
   */
  var GOOGLE_SHEETS_CONFIG = {
    /** URL du déploiement Apps Script se terminant par /exec */
    webAppUrl:
      "https://script.google.com/macros/s/AKfycbya6kwMQbxg6Itx7EHkb1iHGrF0lrE-GpPo8iXc4Rm8e8e6fkPW6gEcxOaufCDgCGEL/exec",
    /** Optionnel : même valeur que la propriété RSVP_SECRET dans Apps Script. Si la propriété existe mais que ce champ est vide, tout envoi est refusé (denied). */
    secretToken: "",
  };

  var FIELD_NAMES = [
    "mairie-nom",
    "mairie-prenom",
    "mairie-nb",
    "houppa-nom",
    "houppa-prenom",
    "houppa-nb",
    "henne-nom",
    "henne-prenom",
    "henne-nb",
  ];

  function postFormToUrl(formEl, actionUrl, buildInputs) {
    var iframe = document.createElement("iframe");
    iframe.name = "submit_" + Date.now();
    iframe.style.cssText = "display:none;width:0;height:0;border:0;";
    iframe.setAttribute("aria-hidden", "true");
    iframe.title = "Envoi";
    document.body.appendChild(iframe);

    var postForm = document.createElement("form");
    postForm.method = "POST";
    postForm.action = actionUrl;
    postForm.target = iframe.name;
    postForm.style.display = "none";

    buildInputs(postForm);

    document.body.appendChild(postForm);
    postForm.submit();

    window.setTimeout(function () {
      if (postForm.parentNode) postForm.parentNode.removeChild(postForm);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 4000);
  }

  function submitToSheets(formEl) {
    var url = GOOGLE_SHEETS_CONFIG.webAppUrl;
    if (!url || typeof url !== "string" || url.indexOf("http") !== 0) {
      console.warn("[RSVP] Renseignez GOOGLE_SHEETS_CONFIG.webAppUrl (Apps Script déployé).");
      return;
    }

    var fd = new FormData(formEl);
    var params = new URLSearchParams();
    FIELD_NAMES.forEach(function (name) {
      params.append(name, (fd.get(name) != null ? fd.get(name) : "").toString());
    });
    var tok = GOOGLE_SHEETS_CONFIG.secretToken;
    if (tok && String(tok).trim() !== "") {
      params.append("token", String(tok));
    }

    function fallbackIframe() {
      postFormToUrl(formEl, url, function (postForm) {
        FIELD_NAMES.forEach(function (name) {
          var input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = (fd.get(name) != null ? fd.get(name) : "").toString();
          postForm.appendChild(input);
        });
        if (tok && String(tok).trim() !== "") {
          var t = document.createElement("input");
          t.type = "hidden";
          t.name = "token";
          t.value = String(tok);
          postForm.appendChild(t);
        }
      });
    }

    /* fetch + URLSearchParams : plus fiable que iframe vers script.google.com (redirections qui perdent le POST) */
    if (typeof fetch !== "undefined") {
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        body: params,
      }).catch(function (err) {
        console.warn("[RSVP] fetch échoué, essai iframe :", err);
        fallbackIframe();
      });
    } else {
      fallbackIframe();
    }
  }

  var GOOGLE_FORM_CONFIG = {
    formResponseUrl: "",
    entries: {
      "mairie-nom": "",
      "mairie-prenom": "",
      "mairie-nb": "",
      "houppa-nom": "",
      "houppa-prenom": "",
      "houppa-nb": "",
      "henne-nom": "",
      "henne-prenom": "",
      "henne-nb": "",
    },
  };

  function submitToGoogleForm(formEl) {
    var url = GOOGLE_FORM_CONFIG.formResponseUrl;
    if (!url || typeof url !== "string" || url.indexOf("formResponse") === -1) {
      console.warn(
        "[RSVP] Google Form : renseignez GOOGLE_FORM_CONFIG.formResponseUrl et les entry.xxx dans main.js"
      );
      return;
    }

    var fd = new FormData(formEl);
    postFormToUrl(formEl, url, function (postForm) {
      var names = GOOGLE_FORM_CONFIG.entries;
      for (var fieldName in names) {
        if (!Object.prototype.hasOwnProperty.call(names, fieldName)) continue;
        var entryId = names[fieldName];
        if (!entryId || String(entryId).trim() === "") continue;

        var input = document.createElement("input");
        input.type = "hidden";
        input.name = entryId;
        input.value = (fd.get(fieldName) != null ? fd.get(fieldName) : "").toString();
        postForm.appendChild(input);
      }
    });
  }

  /** Envoie vers Google Sheets (Apps Script), sinon vers Google Form si configuré. */
  function myFunction() {
    var form = document.getElementById("rsvp-form");
    if (!form) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var sheetsUrl = GOOGLE_SHEETS_CONFIG.webAppUrl && String(GOOGLE_SHEETS_CONFIG.webAppUrl).trim();
    var formUrl = GOOGLE_FORM_CONFIG.formResponseUrl && String(GOOGLE_FORM_CONFIG.formResponseUrl).trim();

    if (sheetsUrl) {
      submitToSheets(form);
    } else if (formUrl && formUrl.indexOf("formResponse") !== -1) {
      submitToGoogleForm(form);
    } else {
      console.warn(
        "[RSVP] Configurez GOOGLE_SHEETS_CONFIG.webAppUrl (voir apps-script/Code.gs) ou un Google Form dans GOOGLE_FORM_CONFIG."
      );
    }
  }

  window.myFunction = myFunction;

  // Hauteur viewport réelle (téléphones : 100vh est souvent faux avant / après barre d’adresse)
  function setAppHeight() {
    var h =
      window.visualViewport && window.visualViewport.height
        ? window.visualViewport.height
        : window.innerHeight;
    document.documentElement.style.setProperty("--app-height", h + "px");
  }

  setAppHeight();
  window.addEventListener("resize", setAppHeight);
  window.addEventListener("orientationchange", setAppHeight);
  window.addEventListener("load", setAppHeight);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", setAppHeight);
    window.visualViewport.addEventListener("scroll", setAppHeight);
  }

  // Décompte jusqu’au début du 20 août 2026 (heure locale)
  const WEDDING_TARGET = new Date(2026, 7, 20, 0, 0, 0, 0);

  const splash = document.getElementById("splash");

  function openMain() {
    if (!splash || splash.classList.contains("is-away")) return;
    splash.classList.add("is-away");
    window.setTimeout(function () {
      splash.setAttribute("hidden", "");
    }, 850);
  }

  if (splash) {
    splash.addEventListener("click", openMain);
    splash.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMain();
      }
    });
    splash.setAttribute("tabindex", "0");
    splash.setAttribute("role", "button");
    splash.setAttribute("aria-label", "Ouvrir l’invitation");
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tickCountdown() {
    const now = new Date();
    let diff = WEDDING_TARGET.getTime() - now.getTime();

    const els = {
      days: document.getElementById("cd-days"),
      hours: document.getElementById("cd-hours"),
      minutes: document.getElementById("cd-minutes"),
      seconds: document.getElementById("cd-seconds"),
    };

    if (diff <= 0) {
      if (els.days) els.days.textContent = "0";
      if (els.hours) els.hours.textContent = "0";
      if (els.minutes) els.minutes.textContent = "0";
      if (els.seconds) els.seconds.textContent = "0";
      return;
    }

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    diff -= days * 24 * 60 * 60 * 1000;
    const hours = Math.floor(diff / (60 * 60 * 1000));
    diff -= hours * 60 * 60 * 1000;
    const minutes = Math.floor(diff / (60 * 1000));
    diff -= minutes * 60 * 1000;
    const seconds = Math.floor(diff / 1000);

    if (els.days) els.days.textContent = String(days);
    if (els.hours) els.hours.textContent = pad(hours);
    if (els.minutes) els.minutes.textContent = pad(minutes);
    if (els.seconds) els.seconds.textContent = pad(seconds);
  }

  tickCountdown();
  window.setInterval(tickCountdown, 1000);

  const rsvpForm = document.getElementById("rsvp-form");
  const rsvpContent = document.getElementById("rsvp-content");
  const rsvpSuccess = document.getElementById("rsvp-success");

  if (rsvpForm && rsvpContent && rsvpSuccess) {
    rsvpForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!rsvpForm.checkValidity()) {
        rsvpForm.reportValidity();
        return;
      }
      myFunction();
      rsvpContent.hidden = true;
      rsvpSuccess.hidden = false;
    });
  }
})();
