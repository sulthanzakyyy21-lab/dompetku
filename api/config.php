<?php
// api/config.php

$dataDir = __DIR__ . '/../data';
$tokenFile = $dataDir . '/token.txt';
$queueFile = $dataDir . '/webhook_queue.json';

// Dapatkan atau buat token rahasia default jika belum ada
function getApiToken() {
    global $tokenFile, $dataDir;
    if (!is_dir($dataDir)) {
        @mkdir($dataDir, 0755, true);
    }
    if (file_exists($tokenFile)) {
        $token = trim(@file_get_contents($tokenFile));
        if (!empty($token)) {
            return $token;
        }
    }
    // Buat token default aman
    $newToken = 'dompetku_' . bin2hex(random_bytes(6));
    @file_put_contents($tokenFile, $newToken);
    return $newToken;
}

function verifyApiToken($providedToken) {
    if (empty($providedToken)) return false;
    $validToken = getApiToken();
    return hash_equals($validToken, trim($providedToken));
}

