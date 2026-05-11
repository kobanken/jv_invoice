<?php
declare(strict_types=1);

function list_deliveries(): void
{
    $customerId = int_param($_GET, 'customer_id', true);
    $storeId = int_param($_GET, 'store_id', false);
    $billingMonth = isset($_GET['billing_month']) ? require_month($_GET, 'billing_month') : null;

    $where = ['h.customer_id = :customer_id'];
    $params = ['customer_id' => $customerId];
    if ($storeId !== null) {
        $where[] = 'h.store_id = :store_id';
        $params['store_id'] = $storeId;
    }
    if ($billingMonth !== null) {
        $where[] = 'h.billing_month = :billing_month';
        $params['billing_month'] = $billingMonth;
    }

    $sql = 'SELECT
            h.id AS header_id, h.customer_id, h.store_id, h.billing_month, h.delivery_date, h.note AS header_note,
            i.id AS item_id, i.item_name, i.quantity, i.unit_price, i.amount, i.category, i.note AS item_note
        FROM delivery_headers h
        LEFT JOIN delivery_items i ON i.delivery_header_id = h.id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY h.delivery_date ASC, i.category ASC, i.item_name ASC, i.id ASC';

    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    json_success([
        'rows' => $rows,
        'horizontal' => build_horizontal_delivery_view($rows),
        'summary' => calculate_delivery_summary_from_rows($rows),
    ]);
}

function save_deliveries(): void
{
    $data = json_body();
    $customerId = require_int_value($data, 'customer_id', 1);
    $storeId = require_int_value($data, 'store_id', 1);
    $billingMonth = require_month($data, 'billing_month');
    $deliveryDates = $data['delivery_dates'] ?? [];
    $items = $data['items'] ?? [];

    if (!is_array($deliveryDates) || count($deliveryDates) === 0) {
        json_error('delivery_dates は1件以上指定してください。', 422);
    }
    if (!is_array($items)) {
        json_error('items の形式が正しくありません。', 422);
    }

    $normalizedDates = [];
    foreach ($deliveryDates as $index => $dateValue) {
        $date = trim((string) $dateValue);
        if ($date === '') {
            $normalizedDates[$index] = null;
            continue;
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            json_error('納品日は YYYY-MM-DD 形式で指定してください。', 422);
        }
        $normalizedDates[$index] = $date;
    }

    $deliveryFee = $data['delivery_fee'] ?? null;
    $deliveryFeeUnitPrice = 0;
    $deliveryFeeName = '配達料';
    if (is_array($deliveryFee)) {
        $deliveryFeeUnitPrice = isset($deliveryFee['unit_price']) && $deliveryFee['unit_price'] !== '' ? (int) $deliveryFee['unit_price'] : 0;
        $deliveryFeeName = trim((string) ($deliveryFee['item_name'] ?? '配達料')) ?: '配達料';
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        delete_delivery_scope($customerId, $storeId, $billingMonth);

        $insertHeader = $pdo->prepare('INSERT INTO delivery_headers
            (customer_id, store_id, billing_month, delivery_date, note)
            VALUES (:customer_id, :store_id, :billing_month, :delivery_date, :note)');
        $insertItem = $pdo->prepare('INSERT INTO delivery_items
            (delivery_header_id, item_name, quantity, unit_price, amount, category, note)
            VALUES (:delivery_header_id, :item_name, :quantity, :unit_price, :amount, :category, :note)');

        $savedHeaders = 0;
        $savedItems = 0;
        foreach ($normalizedDates as $index => $date) {
            if ($date === null) {
                continue;
            }

            $dateItems = build_items_for_delivery_date($items, $index);
            if ($deliveryFeeUnitPrice > 0) {
                $dateItems[] = [
                    'item_name' => $deliveryFeeName,
                    'quantity' => 1,
                    'unit_price' => $deliveryFeeUnitPrice,
                    'category' => 'delivery_fee',
                    'note' => null,
                ];
            }
            if (count($dateItems) === 0) {
                continue;
            }

            $insertHeader->execute([
                'customer_id' => $customerId,
                'store_id' => $storeId,
                'billing_month' => $billingMonth,
                'delivery_date' => $date,
                'note' => optional_string($data, 'note', 1000),
            ]);
            $headerId = (int) $pdo->lastInsertId();
            $savedHeaders++;

            foreach ($dateItems as $item) {
                $amount = calculate_amount((int) $item['unit_price'], (int) $item['quantity']);
                $insertItem->execute([
                    'delivery_header_id' => $headerId,
                    'item_name' => $item['item_name'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'amount' => $amount,
                    'category' => $item['category'],
                    'note' => $item['note'],
                ]);
                $savedItems++;
            }
        }

        $pdo->commit();
        json_success(['headers' => $savedHeaders, 'items' => $savedItems], 201);
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
}

function delete_deliveries(): void
{
    $data = json_body();
    $source = $data ?: $_GET;
    $customerId = int_param($source, 'customer_id', true);
    $storeId = int_param($source, 'store_id', true);
    $billingMonth = require_month($source, 'billing_month');
    delete_delivery_scope($customerId, $storeId, $billingMonth);
    json_success(['deleted' => true]);
}

function delete_delivery_scope(int $customerId, int $storeId, string $billingMonth): void
{
    $stmt = db()->prepare('DELETE FROM delivery_headers
        WHERE customer_id = :customer_id AND store_id = :store_id AND billing_month = :billing_month');
    $stmt->execute([
        'customer_id' => $customerId,
        'store_id' => $storeId,
        'billing_month' => $billingMonth,
    ]);
}

function build_items_for_delivery_date(array $items, int $dateIndex): array
{
    $result = [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $quantities = $item['quantities'] ?? [];
        if (!is_array($quantities) || !isset($quantities[$dateIndex]) || $quantities[$dateIndex] === '') {
            continue;
        }
        $quantity = (int) $quantities[$dateIndex];
        if ($quantity <= 0) {
            continue;
        }
        $result[] = [
            'item_name' => require_string($item, 'item_name', 255),
            'quantity' => $quantity,
            'unit_price' => require_int_value($item, 'unit_price', 0),
            'category' => require_enum($item, 'category', ['product', 'delivery_fee', 'other_fee']),
            'note' => optional_string($item, 'note', 1000),
        ];
    }
    return $result;
}

function build_horizontal_delivery_view(array $rows): array
{
    $dates = [];
    $items = [];
    foreach ($rows as $row) {
        if (!in_array($row['delivery_date'], $dates, true)) {
            $dates[] = $row['delivery_date'];
        }
        if ($row['item_id'] === null) {
            continue;
        }
        $key = $row['item_name'] . '|' . $row['unit_price'] . '|' . $row['category'];
        if (!isset($items[$key])) {
            $items[$key] = [
                'item_name' => $row['item_name'],
                'unit_price' => (int) $row['unit_price'],
                'category' => $row['category'],
                'quantities' => [],
                'total_quantity' => 0,
                'amount' => 0,
            ];
        }
        $items[$key]['quantities'][$row['delivery_date']] = (int) $row['quantity'];
        $items[$key]['total_quantity'] += (int) $row['quantity'];
        $items[$key]['amount'] += (int) $row['amount'];
    }
    return [
        'delivery_dates' => $dates,
        'items' => array_values($items),
    ];
}

function calculate_delivery_summary_from_rows(array $rows): array
{
    $productTotal = 0;
    $deliveryFeeTotal = 0;
    $otherFeeTotal = 0;
    foreach ($rows as $row) {
        $amount = (int) ($row['amount'] ?? 0);
        if (($row['category'] ?? '') === 'product') {
            $productTotal += $amount;
        } elseif (($row['category'] ?? '') === 'delivery_fee') {
            $deliveryFeeTotal += $amount;
        } else {
            $otherFeeTotal += $amount;
        }
    }
    $subtotal = $productTotal + $deliveryFeeTotal + $otherFeeTotal;
    $tax = calculate_tax($subtotal);
    return [
        'product_total' => $productTotal,
        'delivery_fee_total' => $deliveryFeeTotal,
        'other_fee_total' => $otherFeeTotal,
        'subtotal' => $subtotal,
        'tax' => $tax,
        'total' => $subtotal + $tax,
        'tax_rate' => tax_rate(),
    ];
}
