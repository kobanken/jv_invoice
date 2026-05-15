ALTER TABLE invoice_summaries
  ADD COLUMN issue_status ENUM('not_issued', 'issued') NOT NULL DEFAULT 'not_issued' AFTER total,
  ADD COLUMN delivery_status ENUM('not_delivered', 'delivered') NOT NULL DEFAULT 'not_delivered' AFTER issue_status,
  ADD COLUMN payment_status ENUM('unpaid', 'partial', 'paid', 'overpaid') NOT NULL DEFAULT 'unpaid' AFTER delivery_status,
  ADD COLUMN issue_date DATE NULL AFTER payment_status,
  ADD COLUMN delivery_date DATE NULL AFTER issue_date,
  ADD COLUMN payment_date DATE NULL AFTER delivery_date,
  ADD COLUMN status_note TEXT NULL AFTER payment_date,
  ADD INDEX idx_invoice_summaries_status (issue_status, delivery_status, payment_status);
