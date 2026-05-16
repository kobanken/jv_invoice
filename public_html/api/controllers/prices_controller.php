<?php
declare(strict_types=1);

function list_prices(): void
{
    $customerId = int_param($_GET, 'customer_id', false);
    $storeId = int_param($_GET, 'store_id', false);
    $where = [];
    $params = [];

    if ($customerId !== null) {
        $where[] = 'customer_id = :customer_id';
        $params['customer_id'] = $customerId;
    }
    if ($storeId !== null) {
        $where[] = '(store_id = :store_id OR store_id IS NULL)';
        $params['store_id'] = $storeId;
    }

    $sql = 'SELECT * FROM price_masters';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY customer_id ASC, store_id ASC, category ASC, item_name ASC, start_date DESC';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_success($stmt->fetchAll());
}

function save_price(?int $id = null, ?array $data = null): void
{
    $data ??= json_body();
    $payload = [
        'customer_id' => require_int_value($data, 'customer_id', 1),
        'store_id' => isset($data['store_id']) && $data['store_id'] !== '' ? (int) $data['store_id'] : null,
        'item_name' => require_string($data, 'item_name', 255),
        'unit_price' => require_int_value($data, 'unit_price', 0),
        'category' => require_enum($data, 'category', ['product', 'delivery_fee', 'collection', 'other_fee']),
        'start_date' => optional_date($data, 'start_date') ?? date('Y-m-d'),
        'end_date' => optional_date($data, 'end_date'),
        'note' => optional_string($data, 'note', 1000),
    ];

    if ($id === null) {
        $sql = 'INSERT INTO price_masters
            (customer_id, store_id, item_name, unit_price, category, start_date, end_date, note)
            VALUES
            (:customer_id, :store_id, :item_name, :unit_price, :category, :start_date, :end_date, :note)';
    } else {
        $payload['id'] = $id;
        $sql = 'UPDATE price_masters SET
            customer_id = :customer_id,
            store_id = :store_id,
            item_name = :item_name,
            unit_price = :unit_price,
            category = :category,
            start_date = :start_date,
            end_date = :end_date,
            note = :note,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = :id';
    }

    $stmt = db()->prepare($sql);
    $stmt->execute($payload);
    $savedId = $id ?? (int) db()->lastInsertId();
    json_success(fetch_price($savedId), $id === null ? 201 : 200);
}

function delete_price(int $id): void
{
    $stmt = db()->prepare('DELETE FROM price_masters WHERE id = :id');
    $stmt->execute(['id' => $id]);
    json_success(['deleted' => $stmt->rowCount()]);
}

function fetch_price(int $id): array
{
    $stmt = db()->prepare('SELECT * FROM price_masters WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('単価が見つかりません。', 404);
    }
    return $row;
}
