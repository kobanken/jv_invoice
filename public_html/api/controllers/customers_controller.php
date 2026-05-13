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
    json_success($stmt->fetchAll());
}

function save_customer(?int $id = null, ?array $data = null): void
{
    ensure_customer_optional_columns();
    $data ??= json_body();
    $payload = validate_customer_payload($data);

    if ($id === null) {
        $sql = 'INSERT INTO customers
            (customer_code, name, honorific, payment_type, delivery_method, closing_day, postal_code, address, email, line_name, bank_transfer_name, note)
            VALUES
            (:customer_code, :name, :honorific, :payment_type, :delivery_method, :closing_day, :postal_code, :address, :email, :line_name, :bank_transfer_name, :note)';
    } else {
        $payload['id'] = $id;
        $sql = 'UPDATE customers SET
            customer_code = :customer_code,
            name = :name,
            honorific = :honorific,
            payment_type = :payment_type,
            delivery_method = :delivery_method,
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
    return $row;
}

function validate_customer_payload(array $data): array
{
    $closingDay = require_int_value($data, 'closing_day', 1);
    if (!in_array($closingDay, [15, 20, 31], true)) {
        json_error('closing_day は15、20、31（月末）のいずれかで指定してください。', 422);
    }

    return [
        'customer_code' => require_string($data, 'customer_code', 50),
        'name' => require_string($data, 'name', 255),
        'honorific' => optional_string($data, 'honorific', 30) ?? '御中',
        'payment_type' => require_enum($data, 'payment_type', ['bank_transfer', 'cash']),
        'delivery_method' => require_enum($data, 'delivery_method', ['gmail_pdf', 'line', 'hand_delivery', 'postal']),
        'closing_day' => $closingDay,
        'postal_code' => optional_string($data, 'postal_code', 20),
        'address' => optional_string($data, 'address', 500),
        'email' => optional_string($data, 'email', 255),
        'line_name' => optional_string($data, 'line_name', 255),
        'bank_transfer_name' => optional_string($data, 'bank_transfer_name', 255),
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
    if (!$stmt->fetch()) {
        db()->exec('ALTER TABLE customers ADD COLUMN bank_transfer_name VARCHAR(255) NULL AFTER line_name');
    }
    $checked = true;
}
