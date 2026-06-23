// popup.js – Time Tracker

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const hrs  = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
  return `${mins}m`;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  }).toUpperCase();
}

function faviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function renderStats(stats) {
  const siteList   = document.getElementById('siteList');
  const emptyState = document.getElementById('emptyState');
  const totalEl    = document.getElementById('totalTime');

  const entries = Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Remove previous rows, keep emptyState
  siteList.querySelectorAll('.site-row').forEach(el => el.remove());

  if (entries.length === 0) {
    emptyState.style.display = 'block';
    totalEl.textContent = 'Total: 0m';
    return;
  }

  emptyState.style.display = 'none';

  const maxSeconds   = entries[0][1];
  const totalSeconds = Object.values(stats).reduce((s, n) => s + n, 0);
  totalEl.textContent = `Total: ${formatTime(totalSeconds)}`;

  entries.forEach(([domain, seconds]) => {
    const widthPct = maxSeconds > 0 ? Math.round((seconds / maxSeconds) * 100) : 0;

    const row = document.createElement('div');
    row.className = 'site-row';

    // Favicon
    const img = document.createElement('img');
    img.className = 'site-row__favicon';
    img.src = faviconUrl(domain);
    img.width = 16;
    img.height = 16;
    img.alt = '';
    img.onerror = function () {
      const fallback = document.createElement('div');
      fallback.className = 'site-row__favicon-fallback';
      fallback.textContent = domain.charAt(0).toUpperCase();
      this.parentNode.replaceChild(fallback, this);
    };

    // Info (domain name + bar)
    const info = document.createElement('div');
    info.className = 'site-row__info';

    const domainEl = document.createElement('div');
    domainEl.className = 'site-row__domain';
    domainEl.textContent = domain;
    domainEl.title = domain;

    const track = document.createElement('div');
    track.className = 'site-row__bar-track';
    const fill = document.createElement('div');
    fill.className = 'site-row__bar-fill';
    fill.style.width = `${widthPct}%`;
    track.appendChild(fill);

    info.appendChild(domainEl);
    info.appendChild(track);

    // Time label
    const timeEl = document.createElement('div');
    timeEl.className = 'site-row__time';
    timeEl.textContent = formatTime(seconds);

    row.appendChild(img);
    row.appendChild(info);
    row.appendChild(timeEl);
    siteList.appendChild(row);
  });
}

// Set date in header
document.getElementById('todayDate').textContent = formatDate(new Date());

// Fetch stats from background (which flushes live time first)
chrome.runtime.sendMessage({ action: 'flushAndGetStats' }, (response) => {
  if (chrome.runtime.lastError || !response) {
    // Fallback: read storage directly
    const d = new Date();
    const key = `stats_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    chrome.storage.local.get(key, (stored) => renderStats(stored[key] || {}));
    return;
  }
  renderStats(response.stats || {});
});

// Reset
document.getElementById('resetBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'resetToday' }, () => renderStats({}));
});
