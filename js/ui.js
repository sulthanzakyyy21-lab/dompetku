const ui = {
  // Tab Management
  switchTab(tabId) {
    // Sembunyikan semua tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
      tab.classList.add('hidden');
    });
    
    // Tampilkan tab yang dipilih
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) {
      targetTab.classList.remove('hidden');
      targetTab.classList.add('active');
    }

    // Reset Desktop Sidebar
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active-nav', 'text-slate-800', 'bg-slate-50');
      link.classList.add('text-slate-500');
    });
    const activeSidebar = document.getElementById(`nav-${tabId}`);
    if (activeSidebar) {
      activeSidebar.classList.add('active-nav', 'text-slate-800', 'bg-slate-50');
      activeSidebar.classList.remove('text-slate-500');
    }

    // Reset Mobile Bottom Nav
    document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
      btn.classList.remove('active-bnav');
      btn.classList.add('text-slate-400');
    });
    const activeBottomNav = document.getElementById(`bnav-${tabId}`);
    if (activeBottomNav) {
      activeBottomNav.classList.add('active-bnav');
      activeBottomNav.classList.remove('text-slate-400');
    }

    // Render ulang charts jika pindah ke analitik
    if (tabId === 'analytics') {
      analytics.renderCharts();
    }
  },

  initFilters() {
    const monthSelect = document.getElementById('filter-month');
    const yearSelect = document.getElementById('filter-year');
    if (!monthSelect || !yearSelect) return;
    
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
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

    if (type === 'out') {
      btnOut.className = "flex-1 py-3 text-sm font-bold rounded-xl bg-white text-slate-800 shadow-sm border border-slate-200/50 transition-all";
      btnIn.className = "flex-1 py-3 text-sm font-bold rounded-xl text-slate-500 hover:text-slate-700 transition-all";
      btnSubmit.className = "w-full bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-rose-200 text-sm tracking-wide mt-2";
      btnSubmit.innerHTML = "💾 Simpan Pengeluaran";
    } else {
      btnIn.className = "flex-1 py-3 text-sm font-bold rounded-xl bg-white text-slate-800 shadow-sm border border-slate-200/50 transition-all";
      btnOut.className = "flex-1 py-3 text-sm font-bold rounded-xl text-slate-500 hover:text-slate-700 transition-all";
      btnSubmit.className = "w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-200 text-sm tracking-wide mt-2";
      btnSubmit.innerHTML = "💾 Simpan Pemasukan";
    }
  },

  toggleModalWallet() {
    const modal = document.getElementById('modal-wallet');
    modal.classList.toggle('hidden');
    modal.classList.toggle('flex');
  },

  resetWalletForm() {
    document.getElementById('wallet-edit-id').value = '';
    document.getElementById('wallet-name').value = '';
    document.getElementById('wallet-budget').value = '';
    document.getElementById('wallet-max-limit').value = '';
    document.getElementById('wallet-monthly-limit').value = '';
  },

  renderModalWalletList() {
    const modalList = document.getElementById('modal-wallet-list');
    modalList.innerHTML = state.wallets.map(w => `
      <div class="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
        <div>
          <p class="font-bold text-sm text-slate-800">${w.name}</p>
          <p class="text-[10px] text-slate-500 mt-1 font-semibold">Limit: Mgg (${utils.formatRupiah(w.maxLimit)}) | Bln (${utils.formatRupiah(w.monthlyLimit || 0)})</p>
        </div>
        <div class="flex gap-2">
          <button type="button" onclick="app.editWallet('${w.id}')" class="text-xs bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 px-3 py-1.5 rounded-lg font-bold transition">Edit</button>
          <button type="button" onclick="app.deleteWallet('${w.id}')" class="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg font-bold transition">Hapus</button>
        </div>
      </div>
    `).join('');
  },

  renderMain() {
    const walletStats = {};
    state.wallets.forEach(w => walletStats[w.id] = { spent: 0, weeklySpent: 0, monthlySpent: 0, income: 0 });

    let totalNetBalance = 0;
    state.wallets.forEach(w => totalNetBalance += Number(w.budget));

    // Summary Bulanan
    let sumIncome = 0;
    let sumExpense = 0;

    state.transactions.forEach(tx => {
      const amount = Number(tx.amount);
      const txDate = new Date(tx.fullDate);
      const isSelectedMonth = txDate.getMonth() === state.filterMonth && txDate.getFullYear() === state.filterYear;

      if (walletStats[tx.walletId]) {
        if (tx.type === 'in') {
          walletStats[tx.walletId].income += amount;
          totalNetBalance += amount;
          if (isSelectedMonth) sumIncome += amount;
        } else {
          walletStats[tx.walletId].spent += amount;
          totalNetBalance -= amount;
          if (isSelectedMonth) sumExpense += amount;

          // Peringatan menggunakan waktu asli (current week/month)
          if (utils.isWithinCurrentWeek(tx.fullDate)) walletStats[tx.walletId].weeklySpent += amount;
          if (utils.isWithinCurrentMonth(tx.fullDate)) walletStats[tx.walletId].monthlySpent += amount;
        }
      }
    });

    document.getElementById('total-saldo').innerText = utils.formatRupiah(totalNetBalance);
    
    // Update summary bulanan UI
    document.getElementById('summary-income').innerText = utils.formatRupiah(sumIncome);
    document.getElementById('summary-expense').innerText = utils.formatRupiah(sumExpense);
    document.getElementById('summary-net').innerText = utils.formatRupiah(sumIncome - sumExpense);

    // Warnings and Wallets
    const warningContainer = document.getElementById('warning-container');
    warningContainer.innerHTML = '';
    const walletListEl = document.getElementById('wallet-list');
    walletListEl.innerHTML = '';

    state.wallets.forEach(w => {
      const stats = walletStats[w.id];
      const remaining = Number(w.budget) + stats.income - stats.spent;
      const maxLimit = Number(w.maxLimit) || 1;
      const monthlyLimit = Number(w.monthlyLimit) || 1;
      
      const percentWeekly = Math.round((stats.weeklySpent / maxLimit) * 100);
      const percentMonthly = Math.round((stats.monthlySpent / monthlyLimit) * 100);

      // Warning Box (Mingguan)
      if (percentWeekly >= 80) {
        const isOver = percentWeekly >= 100;
        warningContainer.innerHTML += `
          <div class="p-4 rounded-2xl border ${isOver ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'} flex items-start gap-3 shadow-sm">
            <span class="text-xl">${isOver ? '🚨' : '⚠️'}</span>
            <div class="text-xs">
              <span class="font-extrabold block mb-1 text-sm">${isOver ? 'Limit Minggu Ini Terlewati!' : 'Peringatan Limit Mingguan!'}</span>
              Dompet <b class="underline">${w.name}</b> minggu ini mencapai <b>${percentWeekly}%</b> (${utils.formatRupiah(stats.weeklySpent)} / ${utils.formatRupiah(maxLimit)}).
            </div>
          </div>
        `;
      }

      // Warning Box (Bulanan)
      if (percentMonthly >= 80) {
        const isOverMonthly = percentMonthly >= 100;
        warningContainer.innerHTML += `
          <div class="p-4 rounded-2xl border ${isOverMonthly ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-orange-50 border-orange-200 text-orange-800'} flex items-start gap-3 shadow-sm">
            <span class="text-xl">📅</span>
            <div class="text-xs">
              <span class="font-extrabold block mb-1 text-sm">${isOverMonthly ? 'Limit Bulan Ini Jebol!' : 'Peringatan Limit Bulanan!'}</span>
              Dompet <b class="underline">${w.name}</b> bulan ini mencapai <b>${percentMonthly}%</b> (${utils.formatRupiah(stats.monthlySpent)} / ${utils.formatRupiah(monthlyLimit)}).
            </div>
          </div>
        `;
      }

      // Render Dompet List Item
      const hexColor = w.hex || '#6366f1';
      const progressColor = percentMonthly >= 100 ? 'bg-rose-500' : percentMonthly >= 80 ? 'bg-amber-500' : 'bg-indigo-500';

      walletListEl.innerHTML += `
        <div class="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm hover:shadow-md hover:border-slate-200 flex flex-col justify-between space-y-4 transition duration-300 group">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm" style="background-color: ${hexColor}15; color: ${hexColor}; border: 1px solid ${hexColor}30;">
                👛
              </div>
              <span class="font-extrabold text-slate-800 text-sm group-hover:text-indigo-600 transition">${w.name}</span>
            </div>
            <span class="text-[10px] font-bold bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg text-slate-500 shadow-sm">
              ${percentMonthly}% Terpakai
            </span>
          </div>
          
          <div class="flex justify-between items-end">
            <div>
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Sisa Uang</p>
              <p class="text-xl font-extrabold text-slate-800">${utils.formatRupiah(remaining)}</p>
            </div>
            <div class="text-right text-[10px] text-slate-500 font-medium space-y-1">
              <p class="flex justify-end gap-2"><span>Keluar Mgg:</span> <span class="font-bold text-slate-700">${utils.formatRupiah(stats.weeklySpent)}</span></p>
              <p class="flex justify-end gap-2"><span>Keluar Bln:</span> <span class="font-bold text-slate-700">${utils.formatRupiah(stats.monthlySpent)}</span></p>
            </div>
          </div>
          
          <div class="space-y-2 pt-2 border-t border-slate-100/80">
            <div class="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Progress Bulanan</span>
              <span>Limit: ${utils.formatRupiah(monthlyLimit)}</span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner">
              <div class="${progressColor} h-2.5 rounded-full transition-all duration-700 ease-out shadow-sm" style="width: ${Math.min(percentMonthly, 100)}%; background-color: ${percentMonthly < 80 ? hexColor : ''};"></div>
            </div>
          </div>
        </div>
      `;
    });

    const selectEl = document.getElementById('tx-wallet');
    selectEl.innerHTML = state.wallets.map(w => `<option value="${w.id}">${w.name}</option>`).join('');

    this.renderTransactions();
    this.renderModalWalletList();
    
    // Auto switch to Dashboard when initially loaded if no tab is active
    if (!document.querySelector('.tab-content.active')) {
      this.switchTab('dashboard');
    }
  },

  renderTransactions() {
    const listEl = document.getElementById('monthly-tx-list');
    const recentListEl = document.getElementById('recent-tx-list');
    
    // Ambil transaksi hanya pada bulan & tahun yang difilter
    const filteredTxs = state.transactions
      .map((tx, idx) => ({ ...tx, realIndex: idx }))
      .filter(tx => {
        const d = new Date(tx.fullDate);
        return d.getMonth() === state.filterMonth && d.getFullYear() === state.filterYear;
      })
      .reverse();

    if (filteredTxs.length === 0) {
      const emptyState = `
        <div class="flex flex-col items-center justify-center py-10 bg-white border border-slate-100 border-dashed rounded-3xl">
          <span class="text-4xl mb-3 opacity-80">📭</span>
          <p class="text-slate-500 text-xs font-bold">Belum ada transaksi.</p>
        </div>
      `;
      if(listEl) listEl.innerHTML = emptyState;
      if(recentListEl) recentListEl.innerHTML = emptyState;
      return;
    }

    const txHTML = (txs) => txs.map(tx => {
      const isIncome = tx.type === 'in';
      const wallet = state.wallets.find(w => w.id === tx.walletId) || {};
      const hexColor = wallet.hex || '#94a3b8'; // slate-400
      
      return `
        <div class="bg-white border border-slate-100 p-4 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md hover:border-slate-200 transition group">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold" style="background-color: ${hexColor}15; color: ${hexColor};">
              ${isIncome ? '↓' : '↑'}
            </div>
            <div>
              <p class="font-extrabold text-slate-800 text-sm group-hover:text-indigo-600 transition">${tx.desc}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">${wallet.name || '-'}</span>
                <span class="text-[10px] font-semibold text-slate-400">${tx.date}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <span class="font-extrabold text-sm ${isIncome ? 'text-emerald-500' : 'text-rose-500'}">
              ${isIncome ? '+' : '-'} ${utils.formatRupiah(tx.amount)}
            </span>
            <button onclick="app.deleteTransaction(${tx.realIndex})" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 border border-transparent hover:border-rose-100 text-slate-400 hover:text-rose-500 flex items-center justify-center transition" title="Hapus">
              ✕
            </button>
          </div>
        </div>
      `;
    }).join('');

    if(listEl) listEl.innerHTML = txHTML(filteredTxs);
    if(recentListEl) recentListEl.innerHTML = txHTML(filteredTxs.slice(0, 3)); // Ambil 3 teratas
  }
};
