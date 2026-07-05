(() => {
    const STORAGE_KEYS = {
        incomes: "finly_incomes",
        expenses: "finly_expenses",
        installments: "finly_installments",
        goals: "finly_goals"
    };

    const fallbackData = {
        incomes: [
            {
                id: "income-1",
                name: "Salário",
                value: 1700,
                date: "2026-07-10",
                category: "salary",
                status: "received"
            }
        ],
        expenses: [
            {
                id: "expense-1",
                name: "Academia",
                value: 170,
                date: "2026-07-20",
                type: "fixed",
                category: "health",
                status: "paid"
            },
            {
                id: "expense-2",
                name: "Futevôlei",
                value: 320,
                date: "2026-07-05",
                type: "fixed",
                category: "health",
                status: "paid"
            },
            {
                id: "expense-3",
                name: "Spotify",
                value: 12.9,
                date: "2026-07-14",
                type: "subscription",
                category: "other",
                status: "paid"
            },
            {
                id: "expense-4",
                name: "Parcela Nubank",
                value: 385.87,
                date: "2026-07-24",
                type: "installment",
                category: "card",
                status: "pending"
            }
        ],
        installments: [
            {
                id: "installment-1",
                name: "Parcela Nubank",
                total: 1929.35,
                totalParts: 5,
                paidParts: 2,
                dueDate: "2026-07-24",
                card: "nubank"
            },
            {
                id: "installment-2",
                name: "Renner",
                total: 400,
                totalParts: 2,
                paidParts: 1,
                dueDate: "2026-07-24",
                card: "renner"
            }
        ],
        goals: [
            {
                id: "goal-1",
                name: "Reserva inicial",
                target: 2000,
                current: 680,
                deadline: "2026-12-30",
                type: "reserve"
            }
        ]
    };

    const expenseCategoryLabels = {
        food: "Alimentação",
        transport: "Transporte",
        health: "Saúde e esporte",
        home: "Casa",
        card: "Cartão",
        other: "Outros",
        installments: "Parcelamentos"
    };

    const $ = (selector, parent = document) => parent.querySelector(selector);
    const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

    const formatCurrency = (value) => {
        return Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    };

    const formatPercent = (value) => {
        return `${Math.max(Math.round(value || 0), 0)}%`;
    };

    const formatMonth = (date) => {
        return date.toLocaleDateString("pt-BR", {
            month: "short"
        }).replace(".", "");
    };

    const parseDate = (date) => {
        if (!date) return null;
        return new Date(`${date}T12:00:00`);
    };

    const getMonthKey = (date) => {
        const parsedDate = date instanceof Date ? date : parseDate(date);
        if (!parsedDate || Number.isNaN(parsedDate.getTime())) return "";

        return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}`;
    };

    const readStorage = (key, fallback) => {
        const stored = localStorage.getItem(key);

        if (!stored) return fallback;

        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : fallback;
        } catch {
            return fallback;
        }
    };

    const getData = () => {
        return {
            incomes: readStorage(STORAGE_KEYS.incomes, fallbackData.incomes),
            expenses: readStorage(STORAGE_KEYS.expenses, fallbackData.expenses),
            installments: readStorage(STORAGE_KEYS.installments, fallbackData.installments),
            goals: readStorage(STORAGE_KEYS.goals, fallbackData.goals)
        };
    };

    const getInstallmentPartValue = (installment) => {
        return Number(installment.total || 0) / Number(installment.totalParts || 1);
    };

    const getInstallmentOpenValue = (installment) => {
        const remainingParts = Math.max(Number(installment.totalParts || 0) - Number(installment.paidParts || 0), 0);
        return getInstallmentPartValue(installment) * remainingParts;
    };

    const getReferenceDate = (data) => {
        const dates = [
            ...data.incomes.map((item) => item.date),
            ...data.expenses.map((item) => item.date),
            ...data.installments.map((item) => item.dueDate),
            ...data.goals.map((item) => item.deadline)
        ]
            .map(parseDate)
            .filter((date) => date && !Number.isNaN(date.getTime()))
            .sort((a, b) => b - a);

        return dates[0] || new Date();
    };

    const getMonthList = (referenceDate, amount) => {
        return Array.from({ length: amount }).map((_, index) => {
            const date = new Date(referenceDate);
            date.setMonth(referenceDate.getMonth() - (amount - 1 - index));

            return {
                date,
                key: getMonthKey(date),
                label: formatMonth(date)
            };
        });
    };

    const calculateMonth = (data, monthKey) => {
        const incomes = data.incomes
            .filter((income) => income.status !== "pending")
            .filter((income) => getMonthKey(income.date) === monthKey)
            .reduce((sum, income) => sum + Number(income.value || 0), 0);

        const expenses = data.expenses
            .filter((expense) => getMonthKey(expense.date) === monthKey)
            .reduce((sum, expense) => sum + Number(expense.value || 0), 0);

        const installmentExpenses = data.installments
            .filter((installment) => Number(installment.paidParts || 0) < Number(installment.totalParts || 0))
            .filter((installment) => getMonthKey(installment.dueDate) === monthKey)
            .reduce((sum, installment) => sum + getInstallmentPartValue(installment), 0);

        const totalExpenses = expenses + installmentExpenses;
        const balance = incomes - totalExpenses;
        const savingsRate = incomes > 0 ? (balance / incomes) * 100 : 0;

        return {
            incomes,
            expenses: totalExpenses,
            balance,
            savingsRate
        };
    };

    const getHistory = (data, amount) => {
        const referenceDate = getReferenceDate(data);
        const months = getMonthList(referenceDate, amount);
        const currentKey = getMonthKey(referenceDate);
        const currentMonth = calculateMonth(data, currentKey);

        const incomeBase = Math.max(currentMonth.incomes, 1700);
        const expenseBase = Math.max(currentMonth.expenses, 700);
        const incomeFactors = [0.88, 0.94, 1, 0.91, 0.98, 1];
        const expenseFactors = [0.76, 0.84, 0.68, 0.92, 0.74, 1];

        return months.map((month, index) => {
            const monthData = calculateMonth(data, month.key);
            const hasRealData = monthData.incomes > 0 || monthData.expenses > 0;

            if (hasRealData) {
                return {
                    ...month,
                    ...monthData
                };
            }

            const incomeFactor = incomeFactors[index % incomeFactors.length];
            const expenseFactor = expenseFactors[index % expenseFactors.length];
            const incomes = incomeBase * incomeFactor;
            const expenses = expenseBase * expenseFactor;

            return {
                ...month,
                incomes,
                expenses,
                balance: incomes - expenses,
                savingsRate: incomes > 0 ? ((incomes - expenses) / incomes) * 100 : 0
            };
        });
    };

    const getCurrentSummary = (data) => {
        const referenceDate = getReferenceDate(data);
        const monthKey = getMonthKey(referenceDate);
        const current = calculateMonth(data, monthKey);

        const activeInstallments = data.installments.filter((item) => {
            return Number(item.paidParts || 0) < Number(item.totalParts || 0);
        });

        const openInstallments = activeInstallments.reduce((sum, item) => {
            return sum + getInstallmentOpenValue(item);
        }, 0);

        const totalGoals = data.goals.reduce((sum, goal) => {
            return sum + Number(goal.target || 0);
        }, 0);

        const savedGoals = data.goals.reduce((sum, goal) => {
            return sum + Number(goal.current || 0);
        }, 0);

        return {
            ...current,
            referenceDate,
            activeInstallments,
            openInstallments,
            totalGoals,
            savedGoals,
            activeGoals: data.goals.filter((goal) => Number(goal.current || 0) < Number(goal.target || 0)).length
        };
    };

    const getCategoryTotals = (data, monthKey) => {
        const categories = {};

        data.expenses
            .filter((expense) => getMonthKey(expense.date) === monthKey)
            .forEach((expense) => {
                const category = expense.category || "other";
                categories[category] = (categories[category] || 0) + Number(expense.value || 0);
            });

        const installmentMonthTotal = data.installments
            .filter((installment) => Number(installment.paidParts || 0) < Number(installment.totalParts || 0))
            .filter((installment) => getMonthKey(installment.dueDate) === monthKey)
            .reduce((sum, installment) => sum + getInstallmentPartValue(installment), 0);

        if (installmentMonthTotal > 0) {
            categories.installments = installmentMonthTotal;
        }

        return Object.entries(categories)
            .map(([category, value]) => ({
                category,
                label: expenseCategoryLabels[category] || "Outros",
                value
            }))
            .sort((a, b) => b.value - a.value);
    };

    const calculateHealthScore = (summary) => {
        let score = 55;

        if (summary.balance > 0) score += 15;
        if (summary.savingsRate >= 20) score += 12;
        if (summary.savingsRate >= 40) score += 8;
        if (summary.activeGoals > 0) score += 5;

        const expenseRate = summary.incomes > 0 ? (summary.expenses / summary.incomes) * 100 : 100;

        if (expenseRate > 70) score -= 12;
        if (summary.openInstallments > summary.incomes) score -= 8;
        if (summary.balance < 0) score -= 18;

        return Math.max(Math.min(Math.round(score), 100), 0);
    };

    const setText = (selector, value) => {
        const element = $(selector);
        if (element) element.textContent = value;
    };

    const updateKpis = (summary) => {
        const balanceText = formatCurrency(summary.balance);
        const savingsRate = Math.max(summary.savingsRate, 0);

        setText(".reports-hero-card__value", balanceText);

        const heroText = $(".reports-hero-card__text");
        if (heroText) {
            heroText.textContent = summary.balance >= 0
                ? "Seu mês está positivo. Aproveite esse cenário para fortalecer sua reserva e acelerar suas metas."
                : "Seu mês está negativo. O ideal é revisar gastos, parcelas e compras variáveis antes de assumir novos compromissos.";
        }

        const heroPills = $$(".reports-hero-card__footer .reports-pill");

        if (heroPills[0]) {
            heroPills[0].textContent = `${formatPercent(savingsRate)} da renda preservada`;
        }

        if (heroPills[1]) {
            heroPills[1].textContent = `${formatCurrency(summary.expenses)} em gastos totais`;
        }

        const kpiValues = $$(".reports-kpi__value");

        if (kpiValues[0]) kpiValues[0].textContent = formatCurrency(summary.incomes);
        if (kpiValues[1]) kpiValues[1].textContent = formatCurrency(summary.expenses);
        if (kpiValues[2]) kpiValues[2].textContent = formatPercent(savingsRate);

        const badge = $(".sidebar-card .badge");

        if (badge) {
            badge.textContent = summary.balance >= 0
                ? `${formatCurrency(summary.balance)} positivo`
                : `${formatCurrency(Math.abs(summary.balance))} negativo`;

            badge.classList.toggle("badge--success", summary.balance >= 0);
            badge.classList.toggle("badge--danger", summary.balance < 0);
            badge.classList.remove("badge--primary");
        }
    };

    const updateChart = (history) => {
        const chart = $(".reports-chart");
        if (!chart) return;

        const maxValue = Math.max(
            ...history.map((item) => item.incomes),
            ...history.map((item) => item.expenses),
            1
        );

        chart.innerHTML = history.map((item) => {
            const incomeHeight = Math.max((item.incomes / maxValue) * 100, 8);
            const expenseHeight = Math.max((item.expenses / maxValue) * 100, 8);

            return `
                <div class="reports-chart__item">
                    <div class="reports-chart__bars">
                        <span class="reports-chart__bar reports-chart__bar--income" style="--bar-value: ${incomeHeight}%;"></span>
                        <span class="reports-chart__bar reports-chart__bar--expense" style="--bar-value: ${expenseHeight}%;"></span>
                    </div>
                    <span class="reports-chart__label">${item.label}</span>
                </div>
            `;
        }).join("");
    };

    const updateCategories = (data, summary) => {
        const wrapper = $(".reports-categories");
        if (!wrapper) return;

        const monthKey = getMonthKey(summary.referenceDate);
        const categories = getCategoryTotals(data, monthKey);
        const total = categories.reduce((sum, item) => sum + item.value, 0);

        if (!categories.length) {
            wrapper.innerHTML = `
                <div class="empty-card">
                    <h3 class="empty-card__title">Sem categorias</h3>
                    <p class="empty-card__text">Cadastre despesas para visualizar os gastos por categoria.</p>
                </div>
            `;
            return;
        }

        wrapper.innerHTML = categories.slice(0, 4).map((item) => {
            const percent = total > 0 ? Math.min((item.value / total) * 100, 100) : 0;

            return `
                <div class="reports-category" data-report-search="${item.label.toLowerCase()}">
                    <div class="reports-category__top">
                        <span class="reports-category__name">${item.label}</span>
                        <strong class="reports-category__value">${formatCurrency(item.value)}</strong>
                    </div>

                    <div class="reports-category__track">
                        <span class="reports-category__bar" style="--progress-value: ${percent}%;"></span>
                    </div>
                </div>
            `;
        }).join("");
    };

    const updateHealth = (summary) => {
        const score = calculateHealthScore(summary);

        setText(".reports-balance-card__value", `${score}/100`);

        const bar = $(".reports-balance-card__bar");
        if (bar) bar.style.setProperty("--progress-value", `${score}%`);

        const text = $(".reports-balance-card__text");

        if (text) {
            if (score >= 80) {
                text.textContent = "Sua saúde financeira está muito boa. Continue mantendo gastos controlados.";
            } else if (score >= 60) {
                text.textContent = "Sua saúde financeira está estável, mas ainda existe espaço para melhorar.";
            } else {
                text.textContent = "Sua saúde financeira pede atenção. Revise despesas, parcelas e metas.";
            }
        }
    };

    const updateInsights = (summary) => {
        const wrapper = $(".reports-insights");
        if (!wrapper) return;

        const insights = [];

        if (summary.balance >= 0) {
            insights.push({
                type: "success",
                title: "Mês positivo",
                text: `Seu saldo estimado está positivo em ${formatCurrency(summary.balance)}. Esse valor pode fortalecer suas metas.`
            });
        } else {
            insights.push({
                type: "danger",
                title: "Mês negativo",
                text: `Faltam ${formatCurrency(Math.abs(summary.balance))} para equilibrar o mês. Revise os gastos mais pesados.`
            });
        }

        if (summary.openInstallments > 0) {
            insights.push({
                type: "danger",
                title: "Parcelamentos pedem atenção",
                text: `Você ainda possui ${formatCurrency(summary.openInstallments)} em parcelas abertas. Evite assumir novas compras longas agora.`
            });
        }

        if (summary.savedGoals > 0) {
            insights.push({
                type: "primary",
                title: "Metas em movimento",
                text: `Você já guardou ${formatCurrency(summary.savedGoals)} em metas. Manter aportes pequenos já ajuda bastante.`
            });
        } else {
            insights.push({
                type: "primary",
                title: "Comece uma meta",
                text: "Criar uma meta simples ajuda a dar direção para o dinheiro que sobra no mês."
            });
        }

        wrapper.innerHTML = insights.map((insight) => {
            const iconClass = insight.type === "success"
                ? "reports-insight__icon--success"
                : insight.type === "danger"
                    ? "reports-insight__icon--danger"
                    : "";

            return `
                <article class="reports-insight" data-report-search="${`${insight.title} ${insight.text}`.toLowerCase()}">
                    <span class="reports-insight__icon ${iconClass}">
                        ${getInsightIcon(insight.type)}
                    </span>

                    <span class="reports-insight__content">
                        <strong class="reports-insight__title">${insight.title}</strong>
                        <span class="reports-insight__text">${insight.text}</span>
                    </span>
                </article>
            `;
        }).join("");
    };

    const getInsightIcon = (type) => {
        if (type === "success") {
            return `
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        }

        if (type === "danger") {
            return `
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 8v5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                    <path d="M12 17h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                    <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" stroke-width="2"/>
                </svg>
            `;
        }

        return `
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 19 9 14l4 4 7-9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M15 9h5v5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    };

    const updateTable = (history) => {
        const tbody = $(".reports-table tbody");
        if (!tbody) return;

        tbody.innerHTML = [...history]
            .reverse()
            .slice(0, 6)
            .map((item) => {
                const balanceClass = item.balance >= 0 ? "reports-table__positive" : "reports-table__negative";
                const badgeClass = item.balance >= 0 ? "badge--success" : "badge--danger";
                const status = item.balance >= 0 ? "positivo" : "negativo";

                return `
                    <tr data-report-search="${item.label.toLowerCase()} ${status}">
                        <td><strong>${item.label}</strong></td>
                        <td>${formatCurrency(item.incomes)}</td>
                        <td>${formatCurrency(item.expenses)}</td>
                        <td><span class="${balanceClass}">${formatCurrency(item.balance)}</span></td>
                        <td>${formatPercent(item.savingsRate)}</td>
                        <td><span class="badge ${badgeClass}">${status}</span></td>
                    </tr>
                `;
            })
            .join("");
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

    const filterReport = () => {
        const searchTerm = $(".topbar__search input")?.value.trim().toLowerCase() || "";
        const searchableItems = $$("[data-report-search], .reports-insight, .reports-category, .reports-table tbody tr");

        searchableItems.forEach((item) => {
            const text = (
                item.dataset.reportSearch ||
                item.textContent ||
                ""
            ).toLowerCase();

            item.style.display = !searchTerm || text.includes(searchTerm) ? "" : "none";
        });
    };

    const generateAiAnalysis = (summary) => {
        if (summary.balance >= 0 && summary.savingsRate >= 30) {
            showToast({
                type: "success",
                title: "Análise Finly",
                message: `Seu mês está saudável. Você preservou ${formatPercent(summary.savingsRate)} da renda e pode direcionar parte disso para metas.`
            });

            return;
        }

        if (summary.balance >= 0) {
            showToast({
                type: "info",
                title: "Análise Finly",
                message: "Você está no positivo, mas ainda pode melhorar reduzindo gastos variáveis e parcelamentos."
            });

            return;
        }

        showToast({
            type: "danger",
            title: "Análise Finly",
            message: "Seu mês está negativo. Priorize cortar gastos não essenciais antes de assumir novas parcelas."
        });
    };

    const setupActions = (summary) => {
        const headerButtons = $$(".reports-header__actions .btn");
        const exportButton = headerButtons.find((button) => button.textContent.trim().toLowerCase().includes("exportar"));
        const aiButton = headerButtons.find((button) => button.textContent.trim().toLowerCase().includes("ia"));
        const recommendationButton = $(".reports-balance-card .btn");

        exportButton?.addEventListener("click", () => {
            showToast({
                type: "info",
                title: "Exportação iniciada",
                message: "A janela de impressão será aberta para salvar o relatório em PDF."
            });

            setTimeout(() => window.print(), 500);
        });

        aiButton?.addEventListener("click", () => generateAiAnalysis(summary));

        recommendationButton?.addEventListener("click", () => {
            showToast({
                type: "info",
                title: "Recomendação Finly",
                message: summary.balance >= 0
                    ? "Separe uma parte do saldo positivo para metas e evite aumentar parcelas neste mês."
                    : "Revise despesas variáveis, pause compras novas e reorganize os vencimentos mais próximos."
            });
        });

        $(".reports-filter .btn")?.addEventListener("click", renderReport);
        $("#reportPeriod")?.addEventListener("change", renderReport);
        $(".topbar__search input")?.addEventListener("input", filterReport);
    };

    const renderReport = () => {
        const data = getData();
        const period = Number($("#reportPeriod")?.value || 6);
        const history = getHistory(data, period);
        const summary = getCurrentSummary(data);

        updateKpis(summary);
        updateChart(history);
        updateCategories(data, summary);
        updateHealth(summary);
        updateInsights(summary);
        updateTable(history);
        filterReport();
    };

    const init = () => {
        const reportsPage = $(".reports-page");
        if (!reportsPage) return;

        const data = getData();
        const summary = getCurrentSummary(data);

        renderReport();
        setupActions(summary);
    };

    document.addEventListener("DOMContentLoaded", init);
})();
