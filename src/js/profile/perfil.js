(() => {
    const PROFILE_KEY = "finly_user_profile";
    const PREFERENCES_KEY = "finly_user_preferences";
    const GOALS_KEY = "finly_goals";
    const INSTALLMENTS_KEY = "finly_installments";

    const defaultProfile = {
        name: "Henry Gabriel",
        email: "henry@finly.app",
        phone: "",
        occupation: "Estudante e empreendedor",
        income: 1700,
        goalPercent: 30,
        bio: "Quero organizar meu dinheiro, controlar dívidas, criar reserva e investir melhor.",
        accountType: "Conta pessoal",
        plan: "Plano gratuito",
        since: "Desde julho de 2026"
    };

    const defaultPreferences = {
        notifications: true,
        weeklySummary: true,
        privacyMode: false
    };

    const $ = (selector, parent = document) => parent.querySelector(selector);
    const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

    let profile = {};
    let preferences = {};

    const formatCurrency = (value) => {
        return Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    };

    const getInitials = (name) => {
        return name
            .trim()
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase() || "F";
    };

    const readStorage = (key, fallback) => {
        const stored = localStorage.getItem(key);

        if (!stored) return fallback;

        try {
            return {
                ...fallback,
                ...JSON.parse(stored)
            };
        } catch {
            return fallback;
        }
    };

    const readArrayStorage = (key) => {
        const stored = localStorage.getItem(key);

        if (!stored) return [];

        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const saveProfile = () => {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

        const session = {
            name: profile.name,
            email: profile.email,
            initials: getInitials(profile.name)
        };

        localStorage.setItem("finly_session", JSON.stringify(session));
    };

    const savePreferences = () => {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
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

    const createToastContainer = () => {
        let container = $(".toast-container");

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
            <span class="toast__icon" aria-hidden="true">${getToastIcon(type)}</span>

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

        const removeToast = () => {
            toast.classList.add("is-leaving");
            setTimeout(() => toast.remove(), 240);
        };

        $(".toast__close", toast).addEventListener("click", removeToast);
        setTimeout(removeToast, 4200);
    };

    const fillForm = () => {
        $("#profileName").value = profile.name;
        $("#profileEmail").value = profile.email;
        $("#profilePhone").value = profile.phone;
        $("#profileOccupation").value = profile.occupation;
        $("#profileIncome").value = profile.income;
        $("#profileGoalPercent").value = profile.goalPercent;
        $("#profileBio").value = profile.bio;

        $("#profileNotifications").checked = preferences.notifications;
        $("#profileWeeklySummary").checked = preferences.weeklySummary;
        $("#profilePrivacyMode").checked = preferences.privacyMode;
    };

    const updateProfileVisuals = () => {
        const initials = getInitials(profile.name);
        const firstName = profile.name.trim().split(" ")[0] || "Usuário";

        $$(".profile-hero-card__avatar, .profile-avatar-box__avatar, .sidebar-user__avatar, .user-menu__avatar").forEach((avatar) => {
            avatar.textContent = initials;
        });

        $$(".profile-hero-card__name, .sidebar-user__name").forEach((item) => {
            item.textContent = profile.name;
        });

        $$(".profile-hero-card__email, .sidebar-user__email").forEach((item) => {
            item.textContent = profile.email;
        });

        $(".user-menu__name").textContent = firstName;
        $(".user-menu__role").textContent = profile.accountType;

        const pills = $$(".profile-hero-card__footer .profile-pill");
        if (pills[0]) pills[0].textContent = profile.accountType;
        if (pills[1]) pills[1].textContent = profile.plan;
        if (pills[2]) pills[2].textContent = profile.since;
    };

    const updateStats = () => {
        const goals = readArrayStorage(GOALS_KEY);
        const installments = readArrayStorage(INSTALLMENTS_KEY);

        const activeGoals = goals.filter((goal) => Number(goal.current || 0) < Number(goal.target || 0)).length || 2;

        const activeInstallments = installments.filter((item) => {
            return Number(item.paidParts || 0) < Number(item.totalParts || 0);
        }).length || 3;

        const statValues = $$(".profile-stat__value");

        if (statValues[0]) {
            statValues[0].textContent = preferences.privacyMode ? "••••" : formatCurrency(profile.income);
        }

        if (statValues[1]) {
            statValues[1].textContent = `${profile.goalPercent}%`;
        }

        if (statValues[2]) {
            statValues[2].textContent = activeGoals;
        }

        if (statValues[3]) {
            statValues[3].textContent = activeInstallments;
        }

        const recommendedSaving = Number(profile.income || 0) * (Number(profile.goalPercent || 0) / 100);
        const statMetas = $$(".profile-stat__meta");

        if (statMetas[1]) {
            statMetas[1].textContent = preferences.privacyMode
                ? "Meta mensal recomendada"
                : `Aproximadamente ${formatCurrency(recommendedSaving)} por mês`;
        }
    };

    const updatePrivacyMode = () => {
        document.body.classList.toggle("is-privacy-mode", preferences.privacyMode);
        updateStats();
    };

    const validateProfile = () => {
        const name = $("#profileName").value.trim();
        const email = $("#profileEmail").value.trim();
        const income = Number($("#profileIncome").value);
        const goalPercent = Number($("#profileGoalPercent").value);

        if (!name) {
            showToast({
                type: "danger",
                title: "Nome obrigatório",
                message: "Digite seu nome antes de salvar."
            });

            return false;
        }

        if (!email || !email.includes("@")) {
            showToast({
                type: "danger",
                title: "E-mail inválido",
                message: "Digite um e-mail válido para sua conta."
            });

            return false;
        }

        if (income < 0) {
            showToast({
                type: "danger",
                title: "Renda inválida",
                message: "A renda mensal não pode ser negativa."
            });

            return false;
        }

        if (goalPercent <= 0) {
            showToast({
                type: "danger",
                title: "Meta inválida",
                message: "Escolha uma porcentagem válida para guardar."
            });

            return false;
        }

        return true;
    };

    const collectFormData = () => {
        profile = {
            ...profile,
            name: $("#profileName").value.trim(),
            email: $("#profileEmail").value.trim(),
            phone: $("#profilePhone").value.trim(),
            occupation: $("#profileOccupation").value.trim(),
            income: Number($("#profileIncome").value),
            goalPercent: Number($("#profileGoalPercent").value),
            bio: $("#profileBio").value.trim()
        };
    };

    const handleProfileSubmit = (event) => {
        event.preventDefault();

        if (!validateProfile()) return;

        collectFormData();
        saveProfile();
        updateProfileVisuals();
        updateStats();

        showToast({
            type: "success",
            title: "Perfil salvo",
            message: "Suas informações foram atualizadas com sucesso."
        });
    };

    const handleCancel = () => {
        fillForm();

        showToast({
            type: "info",
            title: "Alterações descartadas",
            message: "O formulário voltou para os dados salvos."
        });
    };

    const handlePreferences = () => {
        preferences = {
            notifications: $("#profileNotifications").checked,
            weeklySummary: $("#profileWeeklySummary").checked,
            privacyMode: $("#profilePrivacyMode").checked
        };

        savePreferences();
        updatePrivacyMode();

        showToast({
            type: "success",
            title: "Preferência atualizada",
            message: "Sua configuração foi salva no Finly."
        });
    };

    const maskPhone = (value) => {
        return value
            .replace(/\D/g, "")
            .replace(/^(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{5})(\d)/, "$1-$2")
            .slice(0, 15);
    };

    const filterProfileContent = () => {
        const term = $(".topbar__search input")?.value.trim().toLowerCase() || "";
        const items = $$(".profile-section, .profile-hero-card, .profile-stat, .profile-tip");

        items.forEach((item) => {
            const text = item.textContent.toLowerCase();
            item.style.display = !term || text.includes(term) ? "" : "none";
        });
    };

    const setupButtons = () => {
        const headerButtons = $$(".profile-header__actions .btn");
        const cancelButton = headerButtons.find((button) => button.textContent.trim().toLowerCase().includes("cancelar"));

        cancelButton?.addEventListener("click", handleCancel);

        $$(".profile-avatar-box__actions .btn").forEach((button) => {
            button.addEventListener("click", () => {
                const isRemove = button.textContent.trim().toLowerCase().includes("remover");

                showToast({
                    type: "info",
                    title: isRemove ? "Foto removida" : "Upload em breve",
                    message: isRemove
                        ? "A foto foi substituída pelas iniciais do seu nome."
                        : "Em uma próxima versão você poderá enviar uma foto personalizada."
                });
            });
        });

        $$(".profile-security__item .btn").forEach((button) => {
            button.addEventListener("click", () => {
                showToast({
                    type: "info",
                    title: "Segurança",
                    message: "Essa configuração será liberada na próxima versão do Finly."
                });
            });
        });

        $(".profile-plan .btn")?.addEventListener("click", () => {
            showToast({
                type: "info",
                title: "Finly Premium",
                message: "Plano premium em breve com IA financeira, exportações avançadas e integrações."
            });
        });
    };

    const setupEvents = () => {
        $(".profile-form")?.addEventListener("submit", handleProfileSubmit);

        $$("#profileNotifications, #profileWeeklySummary, #profilePrivacyMode").forEach((input) => {
            input.addEventListener("change", handlePreferences);
        });

        $("#profilePhone")?.addEventListener("input", (event) => {
            event.target.value = maskPhone(event.target.value);
        });

        $(".topbar__search input")?.addEventListener("input", filterProfileContent);

        setupButtons();
    };

    const init = () => {
        if (!$(".profile-page")) return;

        profile = readStorage(PROFILE_KEY, defaultProfile);
        preferences = readStorage(PREFERENCES_KEY, defaultPreferences);

        fillForm();
        updateProfileVisuals();
        updateStats();
        updatePrivacyMode();
        setupEvents();
    };

    document.addEventListener("DOMContentLoaded", init);
})();