CREATE TABLE IF NOT EXISTS site_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  display_name TEXT NOT NULL DEFAULT 'AE2V — BDE de Vélizy',
  bio TEXT NOT NULL DEFAULT 'Always further, together',
  logo_path TEXT NOT NULL DEFAULT '/assets/logo-ae2v.svg',
  discord_invite TEXT,
  discord_connected BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_items (
  id UUID PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'link' CHECK (kind IN ('link', 'discord', 'countdown')),
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Link',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured_start_at TIMESTAMPTZ,
  featured_end_at TIMESTAMPTZ,
  countdown_at TIMESTAMPTZ,
  publish_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  conditions JSONB NOT NULL DEFAULT '{"mode":"all","rules":[]}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS short_links (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[A-Za-z0-9_-]{2,48}$'),
  destination TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  image_alt TEXT NOT NULL DEFAULT '',
  site_name TEXT NOT NULL DEFAULT '',
  twitter_site TEXT NOT NULL DEFAULT '',
  twitter_large_image BOOLEAN NOT NULL DEFAULT TRUE,
  embed_color TEXT NOT NULL DEFAULT '#d60106',
  image_mode TEXT NOT NULL DEFAULT 'url' CHECK (image_mode IN ('url', 'upload', 'generated')),
  expires_at TIMESTAMPTZ,
  expiry_message TEXT NOT NULL DEFAULT 'Ce lien a expiré.',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS click_events (
  id BIGSERIAL PRIMARY KEY,
  short_link_id UUID REFERENCES short_links(id) ON DELETE CASCADE,
  page_item_id UUID REFERENCES page_items(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  referrer TEXT,
  country TEXT,
  city TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  qr_code_id UUID
);

CREATE INDEX IF NOT EXISTS click_events_short_link_idx ON click_events(short_link_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS click_events_item_idx ON click_events(page_item_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  short_link_id UUID REFERENCES short_links(id) ON DELETE SET NULL,
  foreground TEXT NOT NULL DEFAULT '#171717',
  background TEXT NOT NULL DEFAULT '#ffffff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE page_items ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ;
ALTER TABLE page_items ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE short_links ADD COLUMN IF NOT EXISTS image_alt TEXT NOT NULL DEFAULT '';
ALTER TABLE short_links ADD COLUMN IF NOT EXISTS site_name TEXT NOT NULL DEFAULT '';
ALTER TABLE short_links ADD COLUMN IF NOT EXISTS twitter_site TEXT NOT NULL DEFAULT '';
ALTER TABLE short_links ADD COLUMN IF NOT EXISTS twitter_large_image BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE short_links ADD COLUMN IF NOT EXISTS embed_color TEXT NOT NULL DEFAULT '#d60106';
ALTER TABLE short_links ADD COLUMN IF NOT EXISTS image_mode TEXT NOT NULL DEFAULT 'url';
ALTER TABLE click_events ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE click_events ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE click_events ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE click_events ADD COLUMN IF NOT EXISTS qr_code_id UUID;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS click_events_qr_code_idx ON click_events(qr_code_id, occurred_at DESC);

INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
UPDATE site_settings SET logo_path = '/assets/logo-ae2v.svg' WHERE logo_path IN ('/assets/favicon.ico', '/assets/avatar.svg');

INSERT INTO page_items (id, kind, title, subtitle, url, icon, sort_order) VALUES
  ('00000000-0000-4000-8000-000000000001', 'discord', 'Rejoins notre Discord', 'La communauté étudiante de Vélizy', 'https://discord.gg/z85wnSmdnH', 'Discord', 10),
  ('00000000-0000-4000-8000-000000000002', 'link', 'Le site officiel de l’AE2V', 'Actualités, événements et vie de l’association', 'https://ae2v.fr', 'Globe2', 20),
  ('00000000-0000-4000-8000-000000000003', 'link', 'Les photos de nos événements', 'Retrouve et télécharge les albums AE2V', 'https://photo.ae2v.fr', 'Camera', 30)
ON CONFLICT (id) DO NOTHING;
