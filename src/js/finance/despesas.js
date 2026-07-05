(() => {
    const STORAGE_KEY = "finly_expenses";

    const expenseCategories = {
        food: {
            label: "Alimentação",
            icon: "food"
        },
        transport: {
            label: "Transporte",
            icon: "transport"
        },
        health: {
            label: "Saúde",
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

    const defaultExpenses = [
        {
            id: crypto.randomUUID(),
            name: "Academia",
            value: 170,
            date: "2026-07-20",
            type: "fixed",
            category: "health",
            description: "Mensalidade da academia.",
            status: "paid"
        },
        {
            id: crypto.randomUUID(),
            name: "Futevôlei",
            value: 320,
            date: "2026-07-05",
            type: "fixed",
            category: "health",
            description: "Aula mensal de futevôlei.",
            status: "paid"
        },
        {
            id: crypto.randomUUID(),
            name: "Spotify",
            value: 12.9,
            date: "2026-07-14",
            type: "subscription",
            category: "other",
            description: "Assinatura mensal.",
            status: "paid"
        },
        {
            id: crypto.randomUUID(),
            name: "Parcela Nubank",
            value: 385.87,
            date: "2026-07-24",
            type: "installment",
            category: "card",
            description: "Parcela prevista do cartão.",
            status: "pending"
        }
    ];

    const $ = (selector, parent = document) => parent.querySelector(selector);
    const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

    const expenseForm = $(".expense-form");
    const expenseList = $(".expense-main .expense-list");
    const expenseSearchInputs = $$(".topbar__search input, .expense-filter input");
    const categoryCards = $$(".expense-category");

    let expenses = [];
    let editingId = null;

    const formatCurrency = (value) => {
        return Number(value).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    };

    const formatDate = (date) => {
        if (!date) return "Sem data";

        const fixedDate = new Date(`${date}T12:00:00`);

        return fixedDate.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short"
        });
    };

    const typeLabel = (type) => {
        const labels = {
            variable: "Variável",
            fixed: "Fixo",
            installment: "Parcelado",
            subscription: "Assinatura"
        };

        return labels[type] || "Variável";
    };

    const getIcon = (type) => {
        const icons = {
            food: `
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 3v18M10 3v18M6 8h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M17 3v18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M17 3c2 2 3 4 3 7 0 2-1 4-3 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            transport: `
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 11h14l-1.5 6h-11L5 11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M7 17v2M17 17v2M8 8h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            health: `
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                    <path d="M4 4h16v16H4V4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
            `,
            home: `
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 11h16v9H4v-9Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="m3 11 9-8 9 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `,
            card: `
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 7h18v10H3V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M3 10h18" stroke="currentColor" stroke-width="2"/>
                    <path d="M7 15h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            plus: `
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
            `
        };

        return icons[type] || icons.plus;
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

    const saveExpenses = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    };

    const loadExpenses = () => {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            expenses = defaultExpenses;
            saveExpenses();
            return;
        }

        try {
            expenses = JSON.parse(stored);
        } catch {
            expenses = defaultExpenses;
            saveExpenses();
        }
    };

    const getSelectedCategory = () => {
        return $(".expense-category input:checked")?.value || "food";
    };

    const setActiveCategory = () => {
        categoryCards.forEach((card) => {
            const input = $("input", card);
            card.classList.toggle("is-active", input.checked);
        });
    };

    const getExpenseFormData = () => {
        return {
            id: editingId || crypto.randomUUID(),
            name: $("#expenseName").value.trim(),
            value: Number($("#expenseValue").value),
            date: $("#expenseDate").value,
            type: $("#expenseType").value,
            category: getSelectedCategory(),
            description: $("#expenseDescription").value.trim(),
            status: $("#expenseType").value === "installment" ? "pending" : "paid"
        };
    };

    const resetForm = () => {
        expenseForm.reset();
        editingId = null;

        const foodInput = $(".expense-category input[value='food']");
        if (foodInput) foodInput.checked = true;

        setActiveCategory();
        setupDefaultDate();

        const submitButton = $(".expense-form [type='submit']");
        if (submitButton) submitButton.textContent = "Salvar despesa";
    };

    const validateExpense = () => {
        const name = $("#expenseName").value.trim();
        const value = Number($("#expenseValue").value);
        const date = $("#expenseDate").value;

        if (!name) {
            showToast({
                type: "danger",
                title: "Nome obrigatório",
                message: "Digite o nome da despesa antes de salvar."
            });

            return false;
        }

        if (!value || value <= 0) {
            showToast({
                type: "danger",
                title: "Valor inválido",
                message: "Digite um valor maior que zero."
            });

            return false;
        }

        if (!date) {
            showToast({
                type: "danger",
                title: "Data obrigatória",
                message: "Informe a data da despesa."
            });

            return false;
        }

        return true;
    };

    const renderExpenseItem = (expense) => {
        const category = expenseCategories[expense.category] || expenseCategories.other;
        const statusText = expense.status === "pending" ? "Pendente" : category.label;

        return `
            <article class="expense-item" data-expense-id="${expense.id}">
                <div class="expense-item__main">
                    <span class="expense-item__icon">
                        ${getIcon(category.icon)}
                    </span>

                    <span class="expense-item__info">
                        <strong class="expense-item__title">${expense.name}</strong>
                        <span class="expense-item__meta">
                            ${statusText} • ${formatDate(expense.date)} • ${typeLabel(expense.type)}
                        </span>
                    </span>
                </div>

                <div class="expense-item__side">
                    <strong class="expense-item__value">- ${formatCurrency(expense.value)}</strong>

                    <div class="expense-item__actions">
                        <button class="btn btn-ghost btn-sm" type="button" data-action="edit">Editar</button>
                        <button class="btn btn-ghost btn-sm" type="button" data-action="delete">Excluir</button>
                    </div>
                </div>
            </article>
        `;
    };

    const renderExpenses = (list = expenses) => {
        if (!expenseList) return;

        if (!list.length) {
            expenseList.innerHTML = `
                <div class="empty-card">
                    <span class="empty-card__icon">
                        ${getIcon("plus")}
                    </span>

                    <h3 class="empty-card__title">Nenhuma despesa encontrada</h3>
                    <p class="empty-card__text">Cadastre uma nova saída para ela aparecer aqui.</p>
                </div>
            `;

            return;
        }

        expenseList.innerHTML = list
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(renderExpenseItem)
            .join("");
    };

    const updateSummary = () => {
        const paidExpenses = expenses.filter((expense) => expense.status !== "pending");
        const pendingExpenses = expenses.filter((expense) => expense.status === "pending");

        const totalPaid = paidExpenses.reduce((sum, expense) => sum + Number(expense.value), 0);
        const totalPending = pendingExpenses.reduce((sum, expense) => sum + Number(expense.value), 0);

        const fixedTotal = expenses
            .filter((expense) => expense.type === "fixed" && expense.status !== "pending")
            .reduce((sum, expense) => sum + Number(expense.value), 0);

        const variableTotal = expenses
            .filter((expense) => expense.type === "variable" && expense.status !== "pending")
            .reduce((sum, expense) => sum + Number(expense.value), 0);

        $(".expense-hero-card__value").textContent = formatCurrency(totalPaid);
        $(".sidebar-card .badge").textContent = formatCurrency(totalPaid);

        const kpiValues = $$(".expense-kpi__value");

        if (kpiValues[0]) kpiValues[0].textContent = formatCurrency(fixedTotal);
        if (kpiValues[1]) kpiValues[1].textContent = formatCurrency(variableTotal);
        if (kpiValues[2]) kpiValues[2].textContent = formatCurrency(totalPending);

        updateSources(totalPaid);
        updateLimit(totalPaid);
    };

    const updateSources = (total) => {
        const sources = $$(".expense-source");

        const items = [
            {
                name: "Cartão",
                value: sumByCategory("card")
            },
            {
                name: "Saúde",
                value: sumByCategory("health")
            },
            {
                name: "Outros",
                value: sumByCategory("other")
            }
        ];

        sources.forEach((source, index) => {
            const item = items[index];
            const percent = total > 0 ? Math.min((item.value / total) * 100, 100) : 0;

            $(".expense-source__name", source).textContent = item.name;
            $(".expense-source__value", source).textContent = formatCurrency(item.value);
            $(".expense-source__bar", source).style.setProperty("--progress-value", `${percent}%`);
        });
    };

    const sumByCategory = (category) => {
        return expenses
            .filter((expense) => expense.category === category && expense.status !== "pending")
            .reduce((sum, expense) => sum + Number(expense.value), 0);
    };

    const updateLimit = (totalPaid) => {
        const monthlyLimit = 1300;
        const percent = Math.min(Math.round((totalPaid / monthlyLimit) * 100), 100);

        $(".expense-limit__text").textContent = `${formatCurrency(totalPaid)} de ${formatCurrency(monthlyLimit)} usados`;
        $(".expense-limit__value").textContent = `${percent}%`;
        $(".expense-limit__bar").style.setProperty("--progress-value", `${percent}%`);

        const pill = $(".expense-hero-card__footer .expense-pill:first-child");

        if (pill) {
            pill.textContent = `${percent}% do limite usado`;
        }
    };

    const filterExpenses = () => {
        const terms = expenseSearchInputs
            .map((input) => input.value.trim().toLowerCase())
            .filter(Boolean);

        if (!terms.length) {
            renderExpenses();
            return;
        }

        const filtered = expenses.filter((expense) => {
            const category = expenseCategories[expense.category]?.label || "";
            const text = `${expense.name} ${category} ${expense.description}`.toLowerCase();

            return terms.every((term) => text.includes(term));
        });

        renderExpenses(filtered);
    };

    const fillFormToEdit = (expense) => {
        editingId = expense.id;

        $("#expenseName").value = expense.name;
        $("#expenseValue").value = expense.value;
        $("#expenseDate").value = expense.date;
        $("#expenseType").value = expense.type;
        $("#expenseDescription").value = expense.description || "";

        const categoryInput = $(`.expense-category input[value="${expense.category}"]`);
        if (categoryInput) categoryInput.checked = true;

        setActiveCategory();

        const submitButton = $(".expense-form [type='submit']");
        if (submitButton) submitButton.textContent = "Salvar alterações";

        $("#nova-despesa").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    };

    const deleteExpense = (id) => {
        expenses = expenses.filter((expense) => expense.id !== id);

        saveExpenses();
        renderExpenses();
        updateSummary();

        showToast({
            type: "success",
            title: "Despesa excluída",
            message: "A saída foi removida da sua lista."
        });
    };

    const handleExpenseActions = (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        const item = event.target.closest("[data-expense-id]");
        const expense = expenses.find((entry) => entry.id === item?.dataset.expenseId);

        if (!expense) return;

        if (button.dataset.action === "edit") {
            fillFormToEdit(expense);
        }

        if (button.dataset.action === "delete") {
            deleteExpense(expense.id);
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!validateExpense()) return;

        const expenseData = getExpenseFormData();

        if (editingId) {
            expenses = expenses.map((expense) => expense.id === editingId ? expenseData : expense);
        } else {
            expenses = [expenseData, ...expenses];
        }

        saveExpenses();
        renderExpenses();
        updateSummary();

        const wasEditing = Boolean(editingId);
        resetForm();

        showToast({
            type: "success",
            title: wasEditing ? "Despesa atualizada" : "Despesa salva",
            message: "Sua lista de saídas foi atualizada com sucesso."
        });
    };

    const setupDefaultDate = () => {
        const dateInput = $("#expenseDate");

        if (dateInput && !dateInput.value) {
            dateInput.valueAsDate = new Date();
        }
    };

    const setupCategoryCards = () => {
        categoryCards.forEach((card) => {
            card.addEventListener("click", () => {
                const input = $("input", card);

                if (input) {
                    input.checked = true;
                    setActiveCategory();
                }
            });
        });
    };

    const setupFilters = () => {
        expenseSearchInputs.forEach((input) => {
            input.addEventListener("input", filterExpenses);
        });

        $(".expense-filter .btn")?.addEventListener("click", filterExpenses);
    };

    const init = () => {
        if (!expenseForm) return;

        loadExpenses();
        setupDefaultDate();
        setupCategoryCards();
        setupFilters();

        expenseForm.addEventListener("submit", handleSubmit);
        expenseList?.addEventListener("click", handleExpenseActions);

        setActiveCategory();
        renderExpenses();
        updateSummary();
    };

    document.addEventListener("DOMContentLoaded", init);
})();