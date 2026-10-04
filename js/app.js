const app = {
  init() {
    ui.initFilters();
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
    const walletId = document.getElementById('tx-wallet').value;
    const amount = Number(document.getElementById('tx-amount').value);
    const desc = document.getElementById('tx-desc').value;

    if (!walletId) {
      alert('Buat dompet terlebih dahulu!');
      return;
    }

    const now = new Date();
    const newTx = {
      walletId,
      amount,
      desc,
      type: state.currentTxType,
      date: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      fullDate: now.toISOString()
    };

    state.transactions.push(newTx);
    state.saveData();

    document.getElementById('tx-amount').value = '';
    document.getElementById('tx-desc').value = '';

    this.renderAll();
  },

  deleteTransaction(index) {
    if (confirm('Hapus pencatatan transaksi ini?')) {
      state.transactions.splice(index, 1);
      state.saveData();
      this.renderAll();
    }
  },

  saveWallet(e) {
    e.preventDefault();
    const editId = document.getElementById('wallet-edit-id').value;
    const name = document.getElementById('wallet-name').value;
    const budget = Number(document.getElementById('wallet-budget').value);
    const maxLimit = Number(document.getElementById('wallet-max-limit').value);
    const monthlyLimit = Number(document.getElementById('wallet-monthly-limit').value);

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
    ui.toggleModalWallet(); // Tutup modal otomatis saat save
    this.renderAll();
  },

  editWallet(id) {
    const wallet = state.wallets.find(w => w.id === id);
    if (wallet) {
      document.getElementById('wallet-edit-id').value = wallet.id;
      document.getElementById('wallet-name').value = wallet.name;
      document.getElementById('wallet-budget').value = wallet.budget;
      document.getElementById('wallet-max-limit').value = wallet.maxLimit;
      document.getElementById('wallet-monthly-limit').value = wallet.monthlyLimit || 2000000;
    }
  },

  deleteWallet(id) {
    if (state.wallets.length <= 1) {
      alert('Setidaknya harus ada 1 dompet!');
      return;
    }
    if (confirm('Hapus dompet ini? Transaksi pada dompet ini akan kehilangan referensi nama dompet.')) {
      state.wallets = state.wallets.filter(w => w.id !== id);
      state.saveData();
      this.renderAll();
    }
  },

  exportData() {
    const backupData = { wallets: state.wallets, transactions: state.transactions };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_keuangan_${new Date().toISOString().slice(0,10)}.json`);
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
        if (parsed.wallets && parsed.transactions) {
          state.wallets = parsed.wallets;
          state.transactions = parsed.transactions;
          state.saveData();
          app.renderAll();
          alert('Data berhasil dipulihkan (Restore)!');
        } else {
          alert('Format file cadangan tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  }
};

// Initialize App ketika DOM selesai diload
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
