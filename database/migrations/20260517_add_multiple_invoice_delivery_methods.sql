ALTER TABLE customers
  MODIFY COLUMN delivery_method ENUM('gmail_pdf', 'fax', 'line', 'hand_delivery', 'postal') NOT NULL,
  ADD COLUMN delivery_methods VARCHAR(100) NULL AFTER delivery_method;

UPDATE customers
SET delivery_methods = delivery_method
WHERE delivery_methods IS NULL OR delivery_methods = '';

ALTER TABLE invoice_summaries
  MODIFY COLUMN delivery_method ENUM('gmail_pdf', 'fax', 'line', 'hand_delivery', 'postal') NOT NULL,
  ADD COLUMN delivery_methods VARCHAR(100) NULL AFTER delivery_method;

UPDATE invoice_summaries
SET delivery_methods = delivery_method
WHERE delivery_methods IS NULL OR delivery_methods = '';
