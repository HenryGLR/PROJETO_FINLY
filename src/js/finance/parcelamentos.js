(() => {
    const STORAGE_KEY = "installments";

    const CARD_DATA = {
        nubank: {
            label: "Nubank",
            icon: "card"
        },
        picpay: {
            label: "PicPay",
            icon: "wallet"
        },
        renner: {
            label: "Renner",
            icon: "bag"
        },
        other: {
            label: "Outro",
            icon: "plus"
        }
    };

    const DEFAULT_INSTALLMENTS = [
        {
            id: "installment-nubank-default",
            name: "Parcela Nubank",
            total: 1929.35,
            totalParts: 5,
            paidParts: 2,
            dueDate: "2026-08-24",
            card: "nubank",
            description: "Compra parcelada no cartão Nubank.",
            createdAt: "2026-06-24T12:00:00.000Z"
        },
        {
            id: "installment-renner-default",
            name: "Renner",
            total: 400,
            totalParts: 2,
            paidParts: 1,
            dueDate: "2026-08-20",
            card: "renner",
            description: "Compra parcelada na Renner.",
            createdAt: "2026-07-20T12:00:00.000Z"
        },
        {
            id: "installment-picpay-default",
            name: "PicPay",
            total: 440,
            totalParts: 2,
            paidParts: 1,
            dueDate: "2026-08-15",
            card: "picpay",
            description: "Parcelamento pelo PicPay.",
            createdAt: "2026-07-15T12:00:00.000Z"
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
        ".installment-form",
        "#installmentForm",
        'form[data-form="installment"]'
    );

    const list = getFirstElement(
        ".installment-main .installment-list",
        ".installment-list",
        "[data-installment-list]"
    );

    const cardOptions = $$(
        ".installment-card-option, .installment-card-type, .installment-brand"
    );

    const searchInputs = $$(
        ".topbar__search input, .installment-filter input, [data-installment-search]"
    );

    let installments = [];
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
            "#installmentName",
            '[name="installmentName"]',
            '[name="name"]'
        ),

        total: getFormElement(
            "#installmentTotal",
            "#installmentValue",
            '[name="installmentTotal"]',
            '[name="total"]',
            '[name="value"]'
        ),

        totalParts: getFormElement(
            "#installmentParts",
            "#installmentTotalParts",
            '[name="installmentParts"]',
            '[name="totalParts"]'
        ),

        paidParts: getFormElement(
            "#installmentPaidParts",
            "#paidParts",
            '[name="installmentPaidParts"]',
            '[name="paidParts"]'
        ),

        dueDate: getFormElement(
            "#installmentDueDate",
            "#installmentDate",
            '[name="installmentDueDate"]',
            '[name="dueDate"]',
            '[name="date"]'
        ),

        description: getFormElement(
            "#installmentDescription",
            '[name="installmentDescription"]',
            '[name="description"]'
        )
    };

    const createId = () => {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }

        return `installment-${Date.now()}-${Math.random()
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

    const parseInteger = (value, fallback = 0) => {
        const parsedValue = Number.parseInt(value, 10);

        return Number.isFinite(parsedValue)
            ? parsedValue
            : fallback;
    };

    const formatCurrency = (value) => {
        return Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    };

    const formatDate = (date) => {
        if (!date) return "Sem vencimento";

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

    const normalizeCard = (card) => {
        return CARD_DATA[card] ? card : "other";
    };

    const normalizeInstallment = (installment) => {
        const totalParts = Math.max(
            parseInteger(
                installment.totalParts ??
                installment.parts ??
                installment.installments,
                1
            ),
            1
        );

        const paidParts = Math.min(
            Math.max(
                parseInteger(
                    installment.paidParts ??
                    installment.currentPart ??
                    installment.paid,
                    0
                ),
                0
            ),
            totalParts
        );

        return {
            id: installment.id || createId(),

            name: String(
                installment.name ||
                installment.title ||
                "Parcelamento"
            ).trim(),

            total: parseValue(
                installment.total ??
                installment.value ??
                installment.totalValue
            ),

            totalParts,
            paidParts,

            dueDate:
                installment.dueDate ||
                installment.date ||
                installment.nextDueDate ||
                new Date().toISOString().slice(0, 10),

            card: normalizeCard(
                installment.card ||
                installment.brand
            ),

            description: String(
                installment.description || ""
            ).trim(),

            createdAt:
                installment.createdAt ||
                new Date().toISOString()
        };
    };

    const getStorage = () => {
        if (!window.FinlyStorage) {
            console.error(
                "Finly: storage.js precisa ser carregado antes de parcelamentos.js."
            );

            return null;
        }

        return window.FinlyStorage;
    };

    const saveInstallments = () => {
        const storage = getStorage();

        if (!storage) return false;

        return storage.set(STORAGE_KEY, installments);
    };

    const loadInstallments = () => {
        const storage = getStorage();

        if (!storage) {
            installments = [];
            return;
        }

        if (!storage.has(STORAGE_KEY)) {
            installments = DEFAULT_INSTALLMENTS.map(
                normalizeInstallment
            );

            saveInstallments();
            return;
        }

        const storedInstallments = storage.get(
            STORAGE_KEY,
            []
        );

        if (!Array.isArray(storedInstallments)) {
            installments = [];
            saveInstallments();
            return;
        }

        installments = storedInstallments.map(
            normalizeInstallment
        );
    };

    const getPartValue = (installment) => {
        if (!installment.totalParts) return 0;

        return installment.total / installment.totalParts;
    };

    const getRemainingParts = (installment) => {
        return Math.max(
            installment.totalParts - installment.paidParts,
            0
        );
    };

    const getPaidValue = (installment) => {
        return Math.min(
            getPartValue(installment) * installment.paidParts,
            installment.total
        );
    };

    const getOpenValue = (installment) => {
        return Math.max(
            installment.total - getPaidValue(installment),
            0
        );
    };

    const getProgress = (installment) => {
        if (!installment.totalParts) return 0;

        return Math.min(
            Math.round(
                installment.paidParts /
                installment.totalParts *
                100
            ),
            100
        );
    };

    const isCompleted = (installment) => {
        return installment.paidParts >= installment.totalParts;
    };

    const isOverdue = (installment) => {
        if (isCompleted(installment)) return false;

        const dueDate = new Date(
            `${installment.dueDate}T23:59:59`
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return dueDate < today;
    };

    const getStatus = (installment) => {
        if (isCompleted(installment)) {
            return {
                label: "Concluído",
                className: "installment-status--success"
            };
        }

        if (isOverdue(installment)) {
            return {
                label: "Vencido",
                className: "installment-status--danger"
            };
        }

        if (getRemainingParts(installment) === 1) {
            return {
                label: "Última parcela",
                className: "installment-status--warning"
            };
        }

        return {
            label: "Em andamento",
            className: ""
        };
    };

    const getSelectedCard = () => {
        const checkedInput = getFormElement(
            'input[name="installmentCard"]:checked',
            'input[name="card"]:checked',
            'input[name="brand"]:checked'
        );

        if (checkedInput) {
            return normalizeCard(checkedInput.value);
        }

        const select = getFormElement(
            "#installmentCard",
            'select[name="installmentCard"]',
            'select[name="card"]'
        );

        return normalizeCard(select?.value || "other");
    };

    const setSelectedCard = (card) => {
        const normalizedCard = normalizeCard(card);

        const input = getFormElement(
            `input[name="installmentCard"][value="${normalizedCard}"]`,
            `input[name="card"][value="${normalizedCard}"]`,
            `input[name="brand"][value="${normalizedCard}"]`
        );

        if (input) {
            input.checked = true;
        }

        const select = getFormElement(
            "#installmentCard",
            'select[name="installmentCard"]',
            'select[name="card"]'
        );

        if (select) {
            select.value = normalizedCard;
        }

        updateCardOptions();
    };

    const updateCardOptions = () => {
        cardOptions.forEach((option) => {
            const input = $("input", option);

            option.classList.toggle(
                "is-active",
                Boolean(input?.checked)
            );
        });
    };

    const getIcon = (icon) => {
        const icons = {
            card: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 6h18v12H3V6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M3 10h18M7 15h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,

            wallet: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 6h15a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6h2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M4 6V5a2 2 0 0 1 2-2h11v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z" stroke="currentColor" stroke-width="2"/>
                </svg>
            `,

            bag: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 9h14l-1 11H6L5 9Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M9 9V7a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
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

    const renderInstallment = (installment) => {
        const card =
            CARD_DATA[installment.card] ||
            CARD_DATA.other;

        const status = getStatus(installment);
        const partValue = getPartValue(installment);
        const openValue = getOpenValue(installment);
        const remainingParts = getRemainingParts(installment);
        const progress = getProgress(installment);

        const searchableText = normalizeText([
            installment.name,
            installment.description,
            card.label,
            status.label,
            installment.total,
            partValue,
            installment.dueDate
        ].join(" "));

        return `
            <article
                class="installment-item"
                data-installment-id="${escapeHTML(installment.id)}"
                data-installment-search="${escapeHTML(searchableText)}"
            >
                <div class="installment-item__top">
                    <div class="installment-item__main">
                        <span class="installment-item__icon">
                            ${getIcon(card.icon)}
                        </span>

                        <span class="installment-item__info">
                            <strong class="installment-item__title">
                                ${escapeHTML(installment.name)}
                            </strong>

                            <span class="installment-item__meta">
                                ${escapeHTML(card.label)}
                                •
                                ${installment.paidParts}/${installment.totalParts} parcelas
                                •
                                vence ${escapeHTML(formatDate(installment.dueDate))}
                            </span>

                            ${
                                installment.description
                                    ? `
                                        <span class="installment-item__description">
                                            ${escapeHTML(installment.description)}
                                        </span>
                                    `
                                    : ""
                            }
                        </span>
                    </div>

                    <div class="installment-item__value">
                        <strong class="installment-item__amount">
                            ${formatCurrency(partValue)}
                        </strong>

                        <span class="installment-item__small">
                            ${formatCurrency(openValue)} em aberto
                        </span>
                    </div>
                </div>

                <div class="installment-progress">
                    <div class="installment-progress__top">
                        <span>
                            ${installment.paidParts} pagas de ${installment.totalParts}
                        </span>

                        <span>${progress}%</span>
                    </div>

                    <div class="installment-progress__track">
                        <span
                            class="installment-progress__bar"
                            style="--progress-value: ${progress}%; width: ${progress}%;"
                        ></span>
                    </div>
                </div>

                <div class="installment-item__footer">
                    <span class="installment-status ${status.className}">
                        ${status.label}
                    </span>

                    <span class="installment-item__remaining">
                        ${
                            remainingParts === 0
                                ? "Parcelamento concluído"
                                : `${remainingParts} ${remainingParts === 1 ? "parcela restante" : "parcelas restantes"}`
                        }
                    </span>

                    <div class="installment-item__actions">
                        ${
                            !isCompleted(installment)
                                ? `
                                    <button
                                        class="btn btn-primary btn-sm"
                                        type="button"
                                        data-action="pay"
                                    >
                                        Pagar parcela
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

    const getFilteredInstallments = () => {
        const terms = getSearchTerms();

        if (!terms.length) {
            return [...installments];
        }

        return installments.filter((installment) => {
            const card =
                CARD_DATA[installment.card]?.label || "";

            const status =
                getStatus(installment).label;

            const searchableText = normalizeText([
                installment.name,
                installment.description,
                card,
                status,
                installment.total,
                getPartValue(installment),
                installment.dueDate
            ].join(" "));

            return terms.every((term) => {
                return searchableText.includes(term);
            });
        });
    };

    const renderInstallments = () => {
        if (!list) return;

        const filteredInstallments =
            getFilteredInstallments().sort(
                (installmentA, installmentB) => {
                    if (
                        isCompleted(installmentA) !==
                        isCompleted(installmentB)
                    ) {
                        return isCompleted(installmentA) ? 1 : -1;
                    }

                    const dateA = new Date(
                        `${installmentA.dueDate}T12:00:00`
                    );

                    const dateB = new Date(
                        `${installmentB.dueDate}T12:00:00`
                    );

                    return dateA - dateB;
                }
            );

        if (!filteredInstallments.length) {
            list.innerHTML = `
                <div class="empty-card">
                    <span class="empty-card__icon">
                        ${getIcon("plus")}
                    </span>

                    <h3 class="empty-card__title">
                        Nenhum parcelamento encontrado
                    </h3>

                    <p class="empty-card__text">
                        Cadastre um parcelamento ou altere sua pesquisa.
                    </p>
                </div>
            `;

            return;
        }

        list.innerHTML = filteredInstallments
            .map(renderInstallment)
            .join("");
    };

    const calculateSummary = () => {
        const active = installments.filter(
            (installment) => !isCompleted(installment)
        );

        const completed = installments.filter(
            isCompleted
        );

        const totalOpen = active.reduce(
            (sum, installment) => {
                return sum + getOpenValue(installment);
            },
            0
        );

        const totalPaid = installments.reduce(
            (sum, installment) => {
                return sum + getPaidValue(installment);
            },
            0
        );

        const totalContracted = installments.reduce(
            (sum, installment) => {
                return sum + installment.total;
            },
            0
        );

        const monthlyValue = active.reduce(
            (sum, installment) => {
                return sum + getPartValue(installment);
            },
            0
        );

        const overdue = active.filter(
            isOverdue
        ).length;

        const averageProgress = installments.length
            ? Math.round(
                installments.reduce(
                    (sum, installment) => {
                        return sum + getProgress(installment);
                    },
                    0
                ) / installments.length
            )
            : 0;

        return {
            active,
            completed,
            totalOpen,
            totalPaid,
            totalContracted,
            monthlyValue,
            overdue,
            averageProgress
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
            ".installment-hero-card__value",
            formatCurrency(summary.totalOpen)
        );

        setText(
            ".installment-hero__value",
            formatCurrency(summary.totalOpen)
        );

        const pills = $$(
            ".installment-hero-card__footer .installment-pill, .installment-hero .installment-pill"
        );

        if (pills[0]) {
            pills[0].textContent =
                `${summary.active.length} parcelamentos ativos`;
        }

        if (pills[1]) {
            pills[1].textContent =
                `${formatCurrency(summary.monthlyValue)} por mês`;
        }

        const heroText = getFirstElement(
            ".installment-hero-card__text",
            ".installment-hero__text"
        );

        if (heroText) {
            heroText.textContent = summary.totalOpen > 0
                ? `Você possui ${formatCurrency(summary.totalOpen)} em parcelas abertas. O compromisso mensal atual é de ${formatCurrency(summary.monthlyValue)}.`
                : "Você não possui valores pendentes em parcelamentos.";
        }
    };

    const updateKpis = (summary) => {
        const cards = $$(".installment-kpi");

        cards.forEach((card, index) => {
            const label = normalizeText(
                $(".installment-kpi__label", card)?.textContent ||
                card.textContent
            );

            const valueElement = $(
                ".installment-kpi__value",
                card
            );

            if (!valueElement) return;

            if (label.includes("ativo")) {
                valueElement.textContent =
                    String(summary.active.length);
                return;
            }

            if (
                label.includes("mensal") ||
                label.includes("mes")
            ) {
                valueElement.textContent =
                    formatCurrency(summary.monthlyValue);
                return;
            }

            if (
                label.includes("aberto") ||
                label.includes("restante")
            ) {
                valueElement.textContent =
                    formatCurrency(summary.totalOpen);
                return;
            }

            if (label.includes("pago")) {
                valueElement.textContent =
                    formatCurrency(summary.totalPaid);
                return;
            }

            if (label.includes("conclu")) {
                valueElement.textContent =
                    String(summary.completed.length);
                return;
            }

            const fallbackValues = [
                String(summary.active.length),
                formatCurrency(summary.monthlyValue),
                formatCurrency(summary.totalOpen),
                String(summary.completed.length)
            ];

            valueElement.textContent =
                fallbackValues[index] ||
                formatCurrency(summary.totalOpen);
        });
    };

    const updateSummaryCard = (summary) => {
        const values = $$(".installment-summary__value");

        if (values[0]) {
            values[0].textContent =
                formatCurrency(summary.totalContracted);
        }

        if (values[1]) {
            values[1].textContent =
                formatCurrency(summary.totalPaid);
        }

        if (values[2]) {
            values[2].textContent =
                formatCurrency(summary.totalOpen);
        }

        if (values[3]) {
            values[3].textContent =
                String(summary.completed.length);
        }

        const progressBar = getFirstElement(
            ".installment-summary__bar",
            "[data-installment-summary-bar]"
        );

        if (progressBar) {
            progressBar.style.setProperty(
                "--progress-value",
                `${summary.averageProgress}%`
            );

            progressBar.style.width =
                `${summary.averageProgress}%`;
        }

        const progressText = getFirstElement(
            ".installment-summary__progress",
            "[data-installment-summary-progress]"
        );

        if (progressText) {
            progressText.textContent =
                `${summary.averageProgress}% concluído`;
        }
    };

    const updateTimeline = () => {
        const timeline = getFirstElement(
            ".installment-timeline",
            "[data-installment-timeline]"
        );

        if (!timeline) return;

        const active = installments
            .filter((installment) => !isCompleted(installment))
            .sort((installmentA, installmentB) => {
                const dateA = new Date(
                    `${installmentA.dueDate}T12:00:00`
                );

                const dateB = new Date(
                    `${installmentB.dueDate}T12:00:00`
                );

                return dateA - dateB;
            })
            .slice(0, 5);

        if (!active.length) {
            timeline.innerHTML = `
                <div class="empty-card">
                    <h3 class="empty-card__title">
                        Nenhum vencimento próximo
                    </h3>

                    <p class="empty-card__text">
                        Seus parcelamentos estão concluídos.
                    </p>
                </div>
            `;

            return;
        }

        timeline.innerHTML = active
            .map((installment) => {
                const card =
                    CARD_DATA[installment.card] ||
                    CARD_DATA.other;

                const status = getStatus(installment);

                return `
                    <article class="installment-timeline__item">
                        <span class="installment-timeline__icon">
                            ${getIcon(card.icon)}
                        </span>

                        <span class="installment-timeline__info">
                            <strong class="installment-timeline__title">
                                ${escapeHTML(installment.name)}
                            </strong>

                            <span class="installment-timeline__text">
                                ${escapeHTML(formatDate(installment.dueDate))}
                                •
                                ${escapeHTML(status.label)}
                            </span>
                        </span>

                        <strong class="installment-timeline__value">
                            ${formatCurrency(getPartValue(installment))}
                        </strong>
                    </article>
                `;
            })
            .join("");
    };

    const updateSidebar = (summary) => {
        const sidebarBadge = getFirstElement(
            '.sidebar__link[href*="parcelamentos"] .sidebar__badge',
            "[data-installment-sidebar-badge]"
        );

        if (sidebarBadge) {
            sidebarBadge.textContent =
                String(summary.active.length);
        }

        const sidebarCardBadge = $(".sidebar-card .badge");

        if (sidebarCardBadge) {
            sidebarCardBadge.textContent =
                `${summary.active.length} parcelamentos ativos`;
        }
    };

    const updateInterface = () => {
        const summary = calculateSummary();

        renderInstallments();
        updateHero(summary);
        updateKpis(summary);
        updateSummaryCard(summary);
        updateTimeline();
        updateSidebar(summary);
    };

    const validateForm = () => {
        const name = fields.name?.value.trim() || "";
        const total = parseValue(fields.total?.value);
        const totalParts = parseInteger(
            fields.totalParts?.value
        );

        const paidParts = parseInteger(
            fields.paidParts?.value,
            0
        );

        const dueDate = fields.dueDate?.value || "";

        if (!name) {
            showToast({
                type: "danger",
                title: "Nome obrigatório",
                message: "Digite o nome do parcelamento."
            });

            fields.name?.focus();
            return false;
        }

        if (total <= 0) {
            showToast({
                type: "danger",
                title: "Valor inválido",
                message: "Digite um valor total maior que zero."
            });

            fields.total?.focus();
            return false;
        }

        if (totalParts <= 0) {
            showToast({
                type: "danger",
                title: "Parcelas inválidas",
                message: "Digite uma quantidade de parcelas maior que zero."
            });

            fields.totalParts?.focus();
            return false;
        }

        if (paidParts < 0 || paidParts > totalParts) {
            showToast({
                type: "danger",
                title: "Parcelas pagas inválidas",
                message: "O número pago deve ficar entre zero e o total de parcelas."
            });

            fields.paidParts?.focus();
            return false;
        }

        if (!dueDate) {
            showToast({
                type: "danger",
                title: "Vencimento obrigatório",
                message: "Informe o próximo vencimento."
            });

            fields.dueDate?.focus();
            return false;
        }

        return true;
    };

    const getFormData = () => {
        const existingInstallment = installments.find(
            (installment) => {
                return installment.id === editingId;
            }
        );

        return normalizeInstallment({
            id: editingId || createId(),
            name: fields.name?.value.trim(),
            total: parseValue(fields.total?.value),
            totalParts: parseInteger(fields.totalParts?.value),
            paidParts: parseInteger(fields.paidParts?.value, 0),
            dueDate: fields.dueDate?.value,
            card: getSelectedCard(),
            description: fields.description?.value.trim() || "",
            createdAt:
                existingInstallment?.createdAt ||
                new Date().toISOString()
        });
    };

    const getSubmitButton = () => {
        return getFormElement(
            '[type="submit"]',
            "[data-installment-submit]"
        );
    };

    const setDefaultDate = () => {
        if (!fields.dueDate || fields.dueDate.value) return;

        const date = new Date();
        date.setDate(date.getDate() + 30);

        fields.dueDate.value = date
            .toISOString()
            .slice(0, 10);
    };

    const resetForm = () => {
        if (!form) return;

        form.reset();
        editingId = null;

        if (fields.paidParts) {
            fields.paidParts.value = 0;
        }

        setSelectedCard("nubank");
        setDefaultDate();

        const submitButton = getSubmitButton();

        if (submitButton) {
            submitButton.textContent = "Salvar parcelamento";
        }

        form.classList.remove("is-editing");
    };

    const fillForm = (installment) => {
        editingId = installment.id;

        if (fields.name) {
            fields.name.value = installment.name;
        }

        if (fields.total) {
            fields.total.value = installment.total;
        }

        if (fields.totalParts) {
            fields.totalParts.value = installment.totalParts;
        }

        if (fields.paidParts) {
            fields.paidParts.value = installment.paidParts;
        }

        if (fields.dueDate) {
            fields.dueDate.value = installment.dueDate;
        }

        if (fields.description) {
            fields.description.value =
                installment.description;
        }

        setSelectedCard(installment.card);

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
        const installmentData = getFormData();

        if (wasEditing) {
            installments = installments.map(
                (installment) => {
                    return installment.id === editingId
                        ? installmentData
                        : installment;
                }
            );
        } else {
            installments = [
                installmentData,
                ...installments
            ];
        }

        const saved = saveInstallments();

        if (!saved) {
            showToast({
                type: "danger",
                title: "Erro ao salvar",
                message: "Não foi possível salvar o parcelamento."
            });

            return;
        }

        resetForm();
        updateInterface();

        showToast({
            type: "success",
            title: wasEditing
                ? "Parcelamento atualizado"
                : "Parcelamento salvo",

            message: wasEditing
                ? "As alterações foram salvas com sucesso."
                : "O novo parcelamento foi adicionado."
        });
    };

    const advanceDueDate = (date) => {
        const nextDate = new Date(`${date}T12:00:00`);

        if (Number.isNaN(nextDate.getTime())) {
            nextDate.setTime(Date.now());
        }

        nextDate.setMonth(nextDate.getMonth() + 1);

        return nextDate.toISOString().slice(0, 10);
    };

    const payInstallment = (installment) => {
        if (isCompleted(installment)) {
            showToast({
                type: "info",
                title: "Parcelamento concluído",
                message: "Todas as parcelas já foram pagas."
            });

            return;
        }

        const confirmed = window.confirm(
            `Marcar uma parcela de "${installment.name}" como paga?`
        );

        if (!confirmed) return;

        installments = installments.map((item) => {
            if (item.id !== installment.id) {
                return item;
            }

            const paidParts = Math.min(
                item.paidParts + 1,
                item.totalParts
            );

            return {
                ...item,
                paidParts,
                dueDate: paidParts < item.totalParts
                    ? advanceDueDate(item.dueDate)
                    : item.dueDate
            };
        });

        const saved = saveInstallments();

        if (!saved) {
            showToast({
                type: "danger",
                title: "Erro ao pagar",
                message: "Não foi possível atualizar o parcelamento."
            });

            return;
        }

        updateInterface();

        const updatedInstallment = installments.find(
            (item) => item.id === installment.id
        );

        showToast({
            type: "success",
            title: isCompleted(updatedInstallment)
                ? "Parcelamento concluído"
                : "Parcela paga",

            message: isCompleted(updatedInstallment)
                ? "Todas as parcelas foram quitadas."
                : "O próximo vencimento foi atualizado."
        });
    };

    const deleteInstallment = (installment) => {
        const confirmed = window.confirm(
            `Deseja excluir o parcelamento "${installment.name}"?`
        );

        if (!confirmed) return;

        installments = installments.filter((item) => {
            return item.id !== installment.id;
        });

        const saved = saveInstallments();

        if (!saved) {
            showToast({
                type: "danger",
                title: "Erro ao excluir",
                message: "Não foi possível atualizar os dados."
            });

            return;
        }

        if (editingId === installment.id) {
            resetForm();
        }

        updateInterface();

        showToast({
            type: "success",
            title: "Parcelamento excluído",
            message: "O parcelamento foi removido."
        });
    };

    const handleListAction = (event) => {
        const button = event.target.closest("[data-action]");

        if (!button) return;

        const item = button.closest(
            "[data-installment-id]"
        );

        if (!item) return;

        const installment = installments.find((entry) => {
            return entry.id === item.dataset.installmentId;
        });

        if (!installment) return;

        const action = button.dataset.action;

        if (action === "pay") {
            payInstallment(installment);
        }

        if (action === "edit") {
            fillForm(installment);
        }

        if (action === "delete") {
            deleteInstallment(installment);
        }
    };

    const setupCardOptions = () => {
        cardOptions.forEach((option) => {
            option.addEventListener("click", () => {
                const input = $("input", option);

                if (!input) return;

                input.checked = true;
                updateCardOptions();
            });
        });
    };

    const setupFilters = () => {
        searchInputs.forEach((input) => {
            input.addEventListener(
                "input",
                renderInstallments
            );
        });

        const filterButton = getFirstElement(
            ".installment-filter .btn",
            "[data-action='filter-installments']"
        );

        filterButton?.addEventListener(
            "click",
            renderInstallments
        );
    };

    const setupCancelEditing = () => {
        const cancelButton = getFirstElement(
            "[data-action='cancel-installment-edit']",
            ".installment-form__cancel"
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
                "Finly: formulário ou lista de parcelamentos não encontrados."
            );

            return;
        }

        if (!getStorage()) {
            return;
        }

        loadInstallments();
        setDefaultDate();

        setupCardOptions();
        setupFilters();
        setupCancelEditing();

        form.addEventListener("submit", handleSubmit);
        list.addEventListener("click", handleListAction);

        updateCardOptions();
        updateInterface();
    };

    document.addEventListener("DOMContentLoaded", init);
})();