<?php
declare(strict_types=1);

define('ROOMLY_HTML_RESPONSE', true);

$configPath = __DIR__ . '/api/config.php';
if (!file_exists($configPath)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Share preview unavailable.';
    exit;
}

$config = require $configPath;
require __DIR__ . '/api/bootstrap.php';
require __DIR__ . '/api/share_preview.php';

$token = trim((string) ($_GET['token'] ?? ''));
if (!preg_match('/^[a-zA-Z0-9]{4,32}$/', $token)) {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><title>Link not found</title><p>Share link not found.</p>';
    exit;
}

try {
    $db = pdo($config);
    $preview = share_preview_for_token($db, $token);
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Unable to load share preview.';
    exit;
}

if (!$preview) {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><title>Bill not found</title><p>This shared bill link is invalid or expired.</p>';
    exit;
}

if (!is_social_crawler()) {
    header('Location: ' . $preview['appUrl'], true, 302);
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
  <meta property="og:image:alt" content="<?= h($preview['title'] . ' — ' . $preview['houseName']) ?>" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="<?= h($preview['title']) ?>" />
  <meta name="twitter:description" content="<?= h($preview['description']) ?>" />
  <meta name="twitter:image" content="<?= h($preview['imageUrl']) ?>" />

  <meta name="theme-color" content="#4F46E5" />
</head>
<body>
  <main>
    <h1><?= h($preview['title']) ?></h1>
    <p><?= h($preview['description']) ?></p>
    <p><a href="<?= h($preview['appUrl']) ?>">View bill on <?= h($preview['platformName']) ?></a></p>
  </main>
</body>
</html>
