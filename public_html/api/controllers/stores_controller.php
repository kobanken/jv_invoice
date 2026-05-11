<?php
declare(strict_types=1);

function list_stores(): void
{
    $customerId = int_param($_GET, 'customer_id', false);
    $sql = 'SELECT * FROM stores';
    $params = [];
    if ($customerId !== null) {
        $sql .= ' WHERE customer_id = :customer_id';
        $params['customer_id'] = $customerId;
    }
    $sql .= ' ORDER BY customer_id ASC, display_order ASC, id ASC';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_success($stmt->fetchAll());
}

function save_store(?int $id = null, ?array $data = null): void
{
    $data ??= json_body();
    $payload = [
        'customer_id' => require_int_value($data, 'customer_id', 1),
        'name' => require_string($data, 'name', 255),
        'display_order' => isset($data['display_order']) && $data['display_order'] !== '' ? (int) $data['display_order'] : 0,
        'note' => optional_string($data, 'note', 1000),
    ];

    if ($id === null) {
        $sql = 'INSERT INTO stores (customer_id, name, display_order, note)
            VALUES (:customer_id, :name, :display_order, :note)';
    } else {
        $payload['id'] = $id;
        $sql = 'UPDATE stores SET
            customer_id = :customer_id,
            name = :name,
            display_order = :display_order,
            note = :note,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = :id';
    }

    $stmt = db()->prepare($sql);
    $stmt->execute($payload);
    $savedId = $id ?? (int) db()->lastInsertId();
    json_success(fetch_store($savedId), $id === null ? 201 : 200);
}

function delete_store(int $id): void
{
    $stmt = db()->prepare('DELETE FROM stores WHERE id = :id');
    $stmt->execute(['id' => $id]);
    json_success(['deleted' => $stmt->rowCount()]);
}

function fetch_store(int $id): array
{
    $stmt = db()->prepare('SELECT * FROM stores WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('店舗が見つかりません。',  404);
    }
    return $row;
}
