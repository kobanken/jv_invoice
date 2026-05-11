<?php
declare(strict_types=1);

require_once __DIR__ . '/config/bootstrap.php';
require_api_auth();
require_once __DIR__ . '/controllers/deliveries_controller.php';

$method = request_method();
if ($method === 'GET') {
    list_deliveries();
}
if ($method === 'POST' || $method === 'PUT') {
    save_deliveries();
}
if ($method === 'DELETE') {
    delete_deliveries();
}
json_error('許可されていないメソッドです。', 405);
