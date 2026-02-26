// Mobile nav toggle
const hamburger = document.getElementById('hamburger');
const navMobile = document.getElementById('navMobile');
const navClose = document.getElementById('navClose');
const mobileLinks = document.querySelectorAll('.nav-mobile__link');

function openNav() {
  navMobile.classList.add('is-open');
  navMobile.setAttribute('aria-hidden', 'false');
  hamburger.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeNav() {
  navMobile.classList.remove('is-open');
  navMobile.setAttribute('aria-hidden', 'true');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

hamburger?.addEventListener('click', openNav);
navClose?.addEventListener('click', closeNav);

mobileLinks.forEach(link => {
  link.addEventListener('click', closeNav);
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeNav(); closePopup(); }
});

// Dot popup
const dotBtn = document.getElementById('dotBtn');
const dotPopup = document.getElementById('dotPopup');
const dotBackdrop = document.getElementById('dotBackdrop');
const dotClose = document.getElementById('dotClose');

function openPopup() {
  dotPopup.classList.add('is-open');
  dotBackdrop.classList.add('is-open');
  dotPopup.setAttribute('aria-hidden', 'false');
}

function closePopup() {
  dotPopup.classList.remove('is-open');
  dotBackdrop.classList.remove('is-open');
  dotPopup.setAttribute('aria-hidden', 'true');
}

dotBtn?.addEventListener('click', openPopup);
dotBtn?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openPopup(); });
dotClose?.addEventListener('click', closePopup);
dotBackdrop?.addEventListener('click', closePopup);

// Lead magnet – email capture
(function () {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby2JxC5paFWhOneZWoOsmCo6UiRR-1ewL_Tsssw3OdfEVZosHmFxJ-KldSLZ8C7Mb0/exec';
  const form = document.getElementById('leadForm');
  const successPanel = document.getElementById('leadSuccess');
  const submitBtn = document.getElementById('leadSubmit');

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('leadEmail').value.trim();
    if (!email) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    const body = new FormData();
    body.append('email', email);
    body.append('name', document.getElementById('leadName').value.trim());
    body.append('page', window.location.href);
    body.append('user_agent', navigator.userAgent);

    // Google Apps Script requires no-cors; response will be opaque but the data lands in Sheets
    fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body })
      .then(() => showSuccess())
      .catch(() => showSuccess()); // show download even on network error — data may have been captured

    function showSuccess() {
      form.style.display = 'none';
      successPanel.classList.add('is-visible');
      successPanel.removeAttribute('aria-hidden');
      // GTM event
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'lead_magnet_submit', email_captured: true });
    }
  });
})();
