-- Workspace documents: powers the "Belgeler" module (client/src/lib/documents.ts).
-- No real user accounts exist yet (the app uses a client-side demo login), so this
-- mirrors the previous behavior of being open to anyone holding the anon key.
-- Tighten these policies once real Supabase Auth is wired up.

create table if not exists public.workspace_documents (
  id bigint generated always as identity primary key,
  name varchar(255) not null,
  category varchar(64) not null,
  description text,
  file_key varchar(512) not null,
  url varchar(1024) not null,
  mime_type varchar(128) not null,
  size_bytes integer not null,
  linked_module varchar(64),
  linked_reference varchar(128),
  created_at timestamptz not null default now()
);

alter table public.workspace_documents enable row level security;

create policy "Public read access" on public.workspace_documents
  for select to anon, authenticated using (true);

create policy "Public insert access" on public.workspace_documents
  for insert to anon, authenticated with check (true);

create policy "Public delete access" on public.workspace_documents
  for delete to anon, authenticated using (true);

insert into storage.buckets (id, name, public)
values ('workspace-documents', 'workspace-documents', true)
on conflict (id) do nothing;

create policy "Public read workspace documents" on storage.objects
  for select to anon, authenticated using (bucket_id = 'workspace-documents');

create policy "Public upload workspace documents" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'workspace-documents');

create policy "Public delete workspace documents" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'workspace-documents');
