// Enkel mobilmeny + active links
const burger = document.querySelector('.burger');
const nav = document.querySelector('.nav');
burger?.addEventListener('click', () => {
  nav.classList.toggle('nav--open');
  const expanded = burger.getAttribute('aria-expanded') === 'true';
  burger.setAttribute('aria-expanded', String(!expanded));
});

const sections = document.querySelectorAll('section[id], body#home');
const links = document.querySelectorAll('.nav__links a');
const setActive = (id) => { links.forEach(a => a.classList.toggle('is-active', a.getAttribute('data-target') === id)); };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) { setActive(entry.target.id || 'home'); } });
}, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
sections.forEach(sec => observer.observe(sec));
document.getElementById('navLinks')?.addEventListener('click', (e) => {
  if (e.target.matches('a')) {
    nav.classList.remove('nav--open');
    burger.setAttribute('aria-expanded', 'false');
  }
});


