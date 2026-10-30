const app = {
  init() {
    ui.init();
    ui.initFilters();
    if (typeof snow !== 'undefined') {
      snow.init();
    }
    this.renderAll();
  },

  renderAll() {
    ui.renderMain();
    analytics.renderCharts();
  },

  onFilterChange() {
    state.filterMonth = Number(document.getElementById('filter-month').value);
    state.filterYear = Number(document.getElementById('filter-year').value);
    this.renderAll();
  },

  addTransaction(e) {
    e.preventDefault();
    const amountVal = document.getElementById('tx-amount').value;
    const amount = utils.parseNumber(amountVal);
    if (isNaN(amount) || amount <= 0) {
      alert('Masukkan nominal transaksi yang valid.');
      return;
    }

    const descInput = document.getElementById('tx-desc');
    const descVal = descInput ? descInput.value.trim() : '';
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    const fullDate = now.toISOString();

    if (state.currentTxType === 'out') {
      const walletId = document.getElementById('tx-wallet')?.value;
      const bankId = document.getElementById('tx-bank-out')?.value;

      if (!walletId) {
        alert('Silakan pilih dompet / pos anggaran terlebih dahulu.');
        return;
      }
      if (!bankId) {
        alert('Silakan pilih bank sumber dana terlebih dahulu.');
        return;
      }

      // Validasi saldo bank saat ini
      const bankStats = ui.getBankStats();
      const currentBankBal = bankStats[bankId] ? bankStats[bankId].current : 0;
      const bankObj = state.banks.find(b => b.id === bankId);
      const bankName = bankObj ? bankObj.name : 'Bank';

      if (amount > currentBankBal) {
        if (!confirm(`Peringatan: Saldo ${bankName} saat ini (${utils.formatRupiah(currentBankBal)}) tidak mencukupi untuk pengeluaran ${utils.formatRupiah(amount)}.\n\nTetap lanjutkan transaksi?`)) {
          return;
        }
      }

      const catSelect = document.getElementById('tx-category-select');
      const categoryVal = catSelect ? catSelect.value : '';
      const finalCategory = categoryVal || descVal || 'Lainnya';
      const finalDesc = descVal || categoryVal || 'Pengeluaran';

      const newTx = {
        walletId,
        bankId,
        amount,
        category: finalCategory,
        desc: finalDesc,
        type: 'out',
        date: dateFormatted,
        fullDate
      };

      state.transactions.push(newTx);
    } else {
      // Pemasukan
      const bankId = document.getElementById('tx-bank-in')?.value;
      if (!bankId) {
        alert('Silakan pilih rekening bank penerima pemasukan.');
        return;
      }

      const allocations = ui.getIncomeAllocations();
      if (!allocations || allocations.length === 0) {
        alert('Silakan tentukan minimal 1 dompet untuk pembagian pemasukan ini.');
        return;
      }

      const totalAllocated = allocations.reduce((sum, item) => sum + item.amount, 0);
      if (totalAllocated !== amount) {
        alert(`Total alokasi pembagian ke dompet (${utils.formatRupiah(totalAllocated)}) harus sama persis dengan total nominal pemasukan (${utils.formatRupiah(amount)}).\n\nSisa selisih: ${utils.formatRupiah(amount - totalAllocated)}`);
        return;
      }

      const finalDesc = descVal || 'Pemasukan';

      allocations.forEach(alloc => {
        const allocTx = {
          walletId: alloc.walletId,
          bankId,
          amount: alloc.amount,
          category: alloc.walletName,
          desc: finalDesc + (allocations.length > 1 ? ` (${alloc.walletName})` : ''),
          type: 'in',
          date: dateFormatted,
          fullDate
        };
        state.transactions.push(allocTx);
      });
    }

    state.saveData();

    document.getElementById('tx-amount').value = '';
    if (descInput) descInput.value = '';
    const catSelect = document.getElementById('tx-category-select');
    if (catSelect) catSelect.value = '';

    this.renderAll();
    ui.switchTab('dashboard');
  },

  deleteTransaction(index) {
    if (confirm('Konfirmasi: Hapus transaksi ini dari pembukuan?')) {
      state.transactions.splice(index, 1);
      state.saveData();
      this.renderAll();
    }
  },

  addCategory(name) {
    name = (name || '').trim();
    if (!name) {
      alert('Nama kategori tidak boleh kosong.');
      return;
    }
    if (state.categories.some(c => c.toLowerCase() === name.toLowerCase())) {
      alert('Kategori tersebut sudah ada.');
      return;
    }
    state.categories.push(name);
    state.saveData();
    ui.renderCategories();
    const catInput = document.getElementById('new-category-name');
    if (catInput) catInput.value = '';
  },

  deleteCategory(catName) {
    if (state.categories.length <= 1) {
      alert('Minimal harus ada 1 kategori.');
      return;
    }
    if (confirm(`Hapus kategori "${catName}"?`)) {
      state.categories = state.categories.filter(c => c !== catName);
      state.saveData();
      ui.renderCategories();
    }
  },

  saveWallet(e) {
    e.preventDefault();
    const editId = document.getElementById('wallet-edit-id').value;
    const name = document.getElementById('wallet-name').value.trim();
    const budget = utils.parseNumber(document.getElementById('wallet-budget').value) || 0;
    
    const maxLimitVal = document.getElementById('wallet-max-limit').value.trim();
    const monthlyLimitVal = document.getElementById('wallet-monthly-limit').value.trim();
    const maxLimit = maxLimitVal !== '' ? Math.max(0, utils.parseNumber(maxLimitVal)) : 0;
    const monthlyLimit = monthlyLimitVal !== '' ? Math.max(0, utils.parseNumber(monthlyLimitVal)) : 0;

    if (!name) {
      alert('Nama akun/dompet tidak boleh kosong.');
      return;
    }

    // Validasi saldo dompet tidak boleh melebihi total kas bank
    const totalBankBalance = state.banks.reduce((sum, b) => sum + Number(b.balance || 0), 0);
    const otherWalletsTotal = state.wallets
      .filter(w => w.id !== editId)
      .reduce((sum, w) => sum + Number(w.budget || 0), 0);

    const maxAllowed = Math.max(0, totalBankBalance - otherWalletsTotal);
    if (budget > maxAllowed) {
      alert(`Alokasi saldo dompet melebihi total kas bank!\n\nTotal Saldo Bank: ${utils.formatRupiah(totalBankBalance)}\nTeralokasi ke dompet lain: ${utils.formatRupiah(otherWalletsTotal)}\nMaksimal yang dapat dialokasikan untuk dompet ini: ${utils.formatRupiah(maxAllowed)}`);
      return;
    }

    if (editId) {
      const wallet = state.wallets.find(w => w.id === editId);
      if (wallet) {
        wallet.name = name;
        wallet.budget = budget;
        wallet.maxLimit = maxLimit;
        wallet.monthlyLimit = monthlyLimit;
      }
    } else {
      const selectedColorObj = state.colors[state.wallets.length % state.colors.length];
      const newWallet = {
        id: 'w_' + Date.now(),
        name,
        budget,
        maxLimit,
        monthlyLimit,
        color: selectedColorObj.color,
        hex: selectedColorObj.hex
      };
      state.wallets.push(newWallet);
    }

    state.saveData();
    ui.resetWalletForm();
    ui.toggleModalWallet(false);
    this.renderAll();
  },

  editWallet(id) {
    const wallet = state.wallets.find(w => w.id === id);
    if (wallet) {
      document.getElementById('wallet-edit-id').value = wallet.id;
      document.getElementById('wallet-name').value = wallet.name;
      document.getElementById('wallet-budget').value = wallet.budget > 0 ? utils.formatNumber(wallet.budget) : (wallet.budget === 0 ? '0' : '');
      document.getElementById('wallet-max-limit').value = wallet.maxLimit > 0 ? utils.formatNumber(wallet.maxLimit) : '';
      document.getElementById('wallet-monthly-limit').value = wallet.monthlyLimit > 0 ? utils.formatNumber(wallet.monthlyLimit) : '';
      
      const modal = document.getElementById('modal-wallet');
      modal.classList.remove('hidden');
      modal.classList.add('flex');

      ui.setWalletEditMode(wallet);
    }
  },

  deleteWallet(id) {
    if (state.wallets.length <= 1) {
      alert('Minimal harus tersedia 1 akun/dompet aktif dalam sistem.');
      return;
    }
    if (confirm('Konfirmasi: Hapus akun dompet ini? Transaksi terkait akan tetap tersimpan.')) {
      const editId = document.getElementById('wallet-edit-id')?.value;
      state.wallets = state.wallets.filter(w => w.id !== id);
      if (editId === id) {
        ui.resetWalletForm();
      }
      state.saveData();
      this.renderAll();
    }
  },

  saveBank(e) {
    e.preventDefault();
    const editId = document.getElementById('bank-edit-id')?.value;
    const name = document.getElementById('bank-name')?.value.trim();
    const balance = utils.parseNumber(document.getElementById('bank-balance')?.value) || 0;

    if (!name) {
      alert('Nama rekening bank tidak boleh kosong.');
      return;
    }

    if (editId) {
      const bank = state.banks.find(b => b.id === editId);
      if (bank) {
        bank.name = name;
        bank.balance = balance;
      }
    } else {
      const selectedColorObj = state.colors[state.banks.length % state.colors.length];
      const newBank = {
        id: 'b_' + Date.now(),
        name,
        balance,
        color: selectedColorObj.color,
        hex: selectedColorObj.hex
      };
      state.banks.push(newBank);
    }

    state.saveData();
    ui.resetBankForm();
    ui.toggleModalBank(false);
    this.renderAll();
  },

  editBank(id) {
    const bank = state.banks.find(b => b.id === id);
    if (bank) {
      ui.setBankEditMode(bank);
      ui.toggleModalBank(true);
    }
  },

  deleteBank(id) {
    if (state.banks.length <= 1) {
      alert('Minimal harus tersedia 1 rekening bank aktif dalam sistem.');
      return;
    }
    if (confirm('Konfirmasi: Hapus rekening bank ini? Transaksi dan transfer terkait bank ini akan ikut disesuaikan.')) {
      state.banks = state.banks.filter(b => b.id !== id);
      state.transactions = state.transactions.filter(tx => tx.bankId !== id && tx.fromBankId !== id && tx.toBankId !== id);
      state.saveData();
      ui.resetBankForm();
      this.renderAll();
    }
  },

  transferBetweenBanks(e) {
    e.preventDefault();
    const fromId = document.getElementById('transfer-from-bank')?.value;
    const toId = document.getElementById('transfer-to-bank')?.value;
    const amountVal = document.getElementById('transfer-amount')?.value;
    const note = document.getElementById('transfer-note')?.value.trim() || 'Transfer Antar Bank';

    if (!fromId || !toId) {
      alert('Pilih bank pengirim dan bank penerima.');
      return;
    }
    if (fromId === toId) {
      alert('Bank pengirim dan bank penerima tidak boleh sama.');
      return;
    }

    const amount = utils.parseNumber(amountVal);
    if (isNaN(amount) || amount <= 0) {
      alert('Masukkan nominal transfer yang valid.');
      return;
    }

    const bankStats = ui.getBankStats();
    const currentFromBal = bankStats[fromId] ? bankStats[fromId].current : 0;
    const fromBankObj = state.banks.find(b => b.id === fromId);
    const toBankObj = state.banks.find(b => b.id === toId);

    if (amount > currentFromBal) {
      alert(`Saldo ${fromBankObj?.name || 'Bank'} (${utils.formatRupiah(currentFromBal)}) tidak mencukupi untuk transfer sebesar ${utils.formatRupiah(amount)}.`);
      return;
    }

    const now = new Date();
    const transferTx = {
      type: 'transfer',
      fromBankId: fromId,
      toBankId: toId,
      amount,
      desc: `${note} (${fromBankObj?.name} ➔ ${toBankObj?.name})`,
      category: 'Transfer Bank',
      date: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      fullDate: now.toISOString()
    };

    state.transactions.push(transferTx);
    state.saveData();

    ui.toggleModalBankTransfer(false);
    document.getElementById('transfer-amount').value = '';
    if (document.getElementById('transfer-note')) document.getElementById('transfer-note').value = '';

    this.renderAll();
    alert(`Sukses transfer ${utils.formatRupiah(amount)} dari ${fromBankObj?.name} ke ${toBankObj?.name}.`);
  },

  exportData() {
    const backupData = {
      banks: state.banks,
      wallets: state.wallets,
      categories: state.categories,
      transactions: state.transactions,
      exportDate: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `dompetku_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.wallets && Array.isArray(parsed.wallets) && parsed.transactions && Array.isArray(parsed.transactions)) {
          if (parsed.banks && Array.isArray(parsed.banks)) {
            state.banks = parsed.banks;
          }
          state.wallets = parsed.wallets;
          if (parsed.categories && Array.isArray(parsed.categories)) {
            state.categories = parsed.categories;
          }
          state.transactions = parsed.transactions;
          state.saveData();
          app.renderAll();
          alert('Data pembukuan berhasil dipulihkan.');
        } else {
          alert('Format file cadangan tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
