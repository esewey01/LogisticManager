BEGIN;

-- 1) Asegurar que orders.id es BIGINT
ALTER TABLE orders
  ALTER COLUMN id TYPE bigint USING id::bigint;

-- 2) Alinear FK en order_items.order_id a BIGINT
ALTER TABLE order_items
  ALTER COLUMN order_id TYPE bigint USING order_id::bigint;

-- 3) Reforzar/asegurar la FK (drop + add si es necesario)
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_order_fk;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_order_fk
  FOREIGN KEY (order_id) REFERENCES orders(id);

COMMIT;

