(() => {
  const ROOT_ID = "jobsmart-linkedin-companion";
  let activePageKey = "";
  let pollTimer = null;
  let debounceTimer = null;

  async function localSettings() {
    return chrome.storage.local.get({ endpoint: "http://localhost:3004", enabled: true, token: "" });
  }

  async function request(endpoint, token, path, init = {}) {
    return fetch(`${endpoint}${path}`, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
    });
  }

  function pageType() {
    if (/\/in\//.test(location.pathname)) return "profile";
    if (/\/jobs\/(view|collections|search)/.test(location.pathname)) return "job";
    return null;
  }

  function canonicalUrl(value) {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  }

  async function syncPage(settings, kind) {
    const response = await request(settings.endpoint, settings.token, "/api/linkedin/extension/settings");
    if (!response.ok) return null;
    const config = (await response.json()).data;
    if (!config.enabled || (kind === "profile" && !config.syncProfile) || (kind === "job" && !config.syncJobs)) return config;
    const text = document.body?.innerText?.replace(/\s+/g, " ").trim().slice(0, 50000) ?? "";
    if (!text) return config;
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((node) => { try { return JSON.parse(node.textContent ?? "{}"); } catch { return null; } })
      .filter(Boolean);
    await request(settings.endpoint, settings.token, "/api/linkedin/ingest", {
      method: "POST",
      body: JSON.stringify({ sourceUrl: location.href, pageType: kind, title: document.title, text, jsonLd, capturedAt: new Date().toISOString() }),
    });
    return config;
  }

  function fieldDescription(field) {
    const labelText = field.labels ? [...field.labels].map((label) => label.innerText).join(" ") : "";
    const wrappingLabel = field.closest("label")?.innerText || "";
    return [labelText, wrappingLabel, field.getAttribute("aria-label"), field.getAttribute("placeholder"), field.getAttribute("name"), field.id, field.getAttribute("autocomplete")]
      .filter(Boolean).join(" ").toLowerCase();
  }

  function setValue(element, value) {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function chooseTextValue(description, applicant, letter) {
    if (/email|e-mail|電子郵件/.test(description)) return applicant.email;
    if (/phone|mobile|telephone|電話|手機/.test(description)) return applicant.phone;
    if (/first.?name|given.?name|名（英文）|名字/.test(description)) return applicant.name.split(/\s+/)[0] || applicant.name;
    if (/last.?name|family.?name|surname|姓氏/.test(description)) return applicant.name.split(/\s+/).slice(1).join(" ");
    if (/full.?name|your.?name|legal.?name|姓名|名字和姓氏/.test(description)) return applicant.name;
    if (/linkedin.*url|profile.*url|linkedin.*網址/.test(description)) return applicant.linkedinUrl;
    if (/cover.?letter|why.*(interested|role|company)|additional information|message to|求職信|自我推薦|補充說明/.test(description)) return letter.body;
    return "";
  }

  async function attachResume(settings, taskId, input) {
    const response = await request(settings.endpoint, settings.token, `/api/linkedin/extension/tasks/${encodeURIComponent(taskId)}/resume`);
    if (!response.ok) throw new Error("履歷 PDF 下載失敗");
    const file = new File([await response.blob()], "JobSmart-resume.pdf", { type: "application/pdf" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function fillCurrentForm(settings, taskId) {
    const detailsResponse = await request(settings.endpoint, settings.token, `/api/linkedin/extension/tasks/${encodeURIComponent(taskId)}`);
    const details = await detailsResponse.json();
    if (!detailsResponse.ok) throw new Error(details.error || "取得審核資料失敗");
    const payload = details.data;
    const root = document.querySelector('[role="dialog"]') || document.querySelector(".jobs-easy-apply-content") || document.querySelector("form");
    if (!root) throw new Error("請先在 LinkedIn 開啟 Easy Apply 表單，再按填入。");
    const fields = [...root.querySelectorAll("input, textarea")];
    let filled = 0;
    let fileAttached = false;
    for (const field of fields) {
      if (field.disabled || field.readOnly || field.type === "hidden" || field.type === "password" || field.type === "submit" || field.type === "button" || field.type === "search") continue;
      const description = fieldDescription(field);
      if (field.type === "file" && /resume|cv|履歷/.test(description)) {
        try { await attachResume(settings, taskId, field); fileAttached = true; filled += 1; } catch (error) { console.debug("Could not attach resume", error); }
        continue;
      }
      if (field.type === "file") continue;
      const value = chooseTextValue(description, payload.applicant, payload.coverLetter);
      if (!value) continue;
      setValue(field, value);
      filled += 1;
    }
    if (!filled) throw new Error("目前表單沒有找到可安全填入的欄位。請確認 Easy Apply 視窗已開啟，並手動填寫。");
    await request(settings.endpoint, settings.token, `/api/linkedin/extension/tasks/${encodeURIComponent(taskId)}`, { method: "POST", body: JSON.stringify({ action: "filled" }) });
    return { filled, fileAttached };
  }

  function mountPanel() {
    if (document.getElementById(ROOT_ID)) return document.getElementById(ROOT_ID).shadowRoot;
    const host = document.createElement("div");
    host.id = ROOT_ID;
    host.style.position = "fixed";
    host.style.zIndex = "2147483647";
    host.style.right = "20px";
    host.style.bottom = "20px";
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>
      .card{font:14px system-ui,-apple-system,sans-serif;width:300px;color:#172033;background:white;border:1px solid #cbd5e1;border-radius:14px;box-shadow:0 8px 30px #0f172a33;overflow:hidden}
      .head{padding:12px 14px;background:#0f172a;color:white;font-weight:650;display:flex;justify-content:space-between;align-items:center}
      .body{padding:12px 14px}.hint{font-size:12px;color:#64748b;line-height:1.45;margin:0 0 10px}
      .job{border-top:1px solid #e2e8f0;padding-top:10px;margin-top:10px}.title{font-size:12px;font-weight:600;margin:0 0 3px}
      .button{width:100%;border:0;border-radius:8px;padding:9px 10px;background:#2563eb;color:white;font-weight:600;cursor:pointer;margin-top:8px}
      .close{border:0;background:transparent;color:white;font-size:18px;cursor:pointer;line-height:1}.status{font-size:12px;color:#475569;white-space:pre-wrap;margin-top:8px}
      .disclaimer{font-size:11px;line-height:1.4;color:#64748b;margin:10px 0 0}
    </style><div class="card"><div class="head"><span>JobSmart 填表助手</span><button class="close" aria-label="關閉">×</button></div><div class="body"><p class="hint">請先開啟 Easy Apply 表單，再選擇已在 JobSmart 確認的職缺材料。</p><div class="tasks"></div><p class="status" aria-live="polite"></p><p class="disclaimer">只填欄位與履歷附件，不會按下一步或送出。請自行逐項檢查。</p></div></div>`;
    shadow.querySelector(".close").addEventListener("click", () => host.remove());
    document.documentElement.appendChild(host);
    return shadow;
  }

  function removePanel() {
    document.getElementById(ROOT_ID)?.remove();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  async function refreshTasks(settings, shadow) {
    const container = shadow.querySelector(".tasks");
    try {
      const response = await request(settings.endpoint, settings.token, `/api/linkedin/extension/tasks?url=${encodeURIComponent(location.href)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "無法讀取填表任務");
      container.replaceChildren();
      if (!body.data.length) {
        container.textContent = "目前沒有已核准且符合此職缺的填表任務。";
        return;
      }
      for (const task of body.data) {
        const section = document.createElement("div");
        section.className = "job";
        const title = document.createElement("p");
        title.className = "title";
        title.textContent = `${task.position} · ${task.companyName}`;
        const button = document.createElement("button");
        button.className = "button";
        button.textContent = "填入目前表單";
        button.addEventListener("click", async () => {
          const status = shadow.querySelector(".status");
          button.disabled = true;
          button.textContent = "填入中…";
          status.textContent = "";
          try {
            const result = await fillCurrentForm(settings, task.id);
            status.textContent = `已填入 ${result.filled} 個欄位${result.fileAttached ? "，並附上客製履歷 PDF" : "。請手動附上履歷 PDF"}。`;
            button.textContent = "再次填入此步驟";
          } catch (error) {
            status.textContent = error instanceof Error ? error.message : "填表失敗";
            button.textContent = "重試填入";
          } finally { button.disabled = false; }
        });
        section.append(title, button);
        container.appendChild(section);
      }
    } catch (error) {
      container.textContent = error instanceof Error ? error.message : "無法連線到 JobSmart";
    }
  }

  async function start() {
    const kind = pageType();
    if (!kind) {
      if (activePageKey) {
        activePageKey = "";
        removePanel();
      }
      return;
    }
    const pageKey = `${kind}:${canonicalUrl(location.href)}`;
    // LinkedIn mutates its DOM continuously. Start page sync and the polling
    // loop once per URL, instead of restarting both for every mutation.
    if (pageKey === activePageKey) return;
    activePageKey = pageKey;
    removePanel();
    const settings = await localSettings();
    if (!settings.enabled || !settings.token) return;
    const config = await syncPage(settings, kind).catch((error) => {
      console.debug("JobSmart page sync failed", error);
      return null;
    });
    if (!config?.enabled) return;
    if (kind !== "job" || !/\/jobs\/view\//.test(location.pathname)) return;
    const shadow = mountPanel();
    await refreshTasks(settings, shadow);
    pollTimer = setInterval(() => {
      if (!document.getElementById(ROOT_ID)) { clearInterval(pollTimer); pollTimer = null; return; }
      void refreshTasks(settings, shadow);
    }, 3000);
  }

  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void start(), 900);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  void start();
})();
