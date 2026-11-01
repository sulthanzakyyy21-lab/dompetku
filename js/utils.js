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
  },

  formatNumber: (number) => {
    if (number === null || number === undefined || number === '') return '';
    const clean = typeof number === 'number' ? number : utils.parseNumber(number);
    if (isNaN(clean)) return '';
    return clean.toLocaleString('en-US');
  },

  parseNumber: (value) => {
    if (typeof value === 'number') return isNaN(value) ? 0 : Math.round(value);
    if (!value) return 0;
    const str = String(value).trim().toLowerCase();
    if (!str) return 0;

    const shorthandMatch = str.match(/^([\d.,]+)\s*(k|rb|ribu|m|jt|juta|b|mly)?$/i);
    if (shorthandMatch) {
      let numStr = shorthandMatch[1];
      const unit = (shorthandMatch[2] || '').toLowerCase();

      if (unit && numStr.includes(',') && !numStr.includes('.')) {
        numStr = numStr.replace(',', '.');
      } else {
        numStr = numStr.replace(/,/g, '');
        if ((numStr.match(/\./g) || []).length > 1 || (numStr.includes('.') && numStr.split('.')[1].length === 3 && !unit)) {
          numStr = numStr.replace(/\./g, '');
        }
      }

      let parsed = parseFloat(numStr);
      if (isNaN(parsed)) return 0;

      if (unit === 'k' || unit === 'rb' || unit === 'ribu') {
        parsed *= 1000;
      } else if (unit === 'm' || unit === 'jt' || unit === 'juta') {
        parsed *= 1000000;
      } else if (unit === 'b' || unit === 'mly') {
        parsed *= 1000000000;
      }
      return Math.round(parsed);
    }

    const clean = str.replace(/\D/g, '');
    return clean ? parseInt(clean, 10) : 0;
  },

  setupCurrencyInput: (input) => {
    if (!input || input.dataset.currencyFormatted === 'true') return;
    input.dataset.currencyFormatted = 'true';

    input.type = 'text';
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'off');

    if (input.value) {
      const parsed = utils.parseNumber(input.value);
      if (parsed > 0) {
        input.value = utils.formatNumber(parsed);
      }
    }

    input.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      const cursorPos = input.selectionStart || 0;
      const val = input.value;

      if (e.key === 'Backspace' && input.selectionStart === input.selectionEnd && cursorPos > 0) {
        if (val[cursorPos - 1] === ',') {
          e.preventDefault();
          const left = val.slice(0, cursorPos - 2);
          const right = val.slice(cursorPos);
          const combined = (left + right).replace(/\D/g, '');
          const newNum = combined ? parseInt(combined, 10) : 0;
          input.value = newNum > 0 ? utils.formatNumber(newNum) : '';

          const targetDigits = left.replace(/\D/g, '').length;
          let newPos = 0, count = 0;
          while (newPos < input.value.length && count < targetDigits) {
            if (/\d/.test(input.value[newPos])) count++;
            newPos++;
          }
          input.setSelectionRange(newPos, newPos);
          try {
            input.dispatchEvent(new Event('input', { bubbles: true }));
          } catch (_) {}
          return;
        }
      }

      if (key === 'k' || key === 'm') {
        e.preventDefault();
        const currentNum = utils.parseNumber(val);
        if (currentNum > 0) {
          const multiplier = key === 'k' ? 1000 : 1000000;
          const newNum = currentNum * multiplier;
          input.value = utils.formatNumber(newNum);
          input.setSelectionRange(input.value.length, input.value.length);
          try {
            input.dispatchEvent(new Event('input', { bubbles: true }));
          } catch (_) {}
        }
      }
    });

    input.addEventListener('input', () => {
      const rawVal = input.value;
      if (!rawVal) return;

      if (/[kmbjt]/i.test(rawVal)) {
        const parsed = utils.parseNumber(rawVal);
        if (parsed > 0) {
          input.value = utils.formatNumber(parsed);
          input.setSelectionRange(input.value.length, input.value.length);
          return;
        }
      }

      const cursorPos = input.selectionStart || 0;
      const digitsBeforeCursor = rawVal.slice(0, cursorPos).replace(/\D/g, '').length;
      const digitsOnly = rawVal.replace(/\D/g, '');

      if (digitsOnly === '') {
        input.value = '';
        return;
      }

      const num = parseInt(digitsOnly, 10);
      if (isNaN(num)) {
        input.value = '';
        return;
      }

      const formatted = num.toLocaleString('en-US');
      input.value = formatted;

      let newCursorPos = 0;
      let count = 0;
      while (newCursorPos < formatted.length && count < digitsBeforeCursor) {
        if (/\d/.test(formatted[newCursorPos])) count++;
        newCursorPos++;
      }
      input.setSelectionRange(newCursorPos, newCursorPos);
    });
  },

  /**
   * Menghasilkan delay berurutan (stagger) yang dibatasi maksimal 12 item pertama
   * agar tabel dengan ratusan baris tetap instan dan tidak membebani CPU (Low-Spec Friendly)
   */
  getSafeStaggerDelay: (index, baseDelay = 0.08, step = 0.045) => {
    const cappedIndex = Math.min(index, 12);
    return `${(baseDelay + cappedIndex * step).toFixed(3)}s`;
  }
};
