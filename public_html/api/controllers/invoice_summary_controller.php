<?php
declare(strict_types=1);

function get_invoice_summary(): void
{
    ensure_invoice_summary_store_column();
    ensure_invoice_summary_delivery_columns();
    $customerId = int_param($_GET, 'customer_id', false);
    $storeId = int_param($_GET, 'store_id', false);
    if ($customerId === null) {
        list_invoice_summaries();
        return;
    }
    $billingMonth = require_month($_GET, 'billing_month');
    $summary = calculate_invoice_summary($customerId, $billingMonth, $storeId);
    json_success($summary);
}

function save_invoice_summary(): void
{
    ensure_invoice_summary_store_column();
    ensure_invoice_summary_status_columns();
    ensure_invoice_summary_delivery_columns();
    $data = json_body();
    $customerId = require_int_value($data, 'customer_id', 1);
    $storeId = isset($data['store_id']) && $data['store_id'] !== '' && $data['store_id'] !== null
        ? require_int_value($data, 'store_id', 1)
        : null;
    $billingMonth = require_month($data, 'billing_month');
    $summary = calculate_invoice_summary($customerId, $billingMonth, $storeId);
    $summary['store_id'] = $storeId;

    $existingStmt = db()->prepare('SELECT id FROM invoice_summaries
        WHERE customer_id = :customer_id
          AND billing_month = :billing_month
          AND ((store_id IS NULL AND :store_id_null IS NULL) OR store_id = :store_id_value)
        LIMIT 1');
    $existingStmt->execute([
        'customer_id' => $customerId,
        'billing_month' => $billingMonth,
        'store_id_null' => $storeId,
        'store_id_value' => $storeId,
    ]);
    $existing = $existingStmt->fetch();

    if ($existing) {
        $stmt = db()->prepare('UPDATE invoice_summaries SET
            store_id = :store_id,
            payment_type = :payment_type,
            delivery_method = :delivery_method,
            delivery_methods = :delivery_methods,
            product_total = :product_total,
            delivery_fee_total = :delivery_fee_total,
            other_fee_total = :other_fee_total,
            subtotal = :subtotal,
            tax = :tax,
            total = :total,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = :id');
        $payload = [
            'id' => (int) $existing['id'],
            'store_id' => $summary['store_id'],
            'payment_type' => $summary['payment_type'],
            'delivery_method' => $summary['delivery_method'],
            'delivery_methods' => $summary['delivery_methods'],
            'product_total' => $summary['product_total'],
            'delivery_fee_total' => $summary['delivery_fee_total'],
            'other_fee_total' => $summary['other_fee_total'],
            'subtotal' => $summary['subtotal'],
            'tax' => $summary['tax'],
            'total' => $summary['total'],
        ];
    } else {
        $stmt = db()->prepare('INSERT INTO invoice_summaries
            (customer_id, store_id, billing_month, payment_type, delivery_method, delivery_methods, product_total, delivery_fee_total, other_fee_total, subtotal, tax, total)
            VALUES
            (:customer_id, :store_id, :billing_month, :payment_type, :delivery_method, :delivery_methods, :product_total, :delivery_fee_total, :other_fee_total, :subtotal, :tax, :total)');
        $payload = $summary;
    }
    $stmt->execute($payload);
    json_success(calculate_invoice_summary($customerId, $billingMonth, $storeId), 201);
}

function update_invoice_summary_status(): void
{
    ensure_invoice_summary_store_column();
    ensure_invoice_summary_status_columns();
    ensure_invoice_summary_delivery_columns();
    $data = json_body();
    $id = require_int_value($data, 'id', 1);

    $issueStatus = isset($data['issue_status'])
        ? require_enum($data, 'issue_status', ['not_issued', 'issued'])
        : null;
    $deliveryStatus = isset($data['delivery_status'])
        ? require_enum($data, 'delivery_status', ['not_delivered', 'delivered'])
        : null;
    $paymentStatus = isset($data['payment_status'])
        ? require_enum($data, 'payment_status', ['unpaid', 'partial', 'paid', 'overpaid'])
        : null;
    $paymentDate = optional_date($data, 'payment_date');
    $statusNote = optional_string($data, 'status_note', 1000);

    $current = get_invoice_summary_by_id($id);
    if (!$current) {
        json_error('請求集計が見つかりません。', 404);
    }

    $today = date('Y-m-d');
    $nextIssueStatus = $issueStatus ?? $current['issue_status'];
    $nextDeliveryStatus = $deliveryStatus ?? $current['delivery_status'];
    $nextPaymentStatus = $paymentStatus ?? $current['payment_status'];

    $stmt = db()->prepare('UPDATE invoice_summaries SET
        issue_status = :issue_status,
        delivery_status = :delivery_status,
        payment_status = :payment_status,
        issue_date = :issue_date,
        delivery_date = :delivery_date,
        payment_date = :payment_date,
        status_note = :status_note,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = :id');
    $stmt->execute([
        'id' => $id,
        'issue_status' => $nextIssueStatus,
        'delivery_status' => $nextDeliveryStatus,
        'payment_status' => $nextPaymentStatus,
        'issue_date' => $nextIssueStatus === 'issued' ? ($current['issue_date'] ?? $today) : null,
        'delivery_date' => $nextDeliveryStatus === 'delivered' ? ($current['delivery_date'] ?? $today) : null,
        'payment_date' => in_array($nextPaymentStatus, ['partial', 'paid', 'overpaid'], true)
            ? ($paymentDate ?? $current['payment_date'] ?? $today)
            : null,
        'status_note' => $statusNote ?? $current['status_note'],
    ]);

    json_success(get_invoice_summary_by_id($id));
}

function calculate_invoice_summary(int $customerId, string $billingMonth, ?int $storeId = null): array
{
    ensure_customer_delivery_columns_for_invoice_summary();
    $customerStmt = db()->prepare('SELECT payment_type, delivery_method, delivery_methods FROM customers WHERE id = :id');
    $customerStmt->execute(['id' => $customerId]);
    $customer = $customerStmt->fetch();
    if (!$customer) {
        json_error('顧客が見つかりません。', 404);
    }

    $where = ['h.customer_id = :customer_id', 'h.billing_month = :billing_month'];
    $params = ['customer_id' => $customerId, 'billing_month' => $billingMonth];
    if ($storeId !== null) {
        $where[] = 'h.store_id = :store_id';
        $params['store_id'] = $storeId;
    }

    $stmt = db()->prepare('SELECT i.category, SUM(i.amount) AS total_amount
        FROM delivery_headers h
        INNER JOIN delivery_items i ON i.delivery_header_id = h.id
        WHERE ' . implode(' AND ', $where) . '
        GROUP BY i.category');
    $stmt->execute($params);

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

    $deliveryMethods = parse_invoice_delivery_methods($customer['delivery_methods'] ?? null, $customer['delivery_method'] ?? null);
    $subtotal = $productTotal + $deliveryFeeTotal + $otherFeeTotal;
    $tax = calculate_tax($subtotal);
    return [
        'customer_id' => $customerId,
        'billing_month' => $billingMonth,
        'payment_type' => $customer['payment_type'],
        'delivery_method' => $deliveryMethods[0],
        'delivery_methods' => implode(',', $deliveryMethods),
        'product_total' => $productTotal,
        'delivery_fee_total' => $deliveryFeeTotal,
        'other_fee_total' => $otherFeeTotal,
        'subtotal' => $subtotal,
        'tax' => $tax,
        'total' => $subtotal + $tax,
    ];
}

function list_invoice_summaries(): void
{
    ensure_invoice_summary_status_columns();
    ensure_invoice_summary_delivery_columns();
    $paymentType = $_GET['payment_type'] ?? null;
    $billingMonth = isset($_GET['billing_month']) && $_GET['billing_month'] !== ''
        ? require_month($_GET, 'billing_month')
        : null;

    $where = [];
    $params = [];
    if ($paymentType !== null && $paymentType !== '') {
        if (!in_array($paymentType, ['bank_transfer', 'cash'], true)) {
            json_error('payment_type の値が正しくありません。', 422);
        }
        $where[] = 'i.payment_type = :payment_type';
        $params['payment_type'] = $paymentType;
    }
    if ($billingMonth !== null) {
        $where[] = 'i.billing_month = :billing_month';
        $params['billing_month'] = $billingMonth;
    }

    $sql = 'SELECT
            i.*,
            c.customer_code,
            c.name AS customer_name,
            c.closing_day,
            s.name AS store_name
        FROM invoice_summaries i
        INNER JOIN customers c ON c.id = i.customer_id
        LEFT JOIN stores s ON s.id = i.store_id';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY i.billing_month DESC, c.customer_code ASC, s.display_order ASC, s.id ASC, i.id ASC';

    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_success(array_map('normalize_invoice_summary_row', $stmt->fetchAll()));
}

function get_invoice_summary_by_id(int $id): ?array
{
    $stmt = db()->prepare('SELECT
            i.*,
            c.customer_code,
            c.name AS customer_name,
            c.closing_day,
            s.name AS store_name
        FROM invoice_summaries i
        INNER JOIN customers c ON c.id = i.customer_id
        LEFT JOIN stores s ON s.id = i.store_id
        WHERE i.id = :id
        LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ? normalize_invoice_summary_row($row) : null;
}

function ensure_invoice_summary_store_column(): void
{
    static $checked = false;
    if ($checked) {
        return;
    }

    $stmt = db()->query("SHOW COLUMNS FROM invoice_summaries LIKE 'store_id'");
    if (!$stmt->fetch()) {
        db()->exec('ALTER TABLE invoice_summaries ADD COLUMN store_id INT UNSIGNED NULL AFTER customer_id');
        db()->exec('ALTER TABLE invoice_summaries ADD INDEX idx_invoice_summaries_store_id (store_id)');
        db()->exec('ALTER TABLE invoice_summaries ADD CONSTRAINT fk_invoice_summaries_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL');
    }

    $indexStmt = db()->query("SHOW INDEX FROM invoice_summaries WHERE Key_name = 'uq_invoice_summaries_customer_month'");
    if ($indexStmt->fetch()) {
        db()->exec('ALTER TABLE invoice_summaries DROP INDEX uq_invoice_summaries_customer_month');
    }

    $storeMonthIndexStmt = db()->query("SHOW INDEX FROM invoice_summaries WHERE Key_name = 'uq_invoice_summaries_customer_store_month'");
    if (!$storeMonthIndexStmt->fetch()) {
        db()->exec('ALTER TABLE invoice_summaries ADD UNIQUE KEY uq_invoice_summaries_customer_store_month (customer_id, store_id, billing_month)');
    }

    $checked = true;
}

function ensure_invoice_summary_status_columns(): void
{
    static $checked = false;
    if ($checked) {
        return;
    }

    add_invoice_summary_column_if_missing('issue_status', "ALTER TABLE invoice_summaries ADD COLUMN issue_status ENUM('not_issued', 'issued') NOT NULL DEFAULT 'not_issued' AFTER total");
    add_invoice_summary_column_if_missing('delivery_status', "ALTER TABLE invoice_summaries ADD COLUMN delivery_status ENUM('not_delivered', 'delivered') NOT NULL DEFAULT 'not_delivered' AFTER issue_status");
    add_invoice_summary_column_if_missing('payment_status', "ALTER TABLE invoice_summaries ADD COLUMN payment_status ENUM('unpaid', 'partial', 'paid', 'overpaid') NOT NULL DEFAULT 'unpaid' AFTER delivery_status");
    add_invoice_summary_column_if_missing('issue_date', 'ALTER TABLE invoice_summaries ADD COLUMN issue_date DATE NULL AFTER payment_status');
    add_invoice_summary_column_if_missing('delivery_date', 'ALTER TABLE invoice_summaries ADD COLUMN delivery_date DATE NULL AFTER issue_date');
    add_invoice_summary_column_if_missing('payment_date', 'ALTER TABLE invoice_summaries ADD COLUMN payment_date DATE NULL AFTER delivery_date');
    add_invoice_summary_column_if_missing('status_note', 'ALTER TABLE invoice_summaries ADD COLUMN status_note TEXT NULL AFTER payment_date');

    $indexStmt = db()->query("SHOW INDEX FROM invoice_summaries WHERE Key_name = 'idx_invoice_summaries_status'");
    if (!$indexStmt->fetch()) {
        db()->exec('ALTER TABLE invoice_summaries ADD INDEX idx_invoice_summaries_status (issue_status, delivery_status, payment_status)');
    }

    $checked = true;
}

function ensure_invoice_summary_delivery_columns(): void
{
    static $checked = false;
    if ($checked) {
        return;
    }

    $deliveryMethodStmt = db()->query("SHOW COLUMNS FROM invoice_summaries LIKE 'delivery_method'");
    $deliveryMethodColumn = $deliveryMethodStmt->fetch();
    if ($deliveryMethodColumn && stripos((string) ($deliveryMethodColumn['Type'] ?? ''), "'fax'") === false) {
        db()->exec("ALTER TABLE invoice_summaries MODIFY delivery_method ENUM('gmail_pdf', 'fax', 'line', 'hand_delivery', 'postal') NOT NULL");
    }

    add_invoice_summary_column_if_missing('delivery_methods', 'ALTER TABLE invoice_summaries ADD COLUMN delivery_methods VARCHAR(100) NULL AFTER delivery_method');
    db()->exec('UPDATE invoice_summaries SET delivery_methods = delivery_method WHERE delivery_methods IS NULL OR delivery_methods = ""');
    $checked = true;
}

function ensure_customer_delivery_columns_for_invoice_summary(): void
{
    static $checked = false;
    if ($checked) {
        return;
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

function add_invoice_summary_column_if_missing(string $columnName, string $sql): void
{
    $stmt = db()->query("SHOW COLUMNS FROM invoice_summaries LIKE " . db()->quote($columnName));
    if (!$stmt->fetch()) {
        db()->exec($sql);
    }
}

function normalize_invoice_summary_row(array $row): array
{
    $row['delivery_methods'] = parse_invoice_delivery_methods($row['delivery_methods'] ?? null, $row['delivery_method'] ?? null);
    return $row;
}

function parse_invoice_delivery_methods(?string $value, ?string $fallback): array
{
    $allowed = invoice_delivery_method_values();
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

function invoice_delivery_method_values(): array
{
    return ['gmail_pdf', 'fax', 'line', 'hand_delivery', 'postal'];
}
