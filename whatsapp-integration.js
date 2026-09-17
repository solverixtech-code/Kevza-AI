const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";
const AUTH_STORAGE_KEY = "kevza.auth";

const state = { connection: null };
const form = document.querySelector("[data-connection-form]");
const toast = document.querySelector("[data-toast]");
const connectionCard = document.querySelector("[data-connection-card]");
const templatesBody = document.querySelector("[data-meta-templates]");

function getAuthSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY) || window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getAuthHeaders() {
  const session = getAuthSession();
  const token = session?.accessToken;
  if (!token) {
    window.location.replace("login.html");
    return null;
  }
  return { Authorization: `${session.tokenType || "Bearer"} ${token}`, "Content-Type": "application/json" };
}

async function apiRequest(path, options = {}) {
  const headers = getAuthHeaders();
  if (!headers) throw new Error("Please sign in again.");
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "WhatsApp request failed.");
  return payload;
}

function showToast(message, type = "success") {
  if (!toast) return;
  toast.className = `wa-toast is-visible ${type}`;
  toast.querySelector("span").textContent = type === "error" ? "!" : "OK";
  toast.querySelector("strong").textContent = message;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 4200);
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value || "-";
}

function statusLabel(status) {
  return { CONNECTED: "Connected", CONFIGURED: "Configured", NOT_CONNECTED: "Not connected" }[status] || status || "Not connected";
}

function renderConnection(connection) {
  state.connection = connection;
  const status = connection?.status || "NOT_CONNECTED";
  const isConnected = status === "CONNECTED";
  const isConfigured = status === "CONFIGURED";
  connectionCard?.classList.toggle("is-connected", isConnected);
  connectionCard?.classList.toggle("is-error", !isConnected && !isConfigured);
  setText("[data-status-title]", isConnected ? "Meta WhatsApp connected" : isConfigured ? "Credentials saved" : "WhatsApp is not connected");
  setText("[data-status-copy]", isConnected ? `${connection.displayPhone || "Business sender"} is ready for templates and campaign setup.` : isConfigured ? "Run Test Connection to verify this WABA and phone number with Meta." : "Save the customer's Meta Cloud API credentials to begin.");
  setText("[data-status-pill]", statusLabel(status));
  setText("[data-waba-id]", connection?.wabaId || "-");
  setText("[data-phone-id]", connection?.phoneNumberId || "-");
  setText("[data-quality]", connection?.qualityStatus || "-");
  if (form && connection) {
    form.elements.wabaId.value = connection.wabaId || "";
    form.elements.phoneNumberId.value = connection.phoneNumberId || "";
    form.elements.displayPhone.value = connection.displayPhone || "";
    if (connection.tokenPreview) form.elements.accessToken.placeholder = `Saved token ${connection.tokenPreview}`;
  }
}

async function loadConnection() {
  try {
    renderConnection(await apiRequest("/whatsapp/connection"));
  } catch (error) {
    showToast(error.message, "error");
    renderConnection({ status: "NOT_CONNECTED" });
  }
}

async function saveConnection(event) {
  event.preventDefault();
  const payload = {
    wabaId: form.elements.wabaId.value.trim(),
    phoneNumberId: form.elements.phoneNumberId.value.trim(),
    displayPhone: form.elements.displayPhone.value.trim(),
    accessToken: form.elements.accessToken.value.trim(),
  };
  if (!payload.accessToken && !state.connection?.tokenPreview) {
    showToast("Paste the Meta access token before saving.", "error");
    return;
  }
  if (!payload.accessToken) delete payload.accessToken;
  if (!payload.displayPhone) delete payload.displayPhone;
  try {
    renderConnection(await apiRequest("/whatsapp/connection", { method: "PUT", body: JSON.stringify(payload) }));
    form.elements.accessToken.value = "";
    showToast("WhatsApp connection saved. Run Test Connection next.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function testConnection() {
  try {
    renderConnection(await apiRequest("/whatsapp/connection/test", { method: "POST" }));
    showToast("Meta connection verified successfully.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function renderMetaTemplates(templates) {
  if (!templatesBody) return;
  if (!templates.length) {
    templatesBody.innerHTML = '<tr><td colspan="5">No templates found in this WABA yet.</td></tr>';
    return;
  }
  templatesBody.innerHTML = templates.map((template) => {
    const status = String(template.status || "").toLowerCase();
    return `<tr><td>${escapeHtml(template.name)}</td><td>${escapeHtml(template.category)}</td><td><span class="meta-status ${escapeHtml(status)}">${escapeHtml(template.status)}</span></td><td>${escapeHtml(template.language)}</td><td>${escapeHtml(template.id)}</td></tr>`;
  }).join("");
}

async function fetchTemplates() {
  if (templatesBody) templatesBody.innerHTML = '<tr><td colspan="5">Fetching templates from Meta...</td></tr>';
  try {
    const payload = await apiRequest("/whatsapp/templates/meta");
    renderMetaTemplates(Array.isArray(payload) ? payload : payload.templates || payload.data || []);
    showToast("Meta templates loaded.");
  } catch (error) {
    if (templatesBody) templatesBody.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
    showToast(error.message, "error");
  }
}

form?.addEventListener("submit", saveConnection);
document.querySelector("[data-test-connection]")?.addEventListener("click", testConnection);
document.querySelector("[data-fetch-templates]")?.addEventListener("click", fetchTemplates);
document.querySelector("[data-refresh-templates]")?.addEventListener("click", fetchTemplates);
loadConnection();
