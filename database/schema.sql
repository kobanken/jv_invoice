CREATE TABLE customers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  honorific VARCHAR(30) NOT NULL DEFAULT '御中',
  payment_type ENUM('bank_transfer', 'cash') NOT NULL,
  delivery_method ENUM('gmail_pdf', 'fax', 'line', 'hand_delivery', 'postal') NOT NULL,
  delivery_methods VARCHAR(100) NULL,
  closing_day TINYINT UNSIGNED NOT NULL,
  postal_code VARCHAR(20) NULL,
  address VARCHAR(500) NULL,
  email VARCHAR(255) NULL,
  line_name VARCHAR(255) NULL,
  bank_transfer_name VARCHAR(500) NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_customer_code (customer_code),
  KEY idx_customers_payment_type (payment_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_stores_customer_id (customer_id),
  CONSTRAINT fk_stores_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE price_masters (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  store_id INT UNSIGNED NULL,
  item_name VARCHAR(255) NOT NULL,
  unit_price INT NOT NULL,
  category ENUM('product', 'delivery_fee', 'collection', 'other_fee') NOT NULL DEFAULT 'product',
  start_date DATE NOT NULL,
  end_date DATE NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_price_masters_customer_store (customer_id, store_id),
  KEY idx_price_masters_dates (start_date, end_date),
  CONSTRAINT fk_price_masters_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_price_masters_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE delivery_headers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  store_id INT UNSIGNED NOT NULL,
  billing_month CHAR(7) NOT NULL,
  delivery_date DATE NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_delivery_headers_scope (customer_id, store_id, billing_month),
  KEY idx_delivery_headers_month (billing_month),
  CONSTRAINT fk_delivery_headers_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_delivery_headers_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE delivery_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  delivery_header_id INT UNSIGNED NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  unit_price INT NOT NULL,
  amount INT NOT NULL,
  category ENUM('product', 'delivery_fee', 'collection', 'other_fee') NOT NULL DEFAULT 'product',
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_delivery_items_header_id (delivery_header_id),
  KEY idx_delivery_items_category (category),
  CONSTRAINT fk_delivery_items_header_id FOREIGN KEY (delivery_header_id) REFERENCES delivery_headers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_summaries (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  store_id INT UNSIGNED NULL,
  billing_month CHAR(7) NOT NULL,
  payment_type ENUM('bank_transfer', 'cash') NOT NULL,
  delivery_method ENUM('gmail_pdf', 'fax', 'line', 'hand_delivery', 'postal') NOT NULL,
  delivery_methods VARCHAR(100) NULL,
  product_total INT NOT NULL DEFAULT 0,
  delivery_fee_total INT NOT NULL DEFAULT 0,
  other_fee_total INT NOT NULL DEFAULT 0,
  subtotal INT NOT NULL DEFAULT 0,
  tax INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  issue_status ENUM('not_issued', 'issued') NOT NULL DEFAULT 'not_issued',
  delivery_status ENUM('not_delivered', 'delivered') NOT NULL DEFAULT 'not_delivered',
  payment_status ENUM('unpaid', 'partial', 'paid', 'overpaid') NOT NULL DEFAULT 'unpaid',
  issue_date DATE NULL,
  delivery_date DATE NULL,
  payment_date DATE NULL,
  status_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoice_summaries_customer_store_month (customer_id, store_id, billing_month),
  KEY idx_invoice_summaries_payment_type (payment_type),
  KEY idx_invoice_summaries_status (issue_status, delivery_status, payment_status),
  KEY idx_invoice_summaries_store_id (store_id),
  CONSTRAINT fk_invoice_summaries_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_summaries_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
