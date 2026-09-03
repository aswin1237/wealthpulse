/* ==========================================================================
   WEALTHPULSE — APPLICATION LOGIC
   ========================================================================== */

// --- Global Application State ---
const DEFAULT_INCOME = {
  grossAnnual: 85000,
  taxRate: 20,
  sideIncome: 0,
  targetSavings: 2000
};

const DEFAULT_EXPENSES = [
  { id: 'exp_1', title: 'Apartment Rent / Housing', amount: 1500, category: 'Housing', frequency: 'Monthly', date: getTodayDateString(), notes: 'Monthly rent including water' },
  { id: 'exp_2', title: 'Supermarket Groceries', amount: 450, category: 'Food & Dining', frequency: 'Monthly', date: getTodayDateString(), notes: 'Weekly grocery supplies' },
  { id: 'exp_3', title: 'Car Loan EMI', amount: 350, category: 'Debt & Loans', frequency: 'Monthly', date: getTodayDateString(), notes: 'Fixed auto financing' },
  { id: 'exp_4', title: 'Electricity & High-Speed Internet', amount: 180, category: 'Utilities & Bills', frequency: 'Monthly', date: getTodayDateString(), notes: 'Utilities' },
  { id: 'exp_5', title: 'Weekend Dining & Outing', amount: 120, category: 'Food & Dining', frequency: 'Monthly', date: getTodayDateString(), notes: 'Restaurants' },
  { id: 'exp_6', title: 'Gym & Health Club', amount: 60, category: 'Healthcare', frequency: 'Monthly', date: getTodayDateString(), notes: 'Fitness membership' },
  { id: 'exp_7', title: 'Morning Artisanal Coffee', amount: 4.50, category: 'Food & Dining', frequency: 'Daily', date: getTodayDateString(), notes: 'Daily espresso' },
  { id: 'exp_8', title: 'Gas & Transit Pass', amount: 110, category: 'Transportation', frequency: 'Monthly', date: getTodayDateString(), notes: 'Commute' }
];

let appState = {
  currency: '$',
  income: { ...DEFAULT_INCOME },
  expenses: [...DEFAULT_EXPENSES]
};

// PWA Deferred Prompt
let deferredPwaPrompt = null;

// Chart References
let donutChartInstance = null;
let barChartInstance = null;

// Category Color Mapping
const CATEGORY_COLORS = {
  'Housing': '#3b82f6',
  'Food & Dining': '#ec4899',
  'Transportation': '#f59e0b',
  'Utilities & Bills': '#8b5cf6',
  'Entertainment': '#06b6d4',
  'Healthcare': '#10b981',
  'Shopping': '#f43f5e',
  'Debt & Loans': '#ef4444',
  'Savings & Investment': '#6366f1',
  'Miscellaneous': '#64748b'
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadStateFromLocalStorage();
  initLucideIcons();
  setupEventListeners();
  setupPwaListeners();
  calculateAndRenderAll();
});

function initLucideIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function getTodayDateString() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// --- LocalStorage Logic ---
function saveStateToLocalStorage() {
  localStorage.setItem('wealthpulse_state', JSON.stringify(appState));
}

function loadStateFromLocalStorage() {
  const saved = localStorage.getItem('wealthpulse_state');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      appState = { ...appState, ...parsed };
    } catch (e) {
      console.error('Error loading state from localStorage', e);
    }
  }
}

// --- Formatters ---
function formatMoney(amount) {
  const symbol = appState.currency || '$';
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return (amount < 0 ? '-' : '') + symbol + formatted;
}

// --- PWA Installation Logic ---
function setupPwaListeners() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    const nativeBox = document.getElementById('pwaNativeInstallBox');
    if (nativeBox) nativeBox.style.display = 'block';
  });

  const triggerBtn = document.getElementById('btnTriggerPwaNative');
  if (triggerBtn) {
    triggerBtn.addEventListener('click', async () => {
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const choiceResult = await deferredPwaPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
        }
        deferredPwaPrompt = null;
        closePwaModal();
      }
    });
  }

  const installBtns = ['btnInstallPwaSidebar', 'btnInstallPwaHeader', 'btnInstallPwaMobile'];
  installBtns.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', openPwaModal);
  });
}

function openPwaModal() {
  const modal = document.getElementById('pwaInstallModal');
  const nativeBox = document.getElementById('pwaNativeInstallBox');
  const iosBox = document.getElementById('pwaIosInstallBox');
  const androidBox = document.getElementById('pwaAndroidBox');

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (nativeBox) nativeBox.style.display = deferredPwaPrompt ? 'block' : 'none';
  if (iosBox) iosBox.style.display = isIos ? 'block' : 'none';
  if (androidBox) androidBox.style.display = (!isIos && !deferredPwaPrompt) ? 'block' : 'none';

  if (modal) modal.classList.remove('hidden');
  initLucideIcons();
}

function closePwaModal() {
  const modal = document.getElementById('pwaInstallModal');
  if (modal) modal.classList.add('hidden');
}

// --- Event Listeners ---
function setupEventListeners() {
  // Navigation Tabs (Desktop Sidebar + Mobile Bottom Bar)
  document.querySelectorAll('.nav-item, .mob-nav-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.getAttribute('data-tab');
      switchTab(tabTarget);
    });
  });

  // Currency Selectors (Desktop + Mobile)
  const currencySelect = document.getElementById('currencySelect');
  const currencySelectMobile = document.getElementById('currencySelectMobile');
  
  if (currencySelect) currencySelect.value = appState.currency;
  if (currencySelectMobile) currencySelectMobile.value = appState.currency;

  const onCurrencyChange = (e) => {
    appState.currency = e.target.value;
    if (currencySelect) currencySelect.value = appState.currency;
    if (currencySelectMobile) currencySelectMobile.value = appState.currency;
    saveStateToLocalStorage();
    calculateAndRenderAll();
  };

  if (currencySelect) currencySelect.addEventListener('change', onCurrencyChange);
  if (currencySelectMobile) currencySelectMobile.addEventListener('change', onCurrencyChange);

  // Quick Add Buttons & Header Actions
  const quickAdd = document.getElementById('btnQuickAdd');
  if (quickAdd) quickAdd.addEventListener('click', () => openExpenseModal());

  const exportBtn = document.getElementById('btnExportData');
  if (exportBtn) exportBtn.addEventListener('click', exportExpensesCSV);

  const exportBtnMobile = document.getElementById('btnExportDataMobile');
  if (exportBtnMobile) exportBtnMobile.addEventListener('click', exportExpensesCSV);

  // Expense Filters
  document.getElementById('expenseSearch').addEventListener('input', renderExpensesTable);
  document.getElementById('filterCategory').addEventListener('change', renderExpensesTable);
  document.getElementById('filterFrequency').addEventListener('change', renderExpensesTable);

  // Income Form
  document.getElementById('incomeForm').addEventListener('submit', handleIncomeFormSubmit);

  // Expense Modal Form
  document.getElementById('expenseForm').addEventListener('submit', handleExpenseFormSubmit);

  // Chat Form
  document.getElementById('chatForm').addEventListener('submit', handleChatSubmit);

  // Calculator Sub-tabs
  document.querySelectorAll('.calc-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calc-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.calc-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const paneId = 'calc-' + btn.getAttribute('data-calc');
      document.getElementById(paneId).classList.add('active');
    });
  });
}

// --- Navigation ---
function switchTab(tabId) {
  document.querySelectorAll('.nav-item, .mob-nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  document.querySelectorAll(`[data-tab="${tabId}"]`).forEach(b => b.classList.add('active'));

  const content = document.getElementById(`tab-${tabId}`);
  if (content) content.classList.add('active');

  // Scroll to top on mobile
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update Page Title
  const titles = {
    'dashboard': { title: 'Financial Dashboard', sub: 'Overview of daily, monthly expenses and annual wealth growth' },
    'expenses': { title: 'Expenses Log', sub: 'Manage, search, and categorize all your spending transactions' },
    'income': { title: 'Income & Budget Planner', sub: 'Configure annual salary, taxes, side income, and target savings' },
    'advisor': { title: 'AI Money Advisor', sub: 'Personalized recommendations and instant financial assistant' },
    'calculators': { title: 'Financial Calculators', sub: 'Compound growth, split bills, emergency fund, and loan EMI planning' }
  };
  if (titles[tabId]) {
    document.getElementById('pageTitle').innerText = titles[tabId].title;
    document.getElementById('pageSubtitle').innerText = titles[tabId].sub;
  }

  initLucideIcons();
}

// --- Core Calculations & Master Render ---
function calculateAndRenderAll() {
  // 1. Income Calculations
  const grossAnnual = appState.income.grossAnnual || 0;
  const taxRate = appState.income.taxRate || 0;
  const sideIncome = appState.income.sideIncome || 0;

  const annualTax = grossAnnual * (taxRate / 100);
  const netAnnual = grossAnnual - annualTax;
  const netMonthlySalary = (netAnnual / 12) + sideIncome;

  // 2. Expenses Calculations
  const todayStr = getTodayDateString();
  let todaySpent = 0;
  let totalMonthlySpent = 0;

  const catTotals = {};

  appState.expenses.forEach(exp => {
    const amt = Number(exp.amount) || 0;
    
    // Daily spent check
    if (exp.date === todayStr && exp.frequency === 'Daily') {
      todaySpent += amt;
    }

    // Convert frequency to monthly equivalent
    let monthlyEquiv = amt;
    if (exp.frequency === 'Daily') {
      monthlyEquiv = amt * 30; // Approx 30 days
    } else if (exp.frequency === 'Annual') {
      monthlyEquiv = amt / 12;
    }

    totalMonthlySpent += monthlyEquiv;

    // Category aggregation
    catTotals[exp.category] = (catTotals[exp.category] || 0) + monthlyEquiv;
  });

  const netMonthlySavings = netMonthlySalary - totalMonthlySpent;
  const savingsRate = netMonthlySalary > 0 ? (netMonthlySavings / netMonthlySalary) * 100 : 0;

  // 3. Update Dashboard KPI Metric Cards
  document.getElementById('valAnnualIncome').innerText = formatMoney(grossAnnual);
  document.getElementById('subMonthlyNet').innerText = `Net Monthly: ${formatMoney(netMonthlySalary)}`;

  document.getElementById('valMonthlySpent').innerText = formatMoney(totalMonthlySpent);
  document.getElementById('subMonthlyBudget').innerText = `Budget Limit: ${formatMoney(netMonthlySalary * 0.7)}`;

  document.getElementById('valDailySpent').innerText = formatMoney(todaySpent);

  document.getElementById('valMonthlySavings').innerText = formatMoney(netMonthlySavings);
  document.getElementById('valSavingsRate').innerText = `Savings Rate: ${savingsRate.toFixed(1)}%`;

  // 4. Update Financial Health Score (0-100)
  let healthScore = 70;
  if (savingsRate >= 25) healthScore += 20;
  else if (savingsRate >= 15) healthScore += 10;
  else if (savingsRate < 0) healthScore -= 30;

  // Housing ratio check
  const housingSpend = catTotals['Housing'] || 0;
  const housingRatio = netMonthlySalary > 0 ? (housingSpend / netMonthlySalary) * 100 : 0;
  if (housingRatio > 40) healthScore -= 15;

  healthScore = Math.max(10, Math.min(100, Math.round(healthScore)));

  document.getElementById('healthScoreValue').innerText = healthScore;
  document.getElementById('healthScoreFill').style.width = `${healthScore}%`;

  if (healthScore >= 80) {
    document.getElementById('healthScoreTitle').innerText = 'Excellent Financial Standing';
    document.getElementById('healthScoreDesc').innerText = `Great job! Your savings rate is ${savingsRate.toFixed(1)}%, well above target. Keep building long-term investments.`;
  } else if (healthScore >= 60) {
    document.getElementById('healthScoreTitle').innerText = 'Moderate Financial Health';
    document.getElementById('healthScoreDesc').innerText = `Your spending is manageable, but try reducing discretionary costs to boost your monthly savings rate above 20%.`;
  } else {
    document.getElementById('healthScoreTitle').innerText = 'Action Needed: High Spending';
    document.getElementById('healthScoreDesc').innerText = `Expenses exceed healthy limits. Review subscription, dining out, or recurring debt payments.`;
  }

  // 5. 50/30/20 Budget Breakdown
  const needsCategories = ['Housing', 'Utilities & Bills', 'Healthcare', 'Debt & Loans', 'Transportation'];
  const wantsCategories = ['Food & Dining', 'Entertainment', 'Shopping', 'Miscellaneous'];

  let needsTotal = 0;
  let wantsTotal = 0;

  Object.keys(catTotals).forEach(cat => {
    if (needsCategories.includes(cat)) needsTotal += catTotals[cat];
    else if (wantsCategories.includes(cat)) wantsTotal += catTotals[cat];
  });

  const needsRatio = netMonthlySalary > 0 ? (needsTotal / netMonthlySalary) * 100 : 0;
  const wantsRatio = netMonthlySalary > 0 ? (wantsTotal / netMonthlySalary) * 100 : 0;

  document.getElementById('needsRatioText').innerText = `${needsRatio.toFixed(0)}% (${formatMoney(needsTotal)})`;
  document.getElementById('needsBar').style.width = `${Math.min(100, needsRatio)}%`;

  document.getElementById('wantsRatioText').innerText = `${wantsRatio.toFixed(0)}% (${formatMoney(wantsTotal)})`;
  document.getElementById('wantsBar').style.width = `${Math.min(100, wantsRatio)}%`;

  document.getElementById('savingsRatioText').innerText = `${savingsRate.toFixed(0)}% (${formatMoney(netMonthlySavings)})`;
  document.getElementById('savingsBar').style.width = `${Math.max(0, Math.min(100, savingsRate))}%`;

  // 6. Render Charts
  renderCategoryDonutChart(catTotals);
  renderIncomeVsExpenseBarChart(netMonthlySalary, totalMonthlySpent, netMonthlySavings);

  // 7. Render Recent List & Tables
  renderRecentExpenses();
  renderExpensesTable();
  renderIncomeSummary(grossAnnual, annualTax, netAnnual, netMonthlySalary);
  renderSmartSuggestions(savingsRate, housingRatio, netMonthlySavings, totalMonthlySpent);

  initLucideIcons();
}

// --- Chart Rendering ---
function renderCategoryDonutChart(catTotals) {
  const ctx = document.getElementById('categoryDonutChart');
  if (!ctx) return;

  const labels = Object.keys(catTotals);
  const data = Object.values(catTotals);
  const bgColors = labels.map(c => CATEGORY_COLORS[c] || '#64748b');

  if (donutChartInstance) {
    donutChartInstance.destroy();
  }

  if (labels.length === 0) {
    labels.push('No Expenses');
    data.push(1);
    bgColors.push('#334155');
  }

  const isMobile = window.innerWidth <= 768;

  donutChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: bgColors,
        borderWidth: 2,
        borderColor: '#090d16'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: isMobile ? 'bottom' : 'right',
          labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: isMobile ? 10 : 11 }, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.label}: ${formatMoney(context.raw)}`
          }
        }
      },
      cutout: '65%'
    }
  });
}

function renderIncomeVsExpenseBarChart(monthlyIncome, monthlySpent, monthlySavings) {
  const ctx = document.getElementById('incomeVsExpenseBarChart');
  if (!ctx) return;

  if (barChartInstance) {
    barChartInstance.destroy();
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const incomeData = Array(12).fill(monthlyIncome);
  const expenseData = Array(12).fill(monthlySpent);
  const savingsData = Array(12).fill(Math.max(0, monthlySavings));

  const isMobile = window.innerWidth <= 768;

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Net Income',
          data: incomeData,
          backgroundColor: 'rgba(99, 102, 241, 0.6)',
          borderRadius: 4
        },
        {
          label: 'Expenses',
          data: expenseData,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderRadius: 4
        },
        {
          label: 'Savings',
          data: savingsData,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#64748b', font: { size: isMobile ? 9 : 11 } }, grid: { display: false } },
        y: {
          ticks: { color: '#64748b', font: { size: isMobile ? 9 : 11 }, callback: (v) => appState.currency + v },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      },
      plugins: {
        legend: {
          position: isMobile ? 'bottom' : 'top',
          labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: isMobile ? 10 : 11 }, boxWidth: 10 }
        }
      }
    }
  });
}

// --- Render Recent Expenses List ---
function renderRecentExpenses() {
  const container = document.getElementById('recentExpensesList');
  if (!container) return;

  const sorted = [...appState.expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  if (sorted.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No recent expenses logged.</p></div>`;
    return;
  }

  container.innerHTML = sorted.map(exp => {
    const catColor = CATEGORY_COLORS[exp.category] || '#6366f1';
    return `
      <div class="recent-item">
        <div class="item-left">
          <div class="cat-icon-badge" style="background: ${catColor}20; color: ${catColor}; border: 1px solid ${catColor}40">
            <i data-lucide="${getCategoryIcon(exp.category)}"></i>
          </div>
          <div>
            <div class="item-title">${escapeHtml(exp.title)}</div>
            <div class="item-date">${exp.date} • ${exp.category}</div>
          </div>
        </div>
        <div class="item-amount">-${formatMoney(exp.amount)}</div>
      </div>
    `;
  }).join('');
}

// --- Render Expense Table & Mobile Phone Cards ---
function renderExpensesTable() {
  const tbody = document.getElementById('expensesTableBody');
  const mobCards = document.getElementById('mobileExpensesCards');
  const emptyState = document.getElementById('emptyExpensesState');
  if (!tbody) return;

  const search = (document.getElementById('expenseSearch').value || '').toLowerCase();
  const catFilter = document.getElementById('filterCategory').value;
  const freqFilter = document.getElementById('filterFrequency').value;

  const filtered = appState.expenses.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(search) || (exp.notes && exp.notes.toLowerCase().includes(search));
    const matchesCat = catFilter === 'ALL' || exp.category === catFilter;
    const matchesFreq = freqFilter === 'ALL' || exp.frequency === freqFilter;
    return matchesSearch && matchesCat && matchesFreq;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (mobCards) mobCards.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Desktop Table Render
  tbody.innerHTML = filtered.map(exp => {
    const catColor = CATEGORY_COLORS[exp.category] || '#6366f1';
    return `
      <tr>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${exp.date}</td>
        <td style="font-weight: 600;">${escapeHtml(exp.title)}</td>
        <td>
          <span class="badge-cat" style="background: ${catColor}20; color: ${catColor}; border: 1px solid ${catColor}40">
            ${exp.category}
          </span>
        </td>
        <td><span class="badge-freq">${exp.frequency}</span></td>
        <td style="font-weight: 700; color: var(--color-danger);">${formatMoney(exp.amount)}</td>
        <td style="color: var(--text-dim); font-size: 0.85rem;">${escapeHtml(exp.notes || '-')}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon-subtle" onclick="editExpense('${exp.id}')" title="Edit">
              <i data-lucide="edit-3"></i>
            </button>
            <button class="btn-icon-subtle danger" onclick="deleteExpense('${exp.id}')" title="Delete">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Mobile Cards Render (Phones)
  if (mobCards) {
    mobCards.innerHTML = filtered.map(exp => {
      const catColor = CATEGORY_COLORS[exp.category] || '#6366f1';
      return `
        <div class="mob-exp-card">
          <div class="mob-card-top">
            <div class="mob-card-info">
              <div class="cat-icon-badge" style="background: ${catColor}20; color: ${catColor}; border: 1px solid ${catColor}40">
                <i data-lucide="${getCategoryIcon(exp.category)}"></i>
              </div>
              <div>
                <div class="item-title">${escapeHtml(exp.title)}</div>
                <span class="badge-cat" style="background: ${catColor}20; color: ${catColor}; margin-top: 4px;">${exp.category}</span>
              </div>
            </div>
            <div class="mob-card-amount">-${formatMoney(exp.amount)}</div>
          </div>
          <div class="mob-card-bottom">
            <span>${exp.date} • ${exp.frequency}</span>
            <div class="action-btns">
              <button class="btn-icon-subtle" onclick="editExpense('${exp.id}')"><i data-lucide="edit-3"></i></button>
              <button class="btn-icon-subtle danger" onclick="deleteExpense('${exp.id}')"><i data-lucide="trash-2"></i></button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  initLucideIcons();
}

// --- Render Income Summary Panel ---
function renderIncomeSummary(gross, tax, netAnnual, netMonthly) {
  document.getElementById('inputGrossIncome').value = gross;
  document.getElementById('inputTaxRate').value = appState.income.taxRate;
  document.getElementById('inputSideIncome').value = appState.income.sideIncome;
  document.getElementById('inputSavingsGoal').value = appState.income.targetSavings;

  document.getElementById('summaryGross').innerText = formatMoney(gross);
  document.getElementById('summaryTaxes').innerText = formatMoney(tax);
  document.getElementById('summaryNetAnnual').innerText = formatMoney(netAnnual);
  document.getElementById('summaryNetMonthly').innerText = formatMoney(netMonthly);

  const needsVal = netMonthly * 0.5;
  const wantsVal = netMonthly * 0.3;
  const savingsVal = netMonthly * 0.2;

  document.getElementById('incomeAdviceText').innerText = 
    `Based on your net monthly pay of ${formatMoney(netMonthly)}, your target 50/30/20 budget breakdown is ${formatMoney(needsVal)} for Essential Needs, ${formatMoney(wantsVal)} for Personal Wants, and ${formatMoney(savingsVal)} for Long-Term Savings & Debt Payoff.`;
}

// --- Render Smart Automated Suggestions ---
function renderSmartSuggestions(savingsRate, housingRatio, netSavings, monthlySpent) {
  const container = document.getElementById('suggestionsContainer');
  if (!container) return;

  const suggestions = [];

  if (savingsRate >= 20) {
    suggestions.push({
      priority: 'positive',
      icon: 'sparkles',
      title: 'Optimal Savings Rate Achieved',
      desc: `You are currently saving ${savingsRate.toFixed(1)}% of your monthly income (${formatMoney(netSavings)}). Consider automating investments into index funds or high-yield savings.`
    });
  } else {
    suggestions.push({
      priority: 'high',
      icon: 'alert-triangle',
      title: 'Savings Rate Below 20% Target',
      desc: `Your current savings rate is ${savingsRate.toFixed(1)}%. Aim to trim discretionary expenses like dining out or unused subscriptions to reach the recommended 20% mark.`
    });
  }

  if (housingRatio > 35) {
    suggestions.push({
      priority: 'medium',
      icon: 'home',
      title: 'Housing Cost Exceeds Standard 30% Threshold',
      desc: `Housing takes up ${housingRatio.toFixed(1)}% of your net pay. Keep utility costs tight and avoid adding extra fixed debt until this ratio balances.`
    });
  }

  suggestions.push({
    priority: 'medium',
    icon: 'shield-check',
    title: 'Emergency Reserve Recommendation',
    desc: `Build a 6-month safety net of ${formatMoney(monthlySpent * 6)} to insulate yourself from unexpected medical or employment changes.`
  });

  container.innerHTML = suggestions.map(s => `
    <div class="suggestion-card">
      <div class="sug-icon ${s.priority}">
        <i data-lucide="${s.icon}"></i>
      </div>
      <div class="sug-content">
        <h4>${s.title}</h4>
        <p>${s.desc}</p>
      </div>
    </div>
  `).join('');

  initLucideIcons();
}

// --- Form Handlers ---
function handleIncomeFormSubmit(e) {
  e.preventDefault();
  appState.income.grossAnnual = Number(document.getElementById('inputGrossIncome').value) || 0;
  appState.income.taxRate = Number(document.getElementById('inputTaxRate').value) || 0;
  appState.income.sideIncome = Number(document.getElementById('inputSideIncome').value) || 0;
  appState.income.targetSavings = Number(document.getElementById('inputSavingsGoal').value) || 0;

  saveStateToLocalStorage();
  calculateAndRenderAll();
  alert('Income & Budget Settings updated successfully!');
}

function openExpenseModal(expenseId = null) {
  const modal = document.getElementById('expenseModal');
  const title = document.getElementById('modalTitle');
  
  if (expenseId) {
    const exp = appState.expenses.find(x => x.id === expenseId);
    if (exp) {
      document.getElementById('modalExpenseId').value = exp.id;
      document.getElementById('modalExpenseTitle').value = exp.title;
      document.getElementById('modalExpenseAmount').value = exp.amount;
      document.getElementById('modalExpenseCategory').value = exp.category;
      document.getElementById('modalExpenseFrequency').value = exp.frequency;
      document.getElementById('modalExpenseDate').value = exp.date;
      document.getElementById('modalExpenseNotes').value = exp.notes || '';
      title.innerHTML = `<i data-lucide="edit-3"></i> Edit Expense`;
    }
  } else {
    document.getElementById('modalExpenseId').value = '';
    document.getElementById('expenseForm').reset();
    document.getElementById('modalExpenseDate').value = getTodayDateString();
    title.innerHTML = `<i data-lucide="plus-circle"></i> Add New Expense`;
  }

  modal.classList.remove('hidden');
  initLucideIcons();
}

function closeExpenseModal() {
  document.getElementById('expenseModal').classList.add('hidden');
}

function handleExpenseFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('modalExpenseId').value;
  const title = document.getElementById('modalExpenseTitle').value;
  const amount = Number(document.getElementById('modalExpenseAmount').value) || 0;
  const category = document.getElementById('modalExpenseCategory').value;
  const frequency = document.getElementById('modalExpenseFrequency').value;
  const date = document.getElementById('modalExpenseDate').value;
  const notes = document.getElementById('modalExpenseNotes').value;

  if (id) {
    // Edit
    const index = appState.expenses.findIndex(x => x.id === id);
    if (index !== -1) {
      appState.expenses[index] = { id, title, amount, category, frequency, date, notes };
    }
  } else {
    // Add
    const newExp = {
      id: 'exp_' + Date.now(),
      title, amount, category, frequency, date, notes
    };
    appState.expenses.unshift(newExp);
  }

  saveStateToLocalStorage();
  calculateAndRenderAll();
  closeExpenseModal();
}

function editExpense(id) {
  openExpenseModal(id);
}

function deleteExpense(id) {
  if (confirm('Are you sure you want to delete this expense entry?')) {
    appState.expenses = appState.expenses.filter(x => x.id !== id);
    saveStateToLocalStorage();
    calculateAndRenderAll();
  }
}

// --- Interactive AI Money Advisor Chatbot ---
function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const query = input.value.trim();
  if (!query) return;

  appendChatMessage(query, 'user');
  input.value = '';

  // Simulate AI Thinking Response
  setTimeout(() => {
    const botResponse = generateAIAdvisorResponse(query);
    appendChatMessage(botResponse, 'bot');
  }, 600);
}

function sendQuickPrompt(promptText) {
  appendChatMessage(promptText, 'user');
  setTimeout(() => {
    const botResponse = generateAIAdvisorResponse(promptText);
    appendChatMessage(botResponse, 'bot');
  }, 600);
}

function appendChatMessage(text, sender) {
  const container = document.getElementById('chatMessages');
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg msg-${sender}`;
  msgDiv.innerHTML = `<div class="msg-content">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function generateAIAdvisorResponse(prompt) {
  const p = prompt.toLowerCase();
  const gross = appState.income.grossAnnual;
  const netMonthly = (gross * 0.8 / 12) + appState.income.sideIncome;

  let totalSpent = 0;
  appState.expenses.forEach(e => {
    let m = e.amount;
    if (e.frequency === 'Daily') m *= 30;
    if (e.frequency === 'Annual') m /= 12;
    totalSpent += m;
  });

  const netSavings = netMonthly - totalSpent;
  const savingsRate = netMonthly > 0 ? (netSavings / netMonthly) * 100 : 0;

  if (p.includes('reduce') || p.includes('cut') || p.includes('expenses')) {
    return `Based on your monthly log, your top spending areas are Housing and Food & Dining. Here are 3 actionable ways to cut expenses:\n\n1. Meal Planning: Cooking in batches can reduce food expenses by 25-30%.\n2. Audit Recurring Subscriptions: Review monthly bills like gym or streaming passes.\n3. Implement the 24-Hour Impulse Rule before non-essential purchases.`;
  } else if (p.includes('emergency') || p.includes('fund') || p.includes('safety')) {
    const target6m = totalSpent * 6;
    return `Your current estimated monthly living cost is ${formatMoney(totalSpent)}.\n\n• Recommended 6-Month Emergency Target: ${formatMoney(target6m)}\n• With your current net monthly savings of ${formatMoney(netSavings)}, you can fully fund this safety cushion in approx ${netSavings > 0 ? Math.ceil(target6m / netSavings) : 'N/A'} months!`;
  } else if (p.includes('invest') || p.includes('surplus') || p.includes('growth')) {
    return `With a monthly surplus of ${formatMoney(netSavings)}, here is a recommended allocation strategy:\n\n1. First 20%: Keep in High-Yield Emergency Savings.\n2. Next 50%: Broad market index funds (e.g. S&P 500 / Total Stock Market ETF).\n3. Remaining 30%: Long-term retirement accounts or debt reduction.`;
  } else if (p.includes('50/30/20') || p.includes('audit') || p.includes('split')) {
    return `Your current budget split on a ${formatMoney(netMonthly)} net monthly pay:\n\n• Needs (Target 50% = ${formatMoney(netMonthly * 0.5)}): Your actual essential spending is running at ${savingsRate > 0 ? 'balanced levels' : 'elevated levels'}.\n• Savings (Target 20%+ = ${formatMoney(netMonthly * 0.2)}): You are currently saving ${savingsRate.toFixed(1)}%.`;
  } else {
    return `I analyzed your profile (${formatMoney(gross)} annual income, ${formatMoney(totalSpent)} monthly expenses). Your monthly net savings stand at ${formatMoney(netSavings)} (${savingsRate.toFixed(1)}% savings rate).\n\nTo optimize your money further, ensure your emergency reserve is funded, automate your investments, and track daily discretionary purchases!`;
  }
}

// --- Calculators Engine ---
function calculateCompound() {
  const P = Number(document.getElementById('ciInitial').value) || 0;
  const PMT = Number(document.getElementById('ciMonthly').value) || 0;
  const r = (Number(document.getElementById('ciRate').value) || 0) / 100 / 12;
  const t = (Number(document.getElementById('ciYears').value) || 0) * 12;

  let total = P * Math.pow(1 + r, t);
  for (let i = 1; i <= t; i++) {
    total += PMT * Math.pow(1 + r, t - i);
  }

  const totalDeposits = P + (PMT * t);
  const interestEarned = total - totalDeposits;

  document.getElementById('resCompoundTotal').innerText = formatMoney(total);
  document.getElementById('resCompoundDeposits').innerText = formatMoney(totalDeposits);
  document.getElementById('resCompoundInterest').innerText = formatMoney(interestEarned);
}

function calculateSplitBill() {
  const bill = Number(document.getElementById('sbBill').value) || 0;
  const tipPct = Number(document.getElementById('sbTip').value) || 0;
  const people = Math.max(1, Number(document.getElementById('sbPeople').value) || 1);

  const tipAmount = bill * (tipPct / 100);
  const totalBill = bill + tipAmount;
  const perPerson = totalBill / people;

  document.getElementById('resSplitPerPerson').innerText = formatMoney(perPerson);
  document.getElementById('resSplitTip').innerText = formatMoney(tipAmount);
  document.getElementById('resSplitTotal').innerText = formatMoney(totalBill);
}

function calculateEmergencyFund() {
  const monthlyExp = Number(document.getElementById('efMonthlyExp').value) || 0;
  const months = Number(document.getElementById('efMonths').value) || 6;
  const current = Number(document.getElementById('efCurrent').value) || 0;

  const goal = monthlyExp * months;
  const shortfall = Math.max(0, goal - current);
  const progressPct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;

  document.getElementById('resEfGoal').innerText = formatMoney(goal);
  document.getElementById('resEfShortfall').innerText = formatMoney(shortfall);
  document.getElementById('resEfProgress').innerText = `${progressPct.toFixed(1)}% Funded`;
}

function calculateEMI() {
  const P = Number(document.getElementById('emiPrincipal').value) || 0;
  const annualRate = Number(document.getElementById('emiRate').value) || 0;
  const years = Number(document.getElementById('emiTenure').value) || 1;

  const r = (annualRate / 100) / 12;
  const n = years * 12;

  let emi = 0;
  if (r > 0) {
    emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  } else {
    emi = P / n;
  }

  const totalPayment = emi * n;
  const totalInterest = totalPayment - P;

  document.getElementById('resEmiMonthly').innerText = formatMoney(emi);
  document.getElementById('resEmiInterest').innerText = formatMoney(totalInterest);
  document.getElementById('resEmiTotal').innerText = formatMoney(totalPayment);
}

// --- CSV Export ---
function exportExpensesCSV() {
  if (appState.expenses.length === 0) {
    alert('No expenses to export!');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,Date,Title,Category,Frequency,Amount,Notes\n";
  appState.expenses.forEach(exp => {
    const row = [
      `"${exp.date}"`,
      `"${exp.title.replace(/"/g, '""')}"`,
      `"${exp.category}"`,
      `"${exp.frequency}"`,
      exp.amount,
      `"${(exp.notes || '').replace(/"/g, '""')}"`
    ].join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "WealthPulse_Expenses_Export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helper utilities
function getCategoryIcon(category) {
  const icons = {
    'Housing': 'home',
    'Food & Dining': 'utensils',
    'Transportation': 'car',
    'Utilities & Bills': 'zap',
    'Entertainment': 'tv',
    'Healthcare': 'heart-pulse',
    'Shopping': 'shopping-bag',
    'Debt & Loans': 'credit-card',
    'Savings & Investment': 'trending-up',
    'Miscellaneous': 'more-horizontal'
  };
  return icons[category] || 'receipt';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
