CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_fstatus_idx ON orders (fulfillment_status);
CREATE INDEX IF NOT EXISTS orders_channel_idx ON orders (channel_id);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);
