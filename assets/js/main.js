// ===========================================================
// TRAIT D'ÉPICE — script principal (site statique, sans dépendance)
// ===========================================================

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- Menu mobile ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var mobileNav = document.querySelector('.mobile-nav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---------- Filtres + recherche catalogue (page Nos épices) ---------- */
  var pills = document.querySelectorAll('.filter-pill');
  var cards = document.querySelectorAll('[data-famille]');
  var searchInput = document.getElementById('epice-search');
  var searchEmpty = document.getElementById('epice-search-empty');
  var activeFamille = 'toutes';

  function applyFilters() {
    var query = (searchInput && searchInput.value || '').trim().toLowerCase();
    var visibleCount = 0;
    cards.forEach(function (card) {
      var famOk = activeFamille === 'toutes' || card.getAttribute('data-famille') === activeFamille;
      var nameOk = !query || (card.getAttribute('data-nom') || '').indexOf(query) !== -1;
      var match = famOk && nameOk;
      card.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    if (searchEmpty) searchEmpty.hidden = visibleCount !== 0;
  }

  if (pills.length && cards.length) {
    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        pills.forEach(function (p) { p.classList.remove('on'); p.setAttribute('aria-pressed', 'false'); });
        pill.classList.add('on');
        pill.setAttribute('aria-pressed', 'true');
        activeFamille = pill.getAttribute('data-filter');
        applyFilters();
      });
    });
  }
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  /* ---------- Sélecteur de formats (fiche produit) ---------- */
  var formatButtons = document.querySelectorAll('.fmt');
  if (formatButtons.length) {
    formatButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        formatButtons.forEach(function (b) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('on');
        btn.setAttribute('aria-pressed', 'true');
      });
    });
  }

  /* ---------- Formulaires (Contact / Professionnels) ---------- */
  // V1 sans back-end : le formulaire compose un e-mail (mailto) avec les
  // informations saisies. À terme, remplacer ce comportement par un vrai
  // envoi serveur (voir README.md du site, section "Formulaires").
  document.querySelectorAll('form[data-mailto]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var to = form.getAttribute('data-mailto');
      var subject = form.getAttribute('data-subject') || 'Nouveau message — Trait d\'Épice';
      var lines = [];
      form.querySelectorAll('input, select, textarea').forEach(function (field) {
        if (!field.name) return;
        var label = field.closest('.field') ? field.closest('.field').querySelector('label') : null;
        var labelText = label ? label.textContent : field.name;
        lines.push(labelText + ' : ' + (field.value || '—'));
      });
      var body = encodeURIComponent(lines.join('\n'));
      var mailtoUrl = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + body;
      window.location.href = mailtoUrl;

      var status = form.querySelector('.form-status');
      if (status) {
        status.classList.add('ok');
        status.textContent = 'Votre messagerie va s\'ouvrir avec le message pré-rempli. Il ne reste qu\'à l\'envoyer.';
      }
    });
  });

});
