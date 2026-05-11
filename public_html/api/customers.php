<?php
declare(strict_types=1);

require_once __DIR__ . '/config/bootstrap.php';
require_api_auth();
require_once __DIR__ . '/controllers/customers_controller.php';

$method = request_method();
if ($method === 'GET') {
    list_customers();
}
if ($method === 'POST') {
    save_customer();
}
if ($method === 'PUT') {
    $data = json_body();
    save_customer(int_param($data, 'id', true), $data);
}
if ($method === 'DELETE') {
    $data = json_body();
    delete_customer(int_param($data ?: $_GET, 'id', true));
}
json_error('許可されていないメソッドです。', 405);
