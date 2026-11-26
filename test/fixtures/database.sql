-- Fixture database for the converter tests.
-- Covers every column type the converter maps, enums, arrays, comments, views and materialized views.
-- After changing this file regenerate database.json, see test/fixtures/serialize-database.ts
--
CREATE SCHEMA shop;

CREATE TYPE public.order_status AS ENUM ('new', 'paid', 'shipped');
COMMENT ON TYPE public.order_status IS 'Status of an order';

CREATE TYPE public.priority AS ENUM ('low', 'high');

CREATE TABLE public.customer_account (
  id uuid PRIMARY KEY,
  email character varying(120) NOT NULL,
  country_code character(2) NOT NULL,
  display_name text,
  avatar bytea,
  flags bit(3),
  feature_mask bit varying(8),
  is_active boolean DEFAULT true,
  login_count integer DEFAULT 0,
  visits bigint,
  balance numeric(10,2),
  score double precision,
  ratio real,
  rank smallint,
  birth_date date,
  wakes_at time without time zone,
  wakes_at_tz time with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp without time zone,
  preferences jsonb DEFAULT '{}'::jsonb,
  raw_preferences json,
  tags text[],
  lucky_numbers integer[],
  ip_address inet
);
COMMENT ON TABLE public.customer_account IS 'A customer''s account';
COMMENT ON COLUMN public.customer_account.email IS 'The customer''s e-mail';

CREATE TABLE public."HTTPRequestLog" (
  id bigint NOT NULL,
  took interval,
  status order_status,
  urgency priority
);

CREATE TABLE public.audit_entry (
  id integer NOT NULL
);

-- An array column for every mapped type, the converter wraps the element type in an array schema
--
CREATE TABLE public.array_check (
  id integer NOT NULL,
  codes character varying(20)[],
  ids uuid[],
  dates date[],
  times time without time zone[],
  moments timestamp with time zone[],
  switches boolean[],
  amounts numeric[],
  documents jsonb[],
  durations interval[]
);

-- Comments, defaults and enum values with characters that need escaping in the JSON output:
-- quotes, backticks, template placeholders, backslashes and line breaks.
-- Known pg-structure 7.15 limitation: its enum value parser drops a value with a line break
-- and doubles a backslash, so the enum in the schema differs from the database for those two values
CREATE TYPE public.quote_style AS ENUM ('it''s', 'back\slash', 'tick`', '${placeholder}', E'line\nbreak');
COMMENT ON TYPE public.quote_style IS 'Enum with `backticks`, ${braces} and a \ backslash';

CREATE TABLE public.escape_check (
  id integer NOT NULL,
  style quote_style,
  note text DEFAULT 'it''s `x` ${y} \u0041'
);
COMMENT ON TABLE public.escape_check IS 'Table with `backticks`, ${braces}, a \ backslash and it''s quoted';
COMMENT ON COLUMN public.escape_check.note IS E'Two\nlines with `tick`, ${braces} and \\u0041';

CREATE TABLE shop.sales_order (
  id integer PRIMARY KEY,
  status public.order_status NOT NULL,
  history order_status[],
  processing_time interval,
  payload json
);
COMMENT ON TABLE shop.sales_order IS 'An order placed in the shop';

CREATE VIEW shop.paid_orders AS
  SELECT id, status FROM shop.sales_order WHERE status = 'paid';

CREATE MATERIALIZED VIEW shop.order_totals AS
  SELECT status, count(*) AS total FROM shop.sales_order GROUP BY status;
