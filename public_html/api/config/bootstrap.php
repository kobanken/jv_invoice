<?php
declare(strict_types=1);

error_reporting(E_ALL);

$configCandidates = [
    dirname(__DIR__, 4) . '/jv_invoice_config.php',
    dirname(__DIR__, 3) . '/jv_invoice_config.php',
    dirname(__DIR__, 2) . '/jv_invoice_config.php',
];

foreach ($configCandidates as $privateConfig) {
    if (is_readable($privateConfig)) {
        load_php_config($privateConfig);
        break;
    }
}

load_env_file(dirname(__DIR__, 4) . '/.env');
load_env_file(dirname(__DIR__, 3) . '/.env');
load_env_file(dirname(__DIR__, 2) . '/.env');
load_env_file(__DIR__ . '/.env');

$appEnv = env_value('APP_ENV', 'production');
ini_set('display_errors', $appEnv === 'production' ? '0' : '1');

require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/request.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/validation.php';
require_once __DIR__ . '/../lib/money.php';

set_exception_handler(function (Throwable $exception) use ($appEnv): void {
    $message = $appEnv === 'production' ? 'サーバーエラーが発生しました。' : $exception->getMessage();
    json_error($message, 500);
});

handle_cors();

function env_value(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }
    return $value;
}

function load_php_config(string $path): void
{
    $privateValues = require $path;
    if (!is_array($privateValues)) {
        return;
    }

    foreach ($privateValues as $key => $value) {
        if (getenv((string) $key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }
}

function load_env_file(string $path): void
{
    if (!is_readable($path)) {
        return;
    }

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = array_map('trim', explode('=', $line, 2));
        $value = trim($value, "\"'");
        if (getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }
}

function handle_cors(): void
{
    $allowedOrigin = env_value('ALLOWED_ORIGIN', '');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($allowedOrigin !== '' && $origin === $allowedOrigin) {
        header('Access-Control-Allow-Origin: ' . $allowedOrigin);
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
