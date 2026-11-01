const app = {
  webhookToken: '',
  webhookUrl: '',
  isCheckingQueue: false,
  webhookPollTimer: null,

  init() {
    ui.init();
    ui.initFilters();
    if (typeof snow !== 'undefined') {
      snow.init();
    }
    this.renderAll();
    this.initWebhook();
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
  },

  // --- Otomasi Webhook & Sinkronisasi Notifikasi Bank ---
  initWebhook() {
    this.loadWebhookInfo();
    this.checkWebhookQueue();

    // Polling antrean setiap 5 detik
    if (this.webhookPollTimer) clearInterval(this.webhookPollTimer);
    this.webhookPollTimer = setInterval(() => {
      this.checkWebhookQueue();
    }, 5000);

    // Cek antrean saat window kembali fokus/aktif
    window.addEventListener('focus', () => {
      this.checkWebhookQueue();
    });
  },

  loadWebhookInfo() {
    fetch('api/sync.php?action=get_info')
      .then(res => res.json())
      .then(data => {
        if (data && data.status === 'success') {
          this.webhookToken = data.token;

          // Buat URL yang dapat diakses oleh HP (jika dibuka via IP atau localhost)
          let targetHost = window.location.host;
          let protocol = window.location.protocol;
          let pathname = window.location.pathname.replace(/\/index\.html.*$/, '').replace(/\/+$/, '');
          let directUrl = `${protocol}//${targetHost}${pathname}/api/webhook.php?token=${data.token}`;

          this.webhookUrl = directUrl;

          const urlInput = document.getElementById('webhook-url-display');
          if (urlInput) urlInput.value = directUrl;

          const tokenInput = document.getElementById('webhook-token-display');
          if (tokenInput) tokenInput.value = data.token;
        }
      })
      .catch(err => {
        console.warn('Gagal memuat info webhook:', err);
      });
  },

  regenerateWebhookToken() {
    if (!confirm('Peringatan: Membuat token baru akan menonaktifkan URL webhook lama di HP Anda.\n\nAnda harus memperbarui URL webhook di MacroDroid pada HP Anda. Lanjutkan?')) {
      return;
    }

    fetch('api/sync.php?action=update_token', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data && data.status === 'success') {
          if (typeof ui !== 'undefined' && ui.showToast) {
            ui.showToast('✅ Token API berhasil diacak ulang!', 'success');
          }
          this.loadWebhookInfo();
        }
      })
      .catch(err => alert('Gagal memperbarui token: ' + err.message));
  },

  checkWebhookQueue() {
    if (this.isCheckingQueue) return;
    this.isCheckingQueue = true;

    fetch('api/sync.php?action=get_queue')
      .then(res => res.json())
      .then(res => {
        if (res && res.status === 'success' && Array.isArray(res.items) && res.items.length > 0) {
          let hasChanges = false;

          res.items.forEach(item => {
            if (!item.amount || item.amount <= 0) return;

            // 1. Cocokkan rekening Bank
            let matchedBank = null;
            if (item.bankId) {
              matchedBank = state.banks.find(b => b.id.toLowerCase() === item.bankId.toLowerCase());
            }
            if (!matchedBank && item.bankName) {
              matchedBank = state.banks.find(b => 
                b.name.toLowerCase().includes(item.bankId?.toLowerCase() || '') || 
                item.bankName.toLowerCase().includes(b.name.toLowerCase())
              );
            }
            if (!matchedBank && state.banks.length > 0) {
              matchedBank = state.banks[0];
            }

            // 2. Cocokkan dompet / pos anggaran
            let matchedWallet = null;
            if (item.category) {
              matchedWallet = state.wallets.find(w => {
                const wName = w.name.toLowerCase();
                const cat = item.category.toLowerCase();
                return wName.includes(cat) || cat.includes(wName);
              });
            }
            if (!matchedWallet && item.desc) {
              matchedWallet = state.wallets.find(w => {
                const wName = w.name.toLowerCase();
                const d = item.desc.toLowerCase();
                return d.includes(wName);
              });
            }
            if (!matchedWallet && state.wallets.length > 0) {
              if (item.type === 'in') {
                // Untuk pemasukan, utamakan pos tabungan/utama
                matchedWallet = state.wallets.find(w => /tabung|utama|kas/i.test(w.name)) || state.wallets[0];
              } else {
                matchedWallet = state.wallets[0];
              }
            }

            const now = new Date();
            const dateFormatted = item.date || now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            const fullDate = item.fullDate || now.toISOString();

            const newTx = {
              walletId: matchedWallet ? matchedWallet.id : '',
              bankId: matchedBank ? matchedBank.id : (state.banks[0]?.id || ''),
              amount: Number(item.amount),
              category: item.category || (matchedWallet ? matchedWallet.name : 'Lainnya'),
              desc: item.desc || (item.type === 'in' ? 'Pemasukan Otomatis' : 'Pengeluaran Otomatis'),
              type: item.type === 'in' ? 'in' : 'out',
              date: dateFormatted,
              fullDate: fullDate,
              source: 'webhook_auto'
            };

            state.transactions.push(newTx);
            hasChanges = true;

            const symbol = item.type === 'in' ? '+' : '-';
            const toastMsg = `
              <div>
                <div class="font-bold text-white flex items-center gap-1.5">
                  <span>⚡ Transaksi Otomatis (${matchedBank?.name || item.bankName || 'Bank'})</span>
                </div>
                <div class="mt-0.5 text-slate-200">
                  ${newTx.desc} &bull; <strong class="${item.type === 'in' ? 'text-emerald-300' : 'text-rose-300'} font-mono">${symbol}${utils.formatRupiah(newTx.amount)}</strong>
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5">Dialokasikan ke dompet: <em>${matchedWallet?.name || 'Utama'}</em></div>
              </div>
            `;
            if (typeof ui !== 'undefined' && ui.showToast) {
              ui.showToast(toastMsg, item.type === 'in' ? 'success' : 'info');
            }
          });

          if (hasChanges) {
            state.saveData();
            this.renderAll();

            // Acknowledge untuk membersihkan queue di server
            fetch('api/sync.php?action=ack', { method: 'POST' }).catch(() => {});
          }
        }
      })
      .catch(err => {
        // Polling background silent catch
      })
      .finally(() => {
        this.isCheckingQueue = false;
      });
  },

  runSimulation() {
    const textarea = document.getElementById('sim-notif-text');
    const resultBox = document.getElementById('sim-result-box');
    if (!textarea || !textarea.value.trim()) {
      alert('Masukkan teks notifikasi yang ingin disimulasikan terlebih dahulu.');
      return;
    }

    const text = textarea.value.trim();
    if (resultBox) {
      resultBox.classList.remove('hidden');
      resultBox.innerHTML = '<span class="text-slate-500 animate-pulse">Memproses parsing notifikasi m-banking...</span>';
    }

    fetch('api/sync.php?action=test_simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, save: 1 })
    })
    .then(res => res.json())
    .then(res => {
      if (res.status === 'success' && res.data) {
        const d = res.data;
        if (resultBox) {
          resultBox.innerHTML = `
            <div class="text-emerald-700 font-bold flex items-center gap-1.5">
              <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>Berhasil Diparse & Dimasukkan Antrean!</span>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px] text-slate-700">
              <div>Bank: <strong class="text-slate-900">${d.bankName}</strong></div>
              <div>Tipe: <strong class="${d.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}">${d.type === 'in' ? 'Pemasukan' : 'Pengeluaran'}</strong></div>
              <div>Nominal: <strong class="text-slate-900">${utils.formatRupiah(d.amount)}</strong></div>
              <div>Kategori: <strong class="text-slate-900">${d.category}</strong></div>
              <div class="col-span-2">Keterangan: <strong class="text-slate-900">${d.desc}</strong></div>
            </div>
          `;
        }
        // Langsung sinkronkan antrean ke state dan tampilan
        this.checkWebhookQueue();
      } else {
        if (resultBox) {
          resultBox.innerHTML = `<span class="text-rose-600 font-bold">Gagal memproses simulasi: ${res.message || 'Terjadi kesalahan'}</span>`;
        }
      }
    })
    .catch(err => {
      console.error('Simulation error:', err);
      if (resultBox) {
        resultBox.innerHTML = `<span class="text-rose-600 font-bold">Gagal menghubungi server API. Pastikan Apache/PHP berjalan.</span>`;
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
