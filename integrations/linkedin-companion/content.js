(async () => {
  const settings = await chrome.storage.local.get({ endpoint: "http://localhost:3004", enabled: true });
  if (!settings.enabled) return;
  const isProfile = /\/in\//.test(location.pathname);
  const isJob = /\/jobs\/(view|collections|search)/.test(location.pathname);
  if (!isProfile && !isJob) return;

  const text = document.body?.innerText?.replace(/\s+/g, " ").trim().slice(0, 50000) ?? "";
  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => { try { return JSON.parse(node.textContent ?? "{}"); } catch { return null; } }).filter(Boolean);
  const payload = { sourceUrl: location.href, pageType: isProfile ? "profile" : "job", title: document.title, text, jsonLd, capturedAt: new Date().toISOString() };
  try {
    await fetch(`${settings.endpoint}/api/linkedin/ingest`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch (error) { console.debug("JobSmart Companion is offline", error); }
})();
