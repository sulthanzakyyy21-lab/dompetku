<?php
// Controller / Action Handler: Mengatur logika saat tombol diklik / data dikirim

require_once 'functions.php';

$data = get_data();
$colors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500'];

// Handler Aksi POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add_transaction') {
        $walletId = $_POST['walletId'] ?? '';
        $amount = floatval($_POST['amount'] ?? 0);
        $desc = trim($_POST['desc'] ?? '');
        $type = $_POST['type'] ?? 'out';

        if (!empty($walletId) && $amount > 0) {
            $now = new DateTime();
            $months_id = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            $dateFormatted = $now->format('j') . ' ' . $months_id[(int)$now->format('n')];
            
            $newTx = [
                'walletId' => $walletId,
                'amount' => $amount,
                'desc' => $desc,
                'type' => $type,
                'date' => $dateFormatted,
                'fullDate' => $now->format(DateTime::ATOM)
            ];
            $data['transactions'][] = $newTx;
            save_data($data);
        }
    }

    elseif ($action === 'delete_transaction') {
        $index = intval($_POST['index'] ?? -1);
        if (isset($data['transactions'][$index])) {
            array_splice($data['transactions'], $index, 1);
            save_data($data);
        }
    }

    elseif ($action === 'save_wallet') {
        $editId = $_POST['wallet_edit_id'] ?? '';
        $name = trim($_POST['wallet_name'] ?? '');
        $budget = floatval($_POST['wallet_budget'] ?? 0);
        $maxLimit = floatval($_POST['wallet_max_limit'] ?? 0);
        $monthlyLimit = floatval($_POST['wallet_monthly_limit'] ?? 0);

        if (!empty($name)) {
            if (!empty($editId)) {
                foreach ($data['wallets'] as &$w) {
                    if ($w['id'] === $editId) {
                        $w['name'] = $name;
                        $w['budget'] = $budget;
                        $w['maxLimit'] = $maxLimit;
                        $w['monthlyLimit'] = $monthlyLimit;
                    }
                }
                unset($w);
            } else {
                $newWallet = [
                    'id' => 'w_' . time(),
                    'name' => $name,
                    'budget' => $budget,
                    'maxLimit' => $maxLimit,
                    'monthlyLimit' => $monthlyLimit,
                    'color' => $colors[count($data['wallets']) % count($colors)]
                ];
                $data['wallets'][] = $newWallet;
            }
            save_data($data);
        }
    }

    elseif ($action === 'delete_wallet') {
        $id = $_POST['wallet_id'] ?? '';
        if (count($data['wallets']) > 1) {
            $data['wallets'] = array_values(array_filter($data['wallets'], function($w) use ($id) {
                return $w['id'] !== $id;
            }));
            save_data($data);
        }
    }

    elseif ($action === 'import_data') {
        if (isset($_FILES['import_file']) && $_FILES['import_file']['error'] === UPLOAD_ERR_OK) {
            $content = file_get_contents($_FILES['import_file']['tmp_name']);
            $parsed = json_decode($content, true);
            if (isset($parsed['wallets']) && isset($parsed['transactions'])) {
                $data = $parsed;
                save_data($data);
            }
        }
    }
}

// Handler Export (Backup) via GET
if (isset($_GET['action']) && $_GET['action'] === 'export') {
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="backup_keuangan_' . date('Y-m-d') . '.json"');
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Kembalikan pengguna ke halaman utama setelah proses selesai
header('Location: index.php');
exit;
?>
