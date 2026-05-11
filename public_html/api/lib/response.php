<?php
declare(strict_types=1);

function json_success(mixed $data = null, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $status = 400): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}
