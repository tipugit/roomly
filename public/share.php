<?php
declare(strict_types=1);

$token = trim((string) ($_GET['token'] ?? ''));
if ($token !== '' && preg_match('/^[a-zA-Z0-9]{4,32}$/', $token)) {
    header('Location: /s/' . rawurlencode($token), true, 301);
    exit;
}

header('Location: /', true, 302);
exit;
