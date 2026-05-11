<?php
declare(strict_types=1);

require_once __DIR__ . '/config/bootstrap.php';

$data = json_body();
if (login_api_user((string) ($data['user'] ?? ''), (string) ($data['password'] ?? ''))) {
    json_success(['authenticated' => true]);
}
json_error('ログイン情報が正しくありません。', 401);
