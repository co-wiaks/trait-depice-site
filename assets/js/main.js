// ===========================================================
// TRAIT D'ÉPICE — script principal
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

  /* ---------- Filtres + recherche catalogue ---------- */
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
  if (searchInput) searchInput.addEventListener('input', applyFilters);

  /* ---------- Sélecteur de formats ---------- */
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

  /* ---------- Formulaire de contact réel ---------- */
  var CONTACT_ENDPOINT = 'https://mpzisuzeyqooxdqcfrpr.supabase.co/functions/v1/contact-submit';

  document.querySelectorAll('form[data-contact-form]').forEach(function (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      var status = form.querySelector('.form-status');
      var formData = new FormData(form);

      // Honeypot anti-spam : un humain ne voit jamais ce champ.
      if ((formData.get('website') || '').toString().trim()) return;

      var payload = {
        name: (formData.get('name') || '').toString().trim(),
        company: (formData.get('company') || '').toString().trim(),
        email: (formData.get('email') || '').toString().trim(),
        phone: (formData.get('phone') || '').toString().trim(),
        subject: (formData.get('subject') || '').toString().trim(),
        message: (formData.get('message') || '').toString().trim()
      };

      if (!payload.name || !payload.email || !payload.message) {
        if (status) status.textContent = 'Merci de renseigner votre nom, votre e-mail et votre message.';
        return;
      }

      if (button) {
        button.disabled = true;
        button.textContent = 'Envoi…';
      }
      if (status) {
        status.classList.remove('ok');
        status.textContent = '';
      }

      try {
        var response = await fetch(CONTACT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var result = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(result.error || 'Envoi impossible');

        form.reset();
        if (status) {
          status.classList.add('ok');
          status.textContent = 'Merci. Votre demande a bien été envoyée.';
        }
      } catch (err) {
        if (status) status.textContent = 'Un problème est survenu pendant l’envoi. Réessayez dans quelques instants.';
        console.error(err);
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = 'Envoyer';
        }
      }
    });
  });

});
