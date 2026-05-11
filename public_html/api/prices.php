<?php
declare(strict_types=1);

require_once __DIR__ . '/config/bootstrap.php';
require_api_auth();
require_once __DIR__ . '/controllers/prices_controller.php';

$method = request_method();
if ($method === 'GET') {
    list_prices();
}
if ($method === 'POST') {
    save_price();
}
if ($method === 'PUT') {
    $data = json_body();
    save_price(int_param($data, 'id', true), $data);
}
if ($method === 'DELETE') {
    $data = json_body();
    delete_price(int_param($data ?: $_GET, 'id', true));
}
json_error('許可されていないメソッドです。', 405);
