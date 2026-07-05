const registerForm = document.querySelector(".register-form");
const passwordToggles = document.querySelectorAll(".input-action__button");
const passwordInput = document.querySelector("#password");
const confirmPasswordInput = document.querySelector("#confirmPassword");
const strengthBars = document.querySelectorAll(".password-strength__bar");
const strengthText = document.querySelector(".password-strength__text");
const progressBar = document.querySelector(".register-progress__bar");
const progressValue = document.querySelector(".register-progress__top span:last-child");

const STORAGE_KEYS = {
    session: "finly_session",
    user: "finly_user_profile"
};

const getFieldGroup = (input) => input.closest(".form__group");

const getOrCreateError = (group) => {
    let error = group.querySelector(".form__error");

    if (!error) {
        error = document.createElement("span");
        error.className = "form__error";
        group.appendChild(error);
    }

    return error;
};

const setFieldError = (input, message) => {
    const group = getFieldGroup(input);
    const error = getOrCreateError(group);

    group.classList.add("is-error");
    error.textContent = message;
};

const clearFieldError = (input) => {
    const group = getFieldGroup(input);
    const error = group?.querySelector(".form__error");

    if (!group) return;

    group.classList.remove("is-error");

    if (error) {
        error.textContent = "";
    }
};

const isEmailValid = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const getPasswordStrength = (password) => {
    let score = 0;

    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (!password) {
        return {
            score: 0,
            label: "Use letras, números e símbolos para uma senha mais segura.",
            type: "empty"
        };
    }

    if (score <= 2) {
        return {
            score: 1,
            label: "Senha fraca. Tente usar mais caracteres e números.",
            type: "weak"
        };
    }

    if (score <= 4) {
        return {
            score: 3,
            label: "Senha boa. Você já está no caminho certo.",
            type: "good"
        };
    }

    return {
        score: 4,
        label: "Senha forte. Excelente escolha.",
        type: "strong"
    };
};

const updatePasswordStrength = () => {
    if (!passwordInput || !strengthBars.length || !strengthText) return;

    const strength = getPasswordStrength(passwordInput.value);

    strengthBars.forEach((bar, index) => {
        bar.classList.toggle("is-active", index < strength.score);
    });

    strengthText.textContent = strength.label;
    strengthText.dataset.strength = strength.type;
};

const updateRegisterProgress = () => {
    if (!registerForm || !progressBar || !progressValue) return;

    const fields = [
        "#firstName",
        "#lastName",
        "#email",
        "#password",
        "#confirmPassword"
    ];

    const filledFields = fields.filter((selector) => {
        const input = registerForm.querySelector(selector);
        return input?.value.trim();
    });

    const terms = registerForm.querySelector("[name='terms']");
    const hasAcceptedTerms = terms?.checked ? 1 : 0;

    const totalSteps = fields.length + 1;
    const completedSteps = filledFields.length + hasAcceptedTerms;
    const percentage = Math.round((completedSteps / totalSteps) * 100);

    progressBar.style.setProperty("--progress-value", `${percentage}%`);
    progressValue.textContent = `${percentage}%`;
};

const setButtonLoading = (button, isLoading) => {
    if (!button) return;

    button.classList.toggle("btn-loading", isLoading);
    button.disabled = isLoading;
};

const createToastContainer = () => {
    let container = document.querySelector(".toast-container");

    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    return container;
};

const getCloseIcon = () => `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
    </svg>
`;

const getToastIcon = (type) => {
    const icons = {
        success: `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        danger: `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 8v5" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
                <path d="M12 17h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                <path d="M10.3 4.4 2.9 18a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
        `,
        warning: `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
                <path d="M12 17h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                <path d="M12 3 2.5 20h19L12 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
        `,
        info: `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 17v-6" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
                <path d="M12 7h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" stroke-width="2"/>
            </svg>
        `
    };

    return icons[type] || icons.info;
};

const showToast = ({ type = "info", title, message }) => {
    const container = createToastContainer();

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;

    toast.innerHTML = `
        <span class="toast__icon" aria-hidden="true">
            ${getToastIcon(type)}
        </span>

        <span class="toast__content">
            <strong class="toast__title">${title}</strong>
            <span class="toast__message">${message}</span>
        </span>

        <button class="toast__close" type="button" aria-label="Fechar aviso">
            ${getCloseIcon()}
        </button>

        <span class="toast__progress"></span>
    `;

    container.appendChild(toast);

    const closeButton = toast.querySelector(".toast__close");

    const removeToast = () => {
        toast.classList.add("is-leaving");
        setTimeout(() => toast.remove(), 240);
    };

    closeButton.addEventListener("click", removeToast);
    setTimeout(removeToast, 4300);
};

const togglePasswordVisibility = (button) => {
    const wrapper = button.closest(".input-action");
    const input = wrapper?.querySelector("input");

    if (!input) return;

    const isPassword = input.type === "password";

    input.type = isPassword ? "text" : "password";
    button.setAttribute("aria-label", isPassword ? "Ocultar senha" : "Mostrar senha");
};

const validateRegisterForm = (form) => {
    const firstName = form.querySelector("#firstName");
    const lastName = form.querySelector("#lastName");
    const email = form.querySelector("#email");
    const password = form.querySelector("#password");
    const confirmPassword = form.querySelector("#confirmPassword");
    const terms = form.querySelector("[name='terms']");

    let isValid = true;

    if (!firstName.value.trim()) {
        setFieldError(firstName, "Digite seu nome.");
        isValid = false;
    } else if (firstName.value.trim().length < 2) {
        setFieldError(firstName, "O nome precisa ter pelo menos 2 caracteres.");
        isValid = false;
    } else {
        clearFieldError(firstName);
    }

    if (!lastName.value.trim()) {
        setFieldError(lastName, "Digite seu sobrenome.");
        isValid = false;
    } else if (lastName.value.trim().length < 2) {
        setFieldError(lastName, "O sobrenome precisa ter pelo menos 2 caracteres.");
        isValid = false;
    } else {
        clearFieldError(lastName);
    }

    if (!email.value.trim()) {
        setFieldError(email, "Digite seu e-mail.");
        isValid = false;
    } else if (!isEmailValid(email.value.trim())) {
        setFieldError(email, "Digite um e-mail válido.");
        isValid = false;
    } else {
        clearFieldError(email);
    }

    if (!password.value.trim()) {
        setFieldError(password, "Crie uma senha.");
        isValid = false;
    } else if (password.value.trim().length < 6) {
        setFieldError(password, "A senha precisa ter pelo menos 6 caracteres.");
        isValid = false;
    } else {
        clearFieldError(password);
    }

    if (!confirmPassword.value.trim()) {
        setFieldError(confirmPassword, "Confirme sua senha.");
        isValid = false;
    } else if (confirmPassword.value !== password.value) {
        setFieldError(confirmPassword, "As senhas não são iguais.");
        isValid = false;
    } else {
        clearFieldError(confirmPassword);
    }

    if (!terms.checked) {
        showToast({
            type: "warning",
            title: "Termos pendentes",
            message: "Aceite os termos de uso para criar sua conta."
        });

        isValid = false;
    }

    return isValid;
};

const getSelectedProfileType = (form) => {
    const selected = form.querySelector("[name='profileType']:checked");

    return selected?.value || "personal";
};

const saveUserProfile = (form) => {
    const firstName = form.querySelector("#firstName").value.trim();
    const lastName = form.querySelector("#lastName").value.trim();
    const email = form.querySelector("#email").value.trim();
    const profileType = getSelectedProfileType(form);

    const user = {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        profileType,
        createdAt: new Date().toISOString()
    };

    const session = {
        email,
        name: user.name,
        loggedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
};

const handleRegisterSubmit = (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton = form.querySelector("[type='submit']");

    if (!validateRegisterForm(form)) {
        showToast({
            type: "danger",
            title: "Revise seu cadastro",
            message: "Alguns campos precisam de atenção antes de continuar."
        });

        return;
    }

    setButtonLoading(submitButton, true);
    saveUserProfile(form);

    showToast({
        type: "success",
        title: "Conta criada",
        message: "Seu painel financeiro está sendo preparado."
    });

    setTimeout(() => {
        window.location.href = "./dashboard.html";
    }, 950);
};

passwordToggles.forEach((button) => {
    button.addEventListener("click", () => togglePasswordVisibility(button));
});

document.querySelectorAll(".input").forEach((input) => {
    input.addEventListener("input", () => {
        clearFieldError(input);
        updateRegisterProgress();

        if (input === passwordInput) {
            updatePasswordStrength();
        }

        if (input === confirmPasswordInput && passwordInput.value === confirmPasswordInput.value) {
            clearFieldError(confirmPasswordInput);
        }
    });
});

document.querySelectorAll("[name='terms'], [name='profileType']").forEach((input) => {
    input.addEventListener("change", updateRegisterProgress);
});

if (registerForm) {
    registerForm.addEventListener("submit", handleRegisterSubmit);
    updatePasswordStrength();
    updateRegisterProgress();
}