// background.js – Time Tracker Service Worker

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `stats_${yyyy}-${mm}-${dd}`;
}

function getDomain(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

async function getSession() {
  const result = await chrome.storage.session.get(['activeDomain', 'startTime']);
  return {
    activeDomain: result.activeDomain || null,
    startTime: result.startTime || null,
  };
}

async function setSession(domain, startTime) {
  await chrome.storage.session.set({ activeDomain: domain, startTime });
}

async function clearSession() {
  await chrome.storage.session.remove(['activeDomain', 'startTime']);
}

async function flushTime() {
  const { activeDomain, startTime } = await getSession();
  if (!activeDomain || !startTime) return;

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  if (elapsed <= 0) return;

  const key = todayKey();
  const stored = await chrome.storage.local.get(key);
  const stats = stored[key] || {};
  stats[activeDomain] = (stats[activeDomain] || 0) + elapsed;
  await chrome.storage.local.set({ [key]: stats });
}

async function startTracking(url) {
  await flushTime();
  const domain = getDomain(url);
  if (domain) {
    await setSession(domain, Date.now());
  } else {
    await clearSession();
  }
}

async function stopTracking() {
  await flushTime();
  await clearSession();
}

async function getActiveTabUrl() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]?.url || null);
    });
  });
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  await startTracking(tab.url);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    await startTracking(tab.url);
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await stopTracking();
  } else {
    const url = await getActiveTabUrl();
    await startTracking(url);
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const url = await getActiveTabUrl();
  await startTracking(url);
});

chrome.runtime.onInstalled.addListener(async () => {
  const url = await getActiveTabUrl();
  await startTracking(url);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'flushAndGetStats') {
    (async () => {
      await flushTime();
      const { activeDomain } = await getSession();
      if (activeDomain) {
        await setSession(activeDomain, Date.now());
      }
      const key = todayKey();
      const stored = await chrome.storage.local.get(key);
      sendResponse({ stats: stored[key] || {}, key });
    })();
    return true;
  }

  if (message.action === 'resetToday') {
    (async () => {
      const key = todayKey();
      await chrome.storage.local.remove(key);
      await clearSession();
      const url = await getActiveTabUrl();
      await startTracking(url);
      sendResponse({ ok: true });
    })();
    return true;
  }
});
