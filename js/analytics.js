document.addEventListener('DOMContentLoaded', () => {
  // 1. Track Explore Button
  const exploreBtn = document.querySelector('.explore-button'); 
  if (exploreBtn) {
    exploreBtn.addEventListener('click', () => {
      window.dataLayer.push({
        event: 'cta_click',
        button_name: 'explore_hero'
      });
    });
  }

  // 2. Track Nav Links
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => {
      window.dataLayer.push({
        event: 'nav_click',
        section: link.innerText
      });
    });
  });
});