<?php
declare(strict_types=1);

/** Extended SaaS admin API routes (included from admin_routes.php). */

// --- Enhanced dashboard ---
if ($route === 'admin/dashboard' && $method === 'GET') {
    require_super_admin();
    $recentStmt = $db->query(admin_user_select_sql($db) . ' ORDER BY u.created_at DESC LIMIT 8');
    $recentUsers = array_map(fn($r) => map_admin_user_row($db, $r), $recentStmt->fetchAll());
    respond([
        'ok' => true,
        'stats' => admin_dashboard_stats($db),
        'charts' => admin_dashboard_charts($db),
        'recentUsers' => $recentUsers,
        'health' => system_health($db),
    ]);
}

// Legacy stats endpoint
if ($route === 'admin/stats' && $method === 'GET') {
    require_super_admin();
    $stats = admin_dashboard_stats($db);
    $recentStmt = $db->query(admin_user_select_sql($db) . ' ORDER BY u.created_at DESC LIMIT 8');
    $recentUsers = array_map(fn($r) => map_admin_user_row($db, $r), $recentStmt->fetchAll());
    respond([
        'ok' => true,
        'stats' => [
            'users' => $stats['totalUsers'],
            'houses' => $stats['totalHouses'],
            'bills' => $stats['totalBills'],
            'roommates' => $stats['totalMembers'],
            ...$stats,
        ],
        'charts' => admin_dashboard_charts($db),
        'recentUsers' => $recentUsers,
    ]);
}

// --- User detail / update / status ---
if (preg_match('#^admin/users/(\d+)$#', $route, $m) && $method === 'GET') {
    require_super_admin();
    $userId = (int) $m[1];
    $stmt = $db->prepare(admin_user_select_sql($db) . ' WHERE u.id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) respond_error('User not found.', 404);
    respond(['ok' => true, 'user' => map_admin_user_row($db, $row)]);
}

if (preg_match('#^admin/users/(\d+)$#', $route, $m) && $method === 'PUT') {
    $auth = require_super_admin();
    $userId = (int) $m[1];
    $body = json_input();

    $beforeStmt = $db->prepare(admin_user_select_sql($db) . ' WHERE u.id = ?');
    $beforeStmt->execute([$userId]);
    $before = $beforeStmt->fetch();
    if (!$before) respond_error('User not found.', 404);

    $fields = [];
    $params = [];
    if (isset($body['name'])) { $fields[] = 'name = ?'; $params[] = trim($body['name']); }
    if (isset($body['email'])) { $fields[] = 'email = ?'; $params[] = strtolower(trim($body['email'])); }
    if (isset($body['phone']) && schema_column_exists($db, 'users', 'phone')) {
        $fields[] = 'phone = ?'; $params[] = trim($body['phone']);
    }
    if (isset($body['planId']) && schema_column_exists($db, 'users', 'plan_id')) {
        $fields[] = 'plan_id = ?'; $params[] = (int) $body['planId'];
    }
    if (!empty($fields)) {
        $params[] = $userId;
        $db->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
    }

    $afterStmt = $db->prepare(admin_user_select_sql($db) . ' WHERE u.id = ?');
    $afterStmt->execute([$userId]);
    $after = map_admin_user_row($db, $afterStmt->fetch());
    log_audit($db, real_user_id(), 'user.updated', 'user', (string) $userId, map_admin_user_row($db, $before), $after);
    log_platform_activity($db, 'user.updated', "User #{$userId} updated", $userId, real_user_id(), 'user', (string) $userId);
    respond(['ok' => true, 'user' => $after]);
}

if (preg_match('#^admin/users/(\d+)/status$#', $route, $m) && $method === 'PUT') {
    $auth = require_super_admin();
    $userId = (int) $m[1];
    $body = json_input();
    $status = $body['status'] ?? '';
    if (!schema_column_exists($db, 'users', 'status')) {
        respond_error('User status requires migration 003.', 501);
    }
    if (!in_array($status, ['active', 'suspended', 'disabled'], true)) {
        respond_error('Invalid status.');
    }
    if ($userId === real_user_id()) respond_error('Cannot change your own status.');
    $db->prepare('UPDATE users SET status = ? WHERE id = ?')->execute([$status, $userId]);
    log_audit($db, real_user_id(), 'user.status', 'user', (string) $userId, null, ['status' => $status]);
    log_platform_activity($db, 'user.status', "User #{$userId} set to {$status}", $userId, real_user_id());
    respond(['ok' => true]);
}

if (preg_match('#^admin/users/(\d+)/impersonate$#', $route, $m) && $method === 'POST') {
    $auth = require_super_admin();
    $targetId = (int) $m[1];
    if ($targetId === real_user_id()) respond_error('Cannot impersonate yourself.');
    $check = $db->prepare('SELECT id, name FROM users WHERE id = ?');
    $check->execute([$targetId]);
    $target = $check->fetch();
    if (!$target) respond_error('User not found.', 404);

    $_SESSION['impersonator_id'] = real_user_id();
    $_SESSION['user_id'] = $targetId;
    $houseId = resolve_user_house($db, $targetId);
    $_SESSION['house_id'] = $houseId;

    log_platform_activity($db, 'user.impersonate', "Impersonating {$target['name']}", $targetId, $_SESSION['impersonator_id']);
    log_audit($db, (int) $_SESSION['impersonator_id'], 'user.impersonate', 'user', (string) $targetId, null, ['target' => $target['name']]);

    respond(array_merge(auth_session_response($db, $targetId, $houseId), [
        'impersonating' => true,
        'impersonatorId' => (int) $_SESSION['impersonator_id'],
    ]));
}

if ($route === 'admin/impersonate/stop' && $method === 'POST') {
    if (empty($_SESSION['impersonator_id'])) respond_error('Not impersonating.');
    $adminId = (int) $_SESSION['impersonator_id'];
    unset($_SESSION['impersonator_id']);
    $_SESSION['user_id'] = $adminId;
    $houseId = resolve_user_house($db, $adminId);
    $_SESSION['house_id'] = $houseId;
    log_platform_activity($db, 'user.impersonate_stop', 'Stopped impersonation', $adminId, $adminId);
    respond(auth_session_response($db, $adminId, $houseId));
}

// --- Houses enhanced ---
if (preg_match('#^admin/houses/(\d+)$#', $route, $m) && $method === 'GET') {
    require_super_admin();
    $houseId = (int) $m[1];
    $nameSelect = schema_has_house_name($db) ? 'h.name' : "COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(h.settings_json, '$.houseName')), ''), 'My House') AS name";
    $statusCol = schema_column_exists($db, 'houses', 'status') ? ', h.status' : ", 'active' AS status";
    $lastAct = schema_column_exists($db, 'houses', 'last_activity_at') ? ', h.last_activity_at' : ', NULL AS last_activity_at';
    $stmt = $db->prepare(
        "SELECT h.id, {$nameSelect}, h.created_at, h.user_id{$statusCol}{$lastAct},
          u.name AS owner_name, u.email AS owner_email,
          (SELECT COUNT(*) FROM roommates r WHERE r.house_id = h.id) AS roommate_count,
          (SELECT COUNT(*) FROM bills b WHERE b.house_id = h.id) AS bill_count
         FROM houses h LEFT JOIN users u ON u.id = h.user_id WHERE h.id = ?"
    );
    $stmt->execute([$houseId]);
    $row = $stmt->fetch();
    if (!$row) respond_error('House not found.', 404);
    respond(['ok' => true, 'house' => [
        'id' => (int) $row['id'],
        'name' => $row['name'] ?? 'House',
        'status' => $row['status'] ?? 'active',
        'ownerId' => (int) $row['user_id'],
        'ownerName' => $row['owner_name'] ?? '',
        'ownerEmail' => $row['owner_email'] ?? '',
        'roommateCount' => (int) $row['roommate_count'],
        'billCount' => (int) $row['bill_count'],
        'createdAt' => $row['created_at'],
        'lastActivityAt' => $row['last_activity_at'],
    ]]);
}

if (preg_match('#^admin/houses/(\d+)$#', $route, $m) && $method === 'PUT') {
    $auth = require_super_admin();
    $houseId = (int) $m[1];
    $body = json_input();
    if (isset($body['name']) && schema_has_house_name($db)) {
        $db->prepare('UPDATE houses SET name = ? WHERE id = ?')->execute([trim($body['name']), $houseId]);
    }
    if (isset($body['status']) && schema_column_exists($db, 'houses', 'status')) {
        if (!in_array($body['status'], ['active', 'suspended', 'archived'], true)) {
            respond_error('Invalid house status.');
        }
        $db->prepare('UPDATE houses SET status = ? WHERE id = ?')->execute([$body['status'], $houseId]);
    }
    log_platform_activity($db, 'house.updated', "House #{$houseId} updated", null, real_user_id(), 'house', (string) $houseId);
    respond(['ok' => true]);
}

// --- Feature toggles ---
if ($route === 'admin/features' && $method === 'GET') {
    require_super_admin();
    respond(['ok' => true, 'features' => platform_features($db)]);
}
if ($route === 'admin/features' && $method === 'PUT') {
    $auth = require_super_admin();
    $body = json_input();
    $features = array_merge(platform_features($db), is_array($body['features'] ?? null) ? $body['features'] : $body);
    set_platform_setting($db, 'features', $features, real_user_id());
    log_audit($db, real_user_id(), 'features.updated', 'platform', 'features', platform_features($db), $features);
    respond(['ok' => true, 'features' => $features]);
}

// --- Branding ---
if ($route === 'admin/branding' && $method === 'GET') {
    require_super_admin();
    respond(['ok' => true, 'branding' => platform_branding($db)]);
}
if ($route === 'admin/branding' && $method === 'PUT') {
    $auth = require_super_admin();
    $body = json_input();
    $branding = array_merge(platform_branding($db), is_array($body['branding'] ?? null) ? $body['branding'] : $body);
    set_platform_setting($db, 'branding', $branding, real_user_id());
    respond(['ok' => true, 'branding' => $branding]);
}

// --- Global settings ---
if ($route === 'admin/global-settings' && $method === 'GET') {
    require_super_admin();
    respond(['ok' => true, 'settings' => platform_global_settings($db)]);
}
if ($route === 'admin/global-settings' && $method === 'PUT') {
    $auth = require_super_admin();
    $body = json_input();
    $settings = array_merge(platform_global_settings($db), is_array($body['settings'] ?? null) ? $body['settings'] : $body);
    set_platform_setting($db, 'global', $settings, real_user_id());
    respond(['ok' => true, 'settings' => $settings]);
}

// --- Public platform config (authenticated) ---
if ($route === 'platform/config' && $method === 'GET') {
    $auth = require_auth();
    respond([
        'ok' => true,
        'features' => platform_features($db),
        'branding' => platform_branding($db),
        'announcements' => active_platform_announcements($db),
        'impersonating' => is_impersonating(),
        'impersonatorId' => is_impersonating() ? (int) $_SESSION['impersonator_id'] : null,
    ]);
}

// --- Announcements CRUD ---
if ($route === 'admin/announcements' && $method === 'GET') {
    require_super_admin();
    if (!schema_table_exists($db, 'platform_announcements')) respond(['ok' => true, 'announcements' => []]);
    $rows = $db->query('SELECT * FROM platform_announcements ORDER BY is_pinned DESC, created_at DESC')->fetchAll();
    respond(['ok' => true, 'announcements' => array_map(fn($r) => [
        'id' => (int) $r['id'], 'title' => $r['title'], 'body' => $r['body'],
        'type' => $r['type'], 'isPinned' => (bool) $r['is_pinned'],
        'expiresAt' => $r['expires_at'], 'createdAt' => $r['created_at'],
    ], $rows)]);
}
if ($route === 'admin/announcements' && $method === 'POST') {
    $auth = require_super_admin();
    $body = json_input();
    $title = trim($body['title'] ?? '');
    if ($title === '') respond_error('Title required.');
    $stmt = $db->prepare(
        'INSERT INTO platform_announcements (title, body, type, is_pinned, expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $title, $body['body'] ?? '', $body['type'] ?? 'info',
        (int) (bool) ($body['isPinned'] ?? false),
        !empty($body['expiresAt']) ? $body['expiresAt'] : null,
        real_user_id(),
    ]);
    respond(['ok' => true, 'id' => (int) $db->lastInsertId()]);
}
if (preg_match('#^admin/announcements/(\d+)$#', $route, $m) && $method === 'PUT') {
    require_super_admin();
    $id = (int) $m[1];
    $body = json_input();
    $db->prepare(
        'UPDATE platform_announcements SET title=?, body=?, type=?, is_pinned=?, expires_at=? WHERE id=?'
    )->execute([
        trim($body['title'] ?? ''), $body['body'] ?? '', $body['type'] ?? 'info',
        (int) (bool) ($body['isPinned'] ?? false),
        !empty($body['expiresAt']) ? $body['expiresAt'] : null, $id,
    ]);
    respond(['ok' => true]);
}
if (preg_match('#^admin/announcements/(\d+)$#', $route, $m) && $method === 'DELETE') {
    require_super_admin();
    $db->prepare('DELETE FROM platform_announcements WHERE id = ?')->execute([(int) $m[1]]);
    respond(['ok' => true]);
}

// --- Email templates ---
if ($route === 'admin/email-templates' && $method === 'GET') {
    require_super_admin();
    if (!schema_table_exists($db, 'email_templates')) respond(['ok' => true, 'templates' => []]);
    $rows = $db->query('SELECT template_key, name, subject, body_html, updated_at FROM email_templates ORDER BY template_key')->fetchAll();
    respond(['ok' => true, 'templates' => array_map(fn($r) => [
        'key' => $r['template_key'], 'name' => $r['name'], 'subject' => $r['subject'],
        'bodyHtml' => $r['body_html'], 'updatedAt' => $r['updated_at'],
    ], $rows)]);
}
if (preg_match('#^admin/email-templates/([a-z_]+)$#', $route, $m) && $method === 'PUT') {
    $auth = require_super_admin();
    $key = $m[1];
    $body = json_input();
    $db->prepare('UPDATE email_templates SET subject=?, body_html=?, updated_by=? WHERE template_key=?')
        ->execute([$body['subject'] ?? '', $body['bodyHtml'] ?? '', real_user_id(), $key]);
    respond(['ok' => true]);
}

// --- Activity logs ---
if ($route === 'admin/activity-logs' && $method === 'GET') {
    require_super_admin();
    if (!schema_table_exists($db, 'platform_activity_logs')) respond(['ok' => true, 'logs' => []]);
    $q = trim($_GET['q'] ?? '');
    $action = trim($_GET['action'] ?? '');
    $sql = 'SELECT l.*, u.name AS user_name, a.name AS actor_name FROM platform_activity_logs l
            LEFT JOIN users u ON u.id = l.user_id LEFT JOIN users a ON a.id = l.actor_id WHERE 1=1';
    $params = [];
    if ($q !== '') { $sql .= ' AND l.description LIKE ?'; $params[] = "%{$q}%"; }
    if ($action !== '') { $sql .= ' AND l.action = ?'; $params[] = $action; }
    $sql .= ' ORDER BY l.created_at DESC LIMIT 200';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    respond(['ok' => true, 'logs' => array_map(fn($r) => [
        'id' => (int) $r['id'], 'action' => $r['action'], 'description' => $r['description'],
        'userName' => $r['user_name'], 'actorName' => $r['actor_name'],
        'entityType' => $r['entity_type'], 'entityId' => $r['entity_id'],
        'ipAddress' => $r['ip_address'], 'userAgent' => $r['user_agent'],
        'createdAt' => $r['created_at'],
    ], $stmt->fetchAll())]);
}

// --- Audit logs ---
if ($route === 'admin/audit-logs' && $method === 'GET') {
    require_super_admin();
    if (!schema_table_exists($db, 'audit_logs')) respond(['ok' => true, 'logs' => []]);
    $rows = $db->query(
        'SELECT a.*, u.name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.created_at DESC LIMIT 200'
    )->fetchAll();
    respond(['ok' => true, 'logs' => array_map(fn($r) => [
        'id' => (int) $r['id'], 'action' => $r['action'], 'entityType' => $r['entity_type'],
        'entityId' => $r['entity_id'], 'before' => json_decode($r['before_json'] ?? 'null', true),
        'after' => json_decode($r['after_json'] ?? 'null', true), 'actorName' => $r['actor_name'],
        'ipAddress' => $r['ip_address'], 'createdAt' => $r['created_at'],
    ], $rows)]);
}

// --- Login history ---
if ($route === 'admin/login-history' && $method === 'GET') {
    require_super_admin();
    if (!schema_table_exists($db, 'login_history')) respond(['ok' => true, 'history' => []]);
    $userId = (int) ($_GET['userId'] ?? 0);
    $sql = 'SELECT l.*, u.name, u.email FROM login_history l JOIN users u ON u.id = l.user_id';
    $params = [];
    if ($userId > 0) { $sql .= ' WHERE l.user_id = ?'; $params[] = $userId; }
    $sql .= ' ORDER BY l.created_at DESC LIMIT 200';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    respond(['ok' => true, 'history' => array_map(fn($r) => [
        'id' => (int) $r['id'], 'userId' => (int) $r['user_id'], 'userName' => $r['name'],
        'email' => $r['email'], 'ipAddress' => $r['ip_address'], 'browser' => $r['browser'],
        'device' => $r['device'], 'location' => $r['location'],
        'isSuspicious' => (bool) $r['is_suspicious'], 'createdAt' => $r['created_at'],
    ], $stmt->fetchAll())]);
}

// --- Subscription plans ---
if ($route === 'admin/plans' && $method === 'GET') {
    require_super_admin();
    if (!schema_table_exists($db, 'subscription_plans')) respond(['ok' => true, 'plans' => []]);
    $rows = $db->query('SELECT * FROM subscription_plans ORDER BY sort_order')->fetchAll();
    respond(['ok' => true, 'plans' => array_map(fn($r) => [
        'id' => (int) $r['id'], 'slug' => $r['slug'], 'name' => $r['name'],
        'memberLimit' => (int) $r['member_limit'], 'houseLimit' => (int) $r['house_limit'],
        'billLimit' => (int) $r['bill_limit'], 'storageLimitMb' => (int) $r['storage_limit_mb'],
        'features' => json_decode($r['features_json'], true),
        'priceMonthly' => (float) $r['price_monthly'], 'isActive' => (bool) $r['is_active'],
    ], $rows)]);
}
if (preg_match('#^admin/plans/(\d+)$#', $route, $m) && $method === 'PUT') {
    require_super_admin();
    $id = (int) $m[1];
    $body = json_input();
    $db->prepare(
        'UPDATE subscription_plans SET member_limit=?, house_limit=?, bill_limit=?, storage_limit_mb=?, features_json=?, price_monthly=? WHERE id=?'
    )->execute([
        (int) ($body['memberLimit'] ?? 10), (int) ($body['houseLimit'] ?? 1),
        (int) ($body['billLimit'] ?? 50), (int) ($body['storageLimitMb'] ?? 100),
        json_encode($body['features'] ?? []), (float) ($body['priceMonthly'] ?? 0), $id,
    ]);
    respond(['ok' => true]);
}

// --- Support tickets (admin) ---
if ($route === 'admin/tickets' && $method === 'GET') {
    require_super_admin();
    if (!schema_table_exists($db, 'support_tickets')) respond(['ok' => true, 'tickets' => []]);
    $rows = $db->query(
        'SELECT t.*, u.name AS user_name, u.email FROM support_tickets t JOIN users u ON u.id = t.user_id ORDER BY t.updated_at DESC LIMIT 200'
    )->fetchAll();
    respond(['ok' => true, 'tickets' => array_map(fn($r) => [
        'id' => (int) $r['id'], 'subject' => $r['subject'], 'status' => $r['status'],
        'priority' => $r['priority'], 'userName' => $r['user_name'], 'userEmail' => $r['email'],
        'createdAt' => $r['created_at'], 'updatedAt' => $r['updated_at'],
    ], $rows)]);
}
if (preg_match('#^admin/tickets/(\d+)$#', $route, $m) && $method === 'GET') {
    require_super_admin();
    $id = (int) $m[1];
    $t = $db->prepare('SELECT t.*, u.name AS user_name FROM support_tickets t JOIN users u ON u.id=t.user_id WHERE t.id=?');
    $t->execute([$id]);
    $ticket = $t->fetch();
    if (!$ticket) respond_error('Ticket not found.', 404);
    $msgs = $db->prepare('SELECT m.*, u.name FROM support_ticket_messages m JOIN users u ON u.id=m.user_id WHERE m.ticket_id=? ORDER BY m.created_at');
    $msgs->execute([$id]);
    respond(['ok' => true, 'ticket' => [
        'id' => (int) $ticket['id'], 'subject' => $ticket['subject'], 'status' => $ticket['status'],
        'priority' => $ticket['priority'], 'userName' => $ticket['user_name'],
        'messages' => array_map(fn($m) => [
            'id' => (int) $m['id'], 'message' => $m['message'], 'userName' => $m['name'],
            'isStaff' => (bool) $m['is_staff'], 'createdAt' => $m['created_at'],
        ], $msgs->fetchAll()),
    ]]);
}
if (preg_match('#^admin/tickets/(\d+)/reply$#', $route, $m) && $method === 'POST') {
    $auth = require_super_admin();
    $id = (int) $m[1];
    $body = json_input();
    $msg = trim($body['message'] ?? '');
    if ($msg === '') respond_error('Message required.');
    $db->prepare('INSERT INTO support_ticket_messages (ticket_id, user_id, message, is_staff) VALUES (?, ?, ?, 1)')
        ->execute([$id, real_user_id(), $msg]);
    $status = $body['status'] ?? 'pending';
    $priority = $body['priority'] ?? null;
    if ($priority) {
        $db->prepare('UPDATE support_tickets SET status=?, priority=?, updated_at=NOW() WHERE id=?')->execute([$status, $priority, $id]);
    } else {
        $db->prepare('UPDATE support_tickets SET status=?, updated_at=NOW() WHERE id=?')->execute([$status, $id]);
    }
    respond(['ok' => true]);
}

// --- User support tickets ---
if ($route === 'support/tickets' && $method === 'GET') {
    $auth = require_auth();
    if (!platform_features($db)['supportCenter'] ?? true) respond_error('Support center disabled.', 403);
    if (!schema_table_exists($db, 'support_tickets')) respond(['ok' => true, 'tickets' => []]);
    $stmt = $db->prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY updated_at DESC');
    $stmt->execute([$auth['user_id']]);
    respond(['ok' => true, 'tickets' => array_map(fn($r) => [
        'id' => (int) $r['id'], 'subject' => $r['subject'], 'status' => $r['status'],
        'priority' => $r['priority'], 'createdAt' => $r['created_at'], 'updatedAt' => $r['updated_at'],
    ], $stmt->fetchAll())]);
}
if ($route === 'support/tickets' && $method === 'POST') {
    $auth = require_auth();
    $body = json_input();
    $subject = trim($body['subject'] ?? '');
    $message = trim($body['message'] ?? '');
    if ($subject === '' || $message === '') respond_error('Subject and message required.');
    $db->prepare('INSERT INTO support_tickets (user_id, subject, priority) VALUES (?, ?, ?)')
        ->execute([$auth['user_id'], $subject, $body['priority'] ?? 'medium']);
    $ticketId = (int) $db->lastInsertId();
    $db->prepare('INSERT INTO support_ticket_messages (ticket_id, user_id, message) VALUES (?, ?, ?)')
        ->execute([$ticketId, $auth['user_id'], $message]);
    create_platform_notification($db, 'support', 'New support ticket', $subject, ['ticketId' => $ticketId]);
    respond(['ok' => true, 'ticketId' => $ticketId]);
}

// --- Backups ---
if ($route === 'admin/backups' && $method === 'GET') {
    require_super_admin();
    if (!schema_table_exists($db, 'platform_backups')) respond(['ok' => true, 'backups' => []]);
    $rows = $db->query('SELECT * FROM platform_backups ORDER BY created_at DESC LIMIT 50')->fetchAll();
    respond(['ok' => true, 'backups' => array_map(fn($r) => [
        'id' => (int) $r['id'], 'filename' => $r['filename'], 'sizeBytes' => (int) $r['size_bytes'],
        'status' => $r['status'], 'createdAt' => $r['created_at'],
    ], $rows)]);
}
if ($route === 'admin/backups' && $method === 'POST') {
    $auth = require_super_admin();
    $filename = 'backup_' . date('Y-m-d_His') . '.json';
    $tables = ['users', 'houses', 'roommates', 'bills', 'bill_expenses', 'bill_shares'];
    $export = [];
    foreach ($tables as $table) {
        try {
            $export[$table] = $db->query("SELECT * FROM {$table}")->fetchAll();
        } catch (Throwable $e) {
            $export[$table] = [];
        }
    }
    $json = json_encode($export);
    $size = strlen($json);
    $dir = __DIR__ . '/backups';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents("{$dir}/{$filename}", $json);
    if (schema_table_exists($db, 'platform_backups')) {
        $db->prepare('INSERT INTO platform_backups (filename, size_bytes, status, created_by) VALUES (?, ?, ?, ?)')
            ->execute([$filename, $size, 'completed', real_user_id()]);
    }
    respond(['ok' => true, 'filename' => $filename, 'sizeBytes' => $size]);
}
if (preg_match('#^admin/backups/(\d+)/download$#', $route, $m) && $method === 'GET') {
    require_super_admin();
    $id = (int) $m[1];
    $row = $db->prepare('SELECT filename FROM platform_backups WHERE id = ?');
    $row->execute([$id]);
    $b = $row->fetch();
    if (!$b) respond_error('Backup not found.', 404);
    $path = __DIR__ . '/backups/' . $b['filename'];
    if (!file_exists($path)) respond_error('Backup file missing.', 404);
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="' . $b['filename'] . '"');
    readfile($path);
    exit;
}

// --- Storage ---
if ($route === 'admin/storage' && $method === 'GET') {
    require_super_admin();
    $total = 0; $files = []; $byUser = [];
    if (schema_table_exists($db, 'stored_files')) {
        $total = (int) $db->query('SELECT COALESCE(SUM(size_bytes),0) AS s FROM stored_files')->fetch()['s'];
        $files = $db->query('SELECT f.*, u.name AS user_name FROM stored_files f LEFT JOIN users u ON u.id=f.user_id ORDER BY size_bytes DESC LIMIT 50')->fetchAll();
        $byUser = $db->query('SELECT u.name, u.email, COALESCE(SUM(f.size_bytes),0) AS total FROM users u LEFT JOIN stored_files f ON f.user_id=u.id GROUP BY u.id ORDER BY total DESC LIMIT 20')->fetchAll();
    }
    respond(['ok' => true, 'totalBytes' => $total, 'fileCount' => count($files), 'largestFiles' => array_map(fn($f) => [
        'id' => (int) $f['id'], 'filename' => $f['filename'], 'sizeBytes' => (int) $f['size_bytes'],
        'userName' => $f['user_name'] ?? '', 'createdAt' => $f['created_at'],
    ], $files), 'userUsage' => array_map(fn($u) => [
        'name' => $u['name'], 'email' => $u['email'], 'totalBytes' => (int) $u['total'],
    ], $byUser)]);
}
if (preg_match('#^admin/storage/(\d+)$#', $route, $m) && $method === 'DELETE') {
    require_super_admin();
    $id = (int) $m[1];
    $row = $db->prepare('SELECT path FROM stored_files WHERE id = ?');
    $row->execute([$id]);
    $f = $row->fetch();
    if ($f && file_exists($f['path'])) @unlink($f['path']);
    $db->prepare('DELETE FROM stored_files WHERE id = ?')->execute([$id]);
    respond(['ok' => true]);
}

// --- Admin notifications ---
if ($route === 'admin/notifications' && $method === 'GET') {
    require_super_admin();
    if (!schema_table_exists($db, 'platform_notifications')) respond(['ok' => true, 'notifications' => []]);
    $rows = $db->query('SELECT * FROM platform_notifications ORDER BY created_at DESC LIMIT 100')->fetchAll();
    respond(['ok' => true, 'notifications' => array_map(fn($r) => [
        'id' => (int) $r['id'], 'type' => $r['type'], 'title' => $r['title'], 'body' => $r['body'],
        'isRead' => (bool) $r['is_read'], 'createdAt' => $r['created_at'],
    ], $rows)]);
}
if ($route === 'admin/notifications/read' && $method === 'PUT') {
    require_super_admin();
    $db->query('UPDATE platform_notifications SET is_read = 1 WHERE is_read = 0');
    respond(['ok' => true]);
}

// --- System health ---
if ($route === 'admin/health' && $method === 'GET') {
    require_super_admin();
    respond(['ok' => true, 'health' => system_health($db)]);
}

// --- CSV export ---
if ($route === 'admin/export/users' && $method === 'GET') {
    require_super_admin();
    $rows = $db->query(admin_user_select_sql($db) . ' ORDER BY u.created_at DESC')->fetchAll();
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="users.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['ID', 'Name', 'Email', 'Status', 'Plan', 'Houses', 'Created']);
    foreach ($rows as $r) {
        $u = map_admin_user_row($db, $r);
        fputcsv($out, [$u['id'], $u['name'], $u['email'], $u['status'] ?? 'active', $u['planName'] ?? '', $u['houseCount'], $u['createdAt']]);
    }
    fclose($out);
    exit;
}
