-- Remediate the original demo policies that exposed the document table and bucket
-- to every holder of the public anon key. No rows or storage objects are deleted.

drop policy if exists "Public read access" on public.workspace_documents;
drop policy if exists "Public insert access" on public.workspace_documents;
drop policy if exists "Public delete access" on public.workspace_documents;

drop policy if exists "Public read workspace documents" on storage.objects;
drop policy if exists "Public upload workspace documents" on storage.objects;
drop policy if exists "Public delete workspace documents" on storage.objects;

alter table public.workspace_documents enable row level security;

update storage.buckets
set public = false
where id = 'workspace-documents';
