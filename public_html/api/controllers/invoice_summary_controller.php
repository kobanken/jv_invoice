<?php
declare(strict_types=1);

function get_invoice_summary(): void
{
    $customerId = int_param($_GET, 'customer_id', true);
    $billingMonth = require_month($_GET, 'billing_month');
    $summary = calculate_invoice_summary($customerId, $billingMonth);
    json_success($summary);
}

function save_invoice_summary(): void
{
    $data = json_body();
    $customerId = require_int_value($data, 'customer_id', 1);
    $billingMonth = require_month($data, 'billing_month');
    $summary = calculate_invoice_summary($customerId, $billingMonth);

    $stmt = db()->prepare('INSERT INTO invoice_summaries
        (customer_id, billing_month, payment_type, delivery_method, product_total, delivery_fee_total, other_fee_total, subtotal, tax, total)
        VALUES
        (:customer_id, :billing_month, :payment_type, :delivery_method, :product_total, :delivery_fee_total, :other_fee_total, :subtotal, :tax, :total)
        ON DUPLICATE KEY UPDATE
            payment_type = VALUES(payment_type),
            delivery_method = VALUES(delivery_method),
            product_total = VALUES(product_total),
            delivery_fee_total = VALUES(delivery_fee_total),
            other_fee_total = VALUES(other_fee_total),
            subtotal = VALUES(subtotal),
            tax = VALUES(tax),
            total = VALUES(total),
            updated_at = CURRENT_TIMESTAMP');
    $stmt->execute($summary);
    json_success(calculate_invoice_summary($customerId, $billingMonth), 201);
}

function calculate_invoice_summary(int $customerId, string $billingMonth): array
{
    $customerStmt = db()->prepare('SELECT payment_type, delivery_method FROM customers WHERE id = :id');
    $customerStmt->execute(['id' => $customerId]);
    $customer = $customerStmt->fetch();
    if (!$customer) {
        json_error('顧客が見つかりません。', 404);
    }

    $stmt = db()->prepare('SELECT i.category, SUM(i.amount) AS total_amount
        FROM delivery_headers h
        INNER JOIN delivery_items i ON i.delivery_header_id = h.id
        WHERE h.customer_id = :customer_id AND h.billing_month = :billing_month
        GROUP BY i.category');
    $stmt->execute(['customer_id' => $customerId, 'billing_month' => $billingMonth]);

    $productTotal = 0;
    $deliveryFeeTotal = 0;
    $otherFeeTotal = 0;
    foreach ($stmt->fetchAll() as $row) {
        $amount = (int) $row['total_amount'];
        if ($row['category'] === 'product') {
            $productTotal = $amount;
        } elseif ($row['category'] === 'delivery_fee') {
            $deliveryFeeTotal = $amount;
        } else {
            $otherFeeTotal += $amount;
        }
    }

    $subtotal = $productTotal + $deliveryFeeTotal + $otherFeeTotal;
    $tax = calculate_tax($subtotal);
    return [
        'customer_id' => $customerId,
        'billing_month' => $billingMonth,
        'payment_type' => $customer['payment_type'],
        'delivery_method' => $customer['delivery_method'],
        'product_total' => $productTotal,
        'delivery_fee_total' => $deliveryFeeTotal,
        'other_fee_total' => $otherFeeTotal,
        'subtotal' => $subtotal,
        'tax' => $tax,
        'total' => $subtotal + $tax,
    ];
}
