<?php
declare(strict_types=1);

function is_social_crawler(): bool
{
    $ua = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');
    $bots = [
        'facebookexternalhit',
        'facebot',
        'twitterbot',
        'linkedinbot',
        'whatsapp',
        'telegrambot',
        'slackbot',
        'discordbot',
        'pinterest',
        'googlebot',
        'bingbot',
        'applebot',
        'embedly',
        'quora link preview',
        'showyoubot',
        'outbrain',
        'vkshare',
        'w3c_validator',
    ];
    foreach ($bots as $bot) {
        if (str_contains($ua, $bot)) {
            return true;
        }
    }
    return false;
}

function request_origin(): string
{
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
    if ($scriptDir === '/' || $scriptDir === '.') {
        $scriptDir = '';
    }
    return $scheme . '://' . $host . $scriptDir;
}

function share_preview_total(array $bill): float
{
    $total = 0.0;
    foreach ($bill['roommateShares'] as $row) {
        $total += (float) ($row['share'] ?? 0);
    }
    if ($total > 0) {
        return $total;
    }
    $total = (float) ($bill['rent'] ?? 0);
    foreach ($bill['expenses'] as $expense) {
        $total += (float) ($expense['amount'] ?? 0);
    }
    return $total;
}

function format_share_money(float $amount, string $currency): string
{
    $symbol = match ($currency) {
        'EUR' => '€',
        'GBP' => '£',
        'BDT' => '৳',
        default => '$',
    };
    return $symbol . number_format($amount, fmod($amount, 1.0) === 0.0 ? 0 : 2);
}

function share_preview_for_token(PDO $db, string $token): ?array
{
    $stmt = $db->prepare('SELECT bill_id, house_id FROM share_tokens WHERE token = ? LIMIT 1');
    $stmt->execute([$token]);
    $link = $stmt->fetch();
    if (!$link) {
        return null;
    }

    $billStmt = $db->prepare('SELECT * FROM bills WHERE id = ? AND house_id = ? LIMIT 1');
    $billStmt->execute([$link['bill_id'], $link['house_id']]);
    $billRow = $billStmt->fetch();
    if (!$billRow) {
        return null;
    }

    $houseStmt = $db->prepare('SELECT settings_json FROM houses WHERE id = ? LIMIT 1');
    $houseStmt->execute([(int) $link['house_id']]);
    $house = $houseStmt->fetch();
    $settings = [];
    if ($house) {
        $decoded = json_decode($house['settings_json'] ?? '', true);
        if (is_array($decoded)) {
            $settings = $decoded;
        }
    }

    $shareStmt = $db->prepare('SELECT share_amount FROM bill_shares WHERE bill_id = ?');
    $shareStmt->execute([$billRow['id']]);
    $roommateShares = [];
    foreach ($shareStmt->fetchAll() as $row) {
        $roommateShares[] = ['share' => (float) $row['share_amount']];
    }

    $selected = json_decode($billRow['selected_roommate_ids'] ?? '[]', true);
    if (!is_array($selected)) {
        $selected = [];
    }

    $bill = [
        'title' => trim((string) ($billRow['title'] ?? '')),
        'month' => (string) $billRow['month_label'],
        'houseName' => (string) $billRow['house_name'],
        'rent' => (float) $billRow['rent'],
        'expenses' => [],
        'roommateShares' => $roommateShares,
        'selectedRoommateIds' => array_map('intval', $selected),
        'createdAt' => date('F j, Y', strtotime($billRow['created_at'])),
    ];

    $expStmt = $db->prepare('SELECT amount FROM bill_expenses WHERE bill_id = ?');
    $expStmt->execute([$billRow['id']]);
    foreach ($expStmt->fetchAll() as $expense) {
        $bill['expenses'][] = ['amount' => (float) $expense['amount']];
    }

    $branding = platform_branding($db);
    $currency = (string) ($settings['currency'] ?? 'USD');
    $houseName = trim((string) ($settings['houseName'] ?? $bill['houseName']));
    $platformName = trim((string) ($branding['platformName'] ?? 'Roomly')) ?: 'Roomly';
    $displayTitle = $bill['title'] !== '' ? $bill['title'] : ($bill['month'] . ' Bill');
    $memberCount = count($bill['selectedRoommateIds']);
    $total = share_preview_total($bill);
    $totalLabel = format_share_money($total, $currency);

    $description = sprintf(
        '%s · %s · %s total · %d %s · Open on %s',
        $houseName,
        $bill['month'],
        $totalLabel,
        $memberCount,
        $memberCount === 1 ? 'roommate' : 'roommates',
        $platformName
    );

    $websiteUrl = trim((string) ($branding['websiteUrl'] ?? ''));
    if ($websiteUrl === '') {
        $websiteUrl = request_origin();
    }

    $logoUrl = trim((string) ($branding['logoUrl'] ?? ''));
    $imageUrl = $logoUrl !== '' ? $logoUrl : (request_origin() . '/og-share.svg');

    return [
        'token' => $token,
        'title' => $displayTitle,
        'ogTitle' => $displayTitle . ' · ' . $platformName,
        'description' => $description,
        'houseName' => $houseName,
        'month' => $bill['month'],
        'totalLabel' => $totalLabel,
        'memberCount' => $memberCount,
        'currency' => $currency,
        'platformName' => $platformName,
        'imageUrl' => $imageUrl,
        'canonicalUrl' => request_origin() . '/s/' . rawurlencode($token),
        'appUrl' => request_origin() . '/#/s/' . rawurlencode($token),
        'websiteUrl' => $websiteUrl,
    ];
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
