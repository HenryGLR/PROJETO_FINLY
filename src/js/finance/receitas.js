(() => {
    const STORAGE_KEY = "finly_incomes";

    const incomeCategories = {
        salary: {
            label: "Salário",
            icon: "money"
        },
        freelance: {
            label: "Freela",
            icon: "briefcase"
        },
        sales: {
            label: "Vendas",
            icon: "bag"
        },
        gift: {
            label: "Presente",
            icon: "gift"
        },
        investment: {
            label: "Investimento",
            icon: "chart"
        },
        other: {
            label: "Outros",
            icon: "plus"
        }
    };

    const defaultIncomes = [
        {
            id: crypto.randomUUID(),
            name: "Salário",
            value: 1700,
            date: "2026-07-10",
            recurrence: "monthly",
            category: "salary",
            description: "Entrada principal do mês.",
            status: "received"
        },
        {
            id: crypto.randomUUID(),
            name: "Site landing page",
            value: 700,
            date: "2026-07-25",
            recurrence: "none",
            category: "freelance",
            description: "Projeto previsto para este mês.",
            status: "pending"
        }
    ];

    const $ = (selector, parent = document) => parent.querySelector(selector);
    const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

    const incomeForm = $(".income-form");
    const incomeList = $(".income-main .income-list");
    const incomeSearchInputs = $$(".topbar__search input, .income-filter input");
    const categoryCards = $$(".income-category");

    let incomes = [];
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

    const recurrenceLabel = (recurrence) => {
        const labels = {
            none: "Não recorrente",
            monthly: "Mensal",
            weekly: "Semanal",
            yearly: "Anual"
        };

        return labels[recurrence] || "Não recorrente";
    };

    const getIcon = (type) => {
        const icons = {
            money: `
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3v18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                    <path d="M17 7.5c0-1.38-2.24-2.5-5-2.5S7 6.12 7 7.5 9.24 10 12 10s5 1.12 5 2.5S14.76 15 12 15s-5-1.12-5-2.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
            `,
            briefcase: `
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 7h16v12H4V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M9 7V5h6v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            bag: `
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 11h14l-1.5 8h-11L5 11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            gift: `
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M20 12v8H4v-8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M2 7h20v5H2V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M12 7v13" stroke="currentColor" stroke-width="2"/>
                </svg>
            `,
            chart: `
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 19 9 14l4 4 7-9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M15 9h5v5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
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

    const saveIncomes = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(incomes));
    };

    const loadIncomes = () => {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            incomes = defaultIncomes;
            saveIncomes();
            return;
        }

        try {
            incomes = JSON.parse(stored);
        } catch {
            incomes = defaultIncomes;
            saveIncomes();
        }
    };

    const getSelectedCategory = () => {
        return $(".income-category input:checked")?.value || "salary";
    };

    const setActiveCategory = () => {
        categoryCards.forEach((card) => {
            const input = $("input", card);
            card.classList.toggle("is-active", input.checked);
        });
    };

    const getIncomeFormData = () => {
        return {
            id: editingId || crypto.randomUUID(),
            name: $("#incomeName").value.trim(),
            value: Number($("#incomeValue").value),
            date: $("#incomeDate").value,
            recurrence: $("#incomeRecurrence").value,
            category: getSelectedCategory(),
            description: $("#incomeDescription").value.trim(),
            status: "received"
        };
    };

    const resetForm = () => {
        incomeForm.reset();
        editingId = null;

        const salaryInput = $(".income-category input[value='salary']");
        if (salaryInput) salaryInput.checked = true;

        setActiveCategory();

        const submitButton = $(".income-form [type='submit']");
        if (submitButton) submitButton.textContent = "Salvar receita";
    };

    const validateIncome = () => {
        const name = $("#incomeName").value.trim();
        const value = Number($("#incomeValue").value);
        const date = $("#incomeDate").value;

        if (!name) {
            showToast({
                type: "danger",
                title: "Nome obrigatório",
                message: "Digite o nome da receita antes de salvar."
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
                message: "Informe a data de entrada da receita."
            });

            return false;
        }

        return true;
    };

    const renderIncomeItem = (income) => {
        const category = incomeCategories[income.category] || incomeCategories.other;
        const statusText = income.status === "pending" ? "Previsto" : category.label;

        return `
            <article class="income-item" data-income-id="${income.id}">
                <div class="income-item__main">
                    <span class="income-item__icon">
                        ${getIcon(category.icon)}
                    </span>

                    <span class="income-item__info">
                        <strong class="income-item__title">${income.name}</strong>
                        <span class="income-item__meta">
                            ${statusText} • ${formatDate(income.date)} • ${recurrenceLabel(income.recurrence)}
                        </span>
                    </span>
                </div>

                <div class="income-item__side">
                    <strong class="income-item__value">+ ${formatCurrency(income.value)}</strong>

                    <div class="income-item__actions">
                        <button class="btn btn-ghost btn-sm" type="button" data-action="edit">Editar</button>
                        <button class="btn btn-ghost btn-sm" type="button" data-action="delete">Excluir</button>
                    </div>
                </div>
            </article>
        `;
    };

    const renderIncomes = (list = incomes) => {
        if (!incomeList) return;

        if (!list.length) {
            incomeList.innerHTML = `
                <div class="empty-card">
                    <span class="empty-card__icon">
                        ${getIcon("plus")}
                    </span>

                    <h3 class="empty-card__title">Nenhuma receita encontrada</h3>
                    <p class="empty-card__text">Cadastre uma nova entrada para ela aparecer aqui.</p>
                </div>
            `;

            return;
        }

        incomeList.innerHTML = list
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(renderIncomeItem)
            .join("");
    };

    const updateSummary = () => {
        const receivedIncomes = incomes.filter((income) => income.status !== "pending");
        const pendingIncomes = incomes.filter((income) => income.status === "pending");

        const totalReceived = receivedIncomes.reduce((sum, income) => sum + Number(income.value), 0);
        const totalPending = pendingIncomes.reduce((sum, income) => sum + Number(income.value), 0);
        const salaryTotal = incomes
            .filter((income) => income.category === "salary" && income.status !== "pending")
            .reduce((sum, income) => sum + Number(income.value), 0);

        const extraTotal = incomes
            .filter((income) => income.category !== "salary" && income.status !== "pending")
            .reduce((sum, income) => sum + Number(income.value), 0);

        const recurringTotal = incomes.filter((income) => income.recurrence !== "none").length;

        $(".income-hero-card__value").textContent = formatCurrency(totalReceived);
        $(".sidebar-card .badge").textContent = formatCurrency(totalReceived);

        const kpiValues = $$(".income-kpi__value");

        if (kpiValues[0]) kpiValues[0].textContent = formatCurrency(salaryTotal);
        if (kpiValues[1]) kpiValues[1].textContent = formatCurrency(extraTotal);
        if (kpiValues[2]) kpiValues[2].textContent = recurringTotal;

        const kpiMetas = $$(".income-kpi__meta");

        if (kpiMetas[1]) {
            kpiMetas[1].textContent = extraTotal > 0
                ? "Renda extra registrada"
                : "Nenhuma renda extra registrada";
        }

        updateSources(totalReceived, salaryTotal, extraTotal);
        updateNextIncome(totalPending);
    };

    const updateSources = (total, salaryTotal, extraTotal) => {
        const sources = $$(".income-source");

        const items = [
            {
                name: "Salário",
                value: salaryTotal
            },
            {
                name: "Freelas",
                value: extraTotal
            },
            {
                name: "Outros",
                value: incomes
                    .filter((income) => income.category === "other")
                    .reduce((sum, income) => sum + Number(income.value), 0)
            }
        ];

        sources.forEach((source, index) => {
            const item = items[index];
            const percent = total > 0 ? Math.min((item.value / total) * 100, 100) : 0;

            $(".income-source__name", source).textContent = item.name;
            $(".income-source__value", source).textContent = formatCurrency(item.value);
            $(".income-source__bar", source).style.setProperty("--progress-value", `${percent}%`);
        });
    };

    const updateNextIncome = () => {
        const asideLists = $$(".income-aside .income-list");
        const nextList = asideLists[0];

        if (!nextList) return;

        const pending = incomes.filter((income) => income.status === "pending");

        if (!pending.length) {
            nextList.innerHTML = `
                <div class="empty-card">
                    <h3 class="empty-card__title">Nada previsto</h3>
                    <p class="empty-card__text">Quando houver uma receita futura, ela aparecerá aqui.</p>
                </div>
            `;

            return;
        }

        nextList.innerHTML = pending
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 2)
            .map((income) => {
                const category = incomeCategories[income.category] || incomeCategories.other;

                return `
                    <article class="income-item">
                        <div class="income-item__main">
                            <span class="income-item__icon">
                                ${getIcon(category.icon)}
                            </span>

                            <span class="income-item__info">
                                <strong class="income-item__title">${income.name}</strong>
                                <span class="income-item__meta">Previsto para ${formatDate(income.date)}</span>
                            </span>
                        </div>

                        <div class="income-item__side">
                            <strong class="income-item__value">+ ${formatCurrency(income.value)}</strong>
                        </div>
                    </article>
                `;
            })
            .join("");
    };

    const filterIncomes = () => {
        const terms = incomeSearchInputs
            .map((input) => input.value.trim().toLowerCase())
            .filter(Boolean);

        if (!terms.length) {
            renderIncomes();
            return;
        }

        const filtered = incomes.filter((income) => {
            const category = incomeCategories[income.category]?.label || "";
            const text = `${income.name} ${category} ${income.description}`.toLowerCase();

            return terms.every((term) => text.includes(term));
        });

        renderIncomes(filtered);
    };

    const fillFormToEdit = (income) => {
        editingId = income.id;

        $("#incomeName").value = income.name;
        $("#incomeValue").value = income.value;
        $("#incomeDate").value = income.date;
        $("#incomeRecurrence").value = income.recurrence;
        $("#incomeDescription").value = income.description || "";

        const categoryInput = $(`.income-category input[value="${income.category}"]`);
        if (categoryInput) categoryInput.checked = true;

        setActiveCategory();

        const submitButton = $(".income-form [type='submit']");
        if (submitButton) submitButton.textContent = "Salvar alterações";

        $("#nova-receita").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    };

    const deleteIncome = (id) => {
        incomes = incomes.filter((income) => income.id !== id);
        saveIncomes();
        renderIncomes();
        updateSummary();

        showToast({
            type: "success",
            title: "Receita excluída",
            message: "A entrada foi removida da sua lista."
        });
    };

    const handleIncomeActions = (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        const item = event.target.closest("[data-income-id]");
        const income = incomes.find((entry) => entry.id === item?.dataset.incomeId);

        if (!income) return;

        if (button.dataset.action === "edit") {
            fillFormToEdit(income);
        }

        if (button.dataset.action === "delete") {
            deleteIncome(income.id);
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!validateIncome()) return;

        const incomeData = getIncomeFormData();

        if (editingId) {
            incomes = incomes.map((income) => income.id === editingId ? incomeData : income);
        } else {
            incomes = [incomeData, ...incomes];
        }

        saveIncomes();
        renderIncomes();
        updateSummary();
        resetForm();

        showToast({
            type: "success",
            title: editingId ? "Receita atualizada" : "Receita salva",
            message: "Sua lista de entradas foi atualizada com sucesso."
        });
    };

    const setupDefaultDate = () => {
        const dateInput = $("#incomeDate");

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
        incomeSearchInputs.forEach((input) => {
            input.addEventListener("input", filterIncomes);
        });

        $(".income-filter .btn")?.addEventListener("click", filterIncomes);
    };

    const init = () => {
        if (!incomeForm) return;

        loadIncomes();
        setupDefaultDate();
        setupCategoryCards();
        setupFilters();

        incomeForm.addEventListener("submit", handleSubmit);
        incomeList?.addEventListener("click", handleIncomeActions);

        setActiveCategory();
        renderIncomes();
        updateSummary();
    };

    document.addEventListener("DOMContentLoaded", init);
})();