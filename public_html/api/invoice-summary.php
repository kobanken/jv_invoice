<?php
declare(strict_types=1);

require_once __DIR__ . '/config/bootstrap.php';
require_api_auth();
require_once __DIR__ . '/controllers/invoice_summary_controller.php';

$method = request_method();
if ($method === 'GET') {
    get_invoice_summary();
}
if ($method === 'POST') {
    save_invoice_summary();
}
json_error('許可されていないメソッドです。', 405);
