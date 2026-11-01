<?php
// api/webhook.php - Endpoint Webhook Penerima Notifikasi Otomatis
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

// 1. Ekstraksi Token
$providedToken = '';
if (isset($_GET['token'])) {
    $providedToken = $_GET['token'];
} elseif (isset($_SERVER['HTTP_X_API_KEY'])) {
    $providedToken = $_SERVER['HTTP_X_API_KEY'];
} elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $auth = $_SERVER['HTTP_AUTHORIZATION'];
    if (preg_match('/Bearer\s+(.+)/i', $auth, $m)) {
        $providedToken = $m[1];
    }
}

// Baca input body
$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true);

if (empty($providedToken) && is_array($jsonInput) && !empty($jsonInput['token'])) {
    $providedToken = $jsonInput['token'];
} elseif (empty($providedToken) && isset($_POST['token'])) {
    $providedToken = $_POST['token'];
}

// 2. Verifikasi Token Rahasia
if (!verifyApiToken($providedToken)) {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'message' => 'Unauthorized: Token API Rahasia tidak valid atau belum disertakan.',
        'hint' => 'Sertakan ?token=... pada URL webhook Anda.'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// 3. Ekstraksi Teks Notifikasi
$text = '';
$title = '';
$app = '';

if (is_array($jsonInput)) {
    $text = $jsonInput['text'] ?? $jsonInput['body'] ?? $jsonInput['message'] ?? $jsonInput['content'] ?? '';
    $title = $jsonInput['title'] ?? $jsonInput['subject'] ?? '';
    $app = $jsonInput['app'] ?? $jsonInput['package'] ?? $jsonInput['appName'] ?? '';
}

if (empty($text) && !empty($_POST)) {
    $text = $_POST['text'] ?? $_POST['body'] ?? $_POST['message'] ?? '';
    $title = $_POST['title'] ?? '';
    $app = $_POST['app'] ?? '';
}

// Jika body berupa plain text langsung
if (empty($text) && !empty($rawInput) && !is_array($jsonInput)) {
    $text = $rawInput;
}

// Fallback jika dikirim lewat GET untuk testing
if (empty($text) && isset($_GET['text'])) {
    $text = $_GET['text'];
    $title = $_GET['title'] ?? '';
}

if (empty(trim($text))) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Teks notifikasi kosong. Kirimkan parameter "text" atau "body".'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// 4. Parse Notifikasi
$parsed = parseBankNotification($text, $title, $app);

// 5. Simpan ke Queue untuk disinkronkan ke Web Browser
global $queueFile, $dataDir;
$queue = [];
if (file_exists($queueFile)) {
    $content = @file_get_contents($queueFile);
    $decoded = json_decode($content, true);
    if (is_array($decoded)) {
        $queue = $decoded;
    }
}

// Tambahkan ke antrean
$queue[] = $parsed;
@file_put_contents($queueFile, json_encode($queue, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

// Simpan juga ke log history audit (maksimal 50 transaksi terbaru)
$historyFile = $dataDir . '/webhook_history.json';
$history = [];
if (file_exists($historyFile)) {
    $hContent = @file_get_contents($historyFile);
    $hDecoded = json_decode($hContent, true);
    if (is_array($hDecoded)) {
        $history = $hDecoded;
    }
}
array_unshift($history, array_merge($parsed, ['receivedAt' => date('c')]));
$history = array_slice($history, 0, 50);
@file_put_contents($historyFile, json_encode($history, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

// 6. Respon Sukses
echo json_encode([
    'status' => 'success',
    'message' => 'Notifikasi bank berhasil diterima dan diantrekan untuk pembukuan otomatis.',
    'data' => $parsed
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

