"use strict";

const STORAGE_KEY = "finly-data-v2";

const defaultAppState = {
  userName: "Henry",
  currentMonth: getCurrentMonthKey(),
  financialProfile: "balanced",
  monthFocus: "organizar",
  months: {}
};

let state = loadState();
let charts = {};
let currentExpenseFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
  startApp();
});

function startApp() {
  ensureCurrentMonth();
  setupNavigation();
  setupSidebar();
  setupModals();
  setupForms();
  setupActions();
  setupFilters();
  setupAi();
  fillInitialInputs();
  renderAll();
  createIcons();
}

function createIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return cloneData(defaultAppState);
    }

    const parsed = JSON.parse(saved);

    return {
      ...cloneData(defaultAppState),
      ...parsed,
      months: parsed.months && typeof parsed.months === "object" ? parsed.months : {}
    };
  } catch (error) {
    console.error("Erro ao carregar Finly:", error);
    return cloneData(defaultAppState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCurrentMonthKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function ensureCurrentMonth() {
  if (!state.currentMonth) {
    state.currentMonth = getCurrentMonthKey();
  }

  if (!state.months[state.currentMonth]) {
    state.months[state.currentMonth] = createEmptyMonth();
  }
}

function createEmptyMonth() {
  return {
    monthlyIncome: 0,
    incomes: [],
    expenses: [],
    debts: [],
    goals: []
  };
}

function getMonthData() {
  ensureCurrentMonth();
  return state.months[state.currentMonth];
}

function getMonthLabel(monthKey = state.currentMonth) {
  if (!monthKey || !monthKey.includes("-")) return "Mês atual";

  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function percent(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function numberValue(value) {
  return Math.max(0, Number(value || 0));
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateString) {
  if (!dateString) return "--";

  const [year, month, day] = dateString.split("-");

  if (!year || !month || !day) return "--";

  return `${day}/${month}/${year}`;
}

function daysUntil(dateString) {
  if (!dateString) return 9999;

  const today = new Date();
  const target = new Date(`${dateString}T12:00:00`);

  today.setHours(12, 0, 0, 0);

  return Math.ceil((target - today) / 86400000);
}

function sum(list, key) {
  return list.reduce((total, item) => total + numberValue(item[key]), 0);
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInputValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function setValue(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.value = value ?? "";
  }
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function setHTML(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.innerHTML = value;
  }
}

function setBar(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.style.width = `${Math.max(0, Math.min(100, value))}%`;
  }
}

function resetForm(id) {
  const form = document.getElementById(id);

  if (form) {
    form.reset();
  }
}

function getMonthlyIncome() {
  const data = getMonthData();
  const incomesTotal = sum(data.incomes, "amount");

  return incomesTotal > 0 ? incomesTotal : numberValue(data.monthlyIncome);
}

function getExpensesTotal() {
  return sum(getMonthData().expenses, "amount");
}

function getPendingDebtsTotal() {
  return getMonthData().debts
    .filter((debt) => debt.status !== "paid")
    .reduce((total, debt) => total + numberValue(debt.amount), 0);
}

function getPaidDebtsCount() {
  return getMonthData().debts.filter((debt) => debt.status === "paid").length;
}

function getAvailableBalance() {
  return getMonthlyIncome() - getExpensesTotal() - getPendingDebtsTotal();
}

function getCommittedPercent() {
  const income = getMonthlyIncome();

  if (income <= 0) return 0;

  return ((getExpensesTotal() + getPendingDebtsTotal()) / income) * 100;
}

function getFreePercent() {
  const income = getMonthlyIncome();

  if (income <= 0) return 0;

  return Math.max(0, (getAvailableBalance() / income) * 100);
}

function getHealthScore() {
  const data = getMonthData();
  const income = getMonthlyIncome();

  if (income <= 0) return 0;

  const committed = getCommittedPercent();
  const available = getAvailableBalance();
  const hasExpenses = data.expenses.length > 0;
  const hasDebt = getPendingDebtsTotal() > 0;
  const hasGoal = data.goals.length > 0;

  let score = 100;

  if (committed > 95) score -= 60;
  else if (committed > 80) score -= 44;
  else if (committed > 65) score -= 28;
  else if (committed > 50) score -= 14;

  if (available < 0) score -= 25;
  if (hasDebt) score -= 8;
  if (!hasExpenses) score -= 8;
  if (!hasGoal) score -= 7;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getHealthLabel(score) {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Saudável";
  if (score >= 50) return "Atenção";
  if (score > 0) return "Crítico";
  return "Aguardando dados";
}

function getPriority() {
  const income = getMonthlyIncome();
  const available = getAvailableBalance();
  const committed = getCommittedPercent();
  const pendingDebts = getPendingDebtsTotal();

  if (income <= 0) return "Cadastrar renda";
  if (available < 0) return "Cortar gastos";
  if (committed > 75) return "Reduzir compromissos";
  if (pendingDebts > 0) return "Quitar dívidas";
  if (!getMonthData().goals.length) return "Criar reserva";
  return "Investir com calma";
}

function getMainInsight() {
  const income = getMonthlyIncome();
  const expenses = getExpensesTotal();
  const debts = getPendingDebtsTotal();
  const available = getAvailableBalance();
  const committed = getCommittedPercent();

  if (income <= 0) {
    return "Cadastre sua renda mensal para o Finly calcular seu orçamento, seus limites e seu plano financeiro.";
  }

  if (available < 0) {
    return `Seu mês está negativo em ${money(Math.abs(available))}. Antes de investir, foque em cortar gastos e priorizar contas urgentes.`;
  }

  if (committed >= 75) {
    return `Você já comprometeu ${percent(committed)} da sua renda. O mês exige controle forte para não virar bola de neve.`;
  }

  if (debts > 0) {
    return `Você tem ${money(debts)} em dívidas pendentes. Priorize quitar parcelas antes de aumentar lazer ou novas compras.`;
  }

  if (expenses === 0) {
    return "Sua renda foi cadastrada. Agora adicione seus gastos para o Finly mostrar quanto realmente sobra.";
  }

  return `Seu mês está positivo em ${money(available)}. Separe parte para reserva e outra parte menor para investir com calma.`;
}

function getAllocation() {
  const income = getMonthlyIncome();
  const committed = getCommittedPercent();

  let plan = {
    essential: 50,
    debt: 20,
    reserve: 15,
    invest: 10,
    leisure: 5
  };

  if (state.financialProfile === "conservative") {
    plan = {
      essential: 50,
      debt: 20,
      reserve: 20,
      invest: 5,
      leisure: 5
    };
  }

  if (state.financialProfile === "growth") {
    plan = {
      essential: 45,
      debt: 15,
      reserve: 15,
      invest: 20,
      leisure: 5
    };
  }

  if (state.monthFocus === "quitar") {
    plan.debt += 10;
    plan.invest = Math.max(0, plan.invest - 5);
    plan.leisure = Math.max(0, plan.leisure - 5);
  }

  if (state.monthFocus === "reserva") {
    plan.reserve += 10;
    plan.invest = Math.max(0, plan.invest - 5);
    plan.leisure = Math.max(0, plan.leisure - 5);
  }

  if (state.monthFocus === "investir") {
    plan.invest += 10;
    plan.reserve = Math.max(0, plan.reserve - 5);
    plan.leisure = Math.max(0, plan.leisure - 5);
  }

  if (committed > 75) {
    plan.debt = Math.max(plan.debt, 30);
    plan.invest = Math.min(plan.invest, 5);
    plan.leisure = Math.min(plan.leisure, 5);
  }

  const total = Object.values(plan).reduce((acc, value) => acc + value, 0);

  if (total !== 100) {
    plan.essential += 100 - total;
  }

  return {
    ...plan,
    amounts: {
      essential: income * (plan.essential / 100),
      debt: income * (plan.debt / 100),
      reserve: income * (plan.reserve / 100),
      invest: income * (plan.invest / 100),
      leisure: income * (plan.leisure / 100)
    }
  };
}

function setupNavigation() {
  const links = document.querySelectorAll("[data-page-link]");
  const pages = document.querySelectorAll(".page");

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const pageId = link.dataset.pageLink;

      if (!pageId) return;

      event.preventDefault();

      pages.forEach((page) => {
        page.classList.toggle("active", page.dataset.page === pageId);
      });

      links.forEach((item) => {
        item.classList.toggle("active", item.dataset.pageLink === pageId);
      });

      history.replaceState(null, "", `#${pageId}`);
      closeSidebar();

      if (pageId === "graficos") {
        setTimeout(() => renderCharts(true), 80);
      }

      createIcons();
    });
  });

  const startPage = location.hash.replace("#", "");

  if (startPage && document.querySelector(`[data-page="${startPage}"]`)) {
    const target = document.querySelector(`[data-page-link="${startPage}"]`);
    target?.click();
  }
}

function setupSidebar() {
  document.getElementById("openSidebar")?.addEventListener("click", openSidebar);
  document.getElementById("closeSidebar")?.addEventListener("click", closeSidebar);
  document.getElementById("sidebarOverlay")?.addEventListener("click", closeSidebar);
}

function openSidebar() {
  document.getElementById("sidebar")?.classList.add("open");
  document.getElementById("sidebarOverlay")?.classList.add("open");
}

function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarOverlay")?.classList.remove("open");
}

function setupModals() {
  document.addEventListener("click", (event) => {
    const open = event.target.closest("[data-open-modal]");
    const close = event.target.closest("[data-close-modal]");
    const switcher = event.target.closest("[data-switch-modal]");

    if (event.target.closest("[data-new-income]")) resetIncomeModal();
    if (event.target.closest("[data-new-expense]")) resetExpenseModal();
    if (event.target.closest("[data-new-debt]")) resetDebtModal();
    if (event.target.closest("[data-new-goal]")) resetGoalModal();

    if (open) {
      showModal(open.dataset.openModal);
    }

    if (close) {
      hideModal(close.dataset.closeModal);
    }

    if (switcher) {
      const currentModal = switcher.closest("dialog");

      if (currentModal) {
        currentModal.close();
      }

      showModal(switcher.dataset.switchModal);
    }
  });

  document.querySelectorAll("dialog.modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.close();
      }
    });
  });
}

function showModal(id) {
  const modal = document.getElementById(id);

  if (!modal) return;

  if (!modal.open) {
    modal.showModal();
  }

  createIcons();
}

function hideModal(id) {
  const modal = document.getElementById(id);

  if (!modal) return;

  if (modal.open) {
    modal.close();
  }
}

function setupForms() {
  document.getElementById("setupForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = getMonthData();

    state.userName = getInputValue("userName") || "Usuário";
    data.monthlyIncome = numberValue(getInputValue("monthlyIncome"));
    state.financialProfile = getInputValue("financialProfile") || "balanced";
    state.monthFocus = getInputValue("monthFocus") || "organizar";

    saveState();
    renderAll();
    hideModal("setupModal");
  });

  document.getElementById("incomeForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = getMonthData();
    const editingId = getInputValue("incomeId");

    const income = {
      id: editingId || createId(),
      name: getInputValue("incomeName"),
      amount: numberValue(getInputValue("incomeAmount")),
      type: getInputValue("incomeType") || "other",
      date: getInputValue("incomeDate") || getToday()
    };

    if (editingId) {
      data.incomes = data.incomes.map((item) => item.id === editingId ? income : item);
    } else {
      data.incomes.push(income);
    }

    resetIncomeModal();
    hideModal("incomeModal");
    saveState();
    renderAll();
  });

  document.getElementById("expenseForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = getMonthData();
    const editingId = getInputValue("expenseId");

    const expense = {
      id: editingId || createId(),
      name: getInputValue("expenseName"),
      amount: numberValue(getInputValue("expenseAmount")),
      category: getInputValue("expenseCategory") || "other",
      date: getInputValue("expenseDate") || getToday(),
      recurring: document.getElementById("expenseRecurring")?.checked || false
    };

    if (editingId) {
      data.expenses = data.expenses.map((item) => item.id === editingId ? expense : item);
    } else {
      data.expenses.push(expense);
    }

    resetExpenseModal();
    hideModal("expenseModal");
    saveState();
    renderAll();
  });

  document.getElementById("debtForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = getMonthData();
    const editingId = getInputValue("debtId");

    const debt = {
      id: editingId || createId(),
      name: getInputValue("debtName"),
      amount: numberValue(getInputValue("debtAmount")),
      totalAmount: numberValue(getInputValue("debtTotalAmount")),
      currentInstallment: numberValue(getInputValue("debtCurrentInstallment")) || 1,
      installments: numberValue(getInputValue("debtInstallments")) || 1,
      category: getInputValue("debtCategory") || "other",
      dueDate: getInputValue("debtDueDate") || getToday(),
      status: getInputValue("debtStatus") || "pending"
    };

    if (editingId) {
      data.debts = data.debts.map((item) => item.id === editingId ? debt : item);
    } else {
      data.debts.push(debt);
    }

    resetDebtModal();
    hideModal("debtModal");
    saveState();
    renderAll();
  });

  document.getElementById("goalForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = getMonthData();
    const editingId = getInputValue("goalId");

    const goal = {
      id: editingId || createId(),
      name: getInputValue("goalName"),
      target: numberValue(getInputValue("goalTarget")),
      current: numberValue(getInputValue("goalCurrent")),
      icon: getInputValue("goalIcon") || "target",
      deadline: getInputValue("goalDeadline")
    };

    if (editingId) {
      data.goals = data.goals.map((item) => item.id === editingId ? goal : item);
    } else {
      data.goals.push(goal);
    }

    resetGoalModal();
    hideModal("goalModal");
    saveState();
    renderAll();
  });
}

function setupActions() {
  document.getElementById("currentMonth")?.addEventListener("change", (event) => {
    state.currentMonth = event.target.value || getCurrentMonthKey();
    ensureCurrentMonth();
    fillInitialInputs();
    saveState();
    renderAll();
  });

  document.getElementById("loadDemoData")?.addEventListener("click", loadDemoData);
  document.getElementById("heroDemoButton")?.addEventListener("click", loadDemoData);

  document.getElementById("resetData")?.addEventListener("click", () => {
    const confirmed = confirm("Tem certeza que deseja apagar todos os dados do Finly?");

    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEY);
    state = cloneData(defaultAppState);
    ensureCurrentMonth();
    fillInitialInputs();
    renderAll();
  });

  document.getElementById("exportData")?.addEventListener("click", exportData);

  document.getElementById("recalculatePlan")?.addEventListener("click", () => {
    renderAllocation();
    flashElement(".allocation-grid");
  });

  document.getElementById("refreshCharts")?.addEventListener("click", () => {
    renderCharts(true);
    flashElement(".charts-grid");
  });

  document.getElementById("markAllPaid")?.addEventListener("click", () => {
    const data = getMonthData();

    data.debts = data.debts.map((debt) => ({
      ...debt,
      status: "paid"
    }));

    saveState();
    renderAll();
  });

  document.getElementById("generateAnalysis")?.addEventListener("click", () => {
    renderAiAnalysis();
    flashElement("#aiMessage");
  });

  document.getElementById("generateMonthPlan")?.addEventListener("click", () => {
    renderMonthPlan();
    flashElement("#monthPlanMessage");
  });
}

function setupFilters() {
  document.querySelectorAll("[data-expense-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      currentExpenseFilter = button.dataset.expenseFilter || "all";

      document.querySelectorAll("[data-expense-filter]").forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");
      renderExpenses();
    });
  });
}

function setupAi() {
  document.querySelectorAll("[data-ai-question]").forEach((button) => {
    button.addEventListener("click", () => {
      const question = button.dataset.aiQuestion;
      setValue("aiInput", question);
      renderAiAnalysis(question);
    });
  });

  document.getElementById("aiForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const question = getInputValue("aiInput");

    renderAiAnalysis(question);
    setValue("aiInput", "");
  });
}

function fillInitialInputs() {
  const data = getMonthData();

  setValue("currentMonth", state.currentMonth);
  setValue("userName", state.userName || "");
  setValue("monthlyIncome", data.monthlyIncome || "");
  setValue("financialProfile", state.financialProfile || "balanced");
  setValue("monthFocus", state.monthFocus || "organizar");

  resetIncomeModal();
  resetExpenseModal();
  resetDebtModal();
  resetGoalModal();
}

function renderAll() {
  renderHeader();
  renderDashboard();
  renderAllocation();
  renderIncomes();
  renderExpenses();
  renderDebts();
  renderGoals();
  renderPlanPreview();
  renderMonthPlan();
  renderAiBase();
  renderAiStats();

  if (document.querySelector('[data-page="graficos"]')?.classList.contains("active")) {
    renderCharts(true);
  }

  createIcons();
}

function renderHeader() {
  const firstLetter = (state.userName || "U").charAt(0).toUpperCase();

  setText("sidebarUserName", state.userName || "Usuário");
  setText("userAvatar", firstLetter);
  setText("sidebarMonthLabel", getMonthLabel());
}

function renderDashboard() {
  const income = getMonthlyIncome();
  const expenses = getExpensesTotal();
  const debts = getPendingDebtsTotal();
  const available = getAvailableBalance();
  const score = getHealthScore();

  setText("heroBalance", money(available));
  setText("heroBalanceLabel", available >= 0 ? "Mês positivo até agora" : "Atenção: mês negativo");
  setText("incomeTotal", money(income));
  setText("expenseTotal", money(expenses));
  setText("debtTotal", money(debts));
  setText("availableTotal", money(available));

  setText("healthScore", score);
  setText("healthStatus", getHealthLabel(score));
  setText("committedPercent", percent(getCommittedPercent()));
  setText("freePercent", percent(getFreePercent()));
  setText("monthPriority", getPriority());
  setText("mainInsight", getMainInsight());

  const ring = document.getElementById("healthRing");

  if (ring) {
    const circumference = 427;
    const offset = circumference - (score / 100) * circumference;

    ring.style.strokeDashoffset = offset;
    ring.style.stroke = score >= 70 ? "#34d399" : score >= 50 ? "#fbbf24" : "#fb7185";
  }
}

function renderAllocation() {
  const allocation = getAllocation();

  setText("essentialPercent", `${allocation.essential}%`);
  setText("debtPercent", `${allocation.debt}%`);
  setText("reservePercent", `${allocation.reserve}%`);
  setText("investPercent", `${allocation.invest}%`);
  setText("leisurePercent", `${allocation.leisure}%`);

  setText("essentialValue", money(allocation.amounts.essential));
  setText("debtValue", money(allocation.amounts.debt));
  setText("reserveValue", money(allocation.amounts.reserve));
  setText("investValue", money(allocation.amounts.invest));
  setText("leisureValue", money(allocation.amounts.leisure));

  setBar("essentialBar", allocation.essential);
  setBar("debtBar", allocation.debt);
  setBar("reserveBar", allocation.reserve);
  setBar("investBar", allocation.invest);
  setBar("leisureBar", allocation.leisure);
}

function renderIncomes() {
  const data = getMonthData();
  const list = document.getElementById("incomeList");
  const extra = data.incomes
    .filter((income) => income.type !== "salary")
    .reduce((total, income) => total + numberValue(income.amount), 0);

  const mainIncome = [...data.incomes].sort((a, b) => b.amount - a.amount)[0];

  setText("incomePageTotal", money(getMonthlyIncome()));
  setText("extraIncomeTotal", money(extra));
  setText("mainIncomeSource", mainIncome ? mainIncome.name : data.monthlyIncome > 0 ? "Renda mensal base" : "Não definida");

  if (!list) return;

  if (!data.incomes.length) {
    list.innerHTML = emptyHTML("wallet-cards", "Nenhuma receita cadastrada", "Adicione salário, freela ou venda para começar.");
    createIcons();
    return;
  }

  list.innerHTML = data.incomes
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((income) => `
      <article class="finance-item">
        <div class="finance-item-icon income">
          <i data-lucide="${getIncomeIcon(income.type)}"></i>
        </div>

        <div class="finance-item-content">
          <strong>${escapeHTML(income.name)}</strong>
          <span>${getIncomeLabel(income.type)} • ${formatDate(income.date)}</span>
        </div>

        <div class="finance-item-value positive">
          <strong>${money(income.amount)}</strong>

          <div class="item-actions">
            <button class="item-action" type="button" data-edit-income="${income.id}" aria-label="Editar receita">
              <i data-lucide="pencil"></i>
            </button>

            <button class="item-action delete" type="button" data-delete-income="${income.id}" aria-label="Excluir receita">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      </article>
    `)
    .join("");

  document.querySelectorAll("[data-edit-income]").forEach((button) => {
    button.addEventListener("click", () => editIncome(button.dataset.editIncome));
  });

  document.querySelectorAll("[data-delete-income]").forEach((button) => {
    button.addEventListener("click", () => {
      getMonthData().incomes = getMonthData().incomes.filter((income) => income.id !== button.dataset.deleteIncome);
      saveState();
      renderAll();
    });
  });

  createIcons();
}

function renderExpenses() {
  const data = getMonthData();
  const list = document.getElementById("expenseList");
  const income = getMonthlyIncome();
  const total = getExpensesTotal();
  const usage = income > 0 ? (total / income) * 100 : 0;

  setText("expensePageTotal", money(total));
  setText("budgetUsage", percent(usage));
  setBar("budgetUsageBar", Math.min(usage, 100));
  setText("expenseAdvice", getExpenseAdvice());

  if (!list) return;

  const filtered = data.expenses.filter((expense) => {
    if (currentExpenseFilter === "all") return true;
    if (currentExpenseFilter === "variable") return !["fixed", "subscription"].includes(expense.category);
    return expense.category === currentExpenseFilter;
  });

  if (!filtered.length) {
    list.innerHTML = emptyHTML("receipt", "Nenhum gasto encontrado", "Adicione ou filtre seus gastos para visualizar aqui.");
    createIcons();
    return;
  }

  list.innerHTML = filtered
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((expense) => `
      <article class="finance-item">
        <div class="finance-item-icon expense">
          <i data-lucide="${getExpenseIcon(expense.category)}"></i>
        </div>

        <div class="finance-item-content">
          <strong>${escapeHTML(expense.name)}</strong>
          <span>${getExpenseLabel(expense.category)} • ${formatDate(expense.date)}${expense.recurring ? " • Recorrente" : ""}</span>
        </div>

        <div class="finance-item-value negative">
          <strong>${money(expense.amount)}</strong>

          <div class="item-actions">
            <button class="item-action" type="button" data-edit-expense="${expense.id}" aria-label="Editar gasto">
              <i data-lucide="pencil"></i>
            </button>

            <button class="item-action delete" type="button" data-delete-expense="${expense.id}" aria-label="Excluir gasto">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      </article>
    `)
    .join("");

  document.querySelectorAll("[data-edit-expense]").forEach((button) => {
    button.addEventListener("click", () => editExpense(button.dataset.editExpense));
  });

  document.querySelectorAll("[data-delete-expense]").forEach((button) => {
    button.addEventListener("click", () => {
      getMonthData().expenses = getMonthData().expenses.filter((expense) => expense.id !== button.dataset.deleteExpense);
      saveState();
      renderAll();
    });
  });

  createIcons();
}

function renderDebts() {
  const data = getMonthData();
  const table = document.getElementById("debtTable");
  const pendingDebts = data.debts.filter((debt) => debt.status !== "paid");
  const pendingTotal = getPendingDebtsTotal();
  const income = getMonthlyIncome();
  const debtRiskPercent = income > 0 ? (pendingTotal / income) * 100 : 0;
  const nextDebt = pendingDebts
    .slice()
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))[0];

  setText("debtPageTotal", money(pendingTotal));
  setText("nextDueDate", nextDebt ? formatDate(nextDebt.dueDate) : "--");
  setText("paidDebts", getPaidDebtsCount());
  setText("debtRisk", getDebtRiskLabel(debtRiskPercent));

  if (!table) return;

  if (!data.debts.length) {
    table.innerHTML = `
      <tr>
        <td colspan="7">
          ${emptyHTML("credit-card", "Nenhuma dívida cadastrada", "Adicione parcelas, cartão ou pendências para organizar seu mês.")}
        </td>
      </tr>
    `;
    createIcons();
    return;
  }

  table.innerHTML = data.debts
    .slice()
    .sort((a, b) => {
      if (a.status === "paid" && b.status !== "paid") return 1;
      if (a.status !== "paid" && b.status === "paid") return -1;
      return daysUntil(a.dueDate) - daysUntil(b.dueDate);
    })
    .map((debt) => {
      const priority = getDebtPriority(debt);
      const status = getDebtStatusView(debt);

      return `
        <tr>
          <td>
            <strong class="table-title">${escapeHTML(debt.name)}</strong>
          </td>

          <td>${getDebtLabel(debt.category)}</td>

          <td>
            ${money(debt.amount)}
            <small>${debt.currentInstallment || 1}/${debt.installments || 1}</small>
          </td>

          <td>${formatDate(debt.dueDate)}</td>

          <td>
            <button class="status-badge ${status.className}" type="button" data-toggle-debt="${debt.id}">
              ${status.label}
            </button>
          </td>

          <td>
            <span class="priority-badge ${priority.level}">${priority.label}</span>
          </td>

          <td>
            <div class="item-actions">
              <button class="item-action" type="button" data-edit-debt="${debt.id}" aria-label="Editar dívida">
                <i data-lucide="pencil"></i>
              </button>

              <button class="item-action delete" type="button" data-delete-debt="${debt.id}" aria-label="Excluir dívida">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll("[data-toggle-debt]").forEach((button) => {
    button.addEventListener("click", () => {
      data.debts = data.debts.map((debt) => {
        if (debt.id !== button.dataset.toggleDebt) return debt;

        return {
          ...debt,
          status: debt.status === "paid" ? "pending" : "paid"
        };
      });

      saveState();
      renderAll();
    });
  });

  document.querySelectorAll("[data-edit-debt]").forEach((button) => {
    button.addEventListener("click", () => editDebt(button.dataset.editDebt));
  });

  document.querySelectorAll("[data-delete-debt]").forEach((button) => {
    button.addEventListener("click", () => {
      data.debts = data.debts.filter((debt) => debt.id !== button.dataset.deleteDebt);
      saveState();
      renderAll();
    });
  });

  createIcons();
}

function renderGoals() {
  const data = getMonthData();
  const grid = document.getElementById("goalsGrid");

  const monthlySafetyTarget = Math.max(getExpensesTotal() + getPendingDebtsTotal(), getMonthlyIncome() * 0.35);
  const savedTotal = data.goals.reduce((total, goal) => total + numberValue(goal.current), 0);
  const progress = monthlySafetyTarget > 0 ? (savedTotal / monthlySafetyTarget) * 100 : 0;

  setText("emergencyProgressText", percent(Math.min(progress, 100)));
  setBar("emergencyProgressBar", Math.min(progress, 100));

  if (!grid) return;

  grid.querySelectorAll("[data-goal-card]").forEach((card) => card.remove());

  if (!data.goals.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.dataset.goalCard = "empty";
    empty.innerHTML = `
      <i data-lucide="target"></i>
      <strong>Nenhuma meta personalizada</strong>
      <p>Crie uma meta e acompanhe seu progresso em tempo real.</p>
    `;
    grid.appendChild(empty);
    createIcons();
    return;
  }

  data.goals.forEach((goal) => {
    const goalProgress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
    const card = document.createElement("article");

    card.className = "goal-card";
    card.dataset.goalCard = goal.id;

    card.innerHTML = `
      <div class="goal-card-top">
        <div class="goal-icon">
          <i data-lucide="${escapeHTML(goal.icon)}"></i>
        </div>

        <div class="item-actions">
          <button class="item-action" type="button" data-edit-goal="${goal.id}" aria-label="Editar meta">
            <i data-lucide="pencil"></i>
          </button>

          <button class="item-action delete" type="button" data-delete-goal="${goal.id}" aria-label="Excluir meta">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>

      <div>
        <span>Meta pessoal</span>
        <h3>${escapeHTML(goal.name)}</h3>
        <p>${money(goal.current)} guardado de ${money(goal.target)}${goal.deadline ? ` • Prazo ${formatDate(goal.deadline)}` : ""}</p>

        <div class="goal-progress">
          <div>
            <span>Progresso</span>
            <strong>${percent(Math.min(goalProgress, 100))}</strong>
          </div>

          <div class="progress-bar">
            <span style="width: ${Math.min(goalProgress, 100)}%"></span>
          </div>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  document.querySelectorAll("[data-edit-goal]").forEach((button) => {
    button.addEventListener("click", () => editGoal(button.dataset.editGoal));
  });

  document.querySelectorAll("[data-delete-goal]").forEach((button) => {
    button.addEventListener("click", () => {
      getMonthData().goals = getMonthData().goals.filter((goal) => goal.id !== button.dataset.deleteGoal);
      saveState();
      renderAll();
    });
  });

  createIcons();
}

function renderPlanPreview() {
  const items = getPlanItems().slice(0, 4);

  setHTML("dashboardPlanList", items.map((item) => `
    <div class="plan-preview-item">
      <i data-lucide="${item.icon}"></i>
      <span>${item.text}</span>
    </div>
  `).join(""));

  createIcons();
}

function renderMonthPlan() {
  const income = getMonthlyIncome();
  const expenses = getExpensesTotal();
  const debts = getPendingDebtsTotal();
  const available = getAvailableBalance();
  const committed = getCommittedPercent();
  const allocation = getAllocation();
  const nextDebt = getMonthData().debts
    .filter((debt) => debt.status !== "paid")
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))[0];

  if (income <= 0) {
    setHTML("monthPlanMessage", `
      <p>Cadastre sua renda mensal para o Finly montar seu plano. Sem renda cadastrada, não dá para calcular quanto guardar, investir ou pagar em dívidas.</p>
    `);
    return;
  }

  const debtText = nextDebt
    ? `A dívida mais urgente é <strong>${escapeHTML(nextDebt.name)}</strong>, com vencimento em <strong>${formatDate(nextDebt.dueDate)}</strong>.`
    : "Você não possui dívidas pendentes cadastradas.";

  setHTML("monthPlanMessage", `
    <p>Para <strong>${getMonthLabel()}</strong>, sua renda analisada é de <strong>${money(income)}</strong>. Você já comprometeu aproximadamente <strong>${percent(committed)}</strong> com gastos e dívidas.</p>

    <div class="plan-card-grid">
      <div>
        <span>Disponível</span>
        <strong>${money(available)}</strong>
      </div>

      <div>
        <span>Reserva sugerida</span>
        <strong>${money(allocation.amounts.reserve)}</strong>
      </div>

      <div>
        <span>Investimento sugerido</span>
        <strong>${money(allocation.amounts.invest)}</strong>
      </div>
    </div>

    <p>${debtText}</p>

    <p><strong>Estratégia do mês:</strong> ${getMainInsight()}</p>

    <p><strong>Regra prática:</strong> primeiro pague o que vence, depois guarde uma parte pequena e só depois pense em lazer ou compras novas.</p>
  `);
}

function getPlanItems() {
  const income = getMonthlyIncome();
  const available = getAvailableBalance();
  const debts = getPendingDebtsTotal();
  const committed = getCommittedPercent();

  const items = [];

  if (income <= 0) {
    items.push({
      icon: "banknote",
      text: "Cadastre sua renda mensal para liberar o plano inteligente."
    });
  }

  if (available < 0) {
    items.push({
      icon: "triangle-alert",
      text: `Seu mês está negativo em ${money(Math.abs(available))}. Corte gastos antes de assumir novas compras.`
    });
  }

  if (debts > 0) {
    items.push({
      icon: "credit-card",
      text: `Priorize quitar ${money(debts)} em dívidas pendentes.`
    });
  }

  if (committed > 70) {
    items.push({
      icon: "gauge",
      text: `Sua renda comprometida está em ${percent(committed)}. O ideal é reduzir para abaixo de 60%.`
    });
  }

  if (income > 0 && available > 0) {
    items.push({
      icon: "piggy-bank",
      text: `Separe uma parte do saldo positivo de ${money(available)} para reserva.`
    });
  }

  if (!getMonthData().goals.length) {
    items.push({
      icon: "target",
      text: "Crie pelo menos uma meta financeira para dar direção ao seu dinheiro."
    });
  }

  if (!items.length) {
    items.push({
      icon: "check-circle-2",
      text: "Seu mês está organizado. Continue acompanhando os gráficos e vencimentos."
    });
  }

  return items;
}

function renderAiBase() {
  const data = getMonthData();

  if (getMonthlyIncome() <= 0 && !data.incomes.length && !data.expenses.length && !data.debts.length) {
    setHTML("aiMessage", `
      <p>Cadastre renda, gastos, dívidas e metas. Depois eu gero uma análise dizendo quanto você pode investir, quanto deve guardar e o que precisa quitar primeiro.</p>
    `);
  }
}

function renderAiStats() {
  const data = getMonthData();

  setText("aiIncomeCount", data.incomes.length);
  setText("aiExpenseCount", data.expenses.length);
  setText("aiDebtCount", data.debts.length);
  setText("aiGoalCount", data.goals.length);
}

function renderAiAnalysis(question = "") {
  const income = getMonthlyIncome();
  const available = getAvailableBalance();
  const committed = getCommittedPercent();
  const allocation = getAllocation();
  const nextDebt = getMonthData().debts
    .filter((debt) => debt.status !== "paid")
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))[0];

  if (income <= 0) {
    setHTML("aiMessage", `
      <p><strong>Primeiro passo:</strong> cadastre sua renda mensal. Sem isso, não dá para calcular porcentagens, limite de gastos ou valor ideal para guardar.</p>
      <p>Depois disso, o Finly consegue montar uma divisão automática para contas, dívidas, reserva, investimento e lazer.</p>
    `);
    return;
  }

  let status = "sua situação está controlada";
  let tone = "positive";

  if (available < 0) {
    status = "seu mês está negativo";
    tone = "danger";
  } else if (committed >= 70) {
    status = "sua renda está muito comprometida";
    tone = "warning";
  } else if (committed >= 50) {
    status = "seu mês exige atenção";
    tone = "warning";
  }

  const debtLine = nextDebt
    ? `A dívida mais urgente é <strong>${escapeHTML(nextDebt.name)}</strong>, vencendo em <strong>${formatDate(nextDebt.dueDate)}</strong>.`
    : "Você não possui dívidas pendentes cadastradas.";

  const safeReserve = available > 0 ? Math.min(available * 0.45, allocation.amounts.reserve) : 0;
  const safeInvest = available > 0 ? Math.min(available * 0.35, allocation.amounts.invest) : 0;

  const questionText = question
    ? `<p class="ai-question"><strong>Pergunta:</strong> ${escapeHTML(question)}</p>`
    : "";

  setHTML("aiMessage", `
    ${questionText}

    <div class="ai-result ${tone}">
      <h4>Diagnóstico Finly</h4>
      <p>Com base nos dados cadastrados, <strong>${status}</strong>.</p>
    </div>

    <div class="ai-cards">
      <div>
        <span>Renda</span>
        <strong>${money(income)}</strong>
      </div>

      <div>
        <span>Comprometido</span>
        <strong>${percent(committed)}</strong>
      </div>

      <div>
        <span>Disponível</span>
        <strong>${money(available)}</strong>
      </div>
    </div>

    <p>${getMainInsight()}</p>

    <p>${debtLine}</p>

    <p><strong>Sugestão prática:</strong> este mês, tente separar aproximadamente <strong>${money(safeReserve)}</strong> para reserva e <strong>${money(safeInvest)}</strong> para investimento. Se tiver conta vencendo, ela vem primeiro.</p>

    <p><strong>Regra do Finly:</strong> não tente parecer rico agora. Primeiro fique leve, sem sufoco, com reserva e controle.</p>
  `);
}

function renderCharts(force = false) {
  if (!window.Chart) return;

  const chartPageActive = document.querySelector('[data-page="graficos"]')?.classList.contains("active");

  if (!chartPageActive && !force) return;

  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.color = "#cbd5e1";
  Chart.defaults.borderColor = "rgba(255, 255, 255, 0.08)";

  const income = getMonthlyIncome();
  const expenses = getExpensesTotal();
  const debts = getPendingDebtsTotal();
  const available = Math.max(getAvailableBalance(), 0);

  const spendingData = [
    { label: "Gastos", value: expenses },
    { label: "Dívidas", value: debts },
    { label: "Disponível", value: available }
  ].filter((item) => item.value > 0);

  createOrUpdateChart("spendingChart", {
    type: "doughnut",
    data: {
      labels: spendingData.length ? spendingData.map((item) => item.label) : ["Sem dados"],
      datasets: [
        {
          data: spendingData.length ? spendingData.map((item) => item.value) : [1],
          backgroundColor: spendingData.length
            ? ["#38bdf8", "#fbbf24", "#34d399"]
            : ["rgba(255,255,255,0.12)"],
          borderColor: "rgba(15, 23, 42, 0.95)",
          borderWidth: 5,
          hoverOffset: 10
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            padding: 18
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${money(context.raw)}`
          }
        }
      }
    }
  });

  const balanceNow = getAvailableBalance();
  const base = income || 1700;

  createOrUpdateChart("balanceChart", {
    type: "line",
    data: {
      labels: ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
      datasets: [
        {
          label: "Saldo previsto",
          data: [
            base,
            base - expenses * 0.35,
            base - expenses * 0.75 - debts * 0.3,
            balanceNow
          ],
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56, 189, 248, 0.16)",
          fill: true,
          tension: 0.42,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: lineOptions()
  });

  const categories = getExpenseCategories();

  createOrUpdateChart("categoryChart", {
    type: "bar",
    data: {
      labels: categories.length ? categories.map((item) => item.label) : ["Sem gastos"],
      datasets: [
        {
          label: "Valor",
          data: categories.length ? categories.map((item) => item.value) : [0],
          backgroundColor: "rgba(56, 189, 248, 0.72)",
          borderColor: "#38bdf8",
          borderWidth: 1,
          borderRadius: 12,
          maxBarThickness: 46
        }
      ]
    },
    options: barOptions()
  });

  const pendingDebts = getMonthData().debts.filter((debt) => debt.status !== "paid");

  createOrUpdateChart("debtChart", {
    type: "bar",
    data: {
      labels: pendingDebts.length ? pendingDebts.map((debt) => debt.name.slice(0, 14)) : ["Sem dívidas"],
      datasets: [
        {
          label: "Parcelas",
          data: pendingDebts.length ? pendingDebts.map((debt) => debt.amount) : [0],
          backgroundColor: "rgba(251, 191, 36, 0.72)",
          borderColor: "#fbbf24",
          borderWidth: 1,
          borderRadius: 12,
          maxBarThickness: 46
        }
      ]
    },
    options: barOptions()
  });
}

function createOrUpdateChart(id, config) {
  const canvas = document.getElementById(id);

  if (!canvas) return;

  if (charts[id]) {
    charts[id].destroy();
  }

  charts[id] = new Chart(canvas, config);
}

function lineOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index"
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => money(value).replace(",00", "")
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => money(context.raw)
        }
      }
    }
  };
}

function barOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => money(value).replace(",00", "")
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => money(context.raw)
        }
      }
    }
  };
}

function getExpenseCategories() {
  const map = new Map();

  getMonthData().expenses.forEach((expense) => {
    const label = getExpenseLabel(expense.category);
    map.set(label, (map.get(label) || 0) + numberValue(expense.amount));
  });

  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function editIncome(id) {
  const income = getMonthData().incomes.find((item) => item.id === id);

  if (!income) return;

  setValue("incomeId", income.id);
  setValue("incomeName", income.name);
  setValue("incomeAmount", income.amount);
  setValue("incomeType", income.type);
  setValue("incomeDate", income.date);

  setText("incomeModalTitle", "Editar receita");
  setHTML("incomeSubmitText", `<i data-lucide="save"></i> Salvar alterações`);

  showModal("incomeModal");
  createIcons();
}

function editExpense(id) {
  const expense = getMonthData().expenses.find((item) => item.id === id);

  if (!expense) return;

  setValue("expenseId", expense.id);
  setValue("expenseName", expense.name);
  setValue("expenseAmount", expense.amount);
  setValue("expenseCategory", expense.category);
  setValue("expenseDate", expense.date);

  const recurring = document.getElementById("expenseRecurring");
  if (recurring) recurring.checked = Boolean(expense.recurring);

  setText("expenseModalTitle", "Editar gasto");
  setHTML("expenseSubmitText", `<i data-lucide="save"></i> Salvar alterações`);

  showModal("expenseModal");
  createIcons();
}

function editDebt(id) {
  const debt = getMonthData().debts.find((item) => item.id === id);

  if (!debt) return;

  setValue("debtId", debt.id);
  setValue("debtName", debt.name);
  setValue("debtAmount", debt.amount);
  setValue("debtTotalAmount", debt.totalAmount);
  setValue("debtCurrentInstallment", debt.currentInstallment);
  setValue("debtInstallments", debt.installments);
  setValue("debtCategory", debt.category);
  setValue("debtDueDate", debt.dueDate);
  setValue("debtStatus", debt.status);

  setText("debtModalTitle", "Editar dívida");
  setHTML("debtSubmitText", `<i data-lucide="save"></i> Salvar alterações`);

  showModal("debtModal");
  createIcons();
}

function editGoal(id) {
  const goal = getMonthData().goals.find((item) => item.id === id);

  if (!goal) return;

  setValue("goalId", goal.id);
  setValue("goalName", goal.name);
  setValue("goalTarget", goal.target);
  setValue("goalCurrent", goal.current);
  setValue("goalIcon", goal.icon);
  setValue("goalDeadline", goal.deadline);

  setText("goalModalTitle", "Editar meta");
  setHTML("goalSubmitText", `<i data-lucide="save"></i> Salvar alterações`);

  showModal("goalModal");
  createIcons();
}

function resetIncomeModal() {
  resetForm("incomeForm");
  setValue("incomeId", "");
  setValue("incomeDate", getToday());
  setText("incomeModalTitle", "Nova receita");
  setHTML("incomeSubmitText", `<i data-lucide="plus"></i> Salvar receita`);
}

function resetExpenseModal() {
  resetForm("expenseForm");
  setValue("expenseId", "");
  setValue("expenseDate", getToday());
  setText("expenseModalTitle", "Novo gasto");
  setHTML("expenseSubmitText", `<i data-lucide="plus"></i> Salvar gasto`);
}

function resetDebtModal() {
  resetForm("debtForm");
  setValue("debtId", "");
  setValue("debtDueDate", getToday());
  setText("debtModalTitle", "Nova dívida");
  setHTML("debtSubmitText", `<i data-lucide="plus"></i> Salvar dívida`);
}

function resetGoalModal() {
  resetForm("goalForm");
  setValue("goalId", "");
  setText("goalModalTitle", "Nova meta");
  setHTML("goalSubmitText", `<i data-lucide="target"></i> Salvar meta`);
}

function loadDemoData() {
  state.userName = "Henry";
  state.currentMonth = getCurrentMonthKey();
  state.financialProfile = "balanced";
  state.monthFocus = "quitar";

  state.months[state.currentMonth] = {
    monthlyIncome: 1700,
    incomes: [
      {
        id: createId(),
        name: "Salário",
        amount: 1700,
        type: "salary",
        date: getToday()
      }
    ],
    expenses: [
      {
        id: createId(),
        name: "Academia",
        amount: 170,
        category: "health",
        date: getToday(),
        recurring: true
      },
      {
        id: createId(),
        name: "Spotify",
        amount: 12.9,
        category: "subscription",
        date: getToday(),
        recurring: true
      },
      {
        id: createId(),
        name: "Transporte",
        amount: 150,
        category: "transport",
        date: getToday(),
        recurring: false
      },
      {
        id: createId(),
        name: "Lazer",
        amount: 120,
        category: "leisure",
        date: getToday(),
        recurring: false
      }
    ],
    debts: [
      {
        id: createId(),
        name: "Renner",
        amount: 98.9,
        totalAmount: 200,
        currentInstallment: 2,
        installments: 2,
        category: "store",
        dueDate: getToday(),
        status: "pending"
      },
      {
        id: createId(),
        name: "ChatGPT Plus",
        amount: 99.9,
        totalAmount: 99.9,
        currentInstallment: 1,
        installments: 1,
        category: "subscription",
        dueDate: getToday(),
        status: "pending"
      }
    ],
    goals: [
      {
        id: createId(),
        name: "Reserva de emergência",
        target: 1000,
        current: 160,
        icon: "shield-check",
        deadline: ""
      },
      {
        id: createId(),
        name: "Renovar ferramentas",
        target: 500,
        current: 80,
        icon: "sparkles",
        deadline: ""
      }
    ]
  };

  saveState();
  fillInitialInputs();
  renderAll();
  renderCharts(true);
}

function exportData() {
  const exportContent = {
    exportedAt: new Date().toISOString(),
    app: "Finly",
    state
  };

  const blob = new Blob([JSON.stringify(exportContent, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `finly-${state.currentMonth}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

function flashElement(selector) {
  const element = document.querySelector(selector);

  if (!element) return;

  element.animate(
    [
      { transform: "scale(1)", filter: "brightness(1)" },
      { transform: "scale(1.01)", filter: "brightness(1.18)" },
      { transform: "scale(1)", filter: "brightness(1)" }
    ],
    {
      duration: 420,
      easing: "ease"
    }
  );
}

function emptyHTML(icon, title, text) {
  return `
    <div class="empty-state">
      <i data-lucide="${icon}"></i>
      <strong>${title}</strong>
      <p>${text}</p>
    </div>
  `;
}

function getExpenseAdvice() {
  const income = getMonthlyIncome();
  const expenses = getExpensesTotal();

  if (income <= 0) return "Cadastre sua renda para o Finly calcular seu limite ideal de gastos.";

  const usage = (expenses / income) * 100;

  if (usage <= 35) return "Seus gastos estão leves em relação à renda. Bom momento para criar reserva.";
  if (usage <= 55) return "Seus gastos estão aceitáveis, mas vale revisar assinaturas e compras pequenas.";
  if (usage <= 75) return "Atenção: seus gastos já ocupam uma parte alta da renda.";
  return "Cuidado: seus gastos estão pesados. Evite novas compras e revise prioridades.";
}

function getDebtRiskLabel(value) {
  if (value >= 50) return "Alto";
  if (value >= 30) return "Médio";
  return "Baixo";
}

function getDebtPriority(debt) {
  if (debt.status === "paid") {
    return {
      label: "Quitada",
      level: "low"
    };
  }

  const days = daysUntil(debt.dueDate);

  if (days < 0) {
    return {
      label: "Atrasada",
      level: "high"
    };
  }

  if (days <= 3) {
    return {
      label: "Urgente",
      level: "high"
    };
  }

  if (days <= 10) {
    return {
      label: "Alta",
      level: "medium"
    };
  }

  return {
    label: "Normal",
    level: "low"
  };
}

function getDebtStatusView(debt) {
  if (debt.status === "paid") {
    return {
      label: "Pago",
      className: "paid"
    };
  }

  const days = daysUntil(debt.dueDate);

  if (days < 0) {
    return {
      label: "Atrasado",
      className: "overdue"
    };
  }

  if (days === 0) {
    return {
      label: "Vence hoje",
      className: "today"
    };
  }

  return {
    label: "Pendente",
    className: "pending"
  };
}

function getIncomeIcon(type) {
  const icons = {
    salary: "banknote",
    freelance: "briefcase-business",
    business: "store",
    extra: "sparkles",
    other: "circle-dollar-sign"
  };

  return icons[type] || "wallet";
}

function getIncomeLabel(type) {
  const labels = {
    salary: "Salário",
    freelance: "Freela",
    business: "Venda",
    extra: "Renda extra",
    other: "Outro"
  };

  return labels[type] || "Receita";
}

function getExpenseIcon(category) {
  const icons = {
    fixed: "home",
    food: "utensils",
    transport: "car",
    leisure: "gamepad-2",
    health: "heart-pulse",
    education: "book-open",
    subscription: "badge-dollar-sign",
    other: "receipt"
  };

  return icons[category] || "receipt";
}

function getExpenseLabel(category) {
  const labels = {
    fixed: "Fixo",
    food: "Alimentação",
    transport: "Transporte",
    leisure: "Lazer",
    health: "Saúde",
    education: "Educação",
    subscription: "Assinatura",
    other: "Outro"
  };

  return labels[category] || "Outro";
}

function getDebtLabel(category) {
  const labels = {
    card: "Cartão",
    store: "Loja",
    sport: "Esporte",
    subscription: "Assinatura",
    health: "Saúde",
    education: "Educação",
    other: "Outro"
  };

  return labels[category] || "Outro";
}