<?php
declare(strict_types=1);

define('ROOMLY_HTML_RESPONSE', true);

$configPath = dirname(__DIR__) . '/api/config.php';
if (!file_exists($configPath)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Share preview unavailable.';
    exit;
}

$config = require $configPath;
require dirname(__DIR__) . '/api/bootstrap.php';
require dirname(__DIR__) . '/api/share_preview.php';

$token = trim((string) ($_GET['token'] ?? ''));

try {
    $db = pdo($config);
    respond_share_page($db, $token);
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Unable to load share preview.';
    exit;
}
