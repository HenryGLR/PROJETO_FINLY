const loginForm = document.querySelector(".auth-form");
const passwordButtons = document.querySelectorAll(".input-action__button");

const STORAGE_KEYS = {
    session: "finly_session",
    remember: "finly_remember_user"
};

const getInputGroup = (input) => input.closest(".form__group");

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
    const group = getInputGroup(input);
    const error = getOrCreateError(group);

    group.classList.add("is-error");
    error.textContent = message;
};

const clearFieldError = (input) => {
    const group = getInputGroup(input);
    const error = group.querySelector(".form__error");

    group.classList.remove("is-error");

    if (error) {
        error.textContent = "";
    }
};

const isEmailValid = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    setTimeout(removeToast, 4200);
};

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

const getCloseIcon = () => `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
    </svg>
`;

const togglePasswordVisibility = (button) => {
    const wrapper = button.closest(".input-action");
    const input = wrapper?.querySelector("input");

    if (!input) return;

    const isPassword = input.type === "password";

    input.type = isPassword ? "text" : "password";
    button.setAttribute("aria-label", isPassword ? "Ocultar senha" : "Mostrar senha");
};

const validateLoginForm = (form) => {
    const email = form.querySelector("#email");
    const password = form.querySelector("#password");

    let isValid = true;

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
        setFieldError(password, "Digite sua senha.");
        isValid = false;
    } else if (password.value.trim().length < 6) {
        setFieldError(password, "A senha precisa ter pelo menos 6 caracteres.");
        isValid = false;
    } else {
        clearFieldError(password);
    }

    return isValid;
};

const saveSession = (form) => {
    const email = form.querySelector("#email").value.trim();
    const remember = form.querySelector("[name='remember']")?.checked;

    const session = {
        email,
        name: email.split("@")[0],
        loggedAt: new Date().toISOString()
    };

    sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));

    if (remember) {
        localStorage.setItem(STORAGE_KEYS.remember, email);
    } else {
        localStorage.removeItem(STORAGE_KEYS.remember);
    }
};

const loadRememberedUser = () => {
    const email = document.querySelector("#email");
    const rememberedEmail = localStorage.getItem(STORAGE_KEYS.remember);

    if (email && rememberedEmail) {
        email.value = rememberedEmail;
    }
};

const handleLoginSubmit = (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton = form.querySelector("[type='submit']");

    if (!validateLoginForm(form)) {
        showToast({
            type: "danger",
            title: "Revise os campos",
            message: "Algumas informações precisam ser corrigidas antes de continuar."
        });

        return;
    }

    setButtonLoading(submitButton, true);
    saveSession(form);

    showToast({
        type: "success",
        title: "Login realizado",
        message: "Estamos preparando seu painel financeiro."
    });

    setTimeout(() => {
        window.location.href = "./dashboard.html";
    }, 900);
};

passwordButtons.forEach((button) => {
    button.addEventListener("click", () => togglePasswordVisibility(button));
});

document.querySelectorAll(".input").forEach((input) => {
    input.addEventListener("input", () => clearFieldError(input));
});

if (loginForm) {
    loadRememberedUser();
    loginForm.addEventListener("submit", handleLoginSubmit);
}