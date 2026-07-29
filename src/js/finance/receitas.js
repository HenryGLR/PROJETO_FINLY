(() => {
    const STORAGE_KEY = "incomes";

    const CATEGORY_DATA = {
        salary: {
            label: "Salário",
            icon: "wallet"
        },
        freelance: {
            label: "Freelance",
            icon: "briefcase"
        },
        sales: {
            label: "Vendas",
            icon: "shopping"
        },
        gift: {
            label: "Presente",
            icon: "gift"
        },
        investment: {
            label: "Investimentos",
            icon: "chart"
        },
        other: {
            label: "Outros",
            icon: "plus"
        }
    };

    const DEFAULT_INCOMES = [
        {
            id: "income-salary-default",
            name: "Salário",
            value: 1700,
            date: "2026-07-10",
            category: "salary",
            status: "received",
            description: "Receita mensal principal.",
            createdAt: "2026-07-10T12:00:00.000Z"
        },
        {
            id: "income-freelance-default",
            name: "Site landing page",
            value: 700,
            date: "2026-07-28",
            category: "freelance",
            status: "pending",
            description: "Pagamento previsto de projeto.",
            createdAt: "2026-07-19T12:00:00.000Z"
        }
    ];

    const $ = (selector, parent = document) => {
        return parent.querySelector(selector);
    };

    const $$ = (selector, parent = document) => {
        return [...parent.querySelectorAll(selector)];
    };

    const getFirstElement = (...selectors) => {
        for (const selector of selectors) {
            const element = $(selector);

            if (element) {
                return element;
            }
        }

        return null;
    };

    const form = getFirstElement(
        ".income-form",
        "#incomeForm",
        'form[data-form="income"]'
    );

    const list = getFirstElement(
        ".income-main .income-list",
        ".income-list",
        "[data-income-list]"
    );

    const categoryCards = $$(".income-category");

    const searchInputs = $$(
        ".topbar__search input, .income-filter input, [data-income-search]"
    );

    let incomes = [];
    let editingId = null;

    const getFormElement = (...selectors) => {
        if (!form) return null;

        for (const selector of selectors) {
            const element = $(selector, form);

            if (element) {
                return element;
            }
        }

        return null;
    };

    const fields = {
        name: getFormElement(
            "#incomeName",
            '[name="incomeName"]',
            "#incomeTitle",
            '[name="name"]'
        ),

        value: getFormElement(
            "#incomeValue",
            '[name="incomeValue"]',
            '[name="value"]'
        ),

        date: getFormElement(
            "#incomeDate",
            '[name="incomeDate"]',
            '[name="date"]'
        ),

        description: getFormElement(
            "#incomeDescription",
            '[name="incomeDescription"]',
            '[name="description"]'
        )
    };

    const createId = () => {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }

        return `income-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`;
    };

    const escapeHTML = (value) => {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

    const normalizeText = (value) => {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    };

    const parseValue = (value) => {
        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        const normalized = String(value ?? "")
            .replace(/\s/g, "")
            .replace("R$", "")
            .replace(/\./g, "")
            .replace(",", ".");

        const number = Number(normalized);

        return Number.isFinite(number) ? number : 0;
    };

    const formatCurrency = (value) => {
        return Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    };

    const formatDate = (date) => {
        if (!date) return "Sem data";

        const parsedDate = new Date(`${date}T12:00:00`);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Data inválida";
        }

        return parsedDate.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const getMonthKey = (date) => {
        const parsedDate = date instanceof Date
            ? date
            : new Date(`${date}T12:00:00`);

        if (Number.isNaN(parsedDate.getTime())) {
            return "";
        }

        return [
            parsedDate.getFullYear(),
            String(parsedDate.getMonth() + 1).padStart(2, "0")
        ].join("-");
    };

    const getCurrentMonthKey = () => {
        return getMonthKey(new Date());
    };

    const normalizeStatus = (status) => {
        const value = normalizeText(status);

        if (
            value === "received" ||
            value === "recebido" ||
            value === "paid" ||
            value === "confirmado"
        ) {
            return "received";
        }

        return "pending";
    };

    const normalizeCategory = (category) => {
        return CATEGORY_DATA[category] ? category : "other";
    };

    const normalizeIncome = (income) => {
        return {
            id: income.id || createId(),
            name: String(
                income.name ||
                income.title ||
                income.source ||
                "Receita"
            ).trim(),

            value: parseValue(
                income.value ??
                income.amount ??
                income.total
            ),

            date: income.date || new Date().toISOString().slice(0, 10),
            category: normalizeCategory(income.category),
            status: normalizeStatus(income.status),
            description: String(income.description || "").trim(),
            createdAt: income.createdAt || new Date().toISOString()
        };
    };

    const getStorage = () => {
        if (!window.FinlyStorage) {
            console.error(
                "Finly: storage.js precisa ser carregado antes de receitas.js."
            );

            return null;
        }

        return window.FinlyStorage;
    };

    const saveIncomes = () => {
        const storage = getStorage();

        if (!storage) return false;

        return storage.set(STORAGE_KEY, incomes);
    };

    const loadIncomes = () => {
        const storage = getStorage();

        if (!storage) {
            incomes = [];
            return;
        }

        if (!storage.has(STORAGE_KEY)) {
            incomes = DEFAULT_INCOMES.map(normalizeIncome);
            saveIncomes();
            return;
        }

        const storedIncomes = storage.get(STORAGE_KEY, []);

        if (!Array.isArray(storedIncomes)) {
            incomes = [];
            saveIncomes();
            return;
        }

        incomes = storedIncomes.map(normalizeIncome);
    };

    const getSelectedCategory = () => {
        const checkedInput = getFormElement(
            'input[name="incomeCategory"]:checked',
            'input[name="category"]:checked'
        );

        return normalizeCategory(checkedInput?.value || "salary");
    };

    const getSelectedStatus = () => {
        const checkedInput = getFormElement(
            'input[name="incomeStatus"]:checked',
            'input[name="status"]:checked'
        );

        if (checkedInput) {
            return normalizeStatus(checkedInput.value);
        }

        const select = getFormElement(
            "#incomeStatus",
            'select[name="incomeStatus"]',
            'select[name="status"]'
        );

        return normalizeStatus(select?.value || "received");
    };

    const setSelectedCategory = (category) => {
        const normalizedCategory = normalizeCategory(category);

        const input = getFormElement(
            `input[name="incomeCategory"][value="${normalizedCategory}"]`,
            `input[name="category"][value="${normalizedCategory}"]`
        );

        if (input) {
            input.checked = true;
        }

        updateCategoryCards();
    };

    const setSelectedStatus = (status) => {
        const normalizedStatus = normalizeStatus(status);

        const input = getFormElement(
            `input[name="incomeStatus"][value="${normalizedStatus}"]`,
            `input[name="status"][value="${normalizedStatus}"]`
        );

        if (input) {
            input.checked = true;
        }

        const select = getFormElement(
            "#incomeStatus",
            'select[name="incomeStatus"]',
            'select[name="status"]'
        );

        if (select) {
            select.value = normalizedStatus;
        }
    };

    const updateCategoryCards = () => {
        categoryCards.forEach((card) => {
            const input = $("input", card);

            card.classList.toggle(
                "is-active",
                Boolean(input?.checked)
            );
        });
    };

    const getCategoryIcon = (icon) => {
        const icons = {
            wallet: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 6h15a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6h2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M4 6V5a2 2 0 0 1 2-2h11v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z" stroke="currentColor" stroke-width="2"/>
                </svg>
            `,

            briefcase: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 7h16v12H4V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M9 7V5h6v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M4 12h16" stroke="currentColor" stroke-width="2"/>
                </svg>
            `,

            shopping: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 9h14l-1 11H6L5 9Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M9 9V7a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,

            gift: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 10h16v11H4V10Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M2 6h20v4H2V6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M12 6v15" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6H8.5A2.5 2.5 0 1 1 11 3.5L12 6Zm0 0h3.5A2.5 2.5 0 1 0 13 3.5L12 6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
            `,

            chart: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 19V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M8 17v-5M12 17V8M16 17v-7M20 17V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,

            plus: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
            `
        };

        return icons[icon] || icons.plus;
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

    const showToast = ({
        type = "info",
        title,
        message
    }) => {
        let container = $(".toast-container");

        if (!container) {
            container = document.createElement("div");
            container.className = "toast-container";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = `toast toast--${type}`;

        toast.innerHTML = `
            <span class="toast__icon" aria-hidden="true">
                ${getToastIcon(type)}
            </span>

            <span class="toast__content">
                <strong class="toast__title">
                    ${escapeHTML(title)}
                </strong>

                <span class="toast__message">
                    ${escapeHTML(message)}
                </span>
            </span>

            <button
                class="toast__close"
                type="button"
                aria-label="Fechar aviso"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
                </svg>
            </button>

            <span class="toast__progress"></span>
        `;

        container.appendChild(toast);

        const removeToast = () => {
            toast.classList.add("is-leaving");

            setTimeout(() => {
                toast.remove();
            }, 240);
        };

        $(".toast__close", toast)?.addEventListener(
            "click",
            removeToast
        );

        setTimeout(removeToast, 4200);
    };

    const getIncomeStatus = (income) => {
        if (income.status === "received") {
            return {
                label: "Recebido",
                className: "income-status--success",
                badgeClass: "badge--success"
            };
        }

        return {
            label: "Previsto",
            className: "income-status--warning",
            badgeClass: "badge--warning"
        };
    };

    const renderIncome = (income) => {
        const category = CATEGORY_DATA[income.category] || CATEGORY_DATA.other;
        const status = getIncomeStatus(income);

        const searchableText = normalizeText([
            income.name,
            income.description,
            category.label,
            status.label,
            formatCurrency(income.value)
        ].join(" "));

        return `
            <article
                class="income-item"
                data-income-id="${escapeHTML(income.id)}"
                data-income-search="${escapeHTML(searchableText)}"
            >
                <div class="income-item__main">
                    <span class="income-item__icon">
                        ${getCategoryIcon(category.icon)}
                    </span>

                    <span class="income-item__info">
                        <strong class="income-item__title">
                            ${escapeHTML(income.name)}
                        </strong>

                        <span class="income-item__meta">
                            ${escapeHTML(category.label)}
                            •
                            ${escapeHTML(formatDate(income.date))}
                        </span>

                        ${
                            income.description
                                ? `
                                    <span class="income-item__description">
                                        ${escapeHTML(income.description)}
                                    </span>
                                `
                                : ""
                        }
                    </span>
                </div>

                <div class="income-item__value">
                    <strong class="income-item__amount">
                        ${formatCurrency(income.value)}
                    </strong>

                    <span class="income-status ${status.className}">
                        ${status.label}
                    </span>
                </div>

                <div class="income-item__actions">
                    <button
                        class="btn btn-ghost btn-sm"
                        type="button"
                        data-action="edit"
                    >
                        Editar
                    </button>

                    <button
                        class="btn btn-ghost btn-sm"
                        type="button"
                        data-action="delete"
                    >
                        Excluir
                    </button>
                </div>
            </article>
        `;
    };

    const getSearchTerms = () => {
        return searchInputs
            .map((input) => normalizeText(input.value))
            .filter(Boolean);
    };

    const getFilteredIncomes = () => {
        const terms = getSearchTerms();

        if (!terms.length) {
            return [...incomes];
        }

        return incomes.filter((income) => {
            const category = CATEGORY_DATA[income.category]?.label || "";
            const status = getIncomeStatus(income).label;

            const searchableText = normalizeText([
                income.name,
                income.description,
                category,
                status,
                income.value,
                formatCurrency(income.value),
                income.date
            ].join(" "));

            return terms.every((term) => {
                return searchableText.includes(term);
            });
        });
    };

    const renderIncomes = () => {
        if (!list) return;

        const filteredIncomes = getFilteredIncomes()
            .sort((incomeA, incomeB) => {
                const dateA = new Date(`${incomeA.date}T12:00:00`);
                const dateB = new Date(`${incomeB.date}T12:00:00`);

                return dateB - dateA;
            });

        if (!filteredIncomes.length) {
            list.innerHTML = `
                <div class="empty-card">
                    <span class="empty-card__icon">
                        ${getCategoryIcon("plus")}
                    </span>

                    <h3 class="empty-card__title">
                        Nenhuma receita encontrada
                    </h3>

                    <p class="empty-card__text">
                        Cadastre uma receita ou altere os termos da pesquisa.
                    </p>
                </div>
            `;

            return;
        }

        list.innerHTML = filteredIncomes
            .map(renderIncome)
            .join("");
    };

    const getCurrentMonthIncomes = () => {
        const currentMonth = getCurrentMonthKey();

        const currentItems = incomes.filter((income) => {
            return getMonthKey(income.date) === currentMonth;
        });

        return currentItems.length
            ? currentItems
            : incomes;
    };

    const calculateSummary = () => {
        const monthIncomes = getCurrentMonthIncomes();

        const received = monthIncomes
            .filter((income) => income.status === "received")
            .reduce((sum, income) => sum + income.value, 0);

        const pending = monthIncomes
            .filter((income) => income.status === "pending")
            .reduce((sum, income) => sum + income.value, 0);

        const total = received + pending;

        const average = monthIncomes.length
            ? total / monthIncomes.length
            : 0;

        const sources = new Set(
            monthIncomes.map((income) => income.category)
        ).size;

        return {
            received,
            pending,
            total,
            average,
            sources,
            quantity: monthIncomes.length
        };
    };

    const setText = (selector, value) => {
        const element = $(selector);

        if (element) {
            element.textContent = value;
        }
    };

    const updateHero = (summary) => {
        setText(
            ".income-hero-card__value",
            formatCurrency(summary.received)
        );

        setText(
            ".income-hero__value",
            formatCurrency(summary.received)
        );

        const pills = $$(
            ".income-hero-card__footer .income-pill, .income-hero .income-pill"
        );

        if (pills[0]) {
            pills[0].textContent =
                `${summary.quantity} entradas no período`;
        }

        if (pills[1]) {
            pills[1].textContent =
                `${formatCurrency(summary.pending)} previstos`;
        }

        const heroText = getFirstElement(
            ".income-hero-card__text",
            ".income-hero__text"
        );

        if (heroText) {
            heroText.textContent = summary.pending > 0
                ? `Você já recebeu ${formatCurrency(summary.received)} e ainda possui ${formatCurrency(summary.pending)} previstos.`
                : `Todas as receitas cadastradas para o período já foram recebidas.`;
        }
    };

    const updateKpis = (summary) => {
        const cards = $$(".income-kpi");

        cards.forEach((card, index) => {
            const label = normalizeText(
                $(".income-kpi__label", card)?.textContent ||
                card.textContent
            );

            const valueElement = $(".income-kpi__value", card);

            if (!valueElement) return;

            if (label.includes("recebid")) {
                valueElement.textContent =
                    formatCurrency(summary.received);
                return;
            }

            if (
                label.includes("previst") ||
                label.includes("pendente")
            ) {
                valueElement.textContent =
                    formatCurrency(summary.pending);
                return;
            }

            if (
                label.includes("fonte") ||
                label.includes("categoria")
            ) {
                valueElement.textContent =
                    String(summary.sources);
                return;
            }

            if (label.includes("media")) {
                valueElement.textContent =
                    formatCurrency(summary.average);
                return;
            }

            if (label.includes("total")) {
                valueElement.textContent =
                    formatCurrency(summary.total);
                return;
            }

            const fallbackValues = [
                formatCurrency(summary.received),
                formatCurrency(summary.pending),
                String(summary.sources),
                formatCurrency(summary.average)
            ];

            valueElement.textContent =
                fallbackValues[index] || formatCurrency(summary.total);
        });

        const looseValues = $$(".income-kpi__value");

        if (!cards.length) {
            if (looseValues[0]) {
                looseValues[0].textContent =
                    formatCurrency(summary.received);
            }

            if (looseValues[1]) {
                looseValues[1].textContent =
                    formatCurrency(summary.pending);
            }

            if (looseValues[2]) {
                looseValues[2].textContent =
                    String(summary.sources);
            }
        }
    };

    const updateSidebar = (summary) => {
        const sidebarBadge = getFirstElement(
            '.sidebar__link[href*="receitas"] .sidebar__badge',
            "[data-income-sidebar-badge]"
        );

        if (sidebarBadge) {
            sidebarBadge.textContent = String(summary.quantity);
        }

        const sidebarCardBadge = $(".sidebar-card .badge");

        if (sidebarCardBadge) {
            sidebarCardBadge.textContent =
                `${formatCurrency(summary.received)} recebidos`;
        }
    };

    const updateSources = () => {
        const container = getFirstElement(
            ".income-source-list",
            ".income-sources__list",
            "[data-income-sources]"
        );

        if (!container) return;

        const monthIncomes = getCurrentMonthIncomes();

        const sources = Object.entries(
            monthIncomes.reduce((result, income) => {
                if (!result[income.category]) {
                    result[income.category] = {
                        value: 0,
                        quantity: 0
                    };
                }

                result[income.category].value += income.value;
                result[income.category].quantity += 1;

                return result;
            }, {})
        )
            .map(([category, data]) => ({
                category,
                ...data
            }))
            .sort((sourceA, sourceB) => {
                return sourceB.value - sourceA.value;
            });

        if (!sources.length) {
            container.innerHTML = `
                <p class="empty-card__text">
                    Nenhuma fonte cadastrada.
                </p>
            `;

            return;
        }

        container.innerHTML = sources
            .slice(0, 4)
            .map((source) => {
                const category =
                    CATEGORY_DATA[source.category] ||
                    CATEGORY_DATA.other;

                return `
                    <article class="income-source">
                        <span class="income-source__icon">
                            ${getCategoryIcon(category.icon)}
                        </span>

                        <span class="income-source__info">
                            <strong class="income-source__name">
                                ${escapeHTML(category.label)}
                            </strong>

                            <span class="income-source__meta">
                                ${source.quantity}
                                ${source.quantity === 1 ? "entrada" : "entradas"}
                            </span>
                        </span>

                        <strong class="income-source__value">
                            ${formatCurrency(source.value)}
                        </strong>
                    </article>
                `;
            })
            .join("");
    };

    const updateUpcomingIncomes = () => {
        const container = getFirstElement(
            ".income-next-list",
            ".income-upcoming__list",
            "[data-income-upcoming]"
        );

        if (!container) return;

        const upcoming = incomes
            .filter((income) => income.status === "pending")
            .sort((incomeA, incomeB) => {
                const dateA = new Date(`${incomeA.date}T12:00:00`);
                const dateB = new Date(`${incomeB.date}T12:00:00`);

                return dateA - dateB;
            })
            .slice(0, 4);

        if (!upcoming.length) {
            container.innerHTML = `
                <p class="empty-card__text">
                    Nenhuma receita prevista.
                </p>
            `;

            return;
        }

        container.innerHTML = upcoming
            .map((income) => {
                return `
                    <article class="income-next">
                        <span class="income-next__info">
                            <strong class="income-next__title">
                                ${escapeHTML(income.name)}
                            </strong>

                            <span class="income-next__date">
                                ${escapeHTML(formatDate(income.date))}
                            </span>
                        </span>

                        <strong class="income-next__value">
                            ${formatCurrency(income.value)}
                        </strong>
                    </article>
                `;
            })
            .join("");
    };

    const updateInterface = () => {
        const summary = calculateSummary();

        renderIncomes();
        updateHero(summary);
        updateKpis(summary);
        updateSidebar(summary);
        updateSources();
        updateUpcomingIncomes();
    };

    const validateForm = () => {
        const name = fields.name?.value.trim() || "";
        const value = parseValue(fields.value?.value);
        const date = fields.date?.value || "";

        if (!name) {
            showToast({
                type: "danger",
                title: "Nome obrigatório",
                message: "Digite o nome ou a origem da receita."
            });

            fields.name?.focus();
            return false;
        }

        if (value <= 0) {
            showToast({
                type: "danger",
                title: "Valor inválido",
                message: "Digite um valor de receita maior que zero."
            });

            fields.value?.focus();
            return false;
        }

        if (!date) {
            showToast({
                type: "danger",
                title: "Data obrigatória",
                message: "Informe a data da receita."
            });

            fields.date?.focus();
            return false;
        }

        return true;
    };

    const getFormData = () => {
        const existingIncome = incomes.find((income) => {
            return income.id === editingId;
        });

        return normalizeIncome({
            id: editingId || createId(),
            name: fields.name?.value.trim(),
            value: parseValue(fields.value?.value),
            date: fields.date?.value,
            category: getSelectedCategory(),
            status: getSelectedStatus(),
            description: fields.description?.value.trim() || "",
            createdAt:
                existingIncome?.createdAt ||
                new Date().toISOString()
        });
    };

    const getSubmitButton = () => {
        return getFormElement(
            '[type="submit"]',
            "[data-income-submit]"
        );
    };

    const resetForm = () => {
        if (!form) return;

        form.reset();
        editingId = null;

        setSelectedCategory("salary");
        setSelectedStatus("received");
        setDefaultDate();

        const submitButton = getSubmitButton();

        if (submitButton) {
            submitButton.textContent = "Salvar receita";
        }

        form.classList.remove("is-editing");
    };

    const fillForm = (income) => {
        editingId = income.id;

        if (fields.name) {
            fields.name.value = income.name;
        }

        if (fields.value) {
            fields.value.value = income.value;
        }

        if (fields.date) {
            fields.date.value = income.date;
        }

        if (fields.description) {
            fields.description.value = income.description;
        }

        setSelectedCategory(income.category);
        setSelectedStatus(income.status);

        const submitButton = getSubmitButton();

        if (submitButton) {
            submitButton.textContent = "Salvar alterações";
        }

        form?.classList.add("is-editing");

        form?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        fields.name?.focus();
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!validateForm()) return;

        const wasEditing = Boolean(editingId);
        const incomeData = getFormData();

        if (wasEditing) {
            incomes = incomes.map((income) => {
                return income.id === editingId
                    ? incomeData
                    : income;
            });
        } else {
            incomes = [incomeData, ...incomes];
        }

        const saved = saveIncomes();

        if (!saved) {
            showToast({
                type: "danger",
                title: "Erro ao salvar",
                message: "Não foi possível salvar a receita no navegador."
            });

            return;
        }

        resetForm();
        updateInterface();

        showToast({
            type: "success",
            title: wasEditing
                ? "Receita atualizada"
                : "Receita salva",

            message: wasEditing
                ? "As alterações foram salvas com sucesso."
                : "A nova receita foi adicionada ao seu controle."
        });
    };

    const deleteIncome = (income) => {
        const confirmed = window.confirm(
            `Deseja excluir a receita "${income.name}"?`
        );

        if (!confirmed) return;

        incomes = incomes.filter((item) => {
            return item.id !== income.id;
        });

        const saved = saveIncomes();

        if (!saved) {
            showToast({
                type: "danger",
                title: "Erro ao excluir",
                message: "Não foi possível atualizar os dados."
            });

            return;
        }

        if (editingId === income.id) {
            resetForm();
        }

        updateInterface();

        showToast({
            type: "success",
            title: "Receita excluída",
            message: "A receita foi removida do seu controle."
        });
    };

    const handleListAction = (event) => {
        const button = event.target.closest("[data-action]");

        if (!button) return;

        const item = button.closest("[data-income-id]");

        if (!item) return;

        const income = incomes.find((entry) => {
            return entry.id === item.dataset.incomeId;
        });

        if (!income) return;

        const action = button.dataset.action;

        if (action === "edit") {
            fillForm(income);
        }

        if (action === "delete") {
            deleteIncome(income);
        }
    };

    const setDefaultDate = () => {
        if (!fields.date || fields.date.value) return;

        fields.date.value = new Date()
            .toISOString()
            .slice(0, 10);
    };

    const setupCategoryCards = () => {
        categoryCards.forEach((card) => {
            card.addEventListener("click", () => {
                const input = $("input", card);

                if (!input) return;

                input.checked = true;
                updateCategoryCards();
            });
        });
    };

    const setupFilters = () => {
        searchInputs.forEach((input) => {
            input.addEventListener("input", renderIncomes);
        });

        const filterButton = getFirstElement(
            ".income-filter .btn",
            "[data-action='filter-incomes']"
        );

        filterButton?.addEventListener(
            "click",
            renderIncomes
        );
    };

    const setupCancelEditing = () => {
        const cancelButton = getFirstElement(
            "[data-action='cancel-income-edit']",
            ".income-form__cancel"
        );

        cancelButton?.addEventListener("click", () => {
            resetForm();

            showToast({
                type: "info",
                title: "Edição cancelada",
                message: "O formulário voltou ao estado inicial."
            });
        });
    };

    const init = () => {
        if (!form || !list) {
            console.warn(
                "Finly: formulário ou lista de receitas não encontrados."
            );

            return;
        }

        if (!getStorage()) {
            return;
        }

        loadIncomes();
        setDefaultDate();
        setupCategoryCards();
        setupFilters();
        setupCancelEditing();

        form.addEventListener("submit", handleSubmit);
        list.addEventListener("click", handleListAction);

        updateCategoryCards();
        updateInterface();
    };

    document.addEventListener("DOMContentLoaded", init);
})();