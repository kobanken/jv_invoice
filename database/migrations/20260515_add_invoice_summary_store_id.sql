ALTER TABLE invoice_summaries
  ADD COLUMN store_id INT UNSIGNED NULL AFTER customer_id,
  ADD INDEX idx_invoice_summaries_store_id (store_id),
  ADD CONSTRAINT fk_invoice_summaries_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

ALTER TABLE invoice_summaries
  DROP INDEX uq_invoice_summaries_customer_month,
  ADD UNIQUE KEY uq_invoice_summaries_customer_store_month (customer_id, store_id, billing_month);
