const analytics = {
  trendChart: null,
  doughnutChart: null,

  renderCharts() {
    // Filter transaksi berdasarkan bulan & tahun yang dipilih
    const filteredTxs = state.transactions.filter(tx => {
      const d = new Date(tx.fullDate);
      return d.getMonth() === state.filterMonth && d.getFullYear() === state.filterYear;
    });

    this.renderTrendChart(filteredTxs);
    this.renderDoughnutChart(filteredTxs);
  },

  renderTrendChart(filteredTxs) {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Group by day dalam bulan tersebut
    const daysInMonth = new Date(state.filterYear, state.filterMonth + 1, 0).getDate();
    const labels = Array.from({length: daysInMonth}, (_, i) => i + 1);
    const incomeData = new Array(daysInMonth).fill(0);
    const expenseData = new Array(daysInMonth).fill(0);

    filteredTxs.forEach(tx => {
      const day = new Date(tx.fullDate).getDate();
      if (tx.type === 'in') {
        incomeData[day - 1] += Number(tx.amount);
      } else if (tx.type === 'out') {
        expenseData[day - 1] += Number(tx.amount);
      }
    });

    if (this.trendChart) {
      this.trendChart.destroy();
    }

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Pemasukan',
            data: incomeData,
            borderColor: '#10b981', // Emerald
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Pengeluaran',
            data: expenseData,
            borderColor: '#f43f5e', // Rose
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { 
            beginAtZero: true, 
            ticks: { 
              font: { size: 10 },
              callback: (value) => 'Rp ' + (value / 1000) + 'k' 
            } 
          }
        }
      }
    });
  },

  renderDoughnutChart(filteredTxs) {
    const canvas = document.getElementById('doughnutChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Group pengeluaran by wallet (hanya pengeluaran)
    const walletExpenses = {};
    state.wallets.forEach(w => walletExpenses[w.id] = 0);

    filteredTxs.forEach(tx => {
      if (tx.type === 'out' && walletExpenses[tx.walletId] !== undefined) {
        walletExpenses[tx.walletId] += Number(tx.amount);
      }
    });

    const labels = [];
    const data = [];
    const backgroundColors = [];

    state.wallets.forEach(w => {
      if (walletExpenses[w.id] > 0) {
        labels.push(w.name);
        data.push(walletExpenses[w.id]);
        backgroundColors.push(w.hex || '#6366f1');
      }
    });

    if (this.doughnutChart) {
      this.doughnutChart.destroy();
    }

    // Tampilkan placeholder jika data kosong
    if (data.length === 0) {
      labels.push('Belum ada data');
      data.push(1);
      backgroundColors.push('#e2e8f0'); // slate-200
    }

    this.doughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: function(context) {
                if (data.length === 1 && data[0] === 1 && labels[0] === 'Belum ada data') return ' 0';
                return ' ' + utils.formatRupiah(context.raw);
              }
            }
          }
        },
        cutout: '70%'
      }
    });
  }
};
