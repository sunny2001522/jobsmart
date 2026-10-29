const endpointInput = document.querySelector("#endpoint");
const enabledInput = document.querySelector("#enabled");
const codeInput = document.querySelector("#pairCode");
const statusNode = document.querySelector("#status");

async function storedSettings() {
  return chrome.storage.local.get({ endpoint: "http://localhost:3004", enabled: true, token: "" });
}

function setStatus(message, paired = false) {
  statusNode.textContent = message;
  statusNode.className = paired ? "status paired" : "status";
}

function validateEndpoint(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("JobSmart 網址必須使用 HTTPS（本機可用 localhost）");
  }
  return url.origin;
}

async function grantEndpointPermission(origin) {
  const pattern = `${origin}/*`;
  const present = await chrome.permissions.contains({ origins: [pattern] });
  if (present) return true;
  return chrome.permissions.request({ origins: [pattern] });
}

async function load() {
  const settings = await storedSettings();
  endpointInput.value = settings.endpoint;
  enabledInput.checked = settings.enabled;
  setStatus(settings.token ? "已配對 JobSmart" : "尚未配對", Boolean(settings.token));
}

document.querySelector("#pair").addEventListener("click", async () => {
  try {
    const origin = validateEndpoint(endpointInput.value.trim());
    if (!await grantEndpointPermission(origin)) throw new Error("請授權外掛連線到 JobSmart 網址");
    const code = codeInput.value.trim();
    if (!code) throw new Error("請先貼上 JobSmart 配對碼");
    setStatus("配對中…");
    const response = await fetch(`${origin}/api/linkedin/extension/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "配對失敗");
    await chrome.storage.local.set({ endpoint: origin, token: body.data.token, enabled: enabledInput.checked });
    codeInput.value = "";
    setStatus("配對完成。重新整理 LinkedIn 頁面後可使用。", true);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "配對失敗");
  }
});

document.querySelector("#save").addEventListener("click", async () => {
  try {
    const origin = validateEndpoint(endpointInput.value.trim());
    if (!await grantEndpointPermission(origin)) throw new Error("請授權外掛連線到 JobSmart 網址");
    const settings = await storedSettings();
    await chrome.storage.local.set({ endpoint: origin, enabled: enabledInput.checked, token: settings.token });
    setStatus(settings.token ? "設定已儲存；請重新整理 LinkedIn 頁面。" : "設定已儲存，請輸入配對碼完成配對。");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "設定儲存失敗");
  }
});

document.querySelector("#disconnect").addEventListener("click", async () => {
  const settings = await storedSettings();
  await chrome.storage.local.set({ ...settings, token: "" });
  setStatus("已清除此裝置配對。若要撤銷伺服器權限，請在 JobSmart 設定頁按「撤銷配對」。");
});

void load();
