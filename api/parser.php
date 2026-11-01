<?php
// api/parser.php - Smart Bank Notification Parser

function parseBankNotification($rawText, $rawTitle = '', $rawApp = '') {
    $fullContent = trim($rawTitle . " " . $rawText);
    $lower = strtolower($fullContent);

    // 1. Deteksi Bank
    $bankId = 'bca';
    $bankName = 'Bank BCA';
    if (strpos($lower, 'mandiri') !== false || strpos($lower, 'livin') !== false || strpos(strtolower($rawApp), 'mandiri') !== false) {
        $bankId = 'mandiri';
        $bankName = 'Bank Mandiri';
    } elseif (strpos($lower, 'bca') !== false || strpos($lower, 'mybca') !== false || strpos(strtolower($rawApp), 'bca') !== false) {
        $bankId = 'bca';
        $bankName = 'Bank BCA';
    } elseif (strpos($lower, 'bri') !== false || strpos($lower, 'brimo') !== false) {
        $bankId = 'bri';
        $bankName = 'Bank BRI';
    } elseif (strpos($lower, 'bni') !== false || strpos($lower, 'wondr') !== false) {
        $bankId = 'bni';
        $bankName = 'Bank BNI';
    }

    // 2. Deteksi Tipe Transaksi (Pemasukan vs Pengeluaran)
    $type = 'out'; // default pengeluaran
    $isIncomePatterns = [
        '/dana masuk/i',
        '/transfer masuk/i',
        '/menerima transfer/i',
        '/uang masuk/i',
        '/kredit/i',
        '/\bc:\s*[\d\.,]+/i',
        '/top up masuk/i',
        '/berhasil menerima/i',
        '/rekening anda dikredit/i'
    ];

    foreach ($isIncomePatterns as $pattern) {
        if (preg_match($pattern, $fullContent)) {
            $type = 'in';
            break;
        }
    }

    // 3. Ekstraksi Nominal (Rupiah)
    $amount = 0;
    $amountPatterns = [
        '/(?:rp\.?|idr)\s*([\d\.,]+)/i',
        '/(?:sebesar|sejumlah|nominal)\s*(?:rp\.?|idr)?\s*([\d\.,]+)/i',
        '/\b[dc]:\s*([\d\.,]+)/i',
        '/\b([\d]{1,3}(?:\.[\d]{3})+(?:,[\d]{2})?)\b/'
    ];

    foreach ($amountPatterns as $pattern) {
        if (preg_match($pattern, $fullContent, $matches)) {
            $rawAmount = trim(rtrim($matches[1], '.,;: '));
            // Bersihkan sen/desimal di akhir (,00 atau .00)
            $rawAmount = preg_replace('/[,\.]00$/', '', $rawAmount);
            // Hapus titik, koma ribuan, atau spasi
            $cleanAmount = preg_replace('/[^\d]/', '', $rawAmount);
            $parsedNum = intval($cleanAmount);
            if ($parsedNum > 0) {
                $amount = $parsedNum;
                break;
            }
        }
    }

    // 4. Ekstraksi Keterangan / Merchant / Lawan Transaksi
    $desc = '';
    if (preg_match('/(?:di|ke|merchant|kepada|tujuan|dari)\s+([a-zA-Z0-9\s\.\-_&]+?)(?:(?=sebesar|pada|tgl|tanggal|rp|idr|saldo|berhasil|\n|\r|$))/i', $fullContent, $matches)) {
        $candidate = trim($matches[1]);
        // Filter candidate jika terlalu panjang atau ada kata tidak relevan
        if (strlen($candidate) > 2 && strlen($candidate) < 50) {
            $desc = ucwords(strtolower($candidate));
        }
    }

    // Jika belum ketemu keterangan, cari pola "berita: ..." atau "ket: ..."
    if (!$desc && preg_match('/(?:berita|keterangan|catatan|ket|pesan):\s*([^\n\r,\.]+)/i', $fullContent, $matches)) {
        $desc = trim($matches[1]);
    }

    if (!$desc) {
        if ($type === 'in') {
            $desc = 'Dana Masuk ' . $bankName;
        } else {
            $desc = (strpos($lower, 'qris') !== false ? 'Pembayaran QRIS' : 'Pengeluaran') . ' ' . $bankName;
        }
    }

    // 5. Smart Category Categorization
    $category = 'Lainnya';
    $descLower = strtolower($desc . " " . $fullContent);

    if (preg_match('/(makan|resto|kopi|cafe|coffee|warung|kuliner|bakso|nasi|mie|food|kitchen|dapur|burger|pizza|martabak)/i', $descLower)) {
        $category = 'Makanan';
    } elseif (preg_match('/(spbu|pertamina|shell|bensin|bbm|parkir|toll|tol|gojek|grab|maxim|ojol|transport)/i', $descLower)) {
        $category = 'Bensin';
    } elseif (preg_match('/(indomaret|alfamart|superindo|hypermart|transmart|toko|belanja|shopee|tokopedia|lazada|tiktok)/i', $descLower)) {
        $category = 'Belanja';
    } elseif (preg_match('/(gaji|payroll|bonus|tunjangan|honor|fee)/i', $descLower)) {
        $category = 'Gaji';
    } elseif (preg_match('/(apotek|kimia farma|k24|dokter|klinik|rumah sakit|rs|obat|sehat)/i', $descLower)) {
        $category = 'Kesehatan';
    } elseif (preg_match('/(bioskop|cinema|xxi|game|steam|playstation|netflix|spotify|hiburan)/i', $descLower)) {
        $category = 'Hiburan';
    }

    $now = new DateTime('now', new DateTimeZone('Asia/Jakarta'));

    return [
        'id' => 'tx_auto_' . round(microtime(true) * 1000) . '_' . substr(md5(uniqid()), 0, 4),
        'bankId' => $bankId,
        'bankName' => $bankName,
        'type' => $type,
        'amount' => $amount,
        'desc' => $desc,
        'category' => $category,
        'date' => $now->format('j M'),
        'fullDate' => $now->format('c'),
        'rawText' => $fullContent,
        'source' => 'webhook_auto'
    ];
}
