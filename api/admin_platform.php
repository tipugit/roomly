<?php
declare(strict_types=1);

/** Platform helpers for SaaS admin (included from bootstrap.php). */

function schema_table_exists(PDO $db, string $table): bool
{
    static $cache = [];
    if (isset($cache[$table])) return $cache[$table];
    try {
        $stmt = $db->prepare('SHOW TABLES LIKE ?');
        $stmt->execute([$table]);
        $cache[$table] = (bool) $stmt->fetch();
    } catch (Throwable $e) {
        $cache[$table] = false;
    }
    return $cache[$table];
}

function schema_column_exists(PDO $db, string $table, string $column): bool
{
    static $cache = [];
    $key = "$table.$column";
    if (isset($cache[$key])) return $cache[$key];
    try {
        $stmt = $db->prepare("SHOW COLUMNS FROM `{$table}` LIKE ?");
        $stmt->execute([$column]);
        $cache[$key] = (bool) $stmt->fetch();
    } catch (Throwable $e) {
        $cache[$key] = false;
    }
    return $cache[$key];
}

function client_ip(): string
{
    $keys = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];
    foreach ($keys as $key) {
        if (!empty($_SERVER[$key])) {
            $ip = explode(',', (string) $_SERVER[$key])[0];
            return trim($ip);
        }
    }
    return '';
}

function client_user_agent(): string
{
    return substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 512);
}

function parse_user_agent(string $ua): array
{
    $browser = 'Unknown';
    $device = 'Desktop';
    if (stripos($ua, 'Mobile') !== false || stripos($ua, 'Android') !== false || stripos($ua, 'iPhone') !== false) {
        $device = 'Mobile';
    } elseif (stripos($ua, 'Tablet') !== false || stripos($ua, 'iPad') !== false) {
        $device = 'Tablet';
    }
    if (stripos($ua, 'Chrome') !== false) $browser = 'Chrome';
    elseif (stripos($ua, 'Firefox') !== false) $browser = 'Firefox';
    elseif (stripos($ua, 'Safari') !== false) $browser = 'Safari';
    elseif (stripos($ua, 'Edge') !== false) $browser = 'Edge';
    return ['browser' => $browser, 'device' => $device];
}

function get_platform_setting(PDO $db, string $key, array $default = []): array
{
    if (!schema_table_exists($db, 'platform_settings')) {
        return $default;
    }
    $stmt = $db->prepare('SELECT setting_value FROM platform_settings WHERE setting_key = ? LIMIT 1');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    if (!$row) return $default;
    $val = json_decode($row['setting_value'], true);
    return is_array($val) ? array_merge($default, $val) : $default;
}

function set_platform_setting(PDO $db, string $key, array $value, ?int $updatedBy = null): void
{
    if (!schema_table_exists($db, 'platform_settings')) {
        respond_error('Platform settings table missing. Run migration 003.', 501);
    }
    $stmt = $db->prepare(
        'INSERT INTO platform_settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)'
    );
    $stmt->execute([$key, json_encode($value), $updatedBy]);
}

function platform_features(PDO $db): array
{
    return get_platform_setting($db, 'features', [
        'parking' => true,
        'announcements' => true,
        'pdfExport' => true,
        'emailNotifications' => true,
        'qrSharing' => true,
        'analytics' => true,
        'attachments' => true,
        'supportCenter' => true,
        'publicBillLinks' => true,
    ]);
}

function platform_branding(PDO $db): array
{
    $branding = get_platform_setting($db, 'branding', [
        'platformName' => 'Roomly',
        'logoUrl' => '',
        'faviconUrl' => '',
        'loginLogoUrl' => '',
        'footerText' => '© Roomly · Secure shared household bills',
        'supportEmail' => 'hello@otipu.com',
        'supportPhone' => '',
        'websiteUrl' => 'https://rent.otipu.com',
    ]);

    if (!empty($branding['websiteUrl'])) {
        $url = trim((string) $branding['websiteUrl']);
        $url = trim(explode('#', $url)[0]);
        if (!preg_match('#^https?://#i', $url)) {
            $url = 'https://' . ltrim($url, '/');
        }
        $branding['websiteUrl'] = rtrim($url, '/');
    } else {
        $branding['websiteUrl'] = 'https://rent.otipu.com';
    }

    return $branding;
}

function platform_global_settings(PDO $db): array
{
    return get_platform_setting($db, 'global', [
        'defaultCurrency' => 'USD',
        'dateFormat' => 'MM/DD/YYYY',
        'timezone' => 'UTC-5 (EST)',
        'language' => 'English',
        'defaultTheme' => 'light',
        'registrationEnabled' => true,
    ]);
}

function log_platform_activity(
    PDO $db,
    string $action,
    string $description,
    ?int $userId = null,
    ?int $actorId = null,
    ?string $entityType = null,
    ?string $entityId = null,
    ?array $meta = null
): void {
    if (!schema_table_exists($db, 'platform_activity_logs')) return;
    $stmt = $db->prepare(
        'INSERT INTO platform_activity_logs (user_id, actor_id, action, entity_type, entity_id, description, meta_json, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $userId,
        $actorId,
        $action,
        $entityType,
        $entityId,
        $description,
        $meta !== null ? json_encode($meta) : null,
        client_ip(),
        client_user_agent(),
    ]);
}

function log_audit(
    PDO $db,
    int $actorId,
    string $action,
    string $entityType,
    string $entityId,
    ?array $before,
    ?array $after
): void {
    if (!schema_table_exists($db, 'audit_logs')) return;
    $stmt = $db->prepare(
        'INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before_json, after_json, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $actorId,
        $action,
        $entityType,
        $entityId,
        $before !== null ? json_encode($before) : null,
        $after !== null ? json_encode($after) : null,
        client_ip(),
    ]);
}

function record_login_history(PDO $db, int $userId): void
{
    if (!schema_table_exists($db, 'login_history')) return;
    $ua = client_user_agent();
    $parsed = parse_user_agent($ua);
    $ip = client_ip();

    $suspicious = 0;
    $prev = $db->prepare('SELECT ip_address FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
    $prev->execute([$userId]);
    $last = $prev->fetch();
    if ($last && $last['ip_address'] && $last['ip_address'] !== $ip) {
        $suspicious = 1;
    }

    $stmt = $db->prepare(
        'INSERT INTO login_history (user_id, ip_address, browser, device, is_suspicious) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $ip, $parsed['browser'], $parsed['device'], $suspicious]);

    if (schema_column_exists($db, 'users', 'last_login_at')) {
        $db->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([$userId]);
    }
}

function create_platform_notification(PDO $db, string $type, string $title, string $body, ?array $meta = null): void
{
    if (!schema_table_exists($db, 'platform_notifications')) return;
    $stmt = $db->prepare(
        'INSERT INTO platform_notifications (type, title, body, meta_json) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$type, $title, $body, $meta !== null ? json_encode($meta) : null]);
}

function touch_house_activity(PDO $db, int $houseId): void
{
    if (!schema_column_exists($db, 'houses', 'last_activity_at')) return;
    $db->prepare('UPDATE houses SET last_activity_at = NOW() WHERE id = ?')->execute([$houseId]);
}

function effective_user_id(): int
{
    return (int) ($_SESSION['user_id'] ?? 0);
}

function real_user_id(): int
{
    if (!empty($_SESSION['impersonator_id'])) {
        return (int) $_SESSION['impersonator_id'];
    }
    return effective_user_id();
}

function is_impersonating(): bool
{
    return !empty($_SESSION['impersonator_id']);
}

function map_admin_user_row(PDO $db, array $row): array
{
    $userId = (int) $row['id'];
    $payload = auth_user_payload($db, $row);
    $payload['phone'] = $row['phone'] ?? '';
    $payload['status'] = $row['status'] ?? 'active';
    $payload['planId'] = isset($row['plan_id']) ? (int) $row['plan_id'] : 1;
    $payload['planName'] = $row['plan_name'] ?? 'Free';
    $payload['createdAt'] = $row['created_at'] ?? null;
    $payload['lastLoginAt'] = $row['last_login_at'] ?? null;
    $payload['houseCount'] = (int) ($row['house_count'] ?? 0);
    $payload['memberCount'] = (int) ($row['member_count'] ?? 0);
    $payload['billCount'] = (int) ($row['bill_count'] ?? 0);
    $payload['expenseCount'] = (int) ($row['expense_count'] ?? 0);
    return $payload;
}

function admin_user_select_sql(PDO $db): string
{
    $roleCol = schema_has_user_role($db) ? ', u.role' : '';
    $extra = '';
    if (schema_column_exists($db, 'users', 'phone')) $extra .= ', u.phone';
    if (schema_column_exists($db, 'users', 'status')) $extra .= ', u.status';
    if (schema_column_exists($db, 'users', 'plan_id')) $extra .= ', u.plan_id';
    if (schema_column_exists($db, 'users', 'last_login_at')) $extra .= ', u.last_login_at';

    $houseCount = schema_has_memberships($db)
        ? '(SELECT COUNT(*) FROM house_memberships hm WHERE hm.user_id = u.id)'
        : '(SELECT COUNT(*) FROM houses h WHERE h.user_id = u.id)';

    $planJoin = schema_table_exists($db, 'subscription_plans')
        ? 'LEFT JOIN subscription_plans sp ON sp.id = u.plan_id'
        : '';
    $planName = schema_table_exists($db, 'subscription_plans') ? ', sp.name AS plan_name' : ", 'Free' AS plan_name";

    return "SELECT u.id, u.name, u.email, u.created_at{$roleCol}{$extra}{$planName},
      {$houseCount} AS house_count,
      (SELECT COUNT(*) FROM roommates r JOIN houses h ON h.id = r.house_id WHERE h.user_id = u.id) AS member_count,
      (SELECT COUNT(*) FROM bills b JOIN houses h ON h.id = b.house_id WHERE h.user_id = u.id) AS bill_count,
      (SELECT COUNT(*) FROM bill_expenses e JOIN bills b ON b.id = e.bill_id JOIN houses h ON h.id = b.house_id WHERE h.user_id = u.id) AS expense_count
      FROM users u {$planJoin}";
}

function admin_dashboard_stats(PDO $db): array
{
    $users = (int) $db->query('SELECT COUNT(*) AS c FROM users')->fetch()['c'];
    $houses = (int) $db->query('SELECT COUNT(*) AS c FROM houses')->fetch()['c'];
    $bills = (int) $db->query('SELECT COUNT(*) AS c FROM bills')->fetch()['c'];
    $roommates = (int) $db->query('SELECT COUNT(*) AS c FROM roommates')->fetch()['c'];
    $expenses = (int) $db->query('SELECT COUNT(*) AS c FROM bill_expenses')->fetch()['c'];

    $activeUsers = $users;
    if (schema_column_exists($db, 'users', 'status')) {
        $activeUsers = (int) $db->query("SELECT COUNT(*) AS c FROM users WHERE status = 'active'")->fetch()['c'];
    }

    $newThisMonth = (int) $db->query(
        "SELECT COUNT(*) AS c FROM users WHERE created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')"
    )->fetch()['c'];

    $announcements = 0;
    if (schema_table_exists($db, 'platform_announcements')) {
        $announcements = (int) $db->query('SELECT COUNT(*) AS c FROM platform_announcements')->fetch()['c'];
    }

    $openTickets = 0;
    if (schema_table_exists($db, 'support_tickets')) {
        $openTickets = (int) $db->query("SELECT COUNT(*) AS c FROM support_tickets WHERE status IN ('open','pending')")->fetch()['c'];
    }

    $storageBytes = 0;
    $fileCount = 0;
    if (schema_table_exists($db, 'stored_files')) {
        $row = $db->query('SELECT COALESCE(SUM(size_bytes),0) AS s, COUNT(*) AS c FROM stored_files')->fetch();
        $storageBytes = (int) ($row['s'] ?? 0);
        $fileCount = (int) ($row['c'] ?? 0);
    }

    return [
        'totalUsers' => $users,
        'activeUsers' => $activeUsers,
        'totalHouses' => $houses,
        'totalMembers' => $roommates,
        'totalBills' => $bills,
        'totalExpenses' => $expenses,
        'storageBytes' => $storageBytes,
        'fileCount' => $fileCount,
        'newRegistrationsThisMonth' => $newThisMonth,
        'totalAnnouncements' => $announcements,
        'openSupportTickets' => $openTickets,
    ];
}

function admin_dashboard_charts(PDO $db): array
{
    $userGrowth = [];
    for ($i = 5; $i >= 0; $i--) {
        $month = date('Y-m', strtotime("-{$i} months"));
        $label = date('M Y', strtotime("-{$i} months"));
        $stmt = $db->prepare("SELECT COUNT(*) AS c FROM users WHERE DATE_FORMAT(created_at, '%Y-%m') = ?");
        $stmt->execute([$month]);
        $userGrowth[] = ['month' => $label, 'users' => (int) $stmt->fetch()['c']];
    }

    $billGrowth = [];
    for ($i = 5; $i >= 0; $i--) {
        $month = date('Y-m', strtotime("-{$i} months"));
        $label = date('M Y', strtotime("-{$i} months"));
        $stmt = $db->prepare("SELECT COUNT(*) AS c FROM bills WHERE DATE_FORMAT(created_at, '%Y-%m') = ?");
        $stmt->execute([$month]);
        $billGrowth[] = ['month' => $label, 'bills' => (int) $stmt->fetch()['c']];
    }

    $houseGrowth = [];
    for ($i = 5; $i >= 0; $i--) {
        $month = date('Y-m', strtotime("-{$i} months"));
        $label = date('M Y', strtotime("-{$i} months"));
        $stmt = $db->prepare("SELECT COUNT(*) AS c FROM houses WHERE DATE_FORMAT(created_at, '%Y-%m') = ?");
        $stmt->execute([$month]);
        $houseGrowth[] = ['month' => $label, 'houses' => (int) $stmt->fetch()['c']];
    }

    $activeTrend = [];
    if (schema_column_exists($db, 'users', 'last_login_at')) {
        for ($i = 5; $i >= 0; $i--) {
            $month = date('Y-m', strtotime("-{$i} months"));
            $label = date('M Y', strtotime("-{$i} months"));
            $stmt = $db->prepare("SELECT COUNT(*) AS c FROM users WHERE last_login_at IS NOT NULL AND DATE_FORMAT(last_login_at, '%Y-%m') = ?");
            $stmt->execute([$month]);
            $activeTrend[] = ['month' => $label, 'active' => (int) $stmt->fetch()['c']];
        }
    } else {
        $activeTrend = $userGrowth;
    }

    return [
        'userGrowth' => $userGrowth,
        'billGrowth' => $billGrowth,
        'houseGrowth' => $houseGrowth,
        'activeUserTrend' => $activeTrend,
    ];
}

function system_health(PDO $db): array
{
    $dbOk = true;
    try {
        $db->query('SELECT 1');
    } catch (Throwable $e) {
        $dbOk = false;
    }

    $storageBytes = 0;
    if (schema_table_exists($db, 'stored_files')) {
        $storageBytes = (int) $db->query('SELECT COALESCE(SUM(size_bytes),0) AS s FROM stored_files')->fetch()['s'];
    }
    $storageStatus = $storageBytes > 5 * 1024 * 1024 * 1024 ? 'warning' : 'healthy';

    return [
        'database' => ['status' => $dbOk ? 'healthy' : 'error', 'label' => $dbOk ? 'Connected' : 'Unreachable'],
        'storage' => ['status' => $storageStatus, 'label' => format_bytes($storageBytes) . ' used'],
        'email' => ['status' => 'healthy', 'label' => 'Not configured'],
        'server' => ['status' => 'healthy', 'label' => PHP_VERSION],
    ];
}

function format_bytes(int $bytes): string
{
    if ($bytes < 1024) return $bytes . ' B';
    if ($bytes < 1048576) return round($bytes / 1024, 1) . ' KB';
    if ($bytes < 1073741824) return round($bytes / 1048576, 1) . ' MB';
    return round($bytes / 1073741824, 2) . ' GB';
}

function active_platform_announcements(PDO $db): array
{
    if (!schema_table_exists($db, 'platform_announcements')) return [];
    $stmt = $db->query(
        "SELECT id, title, body, type, is_pinned AS isPinned, expires_at AS expiresAt, created_at AS createdAt
         FROM platform_announcements
         WHERE expires_at IS NULL OR expires_at > NOW()
         ORDER BY is_pinned DESC, created_at DESC
         LIMIT 10"
    );
    return array_map(fn($r) => [
        'id' => (int) $r['id'],
        'title' => $r['title'],
        'body' => $r['body'],
        'type' => $r['type'],
        'isPinned' => (bool) $r['isPinned'],
        'expiresAt' => $r['expiresAt'],
        'createdAt' => $r['createdAt'],
    ], $stmt->fetchAll());
}
