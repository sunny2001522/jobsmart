const endpoint = document.querySelector("#endpoint");
const enabled = document.querySelector("#enabled");
const status = document.querySelector("#status");
chrome.storage.local.get({ endpoint: "http://localhost:3004", enabled: true }, (settings) => { endpoint.value = settings.endpoint; enabled.checked = settings.enabled; });
document.querySelector("#save").addEventListener("click", () => {
  chrome.storage.local.set({ endpoint: endpoint.value.replace(/\/$/, ""), enabled: enabled.checked }, () => { status.textContent = "已儲存。重新整理 LinkedIn 頁面後生效。"; });
});
