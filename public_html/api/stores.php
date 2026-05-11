<?php
declare(strict_types=1);

require_once __DIR__ . '/config/bootstrap.php';
require_api_auth();
require_once __DIR__ . '/controllers/stores_controller.php';

$method = request_method();
if ($method === 'GET') {
    list_stores();
}
if ($method === 'POST') {
    save_store();
}
if ($method === 'PUT') {
    $data = json_body();
    save_store(int_param($data, 'id', true), $data);
}
if ($method === 'DELETE') {
    $data = json_body();
    delete_store(int_param($data ?: $_GET, 'id', true));
}
json_error('許可されていないメソッドです。', 405);
