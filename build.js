#!/usr/bin/env node
/**
 * TRAIT D'ÉPICE — générateur de site statique
 * -------------------------------------------
 * Assemble les pages du site (header, footer, fiches produit) à partir de :
 *   - data/products/*.json        → un fichier par épice (géré par l'espace /admin, ou à la main)
 *   - templates/pages/*.html      → le contenu de chaque page principale
 *   - templates/produit.html      → le gabarit d'une fiche produit
 *
 * Usage :  node build.js
 * Sortie : le site complet, prêt à héberger, à la racine du dossier.
 *
 * Pour ajouter / modifier une épice : utilisez l'espace /admin (recommandé), ou
 * éditez / ajoutez un fichier dans data/products/ à la main, puis relancez
 * `node build.js`. Pour changer un texte d'une page principale : éditez le
 * fichier correspondant dans templates/pages/ puis relancez la commande.
 * Voir README.md pour le détail.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// ---- Réglages de la marque -------------------------------------------------
const SITE_NAME = "Trait d'Épice";
const EMAIL = 'contact@traitdepice.fr'; // ← à remplacer par votre adresse définitive

// -----------------------------------------------------------------------------

// Transforme "Épices douces" -> "epices-douces" (utilisé pour les filtres du catalogue)
function slugify(str) {
  return String(str)
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // enlève les accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Éclaircit une couleur hexadécimale vers le blanc (pour fabriquer un fond de
// vignette pastel à partir de la seule couleur d'accent choisie dans /admin)
function tint(hex, amount) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return '#F1EEE3';
  const [r, g, b] = [1, 2, 3].map(i => parseInt(m[i], 16));
  const mix = c => Math.round(c + (255 - c) * amount);
  return `#${[r, g, b].map(mix).map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

const PRODUCTS_DIR = path.join(ROOT, 'data/products');
const products = fs.readdirSync(PRODUCTS_DIR)
  .filter(f => f.endsWith('.json'))
  .map(file => {
    const raw = JSON.parse(fs.readFileSync(path.join(PRODUCTS_DIR, file), 'utf8'));
    const slug = path.basename(file, '.json'); // le nom du fichier fait foi (c'est lui que /admin gère)
    const dot = raw.dot || '#C9A66B';
    return {
      ...raw,
      slug,
      familleSlug: slugify(raw.famille || ''),
      dot,
      bg: raw.bg || tint(dot, 0.86),
    };
  })
  .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

const families = [];
products.forEach(p => {
  if (!families.find(f => f.slug === p.familleSlug)) {
    families.push({ slug: p.familleSlug, nom: p.famille, color: p.dot });
  }
});

// ---- Présentoirs (meubles de point de vente, gérés par /admin) ------------
const PRESENTOIRS_DIR = path.join(ROOT, 'data/presentoirs');
const presentoirs = fs.existsSync(PRESENTOIRS_DIR)
  ? fs.readdirSync(PRESENTOIRS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(file => {
        const raw = JSON.parse(fs.readFileSync(path.join(PRESENTOIRS_DIR, file), 'utf8'));
        return { ...raw, slug: path.basename(file, '.json') };
      })
      .sort((a, b) => (a.capacite || 0) - (b.capacite || 0))
  : [];

// ---------------------------------------------------------------- Helpers --

function readTpl(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function fill(tpl, data) {
  return tpl.replace(/{{(\w+)}}/g, (m, key) => (key in data ? data[key] : m));
}

function productHref(slug, fromProduits) {
  return fromProduits ? `${slug}.html` : `produits/${slug}.html`;
}

// L'espace /admin enregistre les photos en chemin absolu (ex: "/assets/img/produits/x.jpg").
// On les relie au bon niveau selon la page (racine ou produits/), comme les autres liens du site.
function resolveImage(image, prefix) {
  if (!image) return '';
  return prefix + image.replace(/^\/+/, '');
}

function renderProductCard(p, prefix, fromProduits) {
  const img = resolveImage(p.image, prefix);
  const visual = img
    ? `<img src="${img}" alt="${p.nom}" loading="lazy">`
    : `<div class="dot" style="background:${p.dot};"></div>`;
  return `
        <a href="${prefix}${productHref(p.slug, fromProduits)}" class="product-card" data-famille="${p.familleSlug}" data-nom="${p.nom.toLowerCase()}">
          <div class="thumb" style="background:${p.bg};">
            ${visual}
            ${p.nouveau ? '<span class="badge-new">Nouveau</span>' : ''}
          </div>
          <div class="info">
            <span class="fam">${p.famille}</span>
            <span class="nom">${p.nom}</span>
            ${p.origine ? `<span class="origine">Origine ${p.origine}</span>` : ''}
          </div>
        </a>`;
}

// Badges Halal / Casher affichés sur une fiche produit (visuels génériques —
// à remplacer par le logo exact de l'organisme certificateur si besoin).
function renderCertBadges(p) {
  let html = '';
  if (p.halal) {
    html += `
        <span class="cert-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Halal
        </span>`;
  }
  if (p.kasher) {
    html += `
        <span class="cert-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Casher
        </span>`;
  }
  return html;
}

function renderPresentoirCard(d, prefix) {
  const img = resolveImage(d.image, prefix);
  const visual = img
    ? `<img src="${img}" alt="${d.nom}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#B9B2A7;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Photo à venir</div>`;
  return `
        <div class="presentoir-card" style="background:#1F1F1F;border:1px solid #3A3A3A;display:flex;flex-direction:column;">
          <div style="aspect-ratio:3/4;background:#141414;overflow:hidden;">${visual}</div>
          <div style="padding:20px;display:flex;flex-direction:column;gap:10px;">
            <span class="eyebrow on-dark">${d.capacite} épices</span>
            <h3 style="color:var(--white);font-size:20px;margin:0;">${d.nom}</h3>
            <p style="color:#B9B2A7;font-size:13px;line-height:1.7;margin:0;">${d.description || ''}</p>
          </div>
        </div>`;
}

function renderFilterPills() {
  let html = `<button class="filter-pill on" data-filter="toutes" aria-pressed="true"><span class="family-dot" style="background:#1A1A1A;"></span>Toutes</button>`;
  families.forEach(f => {
    html += `\n      <button class="filter-pill" data-filter="${f.slug}" aria-pressed="false"><span class="family-dot" style="background:${f.color};"></span>${f.nom}</button>`;
  });
  return html;
}

function renderFamilyChips() {
  return families.map(f => `
      <span class="family-chip"><span class="family-dot" style="background:${f.color};"></span>${f.nom}</span>`).join('');
}

// ---------------------------------------------------------------- Layout --

// Icône du logo (voilier) : deux exports du même fichier fourni par la marque.
// - icon-light.png : détourée, pour les fonds clairs (header blanc, illustrations sur fond crème)
// - icon-dark.png  : détourée et sans zones blanches internes, pour les fonds sombres (footer, header Pro)
function iconImg(prefix, dark, size) {
  const file = dark ? 'icon-dark.png' : 'icon-light.png';
  return `<img src="${prefix}assets/img/${file}" alt="" class="brand-icon" style="height:${size}px;width:auto;">`;
}

const NAV_ITEMS = [
  { key: 'accueil', label: 'Accueil', href: 'index.html' },
  { key: 'epices', label: 'Nos Épices', href: 'nos-epices.html' },
  { key: 'recettes', label: 'Recettes', href: 'recettes.html' },
  { key: 'histoire', label: 'Notre Histoire', href: 'notre-histoire.html' },
  { key: 'pro', label: 'Professionnels', href: 'professionnels.html' },
];

function renderHeader({ prefix, dark, active }) {
  const navLinks = NAV_ITEMS.map(item =>
    `<a href="${prefix}${item.href}"${item.key === active ? ' class="active"' : ''}>${item.label}</a>`
  ).join('\n      ');

  const brand = `<a href="${prefix}index.html" class="brand-lockup">
        ${iconImg(prefix, dark, 54)}
        <span class="tagline-wrap"><span class="name">TRAIT D'ÉPICE</span><span class="tagline">VOYAGE · SAVEURS · PASSION</span></span>
      </a>`;

  return `<header class="site-header${dark ? ' dark' : ''}">
    <div class="container" style="display:flex;align-items:center;justify-content:space-between;">
      ${brand}
      <nav class="main-nav">
      ${navLinks}
      </nav>
      <div class="header-actions">
        <a href="${prefix}contact.html" class="btn btn-dark">Contact</a>
        <button class="nav-toggle" aria-label="Menu" aria-expanded="false">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
      </div>
    </div>
  </header>`;
}

function renderMobileNav({ prefix, active }) {
  const links = NAV_ITEMS.map(item =>
    `<a href="${prefix}${item.href}"${item.key === active ? ' class="active"' : ''}>${item.label}</a>`
  ).join('\n    ');
  return `<div class="mobile-nav">
    ${links}
    <a href="${prefix}contact.html" class="btn btn-dark btn-block">Contact</a>
  </div>`;
}

function renderFooter({ prefix }) {
  return `<footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          ${iconImg(prefix, true, 40)}
          <span>TRAIT D'ÉPICE</span>
        </div>
        <div class="footer-cols">
          <div class="footer-col">
            <span class="head">Boutique</span>
            <a href="${prefix}nos-epices.html">Nos épices</a>
            <a href="${prefix}recettes.html">Recettes</a>
          </div>
          <div class="footer-col">
            <span class="head">Marque</span>
            <a href="${prefix}notre-histoire.html">Notre histoire</a>
            <a href="${prefix}professionnels.html">Professionnels</a>
          </div>
          <div class="footer-col">
            <span class="head">Contact</span>
            <span>Carré Primeur — 94360 Fresnes</span>
            <span>${EMAIL}</span>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Trait d'Épice — Tous droits réservés</span>
        <span>Origine Espagne · Sélection artisanale</span>
      </div>
    </div>
  </footer>`;
}

function renderDocument({ title, description, prefix, dark, active, bodyHtml }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — ${SITE_NAME}</title>
${description ? `<meta name="description" content="${description}">` : ''}
<link rel="icon" href="${prefix}assets/img/favicon.png">
<link rel="stylesheet" href="${prefix}assets/css/style.css">
<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
</head>
<body>
${renderHeader({ prefix, dark, active })}
${renderMobileNav({ prefix, active })}
<main>
${bodyHtml}
</main>
${renderFooter({ prefix })}
<script src="${prefix}assets/js/main.js"></script>
<script>
// Termine la connexion (invitation / mot de passe oublié) puis renvoie vers /admin/.
// Sans effet tant que l'identité Netlify n'est pas configurée sur l'hébergement.
if (window.netlifyIdentity) {
  window.netlifyIdentity.on('init', function (user) {
    if (!user) {
      window.netlifyIdentity.on('login', function () {
        document.location.href = '${prefix}admin/';
      });
    }
  });
}
</script>
</body>
</html>
`;
}

// Sépare la balise <meta description> éventuelle en tête de fragment
function extractDescription(fragment) {
  const m = fragment.match(/^\s*<meta name="description" content="([^"]*)">\s*/);
  if (m) {
    return { description: m[1], rest: fragment.slice(m[0].length) };
  }
  return { description: '', rest: fragment };
}

// ------------------------------------------------------------- Pages -----

const PAGES = [
  { file: 'index.html', title: 'Accueil', active: 'accueil', dark: false },
  { file: 'nos-epices.html', title: 'Nos Épices', active: 'epices', dark: false },
  { file: 'recettes.html', title: 'Recettes', active: 'recettes', dark: false },
  { file: 'notre-histoire.html', title: 'Notre Histoire', active: 'histoire', dark: false },
  { file: 'professionnels.html', title: 'Professionnels', active: 'pro', dark: true },
  { file: 'contact.html', title: 'Contact', active: 'contact', dark: false },
];

function build() {
  PAGES.forEach(page => {
    const raw = readTpl(`templates/pages/${page.file}`);
    const { description, rest } = extractDescription(raw);
    let body = rest;

    body = body.replace(/{{PREFIX}}/g, '');
    body = body.replace(/{{EMAIL}}/g, EMAIL);
    body = body.replace(/{{PRODUCT_COUNT}}/g, String(products.length));
    body = body.replace('{{FAMILY_CHIPS}}', renderFamilyChips());
    body = body.replace('{{FILTER_PILLS}}', renderFilterPills());

    if (body.includes('{{FEATURED_PRODUCTS}}')) {
      // Met les nouveautés en avant sur la page d'accueil, complète avec les autres épices
      const byNewFirst = [...products].sort((a, b) => (b.nouveau ? 1 : 0) - (a.nouveau ? 1 : 0));
      const featured = byNewFirst.slice(0, 4).map(p => renderProductCard(p, '', false)).join('\n');
      body = body.replace('{{FEATURED_PRODUCTS}}', featured);
    }
    if (body.includes('{{ALL_PRODUCTS}}')) {
      const all = products.map(p => renderProductCard(p, '', false)).join('\n');
      body = body.replace('{{ALL_PRODUCTS}}', all);
    }
    if (body.includes('{{PRESENTOIRS}}')) {
      const cards = presentoirs.map(d => renderPresentoirCard(d, '')).join('\n');
      body = body.replace('{{PRESENTOIRS}}', cards);
    }

    const html = renderDocument({
      title: page.title,
      description,
      prefix: '',
      dark: page.dark,
      active: page.active,
      bodyHtml: body,
    });

    fs.writeFileSync(path.join(ROOT, page.file), html, 'utf8');
    console.log('✓', page.file);
  });

  // ---- Fiches produit --------------------------------------------------
  const produitTpl = readTpl('templates/produit.html');
  const produitsDir = path.join(ROOT, 'produits');
  if (!fs.existsSync(produitsDir)) fs.mkdirSync(produitsDir);

  products.forEach(p => {
    const suggestions = products
      .filter(o => o.familleSlug === p.familleSlug && o.slug !== p.slug)
      .concat(products.filter(o => o.familleSlug !== p.familleSlug))
      .slice(0, 4)
      .map(o => renderProductCard(o, '../', true))
      .join('\n');

    const pictos = p.profil.map(pic => `
        <div class="picto">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="1.4"><circle cx="12" cy="12" r="9"/></svg>
          <span>${pic.label}</span>
        </div>`).join('');

    const formats = p.formats.map(f => `
          <button class="fmt${f.defaut ? ' on' : ''}" aria-pressed="${f.defaut ? 'true' : 'false'}">
            <span class="poids">${f.poids}</span>
          </button>`).join('');

    const detailImg = resolveImage(p.image, '../');
    const visual = detailImg
      ? `<img src="${detailImg}" alt="${p.nom}">`
      : `<div class="dot" style="background:${p.dot};"></div>`;

    const originBadge = p.origine
      ? `<div class="origin-badge">Origine<br>${p.origine}</div>`
      : '';

    let body = fill(produitTpl, {
      NOM: p.nom,
      FAMILLE: p.famille,
      BG: p.bg,
      DESCRIPTION: p.description,
    });
    body = body.replace(/{{PREFIX}}/g, '../');
    body = body.replace('{{VISUAL}}', visual);
    body = body.replace('{{ORIGIN_BADGE}}', originBadge);
    body = body.replace('{{PICTOS}}', pictos);
    body = body.replace('{{BADGES}}', renderCertBadges(p));
    body = body.replace('{{FORMATS}}', formats);
    body = body.replace('{{SUGGESTIONS}}', suggestions);

    const html = renderDocument({
      title: p.nom,
      description: `${p.nom} — ${p.famille}. Épice sélectionnée par ${SITE_NAME}.`,
      prefix: '../',
      dark: false,
      active: 'epices',
      bodyHtml: body,
    });

    fs.writeFileSync(path.join(produitsDir, `${p.slug}.html`), html, 'utf8');
    console.log('✓ produits/' + p.slug + '.html');
  });

  console.log(`\nSite généré : ${PAGES.length} pages principales + ${products.length} fiches produit.`);
}

build();
