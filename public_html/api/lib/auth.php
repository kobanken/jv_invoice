<?php
declare(strict_types=1);

function start_api_session(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_set_cookie_params([
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        ]);
        session_start();
    }
}

function require_api_auth(): void
{
    $requireAuth = strtolower((string) env_value('API_REQUIRE_AUTH', 'false')) === 'true';
    if (!$requireAuth) {
        return;
    }

    start_api_session();
    if (($_SESSION['authenticated'] ?? false) !== true) {
        json_error('認証が必要です。', 401);
    }
}

function login_api_user(string $user, string $pass): bool
{
    $adminUser = (string) env_value('ADMIN_USER', '');
    $adminPass = (string) env_value('ADMIN_PASS', '');
    if ($adminUser === '' || $adminPass === '') {
        return false;
    }
    if (!hash_equals($adminUser, $user) || !hash_equals($adminPass, $pass)) {
        return false;
    }

    start_api_session();
    session_regenerate_id(true);
    $_SESSION['authenticated'] = true;
    $_SESSION['user'] = $user;
    return true;
}
