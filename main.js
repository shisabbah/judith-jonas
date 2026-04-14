(function () {
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
      rsvpContent.hidden = true;
      rsvpSuccess.hidden = false;
    });
  }
})();
