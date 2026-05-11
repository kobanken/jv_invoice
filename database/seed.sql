INSERT INTO customers
  (customer_code, name, honorific, payment_type, delivery_method, closing_day, postal_code, address, email, line_name, note)
VALUES
  ('B001', '株式会社青山サロン', '御中', 'bank_transfer', 'gmail_pdf', 31, '107-0062', '東京都港区南青山1-1-1', 'billing-aoyama@example.com', NULL, '振込顧客サンプル'),
  ('C001', '中野理容室', '御中', 'cash', 'hand_delivery', 31, '164-0001', '東京都中野区中野1-2-3', NULL, NULL, '現金顧客サンプル');

INSERT INTO stores (customer_id, name, display_order, note)
SELECT id, '本店', 1, '' FROM customers WHERE customer_code IN ('B001', 'C001');

INSERT INTO price_masters (customer_id, store_id, item_name, unit_price, category, start_date, note)
SELECT c.id, s.id, 'バスタオル', 50, 'product', '2026-04-01', ''
FROM customers c INNER JOIN stores s ON s.customer_id = c.id WHERE c.customer_code = 'B001';

INSERT INTO price_masters (customer_id, store_id, item_name, unit_price, category, start_date, note)
SELECT c.id, s.id, 'フェイスタオル', 10, 'product', '2026-04-01', ''
FROM customers c INNER JOIN stores s ON s.customer_id = c.id WHERE c.customer_code = 'B001';

INSERT INTO price_masters (customer_id, store_id, item_name, unit_price, category, start_date, note)
SELECT c.id, s.id, '配達料', 150, 'delivery_fee', '2026-04-01', ''
FROM customers c INNER JOIN stores s ON s.customer_id = c.id WHERE c.customer_code = 'B001';
