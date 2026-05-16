ALTER TABLE price_masters
  MODIFY COLUMN category ENUM('product', 'delivery_fee', 'collection', 'other_fee') NOT NULL DEFAULT 'product';

ALTER TABLE delivery_items
  MODIFY COLUMN category ENUM('product', 'delivery_fee', 'collection', 'other_fee') NOT NULL DEFAULT 'product';
