<?php
// 1. MEMBUAT VARIABEL & ARRAY
// Di PHP, data dikelompokkan dalam bentuk Array (seperti daftar belanjaan)
$catatan_baru = [
    'keterangan' => 'Beli Es Teh',
    'jumlah' => 5000,
    'tanggal' => '01 Okt 2026'
];

echo "<b>1. Ini adalah Array PHP asli:</b><br>";
print_r($catatan_baru);
echo "<br><br>";


// 2. MENGUBAH ARRAY MENJADI TEKS JSON (`json_encode`)
// File teks di komputer/server tidak bisa membaca Array PHP secara langsung.
// Harus diubah dulu menjadi format teks JSON.
$teks_json = json_encode($catatan_baru);

echo "<b>2. Setelah diubah ke teks JSON (siap disimpan ke file):</b><br>";
echo $teks_json;
echo "<br><br>";


// 3. MENYIMPAN KE FILE (`file_put_contents`)
// Memerintahkan PHP untuk membuat file bernama 'data_uji.json' dan memasukkan teks JSON tadi ke dalamnya.
file_put_contents('data_uji.json', $teks_json);
echo "<b>3. Status:</b> File 'data_uji.json' berhasil dibuat di server!<br><br>";


// 4. MEMBACA KEMBALI ISI FILE (`file_get_contents`)
// Mengambil kembali teks yang ada di dalam file 'data_uji.json'.
$hasil_baca_file = file_get_contents('data_uji.json');

echo "<b>4. Hasil membaca isi file di server:</b><br>";
echo $hasil_baca_file;
echo "<br><br>";


// 5. MENGEMBALIKAN TEKS JSON MENJADI ARRAY PHP (`json_decode`)
// Agar datanya bisa dihitung atau diubah lagi oleh PHP, teks JSON diubah kembali menjadi Array PHP.
$array_lagi = json_decode($hasil_baca_file, true);

echo "<b>5. Diubah kembali ke Array PHP, sekarang kita bisa ambil isinya satuan:</b><br>";
echo "Keterangan: " . $array_lagi['keterangan'] . "<br>";
echo "Jumlah: Rp " . $array_lagi['jumlah'];
?>