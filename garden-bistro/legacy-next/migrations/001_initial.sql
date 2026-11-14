BEGIN;
CREATE TABLE IF NOT EXISTS settings(id text PRIMARY KEY, data jsonb NOT NULL DEFAULT '{}');
INSERT INTO settings VALUES('business','{"orderingEnabled":false,"pickupEnabled":false,"deliveryEnabled":false,"whatsappEnabled":true,"currency":"RWF"}') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS content(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK(kind IN ('page','room','menu','category','faq','gallery','event')), slug text NOT NULL,
 locale text NOT NULL CHECK(locale IN ('en','fr','sw')), title text NOT NULL, description text NOT NULL DEFAULT '', price integer CHECK(price>=0), published boolean NOT NULL DEFAULT false,
 sort_order integer NOT NULL DEFAULT 0, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(kind,slug,locale));
CREATE INDEX IF NOT EXISTS content_public ON content(locale,kind,published);
CREATE TABLE IF NOT EXISTS requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),reference text NOT NULL UNIQUE,kind text NOT NULL CHECK(kind IN ('reservation','hotel','event')),locale text NOT NULL,
 name text NOT NULL,phone text NOT NULL,email text,details jsonb NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','declined','alternative_proposed')),
 idempotency_key uuid UNIQUE NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS requests_queue ON requests(status,created_at DESC);
CREATE TABLE IF NOT EXISTS orders(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),reference text UNIQUE NOT NULL,locale text NOT NULL,name text NOT NULL,phone text NOT NULL,
 fulfilment text NOT NULL CHECK(fulfilment IN ('pickup','delivery')),details jsonb NOT NULL,subtotal integer NOT NULL CHECK(subtotal>=0),fee integer NOT NULL CHECK(fee>=0),
 total integer NOT NULL CHECK(total=subtotal+fee),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','preparing','ready_for_pickup','out_for_delivery','completed','cancelled')),
 idempotency_key uuid UNIQUE NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS order_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES orders(id),menu_item_id uuid NOT NULL REFERENCES content(id),name text NOT NULL,quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 50),unit_price integer NOT NULL CHECK(unit_price>=0),options jsonb NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS order_status_history(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,order_id uuid NOT NULL REFERENCES orders(id),status text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_logs(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor text NOT NULL,action text NOT NULL,record_id text,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS rate_limits(key text PRIMARY KEY,count integer NOT NULL,window_start timestamptz NOT NULL DEFAULT now());
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
COMMIT;
