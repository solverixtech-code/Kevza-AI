const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";
const AUTH_STORAGE_KEY = "kevza.auth";

const card = document.querySelector("[data-whatsapp-status-card]");
const pill = document.querySelector("[data-whatsapp-status-pill]");
const title = document.querySelector("[data-whatsapp-status-title]");
const copy = document.querySelector("[data-whatsapp-status-copy]");
const action = document.querySelector("[data-whatsapp-status-action]");

function getAuthSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY) || window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function loadWhatsAppStatus() {
  if (!card) return;

  const session = getAuthSession();
  const token = session?.accessToken;
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/whatsapp/connection`, {
      headers: { Authorization: `${session.tokenType || "Bearer"} ${token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Unable to check WhatsApp connection.");

    const isConnected = data.status === "CONNECTED";
    card.classList.toggle("is-connected", isConnected);
    card.classList.toggle("is-error", !isConnected);
    if (pill) pill.textContent = isConnected ? "Connected" : "Setup needed";
    if (title) title.textContent = isConnected ? data.displayPhone || "Meta WhatsApp connected" : "Connect your WhatsApp number";
    if (copy) copy.textContent = isConnected ? `WABA ${data.wabaId || "configured"} is ready for templates and campaigns.` : "Add WABA ID, phone number ID, and token before sending campaigns.";
    if (action) action.textContent = isConnected ? "Manage connection ->" : "Start setup ->";
  } catch (error) {
    card.classList.add("is-error");
    if (pill) pill.textContent = "Needs attention";
    if (title) title.textContent = "WhatsApp status unavailable";
    if (copy) copy.textContent = error.message;
  }
}

loadWhatsAppStatus();
