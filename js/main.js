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
  if (e.key === 'Escape') closeNav();
});
