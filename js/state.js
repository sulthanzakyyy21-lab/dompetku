const state = {
  defaultWallets: [
    { id: 'holiday', name: 'Holiday', budget: 2900000, maxLimit: 750000, monthlyLimit: 2500000, color: 'bg-emerald-500', hex: '#10b981' },
    { id: 'personal', name: 'Keperluan Sendiri', budget: 1600000, maxLimit: 400000, monthlyLimit: 1500000, color: 'bg-blue-500', hex: '#3b82f6' },
    { id: 'emergency', name: 'Dana Darurat', budget: 1500000, maxLimit: 200000, monthlyLimit: 800000, color: 'bg-amber-500', hex: '#f59e0b' }
  ],
  colors: [
    { color: 'bg-emerald-500', hex: '#10b981' },
    { color: 'bg-blue-500', hex: '#3b82f6' },
    { color: 'bg-amber-500', hex: '#f59e0b' },
    { color: 'bg-purple-500', hex: '#a855f7' },
    { color: 'bg-rose-500', hex: '#f43f5e' },
    { color: 'bg-cyan-500', hex: '#06b6d4' }
  ],
  wallets: [],
  transactions: [],
  currentTxType: 'out',
  filterMonth: new Date().getMonth(),
  filterYear: new Date().getFullYear(),

  init() {
    this.wallets = JSON.parse(localStorage.getItem('my_wallets')) || this.defaultWallets;
    
    // Pastikan properti limit bulanan & hex color ada
    this.wallets = this.wallets.map(w => ({
      ...w,
      maxLimit: w.maxLimit || 500000,
      monthlyLimit: w.monthlyLimit || 2000000,
      hex: w.hex || this.colors.find(c => c.color === w.color)?.hex || '#6366f1'
    }));
    
    this.transactions = JSON.parse(localStorage.getItem('my_tx')) || [];
  },

  saveData() {
    localStorage.setItem('my_wallets', JSON.stringify(this.wallets));
    localStorage.setItem('my_tx', JSON.stringify(this.transactions));
  }
};

// Inisialisasi state saat diload
state.init();
