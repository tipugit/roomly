<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Missing api/config.php — copy config.example.php and add your database credentials.',
    ]);
    exit;
}

$config = require $configPath;

session_name($config['session_name'] ?? 'roomly_session');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
]);
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function respond_error(string $message, int $code = 400): void
{
    respond(['ok' => false, 'error' => $message], $code);
}

function pdo(array $config): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        $config['db_host'],
        $config['db_name']
    );
    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

function default_settings(string $name, string $email): array
{
    return [
        'houseName' => 'My House',
        'address' => '',
        'currency' => 'USD',
        'timezone' => 'UTC-5 (EST)',
        'language' => 'English',
        'emailBill' => true,
        'emailExpense' => true,
        'emailReminder' => false,
        'smsBill' => false,
        'pushAll' => true,
        'pushPayment' => true,
        'autoSplit' => true,
        'twoFactor' => false,
        'sessionTimeout' => '30 minutes',
        'dataExport' => true,
        'plan' => 'Free',
        'memberCanCreateBills' => true,
        'memberCanEditExpenses' => false,
        'memberCanInvite' => false,
        'adminName' => $name,
        'adminEmail' => $email,
        'adminPassword' => '',
        'globalMessageTitle' => '',
        'globalMessage' => '',
        'parkingTotalSpots' => 0,
        'parkingIncludedInRent' => false,
        'parkingAssignments' => [],
        'roundUpAmounts' => false,
    ];
}

function app_db(): PDO
{
    global $config;
    return pdo($config);
}

function get_house_id(PDO $db, int $userId): int
{
    $stmt = $db->prepare('SELECT id FROM houses WHERE user_id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) {
        respond_error('House not found', 404);
    }
    return (int) $row['id'];
}

function time_ago(string $datetime): string
{
    $ts = strtotime($datetime);
    if ($ts === false) {
        return 'Recently';
    }
    $diff = time() - $ts;
    if ($diff < 60) return 'Just now';
    if ($diff < 3600) return floor($diff / 60) . 'm ago';
    if ($diff < 86400) return floor($diff / 3600) . 'h ago';
    return floor($diff / 86400) . 'd ago';
}

function map_roommate_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'room' => $row['room'],
        'phone' => $row['phone'],
        'email' => $row['email'],
        'status' => $row['status'],
        'joinDate' => $row['join_date'],
        'moveOutDate' => $row['move_out_date'] ?? '',
        'note' => $row['note'] ?? '',
        'share' => $row['share_label'],
        'initials' => $row['initials'],
        'avatarGrad' => $row['avatar_grad'],
        'payStatus' => $row['pay_status'],
        'occupation' => $row['occupation'],
        'color' => $row['color'],
    ];
}

function fetch_full_state(PDO $db, int $houseId): array
{
    $houseStmt = $db->prepare('SELECT active_bill_id, dark_mode, settings_json FROM houses WHERE id = ?');
    $houseStmt->execute([$houseId]);
    $house = $houseStmt->fetch();
    if (!$house) {
        respond_error('House not found', 404);
    }

    $settings = json_decode($house['settings_json'], true);
    if (!is_array($settings)) {
        $settings = default_settings('Admin', '');
    }
    $defaults = default_settings('Admin', '');
    $settings = array_merge($defaults, $settings);

    $roommatesStmt = $db->prepare('SELECT * FROM roommates WHERE house_id = ? ORDER BY id ASC');
    $roommatesStmt->execute([$houseId]);
    $roommates = array_map('map_roommate_row', $roommatesStmt->fetchAll());

    $billsStmt = $db->prepare('SELECT * FROM bills WHERE house_id = ? ORDER BY created_at DESC');
    $billsStmt->execute([$houseId]);
    $billRows = $billsStmt->fetchAll();
    $bills = [];

    foreach ($billRows as $billRow) {
        $billId = $billRow['id'];

        $expStmt = $db->prepare('SELECT * FROM bill_expenses WHERE bill_id = ? ORDER BY id ASC');
        $expStmt->execute([$billId]);
        $expenses = [];
        foreach ($expStmt->fetchAll() as $e) {
            $sharedBy = json_decode($e['shared_by'] ?? 'null', true);
            if (!is_array($sharedBy)) {
                $sharedBy = [];
            }
            $expenses[] = [
                'id' => (int) $e['id'],
                'name' => $e['name'],
                'amount' => (float) $e['amount'],
                'category' => $e['category'],
                'paidBy' => $e['paid_by'] !== null ? (int) $e['paid_by'] : null,
                'note' => $e['note'],
                'icon' => $e['icon'],
                'shareMode' => $e['share_mode'] ?? 'all',
                'sharedBy' => array_map('intval', $sharedBy),
            ];
        }

        $shareStmt = $db->prepare('SELECT * FROM bill_shares WHERE bill_id = ?');
        $shareStmt->execute([$billId]);
        $roommateShares = [];
        foreach ($shareStmt->fetchAll() as $s) {
            $roommateShares[] = [
                'roommateId' => (int) $s['roommate_id'],
                'share' => (float) $s['share_amount'],
                'paid' => (float) $s['paid_amount'],
                'status' => $s['status'],
            ];
        }

        $selected = json_decode($billRow['selected_roommate_ids'], true);
        if (!is_array($selected)) {
            $selected = [];
        }

        $created = date('F j, Y', strtotime($billRow['created_at']));

        $parkingSnapshot = json_decode($billRow['parking_snapshot'] ?? 'null', true);
        if (!is_array($parkingSnapshot)) {
            $parkingSnapshot = null;
        }

        $allPaid = count($roommateShares) > 0;
        foreach ($roommateShares as $rs) {
            if ($rs['status'] !== 'Paid') {
                $allPaid = false;
                break;
            }
        }

        $bills[] = [
            'id' => $billId,
            'title' => $billRow['title'] ?? '',
            'month' => $billRow['month_label'],
            'houseName' => $billRow['house_name'],
            'rent' => (float) $billRow['rent'],
            'expenses' => $expenses,
            'selectedRoommateIds' => array_map('intval', $selected),
            'roommateShares' => $roommateShares,
            'createdAt' => $created,
            'announcementTitle' => $billRow['announcement_title'] ?? '',
            'announcementMessage' => $billRow['announcement_message'] ?? '',
            'parkingSnapshot' => $parkingSnapshot,
            'isExtraBill' => str_starts_with($billRow['month_label'], 'Extra Bill'),
            'completed' => $allPaid,
        ];
    }

    $actStmt = $db->prepare('SELECT * FROM activities WHERE house_id = ? ORDER BY created_at DESC LIMIT 20');
    $actStmt->execute([$houseId]);
    $activities = [];
    foreach ($actStmt->fetchAll() as $a) {
        $activities[] = [
            'id' => (int) $a['id'],
            'icon' => $a['icon'],
            'label' => $a['label'],
            'desc' => $a['description_text'],
            'time' => time_ago($a['created_at']),
            'color' => $a['color'],
            'bg' => $a['bg'],
        ];
    }

    return [
        'roommates' => $roommates,
        'bills' => $bills,
        'activeBillId' => $house['active_bill_id'],
        'settings' => $settings,
        'darkMode' => (bool) $house['dark_mode'],
        'activities' => $activities,
    ];
}

function insert_activity(PDO $db, int $houseId, string $icon, string $label, string $desc, string $color, string $bg): void
{
    $stmt = $db->prepare(
        'INSERT INTO activities (house_id, icon, label, description_text, color, bg) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$houseId, $icon, $label, $desc, $color, $bg]);
}

function pay_status(float $paid, float $share): string
{
    if ($paid >= $share - 0.01) return 'Paid';
    if ($paid > 0) return 'Partial';
    return 'Pending';
}

require __DIR__ . '/multi_home.php';
