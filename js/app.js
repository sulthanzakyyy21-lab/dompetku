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
    this.handleUrlNotification();
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

  // --- Otomasi Notifikasi & Sinkronisasi (Mendukung PHP Webhook & Static GitHub Pages) ---
  handleUrlNotification() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const notifText = urlParams.get('notif') || urlParams.get('text');
      if (!notifText) return;

      const parsed = this.parseBankNotification(decodeURIComponent(notifText));
      if (parsed && parsed.amount > 0) {
        this.processTransactionRecord(parsed);

        // Bersihkan parameter query dari URL address bar agar rapi
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (err) {
      console.warn('Error processing URL notification:', err);
    }
  },

  pasteAndRecordNotification() {
    const processText = (text) => {
      text = (text || '').trim();
      if (!text) {
        alert('Teks dari clipboard kosong. Salin teks notifikasi email Gmail terlebih dahulu.');
        return;
      }
      const parsed = this.parseBankNotification(text);
      if (parsed && parsed.amount > 0) {
        this.processTransactionRecord(parsed);
      } else {
        alert('Tidak ditemukan nominal transaksi pada teks yang ditempel:\n\n"' + text.slice(0, 80) + '..."\n\nPastikan menyalin pesan yang berisi nominal Rp.');
      }
    };

    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText()
        .then(text => processText(text))
        .catch(() => {
          const manual = prompt('Tempel (Paste) teks notifikasi Gmail atau m-banking di sini:');
          if (manual) processText(manual);
        });
    } else {
      const manual = prompt('Tempel (Paste) teks notifikasi Gmail atau m-banking di sini:');
      if (manual) processText(manual);
    }
  },

  parseBankNotification(rawText, rawTitle = '') {
    const fullContent = (rawTitle + " " + rawText).trim();
    const lower = fullContent.toLowerCase();

    // 1. Deteksi Bank
    let bankId = 'bca';
    let bankName = 'Bank BCA';
    if (lower.includes('mandiri') || lower.includes('livin')) {
      bankId = 'mandiri';
      bankName = 'Bank Mandiri';
    } else if (lower.includes('bca') || lower.includes('mybca')) {
      bankId = 'bca';
      bankName = 'Bank BCA';
    } else if (lower.includes('bri') || lower.includes('brimo')) {
      bankId = 'bri';
      bankName = 'Bank BRI';
    } else if (lower.includes('bni') || lower.includes('wondr')) {
      bankId = 'bni';
      bankName = 'Bank BNI';
    }

    // 2. Tipe Transaksi
    let type = 'out';
    const incomeKeywords = ['dana masuk', 'transfer masuk', 'menerima transfer', 'uang masuk', 'kredit', 'top up masuk', 'berhasil menerima', 'rekening anda dikredit'];
    if (incomeKeywords.some(k => lower.includes(k)) || /\bc:\s*[\d\.,]+/i.test(fullContent)) {
      type = 'in';
    }

    // 3. Ekstraksi Nominal
    let amount = 0;
    const amountPatterns = [
      /(?:rp\.?|idr)\s*([\d\.,]+)/i,
      /(?:sebesar|sejumlah|nominal)\s*(?:rp\.?|idr)?\s*([\d\.,]+)/i,
      /\b[dc]:\s*([\d\.,]+)/i,
      /\b([\d]{1,3}(?:\.[\d]{3})+(?:,[\d]{2})?)\b/
    ];

    for (const pat of amountPatterns) {
      const m = fullContent.match(pat);
      if (m && m[1]) {
        let rawAmount = m[1].trim().replace(/[.,;: ]+$/, '');
        rawAmount = rawAmount.replace(/[,\.]00$/, '');
        const clean = rawAmount.replace(/[^\d]/g, '');
        const num = parseInt(clean, 10);
        if (num > 0) {
          amount = num;
          break;
        }
      }
    }

    // 4. Merchant / Keterangan
    let desc = '';
    const descMatch = fullContent.match(/(?:di|ke|merchant|kepada|tujuan|dari)\s+([a-zA-Z0-9\s\.\-_&]+?)(?:(?=sebesar|pada|tgl|tanggal|rp|idr|saldo|berhasil|\n|\r|$))/i);
    if (descMatch && descMatch[1] && descMatch[1].trim().length > 2 && descMatch[1].trim().length < 50) {
      desc = descMatch[1].trim();
    }
    if (!desc) {
      const beritaMatch = fullContent.match(/(?:berita|keterangan|catatan|ket|pesan):\s*([^\n\r,\.]+)/i);
      if (beritaMatch && beritaMatch[1]) {
        desc = beritaMatch[1].trim();
      }
    }
    if (!desc) {
      desc = type === 'in' ? `Dana Masuk ${bankName}` : `${lower.includes('qris') ? 'Pembayaran QRIS' : 'Pengeluaran'} ${bankName}`;
    }

    // 5. Smart Pos Kategori
    let category = 'Lainnya';
    const catSearch = (desc + " " + fullContent).toLowerCase();
    if (/(makan|resto|kopi|cafe|coffee|warung|kuliner|bakso|nasi|mie|food|kitchen|dapur|burger|pizza|martabak)/i.test(catSearch)) {
      category = 'Makanan';
    } else if (/(spbu|pertamina|shell|bensin|bbm|parkir|toll|tol|gojek|grab|maxim|ojol|transport)/i.test(catSearch)) {
      category = 'Bensin';
    } else if (/(indomaret|alfamart|superindo|hypermart|transmart|toko|belanja|shopee|tokopedia|lazada|tiktok)/i.test(catSearch)) {
      category = 'Belanja';
    } else if (/(gaji|payroll|bonus|tunjangan|honor|fee)/i.test(catSearch)) {
      category = 'Gaji';
    } else if (/(apotek|kimia farma|k24|dokter|klinik|rumah sakit|rs|obat|sehat)/i.test(catSearch)) {
      category = 'Kesehatan';
    } else if (/(bioskop|cinema|xxi|game|steam|playstation|netflix|spotify|hiburan)/i.test(catSearch)) {
      category = 'Hiburan';
    }

    const now = new Date();
    return {
      id: 'tx_auto_' + Date.now(),
      bankId,
      bankName,
      type,
      amount,
      desc,
      category,
      date: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      fullDate: now.toISOString(),
      rawText: fullContent,
      source: 'auto_sync'
    };
  },

  processTransactionRecord(item) {
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
    if (!matchedBank) {
      // Jika bank (seperti BRI/BNI) belum ada di daftar, tambahkan otomatis
      if (item.bankId && item.bankName) {
        matchedBank = {
          id: item.bankId.toLowerCase(),
          name: item.bankName,
          balance: 0,
          color: 'bg-blue-600',
          hex: '#0284c7'
        };
        state.banks.push(matchedBank);
      } else if (state.banks.length > 0) {
        matchedBank = state.banks[0];
      }
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
      source: 'auto_sync'
    };

    state.transactions.push(newTx);
    state.saveData();
    this.renderAll();

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
  },

  initWebhook() {
    this.loadWebhookInfo();
    this.checkWebhookQueue();

    if (this.webhookPollTimer) clearInterval(this.webhookPollTimer);
    this.webhookPollTimer = setInterval(() => {
      this.checkWebhookQueue();
    }, 5000);

    window.addEventListener('focus', () => {
      this.checkWebhookQueue();
    });
  },

  loadWebhookInfo() {
    fetch('api/sync.php?action=get_info')
      .then(res => {
        if (!res.ok) throw new Error('Static host or PHP not available');
        return res.json();
      })
      .then(data => {
        if (data && data.status === 'success') {
          this.webhookToken = data.token;
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
      .catch(() => {
        // Fallback untuk GitHub Pages / Static Hosting (menggunakan URL Query auto-record)
        let directUrl = `${window.location.origin}${window.location.pathname}?notif={notification}`;
        this.webhookUrl = directUrl;

        const urlInput = document.getElementById('webhook-url-display');
        if (urlInput) urlInput.value = directUrl;

        const tokenInput = document.getElementById('webhook-token-display');
        if (tokenInput) tokenInput.value = 'Mode Otomatis (GitHub Pages)';
      });
  },

  regenerateWebhookToken() {
    if (!confirm('Peringatan: Membuat token baru akan menonaktifkan URL webhook lama di HP Anda.\n\nLanjutkan?')) {
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
      .then(res => {
        if (!res.ok) throw new Error('No queue backend');
        return res.json();
      })
      .then(res => {
        if (res && res.status === 'success' && Array.isArray(res.items) && res.items.length > 0) {
          res.items.forEach(item => {
            this.processTransactionRecord(item);
          });
          fetch('api/sync.php?action=ack', { method: 'POST' }).catch(() => {});
        }
      })
      .catch(() => {
        // Silent catch saat berada di GitHub Pages (static)
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

    // Coba via server PHP, jika gagal fallback langsung via client JavaScript
    fetch('api/sync.php?action=test_simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, save: 1 })
    })
    .then(res => {
      if (!res.ok) throw new Error('Backend not available');
      return res.json();
    })
    .then(res => {
      if (res.status === 'success' && res.data) {
        this.showSimulationResult(res.data, resultBox);
        this.checkWebhookQueue();
      } else {
        throw new Error(res.message || 'Error parsing');
      }
    })
    .catch(() => {
      // Fallback pemrosesan instan client-side untuk GitHub Pages
      const parsed = this.parseBankNotification(text);
      if (parsed && parsed.amount > 0) {
        this.showSimulationResult(parsed, resultBox);
        this.processTransactionRecord(parsed);
      } else {
        if (resultBox) {
          resultBox.innerHTML = `<span class="text-rose-600 font-bold">Gagal mendeteksi nominal transaksi dari teks notifikasi.</span>`;
        }
      }
    });
  },

  showSimulationResult(d, resultBox) {
    if (!resultBox) return;
    resultBox.innerHTML = `
      <div class="text-emerald-700 font-bold flex items-center gap-1.5">
        <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <span>Berhasil Diparse & Dicatat Otomatis!</span>
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
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
