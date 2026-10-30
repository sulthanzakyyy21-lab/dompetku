const ui = {
  isNotificationOpen: false,
  selectedTxWalletTab: 'all',

  init() {
    document.addEventListener('click', (e) => {
      const bellBtnDesktop = document.getElementById('notif-bell-desktop');
      const bellBtnMobile = document.getElementById('notif-bell-mobile');
      const popover = document.getElementById('notif-dropdown');

      if (!popover || popover.classList.contains('hidden')) return;

      const isClickInsideBell = (bellBtnDesktop && bellBtnDesktop.contains(e.target)) ||
                                (bellBtnMobile && bellBtnMobile.contains(e.target));
      const isClickInsidePopover = popover.contains(e.target);

      if (!isClickInsideBell && !isClickInsidePopover) {
        this.toggleNotification(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.toggleNotification(false);
        this.toggleModalWallet(false);
        this.toggleModalCategory(false);
        this.toggleModalBank(false);
        this.toggleModalBankTransfer(false);
      }
    });

    const currencyIds = ['tx-amount', 'wallet-budget', 'wallet-max-limit', 'wallet-monthly-limit', 'bank-balance', 'transfer-amount'];
    currencyIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) utils.setupCurrencyInput(el);
    });

    this.renderCategories();
  },

  setQuickAmount(amount) {
    const input = document.getElementById('tx-amount');
    if (!input) return;
    const current = utils.parseNumber(input.value);
    const target = current + amount;
    input.value = utils.formatNumber(target);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  },

  switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
      tab.classList.add('hidden');
    });
    
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) {
      targetTab.classList.remove('hidden');
      targetTab.classList.add('active');
    }

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active-nav');
    });
    const activeSidebar = document.getElementById(`nav-${tabId}`);
    if (activeSidebar) {
      activeSidebar.classList.add('active-nav');
    }

    document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
      btn.classList.remove('active-bnav');
    });
    const activeBottomNav = document.getElementById(`bnav-${tabId}`);
    if (activeBottomNav) {
      activeBottomNav.classList.add('active-bnav');
    }

    if (tabId === 'analytics') {
      analytics.renderCharts();
    }

    if (tabId === 'transactions') {
      this.renderTransactions();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  setTxWalletFilter(walletId) {
    this.selectedTxWalletTab = walletId;
    this.renderTransactions();
  },

  initFilters() {
    const monthSelect = document.getElementById('filter-month');
    const yearSelect = document.getElementById('filter-year');
    if (!monthSelect || !yearSelect) return;
    
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    monthSelect.innerHTML = months.map((m, i) => `<option value="${i}" ${i === state.filterMonth ? 'selected' : ''}>${m}</option>`).join('');
    
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];
    yearSelect.innerHTML = years.map(y => `<option value="${y}" ${y === state.filterYear ? 'selected' : ''}>${y}</option>`).join('');
  },

  setTxType(type) {
    state.currentTxType = type;
    const btnOut = document.getElementById('btn-type-out');
    const btnIn = document.getElementById('btn-type-in');
    const btnSubmit = document.getElementById('btn-submit-tx');
    const expenseFields = document.getElementById('expense-fields');
    const incomeBankField = document.getElementById('income-bank-field');
    const incomeSplitSection = document.getElementById('income-split-section');
    const catWrapper = document.getElementById('category-field-wrapper');

    if (type === 'out') {
      if (btnOut) btnOut.className = "py-2.5 text-xs font-semibold rounded-lg bg-white text-rose-700 shadow-sm border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98";
      if (btnIn) btnIn.className = "py-2.5 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98";
      
      if (expenseFields) expenseFields.classList.remove('hidden');
      if (incomeBankField) incomeBankField.classList.add('hidden');
      if (incomeSplitSection) incomeSplitSection.classList.add('hidden');
      if (catWrapper) catWrapper.classList.remove('hidden');

      if (btnSubmit) {
        btnSubmit.className = "w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-semibold py-3.5 rounded-xl transition-all shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer";
        btnSubmit.innerHTML = `
          <svg class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          <span>Simpan Pengeluaran</span>
        `;
      }
    } else {
      if (btnIn) btnIn.className = "py-2.5 text-xs font-semibold rounded-lg bg-white text-emerald-700 shadow-sm border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98";
      if (btnOut) btnOut.className = "py-2.5 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98";

      if (expenseFields) expenseFields.classList.add('hidden');
      if (incomeBankField) incomeBankField.classList.remove('hidden');
      if (incomeSplitSection) incomeSplitSection.classList.remove('hidden');
      if (catWrapper) catWrapper.classList.add('hidden');

      this.initIncomeSplit();

      if (btnSubmit) {
        btnSubmit.className = "w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] text-white font-semibold py-3.5 rounded-xl transition-all shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer";
        btnSubmit.innerHTML = `
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          <span>Simpan Pemasukan & Alokasikan</span>
        `;
      }
    }
  },

  initIncomeSplit() {
    const container = document.getElementById('income-split-rows');
    if (!container) return;
    if (container.children.length === 0) {
      const totalAmount = utils.parseNumber(document.getElementById('tx-amount')?.value) || 0;
      const firstWalletId = state.wallets[0]?.id || '';
      this.addIncomeSplitRow(firstWalletId, totalAmount);
    } else {
      this.updateIncomeSplitSummary();
    }
  },

  addIncomeSplitRow(walletId = '', amount = 0) {
    const container = document.getElementById('income-split-rows');
    if (!container) return;

    const rowId = 'split_row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'income-split-item flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80';

    const walletOptions = state.wallets.map(w => {
      const isSelected = w.id === walletId;
      return `<option value="${w.id}" ${isSelected ? 'selected' : ''}>${w.name}</option>`;
    }).join('');

    const formattedAmt = amount > 0 ? utils.formatNumber(amount) : '';

    row.innerHTML = `
      <div class="flex-1 min-w-0">
        <select class="split-wallet-select w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer">
          ${walletOptions}
        </select>
      </div>
      <div class="relative w-36 sm:w-44 flex-shrink-0">
        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-sky-700 font-mono">Rp</span>
        <input type="text" inputmode="numeric" placeholder="0" value="${formattedAmt}"
          class="split-amount-input w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono">
      </div>
      <button type="button" onclick="ui.removeIncomeSplitRow('${rowId}')" 
        class="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition flex-shrink-0 cursor-pointer" title="Hapus Baris Alokasi">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      </button>
    `;

    container.appendChild(row);

    const input = row.querySelector('.split-amount-input');
    if (input) {
      utils.setupCurrencyInput(input);
      input.addEventListener('input', () => this.updateIncomeSplitSummary());
    }

    this.updateIncomeSplitSummary();
  },

  removeIncomeSplitRow(rowId) {
    const row = document.getElementById(rowId);
    const container = document.getElementById('income-split-rows');
    if (row && container) {
      if (container.children.length <= 1) {
        alert('Minimal harus ada 1 dompet penerima alokasi pemasukan.');
        return;
      }
      row.remove();
      this.updateIncomeSplitSummary();
    }
  },

  onTxAmountChange() {
    if (state.currentTxType === 'in') {
      const container = document.getElementById('income-split-rows');
      if (container && container.children.length === 1) {
        const input = container.children[0].querySelector('.split-amount-input');
        const mainAmount = utils.parseNumber(document.getElementById('tx-amount')?.value) || 0;
        if (input) {
          input.value = mainAmount > 0 ? utils.formatNumber(mainAmount) : '';
        }
      }
      this.updateIncomeSplitSummary();
    }
  },

  updateIncomeSplitSummary() {
    const totalAmount = utils.parseNumber(document.getElementById('tx-amount')?.value) || 0;
    const inputs = document.querySelectorAll('.split-amount-input');
    let totalAllocated = 0;
    inputs.forEach(inp => {
      totalAllocated += utils.parseNumber(inp.value) || 0;
    });

    const diff = totalAmount - totalAllocated;

    const allocatedEl = document.getElementById('split-allocated-text');
    const remainingEl = document.getElementById('split-remaining-text');
    const badgeEl = document.getElementById('split-status-badge');

    if (allocatedEl) allocatedEl.innerText = utils.formatRupiah(totalAllocated);
    if (remainingEl) remainingEl.innerText = utils.formatRupiah(Math.max(0, diff));

    if (badgeEl) {
      if (totalAmount > 0 && diff === 0) {
        badgeEl.className = 'self-start sm:self-auto text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300';
        badgeEl.innerText = 'Pas 100%';
      } else if (diff > 0) {
        badgeEl.className = 'self-start sm:self-auto text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300';
        badgeEl.innerText = `Kurang ${utils.formatRupiah(diff)}`;
      } else {
        badgeEl.className = 'self-start sm:self-auto text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300';
        badgeEl.innerText = `Lebih ${utils.formatRupiah(Math.abs(diff))}`;
      }
    }
  },

  getIncomeAllocations() {
    const rows = document.querySelectorAll('.income-split-item');
    const allocations = [];
    rows.forEach(r => {
      const select = r.querySelector('.split-wallet-select');
      const input = r.querySelector('.split-amount-input');
      const walletId = select ? select.value : '';
      const amount = utils.parseNumber(input ? input.value : 0) || 0;
      const walletObj = state.wallets.find(w => w.id === walletId);
      if (walletId && amount > 0) {
        allocations.push({
          walletId,
          walletName: walletObj ? walletObj.name : 'Dompet',
          amount
        });
      }
    });
    return allocations;
  },

  getBankStats() {
    const stats = {};
    state.banks.forEach(b => {
      stats[b.id] = {
        initial: Number(b.balance || 0),
        income: 0,
        expense: 0,
        transfersIn: 0,
        transfersOut: 0,
        current: Number(b.balance || 0)
      };
    });

    state.transactions.forEach(tx => {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'transfer') {
        if (stats[tx.fromBankId]) {
          stats[tx.fromBankId].transfersOut += amt;
          stats[tx.fromBankId].current -= amt;
        }
        if (stats[tx.toBankId]) {
          stats[tx.toBankId].transfersIn += amt;
          stats[tx.toBankId].current += amt;
        }
      } else if (tx.type === 'in') {
        if (stats[tx.bankId]) {
          stats[tx.bankId].income += amt;
          stats[tx.bankId].current += amt;
        }
      } else if (tx.type === 'out') {
        if (stats[tx.bankId]) {
          stats[tx.bankId].expense += amt;
          stats[tx.bankId].current -= amt;
        }
      }
    });

    return stats;
  },

  renderBanks() {
    const bankListEl = document.getElementById('bank-list');
    const bankStats = this.getBankStats();

    if (bankListEl) {
      bankListEl.innerHTML = state.banks.map(b => {
        const stat = bankStats[b.id] || { initial: 0, income: 0, expense: 0, transfersIn: 0, transfersOut: 0, current: 0 };
        const hex = b.hex || '#0284c7';
        const totalIn = stat.income + stat.transfersIn;
        const totalOut = stat.expense + stat.transfersOut;

        return `
          <div class="bg-white border border-slate-200/90 hover:border-sky-300/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs text-white" style="background-color: ${hex};">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                </div>
                <div>
                  <h3 class="font-bold text-sm text-slate-900 group-hover:text-sky-700 transition">${b.name}</h3>
                  <p class="text-[11px] text-slate-400">Rekening Kas Riil</p>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <button type="button" onclick="app.editBank('${b.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer" title="Edit Rekening">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
              </div>
            </div>

            <div class="mb-3">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Saldo Nyata di Bank</span>
              <p class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono">${utils.formatRupiah(stat.current)}</p>
            </div>

            <div class="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Masuk: <strong class="text-emerald-600 font-semibold">+${utils.formatRupiah(totalIn)}</strong></span>
              <span>Keluar: <strong class="text-rose-600 font-semibold">-${utils.formatRupiah(totalOut)}</strong></span>
            </div>
          </div>
        `;
      }).join('');
    }

    // Populate tx dropdowns
    const outSelect = document.getElementById('tx-bank-out');
    if (outSelect) {
      const cur = outSelect.value;
      outSelect.innerHTML = state.banks.map(b => {
        const curBal = bankStats[b.id]?.current || 0;
        return `<option value="${b.id}">${b.name} (Saldo: ${utils.formatRupiah(curBal)})</option>`;
      }).join('');
      if (cur && state.banks.some(b => b.id === cur)) outSelect.value = cur;
    }

    const inSelect = document.getElementById('tx-bank-in');
    if (inSelect) {
      const cur = inSelect.value;
      inSelect.innerHTML = state.banks.map(b => {
        const curBal = bankStats[b.id]?.current || 0;
        return `<option value="${b.id}">${b.name} (Saldo: ${utils.formatRupiah(curBal)})</option>`;
      }).join('');
      if (cur && state.banks.some(b => b.id === cur)) inSelect.value = cur;
    }

    const transferFrom = document.getElementById('transfer-from-bank');
    if (transferFrom) {
      const cur = transferFrom.value;
      transferFrom.innerHTML = state.banks.map(b => {
        const curBal = bankStats[b.id]?.current || 0;
        return `<option value="${b.id}">${b.name} (Saldo: ${utils.formatRupiah(curBal)})</option>`;
      }).join('');
      if (cur && state.banks.some(b => b.id === cur)) transferFrom.value = cur;
    }

    const transferTo = document.getElementById('transfer-to-bank');
    if (transferTo) {
      const cur = transferTo.value;
      transferTo.innerHTML = state.banks.map((b, idx) => {
        return `<option value="${b.id}" ${idx === 1 ? 'selected' : ''}>${b.name}</option>`;
      }).join('');
      if (cur && state.banks.some(b => b.id === cur)) transferTo.value = cur;
    }
  },

  renderModalBankList() {
    const modalList = document.getElementById('modal-bank-list');
    if (!modalList) return;
    const editingId = document.getElementById('bank-edit-id')?.value || '';
    const bankStats = this.getBankStats();

    modalList.innerHTML = state.banks.map(b => {
      const isEditing = b.id === editingId;
      const current = bankStats[b.id]?.current || 0;
      const hex = b.hex || '#0284c7';

      return `
        <div class="flex justify-between items-center p-3 rounded-xl transition ${isEditing ? 'bg-amber-50/90 border-2 border-amber-400 shadow-sm ring-2 ring-amber-200/50' : 'bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60'}">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-3.5 h-3.5 rounded-full flex-shrink-0" style="background-color: ${hex};"></div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="font-semibold text-xs text-slate-900 truncate">${b.name}</p>
                ${isEditing ? '<span class="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-md uppercase tracking-wider">Sedang Diedit</span>' : ''}
              </div>
              <p class="text-[11px] text-slate-500 font-mono">Saldo Kas: ${utils.formatRupiah(current)}</p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button type="button" onclick="app.editBank('${b.id}')" class="text-xs ${isEditing ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold' : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-medium'} px-2.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer">
              ${isEditing ? 'Diedit' : 'Edit'}
            </button>
            <button type="button" onclick="app.deleteBank('${b.id}')" class="text-xs bg-white border border-slate-200 hover:border-rose-200 hover:text-rose-600 text-slate-500 px-2.5 py-1.5 rounded-lg font-medium transition shadow-xs cursor-pointer">
              Hapus
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  toggleModalBank(forceState) {
    const modal = document.getElementById('modal-bank');
    if (!modal) return;
    if (typeof forceState === 'boolean') {
      if (forceState) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        this.renderModalBankList();
      } else {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        this.resetBankForm();
      }
    } else {
      const willOpen = modal.classList.contains('hidden');
      if (willOpen) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        this.renderModalBankList();
      } else {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        this.resetBankForm();
      }
    }
  },

  toggleModalBankTransfer(forceState) {
    const modal = document.getElementById('modal-bank-transfer');
    if (!modal) return;
    if (typeof forceState === 'boolean') {
      if (forceState) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      } else {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
      }
    } else {
      modal.classList.toggle('hidden');
      modal.classList.toggle('flex');
    }
  },

  resetBankForm() {
    const editIdInput = document.getElementById('bank-edit-id');
    if (editIdInput) editIdInput.value = '';
    const nameInput = document.getElementById('bank-name');
    if (nameInput) nameInput.value = '';
    const balInput = document.getElementById('bank-balance');
    if (balInput) balInput.value = '';

    const titleEl = document.getElementById('modal-bank-title');
    if (titleEl) titleEl.innerText = 'Kelola Rekening Bank';

    const badgeEl = document.getElementById('modal-bank-badge');
    if (badgeEl) badgeEl.classList.add('hidden');

    const alertEl = document.getElementById('bank-edit-alert');
    if (alertEl) {
      alertEl.classList.add('hidden');
      alertEl.classList.remove('flex');
    }

    const iconWrap = document.getElementById('modal-bank-icon-wrap');
    if (iconWrap) {
      iconWrap.className = 'w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold transition-colors';
    }

    const saveBtn = document.getElementById('btn-save-bank');
    if (saveBtn) {
      saveBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        <span>Simpan Rekening Bank</span>
      `;
      saveBtn.className = 'flex-1 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-xs active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5';
    }

    const cancelBtn = document.getElementById('btn-cancel-bank');
    if (cancelBtn) {
      cancelBtn.innerText = 'Reset Form';
      cancelBtn.className = 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 rounded-xl text-xs transition active:scale-[0.99] cursor-pointer';
    }

    this.renderModalBankList();
  },

  setBankEditMode(bank) {
    const editIdInput = document.getElementById('bank-edit-id');
    if (editIdInput) editIdInput.value = bank.id;
    const nameInput = document.getElementById('bank-name');
    if (nameInput) nameInput.value = bank.name;
    const balInput = document.getElementById('bank-balance');
    if (balInput) balInput.value = utils.formatNumber(bank.balance || 0);

    const titleEl = document.getElementById('modal-bank-title');
    if (titleEl) titleEl.innerText = `Edit: ${bank.name}`;

    const badgeEl = document.getElementById('modal-bank-badge');
    if (badgeEl) badgeEl.classList.remove('hidden');

    const alertEl = document.getElementById('bank-edit-alert');
    const nameDisplay = document.getElementById('bank-edit-name-display');
    if (alertEl) {
      alertEl.classList.remove('hidden');
      alertEl.classList.add('flex');
    }
    if (nameDisplay) {
      nameDisplay.innerText = bank.name;
    }

    const iconWrap = document.getElementById('modal-bank-icon-wrap');
    if (iconWrap) {
      iconWrap.className = 'w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold transition-colors';
    }

    const saveBtn = document.getElementById('btn-save-bank');
    if (saveBtn) {
      saveBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <span>Simpan Perubahan</span>
      `;
      saveBtn.className = 'flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-xs active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5';
    }

    const cancelBtn = document.getElementById('btn-cancel-bank');
    if (cancelBtn) {
      cancelBtn.innerText = 'Batal Edit';
      cancelBtn.className = 'bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold px-4 rounded-xl text-xs transition active:scale-[0.99] cursor-pointer border border-amber-300/80';
    }

    this.renderModalBankList();
    const container = document.getElementById('modal-bank-container');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    if (nameInput) setTimeout(() => nameInput.focus(), 60);
  },

  toggleModalWallet(forceState) {
    const modal = document.getElementById('modal-wallet');
    if (!modal) return;
    
    if (typeof forceState === 'boolean') {
      if (forceState) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      } else {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        this.resetWalletForm();
      }
    } else {
      const willOpen = modal.classList.contains('hidden');
      if (willOpen) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      } else {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        this.resetWalletForm();
      }
    }
  },

  toggleModalCategory(forceState) {
    const modal = document.getElementById('modal-category');
    if (!modal) return;
    
    if (typeof forceState === 'boolean') {
      if (forceState) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      } else {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
      }
    } else {
      modal.classList.toggle('hidden');
      modal.classList.toggle('flex');
    }
  },

  renderCategories() {
    const selectEl = document.getElementById('tx-category-select');
    if (selectEl) {
      const currentVal = selectEl.value;
      let optionsHTML = '<option value="" disabled selected>-- Pilih Kategori / Deskripsi --</option>';
      state.categories.forEach(cat => {
        optionsHTML += `<option value="${cat}">${cat}</option>`;
      });
      optionsHTML += '<option value="__manage__">+ Kelola / Tambah Kategori...</option>';
      selectEl.innerHTML = optionsHTML;
      if (currentVal && state.categories.includes(currentVal)) {
        selectEl.value = currentVal;
      }
    }

    const listEl = document.getElementById('category-manager-list');
    if (listEl) {
      if (state.categories.length === 0) {
        listEl.innerHTML = '<p class="text-xs text-slate-400 py-3 text-center">Belum ada kategori yang ditambahkan.</p>';
      } else {
        listEl.innerHTML = state.categories.map(c => `
          <div class="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl">
            <span class="text-xs font-semibold text-slate-800">${c}</span>
            <button type="button" onclick="app.deleteCategory('${c}')" class="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 inline-flex items-center justify-center transition" title="Hapus Kategori">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        `).join('');
      }
    }
  },

  onCategorySelectChange(val) {
    if (val === '__manage__') {
      this.toggleModalCategory(true);
      const selectEl = document.getElementById('tx-category-select');
      if (selectEl) selectEl.value = '';
      return;
    }
    const descInput = document.getElementById('tx-desc');
    if (descInput) {
      descInput.value = val;
    }
  },

  resetWalletForm() {
    const editIdInput = document.getElementById('wallet-edit-id');
    if (editIdInput) editIdInput.value = '';
    const nameInput = document.getElementById('wallet-name');
    if (nameInput) nameInput.value = '';
    const budgetInput = document.getElementById('wallet-budget');
    if (budgetInput) budgetInput.value = '';
    const maxLimitInput = document.getElementById('wallet-max-limit');
    if (maxLimitInput) maxLimitInput.value = '';
    const monthlyLimitInput = document.getElementById('wallet-monthly-limit');
    if (monthlyLimitInput) monthlyLimitInput.value = '';

    const titleEl = document.getElementById('modal-wallet-title');
    if (titleEl) titleEl.innerText = 'Kelola Rekening & Akun';

    const badgeEl = document.getElementById('modal-wallet-badge');
    if (badgeEl) badgeEl.classList.add('hidden');

    const alertEl = document.getElementById('wallet-edit-alert');
    if (alertEl) {
      alertEl.classList.add('hidden');
      alertEl.classList.remove('flex');
    }

    const iconWrap = document.getElementById('modal-wallet-icon-wrap');
    if (iconWrap) {
      iconWrap.className = 'w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold transition-colors';
    }

    const saveBtn = document.getElementById('btn-save-wallet');
    if (saveBtn) {
      saveBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        <span>Simpan Rekening</span>
      `;
      saveBtn.className = 'flex-1 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-xs active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5';
    }

    const cancelBtn = document.getElementById('btn-cancel-wallet');
    if (cancelBtn) {
      cancelBtn.innerText = 'Reset Form';
      cancelBtn.className = 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 rounded-xl text-xs transition active:scale-[0.99] cursor-pointer';
    }

    this.renderModalWalletList();
  },

  setWalletEditMode(wallet) {
    const titleEl = document.getElementById('modal-wallet-title');
    if (titleEl) titleEl.innerText = `Edit: ${wallet.name}`;

    const badgeEl = document.getElementById('modal-wallet-badge');
    if (badgeEl) badgeEl.classList.remove('hidden');

    const alertEl = document.getElementById('wallet-edit-alert');
    const nameDisplay = document.getElementById('wallet-edit-name-display');
    if (alertEl) {
      alertEl.classList.remove('hidden');
      alertEl.classList.add('flex');
    }
    if (nameDisplay) {
      nameDisplay.innerText = wallet.name;
    }

    const iconWrap = document.getElementById('modal-wallet-icon-wrap');
    if (iconWrap) {
      iconWrap.className = 'w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold transition-colors';
    }

    const saveBtn = document.getElementById('btn-save-wallet');
    if (saveBtn) {
      saveBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <span>Simpan Perubahan</span>
      `;
      saveBtn.className = 'flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-xs active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5';
    }

    const cancelBtn = document.getElementById('btn-cancel-wallet');
    if (cancelBtn) {
      cancelBtn.innerText = 'Batal Edit';
      cancelBtn.className = 'bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold px-4 rounded-xl text-xs transition active:scale-[0.99] cursor-pointer border border-amber-300/80';
    }

    this.renderModalWalletList();

    const container = document.getElementById('modal-wallet-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const nameInput = document.getElementById('wallet-name');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 60);
    }
  },

  toggleNotification(forceState) {
    const popover = document.getElementById('notif-dropdown');
    if (!popover) return;

    const willOpen = typeof forceState === 'boolean' ? forceState : popover.classList.contains('hidden');

    if (willOpen) {
      popover.classList.remove('hidden');
      popover.classList.add('animate-scale-in');
      this.isNotificationOpen = true;
    } else {
      popover.classList.add('hidden');
      popover.classList.remove('animate-scale-in');
      this.isNotificationOpen = false;
    }
  },

  renderNotifications() {
    const listEl = document.getElementById('notif-list');
    const badgeDesktop = document.getElementById('notif-badge-desktop');
    const badgeMobile = document.getElementById('notif-badge-mobile');
    const countLabel = document.getElementById('notif-count-label');
    const summaryBadge = document.getElementById('notif-summary-badge');

    const notifs = state.notifications || [];
    const count = notifs.length;

    if (count > 0) {
      if (badgeDesktop) badgeDesktop.classList.remove('hidden');
      if (badgeMobile) badgeMobile.classList.remove('hidden');
      if (summaryBadge) {
        summaryBadge.innerText = `${count} Perhatian`;
        summaryBadge.className = 'text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200';
      }
      if (countLabel) countLabel.innerText = `${count} peringatan limit aktif`;
    } else {
      if (badgeDesktop) badgeDesktop.classList.add('hidden');
      if (badgeMobile) badgeMobile.classList.add('hidden');
      if (summaryBadge) {
        summaryBadge.innerText = 'Normal';
        summaryBadge.className = 'text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200';
      }
      if (countLabel) countLabel.innerText = 'Semua pengeluaran dalam batas aman';
    }

    if (!listEl) return;

    if (count === 0) {
      listEl.innerHTML = `
        <div class="py-8 px-4 text-center">
          <div class="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
            <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <p class="text-xs font-semibold text-slate-700">Tidak ada limit yang terlampaui</p>
          <p class="text-[11px] text-slate-400 mt-1">Seluruh akun dompet beroperasi dalam batas anggaran yang ditentukan.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = notifs.map(item => {
      const isCritical = item.percent >= 100;
      return `
        <div class="p-3.5 hover:bg-slate-50 transition border-b border-slate-100 last:border-b-0 flex items-start gap-3">
          <div class="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${isCritical ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2 mb-1">
              <p class="text-xs font-bold ${isCritical ? 'text-rose-700' : 'text-amber-800'} truncate">
                ${item.title}
              </p>
              <span class="text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded ${isCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}">
                ${item.percent}%
              </span>
            </div>
            <p class="text-[11px] text-slate-600 leading-snug">
              Akun <span class="font-semibold text-slate-800">${item.walletName}</span> telah mencapai pengeluaran 
              <span class="font-medium text-slate-800">${utils.formatRupiah(item.spent)}</span> dari limit 
              <span class="font-medium text-slate-800">${utils.formatRupiah(item.limit)}</span>.
            </p>
            <div class="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div class="h-1.5 rounded-full ${isCritical ? 'bg-rose-500' : 'bg-amber-500'}" style="width: ${Math.min(item.percent, 100)}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderModalWalletList() {
    const modalList = document.getElementById('modal-wallet-list');
    if (!modalList) return;
    const editingId = document.getElementById('wallet-edit-id')?.value || '';

    modalList.innerHTML = state.wallets.map(w => {
      const isEditing = w.id === editingId;
      const hasWeekly = w.maxLimit && w.maxLimit > 0;
      const hasMonthly = w.monthlyLimit && w.monthlyLimit > 0;
      const limitText = [];
      if (hasWeekly) limitText.push(`Mgg: ${utils.formatRupiah(w.maxLimit)}`);
      if (hasMonthly) limitText.push(`Bln: ${utils.formatRupiah(w.monthlyLimit)}`);
      if (limitText.length === 0) limitText.push('Tanpa Limit');

      return `
        <div class="flex justify-between items-center p-3.5 rounded-xl transition ${isEditing ? 'bg-amber-50/90 border-2 border-amber-400 shadow-sm ring-2 ring-amber-200/50' : 'bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60'}">
          <div class="flex items-center gap-3">
            <div class="w-3.5 h-3.5 rounded-full flex-shrink-0" style="background-color: ${w.hex};"></div>
            <div>
              <div class="flex items-center gap-1.5">
                <p class="font-semibold text-xs text-slate-900">${w.name}</p>
                ${isEditing ? '<span class="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-md uppercase tracking-wider">Sedang Diedit</span>' : ''}
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5 font-medium">${limitText.join(' • ')}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button type="button" onclick="app.editWallet('${w.id}')" class="text-xs ${isEditing ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold' : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-medium'} px-2.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer">
              ${isEditing ? 'Sedang Diedit' : 'Edit'}
            </button>
            <button type="button" onclick="app.deleteWallet('${w.id}')" class="text-xs bg-white border border-slate-200 hover:border-rose-200 hover:text-rose-600 text-slate-500 px-2.5 py-1.5 rounded-lg font-medium transition shadow-xs cursor-pointer">Hapus</button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderMain() {
    // 1. Hitung Total Kas Nyata dari Seluruh Rekening Bank (Total Saldo Likuid)
    const bankStats = this.getBankStats();
    let totalBankCash = 0;
    Object.values(bankStats).forEach(b => totalBankCash += Number(b.current || 0));

    // Total Saldo Likuid adalah total dari saldo bank
    const totalSaldoEl = document.getElementById('total-saldo');
    if (totalSaldoEl) totalSaldoEl.innerText = utils.formatRupiah(totalBankCash);

    // 2. Hitung Mutasi Dompet & Ringkasan Finansial Periode Terpilih
    const walletStats = {};
    state.wallets.forEach(w => walletStats[w.id] = { spent: 0, weeklySpent: 0, monthlySpent: 0, income: 0 });

    let sumIncome = 0;
    let sumExpense = 0;

    state.transactions.forEach(tx => {
      if (tx.type === 'transfer') return;
      const amount = Number(tx.amount);
      const txDate = new Date(tx.fullDate);
      const isSelectedMonth = txDate.getMonth() === state.filterMonth && txDate.getFullYear() === state.filterYear;

      if (walletStats[tx.walletId]) {
        if (tx.type === 'in') {
          walletStats[tx.walletId].income += amount;
          if (isSelectedMonth) sumIncome += amount;
        } else if (tx.type === 'out') {
          walletStats[tx.walletId].spent += amount;
          if (isSelectedMonth) sumExpense += amount;

          if (utils.isWithinCurrentWeek(tx.fullDate)) walletStats[tx.walletId].weeklySpent += amount;
          if (utils.isWithinCurrentMonth(tx.fullDate)) walletStats[tx.walletId].monthlySpent += amount;
        }
      }
    });
    
    const incEl = document.getElementById('summary-income');
    const expEl = document.getElementById('summary-expense');
    const netEl = document.getElementById('summary-net');
    if (incEl) incEl.innerText = utils.formatRupiah(sumIncome);
    if (expEl) expEl.innerText = utils.formatRupiah(sumExpense);
    if (netEl) netEl.innerText = utils.formatRupiah(sumIncome - sumExpense);

    // 3. Hitung Total Saldo Dompet & Validasi Sinkronisasi Kas Bank vs Dompet
    let totalWalletsCash = 0;
    state.wallets.forEach(w => {
      const stats = walletStats[w.id] || { spent: 0, income: 0 };
      totalWalletsCash += (Number(w.budget || 0) + stats.income - stats.spent);
    });

    const diff = Math.abs(totalBankCash - totalWalletsCash);
    const syncBadge = document.getElementById('balance-sync-badge');
    const syncDot = document.getElementById('balance-sync-dot');
    const syncText = document.getElementById('balance-sync-text');

    if (syncBadge && syncDot && syncText) {
      if (diff === 0) {
        syncBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-emerald-200';
        syncDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse';
        syncText.innerText = 'Klop 100% (Kas Bank = Dompet)';
      } else {
        syncBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/20 backdrop-blur-md border border-amber-400/30 text-amber-200';
        syncDot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400';
        syncText.innerText = `Selisih: ${utils.formatRupiah(diff)} (Perlu Penyesuaian)`;
      }
    }

    state.notifications = [];

    const walletListEl = document.getElementById('wallet-list');
    if (walletListEl) walletListEl.innerHTML = '';

    state.wallets.forEach(w => {
      const stats = walletStats[w.id] || { spent: 0, weeklySpent: 0, monthlySpent: 0, income: 0 };
      const remaining = Number(w.budget || 0) + stats.income - stats.spent;
      const maxLimit = Number(w.maxLimit) || 0;
      const monthlyLimit = Number(w.monthlyLimit) || 0;
      
      const hasWeeklyLimit = maxLimit > 0;
      const hasMonthlyLimit = monthlyLimit > 0;

      const percentWeekly = hasWeeklyLimit ? Math.round((stats.weeklySpent / maxLimit) * 100) : 0;
      const percentMonthly = hasMonthlyLimit ? Math.round((stats.monthlySpent / monthlyLimit) * 100) : 0;

      if (hasWeeklyLimit && percentWeekly >= 80) {
        state.notifications.push({
          type: 'weekly',
          walletId: w.id,
          walletName: w.name,
          percent: percentWeekly,
          spent: stats.weeklySpent,
          limit: maxLimit,
          title: percentWeekly >= 100 ? 'Limit Mingguan Terlampaui' : 'Peringatan Limit Mingguan'
        });
      }

      if (hasMonthlyLimit && percentMonthly >= 80) {
        state.notifications.push({
          type: 'monthly',
          walletId: w.id,
          walletName: w.name,
          percent: percentMonthly,
          spent: stats.monthlySpent,
          limit: monthlyLimit,
          title: percentMonthly >= 100 ? 'Limit Bulanan Terlampaui' : 'Peringatan Limit Bulanan'
        });
      }

      if (walletListEl) {
        const hexColor = w.hex || '#0284c7';
        const progressPercent = hasMonthlyLimit ? Math.min(percentMonthly, 100) : 0;
        let progressColorClass = 'bg-sky-600';
        if (hasMonthlyLimit) {
          if (percentMonthly >= 100) progressColorClass = 'bg-rose-500';
          else if (percentMonthly >= 80) progressColorClass = 'bg-amber-500';
          else progressColorClass = 'bg-sky-600';
        }

        walletListEl.innerHTML += `
          <div class="bg-white border border-slate-200/90 hover:border-sky-300/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs" style="background-color: ${hexColor}15; color: ${hexColor}; border: 1px solid ${hexColor}30;">
                  ${w.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 class="font-bold text-sm text-slate-900 group-hover:text-sky-700 transition">${w.name}</h3>
                  <p class="text-[11px] text-slate-400">Saldo Tersedia</p>
                </div>
              </div>
              ${hasMonthlyLimit ? `
                <span class="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-md ${percentMonthly >= 100 ? 'bg-rose-50 text-rose-700 border border-rose-200' : percentMonthly >= 80 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-sky-50 text-sky-700 border border-sky-100'}">
                  ${percentMonthly}% Terpakai
                </span>
              ` : `
                <span class="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                  Tanpa Limit
                </span>
              `}
            </div>

            <div class="mb-4">
              <p class="text-2xl font-bold tracking-tight text-slate-900 font-mono">${utils.formatRupiah(remaining)}</p>
            </div>

            <div class="pt-3 border-t border-slate-100 space-y-2">
              <div class="flex justify-between text-[11px] text-slate-500">
                <span>Pengeluaran Bulan Ini</span>
                <span class="font-semibold text-slate-800 font-mono">${utils.formatRupiah(stats.monthlySpent)}</span>
              </div>
              ${hasMonthlyLimit ? `
                <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div class="${progressColorClass} h-1.5 rounded-full transition-all duration-500" style="width: ${progressPercent}%;"></div>
                </div>
                <div class="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Limit: ${utils.formatRupiah(monthlyLimit)}</span>
                  <span>Sisa: ${utils.formatRupiah(Math.max(0, monthlyLimit - stats.monthlySpent))}</span>
                </div>
              ` : `
                <div class="text-[10px] text-slate-400">
                  Mingguan: <span class="font-medium text-slate-600 font-mono">${utils.formatRupiah(stats.weeklySpent)}</span>
                </div>
              `}
            </div>
          </div>
        `;
      }
    });

    this.renderNotifications();

    const selectEl = document.getElementById('tx-wallet');
    if (selectEl) {
      selectEl.innerHTML = state.wallets.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
    }

    this.renderBanks();
    this.renderModalBankList();
    this.renderCategories();
    this.renderTransactions();
    this.renderModalWalletList();
    
    if (!document.querySelector('.tab-content.active')) {
      this.switchTab('dashboard');
    }
  },

  renderTransactions() {
    const listEl = document.getElementById('monthly-tx-list');
    const recentListEl = document.getElementById('recent-tx-list');
    const filterTabsContainer = document.getElementById('tx-wallet-filter-tabs');
    
    const runningBalanceMap = new Map();
    const walletFinalBalances = {};

    state.wallets.forEach(wallet => {
      let currentBal = Number(wallet.budget || 0);
      
      const chronoTxs = state.transactions
        .map((tx, idx) => ({ ...tx, realIndex: idx }))
        .filter(tx => tx.walletId === wallet.id)
        .sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));

      chronoTxs.forEach(tx => {
        const amt = Number(tx.amount || 0);
        if (tx.type === 'in') {
          currentBal += amt;
        } else {
          currentBal -= amt;
        }
        runningBalanceMap.set(tx.realIndex, currentBal);
      });

      walletFinalBalances[wallet.id] = currentBal;
    });

    const allFilteredTxs = state.transactions
      .map((tx, idx) => ({ ...tx, realIndex: idx }))
      .filter(tx => {
        const d = new Date(tx.fullDate);
        return d.getMonth() === state.filterMonth && d.getFullYear() === state.filterYear;
      })
      .sort((a, b) => {
        const timeB = b.fullDate ? new Date(b.fullDate).getTime() : 0;
        const timeA = a.fullDate ? new Date(a.fullDate).getTime() : 0;
        return (timeB - timeA) || (b.realIndex - a.realIndex);
      });

    const buildWalletMutationTable = (wallet, txList, isCompact = false) => {
      let income = 0;
      let expense = 0;
      txList.forEach(tx => {
        if (tx.type === 'in') income += Number(tx.amount || 0);
        else expense += Number(tx.amount || 0);
      });

      const hex = wallet.hex || '#0284c7';
      const finalBal = walletFinalBalances[wallet.id] ?? Number(wallet.budget || 0);

      if (txList.length === 0) {
        if (isCompact) return '';
        return `
          <div class="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden mb-5">
            <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs" style="background-color: ${hex}18; color: ${hex}; border: 1px solid ${hex}30;">
                  ${wallet.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 class="font-bold text-xs sm:text-sm text-slate-900">${wallet.name}</h3>
                  <p class="text-[10px] text-slate-400">Saldo saat ini: <span class="font-mono font-semibold text-slate-700">${utils.formatRupiah(finalBal)}</span></p>
                </div>
              </div>
              <span class="text-[10px] text-slate-400 italic">Belum ada mutasi</span>
            </div>
            <div class="py-6 text-center text-slate-400 text-xs">
              Tidak ada catatan mutasi transaksi pada rekening ini di periode terpilih.
            </div>
          </div>
        `;
      }

      return `
        <div class="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden mb-5 transition-all hover:border-slate-300">
          <div class="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-sky-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div class="flex items-center gap-2.5 sm:gap-3">
              <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs flex-shrink-0" style="background-color: ${hex}18; color: ${hex}; border: 1px solid ${hex}30;">
                ${wallet.name.charAt(0).toUpperCase()}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <h3 class="font-bold text-xs sm:text-sm text-slate-900 truncate">${wallet.name}</h3>
                  <span class="text-[9px] sm:text-[10px] font-semibold font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60 flex-shrink-0">
                    ${txList.length} Mutasi
                  </span>
                </div>
                <p class="text-[10px] sm:text-[11px] text-slate-400 truncate">Saldo saat ini: <span class="font-mono font-semibold text-slate-700">${utils.formatRupiah(finalBal)}</span></p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono">
              <div class="px-2 py-0.5 rounded-lg bg-emerald-50/80 border border-emerald-100 text-emerald-700">
                <span class="font-sans font-medium text-emerald-600 mr-0.5">Masuk:</span>
                <span class="font-bold">+${utils.formatRupiah(income)}</span>
              </div>
              <div class="px-2 py-0.5 rounded-lg bg-rose-50/80 border border-rose-100 text-rose-700">
                <span class="font-sans font-medium text-rose-600 mr-0.5">Keluar:</span>
                <span class="font-bold">-${utils.formatRupiah(expense)}</span>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <th class="py-2.5 px-3 sm:px-4 w-20 sm:w-24 whitespace-nowrap">Tanggal</th>
                  <th class="py-2.5 px-2 sm:px-4">Keterangan</th>
                  <th class="py-2.5 px-2 sm:px-3 whitespace-nowrap">Dompet</th>
                  <th class="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap">Nominal</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${txList.map(tx => {
                  const isIncome = tx.type === 'in';
                  const bankObj = state.banks.find(b => b.id === tx.bankId);
                  const bankName = bankObj ? bankObj.name : '';
                  return `
                    <tr class="hover:bg-sky-50/30 transition-colors group">
                      <td class="py-2.5 px-3 sm:px-4 text-slate-500 font-medium whitespace-nowrap text-[11px] sm:text-xs">
                        ${tx.date}
                      </td>
                      <td class="py-2.5 px-2 sm:px-4 text-slate-900 font-semibold text-xs min-w-0">
                        <div class="flex items-center gap-1.5 min-w-0">
                          <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                          <span class="truncate block max-w-[120px] sm:max-w-xs" title="${tx.desc}">${tx.desc}</span>
                        </div>
                      </td>
                      <td class="py-2.5 px-2 sm:px-3 whitespace-nowrap text-[10px] sm:text-xs">
                        <div class="flex flex-col sm:flex-row sm:items-center gap-1">
                          <span class="inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60 max-w-[95px] sm:max-w-none truncate">
                            <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${hex};"></span>
                            <span class="truncate">${wallet.name}</span>
                          </span>
                          ${bankName ? `<span class="inline-flex items-center text-[9px] font-semibold text-sky-800 bg-sky-50 border border-sky-200/70 px-1.5 py-0.2 rounded">${bankName}</span>` : ''}
                        </div>
                      </td>
                      <td class="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap font-mono text-xs">
                        <div class="inline-flex items-center gap-1.5 justify-end">
                          <span class="font-bold ${isIncome ? 'text-emerald-600' : 'text-slate-900'}">
                            ${isIncome ? '+' : '-'} ${utils.formatRupiah(tx.amount)}
                          </span>
                          <button onclick="app.deleteTransaction(${tx.realIndex})" class="w-5 h-5 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-600 inline-flex items-center justify-center transition opacity-60 group-hover:opacity-100 cursor-pointer" title="Hapus Transaksi">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    };

    if (recentListEl) {
      if (allFilteredTxs.length === 0) {
        recentListEl.innerHTML = `
          <div class="flex flex-col items-center justify-center py-8 px-4 bg-white border border-slate-200/80 rounded-2xl text-center">
            <p class="text-xs font-semibold text-slate-500">Belum ada aktivitas mutasi transaksi pada bulan ini.</p>
          </div>
        `;
      } else {
        const maxRecent = 10;
        const displayTxs = allFilteredTxs.slice(0, maxRecent);

        let totalIn = 0;
        let totalOut = 0;
        allFilteredTxs.forEach(tx => {
          if (tx.type === 'in') totalIn += Number(tx.amount || 0);
          else if (tx.type === 'out') totalOut += Number(tx.amount || 0);
        });

        const rowsHTML = displayTxs.map(tx => {
          const isIncome = tx.type === 'in';
          const isTransfer = tx.type === 'transfer';

          let indicatorClass = isTransfer ? 'bg-sky-500' : (isIncome ? 'bg-emerald-500' : 'bg-rose-500');
          let walletBadgeHTML = '';
          let nominalHTML = '';

          if (isTransfer) {
            walletBadgeHTML = `
              <span class="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-[10px]">
                <svg class="w-3 h-3 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                <span>Transfer Antar Bank</span>
              </span>
            `;
            nominalHTML = `
              <span class="font-bold text-sky-700 font-mono">
                ${utils.formatRupiah(tx.amount)}
              </span>
            `;
          } else {
            const wallet = state.wallets.find(w => w.id === tx.walletId) || { name: 'Dompet', hex: '#0284c7' };
            const hex = wallet.hex || '#0284c7';
            const bankObj = state.banks.find(b => b.id === tx.bankId);
            const bankName = bankObj ? bankObj.name : '';

            walletBadgeHTML = `
              <div class="flex flex-col sm:flex-row sm:items-center gap-1">
                <span class="inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60 max-w-[95px] sm:max-w-none truncate">
                  <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${hex};"></span>
                  <span class="truncate">${wallet.name}</span>
                </span>
                ${bankName ? `<span class="inline-flex items-center text-[9px] font-semibold text-sky-800 bg-sky-50 border border-sky-200/70 px-1.5 py-0.2 rounded">${bankName}</span>` : ''}
              </div>
            `;
            nominalHTML = `
              <span class="font-bold ${isIncome ? 'text-emerald-600' : 'text-slate-900'} font-mono">
                ${isIncome ? '+' : '-'} ${utils.formatRupiah(tx.amount)}
              </span>
            `;
          }

          return `
            <tr class="hover:bg-sky-50/30 transition-colors group">
              <td class="py-2.5 px-3 sm:px-4 text-slate-500 font-medium whitespace-nowrap text-[11px] sm:text-xs">
                ${tx.date}
              </td>
              <td class="py-2.5 px-2 sm:px-4 text-slate-900 font-semibold text-xs min-w-0">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 ${indicatorClass}"></span>
                  <span class="truncate block max-w-[120px] sm:max-w-xs" title="${tx.desc}">${tx.desc}</span>
                </div>
              </td>
              <td class="py-2.5 px-2 sm:px-3 whitespace-nowrap text-[10px] sm:text-xs">
                ${walletBadgeHTML}
              </td>
              <td class="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap font-mono text-xs">
                <div class="inline-flex items-center gap-1.5 justify-end">
                  ${nominalHTML}
                  <button onclick="app.deleteTransaction(${tx.realIndex})" class="w-5 h-5 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-600 inline-flex items-center justify-center transition opacity-60 group-hover:opacity-100 cursor-pointer" title="Hapus Transaksi">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        const footerHTML = allFilteredTxs.length > maxRecent ? `
          <div class="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span class="text-[11px] text-slate-400">Menampilkan ${maxRecent} mutasi terbaru dari total ${allFilteredTxs.length} transaksi</span>
            <button type="button" onclick="ui.switchTab('transactions')" class="text-xs font-semibold text-sky-700 hover:text-sky-800 transition inline-flex items-center gap-1 cursor-pointer">
              <span>Lihat Seluruh Mutasi</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
        ` : '';

        recentListEl.innerHTML = `
          <div class="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all hover:border-slate-300">
            <div class="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-sky-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div class="flex items-center gap-2.5 sm:gap-3">
                <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs flex-shrink-0 bg-sky-50 text-sky-700 border border-sky-100">
                  <svg class="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <h3 class="font-bold text-xs sm:text-sm text-slate-900 truncate">Mutasi Rekening Terkini</h3>
                    <span class="text-[9px] sm:text-[10px] font-semibold font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60 flex-shrink-0">
                      ${allFilteredTxs.length} Mutasi
                    </span>
                  </div>
                  <p class="text-[10px] sm:text-[11px] text-slate-400 truncate">Semua dompet • Urut dari transaksi paling baru</p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono">
                <div class="px-2 py-0.5 rounded-lg bg-emerald-50/80 border border-emerald-100 text-emerald-700">
                  <span class="font-sans font-medium text-emerald-600 mr-0.5">Masuk:</span>
                  <span class="font-bold">+${utils.formatRupiah(totalIn)}</span>
                </div>
                <div class="px-2 py-0.5 rounded-lg bg-rose-50/80 border border-rose-100 text-rose-700">
                  <span class="font-sans font-medium text-rose-600 mr-0.5">Keluar:</span>
                  <span class="font-bold">-${utils.formatRupiah(totalOut)}</span>
                </div>
              </div>
            </div>

            <div class="overflow-x-auto custom-scrollbar">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                    <th class="py-2.5 px-3 sm:px-4 w-20 sm:w-24 whitespace-nowrap">Tanggal</th>
                    <th class="py-2.5 px-2 sm:px-4">Keterangan</th>
                    <th class="py-2.5 px-2 sm:px-3 whitespace-nowrap">Dompet</th>
                    <th class="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap">Nominal</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${rowsHTML}
                </tbody>
              </table>
            </div>
            ${footerHTML}
          </div>
        `;
      }
    }

    if (!listEl) return;

    if (filterTabsContainer) {
      const activeAll = this.selectedTxWalletTab === 'all' 
        ? 'bg-sky-600 text-white shadow-xs font-semibold' 
        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 font-medium';

      let filterBtnsHTML = `
        <button type="button" onclick="ui.setTxWalletFilter('all')" class="px-3 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 ${activeAll}">
          <span>Semua Dompet</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full ${this.selectedTxWalletTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 font-mono'}">${allFilteredTxs.length}</span>
        </button>
      `;

      state.wallets.forEach(w => {
        const count = allFilteredTxs.filter(tx => tx.walletId === w.id).length;
        const isActive = this.selectedTxWalletTab === w.id;
        const btnClass = isActive 
          ? 'bg-sky-600 text-white shadow-xs font-semibold' 
          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 font-medium';
        const hex = w.hex || '#0284c7';

        filterBtnsHTML += `
          <button type="button" onclick="ui.setTxWalletFilter('${w.id}')" class="px-3 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 ${btnClass}">
            <span class="w-2 h-2 rounded-full" style="background-color: ${isActive ? '#ffffff' : hex};"></span>
            <span>${w.name}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 font-mono'}">${count}</span>
          </button>
        `;
      });

      filterTabsContainer.innerHTML = filterBtnsHTML;
    }

    const targetWallets = this.selectedTxWalletTab === 'all' 
      ? state.wallets 
      : state.wallets.filter(w => w.id === this.selectedTxWalletTab);

    if (allFilteredTxs.length === 0) {
      listEl.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 px-4 bg-white border border-slate-200/80 rounded-2xl text-center">
          <div class="w-12 h-12 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 mb-3">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <p class="text-sm font-semibold text-slate-700">Belum ada catatan mutasi transaksi pada periode ini</p>
          <p class="text-xs text-slate-400 mt-1 max-w-xs">Data mutasi pada bulan yang dipilih masih kosong. Tambahkan transaksi baru untuk memulai pembukuan.</p>
        </div>
      `;
      return;
    }

    let tablesHTML = '';
    targetWallets.forEach(wallet => {
      const walletTxs = allFilteredTxs.filter(tx => tx.walletId === wallet.id);
      tablesHTML += buildWalletMutationTable(wallet, walletTxs, false);
    });

    listEl.innerHTML = tablesHTML;
  }
};
