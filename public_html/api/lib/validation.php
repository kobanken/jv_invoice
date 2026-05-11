<?php
declare(strict_types=1);

function require_string(array $data, string $key, int $max = 255): string
{
    $value = trim((string) ($data[$key] ?? ''));
    if ($value === '') {
        json_error($key . ' は必須です。', 422);
    }
    if (mb_strlen($value) > $max) {
        json_error($key . ' は' . $max . '文字以内で入力してください。', 422);
    }
    return $value;
}

function optional_string(array $data, string $key, int $max = 255): ?string
{
    if (!isset($data[$key]) || $data[$key] === '') {
        return null;
    }
    $value = trim((string) $data[$key]);
    if (mb_strlen($value) > $max) {
        json_error($key . ' は' . $max . '文字以内で入力してください。', 422);
    }
    return $value;
}

function require_int_value(array $data, string $key, int $min = 0): int
{
    if (!isset($data[$key]) || !is_numeric($data[$key])) {
        json_error($key . ' は数値で指定してください。', 422);
    }
    $value = (int) $data[$key];
    if ($value < $min) {
        json_error($key . ' は' . $min . '以上で指定してください。', 422);
    }
    return $value;
}

function require_enum(array $data, string $key, array $allowed): string
{
    $value = require_string($data, $key, 80);
    if (!in_array($value, $allowed, true)) {
        json_error($key . ' の値が正しくありません。', 422);
    }
    return $value;
}

function optional_date(array $data, string $key): ?string
{
    $value = optional_string($data, $key, 10);
    if ($value === null) {
        return null;
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        json_error($key . ' は YYYY-MM-DD 形式で指定してください。', 422);
    }
    return $value;
}

function require_month(array $data, string $key): string
{
    $value = require_string($data, $key, 7);
    if (!preg_match('/^\d{4}-\d{2}$/', $value)) {
        json_error($key . ' は YYYY-MM 形式で指定してください。', 422);
    }
    return $value;
}
