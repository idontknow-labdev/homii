-- ============================================================
-- HOMII — Supabase Database Setup
-- Ejecuta este archivo completo en:
-- Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- Habilitar extensiones
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLAS
-- ============================================================

-- Perfiles de usuario (vinculados a Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  role text not null default 'student',
  phone text,
  avatar_color text default '#1a56db',
  avatar_url text,
  bio text,
  occupation text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists occupation text;

-- Propiedades
create table if not exists public.properties (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text default '',
  price integer not null default 0,
  rooms integer default 1,
  bathrooms integer default 1,
  location text not null default '',
  maps_query text default '',
  distance_to_campus float default 1.0,
  university_certified boolean default false,
  amenities text[] default '{}',
  landlord_id uuid references auth.users(id) on delete set null,
  landlord_name text default '',
  landlord_email text default '',
  landlord_rating float default 5.0,
  property_rating float default 4.5,
  images text[] default '{}',
  featured boolean default false,
  is_demo boolean default false,
  verification_report jsonb,
  reviews jsonb default '[]',
  created_at timestamptz default now()
);

-- Perfiles roomie
create table if not exists public.roomies (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  career text not null,
  budget integer not null default 0,
  type text not null default 'busca-lugar',
  location text default '',
  total_rent integer,
  gender text default 'Indistinto',
  schedule text default 'Diurno',
  available_from text default 'Proximamente',
  habits text[] default '{}',
  description text default '',
  contact text default '',
  avatar_color text default '#1a56db',
  is_demo boolean default false,
  created_at timestamptz default now()
);

-- Mensajes de chat
create table if not exists public.chats (
  id uuid default uuid_generate_v4() primary key,
  chat_id text not null,
  property_id uuid references public.properties(id) on delete cascade,
  property_title text default '',
  sender_id uuid references auth.users(id) on delete set null,
  sender_name text default '',
  receiver_id uuid references auth.users(id) on delete set null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Profiles
alter table public.profiles enable row level security;
create policy "Profiles visibles por todos" on public.profiles for select using (true);
create policy "Usuarios insertan su propio perfil" on public.profiles for insert with check (auth.uid() = id);
create policy "Usuarios actualizan su propio perfil" on public.profiles for update using (auth.uid() = id);

-- Properties
alter table public.properties enable row level security;
create policy "Propiedades visibles por todos" on public.properties for select using (true);
create policy "Propietarios insertan sus propiedades" on public.properties for insert with check (auth.uid() = landlord_id);
create policy "Propietarios y Administradores actualizan propiedades" on public.properties for update using (
  auth.uid() = landlord_id 
  or 
  exists (
    select 1 from public.profiles 
    where profiles.id = auth.uid() and profiles.role = 'university'
  )
);
create policy "Propietarios eliminan sus propiedades" on public.properties for delete using (auth.uid() = landlord_id);

-- Roomies
alter table public.roomies enable row level security;
create policy "Perfiles roomie visibles por todos" on public.roomies for select using (true);
create policy "Usuarios insertan su perfil roomie" on public.roomies for insert with check (auth.uid() = user_id);
create policy "Usuarios actualizan su perfil roomie" on public.roomies for update using (auth.uid() = user_id);
create policy "Usuarios eliminan su perfil roomie" on public.roomies for delete using (auth.uid() = user_id);

-- Chats
alter table public.chats enable row level security;
create policy "Usuarios ven sus propios chats" on public.chats for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Usuarios autenticados envian mensajes" on public.chats for insert with check (auth.uid() = sender_id);
create policy "Receptor marca mensajes como leidos" on public.chats for update using (auth.uid() = receiver_id);

-- ============================================================
-- REAL-TIME
-- Activa real-time para la tabla chats
-- ============================================================
alter publication supabase_realtime add table public.chats;

-- ============================================================
-- STORAGE — Bucket para imagenes de propiedades
-- ============================================================
insert into storage.buckets (id, name, public)
values ('homii-images', 'homii-images', true)
on conflict (id) do nothing;

create policy "Imagenes publicas visibles" on storage.objects
  for select using (bucket_id = 'homii-images');

create policy "Usuarios autenticados suben imagenes" on storage.objects
  for insert with check (bucket_id = 'homii-images' and auth.role() = 'authenticated');

create policy "Usuarios eliminan sus propias imagenes" on storage.objects
  for delete using (bucket_id = 'homii-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- DATOS DE DEMOSTRACION (solo uno por tipo)
-- ============================================================

insert into public.properties (
  title, description, price, rooms, bathrooms,
  location, maps_query, distance_to_campus,
  university_certified, amenities,
  landlord_name, landlord_email,
  featured, is_demo, reviews
) values (
  'Propiedad de Ejemplo — Solo Demostracion',
  'Este es un anuncio de demostración para mostrar cómo funciona la plataforma. Un propietario real añadiría fotos del lugar, la dirección exacta en Google Maps, los servicios incluidos (agua, internet, electricidad) y el precio mensual. Regístrese como propietario para publicar su propio inmueble de forma gratuita.',
  0, 1, 1,
  'Portoviejo, Manabí, Ecuador',
  'Portoviejo, Manabí, Ecuador',
  1.0, false,
  array['internet', 'agua'],
  'Equipo Homii', 'soporte@homii.ec',
  false, true,
  '[{"author": "Usuario de demostración", "rating": 5, "text": "Esta es una reseña de ejemplo. Los usuarios reales dejan sus propias valoraciones después de conocer el inmueble."}]'::jsonb
);

insert into public.roomies (
  name, career, budget, type, gender, schedule,
  available_from, habits, description, contact, avatar_color, is_demo
) values (
  'Perfil de Ejemplo',
  'Carrera PUCEM — Solo Demostracion',
  0, 'busca-lugar', 'Indistinto', 'Diurno',
  'Solo demostracion',
  array['No fumador', 'Sin mascotas'],
  'Este es un perfil de demostración para mostrar cómo se vería el perfil de un compañero de vivienda real. Los estudiantes indican su presupuesto, horario de clases y hábitos de convivencia. Regístrese para publicar su propio perfil de forma gratuita.',
  'soporte@homii.ec', '#1a56db', true
);

-- ============================================================
-- IMPORTANTE: Despues de ejecutar este SQL, ve a:
-- Authentication → Settings → Email Auth
-- Desactiva "Enable email confirmations" (para pruebas)
-- O actívalo si quieres que los usuarios confirmen su correo
-- ============================================================
