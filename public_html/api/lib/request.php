<?php
declare(strict_types=1);

function request_method(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        json_error('JSONの形式が正しくありません。', 400);
    }
    return $decoded;
}

function int_param(array $source, string $key, bool $required = false): ?int
{
    if (!isset($source[$key]) || $source[$key] === '') {
        if ($required) {
            json_error($key . ' は必須です。', 422);
        }
        return null;
    }

    if (!filter_var($source[$key], FILTER_VALIDATE_INT)) {
        json_error($key . ' は整数で指定してください。', 422);
    }
    return (int) $source[$key];
}
