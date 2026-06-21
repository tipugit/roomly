<?php
declare(strict_types=1);

$token = trim((string) ($_GET['token'] ?? ''));
$target = '/api/share.php';
if ($token !== '') {
    $target .= '?token=' . rawurlencode($token);
}
header('Location: ' . $target, true, 301);
exit;
