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
        'snapchat',
        'iframely',
        'skypeuripreview',
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

function normalize_website_url(string $url, string $fallback = ''): string
{
    $raw = trim($url);
    if ($raw === '') {
        $raw = $fallback !== '' ? $fallback : site_origin();
    }
    $raw = trim(explode('#', $raw)[0]);
    $raw = trim(explode('?', $raw)[0]);
    if (!preg_match('#^https?://#i', $raw)) {
        $raw = 'https://' . ltrim($raw, '/');
    }
    return rtrim($raw, '/');
}

function site_label_from_url(string $url): string
{
    $host = parse_url($url, PHP_URL_HOST);
    if (!is_string($host) || $host === '') {
        $host = preg_replace('#^https?://#', '', $url);
        $host = explode('/', $host)[0];
    }
    $host = preg_replace('/^www\./', '', $host);
    $parts = explode('.', $host);
    if (isset($parts[0]) && $parts[0] !== '') {
        $parts[0] = ucfirst($parts[0]);
    }
    return implode('.', $parts);
}

function site_origin(): string
{
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $scheme . '://' . $host;
}

/** @deprecated use site_origin() for public URLs */
function request_origin(): string
{
    return site_origin();
}

function share_page_url(string $token): string
{
    return site_origin() . '/s/' . rawurlencode($token);
}

function share_og_image_url(string $token, string $logoUrl = ''): string
{
    if ($logoUrl !== '' && preg_match('/\.(png|jpe?g|webp)(\?|#|$)/i', $logoUrl)) {
        return normalize_website_url($logoUrl);
    }
    return site_origin() . '/api/og.php?token=' . rawurlencode($token);
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

    $websiteUrl = site_origin();
    $siteLabel = site_label_from_url(site_origin());

    $description = sprintf(
        '%s · %s · %s total · %s',
        $houseName,
        $bill['month'],
        $totalLabel,
        $siteLabel
    );

    $logoUrl = trim((string) ($branding['logoUrl'] ?? ''));
    $imageUrl = share_og_image_url($token, $logoUrl);

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
        'canonicalUrl' => share_page_url($token),
        'appUrl' => site_origin() . '/#/s/' . rawurlencode($token),
        'websiteUrl' => $websiteUrl,
        'siteLabel' => $siteLabel,
    ];
}

function respond_share_page(PDO $db, string $token): void
{
    if (!preg_match('/^[a-zA-Z0-9]{4,32}$/', $token)) {
        http_response_code(404);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><title>Link not found</title><p>Share link not found.</p>';
        exit;
    }

    $preview = share_preview_for_token($db, $token);
    if (!$preview) {
        http_response_code(404);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><title>Bill not found</title><p>This shared bill link is invalid or expired.</p>';
        exit;
    }

    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=300');
    ?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= h($preview['ogTitle']) ?></title>
  <meta name="description" content="<?= h($preview['description']) ?>" />
  <link rel="canonical" href="<?= h($preview['canonicalUrl']) ?>" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="<?= h($preview['platformName']) ?>" />
  <meta property="og:title" content="<?= h($preview['title']) ?>" />
  <meta property="og:description" content="<?= h($preview['description']) ?>" />
  <meta property="og:url" content="<?= h($preview['canonicalUrl']) ?>" />
  <meta property="og:image" content="<?= h($preview['imageUrl']) ?>" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="<?= h($preview['title']) ?>" />
  <meta name="twitter:description" content="<?= h($preview['description']) ?>" />
  <meta name="twitter:image" content="<?= h($preview['imageUrl']) ?>" />
</head>
<body style="margin:0;font-family:Inter,Segoe UI,Arial,sans-serif;background:linear-gradient(160deg,#F0F4FF,#F8FAFC);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
  <div style="max-width:420px;width:100%;background:#fff;border-radius:20px;padding:28px 24px;text-align:center;box-shadow:0 12px 40px rgba(79,70,229,0.12);border:1px solid rgba(79,70,229,0.1)">
    <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#4F46E5,#7C3AED);margin:0 auto 16px"></div>
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#4F46E5"><?= h($preview['platformName']) ?></p>
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#0F0D2A;letter-spacing:-0.3px"><?= h($preview['title']) ?></h1>
    <p style="margin:0 0 20px;font-size:13px;color:#64748B;line-height:1.5"><?= h($preview['description']) ?></p>
    <a href="<?= h($preview['appUrl']) ?>" style="display:inline-block;padding:12px 22px;border-radius:12px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;font-weight:700;font-size:14px;text-decoration:none">View shared bill</a>
    <p style="margin:20px 0 0;font-size:12px;color:#94A3B8">
      <a href="<?= h($preview['websiteUrl']) ?>" style="color:#4F46E5;font-weight:600;text-decoration:none"><?= h($preview['siteLabel']) ?></a>
    </p>
  </div>
</body>
</html>
<?php
    exit;
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
