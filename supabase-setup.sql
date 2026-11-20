create table if not exists public.chat_sessions (id text primary key, project_id text, staff_id text, client_name text, client_email text, updated_at timestamptz default now());
create table if not exists public.chat_messages (id bigserial primary key, session_id text references public.chat_sessions(id) on delete cascade, project_id text, sender text, text text, file_url text, file_name text, created_at timestamptz default now());
alter publication supabase_realtime add table public.chat_messages;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
create policy "Allow all sessions" on public.chat_sessions for all using (true) with check (true);
create policy "Allow all messages" on public.chat_messages for all using (true) with check (true);
insert into storage.buckets (id, name, public) values ('chat-files', 'chat-files', true) on conflict do nothing;
create policy "Public chat files" on storage.objects for all using (bucket_id = 'chat-files') with check (bucket_id = 'chat-files');