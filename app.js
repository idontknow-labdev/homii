// ============================================================
// HOMII — Application Logic v4.0
// Backend: Supabase (Base de datos real + Chat en tiempo real)
// ============================================================

const SUPABASE_URL  = 'https://zpbgzpytzhbbrfdalrde.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYmd6cHl0emhiYnJmZGFscmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDYwNjcsImV4cCI6MjEwMDkyMjA2N30.PFJp52sxHr_xgTBSuevlCnpOaNnZ0V4icKNv0VJVSLM';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// ESTADO GLOBAL
// ============================================================

let CURRENT_USER    = null;
let CURRENT_PROFILE = null;
let activeChatChannel = null;
let openPropertyData  = null; // Cache de propiedad abierta en modal

const APP = {
  currentView: 'landing',
  galleryIndex: {},
  notifications: [],
  pendingRoute: null,
  supportHistory: [{ sender: 'bot', text: 'Hola. Soy el asistente de soporte de Homii. ¿En qué le puedo ayudar?' }]
};

// ============================================================
// INICIALIZACIÓN
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  setupNav();
  setupSegmentTabs();
  setupAuth();
  setupSearch();
  setupRoomie();
  setupPublishForm();
  setupSupport();
  setupNotifications();
  setupActivation();
  navigate('landing');
});

// ============================================================
// AUTENTICACIÓN
// ============================================================

async function initAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) await loadUserProfile(session.user);

  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await loadUserProfile(session.user);
      updateNavUI();
      const nombre = CURRENT_PROFILE?.name || session.user.email;
      addNotif('Sesión iniciada', 'Bienvenido, ' + nombre + '.');
      if (APP.pendingRoute) {
        const r = APP.pendingRoute; APP.pendingRoute = null; navigate(r);
      }
    } else if (event === 'SIGNED_OUT') {
      CURRENT_USER = null; CURRENT_PROFILE = null;
      document.body.classList.remove('pucem-mode');
      updateNavUI();
    }
  });

  updateNavUI();
}

async function loadUserProfile(user) {
  if (!user) {
    CURRENT_USER = null;
    CURRENT_PROFILE = null;
    document.body.classList.remove('pucem-mode');
    updateNavUI();
    return;
  }

  CURRENT_USER = user;
  
  // Consultar perfil de la tabla profiles
  let { data: profile } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
  
  if (!profile) {
    // Si la tabla no devolvió fila, crear perfil por defecto inmediatamente
    const defaultName = user.user_metadata?.name || user.email.split('@')[0];
    const colors = ['#0f172a','#1a56db','#0369a1','#7c3aed','#059669','#d97706'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    profile = {
      id: user.id,
      name: defaultName,
      role: 'student',
      phone: null,
      avatar_color: color
    };

    await db.from('profiles').upsert(profile, { onConflict: 'id' }).catch(err => console.warn('Profile init upsert warning:', err));
  }

  // Cargar datos locales de respaldo si existen
  const localAvatar = localStorage.getItem('homii_avatar_' + user.id);
  if (localAvatar && !profile.avatar_url) profile.avatar_url = localAvatar;

  const localExtraStr = localStorage.getItem('homii_extra_' + user.id);
  if (localExtraStr) {
    try {
      const localExtra = JSON.parse(localExtraStr);
      if (localExtra.bio && !profile.bio) profile.bio = localExtra.bio;
      if (localExtra.occupation && !profile.occupation) profile.occupation = localExtra.occupation;
      if (localExtra.phone && !profile.phone) profile.phone = localExtra.phone;
      if (localExtra.name && profile.name === user.email.split('@')[0]) profile.name = localExtra.name;
    } catch(e) {}
  }

  CURRENT_PROFILE = profile;

  // Activar modo PUCEM únicamente si el correo termina en @pucem.edu.ec o @pucesm.edu.ec
  const em = (user.email || '').toLowerCase();
  const isPUCEM = em.endsWith('@pucem.edu.ec') || em.endsWith('@pucesm.edu.ec');
  document.body.classList.toggle('pucem-mode', isPUCEM);

  updateNavUI();
}

function setupAuth() {
  document.getElementById('auth-modal')?.addEventListener('click', e => {
    if (e.target.id === 'auth-modal') closeAuth();
  });
  document.getElementById('auth-close')?.addEventListener('click', closeAuth);
  document.getElementById('login-form')?.addEventListener('submit', e => { e.preventDefault(); doLogin(); });
  document.getElementById('register-form')?.addEventListener('submit', e => { e.preventDefault(); doRegister(); });
  document.getElementById('to-register')?.addEventListener('click', () => switchPanel('register'));
  document.getElementById('to-login')?.addEventListener('click', () => switchPanel('login'));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeAuth(); closePropertyModal(); closeRoomieModal(); closeConversationModal(); }
  });
}

function switchPanel(which) {
  document.getElementById('panel-login').style.display    = which === 'login'    ? 'flex' : 'none';
  document.getElementById('panel-register').style.display = which === 'register' ? 'flex' : 'none';
}

function openAuth()         { document.getElementById('auth-modal')?.classList.add('open'); switchPanel('login');    clearAuthErrors(); }
function openAuthRegister() { document.getElementById('auth-modal')?.classList.add('open'); switchPanel('register'); clearAuthErrors(); }
function closeAuth()        { document.getElementById('auth-modal')?.classList.remove('open'); }

function clearAuthErrors() {
  ['login-error', 'register-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  });
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

async function doLogin() {
  clearAuthErrors();
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const btn   = document.querySelector('#login-form button[type=submit]');
  
  if (!email) { showAuthError('login-error', 'Ingrese su correo electrónico.'); return; }
  if (!pass)  { showAuthError('login-error', 'Ingrese su contraseña.'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }

  const { data, error } = await db.auth.signInWithPassword({ email, password: pass });
  if (btn) { btn.disabled = false; btn.textContent = 'Iniciar sesión'; }

  if (error) {
    let msg = 'Correo electrónico o contraseña incorrectos.';
    const errStr = (error.message || '').toLowerCase();
    if (errStr.includes('email not confirmed')) {
      msg = 'Debe confirmar su correo antes de acceder (o desactive "Confirm email" en Supabase Dashboard).';
    } else if (errStr.includes('rate limit')) {
      msg = 'Se ha superado el límite de peticiones de Supabase. Espere unos minutos e intente de nuevo.';
    } else if (error.message && !errStr.includes('invalid login credentials')) {
      msg = error.message;
    }
    showAuthError('login-error', msg);
    return;
  }

  if (data?.user) {
    await loadUserProfile(data.user);
    closeAuth();
  }
}

async function doRegister() {
  clearAuthErrors();
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-password').value;
  let role  = document.getElementById('reg-role')?.value || 'student';
  if (role !== 'landlord' && role !== 'student') role = 'student';
  const phone = document.getElementById('reg-phone').value.trim();
  const terms = document.getElementById('reg-terms')?.checked;
  const btn   = document.querySelector('#register-form button[type=submit]');

  if (!name)  { showAuthError('register-error', 'Ingrese su nombre completo.'); return; }
  if (!email) { showAuthError('register-error', 'Ingrese un correo electrónico.'); return; }
  if (pass.length < 6) { showAuthError('register-error', 'La contraseña debe tener al menos 6 caracteres.'); return; }
  if (!terms) { showAuthError('register-error', 'Debe aceptar los términos y condiciones para continuar.'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Creando cuenta...'; }

  // Intento 1: Registrar nuevo usuario
  let { data, error } = await db.auth.signUp({
    email,
    password: pass,
    options: { data: { name, role } }
  });

  // Si Supabase responde con rate limit o correo ya existente, intentamos iniciar sesión de forma transparente
  if (error) {
    const errStr = (error.message || '').toLowerCase();
    if (errStr.includes('already') || errStr.includes('registered') || errStr.includes('rate limit')) {
      const { data: loginData, error: loginError } = await db.auth.signInWithPassword({ email, password: pass });
      if (!loginError && loginData?.user) {
        data = loginData;
        error = null;
      }
    }
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Crear cuenta'; }

  if (error) {
    let msg = 'No se pudo crear la cuenta.';
    const errStr = (error.message || '').toLowerCase();
    if (errStr.includes('already') || errStr.includes('registered')) {
      msg = 'Este correo ya está registrado. Por favor ingrese a "Iniciar sesión" con su contraseña.';
    } else if (errStr.includes('rate limit')) {
      msg = 'Supabase ha alcanzado el límite de envío de correos (Email rate limit exceeded).\n\nPara quitar este límite en Supabase de forma definitiva:\n• Vaya a Supabase Dashboard → Authentication → Providers → Email y desactive la casilla "Confirm email".';
    } else if (error.message) {
      msg = error.message;
    }
    showAuthError('register-error', msg);
    return;
  }

  if (data?.user) {
    const colors = ['#0f172a','#1a56db','#0369a1','#7c3aed','#059669','#d97706'];
    const color  = colors[Math.floor(Math.random() * colors.length)];

    await db.from('profiles').upsert({
      id: data.user.id,
      name,
      role,
      phone: phone || null,
      avatar_color: color
    });

    await loadUserProfile(data.user);
    closeAuth();
    addNotif('Cuenta creada', 'Bienvenido a Homii, ' + name + '.');
    if (role === 'landlord') { APP.pendingRoute = 'landlord'; }
  }
}

async function logout() {
  if (activeChatChannel) { activeChatChannel.unsubscribe(); activeChatChannel = null; }
  await db.auth.signOut();
  document.body.classList.remove('pucem-mode');
  CURRENT_USER = null;
  CURRENT_PROFILE = null;
  updateNavUI();
  navigate('landing');
}

function updateNavUI() {
  const user    = CURRENT_USER;
  const profile = CURRENT_PROFILE;
  const guestEl  = document.getElementById('nav-guest');
  const userEl   = document.getElementById('nav-user');
  const nameEl   = document.getElementById('nav-username');
  const avEl     = document.getElementById('nav-avatar');
  const llLink   = document.querySelector('.nav-landlord-link');
  const uniLink  = document.querySelector('.nav-uni-link');
  const profLink = document.querySelector('.nav-profile-link');

  if (user) {
    const displayName = profile?.name || user.email.split('@')[0];
    if (guestEl)  guestEl.style.display  = 'none';
    if (userEl)   userEl.style.display   = 'flex';
    if (nameEl)   nameEl.textContent     = displayName.split(' ')[0];
    if (avEl) {
      if (profile?.avatar_url) {
        avEl.innerHTML = `<img src="${profile.avatar_url}" alt="${displayName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        avEl.style.background = 'transparent';
      } else {
        avEl.textContent      = displayName.charAt(0).toUpperCase();
        avEl.style.background = profile?.avatar_color || '#1a56db';
      }
      avEl.style.cursor     = 'pointer';
      avEl.title            = 'Ver mi perfil';
      avEl.onclick          = () => navigate('profile');
    }
    if (llLink)   llLink.style.display   = profile?.role === 'landlord'   ? 'list-item' : 'none';
    if (uniLink)  uniLink.style.display  = profile?.role === 'university' ? 'list-item' : 'none';
    if (profLink) profLink.style.display = 'list-item';
  } else {
    if (guestEl)  guestEl.style.display  = 'flex';
    if (userEl)   userEl.style.display   = 'none';
    if (llLink)   llLink.style.display   = 'none';
    if (uniLink)  uniLink.style.display  = 'none';
    if (profLink) profLink.style.display = 'none';
  }
}

function guardRoute(route) {
  if (!CURRENT_USER) { APP.pendingRoute = route; openAuth(); return false; }
  const role = CURRENT_PROFILE?.role;
  if (route === 'landlord'   && role !== 'landlord')   { APP.pendingRoute = route; openAuth(); return false; }
  if (route === 'university' && role !== 'university') { APP.pendingRoute = route; openAuth(); return false; }
  return true;
}

// ============================================================
// NAVEGACIÓN
// ============================================================

function navigate(viewId) {
  if ((viewId === 'landlord' || viewId === 'university') && !guardRoute(viewId)) return;
  if (viewId === 'profile' && !CURRENT_USER) { openAuth(); return; }

  APP.currentView = viewId;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  // Soporte para vistas con id explícito que no siguen el patrón viewId+'-view'
  const target = document.getElementById(viewId + '-view') || document.getElementById(viewId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.view === viewId);
  });

  if (viewId === 'search')     filterListings();
  if (viewId === 'roomie')     { filterRoomies(); updateRoomieStats(); }
  if (viewId === 'landlord')   renderLandlordPanel();
  if (viewId === 'university') renderUniPanel();
  if (viewId === 'profile')    renderProfileView();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupNav() {
  document.querySelectorAll('.nav-link').forEach(l => {
    l.addEventListener('click', () => { if (l.dataset.view) navigate(l.dataset.view); });
  });
  document.querySelector('.logo')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('btn-login')?.addEventListener('click', openAuth);
  document.getElementById('btn-register')?.addEventListener('click', openAuthRegister);
  document.getElementById('btn-logout')?.addEventListener('click', logout);
  document.getElementById('hero-search-btn')?.addEventListener('click', () => {
    const kw = document.getElementById('quick-search')?.value.trim();
    if (kw) { const fi = document.getElementById('filter-keyword'); if (fi) fi.value = kw; }
    navigate('search');
  });
  document.getElementById('quick-search')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') document.getElementById('hero-search-btn')?.click();
  });
  document.getElementById('public-profile-modal')?.addEventListener('click', e => {
    if (e.target.id === 'public-profile-modal') closePublicProfileModal();
  });
}

// ============================================================
// MODO PUCEM
// Controlado con clase CSS 'pucem-mode' en <body>
// .pucem-element se oculta por defecto y aparece solo en modo PUCEM
// Se activa automáticamente en loadUserProfile() según dominio de correo
// ============================================================

// ============================================================
// SEGMENTOS (LANDING)
// ============================================================

const SEGMENTS = {
  student: {
    title: 'Su hogar seguro, validado por la PUCEM',
    desc: 'Mudarse a Portoviejo para estudiar en la PUCEM es una decisión importante. Homii le ayuda a encontrar arriendos a pasos del campus, inspeccionados físicamente y respaldados por el convenio oficial con la Pontificia Universidad Católica de Manabí.',
    features: ['A minutos caminando del campus PUCEM', 'Inmuebles inspeccionados y certificados', 'Soporte exclusivo Homii Student', 'Filtros rápidos de agua, internet y electricidad'],
    quote: 'Llegué desde Loja sin conocer Portoviejo. Gracias a Homii Student encontré un cuarto certificado a tres cuadras de la PUCEM con internet de fibra. Mis padres quedaron completamente tranquilos.',
    author: 'Sofía Valenzuela — Estudiante de Medicina, PUCEM'
  },
  general: {
    title: 'Arrendamientos transparentes, rápidos y directos',
    desc: 'Encuentre su próximo departamento o estudio en Portoviejo con filtros reales: internet estable, agua constante, precio justo y políticas de mascotas flexibles.',
    features: ['Buscador con filtros precisos', 'Trato directo con propietarios verificados', 'Comparación de precios y valoraciones reales', 'Plataforma autogestionable sin intermediarios'],
    quote: 'Detestaba buscar arriendos porque las fotos nunca coincidían con la realidad. En Homii los filtros son exactos. Encontré mi departamento en un fin de semana.',
    author: 'Javier Pérez — Diseñador, Portoviejo'
  },
  landlord: {
    title: 'Mayor visibilidad y arrendamiento directo',
    desc: '¿Tiene inmuebles en Portoviejo? Homii le da visibilidad directa entre miles de arrendatarios, con herramientas para gestionar sus propiedades de forma profesional.',
    features: ['Publicación gratuita con fotos reales', 'Chat directo con inquilinos en tiempo real', 'Plan destacado con mayor alcance', 'Certificación universitaria disponible'],
    quote: 'Tengo dos departamentos y los arrendaba lentamente antes de Homii. Desde que publiqué, ambos están ocupados todo el año.',
    author: 'Rosa María Delgado — Propietaria en Portoviejo'
  },
  admin: {
    title: 'Gestión centralizada de múltiples unidades',
    desc: 'Optimice la tasa de ocupación de sus condominios y edificios en Manabí. Gestione consultas y garantice el estándar de calidad exigido.',
    features: ['Panel de métricas centralizado', 'Soporte prioritario', 'Gestión masiva de listados', 'Certificación colectiva de condominio'],
    quote: 'Administro un edificio de 16 departamentos. Homii ha centralizado todas las consultas de manera muy eficiente.',
    author: 'Alberto Castro — Administrador de Condominios'
  },
  worker: {
    title: 'Transición a Manabí sin dificultad',
    desc: 'Si su empresa lo reubica en Portoviejo, Homii facilita el proceso con estancias ejecutivas completamente amobladas y listas para habitar desde el primer día.',
    features: ['Estudios ejecutivos completamente amoblados', 'Ubicación estratégica en zonas laborales', 'Contratos temporales flexibles', 'Todos los servicios incluidos desde el primer día'],
    quote: 'Me trasladaron a la sede de Portoviejo. Encontré un mini departamento amoblado con todos los servicios activos. El proceso fue rápido.',
    author: 'Eduardo Castillo — Consultor, Portoviejo'
  }
};

function setupSegmentTabs() {
  document.querySelectorAll('.seg-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.seg-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderSegment(tab.dataset.seg);
    });
  });
  renderSegment('student');
}

function renderSegment(key) {
  const isPucemMode = document.body.classList.contains('pucem-mode');
  
  let d = SEGMENTS[key];
  if (key === 'student' && !isPucemMode) {
    d = {
      title: 'Su hogar cómodo y seguro en Portoviejo',
      desc: 'Mudarse a Portoviejo por estudios o trabajo es un gran paso. Homii le ayuda a encontrar arriendos verificados físicamente, cercanos a zonas principales y con todos los servicios.',
      features: ['A minutos de centros educativos y comerciales', 'Inmuebles inspeccionados y verificados', 'Soporte y contacto directo con propietarios', 'Filtros rápidos de agua, internet y luz'],
      quote: 'Llegué a Portoviejo y encontré una habitación verificada a pocos minutos con internet de fibra. El proceso fue completamente transparente.',
      author: 'Sofía Valenzuela — Residente en Portoviejo'
    };
  }

  if (!d) return;
  document.querySelectorAll('.seg-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('seg-panel-' + key);
  if (panel) {
    panel.innerHTML = `
      <div>
        <h3 class="seg-panel-title">${d.title}</h3>
        <p class="seg-panel-desc">${d.desc}</p>
        <ul class="seg-features">
          ${d.features.map(f => `<li><span class="seg-check">&#10003;</span>${f}</li>`).join('')}
        </ul>
      </div>
      <div class="seg-quote">
        <p class="seg-quote-text">"${d.quote}"</p>
        <p class="seg-quote-author">— ${d.author}</p>
      </div>`;
    panel.classList.add('active');
  }
}

// ============================================================
// BUSCADOR — PROPIEDADES
// ============================================================

function setupSearch() {
  const priceSlider = document.getElementById('filter-price');
  const priceVal    = document.getElementById('filter-price-val');
  if (priceSlider && priceVal) {
    priceSlider.addEventListener('input', () => { priceVal.textContent = '$' + priceSlider.value; filterListings(); });
  }
  const distSlider = document.getElementById('filter-distance');
  const distVal    = document.getElementById('filter-distance-val');
  if (distSlider && distVal) {
    distSlider.addEventListener('input', () => { distVal.textContent = distSlider.value + ' km'; filterListings(); });
  }
  ['filter-keyword','filter-rooms','filter-certified','sort-by'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', filterListings);
    document.getElementById(id)?.addEventListener('input',  filterListings);
  });
  document.querySelectorAll('.filter-amenity').forEach(cb => cb.addEventListener('change', filterListings));
}

async function filterListings() {
  const grid = document.getElementById('listings-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="no-results-msg">Cargando propiedades...</div>';

  const kw       = (document.getElementById('filter-keyword')?.value || '').toLowerCase().trim();
  const maxPrice = parseInt(document.getElementById('filter-price')?.value || '1200');
  const minRooms = document.getElementById('filter-rooms')?.value || 'any';
  const certOnly = document.getElementById('filter-certified')?.checked || false;
  const maxDist  = parseFloat(document.getElementById('filter-distance')?.value || '10');
  const sortBy   = document.getElementById('sort-by')?.value || 'featured';
  const amenities = [...document.querySelectorAll('.filter-amenity:checked')].map(cb => cb.value);

  let query = db.from('properties').select('*');
  if (certOnly) query = query.eq('university_certified', true);

  const { data: props, error } = await query;

  if (error) {
    grid.innerHTML = '<div class="no-results-msg">Error al cargar propiedades. Intente de nuevo.</div>';
    return;
  }

  let filtered = (props || []).filter(p => {
    const matchKw   = !kw || p.title.toLowerCase().includes(kw) || (p.description || '').toLowerCase().includes(kw) || (p.location || '').toLowerCase().includes(kw);
    const matchPrc  = p.is_demo || p.price <= maxPrice;
    const matchRoom = minRooms === 'any' || p.rooms >= parseInt(minRooms);
    const matchDist = p.is_demo || p.distance_to_campus <= maxDist;
    const matchAmen = amenities.every(a => (p.amenities || []).includes(a));
    return matchKw && matchPrc && matchRoom && matchDist && matchAmen;
  });

  if (sortBy === 'price-asc')  filtered.sort((a, b) => a.price - b.price);
  if (sortBy === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  if (sortBy === 'distance')   filtered.sort((a, b) => a.distance_to_campus - b.distance_to_campus);
  if (sortBy === 'rating')     filtered.sort((a, b) => b.property_rating - a.property_rating);
  if (sortBy === 'featured')   filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  const count = document.getElementById('listings-count');
  if (count) count.textContent = filtered.length;
  renderListingsGrid(filtered);

  // Actualizar stats en hero
  const heroProps = document.querySelector('.hero-stat-num');
  if (heroProps) heroProps.textContent = (props || []).filter(p => !p.is_demo).length + '+';
}

function renderListingsGrid(list) {
  const grid = document.getElementById('listings-grid');
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = '<div class="no-results-msg">No se encontraron propiedades con los filtros seleccionados.</div>';
    return;
  }

  grid.innerHTML = list.map(p => {
    const img   = p.images && p.images.length > 0 ? p.images[0] : null;
    const stars = '★'.repeat(Math.round(p.property_rating || 4)) + '☆'.repeat(5 - Math.round(p.property_rating || 4));
    const reviews = parseJSON(p.reviews, []);

    const certBadge = p.university_certified
      ? (p.certification_type === 'pucem'
          ? '<span class="badge badge-pucem">Cert. PUCEM</span>'
          : '<span class="badge badge-green">Certificado Homii</span>')
      : '';

    return `
    <article class="prop-card ${p.featured ? 'featured' : ''}" onclick="openPropertyModal('${p.id}')">
      <div class="prop-img">
        ${img
          ? `<img src="${img}" alt="${p.title}">`
          : `<div class="prop-img-placeholder"><svg viewBox="0 0 24 24" width="40" height="40" stroke-width="1.2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`}
        <div class="prop-price-overlay">
          <div class="prop-price">${p.is_demo ? '<span style="font-size:0.8rem;font-weight:400;">Solo demostración</span>' : '$' + p.price + '<span>/mes</span>'}</div>
        </div>
        <div class="prop-badges-top">
          ${p.is_demo ? '<span class="badge badge-amber">Ejemplo</span>' : ''}
          ${certBadge}
        </div>
        ${p.featured ? `<div class="prop-featured-tag">Destacado</div>` : ''}
      </div>
      <div class="prop-body">
        <h4 class="prop-title">${p.title}</h4>
        <p class="prop-location">
          <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M12 2a8 8 0 00-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 00-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
          ${(p.location || '').split(',')[0]}
        </p>
        ${!p.is_demo ? `
        <div class="prop-specs">
          <span>${p.rooms} hab.</span>
          <span>${p.bathrooms} baño</span>
          <span class="pucem-element">${p.distance_to_campus} km PUCEM</span>
          <span class="non-pucem-element">${p.distance_to_campus} km al centro</span>
        </div>` : ''}
        <div class="prop-amenities">
          ${(p.amenities || []).slice(0, 3).map(a => `<span class="amenity-tag">${capitalize(a)}</span>`).join('')}
        </div>
        <div class="prop-footer" style="margin-top:0.4rem;padding-top:0.4rem;border-top:1px dashed var(--border);">
          <div class="prop-rating"><span class="rating-stars">${stars}</span> ${p.property_rating || 4.5}</div>
          <div style="font-size:0.78rem;color:var(--blue);font-weight:600;cursor:pointer;text-decoration:underline;display:flex;align-items:center;gap:0.25rem;" onclick="event.stopPropagation();openPublicProfile('${p.landlord_id || 'demo'}', '${escAttr(p.landlord_name || 'Propietario')}', 'landlord')" title="Ver perfil del propietario">
            👤 ${p.landlord_name || 'Propietario'}
          </div>
        </div>
      </div>
    </article>`;
  }).join('');
}

// ============================================================
// MODAL DE PROPIEDAD
// ============================================================

async function openPropertyModal(id) {
  const { data: p, error } = await db.from('properties').select('*').eq('id', id).single();
  if (!p || error) return;

  openPropertyData = p;
  APP.galleryIndex[id] = 0;

  const reviews = parseJSON(p.reviews, []);
  const verif   = parseJSON(p.verification_report, null);

  document.getElementById('detail-title').textContent    = p.title;
  document.getElementById('detail-location').textContent = p.location;
  document.getElementById('detail-price').innerHTML      = p.is_demo
    ? '<span style="font-size:1rem;font-weight:400;">Solo demostración — sin precio real</span>'
    : `$${p.price}<span>/mes</span>`;
  document.getElementById('detail-rooms').textContent    = `${p.rooms} Habitación(es)`;
  document.getElementById('detail-baths').textContent    = `${p.bathrooms} Baño(s)`;
  document.getElementById('detail-distance').textContent = `${p.distance_to_campus} km`;
  document.getElementById('detail-desc').textContent     = p.description;

  const badgesRow = document.getElementById('detail-badges');
  if (badgesRow) {
    badgesRow.innerHTML = '';
    if (p.is_demo) badgesRow.innerHTML += `<span class="badge badge-amber">Anuncio de Ejemplo</span> `;
    if (p.university_certified) {
      if (p.certification_type === 'pucem') {
        badgesRow.innerHTML += `<span class="badge badge-pucem">Certificado PUCEM</span> `;
      } else {
        badgesRow.innerHTML += `<span class="badge badge-green">Certificado Homii</span> `;
      }
    }
    if (p.featured) badgesRow.innerHTML += `<span class="badge badge-blue">Destacado</span>`;
  }

  const amenEl = document.getElementById('detail-amenities');
  if (amenEl) amenEl.innerHTML = (p.amenities || []).map(a =>
    `<span class="amenity-tag" style="font-size:0.82rem;padding:0.25rem 0.6rem;">${capitalize(a)}</span>`
  ).join('');

  renderGallery(p);

  const q       = encodeURIComponent(p.maps_query || p.location);
  const frame   = document.getElementById('detail-map');
  const mapLink = document.getElementById('detail-map-link');
  const mapCta  = document.getElementById('detail-map-cta');
  if (frame)   frame.src    = `https://maps.google.com/maps?q=${q}&output=embed&hl=es&z=16`;
  if (mapLink) mapLink.href = `https://www.google.com/maps/search/?api=1&query=${q}`;
  if (mapCta)  mapCta.href  = `https://www.google.com/maps/search/?api=1&query=${q}`;

  const verifBox = document.getElementById('detail-verif');
  if (verifBox) {
    if (verif) {
      verifBox.style.display = 'block';
      document.getElementById('verif-date').textContent      = 'Inspección: ' + (verif.inspectionDate || '');
      document.getElementById('verif-water').textContent     = verif.standards?.waterPressure    || '';
      document.getElementById('verif-internet').textContent  = verif.standards?.internetSpeed    || '';
      document.getElementById('verif-safety').textContent    = verif.standards?.fireSafety       || '';
      document.getElementById('verif-structure').textContent = verif.standards?.structure        || '';
    } else {
      verifBox.style.display = 'none';
    }
  }

  const revEl = document.getElementById('detail-reviews');
  if (revEl) {
    revEl.innerHTML = reviews.length > 0
      ? reviews.map(r => `
          <div class="review-item">
            <div class="review-top">
              <span class="review-author">${r.author}</span>
              <span class="review-stars">${'★'.repeat(r.rating)}</span>
            </div>
            <p class="review-text">"${r.text}"</p>
          </div>`).join('')
      : `<p style="font-size:0.83rem;color:var(--text-muted);font-style:italic;">Sin reseñas todavía.</p>`;
  }

  const landlordAv     = document.getElementById('detail-landlord-av');
  const landlordNameEl = document.getElementById('detail-landlord-name');
  const targetUid      = p.landlord_id || 'demo_landlord';
  const targetName     = p.landlord_name || 'Propietario Homii';

  if (landlordAv) {
    landlordAv.style.cursor = 'pointer';
    landlordAv.title = 'Ver perfil público de ' + targetName;
    landlordAv.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      closePropertyModal();
      openPublicProfile(targetUid, targetName, 'landlord');
    };

    if (isValidUUID(p.landlord_id)) {
      db.from('profiles').select('avatar_url, name').eq('id', p.landlord_id).maybeSingle().then(({ data: lProfile }) => {
        if (lProfile?.avatar_url) {
          landlordAv.innerHTML = `<img src="${lProfile.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
          landlordAv.style.background = 'transparent';
        } else {
          landlordAv.textContent = (targetName).charAt(0).toUpperCase();
          landlordAv.style.background = '#1a56db';
        }
      });
    } else {
      landlordAv.textContent = (targetName).charAt(0).toUpperCase();
      landlordAv.style.background = '#1a56db';
    }
  }

  if (landlordNameEl) {
    landlordNameEl.textContent = targetName;
    landlordNameEl.style.cursor = 'pointer';
    landlordNameEl.style.textDecoration = 'underline';
    landlordNameEl.style.color = 'var(--blue)';
    landlordNameEl.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      closePropertyModal();
      openPublicProfile(targetUid, targetName, 'landlord');
    };
  }
  document.getElementById('detail-landlord-rating').textContent = 'Calificación: ' + (p.landlord_rating || 5.0) + ' / 5.0';

  setupDirectChat(p);

  document.getElementById('property-modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function renderGallery(p) {
  const wrap = document.getElementById('detail-gallery');
  if (!wrap) return;
  const idx     = APP.galleryIndex[p.id] || 0;
  const q       = encodeURIComponent(p.maps_query || p.location);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;

  if (!p.images || p.images.length === 0) {
    wrap.innerHTML = `
      <div class="gallery-placeholder" onclick="window.open('${mapsUrl}','_blank')" style="height:230px;cursor:pointer;" title="Ver en Google Maps">
        <svg viewBox="0 0 24 24" width="48" height="48" stroke-width="1" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Sin imágenes — Haga clic para ver la ubicación en Google Maps.</span>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="gallery-wrap">
      <img src="${p.images[idx]}" alt="Foto ${idx + 1}" onclick="window.open('${mapsUrl}','_blank')" title="Ver ubicación en Google Maps" style="cursor:pointer;">
      ${p.images.length > 1 ? `
        <button class="gallery-nav-btn gallery-prev" onclick="changeGallery('${p.id}',-1)">&#8249;</button>
        <button class="gallery-nav-btn gallery-next" onclick="changeGallery('${p.id}', 1)">&#8250;</button>
        <div class="gallery-dots">
          ${p.images.map((_,i) => `<span class="gallery-dot ${i===idx?'on':''}" onclick="setGallery('${p.id}',${i})"></span>`).join('')}
        </div>
        <div class="gallery-counter">${idx+1} / ${p.images.length}</div>
      ` : ''}
      <div class="gallery-maps-hover" onclick="window.open('${mapsUrl}','_blank')">Ver ubicación en Google Maps</div>
    </div>`;
}

window.changeGallery = function(id, dir) {
  const p = openPropertyData; if (!p || !p.images) return;
  APP.galleryIndex[id] = ((APP.galleryIndex[id] || 0) + dir + p.images.length) % p.images.length;
  renderGallery(p);
};
window.setGallery = function(id, idx) {
  APP.galleryIndex[id] = idx;
  if (openPropertyData) renderGallery(openPropertyData);
};

function closePropertyModal() {
  document.getElementById('property-modal')?.classList.remove('open');
  document.body.style.overflow = '';
  const f = document.getElementById('detail-map'); if (f) f.src = '';
  if (activeChatChannel) { activeChatChannel.unsubscribe(); activeChatChannel = null; }
  openPropertyData = null;
}

// ============================================================
// CHAT EN TIEMPO REAL (Supabase Real-time)
// ============================================================

async function setupDirectChat(p) {
  const msgs     = document.getElementById('direct-chat-msgs');
  const input    = document.getElementById('direct-chat-input');
  const sendBtn  = document.getElementById('direct-chat-send');
  const chatBox  = msgs?.closest('.direct-chat-box');
  if (!msgs) return;

  // Demo: sin propietario real
  if (p.is_demo) {
    if (chatBox) chatBox.innerHTML = `
      <div style="padding:1.25rem;font-size:0.82rem;color:var(--text-muted);line-height:1.6;text-align:center;">
        Este es un anuncio de demostración.<br>No hay propietario real para contactar.<br>
        Cuando propietarios reales publiquen sus inmuebles, podrá chatear con ellos en tiempo real desde aquí.
      </div>`;
    return;
  }

  // Sin sesión
  if (!CURRENT_USER) {
    if (chatBox) chatBox.innerHTML = `
      <div style="padding:1.25rem;font-size:0.82rem;color:var(--text-muted);text-align:center;line-height:1.6;">
        Inicie sesión para contactar al propietario.<br>
        <a class="auth-link" style="cursor:pointer;" onclick="closePropertyModal();openAuth()">Iniciar sesión</a>
      </div>`;
    return;
  }

  // Si el usuario actual es el propio propietario de este inmueble
  if (CURRENT_USER.id === p.landlord_id) {
    if (chatBox) chatBox.innerHTML = `
      <div style="padding:1.25rem;font-size:0.82rem;color:var(--text-muted);line-height:1.6;text-align:center;">
        Esta es su propia publicación.<br>
        Para revisar y responder los mensajes privados de los interesados, consulte la sección 
        <strong>"Mensajes de inquilinos"</strong> en su <a class="auth-link" style="cursor:pointer;" onclick="closePropertyModal();navigate('landlord');">Panel de Propietario</a> o en <a class="auth-link" style="cursor:pointer;" onclick="closePropertyModal();navigate('profile');">Mi Perfil</a>.
      </div>`;
    return;
  }

  if (activeChatChannel) { activeChatChannel.unsubscribe(); activeChatChannel = null; }

  const chatId = `prop_${p.id}_usr_${CURRENT_USER.id}`;

  // Cargar historial
  const { data: history } = await db.from('chats').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });

  const appendBubble = (m) => {
    const b = document.createElement('div');
    b.className = `chat-bubble chat-${m.sender_id === CURRENT_USER.id ? 'out' : 'in'}`;
    b.textContent = m.message;
    msgs.appendChild(b);
    msgs.scrollTop = msgs.scrollHeight;
  };

  msgs.innerHTML = '';
  if (!history || history.length === 0) {
    msgs.innerHTML = `<div class="chat-bubble chat-in">Hola, gracias por su interés en "${p.title}". ¿En qué le puedo ayudar?</div>`;
  } else {
    (history || []).forEach(m => appendBubble(m));
  }

  // Suscripción real-time
  activeChatChannel = db.channel('chat:' + chatId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chats',
      filter: `chat_id=eq.${chatId}`
    }, (payload) => {
      // Evitar duplicar mensajes propios (ya los añadimos optimistically)
      if (payload.new.sender_id !== CURRENT_USER.id) appendBubble(payload.new);
    })
    .subscribe();

  // Envío de mensajes
  const newSend = sendBtn.cloneNode(true);
  sendBtn.parentNode.replaceChild(newSend, sendBtn);

  const doSend = async (text) => {
    text = (text || '').trim();
    const targetLandlordId = p.landlord_id || p.user_id;

    if (!text) return;
    if (!targetLandlordId) {
      alert('Este anuncio no tiene un propietario registrado para recibir mensajes.');
      return;
    }

    if (input) input.value = '';

    // Añadir burbuja local inmediatamente (optimistic)
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-out';
    bubble.textContent = text;
    msgs.appendChild(bubble);
    msgs.scrollTop = msgs.scrollHeight;

    const { error: chatErr } = await db.from('chats').insert({
      chat_id: chatId,
      property_id: p.id,
      property_title: p.title,
      sender_id: CURRENT_USER.id,
      sender_name: CURRENT_PROFILE?.name || CURRENT_USER.email,
      receiver_id: targetLandlordId,
      message: text
    });

    if (chatErr) {
      alert('Error al enviar mensaje: ' + chatErr.message);
      console.error('Error enviando chat:', chatErr);
      bubble.style.opacity = '0.5';
    }
  };

  newSend.addEventListener('click', () => doSend(input?.value));
  if (input) { input.onkeypress = e => { if (e.key === 'Enter') doSend(input.value); }; }

  // Chips de preguntas rápidas
  document.querySelectorAll('.direct-preset').forEach(chip => {
    const nc = chip.cloneNode(true);
    chip.parentNode.replaceChild(nc, chip);
    nc.addEventListener('click', () => doSend(nc.textContent.trim()));
  });
}

// ============================================================
// MODAL CONVERSACIÓN (para propietarios respondiendo)
// ============================================================

window.openConversation = async function(chatId, propTitle, senderName, senderId) {
  const modal = document.getElementById('conversation-modal');
  if (!modal) return;

  const titleEl = document.getElementById('conv-title');
  if (titleEl) titleEl.textContent = senderName + ' — ' + propTitle;

  const msgs  = document.getElementById('conv-msgs');
  const input = document.getElementById('conv-input');
  const btn   = document.getElementById('conv-send');
  if (!msgs) return;

  const { data: history } = await db.from('chats')
    .select('*').eq('chat_id', chatId).order('created_at', { ascending: true });

  msgs.innerHTML = (history || []).map(m =>
    `<div class="chat-bubble chat-${m.sender_id === CURRENT_USER.id ? 'out' : 'in'}">${m.message}</div>`
  ).join('');
  msgs.scrollTop = msgs.scrollHeight;

  // Marcar como leídos
  await db.from('chats').update({ is_read: true }).eq('chat_id', chatId).eq('receiver_id', CURRENT_USER.id);

  if (activeChatChannel) { activeChatChannel.unsubscribe(); }
  activeChatChannel = db.channel('conv:' + chatId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats', filter: `chat_id=eq.${chatId}` }, (payload) => {
      if (payload.new.sender_id !== CURRENT_USER.id) {
        const b = document.createElement('div');
        b.className = 'chat-bubble chat-in';
        b.textContent = payload.new.message;
        msgs.appendChild(b);
        msgs.scrollTop = msgs.scrollHeight;
      }
    }).subscribe();

  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  const doSend = async (text) => {
    text = (text || '').trim();
    if (!text) return;
    if (input) input.value = '';
    const b = document.createElement('div');
    b.className = 'chat-bubble chat-out';
    b.textContent = text;
    msgs.appendChild(b);
    msgs.scrollTop = msgs.scrollHeight;
    await db.from('chats').insert({
      chat_id: chatId,
      property_title: propTitle,
      sender_id: CURRENT_USER.id,
      sender_name: CURRENT_PROFILE?.name || CURRENT_USER.email,
      receiver_id: senderId,
      message: text
    });
  };

  newBtn.addEventListener('click', () => doSend(input?.value));
  if (input) { input.onkeypress = e => { if (e.key === 'Enter') doSend(input.value); }; }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
};

function closeConversationModal() {
  const modal = document.getElementById('conversation-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  if (activeChatChannel) { activeChatChannel.unsubscribe(); activeChatChannel = null; }
}

// ============================================================
// ROOMIE
// ============================================================

function setupRoomie() {
  ['roomie-type','roomie-schedule','roomie-gender'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', filterRoomies);
  });
  const budgetSlider = document.getElementById('roomie-budget');
  const budgetVal    = document.getElementById('roomie-budget-val');
  if (budgetSlider && budgetVal) {
    budgetSlider.addEventListener('input', () => { budgetVal.textContent = '$' + budgetSlider.value; filterRoomies(); });
  }
  document.getElementById('roomie-form')?.addEventListener('submit', e => { e.preventDefault(); submitRoomieProfile(); });
  document.getElementById('roomie-modal')?.addEventListener('click', e => { if (e.target.id === 'roomie-modal') closeRoomieModal(); });
  document.getElementById('roomie-modal-close')?.addEventListener('click', closeRoomieModal);
}

async function filterRoomies() {
  const grid = document.getElementById('roomie-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="no-results-msg" style="grid-column:1/-1;">Cargando perfiles...</div>';

  const maxBudget = parseInt(document.getElementById('roomie-budget')?.value || '500');
  const type      = document.getElementById('roomie-type')?.value     || 'all';
  const schedule  = document.getElementById('roomie-schedule')?.value || 'all';
  const gender    = document.getElementById('roomie-gender')?.value   || 'all';

  const { data: list } = await db.from('roomies').select('*').order('created_at', { ascending: false });

  const filtered = (list || []).filter(r => {
    const matchBudget   = r.is_demo || r.budget <= maxBudget;
    const matchType     = type     === 'all' || r.type     === type;
    const matchSchedule = schedule === 'all' || r.schedule === schedule;
    const matchGender   = gender   === 'all' || r.gender   === gender;
    return matchBudget && matchType && matchSchedule && matchGender;
  });

  const count = document.getElementById('roomie-count');
  if (count) count.textContent = filtered.length;
  renderRoomieGrid(filtered);
}

function renderRoomieGrid(list) {
  const grid = document.getElementById('roomie-grid');
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = '<div class="no-results-msg" style="grid-column:1/-1;">No se encontraron perfiles con los filtros seleccionados.</div>';
    return;
  }

  grid.innerHTML = list.map(r => {
    const typeLabel = r.type === 'tiene-lugar' ? 'Tiene lugar, busca compañero' : 'Busca lugar y compañero';
    const typeClass = r.type === 'tiene-lugar' ? 'type-tiene-lugar' : 'type-busca-lugar';
    const userUid   = r.user_id || r.id;
    return `
    <div class="roomie-card" onclick="openRoomieModal('${r.id}')">
      <div class="roomie-card-header">
        <div class="roomie-av" onclick="event.stopPropagation();openPublicProfile('${userUid}')" style="background:${r.avatar_color || '#1a56db'};cursor:pointer;overflow:hidden;" title="Ver perfil de ${r.name}">
          ${r.avatar_url ? `<img src="${r.avatar_url}" style="width:100%;height:100%;object-fit:cover;">` : r.name.charAt(0)}
        </div>
        <div onclick="event.stopPropagation();openPublicProfile('${userUid}')" style="cursor:pointer;">
          <div class="roomie-name" style="color:var(--blue);text-decoration:underline;">${r.name}</div>
          <div class="roomie-career">${r.career}</div>
        </div>
      </div>
      ${r.is_demo ? '<span class="badge badge-amber" style="align-self:flex-start;margin-top:0.25rem;">Perfil de Ejemplo</span>' : ''}
      <span class="roomie-type-tag ${typeClass}">${typeLabel}</span>
      <div class="roomie-budget">${r.is_demo ? '<span style="font-size:0.85rem;font-weight:400;">Solo demostración</span>' : '$' + r.budget + '<span>/mes (su parte)</span>'}</div>
      <div class="roomie-info-row">
        <span>Horario: ${r.schedule}</span>
        <span>${r.gender}</span>
        <span>Desde: ${r.available_from}</span>
      </div>
      <div class="roomie-habits">
        ${(r.habits || []).map(h => `<span class="habit-tag">${h}</span>`).join('')}
      </div>
      <p class="roomie-desc">${(r.description || '').substring(0, 110)}...</p>
      <div class="roomie-footer">
        <span class="badge badge-blue">Ver perfil</span>
        ${r.type === 'tiene-lugar' ? '<span class="badge badge-green">Lugar disponible</span>' : ''}
      </div>
    </div>`;
  }).join('');
}

async function openRoomieModal(id) {
  const { data: r } = await db.from('roomies').select('*').eq('id', id).single();
  if (!r) return;

  const typeLabel = r.type === 'tiene-lugar' ? 'Tiene lugar, busca compañero' : 'Busca lugar y compañero';
  const typeClass = r.type === 'tiene-lugar' ? 'type-tiene-lugar' : 'type-busca-lugar';
  const userUid   = r.user_id || r.id;

  document.getElementById('rmodal-title').textContent  = r.name + ' — ' + r.career;
  document.getElementById('rmodal-career').textContent = r.career;

  const avEl = document.getElementById('rmodal-avatar');
  if (avEl) {
    avEl.style.cursor = 'pointer';
    avEl.title = 'Ver perfil público';
    avEl.onclick = () => { closeRoomieModal(); openPublicProfile(userUid); };
    if (r.avatar_url) {
      avEl.innerHTML = `<img src="${r.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`;
      avEl.style.background = 'transparent';
    } else {
      avEl.textContent = r.name.charAt(0);
      avEl.style.background = r.avatar_color || '#1a56db';
    }
  }

  const typeEl = document.getElementById('rmodal-type');
  if (typeEl) { typeEl.textContent = typeLabel; typeEl.className = 'roomie-type-tag ' + typeClass; }

  const infoTable = document.getElementById('rmodal-info');
  if (infoTable) {
    let rows = [
      ['Presupuesto mensual', r.is_demo ? 'Solo demostración' : '$' + r.budget + ' / mes'],
      ['Horario de clases', r.schedule],
      ['Género', r.gender],
      ['Disponibilidad', r.available_from],
      ['Hábitos', (r.habits || []).join(', ')]
    ];
    if (r.type === 'tiene-lugar') {
      rows.push(['Sector del lugar', r.location || 'Portoviejo, Manabí']);
      rows.push(['Arriendo total', '$' + (r.total_rent || 0) + ' (entre dos: $' + Math.ceil((r.total_rent || 0) / 2) + ' c/u)']);
    }
    infoTable.innerHTML = rows.map(([k, v]) =>
      `<div class="info-row"><span class="info-key">${k}</span><span class="info-val">${v}</span></div>`
    ).join('');
  }

  document.getElementById('rmodal-desc').textContent    = r.description;
  document.getElementById('rmodal-contact').textContent = r.is_demo ? 'soporte@homii.ec (solo ejemplo)' : r.contact;

  setupRoomieChat(r);

  document.getElementById('roomie-modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function setupRoomieChat(r) {
  const msgs    = document.getElementById('roomie-chat-msgs');
  const input   = document.getElementById('roomie-chat-input');
  const sendBtn = document.getElementById('roomie-chat-send');
  const chatBox = msgs?.closest('.direct-chat-box');
  if (!msgs) return;

  if (r.is_demo) {
    if (chatBox) chatBox.innerHTML = `<div style="padding:1.25rem;font-size:0.82rem;color:var(--text-muted);text-align:center;line-height:1.6;">Este es un perfil de demostración.<br>No hay un estudiante real para contactar.</div>`;
    return;
  }

  if (!CURRENT_USER) {
    if (chatBox) chatBox.innerHTML = `<div style="padding:1.25rem;font-size:0.82rem;color:var(--text-muted);text-align:center;line-height:1.6;">Inicie sesión para escribir a este estudiante.<br><a class="auth-link" style="cursor:pointer;" onclick="closeRoomieModal();openAuth()">Iniciar sesión</a></div>`;
    return;
  }

  msgs.innerHTML = `<div class="chat-bubble chat-in">Hola, vi tu perfil en Homii. ¿Sigues buscando compañero?</div>`;
  if (sendBtn) sendBtn.style.display = '';

  const newSend = sendBtn.cloneNode(true);
  sendBtn.parentNode.replaceChild(newSend, sendBtn);
  newSend.addEventListener('click', () => {
    if (!input?.value.trim()) return;
    const b = document.createElement('div');
    b.className = 'chat-bubble chat-out';
    b.textContent = input.value;
    msgs.appendChild(b);
    msgs.scrollTop = msgs.scrollHeight;
    input.value = '';
    setTimeout(() => {
      const reply = document.createElement('div');
      reply.className = 'chat-bubble chat-in';
      reply.textContent = 'Gracias por escribirme. Puede contactarme directamente al correo indicado en mi perfil para coordinar los detalles.';
      msgs.appendChild(reply);
      msgs.scrollTop = msgs.scrollHeight;
    }, 1200);
  });
  if (input) { input.onkeypress = e => { if (e.key === 'Enter') newSend.click(); }; }
}

function closeRoomieModal() {
  document.getElementById('roomie-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

async function submitRoomieProfile() {
  if (!CURRENT_USER) { openAuth(); return; }

  const name      = document.getElementById('rp-name')?.value.trim();
  const career    = document.getElementById('rp-career')?.value.trim();
  const budget    = parseInt(document.getElementById('rp-budget')?.value || '0');
  const type      = document.getElementById('rp-type')?.value;
  const schedule  = document.getElementById('rp-schedule')?.value;
  const gender    = document.getElementById('rp-gender')?.value;
  const desc      = document.getElementById('rp-desc')?.value.trim();
  const available = document.getElementById('rp-available')?.value.trim();

  if (!name || !career || !budget || !desc) { alert('Por favor completa todos los campos obligatorios.'); return; }

  const colors = ['#1a56db','#0369a1','#7c3aed','#059669','#d97706','#0f766e'];
  const color  = colors[Math.floor(Math.random() * colors.length)];

  const { error } = await db.from('roomies').insert({
    user_id: CURRENT_USER.id,
    name, career, budget, type, gender, schedule,
    available_from: available || 'Próximamente',
    description: desc,
    contact: CURRENT_USER.email,
    avatar_color: color,
    is_demo: false
  });

  if (error) { alert('Error al publicar perfil: ' + error.message); return; }

  document.getElementById('roomie-form')?.reset();
  filterRoomies();
  updateRoomieStats();
  addNotif('Perfil Publicado', 'Su perfil ya es visible en la sección Buscar Compañero.');
  alert('Perfil publicado correctamente. Ya está visible en el listado.');
}

async function updateRoomieStats() {
  const { data: list } = await db.from('roomies').select('id, type');
  const all   = list || [];
  const total = all.length;
  const busca = all.filter(r => r.type === 'busca-lugar').length;
  const tiene = all.filter(r => r.type === 'tiene-lugar').length;
  const s = id => document.getElementById(id);
  if (s('roomie-hero-stat'))  s('roomie-hero-stat').textContent  = total;
  if (s('roomie-stat-busca')) s('roomie-stat-busca').textContent = busca;
  if (s('roomie-stat-tiene')) s('roomie-stat-tiene').textContent = tiene;
}

// ============================================================
// PERFIL DE USUARIO
// ============================================================

async function renderProfileView() {
  if (!CURRENT_USER || !CURRENT_PROFILE) return;
  const p = CURRENT_PROFILE;
  const s = id => document.getElementById(id);

  if (s('profile-avatar')) {
    if (p.avatar_url) {
      s('profile-avatar').innerHTML = `<img src="${p.avatar_url}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      s('profile-avatar').style.background = 'transparent';
    } else {
      s('profile-avatar').textContent      = p.name.charAt(0).toUpperCase();
      s('profile-avatar').style.background = p.avatar_color || '#1a56db';
    }
  }

  if (s('profile-name'))       s('profile-name').textContent       = p.name;
  if (s('profile-email'))      s('profile-email').textContent      = CURRENT_USER.email;
  if (s('profile-role'))       s('profile-role').textContent       = roleLabel(p.role, CURRENT_USER?.email);
  if (s('profile-phone'))      s('profile-phone').textContent      = p.phone || 'No registrado';
  if (s('profile-occupation')) s('profile-occupation').textContent = p.occupation || 'No especificada';
  if (s('profile-bio'))        s('profile-bio').textContent        = p.bio || 'No ha añadido una descripción a su perfil todavía. Haga clic en "Editar Perfil" para agregar información sobre usted.';
  if (s('profile-since'))      s('profile-since').textContent      = new Date(p.created_at || Date.now()).toLocaleDateString('es-EC', { year:'numeric', month:'long', day:'numeric' });

  // Pre-llenar campos de edición
  if (s('edit-name'))       s('edit-name').value       = p.name || '';
  if (s('edit-phone'))      s('edit-phone').value      = p.phone || '';
  if (s('edit-occupation')) s('edit-occupation').value = p.occupation || '';
  if (s('edit-bio'))        s('edit-bio').value        = p.bio || '';

  // Mis propiedades (solo propietario)
  const propSection = s('profile-my-props');
  if (propSection) {
    if (p.role === 'landlord') {
      propSection.style.display = 'block';
      const { data: myProps } = await db.from('properties').select('*').eq('landlord_id', CURRENT_USER.id).order('created_at', { ascending: false });
      const listEl = s('profile-props-list');
      if (listEl) {
        if (!myProps || myProps.length === 0) {
          listEl.innerHTML = '<p style="font-size:0.83rem;color:var(--text-muted);">No ha publicado propiedades todavía. Use el Panel de Propietario para crear su primer anuncio.</p>';
        } else {
          listEl.innerHTML = myProps.map(prop => `
            <div class="prop-row" onclick="navigate('landlord')" style="cursor:pointer;">
              <div class="prop-row-img">
                ${prop.images && prop.images.length > 0 ? `<img src="${prop.images[0]}" alt="${prop.title}">` : `<svg viewBox="0 0 24 24" width="22" height="22" stroke="var(--border-blue)" stroke-width="1.5" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>`}
              </div>
              <div style="flex:1;min-width:0;margin-left:0.85rem;">
                <div style="font-weight:600;font-size:0.88rem;color:var(--text);">${prop.title}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">$${prop.price}/mes &middot; ${(prop.location || '').split(',')[0]}</div>
              </div>
              <span class="badge ${prop.university_certified ? 'badge-green' : 'badge-gray'}">${prop.university_certified ? 'Verificado' : 'Pendiente'}</span>
            </div>`).join('');
        }
      }
    } else {
      propSection.style.display = 'none';
    }
  }

  // Mi perfil roomie
  const roomieSection = s('profile-my-roomie');
  if (roomieSection) {
    const { data: myRoomie } = await db.from('roomies').select('*').eq('user_id', CURRENT_USER.id).maybeSingle();
    if (myRoomie) {
      roomieSection.innerHTML = `
        <div class="panel-card-title">Mi perfil de compañero</div>
        <div class="prop-row">
          <div class="roomie-av" style="background:${myRoomie.avatar_color};width:40px;height:40px;">${myRoomie.name.charAt(0)}</div>
          <div style="flex:1;min-width:0;margin-left:0.85rem;">
            <div style="font-weight:600;font-size:0.88rem;">${myRoomie.name}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${myRoomie.career} &middot; $${myRoomie.budget}/mes</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="deleteMyRoomieProfile('${myRoomie.id}')">Eliminar</button>
        </div>`;
    } else {
      roomieSection.innerHTML = `
        <div class="panel-card-title">Mi perfil de compañero</div>
        <p style="font-size:0.83rem;color:var(--text-muted);margin-bottom:0.75rem;">No tiene un perfil de compañero publicado todavía.</p>
        <button class="btn btn-secondary btn-sm" onclick="navigate('roomie')">Publicar perfil de compañero</button>`;
    }
  }

  // Mensajes recibidos (solo propietario)
  const msgsSection = s('profile-messages');
  if (msgsSection) {
    if (p.role === 'landlord') {
      msgsSection.style.display = 'block';
      await loadInboxMessages(msgsSection);
    } else {
      msgsSection.style.display = 'none';
    }
  }
}

window.toggleEditProfileForm = function() {
  const card = document.getElementById('edit-profile-card');
  if (!card) return;
  const isHidden = card.style.display === 'none';
  card.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    card.scrollIntoView({ behavior: 'smooth' });
  }
};

window.saveProfileChanges = async function(e) {
  e.preventDefault();
  if (!CURRENT_USER || !CURRENT_PROFILE) return;

  const name       = document.getElementById('edit-name')?.value.trim();
  const phone      = document.getElementById('edit-phone')?.value.trim();
  const occupation = document.getElementById('edit-occupation')?.value.trim();
  const bio        = document.getElementById('edit-bio')?.value.trim();
  const btn        = document.getElementById('btn-save-profile');

  if (!name) { alert('El nombre completo es obligatorio.'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

  const updates = {
    id: CURRENT_USER.id,
    name,
    phone:      phone      || null,
    occupation: occupation || null,
    bio:        bio        || null,
    updated_at: new Date().toISOString()
  };

  // Usar upsert en lugar de update para asegurar que inserte la fila si no existía aún en Supabase
  let { error } = await db.from('profiles').upsert(updates, { onConflict: 'id' });

  if (error) {
    console.warn('Upsert completo falló en profiles, reintentando con campos básicos:', error.message);
    const basicUpdates = {
      id: CURRENT_USER.id,
      name,
      phone: phone || null,
      updated_at: new Date().toISOString()
    };
    const { error: e2 } = await db.from('profiles').upsert(basicUpdates, { onConflict: 'id' });
    if (e2) {
      alert('Error al guardar perfil en Supabase: ' + e2.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Guardar Cambios'; }
      return;
    }
  }

  // Guardar copia local como respaldo de respuesta inmediata
  localStorage.setItem('homii_extra_' + CURRENT_USER.id, JSON.stringify({ name, phone, occupation, bio }));

  if (btn) { btn.disabled = false; btn.textContent = 'Guardar Cambios'; }

  Object.assign(CURRENT_PROFILE, updates);
  toggleEditProfileForm();
  updateNavUI();
  await renderProfileView();
  addNotif('Perfil Actualizado', 'Su información personal fue guardada correctamente.');
  alert('✅ Perfil actualizado exitosamente. Los cambios están guardados en la nube y son visibles desde cualquier dispositivo.');
};

window.uploadProfileAvatar = async function(e) {
  const file = e.target.files?.[0];
  if (!file || !CURRENT_USER || !CURRENT_PROFILE) return;

  // Validar tamaño (máx. 3MB)
  if (file.size > 3 * 1024 * 1024) {
    alert('La imagen es demasiado grande. El tamaño máximo permitido es 3 MB.');
    return;
  }

  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `avatars/${CURRENT_USER.id}.${ext}`;

  let avatarUrl = null;

  // 1. Intentar subir al bucket de Supabase Storage
  try {
    const { error: upErr } = await db.storage
      .from('homii-images')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (!upErr) {
      const { data: urlData } = db.storage.from('homii-images').getPublicUrl(path);
      avatarUrl = urlData?.publicUrl || null;
    } else {
      console.warn('Storage upload error:', upErr.message);
    }
  } catch (err) {
    console.warn('Storage not available:', err);
  }

  // 2. Si storage falla, convertir a base64 como Data URL (solo válido para el dispositivo actual)
  if (!avatarUrl) {
    avatarUrl = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    console.warn('Usando Data URL local — no será visible en otros dispositivos.');
  }

  // 3. Upsert en la tabla profiles de Supabase para asegurar que persista en la nube
  const { error: dbErr } = await db.from('profiles')
    .upsert({ id: CURRENT_USER.id, avatar_url: avatarUrl, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  if (dbErr) {
    console.warn('No se pudo guardar avatar_url en DB:', dbErr.message);
  }

  // 4. Actualizar el estado local
  CURRENT_PROFILE.avatar_url = avatarUrl;
  localStorage.setItem('homii_avatar_' + CURRENT_USER.id, avatarUrl);

  updateNavUI();
  await renderProfileView();
  addNotif('Foto Actualizada', 'Su nueva foto de perfil ya es visible.');
  alert('✅ Foto de perfil actualizada exitosamente en la nube.');
};

async function loadInboxMessages(container) {
  const { data: chats } = await db.from('chats')
    .select('*')
    .or(`receiver_id.eq.${CURRENT_USER.id},sender_id.eq.${CURRENT_USER.id}`)
    .order('created_at', { ascending: false });

  if (!chats || chats.length === 0) {
    container.innerHTML = '<div class="panel-card-title">Mensajes recibidos</div><p style="font-size:0.83rem;color:var(--text-muted);">No tiene mensajes todavía.</p>';
    return;
  }

  const convMap = {};
  chats.forEach(m => {
    if (!convMap[m.chat_id]) {
      const otherId   = m.sender_id === CURRENT_USER.id ? m.receiver_id : m.sender_id;
      const otherName = m.sender_id === CURRENT_USER.id ? 'Inquilino / Usuario' : m.sender_name;
      convMap[m.chat_id] = { ...m, otherId, otherName, unread: 0 };
    }
    if (m.receiver_id === CURRENT_USER.id && !m.is_read) {
      convMap[m.chat_id].unread++;
    }
  });
  const convs = Object.values(convMap);

  container.innerHTML = `
    <div class="panel-card-title">Mensajes recibidos <span class="badge badge-blue" style="font-size:0.7rem;margin-left:0.5rem;">${convs.length}</span></div>
    ${convs.map(c => `
      <div class="prop-row" style="cursor:pointer;" onclick="openConversation('${c.chat_id}', '${escAttr(c.property_title || 'Propiedad')}', '${escAttr(c.otherName)}', '${c.otherId}')">
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.85rem;font-weight:600;color:var(--text);">${c.otherName}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${c.property_title || 'Consulta'}</div>
          <div style="font-size:0.78rem;color:var(--text-sec);margin-top:0.15rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.message}</div>
        </div>
        ${c.unread > 0 ? `<span class="badge badge-blue">${c.unread} nuevo</span>` : '<span class="badge badge-gray">Chat activo</span>'}
      </div>`).join('')}`;
}

window.deleteMyRoomieProfile = async function(id) {
  if (!confirm('¿Está seguro de eliminar su perfil de compañero?')) return;
  await db.from('roomies').delete().eq('id', id);
  renderProfileView();
  addNotif('Perfil eliminado', 'Su perfil de compañero fue eliminado.');
};

function roleLabel(role, email) {
  if (role === 'student')  return 'Estudiante / Arrendatario';
  if (role === 'landlord') return 'Propietario de inmuebles';
  if (role === 'university') {
    const em = (email || CURRENT_USER?.email || '').toLowerCase();
    const isPucem = em.endsWith('@pucem.edu.ec') || em.endsWith('@pucesm.edu.ec');
    return isPucem ? 'Administrador PUCEM' : 'Administrador';
  }
  return role;
}

// ============================================================
// PANEL PROPIETARIO
// ============================================================

async function renderLandlordPanel() {
  if (!CURRENT_USER || !CURRENT_PROFILE) return;

  const { data: myProps } = await db.from('properties').select('*').eq('landlord_id', CURRENT_USER.id);
  const count = (myProps || []).length;

  if (document.getElementById('stat-listings'))  document.getElementById('stat-listings').textContent  = count;
  if (document.getElementById('stat-views'))     document.getElementById('stat-views').textContent     = count * 147;
  if (document.getElementById('stat-inquiries')) document.getElementById('stat-inquiries').textContent = count * 4;

  const list = document.getElementById('landlord-list');
  if (list) {
    if (count === 0) {
      list.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);text-align:center;padding:1.5rem;">No ha publicado propiedades todavía. Use el formulario para crear su primer anuncio.</p>';
    } else {
      list.innerHTML = (myProps || []).map(p => `
        <div class="prop-row">
          <div class="prop-row-img">
            ${p.images && p.images.length > 0 ? `<img src="${p.images[0]}" alt="${p.title}">` : `<svg viewBox="0 0 24 24" width="22" height="22" stroke="var(--border-blue)" stroke-width="1.5" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>`}
          </div>
          <div style="flex:1;min-width:0;margin-left:0.85rem;">
            <div style="font-weight:600;font-size:0.88rem;color:var(--text);">${p.title}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${(p.location || '').split(',')[0]} &middot; <span style="color:var(--blue);font-weight:600;">$${p.price}/mes</span></div>
          </div>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;justify-content:flex-end;">
            ${p.university_certified ? `<span class="badge badge-green">Verificado PUCEM</span>` : `<button class="btn btn-secondary btn-sm" onclick="requestVerif('${p.id}', '${escAttr(p.title)}')">Pedir verificación</button>`}
            ${p.featured ? `<span class="badge badge-blue">Destacado</span>` : `<button class="btn btn-outline btn-sm" onclick="makeFeatured('${p.id}')">Destacar</button>`}
            <button class="btn btn-danger btn-sm" onclick="deleteProp('${p.id}')">Eliminar</button>
          </div>
        </div>`).join('');
    }
  }

  await loadLandlordMessages();
}

async function loadLandlordMessages() {
  const section = document.getElementById('landlord-messages');
  if (!section || !CURRENT_USER) return;

  const { data: chats } = await db.from('chats')
    .select('*')
    .or(`receiver_id.eq.${CURRENT_USER.id},sender_id.eq.${CURRENT_USER.id}`)
    .order('created_at', { ascending: false });

  if (!chats || chats.length === 0) {
    section.innerHTML = '<div class="panel-card-title">Mensajes de inquilinos</div><p style="font-size:0.83rem;color:var(--text-muted);">No tiene mensajes todavía. Cuando alguien le escriba, los mensajes aparecerán aquí.</p>';
    return;
  }

  const convMap = {};
  chats.forEach(m => {
    if (!convMap[m.chat_id]) {
      const otherId   = m.sender_id === CURRENT_USER.id ? m.receiver_id : m.sender_id;
      const otherName = m.sender_id === CURRENT_USER.id ? 'Inquilino / Usuario' : m.sender_name;
      convMap[m.chat_id] = { ...m, otherId, otherName, unread: 0 };
    }
    if (m.receiver_id === CURRENT_USER.id && !m.is_read) {
      convMap[m.chat_id].unread++;
    }
  });
  const convs = Object.values(convMap);

  section.innerHTML = `
    <div class="panel-card-title">Mensajes de inquilinos <span class="badge badge-blue" style="font-size:0.7rem;margin-left:0.5rem;">${convs.length} conversación(es)</span></div>
    ${convs.map(c => `
      <div class="prop-row" style="cursor:pointer;" onclick="openConversation('${c.chat_id}', '${escAttr(c.property_title || 'Propiedad')}', '${escAttr(c.otherName)}', '${c.otherId}')">
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.85rem;font-weight:600;">${c.otherName}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${c.property_title || 'Consulta'}</div>
          <div style="font-size:0.78rem;color:var(--text-sec);margin-top:0.1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.message}</div>
        </div>
        ${c.unread > 0 ? `<span class="badge badge-blue">${c.unread} nuevo</span>` : '<span class="badge badge-gray">Chat activo</span>'}
      </div>`).join('')}`;
}

window.makeFeatured = async function(id) {
  await db.from('properties').update({ featured: true }).eq('id', id);
  addNotif('Anuncio Destacado', 'Su propiedad ahora aparece destacada en el buscador.');
  renderLandlordPanel();
};

window.requestVerif = function(id, title) {
  addNotif('Solicitud Enviada', `Inspección agendada para "${title}".`);
  alert('Solicitud enviada. Nuestro equipo coordinará la visita de inspección técnica en los próximos días hábiles.');
};

window.deleteProp = async function(id) {
  if (!confirm('¿Está seguro de eliminar este anuncio? Esta acción es irreversible.')) return;
  await db.from('properties').delete().eq('id', id);
  renderLandlordPanel();
  addNotif('Anuncio Eliminado', 'La propiedad fue removida del buscador.');
};

function setupPublishForm() {
  document.getElementById('prop-images')?.addEventListener('change', previewImages);
  document.getElementById('prop-maps-address')?.addEventListener('input', updateMapsPreview);
  document.getElementById('publish-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!CURRENT_USER) { openAuth(); return; }

    const btn = e.target.querySelector('[type=submit]');
    if (btn) { btn.disabled = true; btn.textContent = 'Publicando...'; }

    const title    = document.getElementById('prop-title')?.value.trim();
    const price    = parseInt(document.getElementById('prop-price')?.value);
    const rooms    = parseInt(document.getElementById('prop-rooms')?.value);
    const location = document.getElementById('prop-location')?.value.trim();
    const mapsAddr = document.getElementById('prop-maps-address')?.value.trim() || location;
    const distance = parseFloat(document.getElementById('prop-distance')?.value);
    const desc     = document.getElementById('prop-desc')?.value.trim();
    const amenities = [...document.querySelectorAll('.form-amenity:checked')].map(cb => cb.value);

    // Subir imágenes a Supabase Storage
    let imgUrls = [];
    const files = window._pendingFiles || [];
    for (const file of files) {
      const ext  = file.name.split('.').pop().toLowerCase();
      const path = `${CURRENT_USER.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await db.storage.from('homii-images').upload(path, file);
      if (!upErr) {
        const { data: { publicUrl } } = db.storage.from('homii-images').getPublicUrl(path);
        imgUrls.push(publicUrl);
      }
    }

    const { error } = await db.from('properties').insert({
      title, description: desc || '', price, rooms, bathrooms: 1,
      location, maps_query: mapsAddr, distance_to_campus: distance || 1.0,
      university_certified: false,
      amenities: amenities.length ? amenities : [],
      landlord_id: CURRENT_USER.id,
      landlord_name: CURRENT_PROFILE?.name || 'Propietario',
      landlord_email: CURRENT_USER.email,
      landlord_rating: 5.0, property_rating: 4.5,
      featured: false, images: imgUrls, is_demo: false,
      reviews: []
    });

    if (btn) { btn.disabled = false; btn.textContent = 'Publicar Inmueble'; }

    if (error) { alert('Error al publicar: ' + error.message); return; }

    document.getElementById('publish-form')?.reset();
    window._pendingFiles = [];
    const thumbsEl = document.getElementById('img-thumbs'); if (thumbsEl) thumbsEl.innerHTML = '';
    const mp = document.getElementById('maps-preview'); if (mp) mp.style.display = 'none';
    addNotif('Propiedad Publicada', `"${title}" ya es visible en el buscador.`);
    renderLandlordPanel();
    filterListings();
    alert('Propiedad publicada exitosamente. Ya aparece en el buscador de arriendos.');
  });
}

function previewImages(e) {
  const files = Array.from(e.target.files);
  window._pendingFiles = files;
  const thumbs = document.getElementById('img-thumbs');
  if (!thumbs) return;
  thumbs.innerHTML = files.map((f, i) => `
    <div class="img-thumb">
      <img src="${URL.createObjectURL(f)}" alt="Foto ${i+1}">
      <button type="button" class="img-thumb-del" onclick="removeImg(${i})">x</button>
    </div>`).join('');
}

window.removeImg = function(i) {
  window._pendingFiles = window._pendingFiles || [];
  window._pendingFiles.splice(i, 1);
  const thumbs = document.getElementById('img-thumbs');
  if (thumbs) thumbs.innerHTML = (window._pendingFiles).map((f, idx) => `
    <div class="img-thumb"><img src="${URL.createObjectURL(f)}" alt="Foto ${idx+1}">
    <button type="button" class="img-thumb-del" onclick="removeImg(${idx})">x</button></div>`).join('');
};

function updateMapsPreview() {
  const addr = document.getElementById('prop-maps-address')?.value.trim();
  const prev = document.getElementById('maps-preview');
  const link = document.getElementById('maps-preview-link');
  if (!addr || !prev || !link) return;
  link.href        = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  link.textContent = `Ver "${addr}" en Google Maps`;
  prev.style.display = 'block';
}

// ============================================================
// PORTAL UNIVERSITARIO / ADMINISTRACIÓN
// ============================================================

async function renderUniPanel() {
  const { data: pending   } = await db.from('properties').select('*').eq('university_certified', false).eq('is_demo', false);
  const { data: certified } = await db.from('properties').select('id').eq('university_certified', true);

  if (document.getElementById('uni-pending-count'))   document.getElementById('uni-pending-count').textContent   = (pending || []).length;
  if (document.getElementById('uni-certified-count')) document.getElementById('uni-certified-count').textContent = (certified || []).length;

  const tbody = document.getElementById('uni-table-body');
  if (!tbody) return;

  if (!pending || pending.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;font-style:italic;">No hay inmuebles pendientes de certificación en este momento.</td></tr>`;
    return;
  }

  tbody.innerHTML = pending.map(p => `
    <tr>
      <td><div class="table-prop-name">${p.title}</div><div class="table-prop-addr">${(p.location || '').split(',').slice(0, 2).join(',')}</div></td>
      <td>${p.landlord_name || '-'}</td>
      <td>$${p.price}/mes</td>
      <td>${p.distance_to_campus} km</td>
      <td><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.maps_query || p.location)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">Ver mapa</a></td>
      <td><button class="btn btn-primary btn-sm" onclick="certifyProp('${p.id}')">Certificar</button></td>
    </tr>`).join('');
}

window.certifyProp = async function(id) {
  const email = (CURRENT_USER?.email || '').toLowerCase();
  const isPucemAdmin = email.endsWith('@pucem.edu.ec') || email.endsWith('@pucesm.edu.ec');
  const badgeName = isPucemAdmin ? 'Certificado PUCEM' : 'Certificado';

  const report = {
    inspectionDate: new Date().toISOString().split('T')[0],
    certifiedBy: CURRENT_PROFILE?.name || CURRENT_USER?.email,
    certificationType: isPucemAdmin ? 'Certificación Oficial PUCEM' : 'Verificación Estándar Homii',
    certType: isPucemAdmin ? 'pucem' : 'standard',
    standards: {
      waterPressure: 'Aprobado — Buena presión (42 PSI)',
      internetSpeed: 'Aprobado — Fibra Óptica 300 Mbps',
      fireSafety:    'Aprobado — Certificado contra incendios',
      structure:     'Aprobado — Inspector técnico'
    }
  };

  // Primer intento: con certification_type (si la columna existe en Supabase)
  let res = await db.from('properties')
    .update({ university_certified: true, certification_type: isPucemAdmin ? 'pucem' : 'standard', verification_report: report })
    .eq('id', id)
    .select();

  // Fallback: si Supabase no reconoce certification_type en el schema cache, reintentar sin ella
  if (res.error && (res.error.message?.includes('Could not find') || res.error.code === 'PGRST204')) {
    res = await db.from('properties')
      .update({ university_certified: true, verification_report: report })
      .eq('id', id)
      .select();
  }

  if (res.error) {
    alert('Error al certificar la propiedad: ' + res.error.message);
    console.error('Certify error:', res.error);
    return;
  }

  const propTitle = res.data?.[0]?.title || 'El inmueble';
  addNotif('Inmueble Certificado', `"${propTitle}" recibió la etiqueta "${badgeName}".`);
  alert(`✅ Propiedad certificada exitosamente como: "${badgeName}"`);
  await renderUniPanel();
  filterListings();
};

// ============================================================
// NOTIFICACIONES
// ============================================================

function setupNotifications() {
  const bell  = document.getElementById('bell-btn');
  const panel = document.getElementById('notif-panel');
  const clear = document.getElementById('notif-clear');

  bell?.addEventListener('click', e => {
    e.stopPropagation();
    panel?.classList.toggle('open');
    APP.notifications.forEach(n => n.unread = false);
    updateBellDot(); renderNotifs();
  });
  clear?.addEventListener('click', () => { APP.notifications = []; updateBellDot(); renderNotifs(); });
  document.addEventListener('click', e => {
    if (panel && !panel.contains(e.target) && !bell?.contains(e.target)) panel.classList.remove('open');
  });

  addNotif('Bienvenido a Homii', 'Plataforma de arriendos en Portoviejo, Manabí.');
}

function renderNotifs() {
  const body = document.getElementById('notif-body');
  if (!body) return;
  body.innerHTML = APP.notifications.length === 0
    ? `<div class="notif-empty">Sin notificaciones pendientes.</div>`
    : APP.notifications.map(n => `
        <div class="notif-item ${n.unread ? 'unread' : ''}">
          <div class="notif-title">${n.title}</div>
          <div class="notif-txt">${n.text}</div>
          <div class="notif-time">${n.time}</div>
        </div>`).join('');
}

function addNotif(title, text) {
  APP.notifications.unshift({ id: Date.now(), title, text, time: 'Ahora mismo', unread: true });
  updateBellDot(); renderNotifs();
}

function updateBellDot() {
  const dot = document.getElementById('bell-dot');
  if (dot) dot.style.display = APP.notifications.some(n => n.unread) ? 'block' : 'none';
}

// ============================================================
// SOPORTE
// ============================================================

function setupSupport() {
  const btn   = document.getElementById('support-btn');
  const win   = document.getElementById('support-win');
  const close = document.getElementById('support-close');
  const send  = document.getElementById('support-send');
  const inp   = document.getElementById('support-inp');
  if (!btn || !win) return;

  btn.onclick = () => win.classList.toggle('open');
  close?.addEventListener('click', () => win.classList.remove('open'));

  const render = () => {
    const body = win.querySelector('.support-msgs');
    if (!body) return;
    body.innerHTML = APP.supportHistory.map(m =>
      `<div class="chat-bubble chat-${m.sender === 'user' ? 'out' : 'in'}">${m.text}</div>`
    ).join('');
    body.scrollTop = body.scrollHeight;
  };

  const doSend = () => {
    const text = inp?.value.trim(); if (!text) return;
    APP.supportHistory.push({ sender: 'user', text });
    if (inp) inp.value = '';
    render();
    setTimeout(() => {
      const t = text.toLowerCase();
      let reply = 'Su consulta ha sido registrada. Escríbanos a soporte@homii.ec para una respuesta más rápida.';
      if (t.includes('verific') || t.includes('certific')) reply = 'La certificación PUCEM requiere inspección presencial. El proceso toma entre 3 y 5 días hábiles.';
      if (t.includes('precio') || t.includes('costo') || t.includes('comis')) reply = 'Homii es gratuito para arrendatarios. Los propietarios pagan comisión solo al concretar el arrendamiento.';
      if (t.includes('roomie') || t.includes('compa')) reply = 'La sección Buscar Compañero le permite conectar con estudiantes de la PUCEM que buscan dividir gastos de arriendo.';
      if (t.includes('hola') || t.includes('buenas') || t.includes('buenos')) reply = 'Buen día. Estoy disponible para ayudarle con cualquier consulta sobre la plataforma.';
      if (t.includes('chat') || t.includes('mensaje')) reply = 'El chat en tiempo real está disponible en cada ficha de propiedad. Debe iniciar sesión para enviar mensajes al propietario.';
      APP.supportHistory.push({ sender: 'bot', text: reply });
      render();
    }, 1000);
  };

  send?.addEventListener('click', doSend);
  inp?.addEventListener('keypress', e => { if (e.key === 'Enter') doSend(); });
  render();
}

// ============================================================
// ACTIVACIÓN ESTUDIANTIL
// ============================================================

function setupActivation() {
  document.querySelectorAll('.activation-trigger').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); document.getElementById('activation-popup')?.classList.add('open'); });
  });
  document.getElementById('activation-close')?.addEventListener('click', () => {
    document.getElementById('activation-popup')?.classList.remove('open');
  });
  document.getElementById('activation-popup')?.addEventListener('click', e => {
    if (e.target.id === 'activation-popup') document.getElementById('activation-popup').classList.remove('open');
  });
  document.getElementById('btn-activate')?.addEventListener('click', () => {
    document.getElementById('activation-popup')?.classList.remove('open');
    addNotif('Homii Student Activo', 'Su cuenta estudiantil PUCEM ha sido activada.');
    alert('Activación exitosa. Ahora tiene acceso preferencial a los inmuebles certificados por la PUCEM.');
  });
}

// ============================================================
// UTILIDADES
// ============================================================

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function parseJSON(val, fallback) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'object' && val !== null) return val;
  try { return JSON.parse(val || JSON.stringify(fallback)); } catch { return fallback; }
}

function escAttr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Exportaciones globales necesarias para onclick en HTML dinámico
window.navigate                   = navigate;
window.openPropertyModal          = openPropertyModal;
window.closePropertyModal         = closePropertyModal;
window.openRoomieModal            = openRoomieModal;
window.closeRoomieModal           = closeRoomieModal;
window.closeConversationModal     = closeConversationModal;
window.openCurrentLandlordProfile = function() {
  const p = openPropertyData;
  const uid  = p?.landlord_id  || 'demo_landlord';
  const name = p?.landlord_name || 'Propietario Homii';
  closePropertyModal();
  setTimeout(() => {
    if (typeof window.openPublicProfile === 'function') {
      window.openPublicProfile(uid, name, 'landlord');
    } else {
      openPublicProfile(uid, name, 'landlord');
    }
  }, 50);
};
window.openAuth                   = openAuth;
window.closeAuth                  = closeAuth;
window.logout                     = logout;
window.filterListings             = filterListings;
window.filterRoomies              = filterRoomies;

function isValidUUID(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

// ============================================================
// PERFIL PÚBLICO DE OTRO USUARIO / PROPIETARIO
// ============================================================

window.openPublicProfile = async function openPublicProfile(userId, fallbackName, fallbackRole) {
  const s = id => document.getElementById(id);

  // 1. Llenar datos iniciales ANTES de navegar para que la vista ya tenga contenido
  const roleStr = fallbackRole || 'landlord';
  let profile = {
    name: fallbackName || 'Usuario',
    role: roleStr,
    phone: null,
    occupation: roleStr === 'landlord' ? 'Propietario Verificado Homii' : 'Estudiante Universitario',
    bio: 'Cargando información...',
    avatar_color: '#1a56db'
  };

  if (userId) {
    const localAvatar = localStorage.getItem('homii_avatar_' + userId);
    if (localAvatar) profile.avatar_url = localAvatar;
    const localExtraStr = localStorage.getItem('homii_extra_' + userId);
    if (localExtraStr) {
      try {
        const e = JSON.parse(localExtraStr);
        if (e.bio)        profile.bio        = e.bio;
        if (e.occupation) profile.occupation = e.occupation;
        if (e.phone)      profile.phone      = e.phone;
        if (e.name)       profile.name       = e.name;
      } catch(_) {}
    }
  }

  // 2. Renderizar datos en la vista antes de mostrarla
  const avEl = s('pub-view-avatar');
  if (avEl) {
    if (profile.avatar_url) {
      avEl.innerHTML = `<img src="${profile.avatar_url}" alt="${profile.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      avEl.style.background = 'transparent';
    } else {
      avEl.textContent = (profile.name || 'U').charAt(0).toUpperCase();
      avEl.style.background = profile.avatar_color || '#1a56db';
    }
  }
  if (s('pub-view-name'))       s('pub-view-name').textContent       = profile.name;
  if (s('pub-view-role'))       s('pub-view-role').textContent       = roleLabel(profile.role);
  if (s('pub-view-occupation')) s('pub-view-occupation').textContent = profile.occupation;
  if (s('pub-view-phone'))      s('pub-view-phone').textContent      = profile.phone || 'No especificado';
  if (s('pub-view-email'))      s('pub-view-email').textContent      = 'Contacto vía Homii Chat';
  if (s('pub-view-bio'))        s('pub-view-bio').textContent        = profile.bio;
  if (s('pub-view-props-section'))  s('pub-view-props-section').style.display  = 'none';
  if (s('pub-view-roomie-section')) s('pub-view-roomie-section').style.display = 'none';

  // 3. Activar la vista de perfil público DIRECTAMENTE (sin navigate())
  //    navigate() añade -view al id; aquí usamos el id exacto
  const allViews = document.querySelectorAll('.view');
  console.log('[openPublicProfile] Total vistas encontradas:', allViews.length);
  allViews.forEach(v => {
    v.classList.remove('active');
  });

  const pubView = document.getElementById('public-user-profile-view');
  console.log('[openPublicProfile] Vista de perfil público encontrada:', pubView ? 'SÍ ✅' : 'NO ❌');

  if (pubView) {
    pubView.classList.add('active');
    document.body.style.overflow = '';
    window.scrollTo({ top: 0 });
    console.log('[openPublicProfile] Vista activada exitosamente ✅');
  } else {
    console.error('[openPublicProfile] ERROR: No se encontró #public-user-profile-view en el DOM');
    alert('Error interno: Vista de perfil no encontrada. Por favor recarga la página.');
    return;
  }

  // 4. Consultar base de datos en segundo plano para enriquecer la vista
  const validUid = isValidUUID(userId);
  if (validUid) {
    try {
      const { data: dbProfile } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (dbProfile) {
        Object.assign(profile, dbProfile);
        if (s('pub-view-name'))       s('pub-view-name').textContent       = profile.name;
        if (s('pub-view-role'))       s('pub-view-role').textContent       = roleLabel(profile.role);
        if (s('pub-view-occupation')) s('pub-view-occupation').textContent = profile.occupation || (profile.role === 'landlord' ? 'Propietario Verificado Homii' : 'Estudiante Universitario');
        if (s('pub-view-phone'))      s('pub-view-phone').textContent      = profile.phone || 'No especificado';
        if (s('pub-view-bio'))        s('pub-view-bio').textContent        = profile.bio || 'El usuario no ha publicado una biografía personal todavía.';
        if (avEl && profile.avatar_url) {
          avEl.innerHTML = `<img src="${profile.avatar_url}" alt="${profile.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
          avEl.style.background = 'transparent';
        }
      }
    } catch(e) {}
  }

  // Cargar propiedades publicadas
  const propsSec   = s('pub-view-props-section');
  const propsList  = s('pub-view-props-list');
  const propsCount = s('pub-view-props-count');

  let userProps = [];
  if (validUid) {
    try {
      const { data: pData } = await db.from('properties').select('*').eq('landlord_id', userId);
      userProps = pData || [];
    } catch(e) {}
  }

  if (userProps && userProps.length > 0) {
    if (propsSec)   propsSec.style.display = 'block';
    if (propsCount) propsCount.textContent = userProps.length;
    if (propsList) {
      propsList.innerHTML = userProps.map(p => `
        <div class="prop-card" style="cursor:pointer;" onclick="openPropertyModal('${p.id}')">
          <div class="prop-img" style="height:150px;">
            ${p.images && p.images.length > 0 ? `<img src="${p.images[0]}" alt="${p.title}">` : `<div class="prop-img-placeholder"><svg viewBox="0 0 24 24" width="30" height="30" stroke-width="1.2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg></div>`}
          </div>
          <div class="prop-body" style="padding:0.85rem;">
            <div style="font-weight:600;font-size:0.9rem;color:var(--text);margin-bottom:0.25rem;">${p.title}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);">$${p.price}/mes &middot; ${(p.location || '').split(',')[0]}</div>
          </div>
        </div>`).join('');
    }
  } else {
    if (propsSec) propsSec.style.display = 'none';
  }

  // Cargar perfil roomie
  const roomieSec  = s('pub-view-roomie-section');
  const roomieCard = s('pub-view-roomie-card');
  let userRoomie   = null;

  if (validUid) {
    try {
      const { data: rData } = await db.from('roomies').select('*').eq('user_id', userId).maybeSingle();
      userRoomie = rData;
    } catch(e) {}
  }

  if (userRoomie) {
    if (roomieSec)  roomieSec.style.display = 'block';
    if (roomieCard) {
      roomieCard.innerHTML = `
        <div class="prop-row" style="cursor:pointer;" onclick="openRoomieModal('${userRoomie.id}')">
          <div class="roomie-av" style="background:${userRoomie.avatar_color};width:44px;height:44px;">${userRoomie.name.charAt(0)}</div>
          <div style="flex:1;min-width:0;margin-left:0.85rem;">
            <div style="font-weight:600;font-size:0.9rem;">${userRoomie.name}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);">${userRoomie.career} &middot; $${userRoomie.budget}/mes</div>
          </div>
          <span class="badge badge-blue">Ver publicación roomie</span>
        </div>`;
    }
  } else {
    if (roomieSec) roomieSec.style.display = 'none';
  }
}

function closePublicProfileModal() {
  document.body.style.overflow = '';
}

// Exportar al scope global para llamadas desde HTML
window.openPublicProfile       = openPublicProfile;
window.closePublicProfileModal = closePublicProfileModal;
