(() => {
    "use strict";

    const STORAGE_KEYS = {
        incomes: "incomes",
        expenses: "expenses",
        installments: "installments",
        goals: "goals"
    };

    const CATEGORY_LABELS = {
        salary: "Salário",
        freelance: "Freelance",
        sales: "Vendas",
        gift: "Presente",
        investment: "Investimentos",
        food: "Alimentação",
        transport: "Transporte",
        health: "Saúde e esporte",
        home: "Casa",
        card: "Cartão",
        emergency: "Reserva de emergência",
        purchase: "Compra",
        travel: "Viagem",
        education: "Educação",
        personal: "Objetivo pessoal",
        other: "Outros"
    };

    const MONTH_NAMES = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro"
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

    const reportForm = getFirstElement(
        "#reportFilterForm",
        ".report-filter-form",
        'form[data-form="report-filter"]'
    );

    const fields = {
        period: getFirstElement(
            "#reportPeriod",
            '[name="reportPeriod"]',
            '[name="period"]',
            "[data-report-period]"
        ),

        startDate: getFirstElement(
            "#reportStartDate",
            "#startDate",
            '[name="reportStartDate"]',
            '[name="startDate"]',
            "[data-report-start]"
        ),

        endDate: getFirstElement(
            "#reportEndDate",
            "#endDate",
            '[name="reportEndDate"]',
            '[name="endDate"]',
            "[data-report-end]"
        ),

        type: getFirstElement(
            "#reportType",
            '[name="reportType"]',
            '[name="type"]',
            "[data-report-type]"
        ),

        category: getFirstElement(
            "#reportCategory",
            '[name="reportCategory"]',
            '[name="category"]',
            "[data-report-category]"
        ),

        search: getFirstElement(
            "#reportSearch",
            ".report-search input",
            "[data-report-search]",
            ".topbar__search input"
        )
    };

    const elements = {
        transactionList: getFirstElement(
            ".report-transaction-list",
            ".report-transactions",
            "[data-report-transactions]"
        ),

        transactionTableBody: getFirstElement(
            ".report-table tbody",
            "#reportTableBody",
            "[data-report-table-body]"
        ),

        categoryList: getFirstElement(
            ".report-category-list",
            ".report-categories",
            "[data-report-categories]"
        ),

        monthlyList: getFirstElement(
            ".report-monthly-list",
            ".report-months",
            "[data-report-monthly]"
        ),

        insights: getFirstElement(
            ".report-insights",
            ".report-insight-list",
            "[data-report-insights]"
        ),

        chart: getFirstElement(
            "#reportChart",
            ".report-chart canvas",
            "canvas[data-report-chart]"
        ),

        emptyState: getFirstElement(
            ".report-empty",
            "[data-report-empty]"
        )
    };

    const state = {
        incomes: [],
        expenses: [],
        installments: [],
        goals: [],
        transactions: [],
        filteredTransactions: [],
        chartResizeTimeout: null,
        unsubscribeStorage: null
    };

    const getStorage = () => {
        if (!window.FinlyStorage) {
            console.error(
                "Finly: storage.js precisa ser carregado antes de relatorios.js."
            );

            return null;
        }

        return window.FinlyStorage;
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

        let normalized = String(value ?? "")
            .trim()
            .replace(/\s/g, "")
            .replace(/R\$/gi, "");

        if (
            normalized.includes(".") &&
            normalized.includes(",")
        ) {
            normalized = normalized
                .replace(/\./g, "")
                .replace(",", ".");
        } else if (normalized.includes(",")) {
            normalized = normalized.replace(",", ".");
        }

        const parsedValue = Number(normalized);

        return Number.isFinite(parsedValue)
            ? parsedValue
            : 0;
    };

    const formatCurrency = (value) => {
        return Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    };

    const formatPercentage = (value) => {
        return `${Number(value || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        })}%`;
    };

    const formatDate = (date) => {
        if (!date) {
            return "Sem data";
        }

        const parsedDate = new Date(`${date}T12:00:00`);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Data inválida";
        }

        return parsedDate.toLocaleDateString("pt-BR");
    };

    const formatMonth = (monthKey) => {
        if (!monthKey) {
            return "Período desconhecido";
        }

        const [year, month] = monthKey
            .split("-")
            .map(Number);

        if (!year || !month) {
            return monthKey;
        }

        return `${MONTH_NAMES[month - 1]} de ${year}`;
    };

    const toISODate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const getMonthKey = (date) => {
        if (!date) {
            return "";
        }

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

    const getCategoryLabel = (category) => {
        return CATEGORY_LABELS[category] || "Outros";
    };

    const createTransactionId = (prefix, item, index) => {
        return (
            item.id ||
            `${prefix}-${item.date || "no-date"}-${index}`
        );
    };

    const normalizeIncomeStatus = (status) => {
        const normalizedStatus = normalizeText(status);

        if (
            normalizedStatus === "received" ||
            normalizedStatus === "recebido" ||
            normalizedStatus === "paid" ||
            normalizedStatus === "pago"
        ) {
            return "received";
        }

        return "pending";
    };

    const normalizeExpenseStatus = (status) => {
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

    const loadData = () => {
        const storage = getStorage();

        if (!storage) {
            return false;
        }

        const incomes = storage.get(
            STORAGE_KEYS.incomes,
            []
        );

        const expenses = storage.get(
            STORAGE_KEYS.expenses,
            []
        );

        const installments = storage.get(
            STORAGE_KEYS.installments,
            []
        );

        const goals = storage.get(
            STORAGE_KEYS.goals,
            []
        );

        state.incomes = Array.isArray(incomes)
            ? incomes
            : [];

        state.expenses = Array.isArray(expenses)
            ? expenses
            : [];

        state.installments = Array.isArray(installments)
            ? installments
            : [];

        state.goals = Array.isArray(goals)
            ? goals
            : [];

        buildTransactions();

        return true;
    };

    const buildTransactions = () => {
        const incomes = state.incomes.map((income, index) => {
            return {
                id: createTransactionId(
                    "income",
                    income,
                    index
                ),

                originalId: income.id || null,
                type: "income",
                name: String(
                    income.name ||
                    income.title ||
                    income.source ||
                    "Receita"
                ).trim(),

                value: Math.max(
                    parseValue(
                        income.value ??
                        income.amount ??
                        income.total
                    ),
                    0
                ),

                date:
                    income.date ||
                    income.receivedAt ||
                    "",

                category: income.category || "other",

                status: normalizeIncomeStatus(
                    income.status
                ),

                description: String(
                    income.description || ""
                ).trim()
            };
        });

        const expenses = state.expenses.map((expense, index) => {
            return {
                id: createTransactionId(
                    "expense",
                    expense,
                    index
                ),

                originalId: expense.id || null,
                type: "expense",

                name: String(
                    expense.name ||
                    expense.title ||
                    "Despesa"
                ).trim(),

                value: Math.max(
                    parseValue(
                        expense.value ??
                        expense.amount ??
                        expense.total
                    ),
                    0
                ),

                date:
                    expense.date ||
                    expense.paidAt ||
                    "",

                category: expense.category || "other",

                status: normalizeExpenseStatus(
                    expense.status
                ),

                description: String(
                    expense.description || ""
                ).trim()
            };
        });

        state.transactions = [
            ...incomes,
            ...expenses
        ].sort((transactionA, transactionB) => {
            const dateA = new Date(
                `${transactionA.date}T12:00:00`
            );

            const dateB = new Date(
                `${transactionB.date}T12:00:00`
            );

            if (
                Number.isNaN(dateA.getTime()) &&
                Number.isNaN(dateB.getTime())
            ) {
                return 0;
            }

            if (Number.isNaN(dateA.getTime())) {
                return 1;
            }

            if (Number.isNaN(dateB.getTime())) {
                return -1;
            }

            return dateB - dateA;
        });
    };

    const getPeriodDates = (period) => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        const startDate = new Date(today);
        const endDate = new Date(today);

        switch (period) {
            case "today":
                break;

            case "7days":
                startDate.setDate(today.getDate() - 6);
                break;

            case "30days":
                startDate.setDate(today.getDate() - 29);
                break;

            case "current-month":
            case "month":
                startDate.setDate(1);

                endDate.setMonth(today.getMonth() + 1);
                endDate.setDate(0);
                break;

            case "previous-month":
                startDate.setMonth(today.getMonth() - 1);
                startDate.setDate(1);

                endDate.setDate(0);
                break;

            case "current-year":
            case "year":
                startDate.setMonth(0, 1);
                endDate.setMonth(11, 31);
                break;

            case "all":
                return {
                    startDate: "",
                    endDate: ""
                };

            default:
                startDate.setDate(1);

                endDate.setMonth(today.getMonth() + 1);
                endDate.setDate(0);
                break;
        }

        return {
            startDate: toISODate(startDate),
            endDate: toISODate(endDate)
        };
    };

    const applyPeriodSelection = () => {
        if (!fields.period) {
            return;
        }

        const period = fields.period.value;

        if (period === "custom") {
            return;
        }

        const dates = getPeriodDates(period);

        if (fields.startDate) {
            fields.startDate.value = dates.startDate;
        }

        if (fields.endDate) {
            fields.endDate.value = dates.endDate;
        }
    };

    const initializePeriod = () => {
        if (fields.period && !fields.period.value) {
            fields.period.value = "current-month";
        }

        const hasStartDate = Boolean(
            fields.startDate?.value
        );

        const hasEndDate = Boolean(
            fields.endDate?.value
        );

        if (!hasStartDate && !hasEndDate) {
            const dates = getPeriodDates(
                fields.period?.value || "current-month"
            );

            if (fields.startDate) {
                fields.startDate.value = dates.startDate;
            }

            if (fields.endDate) {
                fields.endDate.value = dates.endDate;
            }
        }
    };

    const getFilters = () => {
        return {
            startDate: fields.startDate?.value || "",
            endDate: fields.endDate?.value || "",
            type: fields.type?.value || "all",
            category: fields.category?.value || "all",
            search: normalizeText(
                fields.search?.value || ""
            )
        };
    };

    const isDateInsidePeriod = (
        date,
        startDate,
        endDate
    ) => {
        if (!date) {
            return !startDate && !endDate;
        }

        const parsedDate = new Date(`${date}T12:00:00`);

        if (Number.isNaN(parsedDate.getTime())) {
            return false;
        }

        if (startDate) {
            const parsedStartDate = new Date(
                `${startDate}T00:00:00`
            );

            if (parsedDate < parsedStartDate) {
                return false;
            }
        }

        if (endDate) {
            const parsedEndDate = new Date(
                `${endDate}T23:59:59`
            );

            if (parsedDate > parsedEndDate) {
                return false;
            }
        }

        return true;
    };

    const filterTransactions = () => {
        const filters = getFilters();

        state.filteredTransactions = state.transactions.filter(
            (transaction) => {
                if (
                    !isDateInsidePeriod(
                        transaction.date,
                        filters.startDate,
                        filters.endDate
                    )
                ) {
                    return false;
                }

                if (
                    filters.type !== "all" &&
                    transaction.type !== filters.type
                ) {
                    return false;
                }

                if (
                    filters.category !== "all" &&
                    transaction.category !== filters.category
                ) {
                    return false;
                }

                if (filters.search) {
                    const searchableText = normalizeText([
                        transaction.name,
                        transaction.description,
                        getCategoryLabel(transaction.category),
                        transaction.type === "income"
                            ? "receita entrada"
                            : "despesa saída",
                        transaction.status,
                        transaction.value,
                        formatCurrency(transaction.value),
                        transaction.date
                    ].join(" "));

                    if (
                        !searchableText.includes(
                            filters.search
                        )
                    ) {
                        return false;
                    }
                }

                return true;
            }
        );
    };

    const calculateSummary = () => {
        const incomes = state.filteredTransactions
            .filter((transaction) => {
                return transaction.type === "income";
            });

        const expenses = state.filteredTransactions
            .filter((transaction) => {
                return transaction.type === "expense";
            });

        const totalIncomes = incomes.reduce(
            (sum, transaction) => {
                return sum + transaction.value;
            },
            0
        );

        const receivedIncomes = incomes
            .filter((transaction) => {
                return transaction.status === "received";
            })
            .reduce((sum, transaction) => {
                return sum + transaction.value;
            }, 0);

        const pendingIncomes = Math.max(
            totalIncomes - receivedIncomes,
            0
        );

        const totalExpenses = expenses.reduce(
            (sum, transaction) => {
                return sum + transaction.value;
            },
            0
        );

        const paidExpenses = expenses
            .filter((transaction) => {
                return transaction.status === "paid";
            })
            .reduce((sum, transaction) => {
                return sum + transaction.value;
            }, 0);

        const pendingExpenses = Math.max(
            totalExpenses - paidExpenses,
            0
        );

        const balance =
            totalIncomes - totalExpenses;

        const realizedBalance =
            receivedIncomes - paidExpenses;

        const savingsRate = totalIncomes > 0
            ? balance / totalIncomes * 100
            : 0;

        const expenseRate = totalIncomes > 0
            ? totalExpenses / totalIncomes * 100
            : 0;

        const averageIncome = incomes.length
            ? totalIncomes / incomes.length
            : 0;

        const averageExpense = expenses.length
            ? totalExpenses / expenses.length
            : 0;

        return {
            incomes,
            expenses,
            totalIncomes,
            receivedIncomes,
            pendingIncomes,
            totalExpenses,
            paidExpenses,
            pendingExpenses,
            balance,
            realizedBalance,
            savingsRate,
            expenseRate,
            averageIncome,
            averageExpense,
            transactionCount:
                state.filteredTransactions.length
        };
    };

    const calculateInstallmentSummary = () => {
        const active = state.installments.filter(
            (installment) => {
                const totalParts = Number(
                    installment.totalParts ||
                    installment.parts ||
                    1
                );

                const paidParts = Number(
                    installment.paidParts ||
                    installment.paid ||
                    0
                );

                return paidParts < totalParts;
            }
        );

        const monthlyCommitment = active.reduce(
            (sum, installment) => {
                const total = parseValue(
                    installment.total ??
                    installment.value ??
                    installment.totalValue
                );

                const parts = Math.max(
                    Number(
                        installment.totalParts ||
                        installment.parts ||
                        1
                    ),
                    1
                );

                return sum + total / parts;
            },
            0
        );

        const totalOpen = active.reduce(
            (sum, installment) => {
                const total = parseValue(
                    installment.total ??
                    installment.value ??
                    installment.totalValue
                );

                const totalParts = Math.max(
                    Number(
                        installment.totalParts ||
                        installment.parts ||
                        1
                    ),
                    1
                );

                const paidParts = Math.min(
                    Math.max(
                        Number(
                            installment.paidParts ||
                            installment.paid ||
                            0
                        ),
                        0
                    ),
                    totalParts
                );

                const paidValue =
                    total / totalParts * paidParts;

                return sum + Math.max(
                    total - paidValue,
                    0
                );
            },
            0
        );

        return {
            activeCount: active.length,
            monthlyCommitment,
            totalOpen
        };
    };

    const calculateGoalsSummary = () => {
        const totalTarget = state.goals.reduce(
            (sum, goal) => {
                return sum + parseValue(
                    goal.targetValue ??
                    goal.target ??
                    goal.total ??
                    goal.value
                );
            },
            0
        );

        const totalSaved = state.goals.reduce(
            (sum, goal) => {
                return sum + parseValue(
                    goal.currentValue ??
                    goal.savedValue ??
                    goal.saved ??
                    goal.current
                );
            },
            0
        );

        const progress = totalTarget > 0
            ? Math.min(
                totalSaved / totalTarget * 100,
                100
            )
            : 0;

        return {
            totalTarget,
            totalSaved,
            totalRemaining: Math.max(
                totalTarget - totalSaved,
                0
            ),
            progress
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
            ".report-hero-card__value",
            formatCurrency(summary.balance)
        );

        setText(
            ".report-hero__value",
            formatCurrency(summary.balance)
        );

        const heroValues = $$(
            ".report-hero-card__footer .report-pill, .report-hero .report-pill"
        );

        if (heroValues[0]) {
            heroValues[0].textContent =
                `${formatCurrency(summary.totalIncomes)} em receitas`;
        }

        if (heroValues[1]) {
            heroValues[1].textContent =
                `${formatCurrency(summary.totalExpenses)} em despesas`;
        }

        const heroText = getFirstElement(
            ".report-hero-card__text",
            ".report-hero__text"
        );

        if (heroText) {
            if (summary.balance > 0) {
                heroText.textContent =
                    `O período terminou positivo em ${formatCurrency(summary.balance)}. A taxa de economia foi de ${formatPercentage(summary.savingsRate)}.`;
            } else if (summary.balance < 0) {
                heroText.textContent =
                    `As despesas ultrapassaram as receitas em ${formatCurrency(Math.abs(summary.balance))}.`;
            } else {
                heroText.textContent =
                    "As receitas e despesas do período estão equilibradas.";
            }
        }

        const heroCard = getFirstElement(
            ".report-hero-card",
            ".report-hero"
        );

        heroCard?.classList.toggle(
            "is-negative",
            summary.balance < 0
        );

        heroCard?.classList.toggle(
            "is-positive",
            summary.balance > 0
        );
    };

    const updateKpis = (summary) => {
        const installmentSummary =
            calculateInstallmentSummary();

        const goalsSummary =
            calculateGoalsSummary();

        const cards = $$(
            ".report-kpi, [data-report-kpi]"
        );

        cards.forEach((card, index) => {
            const valueElement = getFirstElementInside(
                card,
                ".report-kpi__value",
                "[data-kpi-value]"
            );

            if (!valueElement) {
                return;
            }

            const label = normalizeText(
                getFirstElementInside(
                    card,
                    ".report-kpi__label",
                    "[data-kpi-label]"
                )?.textContent || card.textContent
            );

            if (
                label.includes("receita") ||
                label.includes("entrada")
            ) {
                valueElement.textContent =
                    formatCurrency(summary.totalIncomes);

                return;
            }

            if (
                label.includes("despesa") ||
                label.includes("saida")
            ) {
                valueElement.textContent =
                    formatCurrency(summary.totalExpenses);

                return;
            }

            if (
                label.includes("saldo") ||
                label.includes("resultado")
            ) {
                valueElement.textContent =
                    formatCurrency(summary.balance);

                valueElement.classList.toggle(
                    "is-negative",
                    summary.balance < 0
                );

                valueElement.classList.toggle(
                    "is-positive",
                    summary.balance > 0
                );

                return;
            }

            if (
                label.includes("economia") ||
                label.includes("poupanca")
            ) {
                valueElement.textContent =
                    formatPercentage(summary.savingsRate);

                return;
            }

            if (
                label.includes("parcelamento") ||
                label.includes("compromisso")
            ) {
                valueElement.textContent =
                    formatCurrency(
                        installmentSummary.monthlyCommitment
                    );

                return;
            }

            if (
                label.includes("meta") ||
                label.includes("objetivo")
            ) {
                valueElement.textContent =
                    formatPercentage(goalsSummary.progress);

                return;
            }

            if (
                label.includes("transa") ||
                label.includes("movimenta")
            ) {
                valueElement.textContent =
                    String(summary.transactionCount);

                return;
            }

            const fallbackValues = [
                formatCurrency(summary.totalIncomes),
                formatCurrency(summary.totalExpenses),
                formatCurrency(summary.balance),
                formatPercentage(summary.savingsRate)
            ];

            valueElement.textContent =
                fallbackValues[index] ||
                String(summary.transactionCount);
        });
    };

    const getFirstElementInside = (
        parent,
        ...selectors
    ) => {
        for (const selector of selectors) {
            const element = $(selector, parent);

            if (element) {
                return element;
            }
        }

        return null;
    };

    const getTransactionStatus = (transaction) => {
        if (transaction.type === "income") {
            return transaction.status === "received"
                ? {
                    label: "Recebido",
                    className: "report-status--success"
                }
                : {
                    label: "Previsto",
                    className: "report-status--warning"
                };
        }

        return transaction.status === "paid"
            ? {
                label: "Pago",
                className: "report-status--success"
            }
            : {
                label: "Pendente",
                className: "report-status--warning"
            };
    };

    const renderTransactionList = () => {
        if (!elements.transactionList) {
            return;
        }

        if (!state.filteredTransactions.length) {
            elements.transactionList.innerHTML = `
                <div class="empty-card">
                    <h3 class="empty-card__title">
                        Nenhuma movimentação encontrada
                    </h3>

                    <p class="empty-card__text">
                        Altere o período ou os filtros para visualizar outros resultados.
                    </p>
                </div>
            `;

            return;
        }

        elements.transactionList.innerHTML =
            state.filteredTransactions
                .map((transaction) => {
                    const status =
                        getTransactionStatus(transaction);

                    const typeLabel =
                        transaction.type === "income"
                            ? "Receita"
                            : "Despesa";

                    return `
                        <article class="report-transaction">
                            <span class="report-transaction__indicator report-transaction__indicator--${transaction.type}">
                                ${
                                    transaction.type === "income"
                                        ? "+"
                                        : "−"
                                }
                            </span>

                            <span class="report-transaction__info">
                                <strong class="report-transaction__title">
                                    ${escapeHTML(transaction.name)}
                                </strong>

                                <span class="report-transaction__meta">
                                    ${escapeHTML(typeLabel)}
                                    •
                                    ${escapeHTML(getCategoryLabel(transaction.category))}
                                    •
                                    ${escapeHTML(formatDate(transaction.date))}
                                </span>
                            </span>

                            <span class="report-transaction__status ${status.className}">
                                ${escapeHTML(status.label)}
                            </span>

                            <strong class="report-transaction__value report-transaction__value--${transaction.type}">
                                ${
                                    transaction.type === "income"
                                        ? "+"
                                        : "−"
                                }
                                ${formatCurrency(transaction.value)}
                            </strong>
                        </article>
                    `;
                })
                .join("");
    };

    const renderTransactionTable = () => {
        if (!elements.transactionTableBody) {
            return;
        }

        if (!state.filteredTransactions.length) {
            elements.transactionTableBody.innerHTML = `
                <tr>
                    <td colspan="6">
                        Nenhuma movimentação encontrada.
                    </td>
                </tr>
            `;

            return;
        }

        elements.transactionTableBody.innerHTML =
            state.filteredTransactions
                .map((transaction) => {
                    const status =
                        getTransactionStatus(transaction);

                    return `
                        <tr>
                            <td>
                                ${escapeHTML(formatDate(transaction.date))}
                            </td>

                            <td>
                                <strong>
                                    ${escapeHTML(transaction.name)}
                                </strong>
                            </td>

                            <td>
                                ${
                                    transaction.type === "income"
                                        ? "Receita"
                                        : "Despesa"
                                }
                            </td>

                            <td>
                                ${escapeHTML(getCategoryLabel(transaction.category))}
                            </td>

                            <td>
                                <span class="report-status ${status.className}">
                                    ${escapeHTML(status.label)}
                                </span>
                            </td>

                            <td class="report-table__value report-table__value--${transaction.type}">
                                ${
                                    transaction.type === "income"
                                        ? "+"
                                        : "−"
                                }
                                ${formatCurrency(transaction.value)}
                            </td>
                        </tr>
                    `;
                })
                .join("");
    };

    const calculateCategories = () => {
        const categoryMap = {};

        state.filteredTransactions.forEach(
            (transaction) => {
                const key = [
                    transaction.type,
                    transaction.category
                ].join(":");

                if (!categoryMap[key]) {
                    categoryMap[key] = {
                        type: transaction.type,
                        category: transaction.category,
                        value: 0,
                        quantity: 0
                    };
                }

                categoryMap[key].value +=
                    transaction.value;

                categoryMap[key].quantity += 1;
            }
        );

        return Object.values(categoryMap)
            .sort((categoryA, categoryB) => {
                return categoryB.value - categoryA.value;
            });
    };

    const renderCategories = () => {
        if (!elements.categoryList) {
            return;
        }

        const categories = calculateCategories();

        if (!categories.length) {
            elements.categoryList.innerHTML = `
                <p class="empty-card__text">
                    Nenhuma categoria disponível no período.
                </p>
            `;

            return;
        }

        const highestValue = Math.max(
            ...categories.map((category) => {
                return category.value;
            }),
            1
        );

        elements.categoryList.innerHTML = categories
            .slice(0, 8)
            .map((category) => {
                const percentage =
                    category.value / highestValue * 100;

                return `
                    <article class="report-category">
                        <div class="report-category__top">
                            <span>
                                <strong class="report-category__name">
                                    ${escapeHTML(getCategoryLabel(category.category))}
                                </strong>

                                <small class="report-category__type">
                                    ${
                                        category.type === "income"
                                            ? "Receita"
                                            : "Despesa"
                                    }
                                    •
                                    ${category.quantity}
                                    ${
                                        category.quantity === 1
                                            ? "movimentação"
                                            : "movimentações"
                                    }
                                </small>
                            </span>

                            <strong class="report-category__value">
                                ${formatCurrency(category.value)}
                            </strong>
                        </div>

                        <div class="report-category__track">
                            <span
                                class="report-category__bar report-category__bar--${category.type}"
                                style="width: ${percentage}%; --progress-value: ${percentage}%;"
                            ></span>
                        </div>
                    </article>
                `;
            })
            .join("");
    };

    const calculateMonthlyData = () => {
        const monthlyMap = {};

        state.filteredTransactions.forEach(
            (transaction) => {
                const monthKey = getMonthKey(
                    transaction.date
                );

                if (!monthKey) {
                    return;
                }

                if (!monthlyMap[monthKey]) {
                    monthlyMap[monthKey] = {
                        monthKey,
                        incomes: 0,
                        expenses: 0,
                        balance: 0,
                        transactions: 0
                    };
                }

                if (transaction.type === "income") {
                    monthlyMap[monthKey].incomes +=
                        transaction.value;
                } else {
                    monthlyMap[monthKey].expenses +=
                        transaction.value;
                }

                monthlyMap[monthKey].transactions += 1;
            }
        );

        return Object.values(monthlyMap)
            .map((month) => {
                return {
                    ...month,
                    balance:
                        month.incomes -
                        month.expenses
                };
            })
            .sort((monthA, monthB) => {
                return monthA.monthKey.localeCompare(
                    monthB.monthKey
                );
            });
    };

    const renderMonthlyData = () => {
        if (!elements.monthlyList) {
            return;
        }

        const monthlyData = calculateMonthlyData();

        if (!monthlyData.length) {
            elements.monthlyList.innerHTML = `
                <p class="empty-card__text">
                    Nenhum resumo mensal disponível.
                </p>
            `;

            return;
        }

        elements.monthlyList.innerHTML = monthlyData
            .slice()
            .reverse()
            .map((month) => {
                return `
                    <article class="report-month">
                        <span class="report-month__info">
                            <strong class="report-month__name">
                                ${escapeHTML(formatMonth(month.monthKey))}
                            </strong>

                            <small class="report-month__meta">
                                ${month.transactions}
                                ${
                                    month.transactions === 1
                                        ? "movimentação"
                                        : "movimentações"
                                }
                            </small>
                        </span>

                        <span class="report-month__values">
                            <small>
                                Receitas
                                <strong class="is-positive">
                                    ${formatCurrency(month.incomes)}
                                </strong>
                            </small>

                            <small>
                                Despesas
                                <strong class="is-negative">
                                    ${formatCurrency(month.expenses)}
                                </strong>
                            </small>

                            <small>
                                Saldo
                                <strong class="${
                                    month.balance >= 0
                                        ? "is-positive"
                                        : "is-negative"
                                }">
                                    ${formatCurrency(month.balance)}
                                </strong>
                            </small>
                        </span>
                    </article>
                `;
            })
            .join("");
    };

    const getHighestExpenseCategory = () => {
        const categories = calculateCategories()
            .filter((category) => {
                return category.type === "expense";
            });

        return categories[0] || null;
    };

    const buildInsights = (summary) => {
        const insights = [];
        const highestExpenseCategory =
            getHighestExpenseCategory();

        const installmentSummary =
            calculateInstallmentSummary();

        const goalsSummary =
            calculateGoalsSummary();

        if (!summary.transactionCount) {
            return [
                {
                    type: "info",
                    title: "Sem movimentações no período",
                    message:
                        "Cadastre receitas e despesas ou altere os filtros para gerar uma análise."
                }
            ];
        }

        if (summary.balance > 0) {
            insights.push({
                type: "success",
                title: "Período positivo",
                message:
                    `Você terminou o período com saldo positivo de ${formatCurrency(summary.balance)}.`
            });
        } else if (summary.balance < 0) {
            insights.push({
                type: "danger",
                title: "Despesas acima das receitas",
                message:
                    `As despesas ultrapassaram as receitas em ${formatCurrency(Math.abs(summary.balance))}.`
            });
        } else {
            insights.push({
                type: "warning",
                title: "Orçamento equilibrado",
                message:
                    "As receitas cobriram exatamente as despesas, mas não houve valor disponível para economia."
            });
        }

        if (summary.totalIncomes > 0) {
            if (summary.savingsRate >= 20) {
                insights.push({
                    type: "success",
                    title: "Boa taxa de economia",
                    message:
                        `Você preservou ${formatPercentage(summary.savingsRate)} das receitas do período.`
                });
            } else if (summary.savingsRate > 0) {
                insights.push({
                    type: "warning",
                    title: "Economia abaixo de 20%",
                    message:
                        `Sua taxa de economia foi de ${formatPercentage(summary.savingsRate)}. Existe espaço para aumentar essa margem.`
                });
            }
        }

        if (highestExpenseCategory) {
            insights.push({
                type: "info",
                title: "Maior categoria de despesa",
                message:
                    `${getCategoryLabel(highestExpenseCategory.category)} representou ${formatCurrency(highestExpenseCategory.value)} no período.`
            });
        }

        if (summary.pendingIncomes > 0) {
            insights.push({
                type: "warning",
                title: "Receitas ainda previstas",
                message:
                    `Existem ${formatCurrency(summary.pendingIncomes)} em receitas que ainda não foram recebidas.`
            });
        }

        if (summary.pendingExpenses > 0) {
            insights.push({
                type: "warning",
                title: "Despesas pendentes",
                message:
                    `Existem ${formatCurrency(summary.pendingExpenses)} em despesas que ainda precisam ser pagas.`
            });
        }

        if (installmentSummary.monthlyCommitment > 0) {
            insights.push({
                type: "info",
                title: "Compromisso com parcelamentos",
                message:
                    `Os parcelamentos ativos comprometem aproximadamente ${formatCurrency(installmentSummary.monthlyCommitment)} por mês.`
            });
        }

        if (state.goals.length) {
            insights.push({
                type: goalsSummary.progress >= 100
                    ? "success"
                    : "info",

                title: "Progresso das metas",
                message:
                    `Você já alcançou ${formatPercentage(goalsSummary.progress)} do valor total das metas financeiras.`
            });
        }

        return insights.slice(0, 6);
    };

    const renderInsights = (summary) => {
        if (!elements.insights) {
            return;
        }

        const insights = buildInsights(summary);

        elements.insights.innerHTML = insights
            .map((insight) => {
                return `
                    <article class="report-insight report-insight--${insight.type}">
                        <span class="report-insight__indicator"></span>

                        <span class="report-insight__content">
                            <strong class="report-insight__title">
                                ${escapeHTML(insight.title)}
                            </strong>

                            <span class="report-insight__text">
                                ${escapeHTML(insight.message)}
                            </span>
                        </span>
                    </article>
                `;
            })
            .join("");
    };

    const drawChart = () => {
        const canvas = elements.chart;

        if (
            !canvas ||
            !(canvas instanceof HTMLCanvasElement)
        ) {
            return;
        }

        const monthlyData = calculateMonthlyData()
            .slice(-6);

        const containerWidth =
            canvas.parentElement?.clientWidth || 700;

        const width = Math.max(containerWidth, 320);
        const height = 300;
        const ratio = window.devicePixelRatio || 1;

        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const context = canvas.getContext("2d");

        context.setTransform(
            ratio,
            0,
            0,
            ratio,
            0,
            0
        );

        context.clearRect(0, 0, width, height);

        const styles = getComputedStyle(
            document.documentElement
        );

        const textColor =
            styles.getPropertyValue("--text-secondary").trim() ||
            "#64748b";

        const gridColor =
            styles.getPropertyValue("--border-color").trim() ||
            "#e2e8f0";

        const incomeColor =
            styles.getPropertyValue("--color-success").trim() ||
            "#15803d";

        const expenseColor =
            styles.getPropertyValue("--color-danger").trim() ||
            "#b42318";

        context.font =
            '12px Inter, system-ui, sans-serif';

        context.textAlign = "center";
        context.textBaseline = "middle";

        if (!monthlyData.length) {
            context.fillStyle = textColor;
            context.font =
                '14px Inter, system-ui, sans-serif';

            context.fillText(
                "Nenhum dado disponível para o gráfico.",
                width / 2,
                height / 2
            );

            return;
        }

        const padding = {
            top: 30,
            right: 20,
            bottom: 50,
            left: 55
        };

        const chartWidth =
            width - padding.left - padding.right;

        const chartHeight =
            height - padding.top - padding.bottom;

        const maximumValue = Math.max(
            ...monthlyData.flatMap((month) => {
                return [
                    month.incomes,
                    month.expenses
                ];
            }),
            1
        );

        context.strokeStyle = gridColor;
        context.lineWidth = 1;
        context.fillStyle = textColor;

        const gridLines = 4;

        for (
            let index = 0;
            index <= gridLines;
            index += 1
        ) {
            const y =
                padding.top +
                chartHeight / gridLines * index;

            const value =
                maximumValue -
                maximumValue / gridLines * index;

            context.beginPath();
            context.moveTo(padding.left, y);
            context.lineTo(
                width - padding.right,
                y
            );
            context.stroke();

            context.textAlign = "right";

            context.fillText(
                value.toLocaleString("pt-BR", {
                    notation: "compact",
                    maximumFractionDigits: 1
                }),
                padding.left - 8,
                y
            );
        }

        const groupWidth =
            chartWidth / monthlyData.length;

        const barWidth = Math.min(
            groupWidth * 0.26,
            28
        );

        monthlyData.forEach((month, index) => {
            const centerX =
                padding.left +
                groupWidth * index +
                groupWidth / 2;

            const incomeHeight =
                month.incomes /
                maximumValue *
                chartHeight;

            const expenseHeight =
                month.expenses /
                maximumValue *
                chartHeight;

            context.fillStyle = incomeColor;

            context.fillRect(
                centerX - barWidth - 2,
                padding.top +
                    chartHeight -
                    incomeHeight,
                barWidth,
                incomeHeight
            );

            context.fillStyle = expenseColor;

            context.fillRect(
                centerX + 2,
                padding.top +
                    chartHeight -
                    expenseHeight,
                barWidth,
                expenseHeight
            );

            const [, monthNumber] =
                month.monthKey
                    .split("-")
                    .map(Number);

            context.fillStyle = textColor;
            context.textAlign = "center";

            context.fillText(
                MONTH_NAMES[monthNumber - 1]
                    .slice(0, 3),
                centerX,
                height - 22
            );
        });

        const legendY = 14;

        context.fillStyle = incomeColor;
        context.fillRect(
            width / 2 - 100,
            legendY - 5,
            10,
            10
        );

        context.fillStyle = textColor;
        context.textAlign = "left";

        context.fillText(
            "Receitas",
            width / 2 - 84,
            legendY
        );

        context.fillStyle = expenseColor;
        context.fillRect(
            width / 2 + 10,
            legendY - 5,
            10,
            10
        );

        context.fillStyle = textColor;

        context.fillText(
            "Despesas",
            width / 2 + 26,
            legendY
        );
    };

    const updateEmptyState = () => {
        if (!elements.emptyState) {
            return;
        }

        elements.emptyState.hidden =
            state.filteredTransactions.length > 0;
    };

    const updateReportPeriodText = () => {
        const filters = getFilters();

        const periodElements = $$(
            ".report-period-text, [data-report-period-text]"
        );

        let text = "Todos os períodos";

        if (filters.startDate && filters.endDate) {
            text =
                `${formatDate(filters.startDate)} até ${formatDate(filters.endDate)}`;
        } else if (filters.startDate) {
            text =
                `A partir de ${formatDate(filters.startDate)}`;
        } else if (filters.endDate) {
            text =
                `Até ${formatDate(filters.endDate)}`;
        }

        periodElements.forEach((element) => {
            element.textContent = text;
        });
    };

    const updateSidebar = (summary) => {
        const sidebarBadge = getFirstElement(
            '.sidebar__link[href*="relatorios"] .sidebar__badge',
            "[data-report-sidebar-badge]"
        );

        if (sidebarBadge) {
            sidebarBadge.textContent =
                String(summary.transactionCount);
        }
    };

    const renderReport = () => {
        filterTransactions();

        const summary = calculateSummary();

        updateHero(summary);
        updateKpis(summary);
        renderTransactionList();
        renderTransactionTable();
        renderCategories();
        renderMonthlyData();
        renderInsights(summary);
        drawChart();
        updateEmptyState();
        updateReportPeriodText();
        updateSidebar(summary);
    };

    const showToast = ({
        type = "info",
        title,
        message
    }) => {
        if (window.FinlyToast?.show) {
            window.FinlyToast.show({
                type,
                title,
                message
            });

            return;
        }

        let container = $(".toast-container");

        if (!container) {
            container = document.createElement("div");
            container.className = "toast-container";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = `toast toast--${type}`;

        toast.innerHTML = `
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
                ×
            </button>

            <span class="toast__progress"></span>
        `;

        container.appendChild(toast);

        const removeToast = () => {
            if (!toast.isConnected) {
                return;
            }

            toast.classList.add("is-leaving");

            window.setTimeout(() => {
                toast.remove();
            }, 250);
        };

        $(".toast__close", toast)?.addEventListener(
            "click",
            removeToast
        );

        window.setTimeout(removeToast, 4200);
    };

    const escapeCSV = (value) => {
        const text = String(value ?? "");

        if (
            text.includes(";") ||
            text.includes('"') ||
            text.includes("\n")
        ) {
            return `"${text.replaceAll('"', '""')}"`;
        }

        return text;
    };

    const exportCSV = () => {
        if (!state.filteredTransactions.length) {
            showToast({
                type: "info",
                title: "Nada para exportar",
                message:
                    "Não existem movimentações no período selecionado."
            });

            return;
        }

        const rows = [
            [
                "Data",
                "Descrição",
                "Tipo",
                "Categoria",
                "Status",
                "Valor"
            ],

            ...state.filteredTransactions.map(
                (transaction) => {
                    const status =
                        getTransactionStatus(transaction);

                    return [
                        formatDate(transaction.date),
                        transaction.name,
                        transaction.type === "income"
                            ? "Receita"
                            : "Despesa",
                        getCategoryLabel(
                            transaction.category
                        ),
                        status.label,
                        transaction.value.toFixed(2)
                            .replace(".", ",")
                    ];
                }
            )
        ];

        const csv = rows
            .map((row) => {
                return row
                    .map(escapeCSV)
                    .join(";");
            })
            .join("\n");

        const file = new Blob(
            [`\uFEFF${csv}`],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );

        const url = URL.createObjectURL(file);
        const link = document.createElement("a");

        link.href = url;
        link.download =
            `finly-relatorio-${toISODate(new Date())}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        showToast({
            type: "success",
            title: "Relatório exportado",
            message:
                "O arquivo CSV foi gerado com sucesso."
        });
    };

    const printReport = () => {
        window.print();
    };

    const resetFilters = () => {
        reportForm?.reset();

        if (fields.period) {
            fields.period.value = "current-month";
        }

        if (fields.type) {
            fields.type.value = "all";
        }

        if (fields.category) {
            fields.category.value = "all";
        }

        if (fields.search) {
            fields.search.value = "";
        }

        applyPeriodSelection();
        renderReport();

        showToast({
            type: "info",
            title: "Filtros redefinidos",
            message:
                "O relatório voltou para o mês atual."
        });
    };

    const setupForm = () => {
        reportForm?.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();
                renderReport();
            }
        );

        fields.period?.addEventListener(
            "change",
            () => {
                applyPeriodSelection();
                renderReport();
            }
        );

        fields.startDate?.addEventListener(
            "change",
            () => {
                if (fields.period) {
                    fields.period.value = "custom";
                }

                renderReport();
            }
        );

        fields.endDate?.addEventListener(
            "change",
            () => {
                if (fields.period) {
                    fields.period.value = "custom";
                }

                renderReport();
            }
        );

        fields.type?.addEventListener(
            "change",
            renderReport
        );

        fields.category?.addEventListener(
            "change",
            renderReport
        );

        fields.search?.addEventListener(
            "input",
            renderReport
        );
    };

    const setupButtons = () => {
        const exportButtons = $$(
            "[data-action='export-report'], .report-export"
        );

        exportButtons.forEach((button) => {
            button.addEventListener(
                "click",
                exportCSV
            );
        });

        const printButtons = $$(
            "[data-action='print-report'], .report-print"
        );

        printButtons.forEach((button) => {
            button.addEventListener(
                "click",
                printReport
            );
        });

        const resetButtons = $$(
            "[data-action='reset-report'], .report-reset"
        );

        resetButtons.forEach((button) => {
            button.addEventListener(
                "click",
                resetFilters
            );
        });
    };

    const setupResponsiveChart = () => {
        window.addEventListener("resize", () => {
            window.clearTimeout(
                state.chartResizeTimeout
            );

            state.chartResizeTimeout =
                window.setTimeout(
                    drawChart,
                    180
                );
        });
    };

    const setupStorageSubscription = () => {
        const storage = getStorage();

        if (!storage?.subscribe) {
            return;
        }

        state.unsubscribeStorage =
            storage.subscribe((change) => {
                const relevantKeys = [
                    "finly_incomes",
                    "finly_expenses",
                    "finly_installments",
                    "finly_goals"
                ];

                if (
                    !change?.key ||
                    !relevantKeys.includes(change.key)
                ) {
                    return;
                }

                loadData();
                renderReport();
            });
    };

    const init = () => {
        if (!getStorage()) {
            return;
        }

        loadData();
        initializePeriod();

        setupForm();
        setupButtons();
        setupResponsiveChart();
        setupStorageSubscription();

        renderReport();
    };

    document.addEventListener(
        "DOMContentLoaded",
        init
    );
})();