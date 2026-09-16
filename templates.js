const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";
const AUTH_STORAGE_KEY = "kevza.auth";

const state = {
  templates: [],
  selectedTemplateId: null,
};

const tableBody = document.querySelector("[data-templates-body]");
const createModal = document.getElementById("createTemplateModal");
const createForm = createModal?.querySelector(".ct-form");
const searchInput = document.querySelector(".template-toolbar input[type='search']");
const categoryFilter = document.querySelector(".template-toolbar select[aria-label='Filter by category']");
const statusFilter = document.querySelector(".template-toolbar select[aria-label='Filter by status']");
const metricCards = Array.from(document.querySelectorAll(".template-metrics .metric-card"));

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
  const tokenType = session?.tokenType || "Bearer";

  if (!token) {
    window.location.replace("login.html");
    return null;
  }

  return {
    Authorization: `${tokenType} ${token}`,
    "Content-Type": "application/json",
  };
}

async function apiRequest(path, options = {}) {
  const headers = getAuthHeaders();
  if (!headers) throw new Error("Please sign in again.");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Template request failed.");
  }

  return payload;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeStatus(status) {
  return String(status || "DRAFT").toLowerCase();
}

function toTitle(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function summarize(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > 78 ? `${clean.slice(0, 78)}...` : clean;
}

function formatLanguage(language) {
  const map = {
    en_US: "English (US)",
    en: "English",
    hi: "Hindi",
  };
  return map[language] || language || "English";
}

function formatRelativeTime(value) {
  if (!value) return "-";

  const updated = new Date(value);
  if (Number.isNaN(updated.getTime())) return "-";

  const diffMs = Date.now() - updated.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return updated.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function getTemplateTitle(template) {
  return template.displayName || toTitle(template.name) || "Untitled Template";
}

function updateMetrics(templates) {
  const total = templates.length;
  const approved = templates.filter((template) => template.status === "APPROVED").length;
  const pending = templates.filter((template) => template.status === "PENDING").length;
  const draft = templates.filter((template) => template.status === "DRAFT").length;
  const rejected = templates.filter((template) => template.status === "REJECTED").length;

  const values = [total, approved, pending, "0"];
  const subtitles = ["WhatsApp only", "Ready to use", "Awaiting Meta approval", "Sending comes later"];

  metricCards.forEach((card, index) => {
    const value = card.querySelector("strong");
    const small = card.querySelector("small");
    if (value) value.textContent = String(values[index]);
    if (small) small.textContent = subtitles[index];
  });

  const approvalCard = document.querySelector(".approval-card");
  const approvedPercent = total ? Math.round((approved / total) * 100) : 0;

  if (approvalCard) {
    const ring = approvalCard.querySelector(".approval-ring");
    const ringValue = ring?.querySelector("strong");
    const listItems = approvalCard.querySelectorAll("li");

    if (ring) {
      ring.style.background = `radial-gradient(circle closest-side,#fff 62%,transparent 63%),conic-gradient(#10ad80 0 ${approvedPercent}%,#e8eef8 ${approvedPercent}% 100%)`;
    }
    if (ringValue) ringValue.textContent = `${approvedPercent}%`;

    const rows = [
      `${approved} Approved`,
      `${pending} Pending`,
      `${draft} Drafts`,
      `${rejected} Rejected`,
    ];
    listItems.forEach((item, index) => {
      const dot = item.querySelector(".dot");
      item.textContent = rows[index] || item.textContent;
      if (dot) item.prepend(dot);
    });
  }
}

function renderPreview(template) {
  const selected = template || state.templates[0];
  const preview = document.querySelector(".preview-card");
  if (!preview || !selected) return;

  const title = getTemplateTitle(selected);
  const status = normalizeStatus(selected.status);
  const statusEl = preview.querySelector(".section-head .status");
  const subtitle = preview.querySelector(".section-head p");
  const bubbleTitle = preview.querySelector(".chat-bubble strong");
  const bubbleText = preview.querySelector(".chat-bubble p");
  const bubbleButton = preview.querySelector(".chat-bubble button");
  const meta = preview.querySelector(".chat-meta");
  const variables = Array.isArray(selected.variables) ? selected.variables : extractVariables(selected.bodyText);
  const buttons = Array.isArray(selected.buttons) ? selected.buttons : [];
  const firstButton = buttons[0];

  if (statusEl) {
    statusEl.className = `status ${status}`;
    statusEl.textContent = toTitle(status);
  }
  if (subtitle) subtitle.textContent = `WhatsApp ${toTitle(selected.category || "MARKETING")} template`;
  if (bubbleTitle) bubbleTitle.textContent = title;
  if (bubbleText) bubbleText.textContent = selected.bodyText || "";

  if (bubbleButton) {
    bubbleButton.textContent = firstButton?.text || "Open";
    bubbleButton.style.display = firstButton ? "" : "none";
  }

  if (meta) {
    meta.textContent = variables.length
      ? `Template variables: ${variables.map((variable) => `{{${variable}}}`).join(", ")}`
      : "Template variables: none";
  }
}

function renderTable(templates) {
  if (!tableBody) return;

  if (!templates.length) {
    tableBody.innerHTML =
      '<tr><td colspan="8"><strong>No WhatsApp templates yet</strong><span>Create your first template draft to start building the library.</span></td></tr>';
    return;
  }

  tableBody.innerHTML = templates
    .map((template) => {
      const status = normalizeStatus(template.status);
      return `
        <tr data-template-id="${escapeHtml(template.id)}">
          <td><strong>${escapeHtml(getTemplateTitle(template))}</strong><span>${escapeHtml(summarize(template.bodyText))}</span></td>
          <td><em class="channel whatsapp">WhatsApp</em></td>
          <td>${escapeHtml(toTitle(template.category || "MARKETING"))}</td>
          <td><b class="status ${escapeHtml(status)}">${escapeHtml(toTitle(status))}</b></td>
          <td>${escapeHtml(formatLanguage(template.language))}</td>
          <td>0</td>
          <td>${escapeHtml(formatRelativeTime(template.updatedAt))}</td>
          <td><button class="row-menu" type="button" aria-label="Sync ${escapeHtml(getTemplateTitle(template))} status from Meta" title="Sync Meta status">...</button></td>
        </tr>
      `;
    })
    .join("");
}

async function loadTemplates() {
  if (!tableBody) return;

  const params = new URLSearchParams();
  const search = searchInput?.value.trim();
  const category = categoryFilter?.value;
  const status = statusFilter?.value;

  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (status) params.set("status", status);

  tableBody.innerHTML = '<tr><td colspan="8"><strong>Loading templates...</strong><span>Fetching WhatsApp template drafts.</span></td></tr>';

  try {
    const query = params.toString() ? `?${params.toString()}` : "";
    state.templates = await apiRequest(`/templates${query}`);
    state.selectedTemplateId = state.templates[0]?.id || null;
    renderTable(state.templates);
    updateMetrics(state.templates);
    renderPreview(state.templates[0]);
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="8"><strong>Unable to load templates</strong><span>${escapeHtml(error.message)}</span></td></tr>`;
  }
}

function extractVariables(bodyText) {
  const matches = String(bodyText || "").match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || [];
  return Array.from(
    new Set(matches.map((match) => match.replace(/[{}]/g, "").trim()).filter(Boolean)),
  );
}

function buildComponents(bodyText, buttons) {
  const components = [
    {
      type: "BODY",
      text: bodyText,
    },
  ];

  if (buttons.length) {
    components.push({
      type: "BUTTONS",
      buttons: buttons.map((button) => ({
        type: "URL",
        text: button.text,
        url: button.url,
      })),
    });
  }

  return components;
}

function getCreatePayload(status) {
  if (!createForm) return null;

  const formData = new FormData(createForm);
  const displayName = String(formData.get("template_name") || "").trim();
  const category = String(formData.get("template_category") || "MARKETING");
  const language = String(formData.get("template_language") || "en_US");
  const bodyText = String(formData.get("template_body") || "").trim();
  const hasButton = formData.get("template_has_button") === "on";
  const buttonText = String(formData.get("template_button_text") || "").trim();
  const buttonUrl = String(formData.get("template_button_url") || "").trim();
  const variables = extractVariables(bodyText);
  const buttons = hasButton && buttonText && buttonUrl ? [{ type: "URL", text: buttonText, url: buttonUrl }] : [];

  return {
    displayName,
    category,
    language,
    bodyText,
    variables,
    examples: variables.reduce((acc, variable) => ({ ...acc, [variable]: exampleForVariable(variable) }), {}),
    buttons,
    components: buildComponents(bodyText, buttons),
    source: "MANUAL",
    status,
  };
}

function exampleForVariable(variable) {
  const examples = {
    name: "Ahmed",
    offer: "20% OFF",
    link: "https://kevzaai.com/offer",
    date: "30 Sep",
    invoice_id: "INV-1001",
  };
  return examples[variable] || "Sample value";
}

async function saveTemplate(status, button) {
  const payload = getCreatePayload(status);
  if (!payload) return;

  if (!payload.displayName || !payload.bodyText) {
    alert("Template name and body are required.");
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = status === "PENDING" ? "Submitting..." : "Saving Draft...";

  try {
    const createdTemplate = await apiRequest("/templates", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        status: status === "PENDING" ? "DRAFT" : status,
      }),
    });

    if (status === "PENDING") {
      await apiRequest(`/templates/${createdTemplate.id}/submit-to-meta`, {
        method: "POST",
      });
    }

    closeCreateModal();
    await loadTemplates();
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function syncTemplateStatus(templateId, button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "...";

  try {
    const updatedTemplate = await apiRequest(`/templates/${templateId}/sync-meta-status`, {
      method: "POST",
    });
    state.templates = state.templates.map((template) =>
      template.id === updatedTemplate.id ? updatedTemplate : template,
    );
    state.selectedTemplateId = updatedTemplate.id;
    renderTable(state.templates);
    updateMetrics(state.templates);
    renderPreview(updatedTemplate);
  } catch (error) {
    alert(error.message);
    button.disabled = false;
    button.textContent = originalText;
  }
}

function closeCreateModal() {
  if (!createModal) return;
  createModal.classList.remove("is-open");
  createModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("ct-modal-open");
}

function setupCreateActions() {
  const saveDraft = document.querySelector(".ct-footer .ct-secondary");
  const submit = document.querySelector(".ct-footer .ct-primary");
  const textarea = createForm?.querySelector("textarea[name='template_body']");
  const count = textarea?.closest(".ct-field")?.querySelector("em");

  saveDraft?.addEventListener("click", () => saveTemplate("DRAFT", saveDraft));
  submit?.addEventListener("click", () => saveTemplate("PENDING", submit));

  textarea?.addEventListener("input", () => {
    if (count) count.textContent = `${textarea.value.length}/1024`;
  });
}

function setupFilters() {
  let searchTimer;
  searchInput?.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(loadTemplates, 250);
  });
  categoryFilter?.addEventListener("change", loadTemplates);
  statusFilter?.addEventListener("change", loadTemplates);

  tableBody?.addEventListener("click", (event) => {
    const syncButton = event.target.closest(".row-menu");
    const row = event.target.closest("tr[data-template-id]");
    if (!row) return;

    const template = state.templates.find((item) => item.id === row.dataset.templateId);
    if (!template) return;

    if (syncButton) {
      syncTemplateStatus(template.id, syncButton);
      return;
    }

    state.selectedTemplateId = template.id;
    renderPreview(template);
  });
}

setupCreateActions();
setupFilters();
loadTemplates();
