-- Workspace documents: reserved for the future "Belgeler" module
-- (client/src/lib/documents.ts).
--
-- Phase 1 deliberately has no real Supabase Auth. RLS is therefore deny-by-default:
-- no anon/authenticated policies are created until tenant-aware Auth is implemented.
-- This prevents a public VITE_SUPABASE_ANON_KEY from becoming write/delete access.

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

insert into storage.buckets (id, name, public)
values ('workspace-documents', 'workspace-documents', false)
on conflict (id) do update set public = false;

-- Intentionally no storage.objects policies in Phase 1. The bucket stays private
-- and inaccessible from the browser until Auth + tenant ownership rules exist.
