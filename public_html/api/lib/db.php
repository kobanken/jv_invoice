<?php
declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = env_value('DB_HOST', 'localhost');
    $name = env_value('DB_NAME', '');
    $user = env_value('DB_USER', '');
    $pass = env_value('DB_PASS', '');

    if ($name === '' || $user === '') {
        json_error('DB設定が不足しています。', 500);
    }

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $host, $name);
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}
