document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("api-key");
  const autoSendInput = document.getElementById("auto-send");
  const form = document.getElementById("options-form");
  const status = document.getElementById("status");

  browser.storage.sync.get({ apiKey: "", autoSend: false }).then(({ apiKey, autoSend }) => {
    apiKeyInput.value = apiKey;
    autoSendInput.checked = autoSend;
  });

  form.addEventListener("submit", (evt) => {
    evt.preventDefault();
    const apiKey = apiKeyInput.value.trim();
    const autoSend = autoSendInput.checked;
    browser.storage.sync.set({ apiKey, autoSend }).then(() => {
      status.textContent = "Saved";
      setTimeout(() => { status.textContent = ""; }, 1500);
    }).catch(() => {
      status.textContent = "Failed to save";
    });
  });
});
