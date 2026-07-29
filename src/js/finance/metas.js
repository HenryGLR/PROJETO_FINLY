(() => {
    "use strict";

    const STORAGE_KEY = "goals";

    const CATEGORY_DATA = {
        emergency: {
            label: "Reserva de emergência",
            icon: "shield"
        },
        purchase: {
            label: "Compra",
            icon: "shopping"
        },
        travel: {
            label: "Viagem",
            icon: "travel"
        },
        education: {
            label: "Educação",
            icon: "education"
        },
        investment: {
            label: "Investimentos",
            icon: "chart"
        },
        personal: {
            label: "Objetivo pessoal",
            icon: "target"
        },
        other: {
            label: "Outros",
            icon: "plus"
        }
    };

    const PRIORITY_DATA = {
        low: {
            label: "Baixa",
            className: "goal-priority--low"
        },
        medium: {
            label: "Média",
            className: "goal-priority--medium"
        },
        high: {
            label: "Alta",
            className: "goal-priority--high"
        }
    };

    const DEFAULT_GOALS = [
        {
            id: "goal-emergency-default",
            name: "Reserva de emergência",
            targetValue: 5000,
            currentValue: 1200,
            deadline: "2026-12-31",
            category: "emergency",
            priority: "high",
            description: "Construir uma reserva para imprevistos.",
            createdAt: "2026-07-01T12:00:00.000Z",
            updatedAt: "2026-07-01T12:00:00.000Z"
        },
        {
            id: "goal-macbook-default",
            name: "Comprar um MacBook",
            targetValue: 16000,
            currentValue: 0,
            deadline: "2027-12-31",
            category: "purchase",
            priority: "medium",
            description: "Guardar dinheiro para comprar um novo computador.",
            createdAt: "2026-07-01T12:00:00.000Z",
            updatedAt: "2026-07-01T12:00:00.000Z"
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
        ".goal-form",
        "#goalForm",
        'form[data-form="goal"]'
    );

    const list = getFirstElement(
        ".goal-main .goal-list",
        ".goal-list",
        ".goals-list",
        "[data-goal-list]"
    );

    const categoryCards = $$(
        ".goal-category, .goal-category-option"
    );

    const searchInputs = $$(
        ".topbar__search input, .goal-filter input, [data-goal-search]"
    );

    let goals = [];
    let editingId = null;

    const getFormElement = (...selectors) => {
        if (!form) {
            return null;
        }

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
            "#goalName",
            '[name="goalName"]',
            '[name="name"]',
            '[name="title"]'
        ),

        targetValue: getFormElement(
            "#goalTargetValue",
            "#goalTarget",
            "#goalValue",
            '[name="goalTargetValue"]',
            '[name="targetValue"]',
            '[name="target"]',
            '[name="value"]'
        ),

        currentValue: getFormElement(
            "#goalCurrentValue",
            "#goalSavedValue",
            "#goalCurrent",
            '[name="goalCurrentValue"]',
            '[name="currentValue"]',
            '[name="savedValue"]',
            '[name="current"]'
        ),

        deadline: getFormElement(
            "#goalDeadline",
            "#goalDate",
            '[name="goalDeadline"]',
            '[name="deadline"]',
            '[name="date"]'
        ),

        priority: getFormElement(
            "#goalPriority",
            '[name="goalPriority"]',
            'select[name="priority"]'
        ),

        description: getFormElement(
            "#goalDescription",
            '[name="goalDescription"]',
            '[name="description"]'
        )
    };

    const createId = () => {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }

        return `goal-${Date.now()}-${Math.random()
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

    const formatDate = (date) => {
        if (!date) {
            return "Sem prazo";
        }

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

    const normalizeCategory = (category) => {
        return CATEGORY_DATA[category]
            ? category
            : "other";
    };

    const normalizePriority = (priority) => {
        const normalizedPriority = normalizeText(priority);

        const aliases = {
            baixa: "low",
            low: "low",
            media: "medium",
            medium: "medium",
            normal: "medium",
            alta: "high",
            high: "high"
        };

        return aliases[normalizedPriority] || "medium";
    };

    const normalizeGoal = (goal) => {
        const targetValue = Math.max(
            parseValue(
                goal.targetValue ??
                goal.target ??
                goal.total ??
                goal.value
            ),
            0
        );

        const currentValue = Math.max(
            parseValue(
                goal.currentValue ??
                goal.savedValue ??
                goal.saved ??
                goal.current
            ),
            0
        );

        return {
            id: goal.id || createId(),

            name: String(
                goal.name ||
                goal.title ||
                "Nova meta"
            ).trim(),

            targetValue,

            currentValue: Math.min(
                currentValue,
                targetValue || currentValue
            ),

            deadline:
                goal.deadline ||
                goal.date ||
                goal.targetDate ||
                "",

            category: normalizeCategory(goal.category),
            priority: normalizePriority(goal.priority),
            description: String(goal.description || "").trim(),

            createdAt:
                goal.createdAt ||
                new Date().toISOString(),

            updatedAt:
                goal.updatedAt ||
                goal.createdAt ||
                new Date().toISOString()
        };
    };

    const getStorage = () => {
        if (!window.FinlyStorage) {
            console.error(
                "Finly: storage.js precisa ser carregado antes de metas.js."
            );

            return null;
        }

        return window.FinlyStorage;
    };

    const saveGoals = () => {
        const storage = getStorage();

        if (!storage) {
            return false;
        }

        return storage.set(STORAGE_KEY, goals);
    };

    const loadGoals = () => {
        const storage = getStorage();

        if (!storage) {
            goals = [];
            return;
        }

        if (!storage.has(STORAGE_KEY)) {
            goals = DEFAULT_GOALS.map(normalizeGoal);
            saveGoals();
            return;
        }

        const storedGoals = storage.get(STORAGE_KEY, []);

        if (!Array.isArray(storedGoals)) {
            goals = [];
            saveGoals();
            return;
        }

        goals = storedGoals.map(normalizeGoal);
    };

    const getGoalProgress = (goal) => {
        if (goal.targetValue <= 0) {
            return 0;
        }

        return Math.min(
            Math.round(
                goal.currentValue /
                goal.targetValue *
                100
            ),
            100
        );
    };

    const getRemainingValue = (goal) => {
        return Math.max(
            goal.targetValue - goal.currentValue,
            0
        );
    };

    const isCompleted = (goal) => {
        return (
            goal.targetValue > 0 &&
            goal.currentValue >= goal.targetValue
        );
    };

    const getDaysRemaining = (goal) => {
        if (!goal.deadline) {
            return null;
        }

        const deadline = new Date(
            `${goal.deadline}T23:59:59`
        );

        if (Number.isNaN(deadline.getTime())) {
            return null;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const difference = deadline.getTime() - today.getTime();

        return Math.ceil(
            difference / (1000 * 60 * 60 * 24)
        );
    };

    const getGoalStatus = (goal) => {
        if (isCompleted(goal)) {
            return {
                label: "Concluída",
                className: "goal-status--success"
            };
        }

        const daysRemaining = getDaysRemaining(goal);

        if (daysRemaining !== null && daysRemaining < 0) {
            return {
                label: "Prazo encerrado",
                className: "goal-status--danger"
            };
        }

        if (daysRemaining !== null && daysRemaining <= 30) {
            return {
                label: "Prazo próximo",
                className: "goal-status--warning"
            };
        }

        if (goal.currentValue <= 0) {
            return {
                label: "Não iniciada",
                className: "goal-status--neutral"
            };
        }

        return {
            label: "Em andamento",
            className: "goal-status--progress"
        };
    };

    const getDeadlineText = (goal) => {
        const daysRemaining = getDaysRemaining(goal);

        if (daysRemaining === null) {
            return "Sem prazo definido";
        }

        if (daysRemaining < 0) {
            const overdueDays = Math.abs(daysRemaining);

            return `${overdueDays} ${
                overdueDays === 1
                    ? "dia em atraso"
                    : "dias em atraso"
            }`;
        }

        if (daysRemaining === 0) {
            return "O prazo termina hoje";
        }

        if (daysRemaining === 1) {
            return "Falta 1 dia";
        }

        return `Faltam ${daysRemaining} dias`;
    };

    const getSelectedCategory = () => {
        const checkedInput = getFormElement(
            'input[name="goalCategory"]:checked',
            'input[name="category"]:checked'
        );

        if (checkedInput) {
            return normalizeCategory(checkedInput.value);
        }

        const select = getFormElement(
            "#goalCategory",
            'select[name="goalCategory"]',
            'select[name="category"]'
        );

        return normalizeCategory(
            select?.value || "personal"
        );
    };

    const setSelectedCategory = (category) => {
        const normalizedCategory = normalizeCategory(category);

        const input = getFormElement(
            `input[name="goalCategory"][value="${normalizedCategory}"]`,
            `input[name="category"][value="${normalizedCategory}"]`
        );

        if (input) {
            input.checked = true;
        }

        const select = getFormElement(
            "#goalCategory",
            'select[name="goalCategory"]',
            'select[name="category"]'
        );

        if (select) {
            select.value = normalizedCategory;
        }

        updateCategoryCards();
    };

    const getSelectedPriority = () => {
        const checkedInput = getFormElement(
            'input[name="goalPriority"]:checked',
            'input[name="priority"]:checked'
        );

        if (checkedInput) {
            return normalizePriority(checkedInput.value);
        }

        return normalizePriority(
            fields.priority?.value || "medium"
        );
    };

    const setSelectedPriority = (priority) => {
        const normalizedPriority = normalizePriority(priority);

        const input = getFormElement(
            `input[name="goalPriority"][value="${normalizedPriority}"]`,
            `input[name="priority"][value="${normalizedPriority}"]`
        );

        if (input) {
            input.checked = true;
        }

        if (fields.priority) {
            fields.priority.value = normalizedPriority;
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

    const getIcon = (icon) => {
        const icons = {
            shield: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3 20 6v5c0 5.2-3.4 8.5-8 10-4.6-1.5-8-4.8-8-10V6l8-3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="m8.5 12 2.2 2.2 4.8-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `,

            shopping: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 9h14l-1 11H6L5 9Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M9 9V7a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,

            travel: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="m21 16-8-4V5a2 2 0 0 0-4 0v7l-6 3v2l6-1v4l-2 1v1l4-1 4 1v-1l-2-1v-4l8 2v-2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
            `,

            education: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="m3 9 9-5 9 5-9 5-9-5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M7 12v5c3 2 7 2 10 0v-5M21 9v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `,

            chart: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 19V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M8 17v-5M12 17V8M16 17v-7M20 17V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,

            target: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor"/>
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

    const renderGoal = (goal) => {
        const category =
            CATEGORY_DATA[goal.category] ||
            CATEGORY_DATA.other;

        const priority =
            PRIORITY_DATA[goal.priority] ||
            PRIORITY_DATA.medium;

        const status = getGoalStatus(goal);
        const progress = getGoalProgress(goal);
        const remainingValue = getRemainingValue(goal);

        return `
            <article
                class="goal-item"
                data-goal-id="${escapeHTML(goal.id)}"
            >
                <div class="goal-item__header">
                    <div class="goal-item__main">
                        <span class="goal-item__icon">
                            ${getIcon(category.icon)}
                        </span>

                        <span class="goal-item__info">
                            <strong class="goal-item__title">
                                ${escapeHTML(goal.name)}
                            </strong>

                            <span class="goal-item__meta">
                                ${escapeHTML(category.label)}
                                •
                                Prazo: ${escapeHTML(formatDate(goal.deadline))}
                            </span>
                        </span>
                    </div>

                    <div class="goal-item__badges">
                        <span class="goal-priority ${priority.className}">
                            Prioridade ${escapeHTML(priority.label)}
                        </span>

                        <span class="goal-status ${status.className}">
                            ${escapeHTML(status.label)}
                        </span>
                    </div>
                </div>

                ${
                    goal.description
                        ? `
                            <p class="goal-item__description">
                                ${escapeHTML(goal.description)}
                            </p>
                        `
                        : ""
                }

                <div class="goal-item__values">
                    <span>
                        <small>Guardado</small>
                        <strong>
                            ${formatCurrency(goal.currentValue)}
                        </strong>
                    </span>

                    <span>
                        <small>Meta</small>
                        <strong>
                            ${formatCurrency(goal.targetValue)}
                        </strong>
                    </span>

                    <span>
                        <small>Falta</small>
                        <strong>
                            ${formatCurrency(remainingValue)}
                        </strong>
                    </span>
                </div>

                <div class="goal-progress">
                    <div class="goal-progress__top">
                        <span>
                            ${escapeHTML(getDeadlineText(goal))}
                        </span>

                        <strong>${progress}%</strong>
                    </div>

                    <div class="goal-progress__track">
                        <span
                            class="goal-progress__bar"
                            style="--progress-value: ${progress}%; width: ${progress}%;"
                        ></span>
                    </div>
                </div>

                <div class="goal-item__footer">
                    <div class="goal-item__actions">
                        ${
                            !isCompleted(goal)
                                ? `
                                    <button
                                        class="btn btn-primary btn-sm"
                                        type="button"
                                        data-action="contribute"
                                    >
                                        Adicionar valor
                                    </button>
                                `
                                : ""
                        }

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
                </div>
            </article>
        `;
    };

    const getSearchTerms = () => {
        return searchInputs
            .map((input) => normalizeText(input.value))
            .filter(Boolean);
    };

    const getFilteredGoals = () => {
        const terms = getSearchTerms();

        if (!terms.length) {
            return [...goals];
        }

        return goals.filter((goal) => {
            const category =
                CATEGORY_DATA[goal.category]?.label || "";

            const priority =
                PRIORITY_DATA[goal.priority]?.label || "";

            const status =
                getGoalStatus(goal).label;

            const searchableText = normalizeText([
                goal.name,
                goal.description,
                category,
                priority,
                status,
                goal.targetValue,
                goal.currentValue,
                goal.deadline
            ].join(" "));

            return terms.every((term) => {
                return searchableText.includes(term);
            });
        });
    };

    const renderGoals = () => {
        if (!list) {
            return;
        }

        const filteredGoals = getFilteredGoals()
            .sort((goalA, goalB) => {
                if (isCompleted(goalA) !== isCompleted(goalB)) {
                    return isCompleted(goalA) ? 1 : -1;
                }

                const priorityOrder = {
                    high: 0,
                    medium: 1,
                    low: 2
                };

                const priorityDifference =
                    priorityOrder[goalA.priority] -
                    priorityOrder[goalB.priority];

                if (priorityDifference !== 0) {
                    return priorityDifference;
                }

                if (!goalA.deadline && !goalB.deadline) {
                    return 0;
                }

                if (!goalA.deadline) {
                    return 1;
                }

                if (!goalB.deadline) {
                    return -1;
                }

                return new Date(
                    `${goalA.deadline}T12:00:00`
                ) - new Date(
                    `${goalB.deadline}T12:00:00`
                );
            });

        if (!filteredGoals.length) {
            list.innerHTML = `
                <div class="empty-card">
                    <span class="empty-card__icon">
                        ${getIcon("target")}
                    </span>

                    <h3 class="empty-card__title">
                        Nenhuma meta encontrada
                    </h3>

                    <p class="empty-card__text">
                        Cadastre uma meta ou altere os termos da pesquisa.
                    </p>
                </div>
            `;

            return;
        }

        list.innerHTML = filteredGoals
            .map(renderGoal)
            .join("");
    };

    const calculateSummary = () => {
        const active = goals.filter(
            (goal) => !isCompleted(goal)
        );

        const completed = goals.filter(isCompleted);

        const totalTarget = goals.reduce(
            (sum, goal) => sum + goal.targetValue,
            0
        );

        const totalSaved = goals.reduce(
            (sum, goal) => sum + goal.currentValue,
            0
        );

        const totalRemaining = Math.max(
            totalTarget - totalSaved,
            0
        );

        const overallProgress = totalTarget > 0
            ? Math.min(
                Math.round(
                    totalSaved /
                    totalTarget *
                    100
                ),
                100
            )
            : 0;

        const urgent = active.filter((goal) => {
            const daysRemaining = getDaysRemaining(goal);

            return (
                goal.priority === "high" ||
                (
                    daysRemaining !== null &&
                    daysRemaining <= 30
                )
            );
        });

        return {
            active,
            completed,
            urgent,
            totalTarget,
            totalSaved,
            totalRemaining,
            overallProgress
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
            ".goal-hero-card__value",
            formatCurrency(summary.totalSaved)
        );

        setText(
            ".goal-hero__value",
            formatCurrency(summary.totalSaved)
        );

        const pills = $$(
            ".goal-hero-card__footer .goal-pill, .goal-hero .goal-pill"
        );

        if (pills[0]) {
            pills[0].textContent =
                `${summary.active.length} metas ativas`;
        }

        if (pills[1]) {
            pills[1].textContent =
                `${summary.overallProgress}% alcançado`;
        }

        const heroText = getFirstElement(
            ".goal-hero-card__text",
            ".goal-hero__text"
        );

        if (heroText) {
            heroText.textContent = summary.totalRemaining > 0
                ? `Você já guardou ${formatCurrency(summary.totalSaved)}. Ainda faltam ${formatCurrency(summary.totalRemaining)} para concluir todas as metas.`
                : "Parabéns! Todas as suas metas financeiras foram alcançadas.";
        }

        const progressBar = getFirstElement(
            ".goal-hero-card__bar",
            ".goal-hero__bar",
            "[data-goal-overall-progress]"
        );

        if (progressBar) {
            progressBar.style.setProperty(
                "--progress-value",
                `${summary.overallProgress}%`
            );

            progressBar.style.width =
                `${summary.overallProgress}%`;
        }
    };

    const updateKpis = (summary) => {
        const cards = $$(".goal-kpi");

        cards.forEach((card, index) => {
            const label = normalizeText(
                $(".goal-kpi__label", card)?.textContent ||
                card.textContent
            );

            const valueElement = $(".goal-kpi__value", card);

            if (!valueElement) {
                return;
            }

            if (
                label.includes("guardado") ||
                label.includes("economizado")
            ) {
                valueElement.textContent =
                    formatCurrency(summary.totalSaved);
                return;
            }

            if (
                label.includes("falta") ||
                label.includes("restante")
            ) {
                valueElement.textContent =
                    formatCurrency(summary.totalRemaining);
                return;
            }

            if (
                label.includes("ativa") ||
                label.includes("andamento")
            ) {
                valueElement.textContent =
                    String(summary.active.length);
                return;
            }

            if (
                label.includes("conclu") ||
                label.includes("finalizada")
            ) {
                valueElement.textContent =
                    String(summary.completed.length);
                return;
            }

            if (
                label.includes("progresso") ||
                label.includes("percentual")
            ) {
                valueElement.textContent =
                    `${summary.overallProgress}%`;
                return;
            }

            if (
                label.includes("total") ||
                label.includes("objetivo")
            ) {
                valueElement.textContent =
                    formatCurrency(summary.totalTarget);
                return;
            }

            const fallbackValues = [
                formatCurrency(summary.totalSaved),
                formatCurrency(summary.totalRemaining),
                String(summary.active.length),
                String(summary.completed.length)
            ];

            valueElement.textContent =
                fallbackValues[index] ||
                `${summary.overallProgress}%`;
        });
    };

    const updateUpcomingGoals = () => {
        const container = getFirstElement(
            ".goal-upcoming-list",
            ".goal-deadline-list",
            "[data-goal-upcoming]"
        );

        if (!container) {
            return;
        }

        const upcomingGoals = goals
            .filter((goal) => {
                return !isCompleted(goal) && goal.deadline;
            })
            .sort((goalA, goalB) => {
                return new Date(
                    `${goalA.deadline}T12:00:00`
                ) - new Date(
                    `${goalB.deadline}T12:00:00`
                );
            })
            .slice(0, 5);

        if (!upcomingGoals.length) {
            container.innerHTML = `
                <p class="empty-card__text">
                    Nenhuma meta com prazo próximo.
                </p>
            `;

            return;
        }

        container.innerHTML = upcomingGoals
            .map((goal) => {
                const category =
                    CATEGORY_DATA[goal.category] ||
                    CATEGORY_DATA.other;

                return `
                    <article class="goal-upcoming">
                        <span class="goal-upcoming__icon">
                            ${getIcon(category.icon)}
                        </span>

                        <span class="goal-upcoming__info">
                            <strong class="goal-upcoming__title">
                                ${escapeHTML(goal.name)}
                            </strong>

                            <span class="goal-upcoming__date">
                                ${escapeHTML(getDeadlineText(goal))}
                            </span>
                        </span>

                        <strong class="goal-upcoming__value">
                            ${formatCurrency(getRemainingValue(goal))}
                        </strong>
                    </article>
                `;
            })
            .join("");
    };

    const updateSidebar = (summary) => {
        const sidebarBadge = getFirstElement(
            '.sidebar__link[href*="metas"] .sidebar__badge',
            "[data-goal-sidebar-badge]"
        );

        if (sidebarBadge) {
            sidebarBadge.textContent =
                String(summary.active.length);
        }

        const sidebarCardBadge = $(".sidebar-card .badge");

        if (sidebarCardBadge) {
            sidebarCardBadge.textContent =
                `${summary.overallProgress}% das metas`;
        }
    };

    const updateInterface = () => {
        const summary = calculateSummary();

        renderGoals();
        updateHero(summary);
        updateKpis(summary);
        updateUpcomingGoals();
        updateSidebar(summary);
    };

    const validateForm = () => {
        const name = fields.name?.value.trim() || "";

        const targetValue = parseValue(
            fields.targetValue?.value
        );

        const currentValue = parseValue(
            fields.currentValue?.value
        );

        if (!name) {
            showToast({
                type: "danger",
                title: "Nome obrigatório",
                message: "Digite um nome para a meta."
            });

            fields.name?.focus();
            return false;
        }

        if (targetValue <= 0) {
            showToast({
                type: "danger",
                title: "Valor inválido",
                message: "O valor da meta precisa ser maior que zero."
            });

            fields.targetValue?.focus();
            return false;
        }

        if (currentValue < 0) {
            showToast({
                type: "danger",
                title: "Valor atual inválido",
                message: "O valor guardado não pode ser negativo."
            });

            fields.currentValue?.focus();
            return false;
        }

        if (currentValue > targetValue) {
            showToast({
                type: "danger",
                title: "Valor acima da meta",
                message: "O valor guardado não pode ser maior que o objetivo."
            });

            fields.currentValue?.focus();
            return false;
        }

        return true;
    };

    const getFormData = () => {
        const existingGoal = goals.find((goal) => {
            return goal.id === editingId;
        });

        return normalizeGoal({
            id: editingId || createId(),
            name: fields.name?.value.trim(),

            targetValue: parseValue(
                fields.targetValue?.value
            ),

            currentValue: parseValue(
                fields.currentValue?.value
            ),

            deadline: fields.deadline?.value || "",
            category: getSelectedCategory(),
            priority: getSelectedPriority(),

            description:
                fields.description?.value.trim() || "",

            createdAt:
                existingGoal?.createdAt ||
                new Date().toISOString(),

            updatedAt: new Date().toISOString()
        });
    };

    const getSubmitButton = () => {
        return getFormElement(
            '[type="submit"]',
            "[data-goal-submit]"
        );
    };

    const setDefaultDeadline = () => {
        if (!fields.deadline || fields.deadline.value) {
            return;
        }

        const deadline = new Date();
        deadline.setMonth(deadline.getMonth() + 6);

        fields.deadline.value = deadline
            .toISOString()
            .slice(0, 10);
    };

    const resetForm = () => {
        if (!form) {
            return;
        }

        form.reset();
        editingId = null;

        if (fields.currentValue) {
            fields.currentValue.value = 0;
        }

        setSelectedCategory("personal");
        setSelectedPriority("medium");
        setDefaultDeadline();

        const submitButton = getSubmitButton();

        if (submitButton) {
            submitButton.textContent = "Salvar meta";
        }

        form.classList.remove("is-editing");
    };

    const fillForm = (goal) => {
        editingId = goal.id;

        if (fields.name) {
            fields.name.value = goal.name;
        }

        if (fields.targetValue) {
            fields.targetValue.value = goal.targetValue;
        }

        if (fields.currentValue) {
            fields.currentValue.value = goal.currentValue;
        }

        if (fields.deadline) {
            fields.deadline.value = goal.deadline;
        }

        if (fields.description) {
            fields.description.value = goal.description;
        }

        setSelectedCategory(goal.category);
        setSelectedPriority(goal.priority);

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

        if (!validateForm()) {
            return;
        }

        const wasEditing = Boolean(editingId);
        const goalData = getFormData();

        if (wasEditing) {
            goals = goals.map((goal) => {
                return goal.id === editingId
                    ? goalData
                    : goal;
            });
        } else {
            goals = [goalData, ...goals];
        }

        const saved = saveGoals();

        if (!saved) {
            showToast({
                type: "danger",
                title: "Erro ao salvar",
                message: "Não foi possível salvar a meta."
            });

            return;
        }

        resetForm();
        updateInterface();

        showToast({
            type: "success",

            title: wasEditing
                ? "Meta atualizada"
                : "Meta criada",

            message: wasEditing
                ? "As alterações foram salvas com sucesso."
                : "A nova meta foi adicionada ao seu planejamento."
        });
    };

    const contributeToGoal = (goal) => {
        if (isCompleted(goal)) {
            showToast({
                type: "info",
                title: "Meta concluída",
                message: "Essa meta já atingiu o valor necessário."
            });

            return;
        }

        const remainingValue = getRemainingValue(goal);

        const answer = window.prompt(
            `Quanto deseja adicionar à meta "${goal.name}"?\n\nFalta: ${formatCurrency(remainingValue)}`
        );

        if (answer === null) {
            return;
        }

        const contribution = parseValue(answer);

        if (contribution <= 0) {
            showToast({
                type: "danger",
                title: "Valor inválido",
                message: "Digite um valor maior que zero."
            });

            return;
        }

        const appliedContribution = Math.min(
            contribution,
            remainingValue
        );

        goals = goals.map((item) => {
            if (item.id !== goal.id) {
                return item;
            }

            return {
                ...item,

                currentValue: Math.min(
                    item.currentValue + appliedContribution,
                    item.targetValue
                ),

                updatedAt: new Date().toISOString()
            };
        });

        const saved = saveGoals();

        if (!saved) {
            showToast({
                type: "danger",
                title: "Erro ao atualizar",
                message: "Não foi possível adicionar o valor."
            });

            return;
        }

        const updatedGoal = goals.find((item) => {
            return item.id === goal.id;
        });

        updateInterface();

        showToast({
            type: "success",

            title: isCompleted(updatedGoal)
                ? "Meta concluída!"
                : "Valor adicionado",

            message: isCompleted(updatedGoal)
                ? `Parabéns! Você alcançou a meta "${updatedGoal.name}".`
                : `${formatCurrency(appliedContribution)} foram adicionados à meta.`
        });
    };

    const deleteGoal = (goal) => {
        const confirmed = window.confirm(
            `Deseja excluir a meta "${goal.name}"?`
        );

        if (!confirmed) {
            return;
        }

        goals = goals.filter((item) => {
            return item.id !== goal.id;
        });

        const saved = saveGoals();

        if (!saved) {
            showToast({
                type: "danger",
                title: "Erro ao excluir",
                message: "Não foi possível atualizar os dados."
            });

            return;
        }

        if (editingId === goal.id) {
            resetForm();
        }

        updateInterface();

        showToast({
            type: "success",
            title: "Meta excluída",
            message: "A meta foi removida do seu planejamento."
        });
    };

    const handleListAction = (event) => {
        const button = event.target.closest("[data-action]");

        if (!button) {
            return;
        }

        const item = button.closest("[data-goal-id]");

        if (!item) {
            return;
        }

        const goal = goals.find((entry) => {
            return entry.id === item.dataset.goalId;
        });

        if (!goal) {
            return;
        }

        const action = button.dataset.action;

        if (action === "contribute") {
            contributeToGoal(goal);
            return;
        }

        if (action === "edit") {
            fillForm(goal);
            return;
        }

        if (action === "delete") {
            deleteGoal(goal);
        }
    };

    const setupCategoryCards = () => {
        categoryCards.forEach((card) => {
            card.addEventListener("click", () => {
                const input = $("input", card);

                if (!input) {
                    return;
                }

                input.checked = true;
                updateCategoryCards();
            });
        });
    };

    const setupFilters = () => {
        searchInputs.forEach((input) => {
            input.addEventListener(
                "input",
                renderGoals
            );
        });

        const filterButton = getFirstElement(
            ".goal-filter .btn",
            "[data-action='filter-goals']"
        );

        filterButton?.addEventListener(
            "click",
            renderGoals
        );
    };

    const setupCancelEditing = () => {
        const cancelButton = getFirstElement(
            "[data-action='cancel-goal-edit']",
            ".goal-form__cancel"
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
                "Finly: formulário ou lista de metas não encontrados."
            );

            return;
        }

        if (!getStorage()) {
            return;
        }

        loadGoals();
        setDefaultDeadline();

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