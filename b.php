<?php
// 1. Tentukan nama file tempat menyimpan data
$file_data = 'data_catatan.json';

// 2. Cek apakah tombol "Simpan" pada form telah ditekan (Metode POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Ambil data yang diketik pengguna dari form
    $keterangan = $_POST['keterangan'] ?? '';
    $jumlah = $_POST['jumlah'] ?? 0;

    // Validasi: Pastikan keterangan diisi dan jumlahnya lebih dari 0
    if (!empty($keterangan) && $jumlah > 0) {
        
        // Ambil data lama dari file JSON (jika sudah ada)
        $daftar_catatan = [];
        if (file_exists($file_data)) {
            $isi_file = file_get_contents($file_data);
            $daftar_catatan = json_decode($isi_file, true) ?? [];
        }

        // Masukkan data baru ke dalam array
        $data_baru = [
            'keterangan' => $keterangan,
            'jumlah' => $jumlah,
            'tanggal' => date('d M Y') // Mengambil tanggal hari ini
        ];
        
        // Tambahkan data baru ke tumpukan array
        $daftar_catatan[] = $data_baru;

        // Simpan kembali semua data ke file JSON agar tidak hilang
        file_put_contents($file_data, json_encode($daftar_catatan, JSON_PRETTY_PRINT));
        
        // Refresh halaman agar form kembali bersih dari data sebelumnya
        header('Location: catatan.php');
        exit;
    }
}

// 3. Ambil data dari file JSON untuk nanti ditampilkan di HTML
$daftar_catatan = [];
if (file_exists($file_data)) {
    $isi_file = file_get_contents($file_data);
    $daftar_catatan = json_decode($isi_file, true) ?? [];
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Catat Uang Sederhana</title>
    <!-- Kita pakai Tailwind CSS agar tampilannya langsung rapi dan bagus -->
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 p-6 min-h-screen flex items-center justify-center">

    <div class="max-w-md w-full bg-white p-6 rounded-2xl shadow-md space-y-6">
        <h1 class="text-xl font-bold text-slate-800 text-center">Catat Uang Saku 💰</h1>

        <!-- FORM INPUT (Tempat pengguna mengetik data) -->
        <form action="" method="POST" class="space-y-4">
            <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1">Keterangan Pengeluaran</label>
                <input type="text" name="keterangan" placeholder="Contoh: Beli Es Teh" required 
                       class="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1">Jumlah (Rp)</label>
                <input type="number" name="jumlah" placeholder="5000" required 
                       class="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-sm">
                Simpan Catatan
            </button>
        </form>

        <!-- BAGIAN MENAMPILKAN RIWAYAT -->
        <div class="space-y-3 pt-4 border-t border-slate-100">
            <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Riwayat Catatan</h2>
            
            <?php if (empty($daftar_catatan)): ?>
                <!-- Jika data kosong -->
                <p class="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-xl">Belum ada catatan pengeluaran.</p>
            <?php else: ?>
                <!-- Jika ada data, lakukan perulangan (looping) untuk menampilkan semuanya -->
                <div class="space-y-2">
                    <?php foreach ($daftar_catatan as $item): ?>
                        <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                            <div>
                                <p class="font-bold text-slate-700"><?= htmlspecialchars($item['keterangan']) ?></p>
                                <p class="text-[10px] text-slate-400"><?= $item['tanggal'] ?></p>
                            </div>
                            <span class="font-bold text-red-500">- Rp <?= number_format($item['jumlah'], 0, ',', '.') ?></span>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>

</body>
</html>