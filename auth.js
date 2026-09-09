const passwordToggles = document.querySelectorAll("[data-password-toggle]");

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";
const AUTH_STORAGE_KEY = "kevza.auth";

passwordToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const field = toggle.parentElement?.querySelector("[data-password-input]");

    if (!field) {
      return;
    }

    const showingPassword = field.type === "text";
    field.type = showingPassword ? "password" : "text";
    toggle.setAttribute("aria-label", showingPassword ? "Show password" : "Hide password");

    if (!toggle.querySelector("svg")) {
      toggle.textContent = showingPassword ? "Show" : "Hide";
    }
  });
});

const codeGroups = document.querySelectorAll(".code-inputs");

codeGroups.forEach((group) => {
  const inputs = Array.from(group.querySelectorAll("[data-code-input]"));

  inputs.forEach((input, index) => {
    input.addEventListener("input", (event) => {
      const sanitized = event.target.value.replace(/\D/g, "").slice(0, 1);
      event.target.value = sanitized;

      if (sanitized && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !input.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    input.addEventListener("paste", (event) => {
      event.preventDefault();
      const pasted = event.clipboardData?.getData("text")?.replace(/\D/g, "").slice(0, inputs.length) ?? "";

      pasted.split("").forEach((character, pasteIndex) => {
        if (inputs[pasteIndex]) {
          inputs[pasteIndex].value = character;
        }
      });

      const focusIndex = Math.min(pasted.length, inputs.length - 1);

      if (inputs[focusIndex]) {
        inputs[focusIndex].focus();
      }
    });
  });
});

const methodCards = document.querySelectorAll(".method-card");

methodCards.forEach((card) => {
  const radio = card.querySelector('input[type="radio"]');

  card.addEventListener("click", () => {
    if (!radio) {
      return;
    }

    radio.checked = true;
    methodCards.forEach((item) => item.classList.remove("is-selected"));
    card.classList.add("is-selected");
  });
});

const loginForm = document.querySelector("[data-login-form]");

if (loginForm) {
  const message = loginForm.querySelector("[data-login-message]");
  const submitButton = loginForm.querySelector('button[type="submit"]');

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const remember = formData.get("remember") === "on";

    setLoginMessage(message, "");

    if (!email || !password) {
      setLoginMessage(message, "Enter your email and password.");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to sign in. Please try again.");
      }

      const storage = remember ? window.localStorage : window.sessionStorage;
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
      storage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          accessToken: payload.accessToken,
          tokenType: payload.tokenType,
          user: payload.user,
          tenant: payload.tenant,
        }),
      );

      window.location.assign("admin-profile.html");
    } catch (error) {
      setLoginMessage(
        message,
        error instanceof Error ? error.message : "Unable to sign in. Please try again.",
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
      }
    }
  });
}

function setLoginMessage(element, text) {
  if (!element) {
    return;
  }

  element.textContent = text;
  element.hidden = !text;
}
