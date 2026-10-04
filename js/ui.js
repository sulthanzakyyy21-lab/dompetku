const ui = {
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
      btnOut.className = "py-2 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-sm";
      btnIn.className = "py-2 text-xs font-bold rounded-lg text-slate-500";
      btnSubmit.className = "w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-indigo-100";
      btnSubmit.innerText = "Simpan Pengeluaran";
    } else {
      btnIn.className = "py-2 text-xs font-bold rounded-lg bg-white text-emerald-600 shadow-sm";
      btnOut.className = "py-2 text-xs font-bold rounded-lg text-slate-500";
      btnSubmit.className = "w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-emerald-100";
      btnSubmit.innerText = "Tambah Uang (Pemasukan)";
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
      <div class="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
        <div>
          <p class="font-bold text-xs text-slate-700">${w.name}</p>
          <p class="text-[10px] text-slate-400">Limit: Mgg (${utils.formatRupiah(w.maxLimit)}) | Bln (${utils.formatRupiah(w.monthlyLimit || 0)})</p>
        </div>
        <div class="flex gap-2">
          <button type="button" onclick="app.editWallet('${w.id}')" class="text-xs text-indigo-600 font-semibold hover:underline">Edit</button>
          <button type="button" onclick="app.deleteWallet('${w.id}')" class="text-xs text-red-500 font-semibold hover:underline">Hapus</button>
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

          // Peringatan menggunakan waktu asli (current week/month), BUKAN berdasar filter
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
    const sumNetEl = document.getElementById('summary-net');
    sumNetEl.className = `text-xs font-bold ${sumIncome - sumExpense >= 0 ? 'text-indigo-600' : 'text-rose-600'}`;

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
          <div class="p-3 rounded-2xl border ${isOver ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'} flex items-start gap-3 shadow-sm">
            <span class="text-base">${isOver ? '🚨' : '⚠️'}</span>
            <div class="text-xs">
              <span class="font-bold block mb-0.5">${isOver ? 'Limit Minggu Ini Terlewati!' : 'Peringatan Limit Mingguan!'}</span>
              Dompet <b class="underline">${w.name}</b> minggu ini mencapai <b>${percentWeekly}%</b> (${utils.formatRupiah(stats.weeklySpent)} / ${utils.formatRupiah(maxLimit)}).
            </div>
          </div>
        `;
      }

      // Warning Box (Bulanan)
      if (percentMonthly >= 80) {
        const isOverMonthly = percentMonthly >= 100;
        warningContainer.innerHTML += `
          <div class="p-3 rounded-2xl border ${isOverMonthly ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-orange-50 border-orange-200 text-orange-800'} flex items-start gap-3 shadow-sm">
            <span class="text-base">📅</span>
            <div class="text-xs">
              <span class="font-bold block mb-0.5">${isOverMonthly ? 'Limit Bulan Ini Jebol!' : 'Peringatan Limit Bulanan!'}</span>
              Dompet <b class="underline">${w.name}</b> bulan ini mencapai <b>${percentMonthly}%</b> (${utils.formatRupiah(stats.monthlySpent)} / ${utils.formatRupiah(monthlyLimit)}).
            </div>
          </div>
        `;
      }

      // Render Dompet List Item
      const colorClass = w.color || 'bg-indigo-500';
      const progressColor = percentMonthly >= 100 ? 'bg-rose-500' : percentMonthly >= 80 ? 'bg-amber-500' : colorClass.split(' ')[0];

      walletListEl.innerHTML += `
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-3">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full ${colorClass}"></span>
              <span class="font-bold text-slate-700 text-sm">${w.name}</span>
            </div>
            <span class="text-[10px] font-semibold bg-slate-100 px-2 py-1 rounded-lg text-slate-600">
              Bulan Ini: ${percentMonthly}%
            </span>
          </div>
          
          <div class="flex justify-between items-end">
            <div>
              <p class="text-[10px] text-slate-400 uppercase tracking-wide">Sisa Uang Dompet</p>
              <p class="text-base font-extrabold text-slate-800">${utils.formatRupiah(remaining)}</p>
            </div>
            <div class="text-right text-[10px] text-slate-500 space-y-0.5">
              <p>Keluar Mgg: <span class="font-bold text-slate-700">${utils.formatRupiah(stats.weeklySpent)}</span></p>
              <p>Keluar Bln: <span class="font-bold text-slate-700">${utils.formatRupiah(stats.monthlySpent)}</span></p>
            </div>
          </div>
          
          <div class="space-y-1">
            <div class="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>Progress Bulanan</span>
              <span>Limit: ${utils.formatRupiah(monthlyLimit)}</span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div class="${progressColor} h-1.5 rounded-full transition-all duration-300" style="width: ${Math.min(percentMonthly, 100)}%"></div>
            </div>
          </div>
        </div>
      `;
    });

    const selectEl = document.getElementById('tx-wallet');
    selectEl.innerHTML = state.wallets.map(w => `<option value="${w.id}">${w.name}</option>`).join('');

    this.renderTransactions();
    this.renderModalWalletList();
  },

  renderTransactions() {
    const listEl = document.getElementById('monthly-tx-list');
    
    // Ambil transaksi hanya pada bulan & tahun yang difilter
    const filteredTxs = state.transactions
      .map((tx, idx) => ({ ...tx, realIndex: idx }))
      .filter(tx => {
        const d = new Date(tx.fullDate);
        return d.getMonth() === state.filterMonth && d.getFullYear() === state.filterYear;
      })
      .reverse();

    if (filteredTxs.length === 0) {
      listEl.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs italic bg-white rounded-xl border border-slate-100">Belum ada transaksi di bulan ini.</div>`;
      return;
    }

    listEl.innerHTML = filteredTxs.map(tx => {
      const isIncome = tx.type === 'in';
      const wallet = state.wallets.find(w => w.id === tx.walletId) || {};
      return `
        <div class="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-2 h-8 rounded-full ${wallet.color || 'bg-slate-300'}"></div>
            <div>
              <p class="font-bold text-slate-700 text-xs">${tx.desc}</p>
              <p class="text-[10px] text-slate-400">${wallet.name || '-'} • ${tx.date}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-bold text-xs ${isIncome ? 'text-emerald-600' : 'text-red-500'}">
              ${isIncome ? '+' : '-'} ${utils.formatRupiah(tx.amount)}
            </span>
            <button onclick="app.deleteTransaction(${tx.realIndex})" class="text-slate-300 hover:text-red-500 text-xs font-bold p-1 transition-colors" title="Hapus">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }
};
