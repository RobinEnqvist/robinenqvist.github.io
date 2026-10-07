// FEED — the site as an edit timeline. Scroll moves the playhead; the clip under it plays in the monitor.
(() => {
  const FPS = 25;
  const TRACK = { video: 'V1', image: 'I1', text: 'T1' };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (id) => document.getElementById(id);
  const scroller = $('scroller'), frame = $('frame'), lane = $('lane'), ruler = $('ruler'), view = $('view');
  const tcEl = $('tc'), stateEl = $('state'), countEl = $('count'), hint = $('hint'), monitor = $('monitor');
  const capTrack = $('capTrack'), capTitle = $('capTitle'), capDate = $('capDate'), soundBtn = $('sound');

  let posts = [], slides = [], clips = [], starts = [];
  let unit = 240, step = 600;
  let current = 0, target = 0, active = -1, soundOn = false, moved = false, idleTimer = null;

  const pad = (n) => String(n).padStart(2, '0');
  const words = (s) => (s || '').trim().split(/\s+/).length;
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const ymd = (d) => d.split('-').map(Number);
  const fmtDate = (d) => { const [y, m, day] = ymd(d); return `${pad(day)} ${MONTHS[m - 1]} ${y}`; };
  const fmtShort = (d) => { const [y, m, day] = ymd(d); return `${pad(day)} ${MONTHS[m - 1]} ’${String(y).slice(2)}`; };
  const fmtDur = (s) => `${pad(Math.floor(s / 60))}:${pad(Math.round(s % 60))}`;

  function timecode(sec) {
    const f = Math.floor((sec % 1) * FPS), s = Math.floor(sec);
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f)}`;
  }

  // Deterministic pseudo-waveform so every video clip gets its own shape.
  function wave(seed, n = 48) {
    let x = 0;
    for (const c of seed) x = (x * 31 + c.charCodeAt(0)) >>> 0;
    const bars = [];
    for (let i = 0; i < n; i++) {
      x = (x * 1664525 + 1013904223) >>> 0;
      const h = 0.25 + (x / 2 ** 32) * 0.75 * Math.abs(Math.sin(i / 5));
      bars.push(`<rect x="${i * 2}" y="${(1 - h) * 10}" width="1" height="${h * 20}"/>`);
    }
    return `<svg class="clip__wave" viewBox="0 0 ${n * 2} 20" preserveAspectRatio="none" fill="#fff">${bars.join('')}</svg>`;
  }

  function buildSlide(p) {
    const el = document.createElement('div');
    el.className = `slide slide--${p.type}`;
    if (p.type === 'video') {
      el.innerHTML = `<video muted loop playsinline preload="none" poster="${p.poster || ''}" src="${p.src}"></video>`;
    } else if (p.type === 'image') {
      el.innerHTML = `<img loading="lazy" src="${p.src}" alt="${p.title}">`;
    } else {
      const title = p.title.split(' ').map((w, i) => `<span class="w" style="transition-delay:${i * 45}ms">${w}</span>`).join(' ');
      el.innerHTML = `<div class="txt"><h2 class="txt__title">${title}</h2><p class="txt__body">${p.body}</p></div>`;
    }
    if (p.draft) el.insertAdjacentHTML('beforeend', '<span class="draft-tag">DRAFT</span>');
    return el;
  }

  function buildClip(p, i) {
    const el = document.createElement('div');
    el.className = `clip clip--${p.type}`;
    el.dataset.i = i;
    let inner = `<div class="clip__name">${p.title}</div>`;
    if (p.type === 'video') inner += `<div class="clip__strip" style="background-image:url('${p.poster}')"></div>${wave(p.id)}`;
    if (p.type === 'image') inner += `<div class="clip__strip" style="background-image:url('${p.src}');background-size:cover;background-position:center"></div>`;
    if (p.type === 'text') inner += `<div class="clip__words">${p.body.replace(/^PLACEHOLDER\.\s*/, '')}</div>`;
    inner += `<span class="clip__dur">${fmtDur(p.dur)}</span>`;
    el.innerHTML = inner;
    el.addEventListener('click', () => { if (!dragged) goTo(i); });
    lane.querySelector(`.track[data-t="${p.type}"]`).appendChild(el);
    return el;
  }

  function layout() {
    unit = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--unit')) || 240;
    step = Math.max(380, innerHeight * 0.7);
    scroller.style.height = `${(posts.length - 1) * step + innerHeight}px`;
    lane.style.width = `${posts.length * unit}px`;
    clips.forEach((c, i) => { c.style.left = `${i * unit + 4}px`; c.style.width = `${unit - 8}px`; });
    ruler.querySelectorAll('.ruler__mark').forEach((m, i) => { m.style.left = `${i * unit}px`; });
    target = scrollY / step;
    current = target;
  }

  function setActive(i) {
    if (i === active) return;
    const prev = slides[active];
    if (prev) {
      prev.classList.remove('is-active');
      const v = prev.querySelector('video');
      if (v) v.pause();
      clips[active].classList.remove('is-active');
    }
    active = i;
    const p = posts[i], s = slides[i];
    s.classList.add('is-active');
    clips[i].classList.add('is-active');
    const v = s.querySelector('video');
    monitor.classList.toggle('has-video', !!v);
    if (v) {
      v.muted = !soundOn;
      v.preload = 'auto';
      v.play().catch(() => {});
    }
    // warm the next video so scrubbing forward doesn't wait
    const nv = slides[i + 1] && slides[i + 1].querySelector('video');
    if (nv) nv.preload = 'auto';

    capTrack.textContent = TRACK[p.type];
    capTrack.style.background = `var(--${p.type === 'text' ? 'text-clip' : p.type})`;
    capTitle.textContent = p.title;
    capDate.textContent = fmtDate(p.date);
    countEl.textContent = `${pad(i + 1)} / ${pad(posts.length)}`;
  }

  function tick() {
    const d = target - current;
    current = reduced || Math.abs(d) < 0.0005 ? target : current + d * 0.12;
    const moving = Math.abs(d) > 0.004;

    const x = view.clientWidth / 2 - (current * unit + unit / 2);
    lane.style.transform = `translate3d(${x}px,0,0)`;

    const i = Math.max(0, Math.min(posts.length - 1, Math.round(current)));
    setActive(i);

    const base = Math.max(0, Math.min(posts.length - 1, Math.floor(current)));
    const frac = Math.min(1, Math.max(0, current - base));
    tcEl.textContent = timecode(starts[base] + frac * posts[base].dur);
    stateEl.textContent = moving ? (d > 0 ? '▶▶' : '◀◀') : '▶';

    requestAnimationFrame(tick);
  }

  function goTo(i) {
    i = Math.max(0, Math.min(posts.length - 1, i));
    scrollTo({ top: i * step, behavior: reduced ? 'auto' : 'smooth' });
  }

  function onScroll() {
    target = scrollY / step;
    if (!moved && scrollY > 4) { moved = true; hint.classList.add('is-gone'); }
    // settle gently onto the nearest clip once the visitor stops
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      const near = Math.round(scrollY / step);
      if (Math.abs(scrollY - near * step) > 2) goTo(near);
    }, 220);
  }

  // drag the timeline like a jog wheel
  let dragging = false, dragged = false, dragX = 0, dragScroll = 0;
  view.addEventListener('pointerdown', (e) => {
    dragging = true; dragged = false; dragX = e.clientX; dragScroll = scrollY;
    view.style.cursor = 'grabbing';
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = dragX - e.clientX;
    if (Math.abs(dx) > 4) dragged = true;
    if (dragged) scrollTo(0, dragScroll + (dx / unit) * step);
  });
  addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false; view.style.cursor = '';
    setTimeout(() => { dragged = false; }, 0);
  });

  function setSound(on) {
    soundOn = on;
    soundBtn.setAttribute('aria-pressed', on);
    soundBtn.textContent = on ? 'SOUND ON' : 'SOUND OFF';
    const v = slides[active] && slides[active].querySelector('video');
    if (v) v.muted = !on;
  }
  soundBtn.addEventListener('click', () => setSound(!soundOn));

  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'l' || k === 'arrowright') { e.preventDefault(); goTo(active + 1); }
    else if (k === 'j' || k === 'arrowleft') { e.preventDefault(); goTo(active - 1); }
    else if (k === 'k') {
      const v = slides[active] && slides[active].querySelector('video');
      if (v) v.paused ? v.play() : v.pause();
    } else if (k === 'm') setSound(!soundOn);
  });

  fetch('/feed/posts.json')
    .then((r) => r.json())
    .then((data) => {
      // drafts only show on the local preview, never on the live site
      const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
      posts = data.filter((p) => local || !p.draft).sort((a, b) => b.date.localeCompare(a.date));
      let t = 0;
      posts.forEach((p) => {
        p.dur = p.type === 'video' ? p.duration || 10 : p.type === 'image' ? 5 : Math.max(6, Math.round(words(p.body) / 3.5));
        starts.push(t);
        t += p.dur;
      });
      slides = posts.map((p) => frame.appendChild(buildSlide(p)));
      clips = posts.map(buildClip);
      ruler.innerHTML = posts.map((p) => `<span class="ruler__mark">${fmtShort(p.date)}</span>`).join('');
      layout();
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', layout);
      requestAnimationFrame(tick);
    });
})();
