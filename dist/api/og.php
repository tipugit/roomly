<?php
declare(strict_types=1);

define('ROOMLY_HTML_RESPONSE', true);

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    http_response_code(503);
    exit;
}

$config = require $configPath;
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/share_preview.php';

$token = trim((string) ($_GET['token'] ?? ''));
if (!preg_match('/^[a-zA-Z0-9]{4,32}$/', $token)) {
    http_response_code(404);
    exit;
}

try {
    $db = pdo($config);
    $preview = share_preview_for_token($db, $token);
} catch (Throwable $e) {
    http_response_code(500);
    exit;
}

if (!$preview) {
    http_response_code(404);
    exit;
}

header('Content-Type: image/png');
header('Cache-Control: public, max-age=86400');

if (!function_exists('imagecreatetruecolor')) {
    $fallback = dirname(__DIR__) . '/og-share.svg';
    if (is_file($fallback)) {
        header('Content-Type: image/svg+xml');
        readfile($fallback);
        exit;
    }
    http_response_code(503);
    exit;
}

$width = 1200;
$height = 630;
$img = imagecreatetruecolor($width, $height);
if ($img === false) {
    http_response_code(500);
    exit;
}

$purple = imagecolorallocate($img, 79, 70, 229);
$violet = imagecolorallocate($img, 124, 58, 237);
$white = imagecolorallocate($img, 255, 255, 255);
$muted = imagecolorallocate($img, 230, 230, 250);

for ($y = 0; $y < $height; $y++) {
    $ratio = $y / $height;
    $r = (int) (79 + (124 - 79) * $ratio);
    $g = (int) (70 + (58 - 70) * $ratio);
    $b = (int) (229 + (237 - 229) * $ratio);
    $line = imagecolorallocate($img, $r, $g, $b);
    imageline($img, 0, $y, $width, $y, $line);
}

$title = mb_substr($preview['title'], 0, 60);
$subtitle = mb_substr($preview['houseName'] . ' · ' . $preview['month'], 0, 70);
$footer = $preview['siteLabel'];

$font = 5;
$titleY = 220;
imagestring($img, $font, 80, $titleY, $title, $white);
imagestring($img, 3, 80, $titleY + 48, $subtitle, $muted);
imagestring($img, 4, 80, $height - 72, $footer, $white);
imagestring($img, 3, 80, $height - 44, $preview['platformName'] . ' — Shared Bill', $muted);

imagepng($img);
imagedestroy($img);
