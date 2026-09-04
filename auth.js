const passwordToggles = document.querySelectorAll("[data-password-toggle]");

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

