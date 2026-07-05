(() => {
    const STORAGE_KEY = "finly_goals";

    const goalTypes = {
        reserve: {
            label: "Reserva",
            icon: "money"
        },
        travel: {
            label: "Viagem",
            icon: "travel"
        },
        study: {
            label: "Estudo",
            icon: "book"
        },
        business: {
            label: "Negócio",
            icon: "briefcase"
        },
        purchase: {
            label: "Compra",
            icon: "bag"
        },
        other: {
            label: "Outros",
            icon: "plus"
        }
    };

    const defaultGoals = [
        {
            id: crypto.randomUUID(),
            name: "Reserva inicial",
            target: 2000,
            current: 680,
            deadline: "2026-12-30",
            type: "reserve",
            description: "Guardar uma reserva para ter mais segurança."
        },
        {
            id: crypto.randomUUID(),
            name: "Viagem futura",
            target: 1500,
            current: 0,
            deadline: "2027-01-15",
            type: "travel",
            description: "Meta para uma viagem planejada."
        }
    ];

    const $ = (selector, parent = document) => parent.querySelector(selector);
    const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

    const form = $(".goal-form");
    const list = $(".goal-list");
    const typeCards = $$(".goal-type");
    const searchInputs = $$(".topbar__search input, .goal-filter input");

    let goals = [];
    let editingId = null;

    const formatCurrency = (value) => {
        return Number(value).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    };

    const formatDate = (date) => {
        if (!date) return "Sem prazo";

        const fixedDate = new Date(`${date}T12:00:00`);

        return fixedDate.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short"
        });
    };

    const getProgress = (goal) => {
        if (!goal.target) return 0;

        return Math.min(Math.round((Number(goal.current) / Number(goal.target)) * 100), 100);
    };

    const getRemaining = (goal) => {
        return Math.max(Number(goal.target) - Number(goal.current), 0);
    };

    const getStatus = (goal) => {
        const progress = getProgress(goal);

        if (progress >= 100) {
            return {
                label: "Concluída",
                className: "goal-status--success"
            };
        }

        if (progress === 0) {
            return {
                label: "Começando",
                className: "goal-status--warning"
            };
        }

        return {
            label: "Em andamento",
            className: ""
        };
    };

    const getIcon = (type) => {
        const icons = {
            money: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3v18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                    <path d="M17 7.5c0-1.38-2.24-2.5-5-2.5S7 6.12 7 7.5 9.24 10 12 10s5 1.12 5 2.5S14.76 15 12 15s-5-1.12-5-2.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
            `,
            travel: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 11 21 3l-8 18-2-8-8-2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
            `,
            book: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 19.5V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-1.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M8 7h7M8 11h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            briefcase: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 7h16v12H4V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M9 7V5h6v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            bag: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 11h14l-1.5 8h-11L5 11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            plus: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

    const saveGoals = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    };

    const loadGoals = () => {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            goals = defaultGoals;
            saveGoals();
            return;
        }

        try {
            goals = JSON.parse(stored);
        } catch {
            goals = defaultGoals;
            saveGoals();
        }
    };

    const getSelectedType = () => {
        return $(".goal-type input:checked")?.value || "reserve";
    };

    const setActiveType = () => {
        typeCards.forEach((card) => {
            const input = $("input", card);
            card.classList.toggle("is-active", input.checked);
        });
    };

    const validateGoal = () => {
        const name = $("#goalName").value.trim();
        const target = Number($("#goalTarget").value);
        const current = Number($("#goalCurrent").value);
        const deadline = $("#goalDeadline").value;

        if (!name) {
            showToast({
                type: "danger",
                title: "Nome obrigatório",
                message: "Digite o nome da meta antes de salvar."
            });

            return false;
        }

        if (!target || target <= 0) {
            showToast({
                type: "danger",
                title: "Valor inválido",
                message: "Digite um valor de meta maior que zero."
            });

            return false;
        }

        if (current < 0) {
            showToast({
                type: "danger",
                title: "Valor inválido",
                message: "O valor guardado não pode ser negativo."
            });

            return false;
        }

        if (current > target) {
            showToast({
                type: "danger",
                title: "Valor acima da meta",
                message: "O valor guardado não pode ser maior que o objetivo."
            });

            return false;
        }

        if (!deadline) {
            showToast({
                type: "danger",
                title: "Prazo obrigatório",
                message: "Informe um prazo para acompanhar sua meta."
            });

            return false;
        }

        return true;
    };

    const getFormData = () => {
        return {
            id: editingId || crypto.randomUUID(),
            name: $("#goalName").value.trim(),
            target: Number($("#goalTarget").value),
            current: Number($("#goalCurrent").value),
            deadline: $("#goalDeadline").value,
            type: getSelectedType(),
            description: $("#goalDescription").value.trim()
        };
    };

    const resetForm = () => {
        form.reset();
        editingId = null;

        const reserveInput = $(".goal-type input[value='reserve']");
        if (reserveInput) reserveInput.checked = true;

        setActiveType();
        setupDefaultDeadline();

        const button = $(".goal-form [type='submit']");
        if (button) button.textContent = "Salvar meta";
    };

    const renderGoal = (goal) => {
        const type = goalTypes[goal.type] || goalTypes.other;
        const progress = getProgress(goal);
        const remaining = getRemaining(goal);
        const status = getStatus(goal);

        return `
            <article class="goal-item" data-goal-id="${goal.id}">
                <div class="goal-item__top">
                    <div class="goal-item__main">
                        <span class="goal-item__icon">
                            ${getIcon(type.icon)}
                        </span>

                        <span class="goal-item__info">
                            <strong class="goal-item__title">${goal.name}</strong>
                            <span class="goal-item__meta">${type.label} • prazo ${formatDate(goal.deadline)}</span>
                        </span>
                    </div>

                    <div class="goal-item__value">
                        <strong class="goal-item__amount">${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}</strong>
                        <span class="goal-item__small">faltam ${formatCurrency(remaining)}</span>
                    </div>
                </div>

                <div class="goal-progress">
                    <div class="goal-progress__top">
                        <span>Progresso da meta</span>
                        <span>${progress}%</span>
                    </div>

                    <div class="goal-progress__track">
                        <span class="goal-progress__bar" style="--progress-value: ${progress}%;"></span>
                    </div>
                </div>

                <div class="goal-item__footer">
                    <span class="goal-status ${status.className}">${status.label}</span>

                    <div class="goal-item__actions">
                        <button class="btn btn-ghost btn-sm" type="button" data-action="deposit">Adicionar valor</button>
                        <button class="btn btn-ghost btn-sm" type="button" data-action="edit">Editar</button>
                        <button class="btn btn-ghost btn-sm" type="button" data-action="delete">Excluir</button>
                    </div>
                </div>
            </article>
        `;
    };

    const renderGoals = (items = goals) => {
        if (!list) return;

        if (!items.length) {
            list.innerHTML = `
                <div class="empty-card">
                    <span class="empty-card__icon">
                        ${getIcon("plus")}
                    </span>

                    <h3 class="empty-card__title">Nenhuma meta encontrada</h3>
                    <p class="empty-card__text">Crie uma nova meta para acompanhar seu progresso aqui.</p>
                </div>
            `;

            return;
        }

        list.innerHTML = items
            .sort((a, b) => getProgress(b) - getProgress(a))
            .map(renderGoal)
            .join("");
    };

    const updateSummary = () => {
        const activeGoals = goals.filter((goal) => getProgress(goal) < 100);
        const completedGoals = goals.filter((goal) => getProgress(goal) >= 100);

        const totalTarget = goals.reduce((sum, goal) => sum + Number(goal.target), 0);
        const totalCurrent = goals.reduce((sum, goal) => sum + Number(goal.current), 0);
        const totalRemaining = Math.max(totalTarget - totalCurrent, 0);

        const averageProgress = goals.length
            ? Math.round(goals.reduce((sum, goal) => sum + getProgress(goal), 0) / goals.length)
            : 0;

        $(".goals-hero-card__value").textContent = formatCurrency(totalCurrent);

        const heroPills = $$(".goals-hero-card__footer .goals-pill");
        if (heroPills[0]) heroPills[0].textContent = `${averageProgress}% do progresso geral`;
        if (heroPills[1]) heroPills[1].textContent = `${formatCurrency(totalRemaining)} para concluir`;

        const kpiValues = $$(".goals-kpi__value");
        if (kpiValues[0]) kpiValues[0].textContent = activeGoals.length;
        if (kpiValues[1]) kpiValues[1].textContent = formatCurrency(totalCurrent);
        if (kpiValues[2]) kpiValues[2].textContent = `${averageProgress}%`;

        const summaryValues = $$(".goals-summary__value");
        if (summaryValues[0]) summaryValues[0].textContent = formatCurrency(totalTarget);
        if (summaryValues[1]) summaryValues[1].textContent = formatCurrency(totalCurrent);
        if (summaryValues[2]) summaryValues[2].textContent = formatCurrency(totalRemaining);
        if (summaryValues[3]) summaryValues[3].textContent = completedGoals.length;

        $(".sidebar-card .badge").textContent = `${activeGoals.length} metas`;

        updateFeaturedGoal();
        updateRanking();
    };

    const updateFeaturedGoal = () => {
        const featured = $(".goal-featured");
        if (!featured) return;

        const orderedGoals = [...goals].sort((a, b) => {
            if (getProgress(b) !== getProgress(a)) {
                return getProgress(b) - getProgress(a);
            }

            return Number(b.current) - Number(a.current);
        });

        const goal = orderedGoals[0];

        if (!goal) {
            featured.innerHTML = `
                <div class="empty-card">
                    <h3 class="empty-card__title">Sem meta em destaque</h3>
                    <p class="empty-card__text">Crie uma meta para ela aparecer aqui.</p>
                </div>
            `;
            return;
        }

        const progress = getProgress(goal);
        const remaining = getRemaining(goal);

        featured.innerHTML = `
            <div class="goal-featured__top">
                <div>
                    <strong class="goal-featured__title">${goal.name}</strong>
                    <p class="goal-featured__text">${goal.description || "Meta financeira em andamento."}</p>
                </div>

                <strong class="goal-featured__amount">${progress}%</strong>
            </div>

            <div class="goal-progress">
                <div class="goal-progress__top">
                    <span>${formatCurrency(goal.current)} guardados</span>
                    <span>${formatCurrency(remaining)} restantes</span>
                </div>

                <div class="goal-progress__track">
                    <span class="goal-progress__bar" style="--progress-value: ${progress}%;"></span>
                </div>
            </div>

            <button class="btn btn-primary btn-block" type="button" data-featured-goal="${goal.id}">
                Atualizar meta
            </button>
        `;
    };

    const updateRanking = () => {
        const ranking = $(".goals-ranking");
        if (!ranking) return;

        if (!goals.length) {
            ranking.innerHTML = `
                <div class="empty-card">
                    <h3 class="empty-card__title">Sem ranking</h3>
                    <p class="empty-card__text">As metas aparecerão aqui conforme forem criadas.</p>
                </div>
            `;
            return;
        }

        ranking.innerHTML = [...goals]
            .sort((a, b) => getProgress(b) - getProgress(a))
            .slice(0, 3)
            .map((goal, index) => {
                return `
                    <article class="goals-ranking__item">
                        <span class="goals-ranking__position">${index + 1}</span>

                        <span class="goals-ranking__info">
                            <strong class="goals-ranking__title">${goal.name}</strong>
                            <span class="goals-ranking__text">${getProgress(goal)}% concluído • ${formatCurrency(goal.current)} guardados</span>
                        </span>
                    </article>
                `;
            })
            .join("");
    };

    const filterGoals = () => {
        const terms = searchInputs
            .map((input) => input.value.trim().toLowerCase())
            .filter(Boolean);

        if (!terms.length) {
            renderGoals();
            return;
        }

        const filtered = goals.filter((goal) => {
            const type = goalTypes[goal.type]?.label || "";
            const text = `${goal.name} ${type} ${goal.description}`.toLowerCase();

            return terms.every((term) => text.includes(term));
        });

        renderGoals(filtered);
    };

    const fillFormToEdit = (goal) => {
        editingId = goal.id;

        $("#goalName").value = goal.name;
        $("#goalTarget").value = goal.target;
        $("#goalCurrent").value = goal.current;
        $("#goalDeadline").value = goal.deadline;
        $("#goalDescription").value = goal.description || "";

        const typeInput = $(`.goal-type input[value="${goal.type}"]`);
        if (typeInput) typeInput.checked = true;

        setActiveType();

        const button = $(".goal-form [type='submit']");
        if (button) button.textContent = "Salvar alterações";

        $("#nova-meta").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    };

    const deleteGoal = (id) => {
        goals = goals.filter((goal) => goal.id !== id);

        saveGoals();
        renderGoals();
        updateSummary();

        showToast({
            type: "success",
            title: "Meta excluída",
            message: "A meta foi removida da sua lista."
        });
    };

    const depositGoal = (id) => {
        const goal = goals.find((item) => item.id === id);
        if (!goal) return;

        const value = Number(prompt("Quanto você quer adicionar nessa meta?"));

        if (!value || value <= 0) {
            showToast({
                type: "danger",
                title: "Valor inválido",
                message: "Digite um valor maior que zero."
            });

            return;
        }

        goals = goals.map((item) => {
            if (item.id !== id) return item;

            return {
                ...item,
                current: Math.min(Number(item.current) + value, Number(item.target))
            };
        });

        saveGoals();
        renderGoals();
        updateSummary();

        showToast({
            type: "success",
            title: "Valor adicionado",
            message: "O progresso da sua meta foi atualizado."
        });
    };

    const handleActions = (event) => {
        const featuredButton = event.target.closest("[data-featured-goal]");

        if (featuredButton) {
            const goal = goals.find((item) => item.id === featuredButton.dataset.featuredGoal);
            if (goal) fillFormToEdit(goal);
            return;
        }

        const button = event.target.closest("[data-action]");
        if (!button) return;

        const itemElement = event.target.closest("[data-goal-id]");
        const goal = goals.find((entry) => entry.id === itemElement?.dataset.goalId);

        if (!goal) return;

        if (button.dataset.action === "deposit") {
            depositGoal(goal.id);
        }

        if (button.dataset.action === "edit") {
            fillFormToEdit(goal);
        }

        if (button.dataset.action === "delete") {
            deleteGoal(goal.id);
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!validateGoal()) return;

        const data = getFormData();
        const wasEditing = Boolean(editingId);

        if (wasEditing) {
            goals = goals.map((goal) => goal.id === editingId ? data : goal);
        } else {
            goals = [data, ...goals];
        }

        saveGoals();
        renderGoals();
        updateSummary();
        resetForm();

        showToast({
            type: "success",
            title: wasEditing ? "Meta atualizada" : "Meta salva",
            message: "Sua lista de objetivos foi atualizada com sucesso."
        });
    };

    const setupDefaultDeadline = () => {
        const dateInput = $("#goalDeadline");

        if (dateInput && !dateInput.value) {
            const date = new Date();
            date.setMonth(date.getMonth() + 6);
            dateInput.valueAsDate = date;
        }
    };

    const setupTypeCards = () => {
        typeCards.forEach((card) => {
            card.addEventListener("click", () => {
                const input = $("input", card);

                if (input) {
                    input.checked = true;
                    setActiveType();
                }
            });
        });
    };

    const setupFilters = () => {
        searchInputs.forEach((input) => {
            input.addEventListener("input", filterGoals);
        });

        $(".goal-filter .btn")?.addEventListener("click", filterGoals);
    };

    const setupSimulator = () => {
        const simulatorButton = $$(".goals-header__actions .btn").find((button) => {
            return button.textContent.trim().toLowerCase().includes("simular");
        });

        simulatorButton?.addEventListener("click", () => {
            const activeGoals = goals.filter((goal) => getProgress(goal) < 100);

            if (!activeGoals.length) {
                showToast({
                    type: "info",
                    title: "Tudo concluído",
                    message: "Você não possui metas abertas para simular aporte."
                });

                return;
            }

            const value = Number(prompt("Qual valor você quer simular como aporte mensal?"));

            if (!value || value <= 0) {
                showToast({
                    type: "danger",
                    title: "Valor inválido",
                    message: "Digite um valor maior que zero para simular."
                });

                return;
            }

            const mainGoal = [...activeGoals].sort((a, b) => getRemaining(b) - getRemaining(a))[0];
            const months = Math.ceil(getRemaining(mainGoal) / value);

            showToast({
                type: "info",
                title: "Simulação pronta",
                message: `Com ${formatCurrency(value)} por mês, você conclui "${mainGoal.name}" em aproximadamente ${months} meses.`
            });
        });
    };

    const init = () => {
        if (!form) return;

        loadGoals();
        setupDefaultDeadline();
        setupTypeCards();
        setupFilters();
        setupSimulator();

        form.addEventListener("submit", handleSubmit);
        list?.addEventListener("click", handleActions);
        $(".goals-aside")?.addEventListener("click", handleActions);

        setActiveType();
        renderGoals();
        updateSummary();
    };

    document.addEventListener("DOMContentLoaded", init);
})();
