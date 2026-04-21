(function () {
  /**
   * ─── Google Sheets (recommandé) ───
   * Feuille : https://docs.google.com/spreadsheets/d/1iPO-9Uw9euOToCM8pgetefg0dnAtEnwx9dfp4sT13Ww/edit
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
      "https://script.google.com/macros/s/AKfycbwvF3DjXG7MDdOUnCEg_VHknaBadjbjtRWTYJ-ge4b_LR2M1E7QfycvzfLwasRQ_Jg/exec",
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

  /**
   * Envoi vers Apps Script : GET via formulaire vers une fenêtre nommée (navigation complète, pas iframe / pas img).
   * Les requêtes img (Sec-Fetch-Dest: image) peuvent ne pas exécuter doGet comme un vrai GET « document ».
   * Un petit onglet affiche « ok » ou « error » — vous pouvez le fermer ; la ligne doit apparaître dans la Sheet.
   */
  function submitToSheets(formEl) {
    var url = GOOGLE_SHEETS_CONFIG.webAppUrl;
    if (!url || typeof url !== "string" || url.indexOf("http") !== 0) {
      console.warn("[RSVP] Renseignez GOOGLE_SHEETS_CONFIG.webAppUrl (Apps Script déployé).");
      return;
    }

    var fd = new FormData(formEl);
    var baseUrl = url.split("?")[0];

    var form = document.createElement("form");
    form.method = "GET";
    form.action = baseUrl;
    form.target = "jj_gs_rsvp";
    form.acceptCharset = "UTF-8";
    form.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;";
    form.setAttribute("aria-hidden", "true");

    function addField(name, value) {
      var inp = document.createElement("input");
      inp.type = "hidden";
      inp.name = name;
      inp.value = value != null ? String(value) : "";
      form.appendChild(inp);
    }

    FIELD_NAMES.forEach(function (name) {
      addField(name, fd.get(name));
    });
    var tok = GOOGLE_SHEETS_CONFIG.secretToken;
    if (tok && String(tok).trim() !== "") {
      addField("token", tok);
    }
    addField("_ts", String(Date.now()));

    document.body.appendChild(form);
    form.submit();
    window.setTimeout(function () {
      if (form.parentNode) {
        form.parentNode.removeChild(form);
      }
    }, 0);
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

  // Hauteur viewport réelle — sans écouter « scroll » du visualViewport (spam au clavier → INP élevé)
  var lastAppHeightPx = -1;
  var heightRaf = null;

  function setAppHeight() {
    var h =
      window.visualViewport && window.visualViewport.height
        ? window.visualViewport.height
        : window.innerHeight;
    if (h === lastAppHeightPx) return;
    lastAppHeightPx = h;
    document.documentElement.style.setProperty("--app-height", h + "px");
  }

  function scheduleAppHeight() {
    if (heightRaf != null) return;
    heightRaf = requestAnimationFrame(function () {
      heightRaf = null;
      setAppHeight();
    });
  }

  setAppHeight();
  window.addEventListener("resize", scheduleAppHeight, { passive: true });
  window.addEventListener("orientationchange", scheduleAppHeight);
  window.addEventListener("load", scheduleAppHeight);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleAppHeight, { passive: true });
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
