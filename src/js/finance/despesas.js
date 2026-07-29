(() => {
    const STORAGE_KEY = "expenses";
    const SETTINGS_KEY = "settings";

    const CATEGORY_DATA = {
        food: {
            label: "Alimentação",
            icon: "food"
        },
        transport: {
            label: "Transporte",
            icon: "transport"
        },
        health: {
            label: "Saúde e esporte",
            icon: "health"
        },
        home: {
            label: "Casa",
            icon: "home"
        },
        card: {
            label: "Cartão",
            icon: "card"
        },
        other: {
            label: "Outros",
            icon: "plus"
        }
    };

    const TYPE_DATA = {
        variable: {
            label: "Variável"
        },
        fixed: {
            label: "Fixa"
        },
        installment: {
            label: "Parcelamento"
        },
        subscription: {
            label: "Assinatura"
        }
    };

    const DEFAULT_EXPENSES = [
        {
            id: "expense-gym-default",
            name: "Academia",
            value: 170,
            date: "2026-07-20",
            category: "health",
            type: "fixed",
            status: "paid",
            description: "Mensalidade da academia.",
            createdAt: "2026-07-20T12:00:00.000Z"
        },
        {
            id: "expense-footvolley-default",
            name: "Futevôlei",
            value: 320,
            date: "2026-07-05",
            category: "health",
            type: "fixed",
            status: "paid",
            description: "Mensalidade do treino de futevôlei.",
            createdAt: "2026-07-05T12:00:00.000Z"
        },
        {
            id: "expense-spotify-default",
            name: "Spotify",
            value: 12.9,
            date: "2026-07-14",
            category: "other",
            type: "subscription",
            status: "paid",
            description: "Assinatura mensal.",
            createdAt: "2026-07-14T12:00:00.000Z"
        },
        {
            id: "expense-nubank-default",
            name: "Parcela Nubank",
            value: 385.87,
            date: "2026-07-24",
            category: "card",
            type: "installment",
            status: "pending",
            description: "Parcela mensal do cartão.",
            createdAt: "2026-07-24T12:00:00.000Z"
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
        ".expense-form",
        "#expenseForm",
        'form[data-form="expense"]'
    );

    const list = getFirstElement(
        ".expense-main .expense-list",
        ".expense-list",
        "[data-expense-list]"
    );

    const categoryCards = $$(".expense-category");
    const typeCards = $$(".expense-type");

    const searchInputs = $$(
        ".topbar__search input, .expense-filter input, [data-expense-search]"
    );

    let expenses = [];
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
            "#expenseName",
            '[name="expenseName"]',
            "#expenseTitle",
            '[name="name"]'
        ),

        value: getFormElement(
            "#expenseValue",
            '[name="expenseValue"]',
            '[name="value"]'
        ),

        date: getFormElement(
            "#expenseDate",
            '[name="expenseDate"]',
            '[name="date"]'
        ),

        description: getFormElement(
            "#expenseDescription",
            '[name="expenseDescription"]',
            '[name="description"]'
        )
    };

    const createId = () => {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }

        return `expense-${Date.now()}-${Math.random()
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

        const parsedValue = Number(normalized);

        return Number.isFinite(parsedValue) ? parsedValue : 0;
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

    const normalizeCategory = (category) => {
        return CATEGORY_DATA[category] ? category : "other";
    };

    const normalizeType = (type) => {
        return TYPE_DATA[type] ? type : "variable";
    };

    const normalizeStatus = (status) => {
        const normalizedStatus = normalizeText(status);

        if (
            normalizedStatus === "paid" ||
            normalizedStatus === "pago" ||
            normalizedStatus === "paga" ||
            normalizedStatus === "quitado"
        ) {
            return "paid";
        }

        return "pending";
    };

    const normalizeExpense = (expense) => {
        return {
            id: expense.id || createId(),

            name: String(
                expense.name ||
                expense.title ||
                expense.description ||
                "Despesa"
            ).trim(),

            value: parseValue(
                expense.value ??
                expense.amount ??
                expense.total
            ),

            date: expense.date || new Date().toISOString().slice(0, 10),
            category: normalizeCategory(expense.category),
            type: normalizeType(expense.type),
            status: normalizeStatus(expense.status),
            description: String(expense.description || "").trim(),
            createdAt: expense.createdAt || new Date().toISOString()
        };
    };

    const getStorage = () => {
        if (!window.FinlyStorage) {
            console.error(
                "Finly: storage.js precisa ser carregado antes de despesas.js."
            );

            return null;
        }

        return window.FinlyStorage;
    };

    const saveExpenses = () => {
        const storage = getStorage();

        if (!storage) return false;

        return storage.set(STORAGE_KEY, expenses);
    };

    const loadExpenses = () => {
        const storage = getStorage();

        if (!storage) {
            expenses = [];
            return;
        }

        if (!storage.has(STORAGE_KEY)) {
            expenses = DEFAULT_EXPENSES.map(normalizeExpense);
            saveExpenses();
            return;
        }

        const storedExpenses = storage.get(STORAGE_KEY, []);

        if (!Array.isArray(storedExpenses)) {
            expenses = [];
            saveExpenses();
            return;
        }

        expenses = storedExpenses.map(normalizeExpense);
    };

    const getMonthlyLimit = () => {
        const storage = getStorage();

        if (!storage) return 1300;

        const settings = storage.get(SETTINGS_KEY, {});
        const limit = Number(settings?.monthlyExpenseLimit);

        return Number.isFinite(limit) && limit > 0
            ? limit
            : 1300;
    };

    const getSelectedCategory = () => {
        const checkedInput = getFormElement(
            'input[name="expenseCategory"]:checked',
            'input[name="category"]:checked'
        );

        return normalizeCategory(checkedInput?.value || "food");
    };

    const getSelectedType = () => {
        const checkedInput = getFormElement(
            'input[name="expenseType"]:checked',
            'input[name="type"]:checked'
        );

        if (checkedInput) {
            return normalizeType(checkedInput.value);
        }

        const select = getFormElement(
            "#expenseType",
            'select[name="expenseType"]',
            'select[name="type"]'
        );

        return normalizeType(select?.value || "variable");
    };

    const getSelectedStatus = () => {
        const checkedInput = getFormElement(
            'input[name="expenseStatus"]:checked',
            'input[name="status"]:checked'
        );

        if (checkedInput) {
            return normalizeStatus(checkedInput.value);
        }

        const select = getFormElement(
            "#expenseStatus",
            'select[name="expenseStatus"]',
            'select[name="status"]'
        );

        return normalizeStatus(select?.value || "paid");
    };

    const setSelectedCategory = (category) => {
        const normalizedCategory = normalizeCategory(category);

        const input = getFormElement(
            `input[name="expenseCategory"][value="${normalizedCategory}"]`,
            `input[name="category"][value="${normalizedCategory}"]`
        );

        if (input) {
            input.checked = true;
        }

        updateCategoryCards();
    };

    const setSelectedType = (type) => {
        const normalizedType = normalizeType(type);

        const input = getFormElement(
            `input[name="expenseType"][value="${normalizedType}"]`,
            `input[name="type"][value="${normalizedType}"]`
        );

        if (input) {
            input.checked = true;
        }

        const select = getFormElement(
            "#expenseType",
            'select[name="expenseType"]',
            'select[name="type"]'
        );

        if (select) {
            select.value = normalizedType;
        }

        updateTypeCards();
    };

    const setSelectedStatus = (status) => {
        const normalizedStatus = normalizeStatus(status);

        const input = getFormElement(
            `input[name="expenseStatus"][value="${normalizedStatus}"]`,
            `input[name="status"][value="${normalizedStatus}"]`
        );

        if (input) {
            input.checked = true;
        }

        const select = getFormElement(
            "#expenseStatus",
            'select[name="expenseStatus"]',
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

    const updateTypeCards = () => {
        typeCards.forEach((card) => {
            const input = $("input", card);

            card.classList.toggle(
                "is-active",
                Boolean(input?.checked)
            );
        });
    };

    const getCategoryIcon = (icon) => {
        const icons = {
            food: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 3v7M4 3v4a3 3 0 0 0 6 0V3M7 10v11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M16 3v18M16 3c3 1 4 4 4 7h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `,

            transport: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 16h14l-1-7H6l-1 7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="m7 9 2-4h6l2 4" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M7 16v3M17 16v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M8 13h.01M16 13h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                </svg>
            `,

            health: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 21s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.2-8 11-8 11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M8 12h2l1-2 2 4 1-2h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `,

            home: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="m3 11 9-8 9 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M5 10v10h14V10M9 20v-6h6v6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
            `,

            card: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 6h18v12H3V6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M3 10h18M7 15h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
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

    const getExpenseStatus = (expense) => {
        if (expense.status === "paid") {
            return {
                label: "Pago",
                className: "expense-status--success"
            };
        }

        return {
            label: "Pendente",
            className: "expense-status--warning"
        };
    };

    const renderExpense = (expense) => {
        const category =
            CATEGORY_DATA[expense.category] ||
            CATEGORY_DATA.other;

        const type =
            TYPE_DATA[expense.type] ||
            TYPE_DATA.variable;

        const status = getExpenseStatus(expense);

        const searchableText = normalizeText([
            expense.name,
            expense.description,
            category.label,
            type.label,
            status.label,
            formatCurrency(expense.value)
        ].join(" "));

        return `
            <article
                class="expense-item"
                data-expense-id="${escapeHTML(expense.id)}"
                data-expense-search="${escapeHTML(searchableText)}"
            >
                <div class="expense-item__main">
                    <span class="expense-item__icon">
                        ${getCategoryIcon(category.icon)}
                    </span>

                    <span class="expense-item__info">
                        <strong class="expense-item__title">
                            ${escapeHTML(expense.name)}
                        </strong>

                        <span class="expense-item__meta">
                            ${escapeHTML(category.label)}
                            •
                            ${escapeHTML(type.label)}
                            •
                            ${escapeHTML(formatDate(expense.date))}
                        </span>

                        ${
                            expense.description
                                ? `
                                    <span class="expense-item__description">
                                        ${escapeHTML(expense.description)}
                                    </span>
                                `
                                : ""
                        }
                    </span>
                </div>

                <div class="expense-item__value">
                    <strong class="expense-item__amount">
                        ${formatCurrency(expense.value)}
                    </strong>

                    <span class="expense-status ${status.className}">
                        ${status.label}
                    </span>
                </div>

                <div class="expense-item__actions">
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

    const getFilteredExpenses = () => {
        const terms = getSearchTerms();

        if (!terms.length) {
            return [...expenses];
        }

        return expenses.filter((expense) => {
            const category =
                CATEGORY_DATA[expense.category]?.label || "";

            const type =
                TYPE_DATA[expense.type]?.label || "";

            const status =
                getExpenseStatus(expense).label;

            const searchableText = normalizeText([
                expense.name,
                expense.description,
                category,
                type,
                status,
                expense.value,
                formatCurrency(expense.value),
                expense.date
            ].join(" "));

            return terms.every((term) => {
                return searchableText.includes(term);
            });
        });
    };

    const renderExpenses = () => {
        if (!list) return;

        const filteredExpenses = getFilteredExpenses()
            .sort((expenseA, expenseB) => {
                const dateA = new Date(`${expenseA.date}T12:00:00`);
                const dateB = new Date(`${expenseB.date}T12:00:00`);

                return dateB - dateA;
            });

        if (!filteredExpenses.length) {
            list.innerHTML = `
                <div class="empty-card">
                    <span class="empty-card__icon">
                        ${getCategoryIcon("plus")}
                    </span>

                    <h3 class="empty-card__title">
                        Nenhuma despesa encontrada
                    </h3>

                    <p class="empty-card__text">
                        Cadastre uma despesa ou altere os termos da pesquisa.
                    </p>
                </div>
            `;

            return;
        }

        list.innerHTML = filteredExpenses
            .map(renderExpense)
            .join("");
    };

    const getCurrentMonthExpenses = () => {
        const currentMonth = getCurrentMonthKey();

        const currentItems = expenses.filter((expense) => {
            return getMonthKey(expense.date) === currentMonth;
        });

        return currentItems.length
            ? currentItems
            : expenses;
    };

    const calculateSummary = () => {
        const monthExpenses = getCurrentMonthExpenses();

        const paid = monthExpenses
            .filter((expense) => expense.status === "paid")
            .reduce((sum, expense) => sum + expense.value, 0);

        const pending = monthExpenses
            .filter((expense) => expense.status === "pending")
            .reduce((sum, expense) => sum + expense.value, 0);

        const fixed = monthExpenses
            .filter((expense) => {
                return (
                    expense.type === "fixed" ||
                    expense.type === "subscription" ||
                    expense.type === "installment"
                );
            })
            .reduce((sum, expense) => sum + expense.value, 0);

        const variable = monthExpenses
            .filter((expense) => expense.type === "variable")
            .reduce((sum, expense) => sum + expense.value, 0);

        const total = paid + pending;
        const limit = getMonthlyLimit();

        const limitPercent = limit > 0
            ? Math.min((total / limit) * 100, 100)
            : 0;

        return {
            paid,
            pending,
            fixed,
            variable,
            total,
            limit,
            limitPercent,
            remainingLimit: Math.max(limit - total, 0),
            quantity: monthExpenses.length
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
            ".expense-hero-card__value",
            formatCurrency(summary.total)
        );

        setText(
            ".expense-hero__value",
            formatCurrency(summary.total)
        );

        const pills = $$(
            ".expense-hero-card__footer .expense-pill, .expense-hero .expense-pill"
        );

        if (pills[0]) {
            pills[0].textContent =
                `${formatCurrency(summary.paid)} pagos`;
        }

        if (pills[1]) {
            pills[1].textContent =
                `${formatCurrency(summary.pending)} pendentes`;
        }

        const heroText = getFirstElement(
            ".expense-hero-card__text",
            ".expense-hero__text"
        );

        if (heroText) {
            heroText.textContent = summary.total <= summary.limit
                ? `Seus gastos estão dentro do limite mensal. Ainda restam ${formatCurrency(summary.remainingLimit)} disponíveis.`
                : `Seus gastos ultrapassaram o limite mensal em ${formatCurrency(summary.total - summary.limit)}.`;
        }
    };

    const updateKpis = (summary) => {
        const cards = $$(".expense-kpi");

        cards.forEach((card, index) => {
            const label = normalizeText(
                $(".expense-kpi__label", card)?.textContent ||
                card.textContent
            );

            const valueElement = $(".expense-kpi__value", card);

            if (!valueElement) return;

            if (label.includes("pago")) {
                valueElement.textContent =
                    formatCurrency(summary.paid);
                return;
            }

            if (
                label.includes("pendente") ||
                label.includes("previst")
            ) {
                valueElement.textContent =
                    formatCurrency(summary.pending);
                return;
            }

            if (
                label.includes("fix") ||
                label.includes("recorrente")
            ) {
                valueElement.textContent =
                    formatCurrency(summary.fixed);
                return;
            }

            if (label.includes("variavel")) {
                valueElement.textContent =
                    formatCurrency(summary.variable);
                return;
            }

            if (label.includes("limite")) {
                valueElement.textContent =
                    formatCurrency(summary.remainingLimit);
                return;
            }

            if (label.includes("total")) {
                valueElement.textContent =
                    formatCurrency(summary.total);
                return;
            }

            const fallbackValues = [
                formatCurrency(summary.paid),
                formatCurrency(summary.pending),
                formatCurrency(summary.fixed),
                formatCurrency(summary.variable)
            ];

            valueElement.textContent =
                fallbackValues[index] ||
                formatCurrency(summary.total);
        });
    };

    const updateCategories = () => {
        const container = getFirstElement(
            ".expense-category-list",
            ".expense-categories__list",
            "[data-expense-categories]"
        );

        if (!container) return;

        const monthExpenses = getCurrentMonthExpenses();

        const categories = Object.entries(
            monthExpenses.reduce((result, expense) => {
                if (!result[expense.category]) {
                    result[expense.category] = {
                        value: 0,
                        quantity: 0
                    };
                }

                result[expense.category].value += expense.value;
                result[expense.category].quantity += 1;

                return result;
            }, {})
        )
            .map(([category, data]) => ({
                category,
                ...data
            }))
            .sort((categoryA, categoryB) => {
                return categoryB.value - categoryA.value;
            });

        const total = categories.reduce((sum, category) => {
            return sum + category.value;
        }, 0);

        if (!categories.length) {
            container.innerHTML = `
                <p class="empty-card__text">
                    Nenhuma categoria cadastrada.
                </p>
            `;

            return;
        }

        container.innerHTML = categories
            .slice(0, 5)
            .map((item) => {
                const category =
                    CATEGORY_DATA[item.category] ||
                    CATEGORY_DATA.other;

                const percentage = total > 0
                    ? Math.min((item.value / total) * 100, 100)
                    : 0;

                return `
                    <article class="expense-category-summary">
                        <div class="expense-category-summary__top">
                            <span class="expense-category-summary__main">
                                <span class="expense-category-summary__icon">
                                    ${getCategoryIcon(category.icon)}
                                </span>

                                <span>
                                    <strong class="expense-category-summary__name">
                                        ${escapeHTML(category.label)}
                                    </strong>

                                    <span class="expense-category-summary__meta">
                                        ${item.quantity}
                                        ${item.quantity === 1 ? "despesa" : "despesas"}
                                    </span>
                                </span>
                            </span>

                            <strong class="expense-category-summary__value">
                                ${formatCurrency(item.value)}
                            </strong>
                        </div>

                        <div class="expense-category-summary__track">
                            <span
                                class="expense-category-summary__bar"
                                style="--progress-value: ${percentage}%;"
                            ></span>
                        </div>
                    </article>
                `;
            })
            .join("");
    };

    const updateLimit = (summary) => {
        const valueElements = $$(
            ".expense-limit__value, .expense-limit-card__value"
        );

        if (valueElements[0]) {
            valueElements[0].textContent =
                formatCurrency(summary.total);
        }

        if (valueElements[1]) {
            valueElements[1].textContent =
                formatCurrency(summary.limit);
        }

        const percentageElement = getFirstElement(
            ".expense-limit__percentage",
            ".expense-limit-card__percentage"
        );

        if (percentageElement) {
            percentageElement.textContent =
                `${Math.round(summary.limitPercent)}% utilizado`;
        }

        const progressBar = getFirstElement(
            ".expense-limit__bar",
            ".expense-limit-card__bar",
            "[data-expense-limit-bar]"
        );

        if (progressBar) {
            progressBar.style.setProperty(
                "--progress-value",
                `${summary.limitPercent}%`
            );

            progressBar.style.width =
                `${summary.limitPercent}%`;
        }

        const limitText = getFirstElement(
            ".expense-limit__text",
            ".expense-limit-card__text"
        );

        if (limitText) {
            limitText.textContent = summary.total <= summary.limit
                ? `Você ainda pode gastar ${formatCurrency(summary.remainingLimit)} sem ultrapassar o limite.`
                : `Você ultrapassou o limite em ${formatCurrency(summary.total - summary.limit)}.`;
        }
    };

    const updateSidebar = (summary) => {
        const pendingQuantity = getCurrentMonthExpenses()
            .filter((expense) => expense.status === "pending")
            .length;

        const sidebarBadge = getFirstElement(
            '.sidebar__link[href*="despesas"] .sidebar__badge',
            "[data-expense-sidebar-badge]"
        );

        if (sidebarBadge) {
            sidebarBadge.textContent =
                String(pendingQuantity);
        }

        const sidebarCardBadge = $(".sidebar-card .badge");

        if (sidebarCardBadge) {
            sidebarCardBadge.textContent =
                `${formatCurrency(summary.total)} em gastos`;
        }
    };

    const updateInterface = () => {
        const summary = calculateSummary();

        renderExpenses();
        updateHero(summary);
        updateKpis(summary);
        updateCategories();
        updateLimit(summary);
        updateSidebar(summary);
    };

    const validateForm = () => {
        const name = fields.name?.value.trim() || "";
        const value = parseValue(fields.value?.value);
        const date = fields.date?.value || "";

        if (!name) {
            showToast({
                type: "danger",
                title: "Nome obrigatório",
                message: "Digite o nome da despesa."
            });

            fields.name?.focus();
            return false;
        }

        if (value <= 0) {
            showToast({
                type: "danger",
                title: "Valor inválido",
                message: "Digite um valor maior que zero."
            });

            fields.value?.focus();
            return false;
        }

        if (!date) {
            showToast({
                type: "danger",
                title: "Data obrigatória",
                message: "Informe a data da despesa."
            });

            fields.date?.focus();
            return false;
        }

        return true;
    };

    const getFormData = () => {
        const existingExpense = expenses.find((expense) => {
            return expense.id === editingId;
        });

        return normalizeExpense({
            id: editingId || createId(),
            name: fields.name?.value.trim(),
            value: parseValue(fields.value?.value),
            date: fields.date?.value,
            category: getSelectedCategory(),
            type: getSelectedType(),
            status: getSelectedStatus(),
            description: fields.description?.value.trim() || "",
            createdAt:
                existingExpense?.createdAt ||
                new Date().toISOString()
        });
    };

    const getSubmitButton = () => {
        return getFormElement(
            '[type="submit"]',
            "[data-expense-submit]"
        );
    };

    const setDefaultDate = () => {
        if (!fields.date || fields.date.value) return;

        fields.date.value = new Date()
            .toISOString()
            .slice(0, 10);
    };

    const resetForm = () => {
        if (!form) return;

        form.reset();
        editingId = null;

        setSelectedCategory("food");
        setSelectedType("variable");
        setSelectedStatus("paid");
        setDefaultDate();

        const submitButton = getSubmitButton();

        if (submitButton) {
            submitButton.textContent = "Salvar despesa";
        }

        form.classList.remove("is-editing");
    };

    const fillForm = (expense) => {
        editingId = expense.id;

        if (fields.name) {
            fields.name.value = expense.name;
        }

        if (fields.value) {
            fields.value.value = expense.value;
        }

        if (fields.date) {
            fields.date.value = expense.date;
        }

        if (fields.description) {
            fields.description.value = expense.description;
        }

        setSelectedCategory(expense.category);
        setSelectedType(expense.type);
        setSelectedStatus(expense.status);

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
        const expenseData = getFormData();

        if (wasEditing) {
            expenses = expenses.map((expense) => {
                return expense.id === editingId
                    ? expenseData
                    : expense;
            });
        } else {
            expenses = [expenseData, ...expenses];
        }

        const saved = saveExpenses();

        if (!saved) {
            showToast({
                type: "danger",
                title: "Erro ao salvar",
                message: "Não foi possível salvar a despesa no navegador."
            });

            return;
        }

        resetForm();
        updateInterface();

        showToast({
            type: "success",
            title: wasEditing
                ? "Despesa atualizada"
                : "Despesa salva",

            message: wasEditing
                ? "As alterações foram salvas com sucesso."
                : "A nova despesa foi adicionada ao seu controle."
        });
    };

    const deleteExpense = (expense) => {
        const confirmed = window.confirm(
            `Deseja excluir a despesa "${expense.name}"?`
        );

        if (!confirmed) return;

        expenses = expenses.filter((item) => {
            return item.id !== expense.id;
        });

        const saved = saveExpenses();

        if (!saved) {
            showToast({
                type: "danger",
                title: "Erro ao excluir",
                message: "Não foi possível atualizar os dados."
            });

            return;
        }

        if (editingId === expense.id) {
            resetForm();
        }

        updateInterface();

        showToast({
            type: "success",
            title: "Despesa excluída",
            message: "A despesa foi removida do seu controle."
        });
    };

    const handleListAction = (event) => {
        const button = event.target.closest("[data-action]");

        if (!button) return;

        const item = button.closest("[data-expense-id]");

        if (!item) return;

        const expense = expenses.find((entry) => {
            return entry.id === item.dataset.expenseId;
        });

        if (!expense) return;

        const action = button.dataset.action;

        if (action === "edit") {
            fillForm(expense);
        }

        if (action === "delete") {
            deleteExpense(expense);
        }
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

    const setupTypeCards = () => {
        typeCards.forEach((card) => {
            card.addEventListener("click", () => {
                const input = $("input", card);

                if (!input) return;

                input.checked = true;
                updateTypeCards();
            });
        });
    };

    const setupFilters = () => {
        searchInputs.forEach((input) => {
            input.addEventListener("input", renderExpenses);
        });

        const filterButton = getFirstElement(
            ".expense-filter .btn",
            "[data-action='filter-expenses']"
        );

        filterButton?.addEventListener(
            "click",
            renderExpenses
        );
    };

    const setupCancelEditing = () => {
        const cancelButton = getFirstElement(
            "[data-action='cancel-expense-edit']",
            ".expense-form__cancel"
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
                "Finly: formulário ou lista de despesas não encontrados."
            );

            return;
        }

        if (!getStorage()) {
            return;
        }

        loadExpenses();
        setDefaultDate();

        setupCategoryCards();
        setupTypeCards();
        setupFilters();
        setupCancelEditing();

        form.addEventListener("submit", handleSubmit);
        list.addEventListener("click", handleListAction);

        updateCategoryCards();
        updateTypeCards();
        updateInterface();
    };

    document.addEventListener("DOMContentLoaded", init);
})();