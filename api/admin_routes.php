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

// --- SUPER ADMIN ---
if ($route === 'admin/stats' && $method === 'GET') {
    require_super_admin();

    $users = (int) $db->query('SELECT COUNT(*) AS c FROM users')->fetch()['c'];
    $houses = (int) $db->query('SELECT COUNT(*) AS c FROM houses')->fetch()['c'];
    $bills = (int) $db->query('SELECT COUNT(*) AS c FROM bills')->fetch()['c'];
    $roommates = (int) $db->query('SELECT COUNT(*) AS c FROM roommates')->fetch()['c'];

    $recentStmt = $db->query(
        'SELECT id, name, email, created_at' .
        (schema_has_user_role($db) ? ', role' : '') .
        ' FROM users ORDER BY created_at DESC LIMIT 8'
    );
    $recentUsers = array_map(function ($row) use ($db) {
        $payload = auth_user_payload($db, $row);
        $payload['createdAt'] = $row['created_at'];
        return $payload;
    }, $recentStmt->fetchAll());

    respond([
        'ok' => true,
        'stats' => [
            'users' => $users,
            'houses' => $houses,
            'bills' => $bills,
            'roommates' => $roommates,
        ],
        'recentUsers' => $recentUsers,
    ]);
}

if ($route === 'admin/users' && $method === 'GET') {
    require_super_admin();

    $sql = 'SELECT u.id, u.name, u.email, u.created_at';
    if (schema_has_user_role($db)) {
        $sql .= ', u.role';
    }
    $sql .= ', (SELECT COUNT(*) FROM house_memberships hm WHERE hm.user_id = u.id) AS house_count';
    if (!schema_has_memberships($db)) {
        $sql = 'SELECT u.id, u.name, u.email, u.created_at' .
            (schema_has_user_role($db) ? ', u.role' : '') .
            ', (SELECT COUNT(*) FROM houses h WHERE h.user_id = u.id) AS house_count';
    }
    $sql .= ' FROM users u ORDER BY u.created_at DESC';

    $rows = $db->query($sql)->fetchAll();
    $users = array_map(function ($row) use ($db) {
        $payload = auth_user_payload($db, $row);
        $payload['createdAt'] = $row['created_at'];
        $payload['houseCount'] = (int) $row['house_count'];
        return $payload;
    }, $rows);

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

    $stmt = $db->query(
        "SELECT h.id, {$nameSelect}, h.created_at, h.user_id,
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
        'ownerId' => (int) $row['user_id'],
        'ownerName' => $row['owner_name'] ?? '',
        'ownerEmail' => $row['owner_email'] ?? '',
        'roommateCount' => (int) $row['roommate_count'],
        'billCount' => (int) $row['bill_count'],
        'createdAt' => $row['created_at'],
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
