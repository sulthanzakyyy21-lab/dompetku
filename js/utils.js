const utils = {
  formatRupiah: (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
  },
  isWithinCurrentWeek: (dateString) => {
    if (!dateString) return false;
    const txDate = new Date(dateString);
    const today = new Date();
    const diffTime = today - txDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  },
  isWithinCurrentMonth: (dateString) => {
    if (!dateString) return false;
    const txDate = new Date(dateString);
    const today = new Date();
    return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
  }
};
