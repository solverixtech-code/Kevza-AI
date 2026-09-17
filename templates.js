const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";
const AUTH_STORAGE_KEY = "kevza.auth";

const state = {
  templates: [],
  selectedTemplateId: null,
  pendingDeleteId: null,
  createExamples: {},
};

const tableBody = document.querySelector("[data-templates-body]");
const createModal = document.getElementById("createTemplateModal");
const createForm = createModal?.querySelector(".ct-form");
const searchInput = document.querySelector(".lib-toolbar input[type='search'], .template-toolbar input[type='search']");
const categoryFilter = document.querySelector(".lib-toolbar select[aria-label='Filter by category'], .template-toolbar select[aria-label='Filter by category']");
const statusFilter = document.querySelector(".lib-toolbar select[aria-label='Filter by status'], .template-toolbar select[aria-label='Filter by status']");
const metricCards = Array.from(document.querySelectorAll(".template-metrics .tpl-metric-card, .template-metrics .metric-card"));
const toast = document.getElementById("templateToast");
const starterWrap = createModal?.querySelector("[data-template-starters]");
const variableChipsWrap = createModal?.querySelector("[data-variable-chips]");
const variablePicker = createModal?.querySelector("[data-variable-picker]");
const sampleValuesWrap = createModal?.querySelector("[data-sample-values]");

const templateStarters = [
  {
    id: "order-update",
    title: "Order Update",
    category: "UTILITY",
    bodyText: "Hi {{name}}, your order update is ready. Tap below to view details.",
    buttonText: "View Details",
    buttonUrl: "https://kevzaai.com/order",
  },
  {
    id: "appointment-reminder",
    title: "Appointment Reminder",
    category: "UTILITY",
    bodyText: "Hi {{name}}, this is a reminder for your appointment on {{date}}. Please confirm your visit.",
    buttonText: "Confirm Visit",
    buttonUrl: "https://kevzaai.com/appointment",
  },
  {
    id: "payment-reminder",
    title: "Payment Reminder",
    category: "UTILITY",
    bodyText: "Hi {{name}}, invoice {{invoice_id}} is ready. Tap below to review and complete payment.",
    buttonText: "Pay Now",
    buttonUrl: "https://kevzaai.com/pay",
  },
  {
    id: "welcome-offer",
    title: "Welcome Offer",
    category: "MARKETING",
    bodyText: "Hi {{name}}, welcome to our store. Your {{offer}} is ready and can be claimed today.",
    buttonText: "Claim Offer",
    buttonUrl: "https://kevzaai.com/offer",
  },
  {
    id: "lead-follow-up",
    title: "Lead Follow-up",
    category: "MARKETING",
    bodyText: "Hi {{name}}, thanks for your interest. Our team can help you choose the right option today.",
    buttonText: "Talk to Us",
    buttonUrl: "https://kevzaai.com/contact",
  },
  {
    id: "otp-code",
    title: "OTP Code",
    category: "AUTHENTICATION",
    bodyText: "Your verification code is {{otp}}. For your security, do not share this code with anyone.",
    buttonText: "",
    buttonUrl: "",
  },
];

const variableSuggestions = ["name", "offer", "date", "invoice_id", "otp", "link"];

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

function showToast(message, type = "success") {
  if (!toast) return;

  const icon = toast.querySelector("span");
  const text = toast.querySelector("strong");
  if (icon) icon.textContent = type === "error" ? "!" : type === "info" ? "i" : "✓";
  if (text) text.textContent = message;

  toast.className = `template-toast is-visible ${type}`;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3600);
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
    mr: "Marathi",
    gu: "Gujarati",
    ta: "Tamil",
    te: "Telugu",
    kn: "Kannada",
    bn: "Bengali",
    pa: "Punjabi",
    ar: "Arabic",
    es: "Spanish",
    fr: "French",
  };
  return map[language] || language || "English";
}

function compactLanguage(language) {
  const map = {
    en_US: "English",
    en: "English",
    hi: "Hindi",
    mr: "Marathi",
    gu: "Gujarati",
    ta: "Tamil",
    te: "Telugu",
    kn: "Kannada",
    bn: "Bengali",
    pa: "Punjabi",
    ar: "Arabic",
    es: "Spanish",
    fr: "French",
  };
  return map[language] || formatLanguage(language);
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

  const approvalCard = document.querySelector(".approval-health-card, .approval-card");
  const approvedPercent = total ? Math.round((approved / total) * 100) : 0;

  if (approvalCard) {
    const ring = approvalCard.querySelector(".approval-ring, .approval-donut");
    const ringValue = approvalCard.querySelector(".approval-ring strong, .approval-donut-pct");
    const donutCircle = approvalCard.querySelector(".approval-donut svg circle:nth-of-type(2)");
    const listItems = approvalCard.querySelectorAll("li");

    if (ring) {
      ring.style.background = `radial-gradient(circle closest-side,#fff 62%,transparent 63%),conic-gradient(#10ad80 0 ${approvedPercent}%,#e8eef8 ${approvedPercent}% 100%)`;
    }
    if (ringValue) ringValue.textContent = `${approvedPercent}%`;
    if (donutCircle) donutCircle.setAttribute("stroke-dasharray", `${approvedPercent} ${100 - approvedPercent}`);

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
  const preview = document.querySelector(".live-preview-card, .preview-card");
  if (!preview || !selected) return;

  const title = getTemplateTitle(selected);
  const status = normalizeStatus(selected.status);
  const statusEl = preview.querySelector(".badge-approved, .section-head .status");
  const subtitle = preview.querySelector(".live-preview-sub, .section-head p");
  const bubbleTitle = preview.querySelector(".wa-bubble-title, .chat-bubble strong");
  const bubbleText = preview.querySelector(".wa-bubble-text, .chat-bubble p");
  const bubbleButton = preview.querySelector(".wa-bubble-btn, .chat-bubble button");
  const meta = preview.querySelector(".wa-template-vars, .chat-meta");
  const variables = Array.isArray(selected.variables) ? selected.variables : extractVariables(selected.bodyText);
  const buttons = Array.isArray(selected.buttons) ? selected.buttons : [];
  const firstButton = buttons[0];

  if (statusEl) {
    statusEl.className = statusEl.classList.contains("badge-approved") ? `badge-approved ${status}` : `status ${status}`;
    statusEl.textContent = toTitle(status);
  }
  if (subtitle) subtitle.textContent = `WhatsApp ${toTitle(selected.category || "MARKETING")} template`;
  if (bubbleTitle) bubbleTitle.textContent = title;
  if (bubbleText) bubbleText.textContent = fillVariableExamples(selected.bodyText || "", selected.examples);

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

function renderRowActions(template, status) {
  const title = escapeHtml(getTemplateTitle(template));
  const viewAction = `<button class="row-action view-template" type="button" aria-label="View ${title} preview" title="View live preview">View</button>`;
  const deleteAction = `<button class="btn-tpl-delete row-action delete-template" type="button" aria-label="Delete ${title}" title="Delete template">Delete</button>`;

  if (status === "approved") {
    return `<span class="row-synced" title="Meta status is synced">Synced</span>${viewAction}${deleteAction}`;
  }

  const primaryAction =
    status === "draft"
      ? `<button class="row-action submit-template" type="button" aria-label="Submit ${title} to Meta" title="Submit to Meta">Submit</button>`
      : `<button class="row-action sync-template" type="button" aria-label="Sync ${title} status from Meta" title="Sync Meta status">Sync</button>`;

  return `${primaryAction}${viewAction}${deleteAction}`;
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
          <td class="tpl-name"><strong>${escapeHtml(getTemplateTitle(template))}</strong><span>${escapeHtml(summarize(template.bodyText))}</span></td>
          <td><span class="badge-channel whatsapp">WhatsApp</span></td>
          <td>${escapeHtml(toTitle(template.category || "MARKETING"))}</td>
          <td><span class="badge-status ${escapeHtml(status)}">${escapeHtml(toTitle(status))}</span></td>
          <td>${escapeHtml(formatLanguage(template.language))}</td>
          <td>0</td>
          <td>${escapeHtml(formatRelativeTime(template.updatedAt))}</td>
          <td>
            <div class="tpl-actions row-actions">
              ${renderRowActions(template, status)}
            </div>
          </td>
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

function humanizeVariable(variable) {
  return toTitle(String(variable || "").replace(/_/g, " "));
}

function normalizeExamples(examples) {
  if (!examples) return {};
  if (typeof examples === "string") {
    try {
      return JSON.parse(examples) || {};
    } catch {
      return {};
    }
  }
  return typeof examples === "object" ? examples : {};
}

function fillVariableExamples(bodyText, examples = null) {
  const savedExamples = normalizeExamples(examples);

  return String(bodyText || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, variable) => {
    const key = variable.trim();
    return savedExamples[key] || getExampleValue(key);
  });
}

function getExampleValue(variable) {
  if (state.createExamples[variable]) return state.createExamples[variable];
  const input = sampleValuesWrap?.querySelector(`[data-sample-input="${CSS.escape(variable)}"]`);
  const value = input?.value?.trim();
  return value || exampleForVariable(variable);
}

function getCreateElements() {
  if (!createForm || !createModal) return {};

  const textarea = createForm.querySelector("textarea[name='template_body']");
  const detailRows = Array.from(createModal.querySelectorAll(".ct-details dl div"));

  return {
    nameInput: createForm.querySelector("input[name='template_name']"),
    categorySelect: createForm.querySelector("select[name='template_category']"),
    languageSelect: createForm.querySelector("select[name='template_language']"),
    textarea,
    buttonTextInput: createForm.querySelector("input[name='template_button_text']"),
    buttonUrlInput: createForm.querySelector("input[name='template_button_url']"),
    hasButtonInput: createForm.querySelector("input[name='template_has_button']"),
    count: textarea?.closest(".ct-field")?.querySelector("em"),
    messageTitle: createModal.querySelector(".ct-message strong"),
    messageBody: createModal.querySelector(".ct-message p"),
    messageButton: createModal.querySelector(".ct-message button"),
    categoryDetail: detailRows[1]?.querySelector("dd"),
    languageDetail: detailRows[2]?.querySelector("dd"),
    statusDetail: detailRows[3]?.querySelector("dd span"),
    goodTitle: createModal.querySelector(".ct-good strong"),
    goodText: createModal.querySelector(".ct-good p"),
    infoTitle: createModal.querySelector(".ct-info strong"),
    infoText: createModal.querySelector(".ct-info p"),
  };
}

function getSelectedCreateStatus() {
  return createForm?.querySelector("input[name='template_status']:checked")?.value || "PENDING";
}

function selectCreateStatus(status) {
  if (!createForm) return;
  createForm.querySelectorAll(".ct-status-pick label").forEach((label) => {
    const input = label.querySelector("input");
    const isSelected = input?.value === status;
    if (input) input.checked = isSelected;
    label.classList.toggle("is-selected", isSelected);
  });
}

function updateStatusCards() {
  if (!createForm) return;
  createForm.querySelectorAll(".ct-status-pick label").forEach((label) => {
    const input = label.querySelector("input");
    label.classList.toggle("is-selected", Boolean(input?.checked));
  });
}

function insertAtCursor(textarea, text) {
  if (!textarea) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const prefix = textarea.value.slice(0, start);
  const suffix = textarea.value.slice(end);
  const needsSpaceBefore = prefix && !/\s$/.test(prefix) ? " " : "";
  const needsSpaceAfter = suffix && !/^\s/.test(suffix) ? " " : "";
  textarea.value = `${prefix}${needsSpaceBefore}${text}${needsSpaceAfter}${suffix}`;
  const nextPosition = start + needsSpaceBefore.length + text.length;
  textarea.focus();
  textarea.setSelectionRange(nextPosition, nextPosition);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function nextVariableName() {
  const current = extractVariables(getCreateElements().textarea?.value);
  return variableSuggestions.find((variable) => !current.includes(variable)) || "name";
}

function insertVariable(variable = nextVariableName()) {
  insertAtCursor(getCreateElements().textarea, `{{${variable}}}`);
}

function updateCreateVariables() {
  const variables = extractVariables(getCreateElements().textarea?.value);

  sampleValuesWrap?.querySelectorAll("[data-sample-input]").forEach((input) => {
    if (input.value.trim()) state.createExamples[input.dataset.sampleInput] = input.value.trim();
  });

  if (variableChipsWrap) {
    variableChipsWrap.innerHTML = variables.length
      ? variables
          .map(
            (variable) =>
              `<span>{{${escapeHtml(variable)}}}<button type="button" data-remove-variable="${escapeHtml(variable)}" aria-label="Remove ${escapeHtml(variable)} variable">x</button></span>`,
          )
          .join("")
      : '<span class="is-empty">No variables yet</span>';
  }

  if (sampleValuesWrap) {
    sampleValuesWrap.innerHTML = variables.length
      ? `<div class="ct-sample-title">Sample values for preview and Meta examples</div>${variables
          .map(
            (variable) => `
              <label>
                <span>${escapeHtml(humanizeVariable(variable))}</span>
                <input type="text" value="${escapeHtml(getExampleValue(variable))}" data-sample-input="${escapeHtml(variable)}" />
              </label>
            `,
          )
          .join("")}`
      : "";
  }
}

function removeVariable(variable) {
  const textarea = getCreateElements().textarea;
  if (!textarea) return;

  const tokenPattern = new RegExp(`\\s*\\{\\{\\s*${variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}\\s*`, "g");
  textarea.value = textarea.value.replace(tokenPattern, " ").replace(/\s{2,}/g, " ").trim();
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function renderVariablePicker() {
  if (!variablePicker) return;
  variablePicker.innerHTML = variableSuggestions
    .map(
      (variable) =>
        `<button type="button" data-variable="${escapeHtml(variable)}">${escapeHtml(humanizeVariable(variable))}</button>`,
    )
    .join("");
}

function renderTemplateStarters() {
  if (!starterWrap) return;
  starterWrap.innerHTML = templateStarters
    .map(
      (starter, index) => `
        <button class="${index === 0 ? "is-selected" : ""}" type="button" data-starter="${escapeHtml(starter.id)}">
          <strong>${escapeHtml(starter.title)}</strong>
          <span>${escapeHtml(toTitle(starter.category))}</span>
        </button>
      `,
    )
    .join("");
}

function applyTemplateStarter(starterId) {
  const starter = templateStarters.find((item) => item.id === starterId);
  if (!starter) return;

  const elements = getCreateElements();
  if (elements.nameInput) elements.nameInput.value = starter.title;
  if (elements.categorySelect) elements.categorySelect.value = starter.category;
  if (elements.textarea) elements.textarea.value = starter.bodyText;
  if (elements.buttonTextInput) elements.buttonTextInput.value = starter.buttonText;
  if (elements.buttonUrlInput) elements.buttonUrlInput.value = starter.buttonUrl;
  if (elements.hasButtonInput) elements.hasButtonInput.checked = Boolean(starter.buttonText && starter.buttonUrl);
  state.createExamples = {};

  starterWrap?.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.starter === starterId);
  });

  updateCreatePreview();
}

function updateCreatePreview(options = {}) {
  const { syncVariables = true } = options;
  const elements = getCreateElements();
  const title = elements.nameInput?.value.trim() || "Untitled Template";
  const bodyText = elements.textarea?.value.trim() || "Your message preview will appear here.";
  const buttonText = elements.buttonTextInput?.value.trim();
  const hasButton = elements.hasButtonInput?.checked && buttonText;
  const status = getSelectedCreateStatus();

  if (elements.count && elements.textarea) elements.count.textContent = `${elements.textarea.value.length}/1024`;
  if (elements.messageTitle) elements.messageTitle.textContent = title;
  if (elements.messageBody) elements.messageBody.textContent = fillVariableExamples(bodyText);
  if (elements.messageButton) {
    elements.messageButton.textContent = buttonText || "Open";
    elements.messageButton.style.display = hasButton ? "" : "none";
  }
  if (elements.categoryDetail) elements.categoryDetail.textContent = toTitle(elements.categorySelect?.value || "UTILITY");
  if (elements.languageDetail) elements.languageDetail.textContent = compactLanguage(elements.languageSelect?.value || "en_US");
  if (elements.statusDetail) elements.statusDetail.textContent = status === "DRAFT" ? "Draft" : "Pending";

  if (elements.goodTitle) elements.goodTitle.textContent = status === "DRAFT" ? "Draft ready" : "Ready for Meta review";
  if (elements.goodText) {
    elements.goodText.textContent =
      status === "DRAFT"
        ? "Save this draft now and submit it to Meta once the content is final."
        : "This template can be submitted for Meta approval. Approved templates can be used in campaigns later.";
  }
  if (elements.infoTitle) {
    elements.infoTitle.innerHTML =
      status === "DRAFT"
        ? 'Drafts stay editable until you submit them.'
        : 'After submit, status will become <span>Pending</span>';
  }
  if (elements.infoText) {
    elements.infoText.textContent =
      status === "DRAFT"
        ? "Draft templates are saved only inside KevzaAI."
        : "Meta reviews WhatsApp templates before they can be used in campaigns.";
  }

  if (syncVariables) updateCreateVariables();
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
  const examples = variables.reduce((acc, variable) => ({ ...acc, [variable]: getExampleValue(variable) }), {});

  return {
    displayName,
    category,
    language,
    bodyText,
    variables,
    examples,
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
    otp: "123456",
  };
  return examples[variable] || "Sample value";
}

async function saveTemplate(status, button) {
  const payload = getCreatePayload(status);
  if (!payload) return;

  if (!payload.displayName || !payload.bodyText) {
    showToast("Template name and body are required.", "error");
    return;
  }

  if (status === "PENDING" && /^\s*\{\{/.test(payload.bodyText)) {
    showToast("Meta does not allow a variable at the start. Add normal text before the first variable.", "error");
    return;
  }

  if (status === "PENDING" && /\}\}\s*$/.test(payload.bodyText)) {
    showToast("Meta does not allow a variable at the end. Add normal text after the last variable.", "error");
    return;
  }

  const originalText = button.textContent;
  let createdTemplate = null;
  button.disabled = true;
  button.textContent = status === "PENDING" ? "Submitting..." : "Saving Draft...";

  try {
    createdTemplate = await apiRequest("/templates", {
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
    showToast(
      status === "PENDING"
        ? "Template submitted to Meta. Wait about 2 minutes, then click Sync to refresh approval status."
        : "Template draft saved.",
      status === "PENDING" ? "info" : "success",
    );
  } catch (error) {
    if (status === "PENDING" && createdTemplate?.id) {
      await apiRequest(`/templates/${createdTemplate.id}`, { method: "DELETE" }).catch(() => {});
    }
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function submitExistingTemplate(templateId, button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Submitting...";

  try {
    const updatedTemplate = await apiRequest(`/templates/${templateId}/submit-to-meta`, {
      method: "POST",
    });
    state.templates = state.templates.map((template) =>
      template.id === updatedTemplate.id ? updatedTemplate : template,
    );
    state.selectedTemplateId = updatedTemplate.id;
    renderTable(state.templates);
    updateMetrics(state.templates);
    renderPreview(updatedTemplate);
    showToast("Template submitted to Meta. Wait about 2 minutes, then click Sync to refresh approval status.", "info");
  } catch (error) {
    showToast(error.message, "error");
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
    showToast(`Meta status updated to ${toTitle(updatedTemplate.status)}.`);
  } catch (error) {
    showToast(error.message, "error");
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function deleteTemplate(templateId, button) {
  if (state.pendingDeleteId !== templateId) {
    state.pendingDeleteId = templateId;
    const originalText = button.textContent;
    button.textContent = "Sure?";
    button.classList.add("is-confirming");
    window.setTimeout(() => {
      if (state.pendingDeleteId === templateId) {
        state.pendingDeleteId = null;
        button.textContent = originalText;
        button.classList.remove("is-confirming");
      }
    }, 2600);
    return;
  }

  button.disabled = true;
  button.textContent = "Deleting...";

  try {
    await apiRequest(`/templates/${templateId}`, {
      method: "DELETE",
    });
    state.pendingDeleteId = null;
    state.templates = state.templates.filter((template) => template.id !== templateId);
    const selected = state.templates[0] || null;
    state.selectedTemplateId = selected?.id || null;
    renderTable(state.templates);
    updateMetrics(state.templates);
    renderPreview(selected);
    showToast("Template deleted.");
  } catch (error) {
    showToast(error.message, "error");
    button.disabled = false;
    button.textContent = "Delete";
    button.classList.remove("is-confirming");
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
  const insertButton = createForm?.querySelector("[data-insert-variable]");
  const addVariableButton = createForm?.querySelector("[data-add-variable]");

  renderTemplateStarters();
  renderVariablePicker();
  updateCreatePreview();

  saveDraft?.addEventListener("click", () => {
    selectCreateStatus("DRAFT");
    updateCreatePreview();
    saveTemplate("DRAFT", saveDraft);
  });
  submit?.addEventListener("click", () => {
    selectCreateStatus("PENDING");
    updateCreatePreview();
    saveTemplate("PENDING", submit);
  });

  createForm?.addEventListener("input", (event) => {
    if (event.target.closest("[data-sample-values]")) return;
    updateCreatePreview();
  });
  createForm?.addEventListener("change", () => {
    updateStatusCards();
    updateCreatePreview();
  });
  insertButton?.addEventListener("click", () => insertVariable());
  addVariableButton?.addEventListener("click", () => insertVariable());
  variablePicker?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-variable]");
    if (button) insertVariable(button.dataset.variable);
  });
  variableChipsWrap?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-variable]");
    if (button) removeVariable(button.dataset.removeVariable);
  });
  sampleValuesWrap?.addEventListener("input", (event) => {
    const input = event.target.closest("[data-sample-input]");
    if (input) state.createExamples[input.dataset.sampleInput] = input.value;
    updateCreatePreview({ syncVariables: false });
  });
  starterWrap?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-starter]");
    if (button) applyTemplateStarter(button.dataset.starter);
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
    const submitButton = event.target.closest(".submit-template");
    const syncButton = event.target.closest(".sync-template");
    const viewButton = event.target.closest(".view-template");
    const deleteButton = event.target.closest(".delete-template");
    const row = event.target.closest("tr[data-template-id]");
    if (!row) return;

    const template = state.templates.find((item) => item.id === row.dataset.templateId);
    if (!template) return;

    if (submitButton) {
      submitExistingTemplate(template.id, submitButton);
      return;
    }

    if (syncButton) {
      syncTemplateStatus(template.id, syncButton);
      return;
    }

    if (viewButton) {
      state.selectedTemplateId = template.id;
      renderPreview(template);
      document.querySelector(".live-preview-card, .preview-card")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    if (deleteButton) {
      deleteTemplate(template.id, deleteButton);
      return;
    }

    state.selectedTemplateId = template.id;
    renderPreview(template);
  });

  toast?.querySelector("button")?.addEventListener("click", () => {
    toast.classList.remove("is-visible");
  });
}

setupCreateActions();
setupFilters();
loadTemplates();
