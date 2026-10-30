const state = {
  defaultBanks: [
    { id: 'bca', name: 'Bank BCA', balance: 3500000, color: 'bg-blue-600', hex: '#0284c7' },
    { id: 'mandiri', name: 'Bank Mandiri', balance: 2500000, color: 'bg-amber-600', hex: '#d97706' }
  ],
  defaultWallets: [
    { id: 'makan', name: 'Makanan & Kuliner', budget: 2000000, maxLimit: 600000, monthlyLimit: 2000000, color: 'bg-emerald-500', hex: '#10b981' },
    { id: 'bensin', name: 'Bensin & Transport', budget: 1500000, maxLimit: 400000, monthlyLimit: 1500000, color: 'bg-blue-500', hex: '#0284c7' },
    { id: 'darurat', name: 'Tabungan & Cadangan', budget: 2500000, maxLimit: 0, monthlyLimit: 0, color: 'bg-purple-500', hex: '#8b5cf6' }
  ],
  defaultCategories: [
    'Makanan',
    'Bensin',
    'Belanja',
    'Tagihan',
    'Transportasi',
    'Hiburan',
    'Kesehatan',
    'Gaji',
    'Lainnya'
  ],
  colors: [
    { color: 'bg-blue-600', hex: '#0284c7' },
    { color: 'bg-emerald-600', hex: '#059669' },
    { color: 'bg-amber-600', hex: '#d97706' },
    { color: 'bg-purple-600', hex: '#7c3aed' },
    { color: 'bg-rose-600', hex: '#e11d48' },
    { color: 'bg-cyan-600', hex: '#0891b2' },
    { color: 'bg-slate-600', hex: '#475569' }
  ],
  banks: [],
  wallets: [],
  categories: [],
  transactions: [],
  notifications: [],
  currentTxType: 'out',
  filterMonth: new Date().getMonth(),
  filterYear: new Date().getFullYear(),

  init() {
    this.wallets = JSON.parse(localStorage.getItem('my_wallets')) || this.defaultWallets;
    this.wallets = this.wallets.map(w => ({
      ...w,
      budget: Number(w.budget || 0),
      maxLimit: w.maxLimit !== undefined && w.maxLimit !== null ? Number(w.maxLimit) : 0,
      monthlyLimit: w.monthlyLimit !== undefined && w.monthlyLimit !== null ? Number(w.monthlyLimit) : 0,
      hex: w.hex || this.colors.find(c => c.color === w.color)?.hex || '#0284c7'
    }));

    let storedBanks = JSON.parse(localStorage.getItem('my_banks'));
    if (!storedBanks || storedBanks.length === 0) {
      const totalWallets = this.wallets.reduce((s, w) => s + Number(w.budget || 0), 0);
      if (totalWallets > 0) {
        const bcaShare = Math.round(totalWallets * 0.6);
        const mandiriShare = totalWallets - bcaShare;
        this.banks = [
          { id: 'bca', name: 'Bank BCA', balance: bcaShare, color: 'bg-blue-600', hex: '#0284c7' },
          { id: 'mandiri', name: 'Bank Mandiri', balance: mandiriShare, color: 'bg-amber-600', hex: '#d97706' }
        ];
      } else {
        this.banks = this.defaultBanks;
      }
    } else {
      this.banks = storedBanks.map(b => ({
        ...b,
        balance: Number(b.balance || 0),
        hex: b.hex || '#0284c7'
      }));
    }

    this.categories = JSON.parse(localStorage.getItem('my_categories')) || this.defaultCategories;
    this.transactions = JSON.parse(localStorage.getItem('my_tx')) || [];

    const defaultBankId = this.banks[0]?.id || 'bca';
    this.transactions = this.transactions.map(tx => ({
      ...tx,
      bankId: tx.bankId || defaultBankId
    }));
  },

  saveData() {
    localStorage.setItem('my_banks', JSON.stringify(this.banks));
    localStorage.setItem('my_wallets', JSON.stringify(this.wallets));
    localStorage.setItem('my_categories', JSON.stringify(this.categories));
    localStorage.setItem('my_tx', JSON.stringify(this.transactions));
  }
};

state.init();
