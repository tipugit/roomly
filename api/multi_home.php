<?php
declare(strict_types=1);

/** Multi-home + super-admin helpers (included from bootstrap.php). */

function schema_has_memberships(PDO $db): bool
{
    static $cached = null;
    if ($cached !== null) return $cached;
    try {
        $db->query('SELECT 1 FROM house_memberships LIMIT 1');
        $cached = true;
    } catch (Throwable $e) {
        $cached = false;
    }
    return $cached;
}

function schema_has_user_role(PDO $db): bool
{
    static $cached = null;
    if ($cached !== null) return $cached;
    try {
        $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'role'");
        $cached = (bool) $stmt->fetch();
    } catch (Throwable $e) {
        $cached = false;
    }
    return $cached;
}

function get_user_role(PDO $db, int $userId): string
{
    if (!schema_has_user_role($db)) {
        return 'user';
    }
    $stmt = $db->prepare('SELECT role FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row['role'] ?? 'user';
}

function is_super_admin(PDO $db, int $userId): bool
{
    return get_user_role($db, $userId) === 'super_admin';
}

function user_has_house_access(PDO $db, int $userId, int $houseId): bool
{
    if (is_super_admin($db, $userId)) {
        $check = $db->prepare('SELECT id FROM houses WHERE id = ? LIMIT 1');
        $check->execute([$houseId]);
        return (bool) $check->fetch();
    }
    if (schema_has_memberships($db)) {
        $stmt = $db->prepare('SELECT 1 FROM house_memberships WHERE user_id = ? AND house_id = ? LIMIT 1');
        $stmt->execute([$userId, $houseId]);
        return (bool) $stmt->fetch();
    }
    $stmt = $db->prepare('SELECT id FROM houses WHERE id = ? AND user_id = ? LIMIT 1');
    $stmt->execute([$houseId, $userId]);
    return (bool) $stmt->fetch();
}

function list_user_houses(PDO $db, int $userId): array
{
    if (is_super_admin($db, $userId)) {
        $selectName = schema_has_house_name($db) ? 'h.name' : "COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(h.settings_json, '$.houseName')), ''), 'My House') AS name";
        $stmt = $db->query(
            "SELECT h.id, {$selectName}, h.created_at,
              (SELECT COUNT(*) FROM roommates r WHERE r.house_id = h.id) AS roommate_count,
              (SELECT COUNT(*) FROM bills b WHERE b.house_id = h.id) AS bill_count
             FROM houses h ORDER BY h.created_at DESC"
        );
        return array_map(fn($row) => [
            'id' => (int) $row['id'],
            'name' => $row['name'] ?: 'House',
            'role' => 'owner',
            'roommateCount' => (int) $row['roommate_count'],
            'billCount' => (int) $row['bill_count'],
        ], $stmt->fetchAll());
    }

    if (schema_has_memberships($db)) {
        $selectName = schema_has_house_name($db) ? 'h.name' : "COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(h.settings_json, '$.houseName')), ''), 'My House') AS name";
        $stmt = $db->prepare(
            "SELECT h.id, {$selectName}, hm.role, h.created_at,
              (SELECT COUNT(*) FROM roommates r WHERE r.house_id = h.id) AS roommate_count,
              (SELECT COUNT(*) FROM bills b WHERE b.house_id = h.id) AS bill_count
             FROM house_memberships hm
             JOIN houses h ON h.id = hm.house_id
             WHERE hm.user_id = ?
             ORDER BY h.created_at ASC"
        );
        $stmt->execute([$userId]);
        return array_map(fn($row) => [
            'id' => (int) $row['id'],
            'name' => $row['name'] ?: 'House',
            'role' => $row['role'],
            'roommateCount' => (int) $row['roommate_count'],
            'billCount' => (int) $row['bill_count'],
        ], $stmt->fetchAll());
    }

    $selectName = schema_has_house_name($db) ? 'h.name' : "COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(h.settings_json, '$.houseName')), ''), 'My House') AS name";
    $stmt = $db->prepare(
        "SELECT h.id, {$selectName}, h.created_at,
          (SELECT COUNT(*) FROM roommates r WHERE r.house_id = h.id) AS roommate_count,
          (SELECT COUNT(*) FROM bills b WHERE b.house_id = h.id) AS bill_count
         FROM houses h WHERE h.user_id = ? LIMIT 1"
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) return [];
    return [[
        'id' => (int) $row['id'],
        'name' => $row['name'] ?: 'My House',
        'role' => 'owner',
        'roommateCount' => (int) $row['roommate_count'],
        'billCount' => (int) $row['bill_count'],
    ]];
}

function resolve_user_house(PDO $db, int $userId, ?int $preferredHouseId = null): int
{
    $houses = list_user_houses($db, $userId);
    if ($preferredHouseId !== null) {
        foreach ($houses as $h) {
            if ($h['id'] === $preferredHouseId) {
                return $preferredHouseId;
            }
        }
    }
    if (count($houses) > 0) {
        return $houses[0]['id'];
    }
    return get_house_id($db, $userId);
}

function schema_has_house_name(PDO $db): bool
{
    static $cached = null;
    if ($cached !== null) return $cached;
    try {
        $stmt = $db->query("SHOW COLUMNS FROM houses LIKE 'name'");
        $cached = (bool) $stmt->fetch();
    } catch (Throwable $e) {
        $cached = false;
    }
    return $cached;
}

function create_house_for_user(PDO $db, int $userId, string $houseName, string $ownerName, string $ownerEmail): int
{
    $settings = default_settings($ownerName, $ownerEmail);
    $settings['houseName'] = $houseName;

    if (schema_has_house_name($db)) {
        $stmt = $db->prepare('INSERT INTO houses (user_id, name, settings_json) VALUES (?, ?, ?)');
        $stmt->execute([$userId, $houseName, json_encode($settings)]);
    } else {
        $stmt = $db->prepare('INSERT INTO houses (user_id, settings_json) VALUES (?, ?)');
        $stmt->execute([$userId, json_encode($settings)]);
    }
    $houseId = (int) $db->lastInsertId();

    if (schema_has_memberships($db)) {
        $mem = $db->prepare('INSERT INTO house_memberships (house_id, user_id, role) VALUES (?, ?, ?)');
        $mem->execute([$houseId, $userId, 'owner']);
    }

    return $houseId;
}

function auth_user_payload(PDO $db, array $userRow): array
{
    $userId = (int) $userRow['id'];
    return [
        'id' => $userId,
        'name' => $userRow['name'],
        'email' => $userRow['email'],
        'role' => schema_has_user_role($db) ? ($userRow['role'] ?? get_user_role($db, $userId)) : 'user',
    ];
}

function auth_session_response(PDO $db, int $userId, int $houseId): array
{
    $stmt = $db->prepare('SELECT id, name, email' . (schema_has_user_role($db) ? ', role' : '') . ' FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    if (!$user) {
        respond_error('User not found', 404);
    }

    return [
        'ok' => true,
        'user' => auth_user_payload($db, $user),
        'houses' => list_user_houses($db, $userId),
        'activeHouseId' => $houseId,
        'state' => fetch_full_state($db, $houseId),
    ];
}

function require_auth(): array
{
    $db = app_db();
    if (empty($_SESSION['user_id'])) {
        respond_error('Unauthorized', 401);
    }
    $userId = (int) $_SESSION['user_id'];
    $houseId = (int) ($_SESSION['house_id'] ?? 0);

    if ($houseId <= 0 || !user_has_house_access($db, $userId, $houseId)) {
        $houseId = resolve_user_house($db, $userId);
        $_SESSION['house_id'] = $houseId;
    }

    return [
        'user_id' => $userId,
        'house_id' => $houseId,
        'is_super_admin' => is_super_admin($db, $userId),
        'role' => get_user_role($db, $userId),
    ];
}

function require_super_admin(): array
{
    $auth = require_auth();
    if (!$auth['is_super_admin']) {
        respond_error('Super admin access required.', 403);
    }
    return $auth;
}
