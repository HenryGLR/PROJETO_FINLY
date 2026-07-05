(() => {
    const STORAGE_KEYS = {
        session: "finly_session",
        user: "finly_user_profile",
        theme: "finly_theme"
    };

    const dashboardData = {
        month: {
            bars: [42, 64, 52, 78, 58, 86, 72, 92],
            income: "R$ 1.700",
            expense: "R$ 451,10",
            result: "R$ 1.248,90"
        },
        year: {
            bars: [36, 48, 58, 46, 72, 68, 82, 76],
            income: "R$ 12.480",
            expense: "R$ 6.920",
            result: "R$ 5.560"
        }
    };

    const $ = (selector, parent = document) => parent.querySelector(selector);
    const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

    const getStoredJSON = (key) => {
        try {
            return JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key));
        } catch {
            return null;
        }
    };

    const getInitials = (name = "Usuário") => {
        return name
            .trim()
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase();
    };

    const getFirstName = (name = "Usuário") => {
        return name.trim().split(" ")[0] || "Usuário";
    };

    const setText = (selector, value) => {
        const element = $(selector);

        if (element && value) {
            element.textContent = value;
        }
    };

    const setAllText = (selector, value) => {
        $$(selector).forEach((element) => {
            element.textContent = value;
        });
    };

    const applyTheme = () => {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || "light";
        document.documentElement.setAttribute("data-theme", savedTheme);
    };

    const loadUser = () => {
        const user = getStoredJSON(STORAGE_KEYS.user);
        const session = getStoredJSON(STORAGE_KEYS.session);

        const name = user?.name || session?.name || "Henry Gabriel";
        const email = user?.email || session?.email || "henry@finly.app";
        const firstName = getFirstName(name);
        const initials = getInitials(name);

        setText(".dashboard-header__title", `Olá, ${firstName}. Vamos organizar sua grana hoje?`);

        setAllText(".sidebar-user__avatar", initials);
        setAllText(".user-menu__avatar", initials);

        setText(".sidebar-user__name", name);
        setText(".sidebar-user__email", email);
        setText(".user-menu__name", firstName);
    };

    const setupSidebar = () => {
        const toggle = $(".sidebar-toggle");
        const sidebar = $(".sidebar");
        const overlay = $(".sidebar-overlay");

        if (!toggle || !sidebar || !overlay) return;

        const openSidebar = () => {
            sidebar.classList.add("is-open");
            overlay.classList.add("is-open");
            document.body.classList.add("has-modal");
        };

        const closeSidebar = () => {
            sidebar.classList.remove("is-open");
            overlay.classList.remove("is-open");
            document.body.classList.remove("has-modal");
        };

        toggle.addEventListener("click", () => {
            sidebar.classList.contains("is-open") ? closeSidebar() : openSidebar();
        });

        overlay.addEventListener("click", closeSidebar);

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeSidebar();
            }
        });

        $$(".sidebar__link").forEach((link) => {
            link.addEventListener("click", () => {
                if (window.innerWidth <= 1024) {
                    closeSidebar();
                }
            });
        });
    };

    const setupActiveNavigation = () => {
        const currentPage = window.location.pathname.split("/").pop();

        $$(".sidebar__link").forEach((link) => {
            const linkPage = link.getAttribute("href")?.split("/").pop();
            link.classList.toggle("is-active", linkPage === currentPage);
        });
    };

    const setupSearch = () => {
        const searchInput = $(".topbar__search input");
        const transactions = $$(".transaction-card");

        if (!searchInput || !transactions.length) return;

        searchInput.addEventListener("input", () => {
            const term = searchInput.value.trim().toLowerCase();

            transactions.forEach((transaction) => {
                const text = transaction.textContent.toLowerCase();
                transaction.style.display = text.includes(term) ? "" : "none";
            });
        });
    };

    const setupChartTabs = () => {
        const tabs = $$(".chart-tabs__button");
        const bars = $$(".chart-canvas .auth-preview__bar");
        const summaryValues = $$(".chart-summary__value");

        if (!tabs.length || !bars.length || summaryValues.length < 3) return;

        const updateChart = (period) => {
            const data = dashboardData[period];

            bars.forEach((bar, index) => {
                const value = data.bars[index] || 40;
                bar.style.setProperty("--bar-height", `${value}%`);
            });

            summaryValues[0].textContent = data.income;
            summaryValues[1].textContent = data.expense;
            summaryValues[2].textContent = data.result;
        };

        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                tabs.forEach((button) => button.classList.remove("is-active"));
                tab.classList.add("is-active");

                const period = tab.textContent.trim().toLowerCase() === "ano" ? "year" : "month";
                updateChart(period);
            });
        });
    };

    const createToastContainer = () => {
        let container = $(".toast-container");

        if (!container) {
            container = document.createElement("div");
            container.className = "toast-container";
            document.body.appendChild(container);
        }

        return container;
    };

    const getToastIcon = (type) => {
        const icons = {
            success: `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
                </svg>
            </button>

            <span class="toast__progress"></span>
        `;

        container.appendChild(toast);

        const removeToast = () => {
            toast.classList.add("is-leaving");
            setTimeout(() => toast.remove(), 240);
        };

        $(".toast__close", toast)?.addEventListener("click", removeToast);
        setTimeout(removeToast, 4200);
    };

    const setupNotifications = () => {
        const notificationButtons = $$("[aria-label='Notificações']");

        notificationButtons.forEach((button) => {
            button.addEventListener("click", () => {
                showToast({
                    type: "info",
                    title: "Tudo certo por aqui",
                    message: "Nenhuma notificação importante no momento."
                });
            });
        });
    };

    const setupComingSoon = () => {
        $$(".sidebar__link[href='#']").forEach((link) => {
            link.addEventListener("click", (event) => {
                event.preventDefault();

                showToast({
                    type: "warning",
                    title: "Recurso em breve",
                    message: "Essa área já está planejada para as próximas versões do Finly."
                });
            });
        });
    };

    const setupUserMenu = () => {
        const userMenu = $(".user-menu");

        if (!userMenu) return;

        userMenu.addEventListener("click", () => {
            showToast({
                type: "info",
                title: "Perfil",
                message: "A tela de perfil será conectada nas próximas etapas."
            });
        });
    };

    const setupRevealAnimations = () => {
        const elements = $$(".card, .quick-action, .chart-card, .transaction-card");

        elements.forEach((element, index) => {
            element.classList.add("animate-slide-up");
            element.style.animationDelay = `${Math.min(index * 45, 360)}ms`;
        });
    };

    const initDashboard = () => {
        applyTheme();
        loadUser();
        setupSidebar();
        setupActiveNavigation();
        setupSearch();
        setupChartTabs();
        setupNotifications();
        setupComingSoon();
        setupUserMenu();
        setupRevealAnimations();
    };

    document.addEventListener("DOMContentLoaded", initDashboard);
})();