const analytics = {
  trendChart: null,
  doughnutChart: null,

  renderCharts() {
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

    Chart.defaults.color = '#64748b'; // slate-500
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Pemasukan',
            data: incomeData,
            borderColor: '#34d399', // emerald-400
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            tension: 0.4,
            fill: true,
            borderWidth: 2,
            pointBackgroundColor: '#34d399',
            pointBorderColor: '#ffffff',
            pointRadius: 3
          },
          {
            label: 'Pengeluaran',
            data: expenseData,
            borderColor: '#fb7185', // rose-400
            backgroundColor: 'rgba(251, 113, 133, 0.1)',
            tension: 0.4,
            fill: true,
            borderWidth: 2,
            pointBackgroundColor: '#fb7185',
            pointBorderColor: '#ffffff',
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11, weight: '700' } } }
        },
        scales: {
          x: { 
            grid: { display: false, color: '#f1f5f9' }, // slate-100 
            ticks: { font: { size: 10, weight: '600' } } 
          },
          y: { 
            beginAtZero: true, 
            grid: { color: '#f1f5f9', borderDash: [4, 4] },
            ticks: { 
              font: { size: 10, weight: '600' },
              callback: (value) => 'Rp ' + (value / 1000) + 'k' 
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

    if (data.length === 0) {
      labels.push('Belum ada data');
      data.push(1);
      backgroundColors.push('#f1f5f9'); // slate-100
    }

    this.doughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: '#ffffff' // white border for light theme
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11, weight: '700' } } },
          tooltip: {
            callbacks: {
              label: function(context) {
                if (data.length === 1 && data[0] === 1 && labels[0] === 'Belum ada data') return ' Rp 0';
                return ' ' + utils.formatRupiah(context.raw);
              }
            }
          }
        },
        cutout: '75%'
      }
    });
  }
};
