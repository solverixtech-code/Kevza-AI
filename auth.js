const passwordToggles = document.querySelectorAll("[data-password-toggle]");

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";
const AUTH_STORAGE_KEY = "kevza.auth";
const PENDING_EMAIL_VERIFICATION_KEY = "kevza.pendingEmailVerification";
const ROLE_HOME_PAGES = {
  SUPER_ADMIN: "admin-profile.html",
  OWNER: "customer-dashboard.html",
  TEAM_MEMBER: "customer-dashboard.html",
};

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

const codeGroups = document.querySelectorAll(".code-inputs, .auth-code-row");

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
const adminLoginForm = document.querySelector("[data-admin-login-form]");
const signupForm = document.querySelector("[data-signup-form]");
const emailOtpForm = document.querySelector("[data-email-otp-form]");
const googleAuthLinks = document.querySelectorAll("[data-google-auth]");
const authCallback = document.querySelector("[data-auth-callback]");

googleAuthLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.assign(`${API_BASE_URL}/auth/google`);
  });
});

if (authCallback) {
  const message = authCallback.querySelector("[data-auth-callback-message]");
  handleAuthCallback(message);
}

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

      if (payload.requiresVerification) {
        storePendingEmailVerification(payload.email, payload.devOtp);
        window.location.assign(`verify-login.html?email=${encodeURIComponent(payload.email)}`);
        return;
      }

      if (payload.user?.role === "SUPER_ADMIN") {
        throw new Error("Use the Super Admin login page for this account.");
      }

      storeAuthSession(payload, remember ? window.localStorage : window.sessionStorage);

      redirectToRoleHome(payload.user);
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

if (adminLoginForm) {
  const message = adminLoginForm.querySelector("[data-admin-login-message]");
  const submitButton = adminLoginForm.querySelector('button[type="submit"]');

  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(adminLoginForm);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const remember = formData.get("remember") === "on";

    setLoginMessage(message, "");

    if (!email || !password) {
      setLoginMessage(message, "Enter your super admin email and password.");
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

      if (payload.requiresVerification) {
        throw new Error("Super admin account must be verified before access.");
      }

      if (payload.user?.role !== "SUPER_ADMIN") {
        throw new Error("This login is only for KevzaAI super admins.");
      }

      storeAuthSession(payload, remember ? window.localStorage : window.sessionStorage);
      redirectToRoleHome(payload.user);
    } catch (error) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
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

if (signupForm) {
  const message = signupForm.querySelector("[data-signup-message]");
  const submitButton = signupForm.querySelector('button[type="submit"]');

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(signupForm);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const businessName = String(formData.get("businessName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const acceptedTerms = formData.get("terms") === "on";

    setLoginMessage(message, "");

    if (!name || !email || !businessName || !phone || !password || !confirmPassword) {
      setLoginMessage(message, "Fill all required details to create your account.");
      return;
    }

    if (password !== confirmPassword) {
      setLoginMessage(message, "Password and confirm password do not match.");
      return;
    }

    if (!acceptedTerms) {
      setLoginMessage(message, "Accept the Terms & Privacy Policy to continue.");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          name,
          email,
          phone,
          password,
          timezone: "Asia/Kolkata",
          country: "IN",
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to create account. Please try again.");
      }

      if (payload.requiresVerification) {
        storePendingEmailVerification(payload.email, payload.devOtp);
        window.location.assign(`verify-login.html?email=${encodeURIComponent(payload.email)}`);
        return;
      }

      storeAuthSession(payload, window.localStorage);
      redirectToRoleHome(payload.user);
    } catch (error) {
      setLoginMessage(
        message,
        error instanceof Error ? error.message : "Unable to create account. Please try again.",
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
      }
    }
  });
}

if (emailOtpForm) {
  const message = emailOtpForm.querySelector("[data-email-otp-message]");
  const help = emailOtpForm.querySelector("[data-email-otp-help]");
  const submitButton = emailOtpForm.querySelector('button[type="submit"]');
  const resendButton = emailOtpForm.querySelector("[data-resend-email-otp]");
  const pendingVerification = getPendingEmailVerification();
  const email = getVerificationEmail(pendingVerification);

  if (help && email) {
    help.textContent = pendingVerification?.devOtp
      ? `Local dev OTP for ${email}: ${pendingVerification.devOtp}`
      : `Enter the 6-digit code sent to ${email}.`;
  }

  emailOtpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoginMessage(message, "");

    const code = getOtpCode(emailOtpForm);

    if (!email) {
      setLoginMessage(message, "Signup email is missing. Please create your account again.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setLoginMessage(message, "Enter the complete 6-digit OTP code.");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to verify OTP. Please try again.");
      }

      window.sessionStorage.removeItem(PENDING_EMAIL_VERIFICATION_KEY);
      storeAuthSession(payload, window.localStorage);
      redirectToRoleHome(payload.user);
    } catch (error) {
      setLoginMessage(
        message,
        error instanceof Error ? error.message : "Unable to verify OTP. Please try again.",
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
      }
    }
  });

  resendButton?.addEventListener("click", async () => {
    setLoginMessage(message, "");

    if (!email) {
      setLoginMessage(message, "Signup email is missing. Please create your account again.");
      return;
    }

    resendButton.disabled = true;
    resendButton.setAttribute("aria-busy", "true");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to send a new OTP. Please try again.");
      }

      storePendingEmailVerification(email, payload.devOtp);
      if (help) {
        help.textContent = payload.devOtp
          ? `Local dev OTP for ${email}: ${payload.devOtp}`
          : `A new 6-digit code was sent to ${email}.`;
      }
      setLoginMessage(message, "New OTP sent.");
    } catch (error) {
      setLoginMessage(
        message,
        error instanceof Error ? error.message : "Unable to send a new OTP. Please try again.",
      );
    } finally {
      resendButton.disabled = false;
      resendButton.removeAttribute("aria-busy");
    }
  });
}

function storeAuthSession(payload, storage) {
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
}

async function handleAuthCallback(message) {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const error = params.get("error");
  const accessToken = params.get("accessToken");
  const tokenType = params.get("tokenType") || "Bearer";

  if (error) {
    setAuthCallbackMessage(message, error);
    return;
  }

  if (!accessToken) {
    setAuthCallbackMessage(message, "Google sign-in did not return an access token.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `${tokenType} ${accessToken}` },
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Unable to complete Google sign-in.");
    }

    storeAuthSession(
      {
        accessToken,
        tokenType,
        user: payload.user,
        tenant: payload.tenant,
      },
      window.localStorage,
    );
    window.location.replace(getRoleHomePage(payload.user));
  } catch (caughtError) {
    setAuthCallbackMessage(
      message,
      caughtError instanceof Error
        ? caughtError.message
        : "Unable to complete Google sign-in.",
    );
  }
}

function setAuthCallbackMessage(element, text) {
  if (!element) {
    return;
  }

  element.textContent = text;
}

function redirectToRoleHome(user) {
  window.location.assign(getRoleHomePage(user));
}

function getRoleHomePage(user) {
  return ROLE_HOME_PAGES[user?.role] ?? "customer-dashboard.html";
}

function storePendingEmailVerification(email, devOtp) {
  window.sessionStorage.setItem(
    PENDING_EMAIL_VERIFICATION_KEY,
    JSON.stringify({
      email,
      devOtp: devOtp ?? null,
    }),
  );
}

function getPendingEmailVerification() {
  try {
    const raw = window.sessionStorage.getItem(PENDING_EMAIL_VERIFICATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getVerificationEmail(pendingVerification) {
  const queryEmail = new URLSearchParams(window.location.search).get("email");
  return queryEmail || pendingVerification?.email || "";
}

function getOtpCode(form) {
  return Array.from(form.querySelectorAll("[data-code-input]"))
    .map((input) => input.value.trim())
    .join("");
}

function setLoginMessage(element, text) {
  if (!element) {
    return;
  }

  element.textContent = text;
  element.hidden = !text;
}
