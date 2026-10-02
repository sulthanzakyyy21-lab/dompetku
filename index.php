<?php
// View / Interface: Hanya mengurus tampilan antarmuka (HTML & CSS)
require_once 'functions.php';
$data = get_data();

// Hitung Statistik Dompet & Saldo
$walletStats = [];
foreach ($data['wallets'] as $w) {
    $walletStats[$w['id']] = ['spent' => 0, 'weeklySpent' => 0, 'monthlySpent' => 0, 'income' => 0];
}

$totalNetBalance = 0;
foreach ($data['wallets'] as $w) {
    $totalNetBalance += floatval($w['budget']);
}

foreach ($data['transactions'] as $tx) {
    $wid = $tx['walletId'];
    if (isset($walletStats[$wid])) {
        $amount = floatval($tx['amount']);
        if ($tx['type'] === 'in') {
            $walletStats[$wid]['income'] += $amount;
            $totalNetBalance += $amount;
        } else {
            $walletStats[$wid]['spent'] += $amount;
            $totalNetBalance -= $amount;

            if (isWithinCurrentWeek($tx['fullDate'] ?? '')) {
                $walletStats[$wid]['weeklySpent'] += $amount;
            }
            if (isWithinCurrentMonth($tx['fullDate'] ?? '')) {
                $walletStats[$wid]['monthlySpent'] += $amount;
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dompet Ku</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen pb-12">

  <!-- Header -->
  <header class="bg-indigo-600 text-white p-6 shadow-lg rounded-b-3xl max-w-md mx-auto">
    <div class="flex justify-between items-center mb-4">
      <div>
        <p class="text-xs text-indigo-200 uppercase tracking-wider font-semibold">Total Sisa Uang</p>
        <h1 class="text-3xl font-extrabold mt-1"><?= formatRupiah($totalNetBalance) ?></h1>
      </div>
      <div class="flex gap-2">
        <button onclick="openAddWalletModal()" class="text-xs bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-2 rounded-xl transition font-medium">
          Atur Dompet
        </button>
        <a href="process.php?action=export" title="Backup Data" class="text-xs bg-indigo-700 hover:bg-indigo-800 text-white px-2.5 py-2 rounded-xl transition font-medium inline-flex items-center">
          📤 Backup
        </a>
        <button onclick="document.getElementById('import-input').click()" title="Restore Data" class="text-xs bg-indigo-700 hover:bg-indigo-800 text-white px-2.5 py-2 rounded-xl transition font-medium">
          📥 Restore
        </button>
        <form id="import-form" action="process.php" method="POST" enctype="multipart/form-data" class="hidden">
            <input type="hidden" name="action" value="import_data">
            <input type="file" id="import-input" name="import_file" accept=".json" onchange="document.getElementById('import-form').submit()">
        </form>
      </div>
    </div>
  </header>

  <main class="max-w-md mx-auto px-4 mt-6 space-y-6">

    <!-- Area Peringatan (Alert) -->
    <div class="space-y-2">
      <?php foreach ($data['wallets'] as $w): 
          $stats = $walletStats[$w['id']] ?? ['spent' => 0, 'weeklySpent' => 0, 'monthlySpent' => 0, 'income' => 0];
          $maxLimit = floatval($w['maxLimit'] ?? 0);
          $monthlyLimit = floatval($w['monthlyLimit'] ?? 0);
          $percentWeekly = ($maxLimit > 0) ? round(($stats['weeklySpent'] / $maxLimit) * 100) : 0;
          $percentMonthly = ($monthlyLimit > 0) ? round(($stats['monthlySpent'] / $monthlyLimit) * 100) : 0;
      ?>
          <?php if ($maxLimit > 0 && $percentWeekly >= 80): 
              $isOver = $percentWeekly >= 100;
          ?>
              <div class="p-3 rounded-2xl border <?= $isOver ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800' ?> flex items-start gap-3 shadow-sm">
                <span class="text-base"><?= $isOver ? '🚨' : '⚠️' ?></span>
                <div class="text-xs">
                  <span class="font-bold block mb-0.5"><?= $isOver ? 'Limit Minggu Ini Terlewati!' : 'Peringatan Limit Mingguan!' ?></span>
                  Dompet <b class="underline"><?= htmlspecialchars($w['name']) ?></b> minggu ini mencapai <b><?= $percentWeekly ?>%</b> (<?= formatRupiah($stats['weeklySpent']) ?> / <?= formatRupiah($maxLimit) ?>).
                </div>
              </div>
          <?php endif; ?>

          <?php if ($monthlyLimit > 0 && $percentMonthly >= 80): 
              $isOverMonthly = $percentMonthly >= 100;
          ?>
              <div class="p-3 rounded-2xl border <?= $isOverMonthly ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-orange-50 border-orange-200 text-orange-800' ?> flex items-start gap-3 shadow-sm">
                <span class="text-base">📅</span>
                <div class="text-xs">
                  <span class="font-bold block mb-0.5"><?= $isOverMonthly ? 'Limit Bulan Ini Jebol!' : 'Peringatan Limit Bulanan!' ?></span>
                  Dompet <b class="underline"><?= htmlspecialchars($w['name']) ?></b> bulan ini mencapai <b><?= $percentMonthly ?>%</b> (<?= formatRupiah($stats['monthlySpent']) ?> / <?= formatRupiah($monthlyLimit) ?>).
                </div>
              </div>
          <?php endif; ?>
      <?php endforeach; ?>
    </div>

    <!-- Ringkasan Dompet -->
    <section>
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider">Dompet Saya</h2>
      </div>
      <div class="grid grid-cols-1 gap-3">
        <?php foreach ($data['wallets'] as $w): 
            $stats = $walletStats[$w['id']] ?? ['spent' => 0, 'weeklySpent' => 0, 'monthlySpent' => 0, 'income' => 0];
            $remaining = floatval($w['budget'] ?? 0) + $stats['income'] - $stats['spent'];
            $monthlyLimit = floatval($w['monthlyLimit'] ?? 0);
            $percentMonthly = ($monthlyLimit > 0) ? round(($stats['monthlySpent'] / $monthlyLimit) * 100) : 0;
        ?>
          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-3">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full <?= $w['color'] ?? 'bg-indigo-500' ?>"></span>
                <span class="font-bold text-slate-700 text-sm"><?= htmlspecialchars($w['name']) ?></span>
              </div>
              <span class="text-[10px] font-semibold bg-slate-100 px-2 py-1 rounded-lg text-slate-600">
                <?= $monthlyLimit > 0 ? "Bulan Ini: {$percentMonthly}%" : "Tanpa Limit" ?>
              </span>
            </div>
            
            <div class="flex justify-between items-end">
              <div>
                <p class="text-[10px] text-slate-400 uppercase tracking-wide">Sisa Uang Dompet</p>
                <p class="text-base font-extrabold text-slate-800"><?= formatRupiah($remaining) ?></p>
              </div>
              <div class="text-right text-[10px] text-slate-500 space-y-0.5">
                <p>Keluar Mgg: <span class="font-bold text-slate-700"><?= formatRupiah($stats['weeklySpent']) ?></span></p>
                <p>Keluar Bln: <span class="font-bold text-slate-700"><?= formatRupiah($stats['monthlySpent']) ?></span></p>
              </div>
            </div>
            
            <div class="space-y-1">
              <div class="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>Progress Bulanan</span>
                <span>Limit: <?= $monthlyLimit > 0 ? formatRupiah($monthlyLimit) : 'Tidak dibatasi' ?></span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div class="<?= $percentMonthly >= 100 ? 'bg-rose-500' : ($percentMonthly >= 80 ? 'bg-amber-500' : ($w['color'] ?? 'bg-indigo-500')) ?> h-1.5 rounded-full transition-all duration-300" style="width: <?= max(0, min($percentMonthly, 100)) ?>%"></div>
              </div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </section>

    <!-- Form Catat Transaksi -->
    <section class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
      <h2 class="text-base font-bold text-slate-700 mb-4">Catat Transaksi</h2>
      <!-- Arahkan form submit ke file process.php -->
      <form action="process.php" method="POST" class="space-y-4">
        <input type="hidden" name="action" value="add_transaction">
        <input type="hidden" name="type" id="tx-type-input" value="out">
        
        <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button type="button" id="btn-type-out" onclick="setTxType('out')" class="py-2 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-sm">
            Pengeluaran (-)
          </button>
          <button type="button" id="btn-type-in" onclick="setTxType('in')" class="py-2 text-xs font-bold rounded-lg text-slate-500">
            Pemasukan (+)
          </button>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Pilih Dompet</label>
          <select name="walletId" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
            <?php foreach ($data['wallets'] as $w): ?>
              <option value="<?= $w['id'] ?>"><?= htmlspecialchars($w['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">Nominal (Rp)</label>
            <input type="number" name="amount" placeholder="25000" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">Keterangan</label>
            <input type="text" name="desc" placeholder="Makan siang / Bonus" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
          </div>
        </div>

        <button type="submit" id="btn-submit-tx" class="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-indigo-100">
          Simpan Transaksi
        </button>
      </form>
    </section>

    <!-- Riwayat Transaksi -->
    <section class="space-y-4">
      <div class="flex justify-between items-center mb-1">
        <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider">Riwayat Per Dompet</h2>
      </div>
      <div class="space-y-4">
        <?php foreach ($data['wallets'] as $w): 
            $walletTxs = [];
            foreach ($data['transactions'] as $idx => $tx) {
                if ($tx['walletId'] === $w['id']) {
                    $tx['realIndex'] = $idx;
                    $walletTxs[] = $tx;
                }
            }
            $totalWalletSpent = array_reduce($walletTxs, function($sum, $tx) {
                return $tx['type'] === 'out' ? $sum + floatval($tx['amount']) : $sum;
            }, 0);
        ?>
          <div class="bg-slate-100/70 p-4 rounded-2xl border border-slate-200/60 space-y-3">
            <div class="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full <?= $w['color'] ?? 'bg-indigo-500' ?>"></span>
                <span class="font-bold text-slate-800 text-sm"><?= htmlspecialchars($w['name']) ?></span>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-slate-400 block uppercase font-semibold">Total Pengeluaran</span>
                <span class="text-xs font-extrabold text-red-500"><?= formatRupiah($totalWalletSpent) ?></span>
              </div>
            </div>
            
            <div class="space-y-2">
              <?php if (empty($walletTxs)): ?>
                <div class="text-center py-4 text-slate-400 text-xs italic bg-white rounded-xl border border-slate-100">Belum ada transaksi di dompet ini.</div>
              <?php else: ?>
                <?php foreach (array_reverse($walletTxs) as $tx): 
                    $isIncome = $tx['type'] === 'in';
                ?>
                  <div class="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                    <div class="flex items-center gap-2.5">
                      <div class="w-2 h-6 rounded-full <?= $w['color'] ?? 'bg-slate-300' ?>"></div>
                      <div>
                        <p class="font-bold text-slate-700 text-xs"><?= htmlspecialchars($tx['desc']) ?></p>
                        <p class="text-[10px] text-slate-400"><?= htmlspecialchars($tx['date']) ?></p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-xs <?= $isIncome ? 'text-emerald-600' : 'text-red-500' ?>">
                        <?= $isIncome ? '+' : '-' ?> <?= formatRupiah($tx['amount']) ?>
                      </span>
                      <button onclick="deleteTransaction(<?= $tx['realIndex'] ?>)" class="text-slate-300 hover:text-red-500 text-xs font-bold p-1">✕</button>
                    </div>
                  </div>
                <?php endforeach; ?>
              <?php endif; ?>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </section>

  </main>

  <!-- Modal Kelola Dompet -->
  <div id="modal-wallet" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center">
        <h3 id="modal-wallet-title" class="font-bold text-slate-800">Kelola Dompet</h3>
        <button onclick="toggleModalWallet()" class="text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <form action="process.php" method="POST" class="space-y-3 pt-2 border-t border-slate-100">
        <input type="hidden" name="action" value="save_wallet">
        <input type="hidden" name="wallet_edit_id" id="wallet-edit-id">
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Nama Dompet</label>
          <input type="text" name="wallet_name" id="wallet-name" placeholder="Misal: Tabungan" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Target Saldo Awal (Rp)</label>
          <input type="number" name="wallet_budget" id="wallet-budget" placeholder="1000000" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Batas Maksimal Pengeluaran Per Minggu (Rp)</label>
          <input type="number" name="wallet_max_limit" id="wallet-max-limit" placeholder="500000" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Batas Maksimal Pengeluaran Per Bulan (Rp)</label>
          <input type="number" name="wallet_monthly_limit" id="wallet-monthly-limit" placeholder="2000000" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>
        <div class="flex gap-2 pt-1">
          <button type="submit" id="btn-submit-wallet" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs">
            Simpan Dompet
          </button>
          <button type="button" onclick="resetWalletForm()" class="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-3 rounded-xl text-xs">
            Batal
          </button>
        </div>
      </form>

      <div class="space-y-2 pt-2 border-t border-slate-100">
        <?php foreach ($data['wallets'] as $w): ?>
          <div class="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p class="font-bold text-xs text-slate-700"><?= htmlspecialchars($w['name']) ?></p>
              <p class="text-[10px] text-slate-400">Limit: Mgg (<?= formatRupiah($w['maxLimit'] ?? 0) ?>) | Bln (<?= formatRupiah($w['monthlyLimit'] ?? 0) ?>)</p>
            </div>
            <div class="flex gap-2">
              <button type="button" 
                data-id="<?= htmlspecialchars($w['id']) ?>" 
                data-name="<?= htmlspecialchars($w['name']) ?>" 
                data-budget="<?= floatval($w['budget'] ?? 0) ?>" 
                data-max-limit="<?= floatval($w['maxLimit'] ?? 0) ?>" 
                data-monthly-limit="<?= floatval($w['monthlyLimit'] ?? 0) ?>" 
                onclick="editWalletFromBtn(this)" 
                class="text-xs text-indigo-600 font-semibold hover:underline">Edit</button>
              <button type="button" onclick="deleteWallet('<?= $w['id'] ?>')" class="text-xs text-red-500 font-semibold hover:underline">Hapus</button>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>

  <script>
    function setTxType(type) {
      document.getElementById('tx-type-input').value = type;
      const btnOut = document.getElementById('btn-type-out');
      const btnIn = document.getElementById('btn-type-in');
      const btnSubmit = document.getElementById('btn-submit-tx');

      if (type === 'out') {
        btnOut.className = "py-2 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-sm";
        btnIn.className = "py-2 text-xs font-bold rounded-lg text-slate-500";
        btnSubmit.className = "w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-indigo-100";
        btnSubmit.innerText = "Simpan Pengeluaran";
      } else {
        btnIn.className = "py-2 text-xs font-bold rounded-lg bg-white text-emerald-600 shadow-sm";
        btnOut.className = "py-2 text-xs font-bold rounded-lg text-slate-500";
        btnSubmit.className = "w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-emerald-100";
        btnSubmit.innerText = "Tambah Uang (Pemasukan)";
      }
    }

    function openAddWalletModal() {
      resetWalletForm();
      const modal = document.getElementById('modal-wallet');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function toggleModalWallet() {
      const modal = document.getElementById('modal-wallet');
      modal.classList.toggle('hidden');
      modal.classList.toggle('flex');
    }

    function editWalletFromBtn(btn) {
      document.getElementById('wallet-edit-id').value = btn.dataset.id;
      document.getElementById('wallet-name').value = btn.dataset.name;
      document.getElementById('wallet-budget').value = btn.dataset.budget;
      document.getElementById('wallet-max-limit').value = btn.dataset.maxLimit;
      document.getElementById('wallet-monthly-limit').value = btn.dataset.monthlyLimit;
      document.getElementById('modal-wallet-title').innerText = "Edit Dompet";
      document.getElementById('btn-submit-wallet').innerText = "Update Dompet";
      document.getElementById('wallet-name').focus();
    }

    function resetWalletForm() {
      document.getElementById('wallet-edit-id').value = '';
      document.getElementById('wallet-name').value = '';
      document.getElementById('wallet-budget').value = '';
      document.getElementById('wallet-max-limit').value = '';
      document.getElementById('wallet-monthly-limit').value = '';
      document.getElementById('modal-wallet-title').innerText = "Kelola Dompet";
      document.getElementById('btn-submit-wallet').innerText = "Simpan Dompet";
    }

    function deleteTransaction(index) {
      if (confirm('Hapus pencatatan transaksi ini?')) {
        const f = document.createElement('form');
        f.method = 'POST';
        f.action = 'process.php';
        f.innerHTML = '<input type="hidden" name="action" value="delete_transaction"><input type="hidden" name="index" value="' + index + '">';
        document.body.appendChild(f);
        f.submit();
      }
    }

    function deleteWallet(id) {
      if (confirm('Hapus dompet ini?')) {
        const f = document.createElement('form');
        f.method = 'POST';
        f.action = 'process.php';
        f.innerHTML = '<input type="hidden" name="action" value="delete_wallet"><input type="hidden" name="wallet_id" value="' + id + '">';
        document.body.appendChild(f);
        f.submit();
      }
    }
  </script>
</body>
</html>