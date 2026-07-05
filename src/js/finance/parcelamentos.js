(() => {
    const STORAGE_KEY = "finly_installments";

    const cardLabels = {
        nubank: "Nubank",
        picpay: "PicPay",
        renner: "Renner",
        other: "Outro"
    };

    const defaultInstallments = [
        {
            id: crypto.randomUUID(),
            name: "Parcela Nubank",
            total: 1929.35,
            totalParts: 5,
            paidParts: 2,
            dueDate: "2026-07-24",
            card: "nubank",
            description: "Parcelamento principal do cartão."
        },
        {
            id: crypto.randomUUID(),
            name: "Renner",
            total: 400,
            totalParts: 2,
            paidParts: 1,
            dueDate: "2026-07-24",
            card: "renner",
            description: "Compra parcelada na loja."
        },
        {
            id: crypto.randomUUID(),
            name: "PicPay",
            total: 220,
            totalParts: 1,
            paidParts: 0,
            dueDate: "2026-07-30",
            card: "picpay",
            description: "Conta pendente no mês."
        }
    ];

    const $ = (selector, parent = document) => parent.querySelector(selector);
    const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

    const form = $(".installment-form");
    const list = $(".installment-list");
    const searchInputs = $$(".topbar__search input, .installment-filter input");

    let installments = [];
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

    const getPartValue = (item) => {
        return Number(item.total) / Number(item.totalParts || 1);
    };

    const getOpenValue = (item) => {
        const remaining = Math.max(Number(item.totalParts) - Number(item.paidParts), 0);
        return getPartValue(item) * remaining;
    };

    const getPaidValue = (item) => {
        return getPartValue(item) * Number(item.paidParts || 0);
    };

    const getProgress = (item) => {
        if (!item.totalParts) return 0;
        return Math.min(Math.round((Number(item.paidParts) / Number(item.totalParts)) * 100), 100);
    };

    const getStatus = (item) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueDate = new Date(`${item.dueDate}T12:00:00`);
        const isFinished = Number(item.paidParts) >= Number(item.totalParts);
        const isLate = dueDate < today && !isFinished;

        if (isFinished) {
            return {
                label: "Quitado",
                className: "installment-status--paid"
            };
        }

        if (isLate) {
            return {
                label: "Atrasado",
                className: "installment-status--late"
            };
        }

        return {
            label: "Em andamento",
            className: ""
        };
    };

    const getIcon = (card) => {
        const icons = {
            nubank: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 7h18v10H3V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M3 10h18" stroke="currentColor" stroke-width="2"/>
                    <path d="M7 15h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            picpay: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3v18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                    <path d="M17 7.5c0-1.38-2.24-2.5-5-2.5S7 6.12 7 7.5 9.24 10 12 10s5 1.12 5 2.5S14.76 15 12 15s-5-1.12-5-2.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
            `,
            renner: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 11h14l-1.5 8h-11L5 11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            other: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 7h10M7 12h10M7 17h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="2"/>
                </svg>
            `
        };

        return icons[card] || icons.other;
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

    const saveInstallments = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(installments));
    };

    const loadInstallments = () => {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            installments = defaultInstallments;
            saveInstallments();
            return;
        }

        try {
            installments = JSON.parse(stored);
        } catch {
            installments = defaultInstallments;
            saveInstallments();
        }
    };

    const validateInstallment = () => {
        const name = $("#installmentName").value.trim();
        const total = Number($("#installmentTotal").value);
        const totalParts = Number($("#installmentTotalParts").value);
        const paidParts = Number($("#installmentPaidParts").value);
        const dueDate = $("#installmentDueDate").value;

        if (!name) {
            showToast({
                type: "danger",
                title: "Nome obrigatório",
                message: "Digite o nome da compra parcelada."
            });

            return false;
        }

        if (!total || total <= 0) {
            showToast({
                type: "danger",
                title: "Valor inválido",
                message: "Digite o valor total da compra."
            });

            return false;
        }

        if (!totalParts || totalParts <= 0) {
            showToast({
                type: "danger",
                title: "Parcelas inválidas",
                message: "Digite uma quantidade válida de parcelas."
            });

            return false;
        }

        if (paidParts < 0 || paidParts > totalParts) {
            showToast({
                type: "danger",
                title: "Parcelas pagas inválidas",
                message: "As parcelas pagas não podem passar do total."
            });

            return false;
        }

        if (!dueDate) {
            showToast({
                type: "danger",
                title: "Vencimento obrigatório",
                message: "Informe o próximo vencimento."
            });

            return false;
        }

        return true;
    };

    const getFormData = () => {
        return {
            id: editingId || crypto.randomUUID(),
            name: $("#installmentName").value.trim(),
            total: Number($("#installmentTotal").value),
            totalParts: Number($("#installmentTotalParts").value),
            paidParts: Number($("#installmentPaidParts").value),
            dueDate: $("#installmentDueDate").value,
            card: $("#installmentCard").value,
            description: $("#installmentDescription").value.trim()
        };
    };

    const resetForm = () => {
        form.reset();
        editingId = null;
        setupDefaultDate();

        const button = $(".installment-form [type='submit']");
        if (button) button.textContent = "Salvar parcelamento";
    };

    const renderItem = (item) => {
        const progress = getProgress(item);
        const partValue = getPartValue(item);
        const status = getStatus(item);
        const cardName = cardLabels[item.card] || "Outro";

        return `
            <article class="installment-item" data-installment-id="${item.id}">
                <div class="installment-item__top">
                    <div class="installment-item__main">
                        <span class="installment-item__icon">
                            ${getIcon(item.card)}
                        </span>

                        <span class="installment-item__info">
                            <strong class="installment-item__title">${item.name}</strong>
                            <span class="installment-item__meta">${cardName} • vence ${formatDate(item.dueDate)}</span>
                        </span>
                    </div>

                    <div class="installment-item__value">
                        <strong class="installment-item__amount">${formatCurrency(partValue)}</strong>
                        <span class="installment-item__small">por parcela</span>
                    </div>
                </div>

                <div class="installment-progress">
                    <div class="installment-progress__top">
                        <span>${item.paidParts} de ${item.totalParts} parcelas pagas</span>
                        <span>${progress}%</span>
                    </div>

                    <div class="installment-progress__track">
                        <span class="installment-progress__bar" style="--progress-value: ${progress}%;"></span>
                    </div>
                </div>

                <div class="installment-item__footer">
                    <span class="installment-status ${status.className}">${status.label}</span>

                    <div class="installment-item__actions">
                        <button class="btn btn-ghost btn-sm" type="button" data-action="pay">Pagar parcela</button>
                        <button class="btn btn-ghost btn-sm" type="button" data-action="edit">Editar</button>
                        <button class="btn btn-ghost btn-sm" type="button" data-action="delete">Excluir</button>
                    </div>
                </div>
            </article>
        `;
    };

    const renderList = (items = installments) => {
        if (!list) return;

        if (!items.length) {
            list.innerHTML = `
                <div class="empty-card">
                    <span class="empty-card__icon">
                        ${getIcon("other")}
                    </span>

                    <h3 class="empty-card__title">Nenhum parcelamento encontrado</h3>
                    <p class="empty-card__text">Cadastre uma compra parcelada para acompanhar aqui.</p>
                </div>
            `;

            return;
        }

        list.innerHTML = items
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .map(renderItem)
            .join("");
    };

    const updateSummary = () => {
        const active = installments.filter((item) => Number(item.paidParts) < Number(item.totalParts));
        const openTotal = active.reduce((sum, item) => sum + getOpenValue(item), 0);
        const paidTotal = installments.reduce((sum, item) => sum + getPaidValue(item), 0);
        const monthTotal = active.reduce((sum, item) => sum + getPartValue(item), 0);
        const lateTotal = active
            .filter((item) => getStatus(item).label === "Atrasado")
            .reduce((sum, item) => sum + getPartValue(item), 0);

        const averageProgress = installments.length
            ? Math.round(installments.reduce((sum, item) => sum + getProgress(item), 0) / installments.length)
            : 0;

        $(".installments-hero-card__value").textContent = formatCurrency(openTotal);

        const heroPills = $$(".installments-hero-card__footer .installments-pill");
        if (heroPills[0]) heroPills[0].textContent = `${active.length} parcelamentos ativos`;
        if (heroPills[1]) heroPills[1].textContent = `${formatCurrency(monthTotal)} próximo vencimento`;

        const kpiValues = $$(".installments-kpi__value");
        if (kpiValues[0]) kpiValues[0].textContent = active.length;
        if (kpiValues[1]) kpiValues[1].textContent = formatCurrency(monthTotal);
        if (kpiValues[2]) kpiValues[2].textContent = `${averageProgress}%`;

        const summaryValues = $$(".installments-summary__value");
        if (summaryValues[0]) summaryValues[0].textContent = formatCurrency(openTotal);
        if (summaryValues[1]) summaryValues[1].textContent = formatCurrency(monthTotal);
        if (summaryValues[2]) summaryValues[2].textContent = formatCurrency(paidTotal);
        if (summaryValues[3]) summaryValues[3].textContent = formatCurrency(lateTotal);

        $(".sidebar-card .badge").textContent = `${active.length} ativos`;
        $(".sidebar__link[href='./parcelamentos.html'] .sidebar__badge").textContent = active.length;

        renderTimeline(active);
    };

    const renderTimeline = (active) => {
        const timeline = $(".installments-timeline");
        if (!timeline) return;

        if (!active.length) {
            timeline.innerHTML = `
                <div class="empty-card">
                    <h3 class="empty-card__title">Tudo quitado</h3>
                    <p class="empty-card__text">Você não possui parcelas em aberto no momento.</p>
                </div>
            `;

            return;
        }

        timeline.innerHTML = active
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 4)
            .map((item) => {
                const cardName = cardLabels[item.card] || "Outro";

                return `
                    <article class="installments-timeline__item">
                        <span class="installments-timeline__dot">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M8 2v4M16 2v4M3 9h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </span>

                        <span class="installments-timeline__content">
                            <strong class="installments-timeline__title">${formatDate(item.dueDate)} • ${cardName}</strong>
                            <span class="installments-timeline__text">${item.name}: parcela de ${formatCurrency(getPartValue(item))}.</span>
                        </span>
                    </article>
                `;
            })
            .join("");
    };

    const filterInstallments = () => {
        const terms = searchInputs
            .map((input) => input.value.trim().toLowerCase())
            .filter(Boolean);

        if (!terms.length) {
            renderList();
            return;
        }

        const filtered = installments.filter((item) => {
            const text = `${item.name} ${cardLabels[item.card]} ${item.description}`.toLowerCase();

            return terms.every((term) => text.includes(term));
        });

        renderList(filtered);
    };

    const fillFormToEdit = (item) => {
        editingId = item.id;

        $("#installmentName").value = item.name;
        $("#installmentTotal").value = item.total;
        $("#installmentTotalParts").value = item.totalParts;
        $("#installmentPaidParts").value = item.paidParts;
        $("#installmentDueDate").value = item.dueDate;
        $("#installmentCard").value = item.card;
        $("#installmentDescription").value = item.description || "";

        const button = $(".installment-form [type='submit']");
        if (button) button.textContent = "Salvar alterações";

        $("#novo-parcelamento").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    };

    const deleteInstallment = (id) => {
        installments = installments.filter((item) => item.id !== id);

        saveInstallments();
        renderList();
        updateSummary();

        showToast({
            type: "success",
            title: "Parcelamento excluído",
            message: "A compra parcelada foi removida da sua lista."
        });
    };

    const payInstallment = (id) => {
        installments = installments.map((item) => {
            if (item.id !== id) return item;

            return {
                ...item,
                paidParts: Math.min(Number(item.paidParts) + 1, Number(item.totalParts))
            };
        });

        saveInstallments();
        renderList();
        updateSummary();

        showToast({
            type: "success",
            title: "Parcela registrada",
            message: "O progresso do parcelamento foi atualizado."
        });
    };

    const handleActions = (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        const itemElement = event.target.closest("[data-installment-id]");
        const item = installments.find((entry) => entry.id === itemElement?.dataset.installmentId);

        if (!item) return;

        if (button.dataset.action === "pay") {
            payInstallment(item.id);
        }

        if (button.dataset.action === "edit") {
            fillFormToEdit(item);
        }

        if (button.dataset.action === "delete") {
            deleteInstallment(item.id);
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!validateInstallment()) return;

        const data = getFormData();
        const wasEditing = Boolean(editingId);

        if (wasEditing) {
            installments = installments.map((item) => item.id === editingId ? data : item);
        } else {
            installments = [data, ...installments];
        }

        saveInstallments();
        renderList();
        updateSummary();
        resetForm();

        showToast({
            type: "success",
            title: wasEditing ? "Parcelamento atualizado" : "Parcelamento salvo",
            message: "Sua lista de parcelas foi atualizada com sucesso."
        });
    };

    const setupDefaultDate = () => {
        const dateInput = $("#installmentDueDate");

        if (dateInput && !dateInput.value) {
            dateInput.valueAsDate = new Date();
        }
    };

    const setupFilters = () => {
        searchInputs.forEach((input) => {
            input.addEventListener("input", filterInstallments);
        });

        $(".installment-filter .btn")?.addEventListener("click", filterInstallments);
    };

    const init = () => {
        if (!form) return;

        loadInstallments();
        setupDefaultDate();
        setupFilters();

        form.addEventListener("submit", handleSubmit);
        list?.addEventListener("click", handleActions);

        renderList();
        updateSummary();
    };

    document.addEventListener("DOMContentLoaded", init);
})();