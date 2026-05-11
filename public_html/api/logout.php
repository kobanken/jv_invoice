<?php
declare(strict_types=1);

require_once __DIR__ . '/config/bootstrap.php';
start_api_session();
$_SESSION = [];
session_destroy();
json_success(['authenticated' => false]);
