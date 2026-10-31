-- Giả lập tối thiểu những phần Supabase có sẵn mà schema.sql dựa vào,
-- để chạy thử schema.sql trên một Postgres trống (dùng trong tests/kiem_tra_schema.sh).
-- KHÔNG chạy file này trên Supabase thật.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema extensions;

-- auth: bảng người dùng + auth.uid() đọc từ request.jwt.claims như Supabase
create schema auth;
create table auth.users (id uuid primary key, email text, last_sign_in_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- vault: chỉ cần view decrypted_secrets
create schema vault;
create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text);
create view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;

-- pg_net: ghi lại các lần gọi thay vì gọi mạng thật
create schema net;
create table net.goi (id bigserial primary key, url text, body jsonb, headers jsonb);
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
returns bigint language sql as $$ insert into net.goi (url, body, headers) values (url, body, headers) returning id $$;

-- storage
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;

-- realtime
create publication supabase_realtime;

grant usage on schema public to anon, authenticated, service_role;
-- giống Supabase: bảng/hàm mới tự cấp quyền cho anon, authenticated
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
