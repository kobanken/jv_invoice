<?php
declare(strict_types=1);

require_once __DIR__ . '/config/bootstrap.php';

$dbOk = false;
try {
    db()->query('SELECT 1');
    $dbOk = true;
} catch (Throwable $exception) {
    $dbOk = false;
}

json_success([
    'app' => 'jv_invoice_api',
    'env' => env_value('APP_ENV', 'production'),
    'db' => $dbOk ? 'ok' : 'ng',
]);
