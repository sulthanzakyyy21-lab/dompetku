<?php
// api/sync.php - Sinkronisasi Antara Backend Webhook dan Frontend Web App
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-KEY');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/parser.php';

$action = $_GET['action'] ?? $_POST['action'] ?? 'get_queue';

// Dapatkan host server lokal
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443;
$protocol = $isHttps ? 'https://' : 'http://';
$scriptDir = dirname($_SERVER['SCRIPT_NAME']);
$baseUrl = $protocol . $host . $scriptDir;
$webhookUrl = $baseUrl . '/webhook.php?token=' . getApiToken();

// 1. Dapatkan Informasi Webhook & Token untuk UI
if ($action === 'get_info') {
    $token = getApiToken();
    echo json_encode([
        'status' => 'success',
        'token' => $token,
        'webhookUrl' => $webhookUrl,
        'serverIp' => $_SERVER['SERVER_ADDR'] ?? $host,
        'host' => $host
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// 2. Update Token Baru
if ($action === 'update_token') {
    $newToken = trim($_POST['new_token'] ?? '');
    if (empty($newToken)) {
        $newToken = 'dompetku_' . bin2hex(random_bytes(6));
    }
    global $tokenFile;
    @file_put_contents($tokenFile, $newToken);
    echo json_encode([
        'status' => 'success',
        'message' => 'Token rahasia berhasil diperbarui.',
        'token' => $newToken,
        'webhookUrl' => $baseUrl . '/webhook.php?token=' . $newToken
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// 3. Ambil Antrean Transaksi Masuk untuk Frontend
if ($action === 'get_queue') {
    global $queueFile;
    $queue = [];
    if (file_exists($queueFile)) {
        $content = @file_get_contents($queueFile);
        $decoded = json_decode($content, true);
        if (is_array($decoded)) {
            $queue = $decoded;
        }
    }

    echo json_encode([
        'status' => 'success',
        'count' => count($queue),
        'items' => $queue,
        'token' => getApiToken()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// 4. Konfirmasi Penerimaan (Acknowledge / Bersihkan Queue setelah disimpan ke web)
if ($action === 'ack') {
    global $queueFile;
    @file_put_contents($queueFile, json_encode([], JSON_PRETTY_PRINT));
    echo json_encode([
        'status' => 'success',
        'message' => 'Antrean sinkronisasi telah dibersihkan.'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// 5. Tes Simulasi Notifikasi
if ($action === 'test_simulation') {
    $rawInput = file_get_contents('php://input');
    $json = json_decode($rawInput, true);
    $text = $json['text'] ?? $_POST['text'] ?? '';
    
    if (empty(trim($text))) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Teks simulasi kosong.'], JSON_PRETTY_PRINT);
        exit;
    }

    $parsed = parseBankNotification($text);
    
    // Jika parameter save=1, masukkan juga ke queue
    $save = $json['save'] ?? $_POST['save'] ?? 1;
    if ($save && $parsed['amount'] > 0) {
        global $queueFile;
        $queue = [];
        if (file_exists($queueFile)) {
            $content = @file_get_contents($queueFile);
            $decoded = json_decode($content, true);
            if (is_array($decoded)) $queue = $decoded;
        }
        $queue[] = $parsed;
        @file_put_contents($queueFile, json_encode($queue, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Simulasi berhasil diproses.',
        'data' => $parsed
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Aksi tidak dikenal.'], JSON_PRETTY_PRINT);

