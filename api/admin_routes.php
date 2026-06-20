<?php
declare(strict_types=1);

/** Super-admin + multi-home routes (included from index.php). */

// --- HOUSES (multi-home) ---
if ($route === 'houses' && $method === 'GET') {
    $auth = require_auth();
    respond([
        'ok' => true,
        'houses' => list_user_houses($db, $auth['user_id']),
        'activeHouseId' => $auth['house_id'],
    ]);
}

if ($route === 'houses' && $method === 'POST') {
    $auth = require_auth();
    $body = json_input();
    $name = trim($body['name'] ?? '');
    if ($name === '') {
        respond_error('Home name is required.');
    }
    if (strlen($name) > 120) {
        respond_error('Home name is too long.');
    }

    $userStmt = $db->prepare('SELECT name, email FROM users WHERE id = ?');
    $userStmt->execute([$auth['user_id']]);
    $userRow = $userStmt->fetch();
    if (!$userRow) {
        respond_error('User not found.', 404);
    }

    $houseId = create_house_for_user($db, $auth['user_id'], $name, $userRow['name'], $userRow['email']);
    $_SESSION['house_id'] = $houseId;

    respond(auth_session_response($db, $auth['user_id'], $houseId));
}

if ($route === 'houses/switch' && $method === 'POST') {
    $auth = require_auth();
    $body = json_input();
    $houseId = (int) ($body['houseId'] ?? 0);
    if ($houseId <= 0) {
        respond_error('houseId is required.');
    }
    if (!user_has_house_access($db, $auth['user_id'], $houseId)) {
        respond_error('You do not have access to this home.', 403);
    }
    $_SESSION['house_id'] = $houseId;
    respond(auth_session_response($db, $auth['user_id'], $houseId));
}

// --- SUPER ADMIN (legacy routes + extended) ---
require __DIR__ . '/admin_extended_routes.php';

if ($route === 'admin/users' && $method === 'GET') {
    require_super_admin();

    $status = trim($_GET['status'] ?? '');
    $q = trim($_GET['q'] ?? '');
    $sql = admin_user_select_sql($db) . ' WHERE 1=1';
    $params = [];
    if ($status !== '' && schema_column_exists($db, 'users', 'status')) {
        $sql .= ' AND u.status = ?';
        $params[] = $status;
    }
    if ($q !== '') {
        $sql .= ' AND (u.name LIKE ? OR u.email LIKE ?)';
        $params[] = "%{$q}%";
        $params[] = "%{$q}%";
    }
    $sql .= ' ORDER BY u.created_at DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $users = array_map(fn($row) => map_admin_user_row($db, $row), $stmt->fetchAll());

    respond(['ok' => true, 'users' => $users]);
}

if ($route === 'admin/users' && $method === 'POST') {
    $auth = require_super_admin();
    $body = json_input();
    $name = trim($body['name'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $password = $body['password'] ?? '';
    $role = $body['role'] ?? 'user';

    if ($name === '' || $email === '' || strlen($password) < 6) {
        respond_error('Name, email, and password (min 6 chars) are required.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond_error('Invalid email address.');
    }
    if (schema_has_user_role($db) && !in_array($role, ['user', 'super_admin'], true)) {
        respond_error('Invalid role.');
    }

    $check = $db->prepare('SELECT id FROM users WHERE email = ?');
    $check->execute([$email]);
    if ($check->fetch()) {
        respond_error('Email already registered.', 409);
    }

    $db->beginTransaction();
    try {
        if (schema_has_user_role($db)) {
            $stmt = $db->prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)');
            $stmt->execute([$email, password_hash($password, PASSWORD_DEFAULT), $name, $role]);
        } else {
            $stmt = $db->prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)');
            $stmt->execute([$email, password_hash($password, PASSWORD_DEFAULT), $name]);
        }
        $userId = (int) $db->lastInsertId();
        create_house_for_user($db, $userId, 'My House', $name, $email);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        respond_error('Failed to create user.', 500);
    }

    $userStmt = $db->prepare('SELECT id, name, email' . (schema_has_user_role($db) ? ', role' : '') . ' FROM users WHERE id = ?');
    $userStmt->execute([$userId]);
    respond(['ok' => true, 'user' => auth_user_payload($db, $userStmt->fetch())]);
}

if (preg_match('#^admin/users/(\d+)/password$#', $route, $m) && $method === 'PUT') {
    require_super_admin();
    $userId = (int) $m[1];
    $body = json_input();
    $password = $body['password'] ?? '';
    if (strlen($password) < 6) {
        respond_error('Password must be at least 6 characters.');
    }

    $check = $db->prepare('SELECT id FROM users WHERE id = ?');
    $check->execute([$userId]);
    if (!$check->fetch()) {
        respond_error('User not found.', 404);
    }

    $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), $userId]);

    respond(['ok' => true]);
}

if (preg_match('#^admin/users/(\d+)/role$#', $route, $m) && $method === 'PUT') {
    $auth = require_super_admin();
    if (!schema_has_user_role($db)) {
        respond_error('Role management requires database migration.', 501);
    }
    $userId = (int) $m[1];
    $body = json_input();
    $role = $body['role'] ?? '';
    if (!in_array($role, ['user', 'super_admin'], true)) {
        respond_error('Invalid role.');
    }
    if ($userId === $auth['user_id'] && $role !== 'super_admin') {
        respond_error('You cannot remove your own super admin role.');
    }

    $check = $db->prepare('SELECT id FROM users WHERE id = ?');
    $check->execute([$userId]);
    if (!$check->fetch()) {
        respond_error('User not found.', 404);
    }

    $db->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$role, $userId]);
    respond(['ok' => true]);
}

if (preg_match('#^admin/users/(\d+)$#', $route, $m) && $method === 'DELETE') {
    $auth = require_super_admin();
    $userId = (int) $m[1];

    if ($userId === $auth['user_id']) {
        respond_error('You cannot delete your own account from admin.');
    }

    $check = $db->prepare('SELECT id FROM users WHERE id = ?');
    $check->execute([$userId]);
    if (!$check->fetch()) {
        respond_error('User not found.', 404);
    }

    if (schema_has_user_role($db)) {
        $role = get_user_role($db, $userId);
        if ($role === 'super_admin') {
            $count = (int) $db->query("SELECT COUNT(*) AS c FROM users WHERE role = 'super_admin'")->fetch()['c'];
            if ($count <= 1) {
                respond_error('Cannot delete the last super admin.');
            }
        }
    }

    $db->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);
    respond(['ok' => true]);
}

if ($route === 'admin/houses' && $method === 'GET') {
    require_super_admin();

    $nameSelect = schema_has_house_name($db)
        ? 'h.name'
        : "COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(h.settings_json, '$.houseName')), ''), 'My House') AS name";
    $statusCol = schema_column_exists($db, 'houses', 'status') ? ', h.status' : ", 'active' AS status";
    $lastAct = schema_column_exists($db, 'houses', 'last_activity_at') ? ', h.last_activity_at' : ', NULL AS last_activity_at';

    $stmt = $db->query(
        "SELECT h.id, {$nameSelect}, h.created_at, h.user_id{$statusCol}{$lastAct},
          u.name AS owner_name, u.email AS owner_email,
          (SELECT COUNT(*) FROM roommates r WHERE r.house_id = h.id) AS roommate_count,
          (SELECT COUNT(*) FROM bills b WHERE b.house_id = h.id) AS bill_count
         FROM houses h
         LEFT JOIN users u ON u.id = h.user_id
         ORDER BY h.created_at DESC"
    );

    $houses = array_map(fn($row) => [
        'id' => (int) $row['id'],
        'name' => $row['name'] ?? 'House',
        'status' => $row['status'] ?? 'active',
        'ownerId' => (int) $row['user_id'],
        'ownerName' => $row['owner_name'] ?? '',
        'ownerEmail' => $row['owner_email'] ?? '',
        'roommateCount' => (int) $row['roommate_count'],
        'billCount' => (int) $row['bill_count'],
        'createdAt' => $row['created_at'],
        'lastActivityAt' => $row['last_activity_at'] ?? null,
    ], $stmt->fetchAll());

    respond(['ok' => true, 'houses' => $houses]);
}

if (preg_match('#^admin/houses/(\d+)$#', $route, $m) && $method === 'DELETE') {
    require_super_admin();
    $houseId = (int) $m[1];

    $check = $db->prepare('SELECT id FROM houses WHERE id = ?');
    $check->execute([$houseId]);
    if (!$check->fetch()) {
        respond_error('Home not found.', 404);
    }

    $db->prepare('DELETE FROM houses WHERE id = ?')->execute([$houseId]);
    respond(['ok' => true]);
}
