#!/usr/bin/env node
/**
 * Synchronise le contenu publié de Supabase vers les JSON attendus par build.js.
 * Le site public reste ainsi 100 % statique et rapide, tandis que /admin écrit
 * directement dans Supabase.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PRODUCTS_DIR = path.join(ROOT, 'data/products');
const DISPLAYS_DIR = path.join(ROOT, 'data/presentoirs');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mpzisuzeyqooxdqcfrpr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_JpQ-ApNjB9mZ8Ym6-NCK9A_hXIuSnp0';

async function request(endpoint) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json'
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function clearJson(dir) {
  ensureDir(dir);
  for (const name of fs.readdirSync(dir)) {
    if (name.endsWith('.json')) fs.unlinkSync(path.join(dir, name));
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function main() {
  const [families, spices, displays] = await Promise.all([
    request('families?select=id,name,slug,color,is_active&is_active=eq.true&order=display_order.asc,name.asc'),
    request('spices?select=*&is_published=eq.true&order=name.asc'),
    request('displays?select=*&is_published=eq.true&order=display_order.asc,capacity.asc')
  ]);

  const familyById = new Map(families.map(f => [f.id, f]));

  clearJson(PRODUCTS_DIR);
  for (const s of spices) {
    const family = familyById.get(s.family_id);
    const profil = Array.isArray(s.aromatic_profile) ? s.aromatic_profile : [];
    const formats = Array.isArray(s.formats) ? s.formats : [];
    writeJson(path.join(PRODUCTS_DIR, `${s.slug}.json`), {
      nom: s.name,
      famille: family?.name || 'Sans famille',
      origine: s.origin || '',
      nouveau: Boolean(s.is_new),
      description: s.description || '',
      image: s.main_image_url || '',
      dot: s.accent_color || family?.color || '#C9A66B',
      halal: Boolean(s.halal),
      kasher: Boolean(s.kosher),
      profil,
      formats
    });
  }

  clearJson(DISPLAYS_DIR);
  for (const d of displays) {
    writeJson(path.join(DISPLAYS_DIR, `${d.slug}.json`), {
      nom: d.name,
      capacite: d.capacity || 0,
      description: d.description || '',
      image: d.main_image_url || ''
    });
  }

  console.log(`Supabase synchronisé : ${spices.length} épices, ${families.length} familles, ${displays.length} présentoirs.`);
}

main().catch(err => {
  console.error('Échec synchronisation Supabase:', err.message);
  process.exit(1);
});
