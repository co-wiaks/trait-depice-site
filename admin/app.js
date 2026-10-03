const cfg = window.TRAIT_SUPABASE || {};
const configReady = Boolean(cfg.url && cfg.publishableKey);
let supabase = null;
let currentUser = null;
let families = [];
let spices = [];
let messages = [];

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function slugify(str='') {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

function esc(value='') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function showLogin(message='') {
  $('#loginView').classList.remove('hidden');
  $('#appView').classList.add('hidden');
  $('#loginError').textContent = message;
  if (!configReady) $('#configNotice').classList.remove('hidden');
}

function showApp() {
  $('#loginView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
}

async function isCurrentUserAdmin() {
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  return !error && Boolean(data);
}

async function init() {
  if (!configReady) return showLogin();
  supabase = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return showLogin();
  currentUser = user;

  if (!(await isCurrentUserAdmin())) {
    await supabase.auth.signOut();
    return showLogin('Ce compte n’est pas autorisé à accéder à l’administration.');
  }

  showApp();
  await refreshAll();
}

async function refreshAll() {
  const [familyRes, spiceRes, messageRes] = await Promise.all([
    supabase.from('families').select('*').order('display_order').order('name'),
    supabase.from('spices').select('*, families(name)').order('name'),
    supabase.from('contact_requests').select('*').order('created_at', { ascending: false }).limit(200)
  ]);

  if (familyRes.error) console.error(familyRes.error);
  if (spiceRes.error) console.error(spiceRes.error);
  if (messageRes.error) console.error(messageRes.error);

  families = familyRes.data || [];
  spices = spiceRes.data || [];
  messages = messageRes.data || [];

  $('#metricSpices').textContent = spices.length;
  $('#metricFamilies').textContent = families.length;
  $('#metricMessages').textContent = messages.filter(x => x.status === 'new').length;
  $('#metricMissingImages').textContent = spices.filter(x => !x.main_image_url).length;

  renderSpices();
  renderFamilies();
  renderMessages();
  fillFamilySelect();
}

function renderSpices() {
  const q = ($('#spiceSearch')?.value || '').toLowerCase();
  const rows = spices.filter(s => s.name.toLowerCase().includes(q)).map(s => `
    <tr>
      <td>${s.main_image_url ? `<img src="${esc(s.main_image_url)}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:8px">` : '<span class="muted">—</span>'}</td>
      <td><strong>${esc(s.name)}</strong><br><span class="muted">${esc(s.slug)}</span></td>
      <td>${esc(s.families?.name || 'Sans famille')}</td>
      <td><span class="badge ${s.is_published ? 'ok':'off'}">${s.is_published ? 'Publié':'Masqué'}</span></td>
      <td class="actions"><button onclick="editSpice('${s.id}')">Modifier</button><button onclick="toggleSpice('${s.id}',${!s.is_published})">${s.is_published?'Masquer':'Publier'}</button></td>
    </tr>`).join('');
  $('#spiceRows').innerHTML = rows || '<tr><td colspan="5" class="muted">Aucune épice</td></tr>';
}

function renderFamilies() {
  $('#familyRows').innerHTML = families.map(f => `
    <tr><td><strong>${esc(f.name)}</strong></td><td>${esc(f.slug)}</td><td>${f.display_order}</td><td><span class="badge ${f.is_active?'ok':'off'}">${f.is_active?'Active':'Masquée'}</span></td><td class="actions"><button onclick="editFamily('${f.id}')">Modifier</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Aucune famille</td></tr>';
}

function renderMessages() {
  $('#messageRows').innerHTML = messages.map(m => {
    const date = new Date(m.created_at).toLocaleString('fr-FR');
    const label = ({new:'Nouveau',in_progress:'En traitement',done:'Traité',archived:'Archivé'})[m.status] || m.status;
    return `<tr>
      <td>${esc(date)}</td>
      <td><strong>${esc(m.name)}</strong><br><span class="muted">${esc(m.company || m.email)}</span></td>
      <td>${esc(m.subject || 'Sans sujet')}</td>
      <td><span class="badge ${m.status === 'new' ? 'ok' : 'off'}">${esc(label)}</span></td>
      <td class="actions"><button onclick="openMessage('${m.id}')">Ouvrir</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="5" class="muted">Aucune demande reçue</td></tr>';
}

function fillFamilySelect() {
  $('#spiceFamily').innerHTML = '<option value="">Sans famille</option>' + families.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('');
}

async function login(e) {
  e.preventDefault();
  if (!configReady) return;
  $('#loginError').textContent='';
  const email = $('#email').value.trim();
  const password = $('#password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return $('#loginError').textContent = 'Connexion impossible. Vérifie ton email et ton mot de passe.';
  return init();
}

async function logout() {
  await supabase.auth.signOut();
  location.reload();
}

function switchView(name) {
  $$('.section').forEach(x => x.classList.add('hidden'));
  $(`#section-${name}`).classList.remove('hidden');
  $$('.nav button').forEach(x => x.classList.toggle('active', x.dataset.view === name));
  $('#pageTitle').textContent = ({dashboard:'Tableau de bord',spices:'Épices',families:'Familles',messages:'Demandes clients'}[name] || name);
}

function openModal(id){$(id).classList.remove('hidden')}
function closeModal(id){$(id).classList.add('hidden')}

function updatePreview(url) {
  const img = $('#spicePreview');
  if (url) { img.src = url; img.style.display = 'block'; }
  else { img.removeAttribute('src'); img.style.display = 'none'; }
}

function newSpice(){
  $('#spiceForm').reset();
  $('#spiceId').value='';
  $('#spicePublished').checked=true;
  $('#spiceColor').value='#C9A66B';
  updatePreview('');
  openModal('#spiceModal');
}

function editSpice(id){
  const s=spices.find(x=>x.id===id); if(!s)return;
  $('#spiceId').value=s.id;
  $('#spiceName').value=s.name||'';
  $('#spiceSlug').value=s.slug||'';
  $('#spiceFamily').value=s.family_id||'';
  $('#spiceOrigin').value=s.origin||'';
  $('#spiceDescription').value=s.description||'';
  $('#spiceImage').value=s.main_image_url||'';
  $('#spiceImageFile').value='';
  $('#spiceColor').value=s.accent_color||'#C9A66B';
  $('#spicePublished').checked=!!s.is_published;
  updatePreview(s.main_image_url || '');
  openModal('#spiceModal');
}

async function uploadSpiceImage(file, slug) {
  if (!file) return null;
  if (file.size > 5 * 1024 * 1024) throw new Error('La photo dépasse 5 Mo.');
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Format non autorisé. Utilise JPG, PNG ou WebP.');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safeSlug = slugify(slug || 'epice');
  const path = `${safeSlug}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('spices').upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('spices').getPublicUrl(path);
  return data.publicUrl;
}

async function saveSpice(e){
  e.preventDefault();
  const button = $('#spiceSaveButton');
  button.disabled = true;
  button.textContent = 'Enregistrement…';
  try {
    const id=$('#spiceId').value;
    const name=$('#spiceName').value.trim();
    const slug=$('#spiceSlug').value.trim()||slugify(name);
    let imageUrl=$('#spiceImage').value.trim() || null;
    const file=$('#spiceImageFile').files?.[0];
    if (file) imageUrl = await uploadSpiceImage(file, slug);

    const payload={
      name,
      slug,
      family_id:$('#spiceFamily').value||null,
      origin:$('#spiceOrigin').value.trim(),
      description:$('#spiceDescription').value.trim(),
      main_image_url:imageUrl,
      accent_color:$('#spiceColor').value,
      is_published:$('#spicePublished').checked,
      updated_at:new Date().toISOString()
    };

    const q=id?supabase.from('spices').update(payload).eq('id',id):supabase.from('spices').insert(payload);
    const {error}=await q;
    if(error) throw error;
    closeModal('#spiceModal');
    await refreshAll();
  } catch (err) {
    alert(err.message || 'Erreur lors de l’enregistrement.');
  } finally {
    button.disabled = false;
    button.textContent = 'Enregistrer';
  }
}

async function toggleSpice(id,value){
  const {error}=await supabase.from('spices').update({is_published:value,updated_at:new Date().toISOString()}).eq('id',id);
  if(error)return alert(error.message);
  await refreshAll();
}

function newFamily(){
  $('#familyForm').reset();
  $('#familyId').value='';
  $('#familyActive').checked=true;
  openModal('#familyModal');
}

function editFamily(id){
  const f=families.find(x=>x.id===id);if(!f)return;
  $('#familyId').value=f.id;
  $('#familyName').value=f.name||'';
  $('#familySlug').value=f.slug||'';
  $('#familyDescription').value=f.description||'';
  $('#familyOrder').value=f.display_order||0;
  $('#familyActive').checked=!!f.is_active;
  openModal('#familyModal');
}

async function saveFamily(e){
  e.preventDefault();
  const id=$('#familyId').value;
  const payload={
    name:$('#familyName').value.trim(),
    slug:$('#familySlug').value.trim()||slugify($('#familyName').value),
    description:$('#familyDescription').value.trim(),
    display_order:Number($('#familyOrder').value||0),
    is_active:$('#familyActive').checked,
    updated_at:new Date().toISOString()
  };
  const q=id?supabase.from('families').update(payload).eq('id',id):supabase.from('families').insert(payload);
  const {error}=await q;
  if(error)return alert(error.message);
  closeModal('#familyModal');
  await refreshAll();
}

function openMessage(id) {
  const m = messages.find(x => x.id === id); if (!m) return;
  const statuses = [
    ['new','Nouveau'],['in_progress','En traitement'],['done','Traité'],['archived','Archivé']
  ];
  $('#messageDetail').innerHTML = `
    <p><strong>${esc(m.name)}</strong>${m.company ? ` — ${esc(m.company)}` : ''}</p>
    <p><a href="mailto:${esc(m.email)}">${esc(m.email)}</a>${m.phone ? ` · ${esc(m.phone)}` : ''}</p>
    <p><strong>${esc(m.subject || 'Sans sujet')}</strong></p>
    <p style="white-space:pre-wrap;line-height:1.7">${esc(m.message)}</p>
    <label>Statut<select id="messageStatus">${statuses.map(([v,l]) => `<option value="${v}" ${m.status===v?'selected':''}>${l}</option>`).join('')}</select></label>
    <p><button class="btn btn-primary" onclick="saveMessageStatus('${m.id}')">Enregistrer le statut</button></p>`;
  openModal('#messageModal');
}

async function saveMessageStatus(id) {
  const status = $('#messageStatus').value;
  const { error } = await supabase.from('contact_requests').update({ status }).eq('id', id);
  if (error) return alert(error.message);
  closeModal('#messageModal');
  await refreshAll();
}

$('#loginForm').addEventListener('submit', login);
$('#spiceForm').addEventListener('submit', saveSpice);
$('#familyForm').addEventListener('submit', saveFamily);
$('#spiceName').addEventListener('input',()=>{if(!$('#spiceId').value)$('#spiceSlug').value=slugify($('#spiceName').value)});
$('#familyName').addEventListener('input',()=>{if(!$('#familyId').value)$('#familySlug').value=slugify($('#familyName').value)});
$('#spiceImage').addEventListener('input',()=>updatePreview($('#spiceImage').value.trim()));
$('#spiceImageFile').addEventListener('change',()=>{
  const file=$('#spiceImageFile').files?.[0];
  if(file) updatePreview(URL.createObjectURL(file));
});
$('#spiceSearch').addEventListener('input',renderSpices);
$$('.nav button[data-view]').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));

Object.assign(window,{newSpice,editSpice,toggleSpice,newFamily,editFamily,closeModal,logout,openMessage,saveMessageStatus,refreshAll});
init();
