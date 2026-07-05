(() => {
    const SETTINGS_KEY = "finly_settings";
    const THEME_KEY = "finly_theme";
    const PREFERENCES_KEY = "finly_user_preferences";

    const DATA_KEYS = [
        "finly_incomes",
        "finly_expenses",
        "finly_installments",
        "finly_goals",
        "finly_user_profile",
        "finly_user_preferences",
        "finly_settings",
        "finly_session",
        "finly_theme"
    ];

    const FINANCE_KEYS = [
        "finly_incomes",
        "finly_expenses",
        "finly_installments",
        "finly_goals"
    ];

    const defaultSettings = {
        currency: "BRL",
        monthStart: "1",
        language: "pt-BR",
        dateFormat: "dd/mm/yyyy",
        theme: "light",
        color: "blue",
        notifyDueDates: true,
        notifyWeekly: true,
        notifyLimit: true,
        monthlyExpenseLimit: 1300,
        recommendedSavePercent: "30",
        debtStrategy: "higher-interest",
        investmentProfile: "conservative",
        twoFactor: false,
        privacyMode: false
    };

    const colorPalettes = {
        blue: {
            primary: "#0f3d5e",
            dark: "#092f49",
            soft: "rgba(15, 61, 94, 0.1)",
            gradient: "linear-gradient(135deg, #0f3d5e, #0e7490)",
            shadow: "0 24px 60px rgba(15, 61, 94, 0.22)"
        },
        green: {
            primary: "#0f766e",
            dark: "#115e59",
            soft: "rgba(15, 118, 110, 0.11)",
            gradient: "linear-gradient(135deg, #0f766e, #15803d)",
            shadow: "0 24px 60px rgba(15, 118, 110, 0.2)"
        },
        purple: {
            primary: "#4c1d95",
            dark: "#3b0764",
            soft: "rgba(76, 29, 149, 0.1)",
            gradient: "linear-gradient(135deg, #4c1d95, #312e81)",
            shadow: "0 24px 60px rgba(76, 29, 149, 0.18)"
        },
        orange: {
            primary: "#92400e",
            dark: "#78350f",
            soft: "rgba(146, 64, 14, 0.11)",
            gradient: "linear-gradient(135deg, #92400e, #b45309)",
            shadow: "0 24px 60px rgba(146, 64, 14, 0.18)"
        },
        red: {
            primary: "#7f1d1d",
            dark: "#450a0a",
            soft: "rgba(127, 29, 29, 0.1)",
            gradient: "linear-gradient(135deg, #7f1d1d, #991b1b)",
            shadow: "0 24px 60px rgba(127, 29, 29, 0.18)"
        },
        slate: {
            primary: "#0f172a",
            dark: "#020617",
            soft: "rgba(15, 23, 42, 0.1)",
            gradient: "linear-gradient(135deg, #0f172a, #1e293b)",
            shadow: "0 24px 60px rgba(15, 23, 42, 0.2)"
        }
    };

    const $ = (selector, parent = document) => parent.querySelector(selector);
    const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

    let settings = {};

    const readJSON = (key, fallback = {}) => {
        const stored = localStorage.getItem(key);

        if (!stored) return fallback;

        try {
            return JSON.parse(stored);
        } catch {
            return fallback;
        }
    };

    const readSettings = () => {
        return {
            ...defaultSettings,
            ...readJSON(SETTINGS_KEY, {})
        };
    };

    const getResolvedTheme = () => {
        if (settings.theme !== "auto") {
            return settings.theme;
        }

        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return prefersDark ? "dark" : "light";
    };

    const saveSettings = () => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        localStorage.setItem(THEME_KEY, getResolvedTheme());

        const oldPreferences = readJSON(PREFERENCES_KEY, {});

        localStorage.setItem(PREFERENCES_KEY, JSON.stringify({
            ...oldPreferences,
            notifications: settings.notifyDueDates,
            weeklySummary: settings.notifyWeekly,
            privacyMode: settings.privacyMode
        }));
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

    const setValue = (selector, value) => {
        const element = $(selector);
        if (element) element.value = value;
    };

    const setChecked = (selector, value) => {
        const element = $(selector);
        if (element) element.checked = Boolean(value);
    };

    const updateActiveCards = () => {
        $$(".settings-theme").forEach((card) => {
            const input = $("input", card);
            card.classList.toggle("is-active", Boolean(input?.checked));
        });

        $$(".settings-color").forEach((card) => {
            const input = $("input", card);
            card.classList.toggle("is-active", Boolean(input?.checked));
        });
    };

    const fillSettings = () => {
        setValue("#settingsCurrency", settings.currency);
        setValue("#settingsMonthStart", settings.monthStart);
        setValue("#settingsLanguage", settings.language);
        setValue("#settingsDateFormat", settings.dateFormat);

        setValue("#monthlyExpenseLimit", settings.monthlyExpenseLimit);
        setValue("#recommendedSavePercent", settings.recommendedSavePercent);
        setValue("#debtStrategy", settings.debtStrategy);
        setValue("#investmentProfile", settings.investmentProfile);

        setChecked("#notifyDueDates", settings.notifyDueDates);
        setChecked("#notifyWeekly", settings.notifyWeekly);
        setChecked("#notifyLimit", settings.notifyLimit);
        setChecked("#twoFactor", settings.twoFactor);
        setChecked("#privacyMode", settings.privacyMode);

        const themeInput = $(`input[name="settingsTheme"][value="${settings.theme}"]`);
        const colorInput = $(`input[name="settingsColor"][value="${settings.color}"]`);

        if (themeInput) themeInput.checked = true;
        if (colorInput) colorInput.checked = true;

        updateActiveCards();
    };

    const collectSettings = () => {
        settings = {
            ...settings,
            currency: $("#settingsCurrency")?.value || defaultSettings.currency,
            monthStart: $("#settingsMonthStart")?.value || defaultSettings.monthStart,
            language: $("#settingsLanguage")?.value || defaultSettings.language,
            dateFormat: $("#settingsDateFormat")?.value || defaultSettings.dateFormat,
            theme: $("input[name='settingsTheme']:checked")?.value || defaultSettings.theme,
            color: $("input[name='settingsColor']:checked")?.value || defaultSettings.color,
            notifyDueDates: Boolean($("#notifyDueDates")?.checked),
            notifyWeekly: Boolean($("#notifyWeekly")?.checked),
            notifyLimit: Boolean($("#notifyLimit")?.checked),
            monthlyExpenseLimit: Number($("#monthlyExpenseLimit")?.value || 0),
            recommendedSavePercent: $("#recommendedSavePercent")?.value || defaultSettings.recommendedSavePercent,
            debtStrategy: $("#debtStrategy")?.value || defaultSettings.debtStrategy,
            investmentProfile: $("#investmentProfile")?.value || defaultSettings.investmentProfile,
            twoFactor: Boolean($("#twoFactor")?.checked),
            privacyMode: Boolean($("#privacyMode")?.checked)
        };
    };

    const applyTheme = () => {
        const resolvedTheme = getResolvedTheme();

        document.documentElement.setAttribute("data-theme", resolvedTheme);
        document.body.classList.toggle("is-privacy-mode", settings.privacyMode);
        localStorage.setItem(THEME_KEY, resolvedTheme);
    };

    const applyColor = () => {
        const palette = colorPalettes[settings.color] || colorPalettes.blue;
        const root = document.documentElement;

        root.style.setProperty("--color-primary", palette.primary);
        root.style.setProperty("--color-primary-dark", palette.dark);
        root.style.setProperty("--color-primary-soft", palette.soft);
        root.style.setProperty("--gradient-primary", palette.gradient);
        root.style.setProperty("--shadow-primary", palette.shadow);
    };

    const applySettings = () => {
        applyTheme();
        applyColor();
        updateActiveCards();
    };

    const validateSettings = () => {
        if (Number(settings.monthlyExpenseLimit) < 0) {
            showToast({
                type: "danger",
                title: "Limite inválido",
                message: "O limite mensal de gastos não pode ser negativo."
            });

            return false;
        }

        return true;
    };

    const handleSaveSettings = () => {
        collectSettings();

        if (!validateSettings()) return;

        saveSettings();
        applySettings();

        showToast({
            type: "success",
            title: "Configurações salvas",
            message: "Suas preferências foram atualizadas com sucesso."
        });
    };

    const handleResetSettings = () => {
        const confirmReset = confirm("Tem certeza que deseja restaurar as configurações padrão?");

        if (!confirmReset) return;

        settings = { ...defaultSettings };

        fillSettings();
        saveSettings();
        applySettings();

        showToast({
            type: "success",
            title: "Padrão restaurado",
            message: "As configurações voltaram para o padrão profissional do Finly."
        });
    };

    const exportData = () => {
        collectSettings();
        saveSettings();

        const data = {
            exportedAt: new Date().toISOString(),
            app: "Finly",
            version: "1.0",
            data: {}
        };

        DATA_KEYS.forEach((key) => {
            data.data[key] = localStorage.getItem(key);
        });

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `finly-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        showToast({
            type: "success",
            title: "Backup exportado",
            message: "O arquivo com seus dados foi gerado com sucesso."
        });
    };

    const importData = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";

        input.addEventListener("change", () => {
            const file = input.files[0];

            if (!file) return;

            const reader = new FileReader();

            reader.addEventListener("load", () => {
                try {
                    const backup = JSON.parse(reader.result);

                    if (!backup.data || typeof backup.data !== "object") {
                        throw new Error("Backup inválido");
                    }

                    Object.entries(backup.data).forEach(([key, value]) => {
                        if (DATA_KEYS.includes(key) && value !== null) {
                            localStorage.setItem(key, value);
                        }
                    });

                    settings = readSettings();

                    fillSettings();
                    applySettings();

                    showToast({
                        type: "success",
                        title: "Backup importado",
                        message: "Os dados foram restaurados no navegador."
                    });
                } catch {
                    showToast({
                        type: "danger",
                        title: "Erro ao importar",
                        message: "O arquivo selecionado não parece ser um backup válido do Finly."
                    });
                }
            });

            reader.readAsText(file);
        });

        input.click();
    };

    const clearTransactions = () => {
        const confirmClear = confirm("Tem certeza que deseja apagar receitas, despesas, parcelamentos e metas?");

        if (!confirmClear) return;

        FINANCE_KEYS.forEach((key) => localStorage.removeItem(key));

        showToast({
            type: "success",
            title: "Movimentações apagadas",
            message: "Receitas, despesas, parcelas e metas foram removidas."
        });
    };

    const clearAll = () => {
        const confirmClear = confirm("Isso vai apagar todos os dados do Finly neste navegador. Deseja continuar?");

        if (!confirmClear) return;

        DATA_KEYS.forEach((key) => localStorage.removeItem(key));

        settings = { ...defaultSettings };

        fillSettings();
        saveSettings();
        applySettings();

        showToast({
            type: "success",
            title: "Tudo apagado",
            message: "Todos os dados locais do Finly foram removidos."
        });
    };

    const setupMenu = () => {
        const links = $$(".settings-menu__link");

        links.forEach((link) => {
            link.addEventListener("click", () => {
                links.forEach((item) => item.classList.remove("is-active"));
                link.classList.add("is-active");
            });
        });

        const sections = links
            .map((link) => $(link.getAttribute("href")))
            .filter(Boolean);

        if (!sections.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                const activeLink = $(`.settings-menu__link[href="#${entry.target.id}"]`);

                if (!activeLink) return;

                links.forEach((link) => link.classList.remove("is-active"));
                activeLink.classList.add("is-active");
            });
        }, {
            rootMargin: "-30% 0px -60% 0px"
        });

        sections.forEach((section) => observer.observe(section));
    };

    const setupSearch = () => {
        $(".topbar__search input")?.addEventListener("input", (event) => {
            const term = event.target.value.trim().toLowerCase();
            const sections = $$(".settings-main > section");

            sections.forEach((section) => {
                const text = section.textContent.toLowerCase();
                section.style.display = !term || text.includes(term) ? "" : "none";
            });
        });
    };

    const setupThemeAndColor = () => {
        $$("input[name='settingsTheme']").forEach((input) => {
            input.addEventListener("change", () => {
                collectSettings();
                saveSettings();
                applySettings();

                showToast({
                    type: "success",
                    title: "Tema atualizado",
                    message: "A aparência do Finly foi alterada."
                });
            });
        });

        $$("input[name='settingsColor']").forEach((input) => {
            input.addEventListener("change", () => {
                collectSettings();
                saveSettings();
                applySettings();

                showToast({
                    type: "success",
                    title: "Cor atualizada",
                    message: "A cor principal do Finly foi alterada."
                });
            });
        });

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const handleSystemThemeChange = () => {
            if (settings.theme === "auto") {
                applyTheme();
                saveSettings();
            }
        };

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener("change", handleSystemThemeChange);
        } else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleSystemThemeChange);
        }
    };

    const setupSwitches = () => {
        $$("input[type='checkbox']").forEach((input) => {
            input.addEventListener("change", () => {
                collectSettings();
                saveSettings();
                applySettings();

                showToast({
                    type: "success",
                    title: "Preferência salva",
                    message: "A configuração foi atualizada."
                });
            });
        });
    };

    const setupForms = () => {
        $$(".settings-form input, .settings-form select").forEach((field) => {
            field.addEventListener("change", () => {
                collectSettings();

                if (!validateSettings()) return;

                saveSettings();
                applySettings();
            });
        });
    };

    const setupActions = () => {
        $("[data-action='save-settings']")?.addEventListener("click", handleSaveSettings);
        $("[data-action='reset-settings']")?.addEventListener("click", handleResetSettings);
        $("[data-action='export-data']")?.addEventListener("click", exportData);
        $("[data-action='import-data']")?.addEventListener("click", importData);
        $("[data-action='clear-transactions']")?.addEventListener("click", clearTransactions);
        $("[data-action='clear-all']")?.addEventListener("click", clearAll);

        $("[data-action='change-password']")?.addEventListener("click", () => {
            showToast({
                type: "info",
                title: "Senha",
                message: "Alteração de senha será liberada quando o sistema tiver autenticação real."
            });
        });
    };

    const init = () => {
        if (!$(".settings-page")) return;

        settings = readSettings();

        fillSettings();
        saveSettings();
        applySettings();

        setupMenu();
        setupSearch();
        setupThemeAndColor();
        setupSwitches();
        setupForms();
        setupActions();
    };

    document.addEventListener("DOMContentLoaded", init);
})();