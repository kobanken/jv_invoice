<?php
declare(strict_types=1);

function list_customers(): void
{
    ensure_customer_optional_columns();
    $paymentType = $_GET['payment_type'] ?? null;
    $sql = 'SELECT * FROM customers';
    $params = [];
    if ($paymentType !== null && $paymentType !== '') {
        if (!in_array($paymentType, ['bank_transfer', 'cash'], true)) {
            json_error('payment_type の値が正しくありません。', 422);
        }
        $sql .= ' WHERE payment_type = :payment_type';
        $params['payment_type'] = $paymentType;
    }
    $sql .= ' ORDER BY customer_code ASC, id ASC';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_success(array_map('normalize_customer_row', $stmt->fetchAll()));
}

function save_customer(?int $id = null, ?array $data = null): void
{
    ensure_customer_optional_columns();
    $data ??= json_body();
    $payload = validate_customer_payload($data);

    if ($id === null) {
        $sql = 'INSERT INTO customers
            (customer_code, name, honorific, payment_type, delivery_method, delivery_methods, closing_day, postal_code, address, email, line_name, bank_transfer_name, note)
            VALUES
            (:customer_code, :name, :honorific, :payment_type, :delivery_method, :delivery_methods, :closing_day, :postal_code, :address, :email, :line_name, :bank_transfer_name, :note)';
    } else {
        $payload['id'] = $id;
        $sql = 'UPDATE customers SET
            customer_code = :customer_code,
            name = :name,
            honorific = :honorific,
            payment_type = :payment_type,
            delivery_method = :delivery_method,
            delivery_methods = :delivery_methods,
            closing_day = :closing_day,
            postal_code = :postal_code,
            address = :address,
            email = :email,
            line_name = :line_name,
            bank_transfer_name = :bank_transfer_name,
            note = :note,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = :id';
    }

    $stmt = db()->prepare($sql);
    $stmt->execute($payload);
    $savedId = $id ?? (int) db()->lastInsertId();
    json_success(fetch_customer($savedId), $id === null ? 201 : 200);
}

function delete_customer(int $id): void
{
    $stmt = db()->prepare('DELETE FROM customers WHERE id = :id');
    $stmt->execute(['id' => $id]);
    json_success(['deleted' => $stmt->rowCount()]);
}

function fetch_customer(int $id): array
{
    $stmt = db()->prepare('SELECT * FROM customers WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('顧客が見つかりません。', 404);
    }
    return normalize_customer_row($row);
}

function validate_customer_payload(array $data): array
{
    $closingDay = require_int_value($data, 'closing_day', 1);
    if (!in_array($closingDay, [10, 15, 20, 31], true)) {
        json_error('closing_day は10、15、20、31（月末）のいずれかで指定してください。', 422);
    }

    $deliveryMethods = validate_delivery_methods($data);
    return [
        'customer_code' => require_string($data, 'customer_code', 50),
        'name' => require_string($data, 'name', 255),
        'honorific' => optional_string($data, 'honorific', 30) ?? '御中',
        'payment_type' => require_enum($data, 'payment_type', ['bank_transfer', 'cash']),
        'delivery_method' => $deliveryMethods[0],
        'delivery_methods' => implode(',', $deliveryMethods),
        'closing_day' => $closingDay,
        'postal_code' => optional_string($data, 'postal_code', 20),
        'address' => optional_string($data, 'address', 500),
        'email' => optional_string($data, 'email', 255),
        'line_name' => optional_string($data, 'line_name', 255),
        'bank_transfer_name' => normalize_bank_transfer_names(optional_string($data, 'bank_transfer_name', 500)),
        'note' => optional_string($data, 'note', 1000),
    ];
}

function ensure_customer_optional_columns(): void
{
    static $checked = false;
    if ($checked) {
        return;
    }

    $stmt = db()->query("SHOW COLUMNS FROM customers LIKE 'bank_transfer_name'");
    $column = $stmt->fetch();
    if (!$column) {
        db()->exec('ALTER TABLE customers ADD COLUMN bank_transfer_name VARCHAR(500) NULL AFTER line_name');
    } elseif (stripos((string) ($column['Type'] ?? ''), 'varchar(500)') === false) {
        db()->exec('ALTER TABLE customers MODIFY bank_transfer_name VARCHAR(500) NULL');
    }

    $deliveryMethodStmt = db()->query("SHOW COLUMNS FROM customers LIKE 'delivery_method'");
    $deliveryMethodColumn = $deliveryMethodStmt->fetch();
    if ($deliveryMethodColumn && stripos((string) ($deliveryMethodColumn['Type'] ?? ''), "'fax'") === false) {
        db()->exec("ALTER TABLE customers MODIFY delivery_method ENUM('gmail_pdf', 'fax', 'line', 'hand_delivery', 'postal') NOT NULL");
    }

    $deliveryMethodsStmt = db()->query("SHOW COLUMNS FROM customers LIKE 'delivery_methods'");
    if (!$deliveryMethodsStmt->fetch()) {
        db()->exec('ALTER TABLE customers ADD COLUMN delivery_methods VARCHAR(100) NULL AFTER delivery_method');
        db()->exec('UPDATE customers SET delivery_methods = delivery_method WHERE delivery_methods IS NULL OR delivery_methods = ""');
    }
    $checked = true;
}

function normalize_bank_transfer_names(?string $value): ?string
{
    if ($value === null) {
        return null;
    }
    $parts = preg_split('/[,、]/u', $value) ?: [];
    $names = [];
    foreach ($parts as $part) {
        $name = trim($part);
        if ($name !== '') {
            $names[] = $name;
        }
    }
    return count($names) > 0 ? implode(', ', $names) : null;
}

function normalize_customer_row(array $row): array
{
    $row['delivery_methods'] = parse_delivery_methods($row['delivery_methods'] ?? null, $row['delivery_method'] ?? null);
    return $row;
}

function validate_delivery_methods(array $data): array
{
    $allowed = delivery_method_values();
    if (isset($data['delivery_methods'])) {
        $rawMethods = is_array($data['delivery_methods'])
            ? $data['delivery_methods']
            : preg_split('/[,、]/u', (string) $data['delivery_methods']);
    } else {
        $rawMethods = [require_enum($data, 'delivery_method', $allowed)];
    }

    $methods = [];
    foreach ($rawMethods ?: [] as $method) {
        $value = trim((string) $method);
        if ($value === '') {
            continue;
        }
        if (!in_array($value, $allowed, true)) {
            json_error('delivery_methods の値が正しくありません。', 422);
        }
        if (!in_array($value, $methods, true)) {
            $methods[] = $value;
        }
    }
    if (count($methods) === 0) {
        json_error('請求書送付方法は1つ以上選択してください。', 422);
    }
    if (count($methods) > 3) {
        json_error('請求書送付方法は最大3つまで選択できます。', 422);
    }
    return $methods;
}

function parse_delivery_methods(?string $value, ?string $fallback): array
{
    $allowed = delivery_method_values();
    $parts = preg_split('/[,、]/u', (string) ($value ?? '')) ?: [];
    $methods = [];
    foreach ($parts as $part) {
        $method = trim($part);
        if (in_array($method, $allowed, true) && !in_array($method, $methods, true)) {
            $methods[] = $method;
        }
    }
    if (!$methods && $fallback !== null && in_array($fallback, $allowed, true)) {
        $methods[] = $fallback;
    }
    return $methods;
}

function delivery_method_values(): array
{
    return ['gmail_pdf', 'fax', 'line', 'hand_delivery', 'postal'];
}
