const cfg = window.TRAIT_SUPABASE || {};
const configReady = Boolean(cfg.url && cfg.publishableKey);
let supabase = null;
let currentUser = null;
let families = [];
let spices = [];

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

async function init() {
  if (!configReady) return showLogin();
  supabase = window.supabase.createClient(cfg.url, cfg.publishableKey);
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user || null;
  if (!currentUser) return showLogin();
  const { data: isAdminData, error } = await supabase.rpc('is_admin');
  if (error || !isAdminData) {
    await supabase.auth.signOut();
    return showLogin('Ce compte n’est pas autorisé à accéder à l’administration.');
  }
  showApp();
  await refreshAll();
}

async function refreshAll() {
  const [{ data: f }, { data: s }, { count: messageCount }] = await Promise.all([
    supabase.from('families').select('*').order('display_order').order('name'),
    supabase.from('spices').select('*, families(name)').order('name'),
    supabase.from('contact_requests').select('*', { count: 'exact', head: true }).eq('status','new')
  ]);
  families = f || [];
  spices = s || [];
  $('#metricSpices').textContent = spices.length;
  $('#metricFamilies').textContent = families.length;
  $('#metricMessages').textContent = messageCount || 0;
  $('#metricMissingImages').textContent = spices.filter(x => !x.main_image_url).length;
  renderSpices();
  renderFamilies();
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

function newSpice(){
  $('#spiceForm').reset(); $('#spiceId').value=''; $('#spicePublished').checked=true; $('#spiceColor').value='#C9A66B'; openModal('#spiceModal');
}
function editSpice(id){
  const s=spices.find(x=>x.id===id); if(!s)return;
  $('#spiceId').value=s.id; $('#spiceName').value=s.name||''; $('#spiceSlug').value=s.slug||''; $('#spiceFamily').value=s.family_id||''; $('#spiceOrigin').value=s.origin||''; $('#spiceDescription').value=s.description||''; $('#spiceImage').value=s.main_image_url||''; $('#spiceColor').value=s.accent_color||'#C9A66B'; $('#spicePublished').checked=!!s.is_published; openModal('#spiceModal');
}
async function saveSpice(e){
  e.preventDefault();
  const id=$('#spiceId').value;
  const payload={name:$('#spiceName').value.trim(),slug:$('#spiceSlug').value.trim()||slugify($('#spiceName').value),family_id:$('#spiceFamily').value||null,origin:$('#spiceOrigin').value.trim(),description:$('#spiceDescription').value.trim(),main_image_url:$('#spiceImage').value.trim(),accent_color:$('#spiceColor').value,is_published:$('#spicePublished').checked};
  const q=id?supabase.from('spices').update(payload).eq('id',id):supabase.from('spices').insert(payload);
  const {error}=await q; if(error)return alert(error.message); closeModal('#spiceModal'); await refreshAll();
}
async function toggleSpice(id,value){const {error}=await supabase.from('spices').update({is_published:value}).eq('id',id);if(error)return alert(error.message);await refreshAll();}

function newFamily(){ $('#familyForm').reset(); $('#familyId').value=''; $('#familyActive').checked=true; openModal('#familyModal'); }
function editFamily(id){const f=families.find(x=>x.id===id);if(!f)return;$('#familyId').value=f.id;$('#familyName').value=f.name||'';$('#familySlug').value=f.slug||'';$('#familyDescription').value=f.description||'';$('#familyOrder').value=f.display_order||0;$('#familyActive').checked=!!f.is_active;openModal('#familyModal');}
async function saveFamily(e){e.preventDefault();const id=$('#familyId').value;const payload={name:$('#familyName').value.trim(),slug:$('#familySlug').value.trim()||slugify($('#familyName').value),description:$('#familyDescription').value.trim(),display_order:Number($('#familyOrder').value||0),is_active:$('#familyActive').checked};const q=id?supabase.from('families').update(payload).eq('id',id):supabase.from('families').insert(payload);const {error}=await q;if(error)return alert(error.message);closeModal('#familyModal');await refreshAll();}

$('#loginForm').addEventListener('submit', login);
$('#spiceForm').addEventListener('submit', saveSpice);
$('#familyForm').addEventListener('submit', saveFamily);
$('#spiceName').addEventListener('input',()=>{if(!$('#spiceId').value)$('#spiceSlug').value=slugify($('#spiceName').value)});
$('#familyName').addEventListener('input',()=>{if(!$('#familyId').value)$('#familySlug').value=slugify($('#familyName').value)});
$('#spiceSearch').addEventListener('input',renderSpices);
$$('.nav button[data-view]').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
window.newSpice=newSpice;window.editSpice=editSpice;window.toggleSpice=toggleSpice;window.newFamily=newFamily;window.editFamily=editFamily;window.closeModal=closeModal;window.logout=logout;
init();
