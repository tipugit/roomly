<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$route = $_GET['route'] ?? '';
$route = trim($route, '/');

try {
    $db = pdo($config);
} catch (Throwable $e) {
    respond_error('Database connection failed. Check api/config.php credentials.', 500);
}

// --- AUTH ---
if ($route === 'auth/register' && $method === 'POST') {
    $body = json_input();
    $name = trim($body['name'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $password = $body['password'] ?? '';

    if ($name === '' || $email === '' || strlen($password) < 6) {
        respond_error('Name, email, and password (min 6 chars) are required.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond_error('Invalid email address.');
    }

    $check = $db->prepare('SELECT id FROM users WHERE email = ?');
    $check->execute([$email]);
    if ($check->fetch()) {
        respond_error('Email already registered.', 409);
    }

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)');
        $stmt->execute([$email, password_hash($password, PASSWORD_DEFAULT), $name]);
        $userId = (int) $db->lastInsertId();

        $settings = default_settings($name, $email);
        $houseStmt = $db->prepare('INSERT INTO houses (user_id, settings_json) VALUES (?, ?)');
        $houseStmt->execute([$userId, json_encode($settings)]);
        $houseId = (int) $db->lastInsertId();

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        respond_error('Registration failed.', 500);
    }

    $_SESSION['user_id'] = $userId;
    $_SESSION['house_id'] = $houseId;

    respond([
        'ok' => true,
        'user' => ['id' => $userId, 'name' => $name, 'email' => $email],
        'state' => fetch_full_state($db, $houseId),
    ]);
}

if ($route === 'auth/login' && $method === 'POST') {
    $body = json_input();
    $email = strtolower(trim($body['email'] ?? ''));
    $password = $body['password'] ?? '';

    $stmt = $db->prepare('SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        respond_error('Invalid email or password.', 401);
    }

    $houseId = get_house_id($db, (int) $user['id']);
    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['house_id'] = $houseId;

    respond([
        'ok' => true,
        'user' => [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
        ],
        'state' => fetch_full_state($db, $houseId),
    ]);
}

if ($route === 'auth/logout' && $method === 'POST') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    respond(['ok' => true]);
}

if ($route === 'auth/me' && $method === 'GET') {
    if (empty($_SESSION['user_id'])) {
        respond(['ok' => true, 'user' => null]);
    }
    $stmt = $db->prepare('SELECT id, name, email FROM users WHERE id = ?');
    $stmt->execute([(int) $_SESSION['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        respond(['ok' => true, 'user' => null]);
    }
    $houseId = (int) $_SESSION['house_id'];
    respond([
        'ok' => true,
        'user' => [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
        ],
        'state' => fetch_full_state($db, $houseId),
    ]);
}

// --- SYNC ---
if ($route === 'sync' && $method === 'GET') {
    $auth = require_auth();
    respond(['ok' => true, 'state' => fetch_full_state($db, $auth['house_id'])]);
}

// --- ROOMMATES ---
if ($route === 'roommates' && $method === 'POST') {
    $auth = require_auth();
    $body = json_input();
    $name = trim($body['name'] ?? '');
    if ($name === '') respond_error('Name is required.');

    $initials = strtoupper(implode('', array_map(fn($p) => $p[0] ?? '', explode(' ', $name))));
    $initials = substr($initials, 0, 2);
    $colors = [
        ['#4F46E5', 'linear-gradient(135deg, #4F46E5, #7C3AED)'],
        ['#06B6D4', 'linear-gradient(135deg, #06B6D4, #0891B2)'],
        ['#10B981', 'linear-gradient(135deg, #10B981, #059669)'],
        ['#F59E0B', 'linear-gradient(135deg, #F59E0B, #D97706)'],
        ['#8B5CF6', 'linear-gradient(135deg, #8B5CF6, #7C3AED)'],
    ];
    $countStmt = $db->prepare('SELECT COUNT(*) AS c FROM roommates WHERE house_id = ?');
    $countStmt->execute([$auth['house_id']]);
    $idx = (int) $countStmt->fetch()['c'];
    $color = $colors[$idx % count($colors)];

    $stmt = $db->prepare(
        'INSERT INTO roommates (house_id, name, room, phone, email, status, occupation, join_date, share_label, initials, avatar_grad, pay_status, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $auth['house_id'],
        $name,
        $body['room'] ?? '',
        $body['phone'] ?? '',
        $body['email'] ?? '',
        $body['status'] ?? 'Active',
        $body['occupation'] ?? '',
        date('M Y'),
        '$0',
        $initials,
        $color[1],
        'Pending',
        $color[0],
    ]);
    $id = (int) $db->lastInsertId();

    insert_activity($db, $auth['house_id'], 'UserPlus', 'New roommate added', "$name joined", '#10B981', '#ECFDF5');

    $rowStmt = $db->prepare('SELECT * FROM roommates WHERE id = ?');
    $rowStmt->execute([$id]);
    respond(['ok' => true, 'roommate' => map_roommate_row($rowStmt->fetch())]);
}

if (preg_match('#^roommates/(\d+)$#', $route, $m)) {
    $auth = require_auth();
    $id = (int) $m[1];

    if ($method === 'PUT') {
        $body = json_input();
        $fields = [];
        $params = [];
        $map = [
            'name' => 'name', 'room' => 'room', 'phone' => 'phone', 'email' => 'email',
            'status' => 'status', 'occupation' => 'occupation', 'share' => 'share_label',
            'payStatus' => 'pay_status', 'color' => 'color', 'avatarGrad' => 'avatar_grad',
            'initials' => 'initials', 'joinDate' => 'join_date',
        ];
        foreach ($map as $jsonKey => $col) {
            if (array_key_exists($jsonKey, $body)) {
                $fields[] = "$col = ?";
                $params[] = $body[$jsonKey];
            }
        }
        if (!$fields) respond_error('No fields to update.');
        $params[] = $id;
        $params[] = $auth['house_id'];
        $sql = 'UPDATE roommates SET ' . implode(', ', $fields) . ' WHERE id = ? AND house_id = ?';
        $db->prepare($sql)->execute($params);

        $rowStmt = $db->prepare('SELECT * FROM roommates WHERE id = ? AND house_id = ?');
        $rowStmt->execute([$id, $auth['house_id']]);
        $row = $rowStmt->fetch();
        if (!$row) respond_error('Roommate not found.', 404);
        respond(['ok' => true, 'roommate' => map_roommate_row($row)]);
    }

    if ($method === 'DELETE') {
        $stmt = $db->prepare('DELETE FROM roommates WHERE id = ? AND house_id = ?');
        $stmt->execute([$id, $auth['house_id']]);
        respond(['ok' => true]);
    }
}

// --- BILLS ---
if ($route === 'bills' && $method === 'POST') {
    $auth = require_auth();
    $body = json_input();
    $billId = 'bill-' . time() . '-' . bin2hex(random_bytes(4));
    $month = $body['month'] ?? '';
    $houseName = $body['houseName'] ?? '';
    $rent = (float) ($body['rent'] ?? 0);
    $expenses = $body['expenses'] ?? [];
    $selected = $body['selectedRoommateIds'] ?? [];
    $shares = $body['roommateShares'] ?? [];
    $announcementTitle = trim($body['announcementTitle'] ?? '');
    $announcementMessage = trim($body['announcementMessage'] ?? '');
    $parkingSnapshot = $body['parkingSnapshot'] ?? null;
    $isExtraBill = !empty($body['isExtraBill']);

    if (!is_array($expenses) || !is_array($selected) || !is_array($shares)) {
        respond_error('Invalid bill payload.');
    }

    $parkingJson = is_array($parkingSnapshot) ? json_encode($parkingSnapshot) : null;

    $db->beginTransaction();
    try {
        $stmt = $db->prepare(
            'INSERT INTO bills (id, house_id, month_label, house_name, rent, selected_roommate_ids, announcement_title, announcement_message, parking_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $billId,
            $auth['house_id'],
            $month,
            $houseName,
            $rent,
            json_encode($selected),
            $announcementTitle !== '' ? $announcementTitle : null,
            $announcementMessage !== '' ? $announcementMessage : null,
            $parkingJson,
        ]);

        foreach ($expenses as $e) {
            $shareMode = ($e['shareMode'] ?? 'all') === 'selected' ? 'selected' : 'all';
            $sharedBy = $e['sharedBy'] ?? [];
            if (!is_array($sharedBy)) {
                $sharedBy = [];
            }
            $expStmt = $db->prepare(
                'INSERT INTO bill_expenses (bill_id, name, amount, category, paid_by, note, icon, share_mode, shared_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $expStmt->execute([
                $billId,
                $e['name'] ?? $e['category'] ?? 'Expense',
                (float) ($e['amount'] ?? 0),
                $e['category'] ?? 'Other',
                isset($e['paidBy']) ? (int) $e['paidBy'] : null,
                $e['note'] ?? null,
                $e['icon'] ?? null,
                $shareMode,
                !empty($sharedBy) ? json_encode(array_map('intval', $sharedBy)) : null,
            ]);
        }

        foreach ($shares as $s) {
            $shareStmt = $db->prepare(
                'INSERT INTO bill_shares (bill_id, roommate_id, share_amount, paid_amount, status) VALUES (?, ?, ?, ?, ?)'
            );
            $shareStmt->execute([
                $billId,
                (int) $s['roommateId'],
                (float) $s['share'],
                (float) $s['paid'],
                $s['status'] ?? 'Pending',
            ]);
        }

        $db->prepare('UPDATE houses SET active_bill_id = ? WHERE id = ?')->execute([$billId, $auth['house_id']]);

        $total = $rent;
        foreach ($expenses as $e) {
            $total += (float) ($e['amount'] ?? 0);
        }
        insert_activity($db, $auth['house_id'], 'FileText', 'Monthly bill created', "$month — $" . number_format($total) . ' total', '#4F46E5', '#EEF2FF');

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        respond_error('Failed to create bill.', 500);
    }

    $state = fetch_full_state($db, $auth['house_id']);
    $bill = null;
    foreach ($state['bills'] as $b) {
        if ($b['id'] === $billId) {
            $bill = $b;
            break;
        }
    }
    respond(['ok' => true, 'bill' => $bill, 'state' => $state]);
}

if (preg_match('#^bills/([^/]+)/duplicate$#', $route, $m) && $method === 'POST') {
    $auth = require_auth();
    $sourceId = $m[1];
    $check = $db->prepare('SELECT * FROM bills WHERE id = ? AND house_id = ?');
    $check->execute([$sourceId, $auth['house_id']]);
    $source = $check->fetch();
    if (!$source) respond_error('Bill not found.', 404);

    $newId = 'bill-' . time() . '-' . bin2hex(random_bytes(4));
    $db->beginTransaction();
    try {
        $db->prepare(
            'INSERT INTO bills (id, house_id, month_label, house_name, rent, selected_roommate_ids, announcement_title, announcement_message, parking_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $newId,
            $auth['house_id'],
            $source['month_label'] . ' (Copy)',
            $source['house_name'],
            $source['rent'],
            $source['selected_roommate_ids'],
            $source['announcement_title'],
            $source['announcement_message'],
            $source['parking_snapshot'],
        ]);

        $expStmt = $db->prepare('SELECT * FROM bill_expenses WHERE bill_id = ?');
        $expStmt->execute([$sourceId]);
        foreach ($expStmt->fetchAll() as $e) {
            $db->prepare(
                'INSERT INTO bill_expenses (bill_id, name, amount, category, paid_by, note, icon, share_mode, shared_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                $newId, $e['name'], $e['amount'], $e['category'], $e['paid_by'],
                $e['note'], $e['icon'], $e['share_mode'], $e['shared_by'],
            ]);
        }

        $shareStmt = $db->prepare('SELECT * FROM bill_shares WHERE bill_id = ?');
        $shareStmt->execute([$sourceId]);
        foreach ($shareStmt->fetchAll() as $s) {
            $db->prepare(
                'INSERT INTO bill_shares (bill_id, roommate_id, share_amount, paid_amount, status) VALUES (?, ?, ?, 0, ?)'
            )->execute([$newId, $s['roommate_id'], $s['share_amount'], 'Pending']);
        }

        $db->prepare('UPDATE houses SET active_bill_id = ? WHERE id = ?')->execute([$newId, $auth['house_id']]);
        insert_activity($db, $auth['house_id'], 'FileText', 'Bill duplicated', $source['month_label'] . ' copied', '#4F46E5', '#EEF2FF');
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        respond_error('Failed to duplicate bill.', 500);
    }
    respond(['ok' => true, 'state' => fetch_full_state($db, $auth['house_id'])]);
}

if (preg_match('#^bills/([^/]+)/complete$#', $route, $m) && $method === 'PUT') {
    $auth = require_auth();
    $billId = $m[1];
    $check = $db->prepare('SELECT id FROM bills WHERE id = ? AND house_id = ?');
    $check->execute([$billId, $auth['house_id']]);
    if (!$check->fetch()) respond_error('Bill not found.', 404);

    $db->prepare(
        'UPDATE bill_shares SET paid_amount = share_amount, status = ? WHERE bill_id = ?'
    )->execute(['Paid', $billId]);

    insert_activity($db, $auth['house_id'], 'CheckCircle2', 'Bill completed', 'All payments marked paid', '#10B981', '#ECFDF5');
    respond(['ok' => true, 'state' => fetch_full_state($db, $auth['house_id'])]);
}

if (preg_match('#^bills/([^/]+)$#', $route, $m) && $method === 'DELETE') {
    $auth = require_auth();
    $billId = $m[1];
    $check = $db->prepare('SELECT id FROM bills WHERE id = ? AND house_id = ?');
    $check->execute([$billId, $auth['house_id']]);
    if (!$check->fetch()) respond_error('Bill not found.', 404);

    $db->beginTransaction();
    try {
        $db->prepare('DELETE FROM share_tokens WHERE bill_id = ?')->execute([$billId]);
        $db->prepare('DELETE FROM bill_shares WHERE bill_id = ?')->execute([$billId]);
        $db->prepare('DELETE FROM bill_expenses WHERE bill_id = ?')->execute([$billId]);
        $db->prepare('DELETE FROM bills WHERE id = ? AND house_id = ?')->execute([$billId, $auth['house_id']]);
        $db->prepare('UPDATE houses SET active_bill_id = NULL WHERE id = ? AND active_bill_id = ?')->execute([$auth['house_id'], $billId]);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        respond_error('Failed to delete bill.', 500);
    }
    insert_activity($db, $auth['house_id'], 'Trash2', 'Bill deleted', 'A bill was removed', '#EF4444', '#FEF2F2');
    respond(['ok' => true, 'state' => fetch_full_state($db, $auth['house_id'])]);
}

if ($route === 'bills/active' && $method === 'PUT') {
    $auth = require_auth();
    $body = json_input();
    $billId = $body['activeBillId'] ?? null;
    $db->prepare('UPDATE houses SET active_bill_id = ? WHERE id = ?')->execute([$billId, $auth['house_id']]);
    respond(['ok' => true]);
}

if (preg_match('#^bills/([^/]+)/payment$#', $route, $m) && $method === 'PUT') {
    $auth = require_auth();
    $billId = $m[1];
    $body = json_input();
    $roommateId = (int) ($body['roommateId'] ?? 0);
    $paid = (float) ($body['paid'] ?? 0);

    $check = $db->prepare('SELECT id FROM bills WHERE id = ? AND house_id = ?');
    $check->execute([$billId, $auth['house_id']]);
    if (!$check->fetch()) respond_error('Bill not found.', 404);

    $shareStmt = $db->prepare('SELECT share_amount FROM bill_shares WHERE bill_id = ? AND roommate_id = ?');
    $shareStmt->execute([$billId, $roommateId]);
    $shareRow = $shareStmt->fetch();
    if (!$shareRow) respond_error('Share not found.', 404);

    $status = pay_status($paid, (float) $shareRow['share_amount']);
    $upd = $db->prepare('UPDATE bill_shares SET paid_amount = ?, status = ? WHERE bill_id = ? AND roommate_id = ?');
    $upd->execute([$paid, $status, $billId, $roommateId]);

    $db->prepare('UPDATE roommates SET pay_status = ? WHERE id = ? AND house_id = ?')->execute([$status, $roommateId, $auth['house_id']]);

    $nameStmt = $db->prepare('SELECT name FROM roommates WHERE id = ?');
    $nameStmt->execute([$roommateId]);
    $rm = $nameStmt->fetch();
    if ($rm) {
        insert_activity($db, $auth['house_id'], 'DollarSign', 'Payment updated', $rm['name'] . " — $$paid recorded", '#06B6D4', '#ECFEFF');
    }

    respond(['ok' => true, 'state' => fetch_full_state($db, $auth['house_id'])]);
}

// --- SETTINGS ---
if ($route === 'settings' && $method === 'PUT') {
    $auth = require_auth();
    $body = json_input();
    $settings = $body['settings'] ?? null;
    $darkMode = $body['darkMode'] ?? null;
    if (!is_array($settings)) respond_error('Settings object required.');

    $db->prepare('UPDATE houses SET settings_json = ? WHERE id = ?')->execute([json_encode($settings), $auth['house_id']]);
    if ($darkMode !== null) {
        $db->prepare('UPDATE houses SET dark_mode = ? WHERE id = ?')->execute([(int) (bool) $darkMode, $auth['house_id']]);
    }
    respond(['ok' => true, 'state' => fetch_full_state($db, $auth['house_id'])]);
}

// --- SHARE (public) ---
if (preg_match('#^share/([a-zA-Z0-9]+)$#', $route, $m) && $method === 'GET') {
    $token = $m[1];
    $stmt = $db->prepare('SELECT bill_id, house_id FROM share_tokens WHERE token = ?');
    $stmt->execute([$token]);
    $link = $stmt->fetch();
    if (!$link) respond_error('Share link not found.', 404);

    $state = fetch_full_state($db, (int) $link['house_id']);
    $bill = null;
    foreach ($state['bills'] as $b) {
        if ($b['id'] === $link['bill_id']) {
            $bill = $b;
            break;
        }
    }
    if (!$bill) respond_error('Bill not found.', 404);

    $roommates = array_values(array_filter($state['roommates'], fn($r) => in_array($r['id'], $bill['selectedRoommateIds'], true)));

    respond([
        'ok' => true,
        'payload' => [
            'bill' => $bill,
            'roommates' => array_map(fn($r) => [
                'id' => $r['id'],
                'name' => $r['name'],
                'room' => $r['room'],
                'initials' => $r['initials'],
                'color' => $r['color'],
            ], $roommates),
            'houseName' => $state['settings']['houseName'] ?? $bill['houseName'],
            'address' => $state['settings']['address'] ?? '',
            'globalMessageTitle' => $state['settings']['globalMessageTitle'] ?? '',
            'globalMessage' => $state['settings']['globalMessage'] ?? '',
        ],
    ]);
}

if ($route === 'share' && $method === 'POST') {
    $auth = require_auth();
    $body = json_input();
    $billId = $body['billId'] ?? '';
    $check = $db->prepare('SELECT id FROM bills WHERE id = ? AND house_id = ?');
    $check->execute([$billId, $auth['house_id']]);
    if (!$check->fetch()) respond_error('Bill not found.', 404);

    $token = bin2hex(random_bytes(4));
    $db->prepare('INSERT INTO share_tokens (token, bill_id, house_id) VALUES (?, ?, ?)')->execute([$token, $billId, $auth['house_id']]);

    insert_activity($db, $auth['house_id'], 'Link2', 'Share link generated', 'Bill shared publicly', '#EC4899', '#FDF2F8');

    respond(['ok' => true, 'token' => $token]);
}

// --- ACCOUNT RESET ---
if ($route === 'account' && $method === 'DELETE') {
    $auth = require_auth();
    $db->beginTransaction();
    try {
        $db->prepare('DELETE FROM activities WHERE house_id = ?')->execute([$auth['house_id']]);
        $db->prepare('DELETE FROM share_tokens WHERE house_id = ?')->execute([$auth['house_id']]);
        $db->prepare('DELETE FROM bill_shares WHERE bill_id IN (SELECT id FROM bills WHERE house_id = ?)')->execute([$auth['house_id']]);
        $db->prepare('DELETE FROM bill_expenses WHERE bill_id IN (SELECT id FROM bills WHERE house_id = ?)')->execute([$auth['house_id']]);
        $db->prepare('DELETE FROM bills WHERE house_id = ?')->execute([$auth['house_id']]);
        $db->prepare('DELETE FROM roommates WHERE house_id = ?')->execute([$auth['house_id']]);
        $db->prepare('UPDATE houses SET active_bill_id = NULL WHERE id = ?')->execute([$auth['house_id']]);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        respond_error('Reset failed.', 500);
    }
    respond(['ok' => true, 'state' => fetch_full_state($db, $auth['house_id'])]);
}

respond_error('Not found', 404);
