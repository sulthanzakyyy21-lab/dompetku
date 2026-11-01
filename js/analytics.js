const analytics = {
  trendChart: null,
  doughnutChart: null,

  renderCharts() {
    const filteredTxs = state.transactions.filter(tx => {
      const d = new Date(tx.fullDate);
      const isMonthMatch = state.filterMonth === 'all' || d.getMonth() === Number(state.filterMonth);
      const isYearMatch = state.filterYear === 'all' || d.getFullYear() === Number(state.filterYear);
      return isMonthMatch && isYearMatch;
    });

    this.renderTrendChart(filteredTxs);
    this.renderDoughnutChart(filteredTxs);
    this.renderCategoryAnalysis(filteredTxs);
  },

  renderTrendChart(filteredTxs) {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let labels = [];
    let incomeData = [];
    let expenseData = [];

    if (state.filterMonth === 'all') {
      labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      incomeData = new Array(12).fill(0);
      expenseData = new Array(12).fill(0);
      filteredTxs.forEach(tx => {
        const m = new Date(tx.fullDate).getMonth();
        if (m >= 0 && m < 12) {
          if (tx.type === 'in') incomeData[m] += Number(tx.amount || 0);
          else if (tx.type === 'out') expenseData[m] += Number(tx.amount || 0);
        }
      });
    } else {
      const year = state.filterYear === 'all' ? new Date().getFullYear() : Number(state.filterYear);
      const month = Number(state.filterMonth);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      labels = Array.from({length: daysInMonth}, (_, i) => `Tgl ${i + 1}`);
      incomeData = new Array(daysInMonth).fill(0);
      expenseData = new Array(daysInMonth).fill(0);

      filteredTxs.forEach(tx => {
        const day = new Date(tx.fullDate).getDate();
        if (day >= 1 && day <= daysInMonth) {
          if (tx.type === 'in') incomeData[day - 1] += Number(tx.amount || 0);
          else if (tx.type === 'out') expenseData[day - 1] += Number(tx.amount || 0);
        }
      });
    }

    if (this.trendChart) {
      this.trendChart.destroy();
    }

    Chart.defaults.color = '#64748b';
    Chart.defaults.font.family = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    const incomeGradient = ctx.createLinearGradient(0, 0, 0, 300);
    incomeGradient.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
    incomeGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const expenseGradient = ctx.createLinearGradient(0, 0, 0, 300);
    expenseGradient.addColorStop(0, 'rgba(239, 68, 68, 0.16)');
    expenseGradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Arus Kas Masuk',
            data: incomeData,
            borderColor: '#059669',
            backgroundColor: incomeGradient,
            tension: 0.35,
            fill: true,
            borderWidth: 2,
            pointBackgroundColor: '#059669',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            pointRadius: 2.5,
            pointHoverRadius: 5
          },
          {
            label: 'Arus Kas Keluar',
            data: expenseData,
            borderColor: '#dc2626',
            backgroundColor: expenseGradient,
            tension: 0.35,
            fill: true,
            borderWidth: 2,
            pointBackgroundColor: '#dc2626',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            pointRadius: 2.5,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'top',
            align: 'end',
            labels: { 
              boxWidth: 8, 
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              font: { size: 12, weight: '600' } 
            } 
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { size: 12, weight: '700' },
            bodyFont: { size: 12, weight: '500' },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ${utils.formatRupiah(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: { 
            grid: { display: false }, 
            ticks: { 
              font: { size: 11, weight: '500' },
              maxTicksLimit: 10
            } 
          },
          y: { 
            beginAtZero: true, 
            grid: { color: '#f1f5f9' },
            ticks: { 
              font: { size: 11, weight: '500' },
              callback: (value) => value >= 1000000 ? 'Rp ' + (value / 1000000).toFixed(1) + 'M' : value >= 1000 ? 'Rp ' + (value / 1000).toFixed(0) + 'k' : 'Rp ' + value
            } 
          }
        },
        interaction: { intersect: false, mode: 'index' }
      }
    });
  },

  renderDoughnutChart(filteredTxs) {
    const canvas = document.getElementById('doughnutChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const categoryExpenses = {};
    filteredTxs.forEach(tx => {
      if (tx.type === 'out') {
        let cat = tx.category;
        if (!cat) {
          const matched = state.categories.find(c => tx.desc && tx.desc.toLowerCase().includes(c.toLowerCase()));
          cat = matched || tx.desc || 'Lainnya';
        }
        categoryExpenses[cat] = (categoryExpenses[cat] || 0) + Number(tx.amount || 0);
      }
    });

    const palette = ['#f43f5e', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b', '#84cc16'];
    const sortedCats = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1]);

    const labels = [];
    const data = [];
    const backgroundColors = [];

    sortedCats.forEach(([cat, amt], idx) => {
      if (amt > 0) {
        labels.push(cat);
        data.push(amt);
        backgroundColors.push(palette[idx % palette.length]);
      }
    });

    if (this.doughnutChart) {
      this.doughnutChart.destroy();
    }

    if (data.length === 0) {
      labels.push('Belum ada pengeluaran');
      data.push(1);
      backgroundColors.push('#f1f5f9');
    }

    this.doughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { 
              boxWidth: 8, 
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 12,
              font: { size: 11, weight: '600' } 
            } 
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                if (data.length === 1 && data[0] === 1 && labels[0] === 'Belum ada pengeluaran') return ' Rp 0';
                const total = data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${utils.formatRupiah(context.raw)} (${pct}%)`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });
  },

  renderCategoryAnalysis(filteredTxs) {
    const expenseTxs = filteredTxs.filter(tx => tx.type === 'out');
    const totalExpense = expenseTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const categoryMap = {};
    expenseTxs.forEach(tx => {
      let cat = tx.category;
      if (!cat) {
        const matched = state.categories.find(c => tx.desc && tx.desc.toLowerCase().includes(c.toLowerCase()));
        cat = matched || tx.desc || 'Lainnya';
      }
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(tx.amount || 0);
    });

    const sortedCats = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

    const highlightEl = document.getElementById('analytics-top-category');
    const rankingEl = document.getElementById('analytics-category-ranking');
    const totalSpentEl = document.getElementById('analytics-total-spent');

    if (totalSpentEl) {
      totalSpentEl.textContent = utils.formatRupiah(totalExpense);
    }

    if (!rankingEl) return;

    if (sortedCats.length === 0 || totalExpense === 0) {
      if (highlightEl) {
        highlightEl.innerHTML = `
          <div class="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
            <p class="text-xs font-semibold text-slate-500">Belum ada pengeluaran pada bulan ini untuk dianalisis.</p>
          </div>
        `;
      }
      rankingEl.innerHTML = `
        <div class="py-8 text-center text-slate-400 text-xs">
          Belum ada catatan transaksi pengeluaran pada periode ini.
        </div>
      `;
      return;
    }

    const topCategory = sortedCats[0];
    const topPct = ((topCategory[1] / totalExpense) * 100).toFixed(1);

    if (highlightEl) {
      highlightEl.innerHTML = `
        <div class="p-4 sm:p-5 bg-gradient-to-r from-rose-50 via-amber-50/40 to-orange-50 border border-rose-200/80 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
              🔥
            </div>
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full border border-rose-200">Pengeluaran Terbanyak</span>
              <h4 class="text-sm sm:text-base font-bold text-slate-900 mt-0.5">Uang paling banyak dipakai untuk <span class="text-rose-600 underline decoration-rose-300 decoration-2">${topCategory[0]}</span></h4>
              <p class="text-xs text-slate-500">Menyerap <span class="font-semibold text-slate-800 font-mono">${topPct}%</span> dari seluruh pengeluaran bulan ini.</p>
            </div>
          </div>
          <div class="text-left sm:text-right font-mono bg-white/80 sm:bg-transparent px-3 py-2 sm:p-0 rounded-xl border border-rose-100 sm:border-0">
            <span class="text-[10px] uppercase font-bold text-slate-400 block font-sans">Total Terpakai</span>
            <span class="text-base sm:text-lg font-bold text-rose-600">${utils.formatRupiah(topCategory[1])}</span>
          </div>
        </div>
      `;
    }

    const palette = ['#f43f5e', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b', '#84cc16'];

    rankingEl.innerHTML = sortedCats.map(([catName, amt], idx) => {
      const pct = ((amt / totalExpense) * 100).toFixed(1);
      const barColor = palette[idx % palette.length];
      const isTop = idx === 0;

      return `
        <div class="p-3 bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl transition">
          <div class="flex items-center justify-between text-xs mb-1.5">
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${isTop ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 font-mono'}">
                #${idx + 1}
              </span>
              <span class="font-bold text-slate-900 text-xs sm:text-sm">${catName}</span>
              ${isTop ? '<span class="text-[9px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-full">Terbanyak</span>' : ''}
            </div>
            <div class="text-right font-mono">
              <span class="font-bold text-slate-900 text-xs sm:text-sm">${utils.formatRupiah(amt)}</span>
              <span class="text-[11px] text-slate-400 ml-1 font-semibold">(${pct}%)</span>
            </div>
          </div>
          <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500" style="width: ${pct}%; background-color: ${barColor};"></div>
          </div>
        </div>
      `;
    }).join('');
  }
};
