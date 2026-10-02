<?php
// Model & Helper Functions: Mengurus data dan operasi file JSON

date_default_timezone_set('Asia/Jakarta');

$data_file = 'dompet_data.json';

$default_data = [
    'wallets' => [
        ['id' => 'holiday', 'name' => 'Holiday', 'budget' => 2900000, 'maxLimit' => 750000, 'monthlyLimit' => 2500000, 'color' => 'bg-emerald-500'],
        ['id' => 'personal', 'name' => 'Keperluan Sendiri', 'budget' => 1600000, 'maxLimit' => 400000, 'monthlyLimit' => 1500000, 'color' => 'bg-blue-500'],
        ['id' => 'emergency', 'name' => 'Dana Darurat', 'budget' => 1500000, 'maxLimit' => 200000, 'monthlyLimit' => 800000, 'color' => 'bg-amber-500']
    ],
    'transactions' => []
];

function get_data() {
    global $data_file, $default_data;
    if (!file_exists($data_file)) {
        file_put_contents($data_file, json_encode($default_data, JSON_PRETTY_PRINT));
        return $default_data;
    }
    $content = file_get_contents($data_file);
    $data = json_decode($content, true);
    return $data ? $data : $default_data;
}

function save_data($data) {
    global $data_file;
    file_put_contents($data_file, json_encode($data, JSON_PRETTY_PRINT));
}

function formatRupiah($number) {
    return 'Rp ' . number_format($number, 0, ',', '.');
}

function isWithinCurrentWeek($dateString) {
    if (empty($dateString)) return false;
    try {
        $txDate = new DateTime($dateString);
        $startOfWeek = new DateTime('monday this week 00:00:00');
        $endOfWeek = new DateTime('sunday this week 23:59:59');
        return $txDate >= $startOfWeek && $txDate <= $endOfWeek;
    } catch (Exception $e) {
        return false;
    }
}

function isWithinCurrentMonth($dateString) {
    if (empty($dateString)) return false;
    try {
        $txDate = new DateTime($dateString);
        $today = new DateTime();
        return $txDate->format('m') === $today->format('m') && $txDate->format('Y') === $today->format('Y');
    } catch (Exception $e) {
        return false;
    }
}
?>