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
// FUNCIONES GLOBALES: CONTRASEÑA, CÁMARA Y CALIFICACIONES
// ============================================================

window.togglePasswordVisibility = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  btn.textContent = isPass ? '🙈' : '👁️';
};

window.forgotPasswordPrompt = async function() {
  const emailInput = document.getElementById('login-email');
  const defaultEmail = emailInput ? emailInput.value : '';
  const email = prompt('Ingrese su correo electrónico para enviarle el enlace de restablecimiento de contraseña:', defaultEmail);
  if (!email || !email.trim()) return;

  const { error } = await db.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin
  });
  if (error) {
    alert('Error al enviar la solicitud: ' + error.message);
  } else {
    alert('¡Enlace enviado!\n\nSe ha enviado un correo a ' + email.trim() + ' con instrucciones para restablecer su contraseña.');
  }
};

window.biometricStream = null;
window.biometricStep = 1;

window.startBiometricCamera = async function() {
  const video = document.getElementById('bio-video');
  const startBtn = document.getElementById('bio-start-cam-btn');
  const snapBtn = document.getElementById('bio-snap-btn');
  const stepTitle = document.getElementById('bio-step-title');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    window.biometricStream = stream;
    if (video) {
      video.srcObject = stream;
      video.style.display = 'block';
    }
    if (startBtn) startBtn.style.display = 'none';
    if (snapBtn) snapBtn.style.display = 'block';
    window.biometricStep = 1;
    if (stepTitle) stepTitle.textContent = 'Paso 1 de 3: Tómese una Selfie de su Rostro';
  } catch (err) {
    alert('No se pudo acceder a la cámara del dispositivo: ' + err.message + '\n\nAsegúrese de conceder los permisos de cámara en su navegador.');
  }
};

window.captureBiometricStep = function() {
  const video = document.getElementById('bio-video');
  const canvas = document.getElementById('bio-canvas');
  const stepTitle = document.getElementById('bio-step-title');
  const snapBtn = document.getElementById('bio-snap-btn');
  if (!video || !canvas) return;

  // Escalar la imagen a un tamaño optimizado (360x270) para guardarla en Supabase
  canvas.width = 360;
  canvas.height = 270;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.65);

  window.tempBiometricData = window.tempBiometricData || { selfie: '', front: '', back: '' };

  if (window.biometricStep === 1) {
    window.tempBiometricData.selfie = dataUrl;
    const thumb = document.getElementById('bio-thumb-selfie');
    if (thumb) { thumb.src = dataUrl; thumb.style.display = 'block'; }
    window.biometricStep = 2;
    if (stepTitle) stepTitle.textContent = 'Paso 2 de 3: Fotografía del Frente de su Cédula';
    if (snapBtn) snapBtn.textContent = '📸 Capturar Frente de Cédula';
  } else if (window.biometricStep === 2) {
    window.tempBiometricData.front = dataUrl;
    const thumb = document.getElementById('bio-thumb-front');
    if (thumb) { thumb.src = dataUrl; thumb.style.display = 'block'; }
    window.biometricStep = 3;
    if (stepTitle) stepTitle.textContent = 'Paso 3 de 3: Fotografía del Reverso de su Cédula';
    if (snapBtn) snapBtn.textContent = '📸 Capturar Reverso de Cédula';
  } else if (window.biometricStep === 3) {
    window.tempBiometricData.back = dataUrl;
    const thumb = document.getElementById('bio-thumb-back');
    if (thumb) { thumb.src = dataUrl; thumb.style.display = 'block'; }
    if (stepTitle) stepTitle.textContent = '✓ 3 Fotografías biométricas capturadas con éxito';
    if (snapBtn) snapBtn.style.display = 'none';
    window.stopBiometricCamera();
  }
};

window.stopBiometricCamera = function() {
  if (window.biometricStream) {
    window.biometricStream.getTracks().forEach(track => track.stop());
    window.biometricStream = null;
  }
  const video = document.getElementById('bio-video');
  if (video) video.style.display = 'none';
  const startBtn = document.getElementById('bio-start-cam-btn');
  if (startBtn && window.biometricStep >= 3) {
    startBtn.textContent = '✓ Verificación Biométrica Completada';
    startBtn.style.display = 'block';
    startBtn.disabled = true;
  }
};

window.selectedStars = 5;
window.currentRatingTarget = null;

window.setRatingStars = function(count) {
  window.selectedStars = count;
  const container = document.getElementById('star-rating-selector');
  if (!container) return;
  const stars = container.querySelectorAll('span');
  stars.forEach((star, idx) => {
    star.style.color = idx < count ? '#f59e0b' : '#d1d5db';
  });
};

window.openRatingModal = function(type, id, name) {
  window.currentRatingTarget = { type, id, name };
  window.setRatingStars(5);
  const commentEl = document.getElementById('rating-comment');
  if (commentEl) commentEl.value = '';
  const modal = document.getElementById('rating-modal');
  if (modal) modal.classList.add('open');
};

window.submitRating = async function() {
  if (!window.currentRatingTarget) return;
  const { type, id, name } = window.currentRatingTarget;
  const stars = window.selectedStars || 5;
  const comment = document.getElementById('rating-comment')?.value.trim() || '';

  const table = type === 'property' ? 'properties' : 'profiles';
  try {
    const { data: item } = await db.from(table).select('rating_avg, rating_count, reviews').eq('id', id).maybeSingle();
    let currentAvg = item?.rating_avg || 5.0;
    let currentCount = item?.rating_count || 0;
    let currentReviews = item?.reviews || [];

    if (typeof currentReviews === 'string') {
      try { currentReviews = JSON.parse(currentReviews); } catch(e) { currentReviews = []; }
    }
    if (!Array.isArray(currentReviews)) currentReviews = [];

    const newCount = currentCount + 1;
    const newAvg = parseFloat(((currentAvg * currentCount + stars) / newCount).toFixed(1));

    const newReviewObj = {
      author: CURRENT_PROFILE?.name || CURRENT_USER?.email?.split('@')[0] || 'Usuario Homii',
      rating: stars,
      text: comment || 'Calificación otorgada al culminar el contrato.',
      created_at: new Date().toISOString()
    };
    currentReviews.push(newReviewObj);

    await db.from(table).update({
      rating_avg: newAvg,
      rating_count: newCount,
      reviews: currentReviews
    }).eq('id', id);

    alert(`⭐ ¡Calificación de ${stars} estrellas enviada!\n\nMuchas gracias por calificar a ${name || 'esta persona/inmueble'}.`);
    document.getElementById('rating-modal')?.classList.remove('open');

    if (typeof filterListings === 'function') filterListings();
    if (typeof filterRoomies === 'function') filterRoomies();
    if (typeof renderProfileView === 'function') renderProfileView();
  } catch (e) {
    alert('Calificación enviada.');
    document.getElementById('rating-modal')?.classList.remove('open');
  }
};

window.renderStarRatingHTML = function(avg, count) {
  const rating = parseFloat(avg || 5.0).toFixed(1);
  const totalCount = count || 0;
  const fullStars = Math.round(rating);
  let starsHTML = '';
  for (let i = 1; i <= 5; i++) {
    starsHTML += i <= fullStars ? '★' : '☆';
  }
  return `<span style="color:#f59e0b; font-weight:700; font-size:0.85rem;">${starsHTML} ${rating}</span> <span style="font-size:0.75rem; color:var(--text-muted);">(${totalCount})</span>`;
};

// ============================================================
// INICIALIZACIÓN
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  setupNav();
  setupMobileMenu();
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
    const warningBanner = document.getElementById('biometric-warning-banner');
    if (warningBanner) warningBanner.style.display = 'none';
    updateNavUI();
    return;
  }

  CURRENT_USER = user;

  // Cargar metadatos locales de respaldo
  const localMetaStr = localStorage.getItem('homii_profile_meta_' + user.id);
  const localMeta = localMetaStr ? JSON.parse(localMetaStr) : {};
  
  // 1. Consultar perfil de la tabla profiles en Supabase
  let { data: profile } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
  
  const metaName          = user.user_metadata?.name || user.email.split('@')[0];
  const metaRole          = user.user_metadata?.role || (user.email.endsWith('@pucem.edu.ec') || user.email.endsWith('@pucesm.edu.ec') ? 'university' : 'student');
  const metaPhone         = user.user_metadata?.phone || null;
  const metaCedula        = user.user_metadata?.cedula || localMeta.cedula || null;
  const metaIsVerified    = user.user_metadata?.is_verified || localMeta.is_verified || (metaRole === 'university' ? 'approved' : 'pending');
  const metaIsPremium     = user.user_metadata?.is_premium || localMeta.is_premium || false;
  const metaPremiumTier   = user.user_metadata?.premium_tier || localMeta.premium_tier || 'none';
  const metaSelfieUrl     = user.user_metadata?.selfie_url || localMeta.selfie_url || null;
  const metaIdCardFront   = user.user_metadata?.id_card_front_url || localMeta.id_card_front_url || null;
  const metaIdCardBack    = user.user_metadata?.id_card_back_url || localMeta.id_card_back_url || null;

  if (!profile) {
    // Si la cuenta activa en Supabase Auth NO tiene fila en public.profiles, CREARLA Y SINCRONIZARLA automáticamente
    const colors = ['#0f172a','#1a56db','#0369a1','#7c3aed','#059669','#d97706'];
    const color  = colors[Math.floor(Math.random() * colors.length)];

    profile = {
      id: user.id,
      name: metaName,
      email: user.email,
      role: metaRole,
      phone: metaPhone,
      cedula: metaCedula,
      is_verified: metaIsVerified,
      is_premium: metaIsPremium,
      premium_tier: metaPremiumTier,
      avatar_color: color,
      selfie_url: metaSelfieUrl,
      id_card_front_url: metaIdCardFront,
      id_card_back_url: metaIdCardBack
    };

    // Auto-recuperación: forzar guardado en Supabase public.profiles
    const { error: upsertErr } = await db.from('profiles').upsert(profile, { onConflict: 'id' });
    if (upsertErr) {
      console.warn('Auto-healing profile creation warning:', upsertErr.message);
      await db.from('profiles').insert(profile).catch(e => console.warn('Direct insert fallback:', e.message));
    }
  } else {
    // Si la fila existía pero le faltaban datos críticos (email, rol, cédula, estado de verificación, imágenes), actualizar Supabase
    let needsUpdate = false;
    if (!profile.email && user.email) { profile.email = user.email; needsUpdate = true; }
    if (!profile.role && metaRole) { profile.role = metaRole; needsUpdate = true; }
    if ((!profile.name || profile.name === user.email.split('@')[0]) && metaName) { profile.name = metaName; needsUpdate = true; }
    if (!profile.phone && metaPhone) { profile.phone = metaPhone; needsUpdate = true; }
    if (!profile.cedula && metaCedula) { profile.cedula = metaCedula; needsUpdate = true; }
    if (!profile.is_verified && metaIsVerified) { profile.is_verified = metaIsVerified; needsUpdate = true; }
    if (!profile.selfie_url && metaSelfieUrl) { profile.selfie_url = metaSelfieUrl; needsUpdate = true; }
    if (!profile.id_card_front_url && metaIdCardFront) { profile.id_card_front_url = metaIdCardFront; needsUpdate = true; }
    if (!profile.id_card_back_url && metaIdCardBack) { profile.id_card_back_url = metaIdCardBack; needsUpdate = true; }

    if (needsUpdate) {
      const { error: syncErr } = await db.from('profiles').upsert(profile, { onConflict: 'id' });
      if (syncErr) console.warn('Profile sync upsert warning:', syncErr.message);
    }
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

  // Banner de advertencia si la cuenta está pendiente o rechazada en la verificación biométrica
  const warningBanner = document.getElementById('biometric-warning-banner');
  if (warningBanner) {
    if (profile.role === 'student') {
      if (profile.is_verified === 'pending') {
        warningBanner.style.display = 'flex';
        warningBanner.style.background = '#fffbeb';
        warningBanner.style.color = '#b45309';
        warningBanner.style.borderBottom = '1px solid #fef3c7';
        warningBanner.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          <span><strong>Verificación Biométrica Pendiente:</strong> Tu registro está siendo revisado por el equipo de Homii. La asignación y reserva de propiedades estarán deshabilitadas hasta que se apruebe tu cuenta (máx. 24h).</span>
        `;
      } else if (profile.is_verified === 'rejected') {
        warningBanner.style.display = 'flex';
        warningBanner.style.background = '#fef2f2';
        warningBanner.style.color = '#b91c1c';
        warningBanner.style.borderBottom = '1px solid #fee2e2';
        const reason = profile.rejection_reason || localMeta.rejection_reason || 'Documentos inconsistentes o no legibles.';
        warningBanner.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="flex-shrink:0; margin-right:0.3rem;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          <span><strong>Registro Biométrico Rechazado:</strong> ${reason} <a class="auth-link" style="color:#b91c1c; font-weight:700; text-decoration:underline; margin-left:0.5rem;" onclick="navigate('profile')">Vuelve a subir tus documentos aquí.</a></span>
        `;
      } else {
        warningBanner.style.display = 'none';
      }
    } else {
      warningBanner.style.display = 'none';
    }
  }

  // Activar modo PUCEM únicamente si el correo termina en @pucem.edu.ec o @pucesm.edu.ec
  const em = (user.email || '').toLowerCase();
  const isPUCEM = em.endsWith('@pucem.edu.ec') || em.endsWith('@pucesm.edu.ec');
  document.body.classList.toggle('pucem-mode', isPUCEM);

  updateNavUI();
  setupGlobalChatNotifications();
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

  // Controladores dinámicos para los campos de registro biométrico
  const regRole = document.getElementById('reg-role');
  const biometricFields = document.getElementById('biometric-fields');
  const regCedula = document.getElementById('reg-cedula');
  const regSelfie = document.getElementById('reg-selfie');
  const regIdcardFront = document.getElementById('reg-idcard-front');
  const regIdcardBack = document.getElementById('reg-idcard-back');

  if (regRole && biometricFields) {
    const toggleBiometrics = () => {
      const isUser = regRole.value === 'student' || regRole.value === 'landlord';
      biometricFields.style.display = isUser ? 'flex' : 'none';
      if (regCedula) {
        regCedula.required = isUser;
        if (!isUser) regCedula.setCustomValidity('');
      }
    };
    regRole.addEventListener('change', toggleBiometrics);
    toggleBiometrics();

    if (regCedula) {
      const validateCedulaLive = () => {
        const isStudent = regRole.value === 'student';
        if (!isStudent) {
          regCedula.setCustomValidity('');
          return;
        }
        const val = regCedula.value.trim();
        if (!validarCedulaEcuatoriana(val)) {
          regCedula.setCustomValidity('El número de cédula ingresado no es válido en Ecuador.');
        } else {
          regCedula.setCustomValidity('');
        }
      };
      regCedula.addEventListener('input', validateCedulaLive);
      regRole.addEventListener('change', validateCedulaLive);
    }
  }

  window.tempBiometricData = { selfie: '', front: '', back: '' };

  document.getElementById('reg-selfie')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    const preview = document.getElementById('selfie-preview-name');
    if (file && preview) {
      preview.textContent = '📸 Selfie: ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
      preview.style.color = '#10b981';
      preview.style.fontWeight = '600';
      const r = new FileReader();
      r.onload = ev => { window.tempBiometricData.selfie = ev.target.result; };
      r.readAsDataURL(file);
    }
  });

  document.getElementById('reg-idcard-front')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    const preview = document.getElementById('idcard-front-preview-name');
    if (file && preview) {
      preview.textContent = 'Frente: ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
      preview.style.color = '#10b981';
      preview.style.fontWeight = '600';
      const r = new FileReader();
      r.onload = ev => { window.tempBiometricData.front = ev.target.result; };
      r.readAsDataURL(file);
    }
  });

  document.getElementById('reg-idcard-back')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    const preview = document.getElementById('idcard-back-preview-name');
    if (file && preview) {
      preview.textContent = 'Reverso: ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
      preview.style.color = '#10b981';
      preview.style.fontWeight = '600';
      const r = new FileReader();
      r.onload = ev => { window.tempBiometricData.back = ev.target.result; };
      r.readAsDataURL(file);
    }
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

function validarCedulaEcuatoriana(cedula) {
  if (!cedula || cedula.length !== 10 || !/^[0-9]{10}$/.test(cedula)) return false;
  
  const provincia = parseInt(cedula.substring(0, 2), 10);
  if ((provincia < 1 || provincia > 24) && provincia !== 30) return false;
  
  const tercerDigito = parseInt(cedula.substring(2, 3), 10);
  if (tercerDigito >= 6) return false;
  
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let valor = parseInt(cedula.charAt(i), 10) * coeficientes[i];
    if (valor >= 10) valor -= 9;
    suma += valor;
  }
  
  const digitoVerificador = parseInt(cedula.substring(9, 10), 10);
  const residuo = suma % 10;
  const digitoCalculado = residuo === 0 ? 0 : 10 - residuo;
  
  return digitoCalculado === digitoVerificador;
}

async function doRegister() {
  clearAuthErrors();
  const name  = document.getElementById('reg-name')?.value.trim();
  const email = document.getElementById('reg-email')?.value.trim();
  const pass  = document.getElementById('reg-password')?.value;
  let role    = document.getElementById('reg-role')?.value || 'student';
  if (role !== 'landlord' && role !== 'student' && role !== 'university') role = 'student';
  const phone = document.getElementById('reg-phone')?.value.trim() || null;
  const terms = document.getElementById('reg-terms')?.checked;
  const btn   = document.querySelector('#register-form button[type=submit]');

  const isVerified = (role === 'university' || email.endsWith('@pucem.edu.ec') || email.endsWith('@pucesm.edu.ec')) ? 'approved' : 'pending';

  if (!name)  { showAuthError('register-error', 'Ingrese su nombre completo.'); return; }
  if (!email) { showAuthError('register-error', 'Ingrese un correo electrónico.'); return; }
  if (!pass || pass.length < 6) { showAuthError('register-error', 'La contraseña debe tener al menos 6 caracteres.'); return; }
  if (!terms) { showAuthError('register-error', 'Debe aceptar los términos y condiciones para continuar.'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Creando cuenta...'; }

  try {
    // 1. Registrar usuario en Supabase Auth al instante
    let { data, error } = await db.auth.signUp({
      email,
      password: pass,
      options: {
        data: { name, role, phone, is_verified: isVerified }
      }
    });

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

    if (error) {
      let msg = 'No se pudo crear la cuenta.';
      const errStr = (error.message || '').toLowerCase();
      if (errStr.includes('already') || errStr.includes('registered')) {
        msg = 'Este correo ya está registrado. Por favor intente "Iniciar sesión" con su contraseña.';
      } else if (errStr.includes('rate limit')) {
        msg = 'Límite de peticiones alcanzado. Espere un momento e intente de nuevo.';
      } else if (error.message) {
        msg = error.message;
      }
      showAuthError('register-error', msg);
      return;
    }

    if (data?.user) {
      if (!data.session) {
        const { data: autoLogin } = await db.auth.signInWithPassword({ email, password: pass }).catch(() => ({}));
        if (autoLogin?.session) data = autoLogin;
      }

      const colors = ['#0f172a','#1a56db','#0369a1','#7c3aed','#059669','#d97706'];
      const color  = colors[Math.floor(Math.random() * colors.length)];

      const profileDbPayload = {
        id: data.user.id,
        name,
        email,
        role,
        phone,
        is_verified: isVerified,
        avatar_color: color
      };

      // Guardar inmediatamente en tabla public.profiles de Supabase
      await db.from('profiles').upsert(profileDbPayload, { onConflict: 'id' }).catch(async () => {
        await db.from('profiles').insert(profileDbPayload).catch(() => {});
      });

      if (!data.session) {
        alert('¡Cuenta creada con éxito!\n\nPor favor revise su correo electrónico (' + email + ') para confirmar su cuenta antes de iniciar sesión.');
        showAuthError('register-error', 'Por favor confirme su correo electrónico para acceder.');
        switchPanel('login');
        return;
      }

      await loadUserProfile(data.user);
      closeAuth();
      addNotif('Cuenta Creada', 'Bienvenido a Homii, ' + name + '.');

      if (role === 'landlord') { APP.pendingRoute = 'landlord'; navigate('landlord'); }
      if (role === 'student')  { APP.pendingRoute = 'search'; navigate('search'); }
      if (role === 'university') {
        const em = email.toLowerCase();
        const isPucem = em.endsWith('@pucem.edu.ec') || em.endsWith('@pucesm.edu.ec');
        if (isPucem) {
          APP.pendingRoute = 'university';
          navigate('university');
        } else {
          APP.pendingRoute = 'admin';
          navigate('admin');
        }
      }
    }
  } catch (err) {
    console.error('Registration error:', err);
    showAuthError('register-error', 'Ocurrió un error inesperado al registrar la cuenta.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Crear cuenta'; }
  }
}

// ============================================================
// MODAL Y FUNCIONALIDAD DE VERIFICACIÓN BIOMÉTRICA DEDICADA
// ============================================================

window.openBiometricModal = function() {
  if (!CURRENT_USER) { openAuth(); return; }
  const modal = document.getElementById('biometric-modal');
  if (!modal) return;
  modal.classList.add('open');
  const cedulaInput = document.getElementById('modal-bio-cedula');
  if (cedulaInput && CURRENT_PROFILE?.cedula) {
    cedulaInput.value = CURRENT_PROFILE.cedula;
  }
};

window.closeBiometricModal = function() {
  const modal = document.getElementById('biometric-modal');
  modal?.classList.remove('open');
  if (typeof stopBiometricCamera === 'function') stopBiometricCamera();
};

window.submitBiometricVerification = async function() {
  if (!CURRENT_USER) { openAuth(); return; }

  const cedula = (document.getElementById('modal-bio-cedula')?.value || '').trim().replace(/\s+|-/g, '');
  if (!cedula) { alert('Por favor ingrese su número de cédula de identidad.'); return; }
  if (cedula.length !== 10) { alert('La cédula debe contener exactamente 10 dígitos.'); return; }

  if (!window.tempBiometricData?.selfie || !window.tempBiometricData?.front || !window.tempBiometricData?.back) {
    alert('Por favor presione "Activar Cámara en Vivo" y complete los 3 pasos de verificación biométrica (Selfie, Cédula Frente, Cédula Reverso).');
    return;
  }

  const selfieUrl = window.tempBiometricData.selfie;
  const frontUrl  = window.tempBiometricData.front;
  const backUrl   = window.tempBiometricData.back;

  // Guardar copia local de respaldo
  const profileMeta = {
    cedula,
    is_verified: 'pending',
    selfie_url: selfieUrl,
    id_card_front_url: frontUrl,
    id_card_back_url: backUrl
  };
  localStorage.setItem('homii_profile_meta_' + CURRENT_USER.id, JSON.stringify(profileMeta));

  // Actualizar tabla profiles en Supabase con las fotos reales capturadas
  const { error } = await db.from('profiles').update({
    cedula,
    is_verified: 'pending',
    selfie_url: selfieUrl,
    id_card_front_url: frontUrl,
    id_card_back_url: backUrl
  }).eq('id', CURRENT_USER.id);

  if (error) {
    console.warn('Advertencia al actualizar verificación en Supabase:', error.message);
    // Reintentar si el campo is_verified requiere booleano
    await db.from('profiles').update({
      cedula,
      is_verified: false,
      selfie_url: selfieUrl,
      id_card_front_url: frontUrl,
      id_card_back_url: backUrl
    }).eq('id', CURRENT_USER.id).catch(() => {});
  }

  if (CURRENT_PROFILE) {
    CURRENT_PROFILE.cedula = cedula;
    CURRENT_PROFILE.is_verified = 'pending';
    CURRENT_PROFILE.selfie_url = selfieUrl;
    CURRENT_PROFILE.id_card_front_url = frontUrl;
    CURRENT_PROFILE.id_card_back_url = backUrl;
  }

  window.closeBiometricModal();
  addNotif('Verificación Enviada', 'Su solicitud de verificación ha sido enviada al Administrador.');
  alert('✓ Solicitud de verificación enviada al Administrador.\n\nSu información y fotografías han sido recibidas. El Administrador revisará su solicitud a la brevedad para verificar su cuenta.');

  if (typeof renderAdminPanel === 'function') renderAdminPanel();
  if (typeof renderLandlordPanel === 'function') renderLandlordPanel();
};

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
  const llLink   = document.querySelectorAll('.nav-landlord-link');
  const uniLink  = document.querySelectorAll('.nav-uni-link');
  const adminLink = document.querySelectorAll('.nav-admin-link');
  const profLink = document.querySelectorAll('.nav-profile-link');

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
      if (profile?.is_premium) {
        avEl.classList.add('premium-avatar');
      } else {
        avEl.classList.remove('premium-avatar');
      }
    }
    const em = (user.email || '').toLowerCase();
    const isPucemEmail = em.endsWith('@pucem.edu.ec') || em.endsWith('@pucesm.edu.ec');
    const isUniRole = profile?.role === 'university' || profile?.role === 'admin';
    const isHomiiAdmin = isUniRole && !isPucemEmail;
    const isPucemAdmin = isUniRole && isPucemEmail;

    llLink.forEach(el => el.style.display   = profile?.role === 'landlord' ? 'block' : 'none');
    uniLink.forEach(el => el.style.display  = isPucemAdmin ? 'block' : 'none');
    adminLink.forEach(el => el.style.display = isHomiiAdmin ? 'block' : 'none');
    profLink.forEach(el => el.style.display = 'block');
    if (typeof syncRoomieFormUser === 'function') syncRoomieFormUser();
  } else {
    if (guestEl)  guestEl.style.display  = 'flex';
    if (userEl)   userEl.style.display   = 'none';
    llLink.forEach(el => el.style.display   = 'none');
    uniLink.forEach(el => el.style.display  = 'none');
    adminLink.forEach(el => el.style.display = 'none');
    profLink.forEach(el => el.style.display = 'none');
  }

  // Sincronizar UI del Menú Móvil
  const mGuest = document.getElementById('mobile-guest-actions');
  const mUser  = document.getElementById('mobile-user-actions');
  const mInfo  = document.getElementById('mobile-user-info');
  const mName  = document.getElementById('mobile-username');
  const mRole  = document.getElementById('mobile-user-role');
  const mAv    = document.getElementById('mobile-avatar');

  if (user) {
    const displayName = profile?.name || user.email.split('@')[0];
    if (mGuest) mGuest.style.display = 'none';
    if (mUser)  mUser.style.display  = 'flex';
    if (mInfo)  mInfo.style.display  = 'flex';
    if (mName)  mName.textContent    = displayName;
    if (mRole)  mRole.textContent    = roleLabel(profile?.role, user.email);
    if (mAv) {
      if (profile?.avatar_url) {
        mAv.innerHTML = `<img src="${profile.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        mAv.style.background = 'transparent';
      } else {
        mAv.textContent = displayName.charAt(0).toUpperCase();
        mAv.style.background = profile?.avatar_color || '#1a56db';
      }
      if (profile?.is_premium) {
        mAv.classList.add('premium-avatar');
      } else {
        mAv.classList.remove('premium-avatar');
      }
    }
  } else {
    if (mGuest) mGuest.style.display = 'flex';
    if (mUser)  mUser.style.display  = 'none';
    if (mInfo)  mInfo.style.display  = 'none';
  }
}

window.toggleMobileDrawer = function(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  const drawer  = document.getElementById('mobile-nav-drawer');
  const overlay = document.getElementById('mobile-nav-overlay');
  if (!drawer) return;

  const isOpen = drawer.classList.contains('open');
  if (isOpen) {
    drawer.classList.remove('open');
    overlay?.classList.remove('open');
    document.body.style.overflow = '';
  } else {
    drawer.classList.add('open');
    overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
};

window.closeMobileDrawer = function(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  const drawer  = document.getElementById('mobile-nav-drawer');
  const overlay = document.getElementById('mobile-nav-overlay');
  drawer?.classList.remove('open');
  overlay?.classList.remove('open');
  document.body.style.overflow = '';
};

function setupMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const drawer    = document.getElementById('mobile-nav-drawer');
  const overlay   = document.getElementById('mobile-nav-overlay');
  const closeBtn  = document.getElementById('mobile-drawer-close');

  if (toggleBtn) {
    toggleBtn.onclick = (e) => window.toggleMobileDrawer(e);
    toggleBtn.ontouchstart = (e) => window.toggleMobileDrawer(e);
  }

  if (closeBtn) {
    closeBtn.onclick = (e) => window.closeMobileDrawer(e);
    closeBtn.ontouchstart = (e) => window.closeMobileDrawer(e);
  }

  if (overlay) {
    overlay.onclick = (e) => window.closeMobileDrawer(e);
    overlay.ontouchstart = (e) => window.closeMobileDrawer(e);
  }

  document.querySelectorAll('#mobile-nav-drawer .nav-link').forEach(link => {
    const handleNav = (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      if (view) {
        navigate(view);
        window.closeMobileDrawer();
      }
    };
    link.onclick = handleNav;
  });

  const mLogin  = document.getElementById('btn-mobile-login');
  const mReg    = document.getElementById('btn-mobile-register');
  const mLogout = document.getElementById('btn-mobile-logout');

  if (mLogin)  mLogin.onclick  = (e) => { e.preventDefault(); window.closeMobileDrawer(); openAuth(); };
  if (mReg)    mReg.onclick    = (e) => { e.preventDefault(); window.closeMobileDrawer(); openAuthRegister(); };
  if (mLogout) mLogout.onclick = (e) => { e.preventDefault(); window.closeMobileDrawer(); logout(); };
}

function guardRoute(route) {
  if (!CURRENT_USER) { APP.pendingRoute = route; openAuth(); return false; }
  const role = CURRENT_PROFILE?.role;
  const em = (CURRENT_USER.email || '').toLowerCase();
  const isPucemEmail = em.endsWith('@pucem.edu.ec') || em.endsWith('@pucesm.edu.ec');
  const isUniRole = role === 'university' || role === 'admin';
  const isHomiiAdmin = isUniRole && !isPucemEmail;
  const isPucemAdmin = isUniRole && isPucemEmail;

  if (route === 'landlord'   && role !== 'landlord')   { APP.pendingRoute = route; openAuth(); return false; }
  if (route === 'university' && !isPucemAdmin) { APP.pendingRoute = route; openAuth(); return false; }
  if (route === 'admin'      && !isHomiiAdmin) { APP.pendingRoute = route; openAuth(); return false; }
  return true;
}

// ============================================================
// NAVEGACIÓN
// ============================================================

function navigate(viewId) {
  if ((viewId === 'landlord' || viewId === 'university' || viewId === 'admin') && !guardRoute(viewId)) return;
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
  if (viewId === 'admin')      renderAdminPanel();

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
  ['filter-keyword','filter-rooms','filter-certified','filter-certified-pucem','filter-certified-homii','sort-by'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', filterListings);
    document.getElementById(id)?.addEventListener('input',  filterListings);
  });
  document.querySelectorAll('.filter-amenity').forEach(cb => cb.addEventListener('change', filterListings));
}

async function filterListings() {
  const grid = document.getElementById('listings-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="no-results-msg">Cargando propiedades...</div>';

  const kw          = (document.getElementById('filter-keyword')?.value || '').toLowerCase().trim();
  const maxPrice    = parseInt(document.getElementById('filter-price')?.value || '1200');
  const minRooms    = document.getElementById('filter-rooms')?.value || 'any';
  const certPucem   = document.getElementById('filter-certified-pucem')?.checked || false;
  const certHomii   = document.getElementById('filter-certified-homii')?.checked || false;
  const legacyCert  = document.getElementById('filter-certified')?.checked || false;
  const maxDist     = parseFloat(document.getElementById('filter-distance')?.value || '10');
  const sortBy      = document.getElementById('sort-by')?.value || 'featured';
  const amenities   = [...document.querySelectorAll('.filter-amenity:checked')].map(cb => cb.value);
  const isPucemMode = document.body.classList.contains('pucem-mode');

  let query = db.from('properties').select('*');

  // En la consulta de Supabase:
  if (certPucem) {
    query = query.eq('university_certified', true).eq('certification_type', 'pucem');
  } else if (certHomii) {
    query = query.eq('university_certified', true);
  } else if (legacyCert) {
    if (isPucemMode) {
      query = query.eq('university_certified', true).eq('certification_type', 'pucem');
    } else {
      query = query.eq('university_certified', true);
    }
  }

  const { data: props, error } = await query;

  if (error) {
    grid.innerHTML = '<div class="no-results-msg">Error al cargar propiedades. Intente de nuevo.</div>';
    return;
  }

  const selectedProvince = document.getElementById('filter-province')?.value || 'all';

  let filtered = (props || []).filter(p => {
    // Solo mostrar inmuebles verificados/aprobados por el Administrador (excluir pendientes de revisión)
    const isApproved = p.is_demo || p.university_certified === true || p.is_verified === true || p.status === 'available' || p.status === 'approved';
    if (!isApproved) return false;

    const matchKw   = !kw || p.title.toLowerCase().includes(kw) || (p.description || '').toLowerCase().includes(kw) || (p.location || '').toLowerCase().includes(kw);
    const matchPrc  = p.is_demo || p.price <= maxPrice;
    const matchRoom = minRooms === 'any' || p.rooms >= parseInt(minRooms);
    const matchDist = p.is_demo || p.distance_to_campus <= maxDist;
    const matchAmen = amenities.every(a => (p.amenities || []).includes(a));
    const matchProv = selectedProvince === 'all' || (p.province || p.location || '').toLowerCase().includes(selectedProvince.toLowerCase());

    // Filtro estricto de certificación en JS como respaldo
    let matchCert = true;
    if (certPucem) {
      matchCert = p.university_certified === true && p.certification_type === 'pucem';
    } else if (certHomii) {
      matchCert = p.university_certified === true;
    } else if (legacyCert) {
      if (isPucemMode) {
        matchCert = p.university_certified === true && p.certification_type === 'pucem';
      } else {
        matchCert = p.university_certified === true;
      }
    }

    return matchKw && matchPrc && matchRoom && matchDist && matchAmen && matchCert && matchProv;
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

  const propMetaStr = localStorage.getItem('homii_prop_meta_' + p.id);
  const propMeta = propMetaStr ? JSON.parse(propMetaStr) : { status: p.status || 'available', waiting_list: p.waiting_list || [] };
  const currentStatus = propMeta.status || 'available';
  const waitingList = propMeta.waiting_list || [];

  // Ordenar lista de espera: Premium primero, luego por tiempo de llegada
  const sortedList = [...waitingList].sort((a, b) => {
    if (a.is_premium && !b.is_premium) return -1;
    if (!a.is_premium && b.is_premium) return 1;
    return new Date(a.timestamp) - new Date(b.timestamp);
  });

  const badgesRow = document.getElementById('detail-badges');
  if (badgesRow) {
    badgesRow.innerHTML = '';
    if (currentStatus === 'assigned') {
      badgesRow.innerHTML += `<span class="badge badge-red" style="background:#fee2e2;color:#dc2626;font-weight:700;">Alquilado</span> `;
    } else {
      badgesRow.innerHTML += `<span class="badge badge-green" style="background:#d1fae5;color:#059669;font-weight:700;">Disponible</span> `;
    }
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

  // Renderizar botones de acción para Lista de Espera y Reservas (Vista limpia del arrendatario)
  const reserveContainer = document.getElementById('detail-reserve-container');
  if (reserveContainer) {
    if (currentStatus === 'assigned') {
      reserveContainer.innerHTML = `
        <button class="btn btn-full" disabled style="background:#fee2e2;color:#dc2626;border:none;font-weight:700;padding:0.85rem;">
          Inmueble Alquilado
        </button>`;
    } else {
      const myIndex = CURRENT_USER ? sortedList.findIndex(u => u.user_id === CURRENT_USER.id) : -1;
      if (myIndex !== -1) {
        reserveContainer.innerHTML = `
          <button class="btn btn-primary btn-full" style="background:#059669;font-weight:700;padding:0.85rem;" disabled>
            ✓ Solicitud de Reserva Enviada
          </button>
          <button class="btn btn-outline btn-full btn-sm" onclick="leaveWaitingList('${p.id}')">
            Cancelar solicitud de reserva
          </button>`;
      } else {
        reserveContainer.innerHTML = `
          <button class="btn btn-primary btn-full" onclick="joinWaitingList('${p.id}')" style="font-weight:700;padding:0.85rem;">
            Solicitar Reserva
          </button>`;
      }
    }
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

  switchModalTab('property-modal', 'details');
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
  const modal = document.getElementById('property-modal');
  modal?.classList.remove('open');
  document.body.style.overflow = '';
  const f = document.getElementById('detail-map'); if (f) f.src = '';
  if (activeChatChannel) { activeChatChannel.unsubscribe(); activeChatChannel = null; }
  openPropertyData = null;
  if (modal) {
    const left  = modal.querySelector('.modal-left');
    const right = modal.querySelector('.modal-right');
    if (left)  left.style.display  = '';
    if (right) right.style.display = '';
  }
}

// ============================================================
// CHAT EN TIEMPO REAL CON AVATAR, HORA Y PERFIL CLICKEABLE
// ============================================================

const CHAT_PROFILES_CACHE = {};

async function fetchUserProfileForChat(userId) {
  if (!userId || userId === 'demo_landlord' || userId === 'demo_roomie') return null;
  if (CHAT_PROFILES_CACHE[userId]) return CHAT_PROFILES_CACHE[userId];
  try {
    const { data } = await db.from('profiles').select('id, name, avatar_url, avatar_color, role').eq('id', userId).maybeSingle();
    if (data) CHAT_PROFILES_CACHE[userId] = data;
    return data;
  } catch(e) {
    return null;
  }
}

function formatChatTime(dateStr) {
  if (!dateStr) return new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true });
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch(e) {
    return new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}

function renderChatMessageElement(m, currentUserId, defaultAuthorName = '', defaultAvatarUrl = null) {
  const isOut = (m.sender_id === currentUserId) || (m.sender === 'user');
  const senderId = m.sender_id || (isOut ? currentUserId : 'demo_landlord');
  const authorName = m.sender_name || (isOut ? (CURRENT_PROFILE?.name || 'Yo') : defaultAuthorName || 'Usuario');
  
  // Buscar avatar
  let avatarUrl = isOut ? CURRENT_PROFILE?.avatar_url : (m.avatar_url || defaultAvatarUrl);
  const cachedProf = CHAT_PROFILES_CACHE[senderId];
  if (cachedProf && cachedProf.avatar_url) {
    avatarUrl = cachedProf.avatar_url;
  }

  const initial = (authorName || 'U').charAt(0).toUpperCase();
  const avatarBg = cachedProf?.avatar_color || (isOut ? '#1a56db' : '#059669');

  const avatarHtml = avatarUrl
    ? `<div class="chat-msg-avatar" onclick="openPublicProfile('${senderId}', '${escAttr(authorName)}')" title="Ver perfil público de ${escAttr(authorName)}">
        <img src="${avatarUrl}" alt="${escAttr(authorName)}">
       </div>`
    : `<div class="chat-msg-avatar" style="background:${avatarBg}" onclick="openPublicProfile('${senderId}', '${escAttr(authorName)}')" title="Ver perfil público de ${escAttr(authorName)}">
        ${initial}
       </div>`;

  const timeStr = formatChatTime(m.created_at);

  const row = document.createElement('div');
  row.className = `chat-msg-row ${isOut ? 'chat-msg-out' : 'chat-msg-in'}`;
  row.innerHTML = `
    ${avatarHtml}
    <div class="chat-msg-body">
      ${!isOut ? `<div class="chat-msg-author" onclick="openPublicProfile('${senderId}', '${escAttr(authorName)}')" title="Ver perfil público de ${escAttr(authorName)}">${authorName}</div>` : ''}
      <div class="chat-bubble ${isOut ? 'chat-out' : 'chat-in'}">
        <div class="chat-msg-text">${m.message || m.text || ''}</div>
        <div class="chat-msg-footer">
          <span>${timeStr}</span>
        </div>
      </div>
    </div>
  `;

  // Cargar avatar en segundo plano si es de otro usuario y aún no está cacheado
  if (!avatarUrl && isValidUUID(senderId) && !CHAT_PROFILES_CACHE[senderId]) {
    fetchUserProfileForChat(senderId).then(prof => {
      if (prof?.avatar_url) {
        const avDiv = row.querySelector('.chat-msg-avatar');
        if (avDiv) {
          avDiv.innerHTML = `<img src="${prof.avatar_url}" alt="${escAttr(authorName)}">`;
          avDiv.style.background = 'transparent';
        }
      }
    });
  }

  return row;
}

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

  // Usuario no verificado por el administrador
  const isVerifiedUser = CURRENT_PROFILE?.is_verified === 'approved' || CURRENT_PROFILE?.role === 'university';
  if (!isVerifiedUser) {
    if (chatBox) chatBox.innerHTML = `
      <div style="padding:1.5rem 1rem; text-align:center; background:var(--bg-section); border-radius:var(--radius-lg); border:1px solid var(--border); margin:0.5rem 0;">
        <div style="font-size:1.5rem; margin-bottom:0.3rem;">🔒</div>
        <div style="font-weight:700; color:var(--text); font-size:0.92rem;">Usted no está verificado</div>
        <p style="font-size:0.8rem; color:var(--text-sec); margin:0.3rem 0 0.8rem; line-height:1.5;">Debe verificar su cuenta con su cédula y foto en vivo para poder enviar mensajes a los propietarios.</p>
        <button class="btn btn-primary btn-sm btn-full" onclick="closePropertyModal(); window.openBiometricModal();" style="background:#f59e0b; border:none; color:#0f172a; font-weight:700; font-size:0.8rem;">Verificar mi cuenta ahora</button>
      </div>`;
    return;
  }

  if (activeChatChannel) { activeChatChannel.unsubscribe(); activeChatChannel = null; }

  const chatId = `prop_${p.id}_usr_${CURRENT_USER.id}`;

  // Cargar historial
  const { data: history } = await db.from('chats').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });

  const appendBubble = (m) => {
    const el = renderChatMessageElement(m, CURRENT_USER.id, p.landlord_name, null);
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  };

  msgs.innerHTML = '';
  if (!history || history.length === 0) {
    const defaultWelcome = {
      sender_id: p.landlord_id || 'demo_landlord',
      sender_name: p.landlord_name || 'Propietario Homii',
      message: `Hola, gracias por su interés en "${p.title}". ¿En qué le puedo ayudar?`,
      created_at: new Date().toISOString()
    };
    msgs.appendChild(renderChatMessageElement(defaultWelcome, CURRENT_USER.id, p.landlord_name, null));
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

    // Bloqueo de chat para usuarios o propietarios sin verificación biométrica aprobada
    const vStatus = CURRENT_PROFILE?.is_verified;
    if (CURRENT_PROFILE?.role !== 'university' && (vStatus === 'pending' || vStatus === 'rejected' || vStatus === false || !vStatus)) {
      alert('⚠️ Verificación Biométrica Requerida\n\nSu cuenta aún no ha sido aprobada por el Administrador. Debe completar y tener aprobada su verificación biométrica de identidad (selfie y cédula) para poder enviar mensajes.');
      return;
    }

    if (input) input.value = '';

    // Añadir mensaje local inmediatamente (optimistic)
    const localMsgObj = {
      sender_id: CURRENT_USER.id,
      sender_name: CURRENT_PROFILE?.name || CURRENT_USER.email,
      message: text,
      created_at: new Date().toISOString()
    };
    const bubbleEl = renderChatMessageElement(localMsgObj, CURRENT_USER.id);
    msgs.appendChild(bubbleEl);
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

  msgs.innerHTML = '';
  (history || []).forEach(m => {
    msgs.appendChild(renderChatMessageElement(m, CURRENT_USER.id, senderName, null));
  });
  msgs.scrollTop = msgs.scrollHeight;

  // Marcar como leídos
  await db.from('chats').update({ is_read: true }).eq('chat_id', chatId).eq('receiver_id', CURRENT_USER.id);

  if (activeChatChannel) { activeChatChannel.unsubscribe(); }
  activeChatChannel = db.channel('conv:' + chatId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats', filter: `chat_id=eq.${chatId}` }, (payload) => {
      if (payload.new.sender_id !== CURRENT_USER.id) {
        msgs.appendChild(renderChatMessageElement(payload.new, CURRENT_USER.id, senderName, null));
        msgs.scrollTop = msgs.scrollHeight;
      }
    }).subscribe();

  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  const doSend = async (text) => {
    text = (text || '').trim();
    if (!text) return;

    // Bloqueo para usuarios no verificados
    const vStatus = CURRENT_PROFILE?.is_verified;
    if (CURRENT_PROFILE?.role !== 'university' && (vStatus === 'pending' || vStatus === 'rejected' || vStatus === false || !vStatus)) {
      alert('⚠️ Verificación Biométrica Requerida\n\nSu cuenta aún no ha sido aprobada por el Administrador. Debe completar y tener aprobada su verificación biométrica de identidad (selfie y cédula) para poder responder o enviar mensajes.');
      return;
    }

    if (input) input.value = '';
    const localMsgObj = {
      sender_id: CURRENT_USER.id,
      sender_name: CURRENT_PROFILE?.name || CURRENT_USER.email,
      message: text,
      created_at: new Date().toISOString()
    };
    msgs.appendChild(renderChatMessageElement(localMsgObj, CURRENT_USER.id));
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

function syncRoomieFormUser() {
  const nameDisplay   = document.getElementById('rp-user-display-name');
  const careerDisplay = document.getElementById('rp-user-display-career');

  const name   = CURRENT_PROFILE?.name || CURRENT_USER?.email?.split('@')[0] || 'Usuario';
  const career = CURRENT_PROFILE?.occupation || 'Estudiante / Carrera no especificada';

  if (nameDisplay)   nameDisplay.textContent   = name;
  if (careerDisplay) careerDisplay.textContent = '— ' + career;
}

function setupRoomie() {
  ['roomie-type','roomie-schedule','roomie-gender','roomie-province'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', filterRoomies);
  });
  const budgetSlider = document.getElementById('roomie-budget');
  const budgetVal    = document.getElementById('roomie-budget-val');
  if (budgetSlider && budgetVal) {
    budgetSlider.addEventListener('input', () => { budgetVal.textContent = '$' + budgetSlider.value; filterRoomies(); });
  }
  document.getElementById('rp-type')?.addEventListener('change', e => {
    const isTiene = e.target.value === 'tiene-lugar';
    const container = document.getElementById('tiene-lugar-fields');
    const budgetLabel = document.getElementById('rp-budget-label');
    if (container) container.style.display = isTiene ? 'flex' : 'none';
    if (budgetLabel) budgetLabel.textContent = isTiene ? 'Costo por persona / Aporte ($/mes) *' : 'Presupuesto mensual ($) *';
  });
  document.getElementById('roomie-form')?.addEventListener('submit', e => { e.preventDefault(); submitRoomieProfile(); });
  document.getElementById('roomie-modal')?.addEventListener('click', e => { if (e.target.id === 'roomie-modal') closeRoomieModal(); });
  document.getElementById('roomie-modal-close')?.addEventListener('click', closeRoomieModal);

  syncRoomieFormUser();
}

async function filterRoomies() {
  const grid = document.getElementById('roomie-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="no-results-msg" style="grid-column:1/-1;">Cargando perfiles...</div>';

  const maxBudget = parseInt(document.getElementById('roomie-budget')?.value || '500');
  const type      = document.getElementById('roomie-type')?.value     || 'all';
  const schedule  = document.getElementById('roomie-schedule')?.value || 'all';
  const gender    = document.getElementById('roomie-gender')?.value   || 'all';
  const selectedProvince = document.getElementById('roomie-province')?.value || 'all';

  const { data: list } = await db.from('roomies').select('*').order('created_at', { ascending: false });

  // Cargar perfiles de usuario desde profiles DB para garantizar que todas las fotos carguen
  const userIds = [...new Set((list || []).map(r => r.user_id).filter(id => isValidUUID(id)))];
  if (userIds.length > 0) {
    const { data: profs } = await db.from('profiles').select('id, name, avatar_url, avatar_color, rating_avg, rating_count').in('id', userIds);
    (profs || []).forEach(p => {
      CHAT_PROFILES_CACHE[p.id] = p;
    });
  }

  const filtered = (list || []).filter(r => {
    const matchBudget   = r.is_demo || r.budget <= maxBudget;
    const matchType     = type     === 'all' || r.type     === type;
    const matchSchedule = schedule === 'all' || r.schedule === schedule;
    const matchGender   = gender   === 'all' || r.gender   === gender;
    const matchProv     = selectedProvince === 'all' || (r.province || r.location || '').toLowerCase().includes(selectedProvince.toLowerCase());
    return matchBudget && matchType && matchSchedule && matchGender && matchProv;
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
    const userProf  = CHAT_PROFILES_CACHE[userUid];
    const avatarUrl = r.avatar_url || userProf?.avatar_url;
    const avatarBg  = userProf?.avatar_color || r.avatar_color || '#1a56db';

    return `
    <div class="roomie-card" onclick="openRoomieModal('${r.id}')">
      <div class="roomie-card-header">
        <div class="roomie-av" onclick="event.stopPropagation();openPublicProfile('${userUid}', '${escAttr(r.name)}', 'student')" style="background:${avatarUrl ? 'transparent' : avatarBg};cursor:pointer;overflow:hidden;" title="Ver perfil público de ${escAttr(r.name)}">
          ${avatarUrl ? `<img src="${avatarUrl}" alt="${escAttr(r.name)}" style="width:100%;height:100%;object-fit:cover;">` : r.name.charAt(0).toUpperCase()}
        </div>
        <div onclick="event.stopPropagation();openPublicProfile('${userUid}', '${escAttr(r.name)}', 'student')" style="cursor:pointer;" title="Ver perfil público de ${escAttr(r.name)}">
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
    avEl.title = 'Ver perfil público de ' + r.name;
    avEl.onclick = () => { closeRoomieModal(); openPublicProfile(userUid, r.name, 'student'); };

    // Consultar avatar actualizado en profiles si existe
    let avatarUrl = r.avatar_url;
    if (isValidUUID(r.user_id)) {
      const { data: uProf } = await db.from('profiles').select('avatar_url, name').eq('id', r.user_id).maybeSingle();
      if (uProf?.avatar_url) avatarUrl = uProf.avatar_url;
    }

    if (avatarUrl) {
      avEl.innerHTML = `<img src="${avatarUrl}" alt="${r.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      avEl.style.background = 'transparent';
    } else {
      avEl.textContent = r.name.charAt(0).toUpperCase();
      avEl.style.background = r.avatar_color || '#1a56db';
    }
  }

  const typeEl = document.getElementById('rmodal-type');
  if (typeEl) { typeEl.textContent = typeLabel; typeEl.className = 'roomie-type-tag ' + typeClass; }

  const infoTable = document.getElementById('rmodal-info');
  if (infoTable) {
    let rows = [
      [r.type === 'tiene-lugar' ? 'Costo por persona / Aporte' : 'Presupuesto mensual', r.is_demo ? 'Solo demostración' : '$' + r.budget + ' / mes'],
      ['Horario de clases', r.schedule],
      ['Género', r.gender],
      ['Disponibilidad', r.available_from],
      ['Hábitos', (r.habits || []).join(', ')]
    ];
    if (r.type === 'tiene-lugar' && r.location) {
      rows.push(['Sector del lugar', r.location]);
    }
    infoTable.innerHTML = rows.map(([k, v]) =>
      `<div class="info-row"><span class="info-key">${k}</span><span class="info-val">${v}</span></div>`
    ).join('');
  }

  document.getElementById('rmodal-desc').textContent    = r.description;
  document.getElementById('rmodal-contact').textContent = r.is_demo ? 'soporte@homii.ec (solo ejemplo)' : r.contact;

  await setupRoomieChat(r);

  switchModalTab('roomie-modal', 'details');
  document.getElementById('roomie-modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

async function setupRoomieChat(r) {
  const msgs    = document.getElementById('roomie-chat-msgs');
  const input   = document.getElementById('roomie-chat-input');
  const sendBtn = document.getElementById('roomie-chat-send');
  const chatBox = msgs?.closest('.direct-chat-box');
  if (!msgs) return;

  if (r.is_demo) {
    if (chatBox) chatBox.innerHTML = `
      <div style="padding:1.25rem;font-size:0.82rem;color:var(--text-muted);text-align:center;line-height:1.6;">
        Este es un perfil de demostración.<br>No hay un estudiante real para contactar.<br>
        Cuando estudiantes reales publiquen sus perfiles, podrá chatear con ellos en tiempo real desde aquí.
      </div>`;
    return;
  }

  if (!CURRENT_USER) {
    if (chatBox) chatBox.innerHTML = `
      <div style="padding:1.25rem;font-size:0.82rem;color:var(--text-muted);text-align:center;line-height:1.6;">
        Inicie sesión para escribir a este estudiante.<br>
        <a class="auth-link" style="cursor:pointer;" onclick="closeRoomieModal();openAuth()">Iniciar sesión</a>
      </div>`;
    return;
  }

  // Si el usuario actual es el propio autor de este perfil roomie
  if (CURRENT_USER.id === r.user_id) {
    if (chatBox) chatBox.innerHTML = `
      <div style="padding:1.25rem;font-size:0.82rem;color:var(--text-muted);line-height:1.6;text-align:center;">
        Esta es su propia publicación de compañero.<br>
        Para revisar y responder los mensajes recibidos de otros estudiantes, revise sus 
        <a class="auth-link" style="cursor:pointer;" onclick="closeRoomieModal();navigate('profile');">Mensajes recibidos en Mi Perfil</a>.
      </div>`;
    return;
  }

  if (activeChatChannel) { activeChatChannel.unsubscribe(); activeChatChannel = null; }

  const chatId = `roomie_${r.id}_usr_${CURRENT_USER.id}`;
  const targetRoomieUserId = r.user_id || 'demo_roomie';

  // Buscar avatar del autor si no lo tiene
  let roomieAvatarUrl = r.avatar_url;
  if (!roomieAvatarUrl && isValidUUID(targetRoomieUserId)) {
    const prof = await fetchUserProfileForChat(targetRoomieUserId);
    if (prof?.avatar_url) roomieAvatarUrl = prof.avatar_url;
  }

  // Cargar historial real desde Supabase DB
  const { data: history } = await db.from('chats').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });

  const appendBubble = (m) => {
    const el = renderChatMessageElement(m, CURRENT_USER.id, r.name, roomieAvatarUrl);
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  };

  msgs.innerHTML = '';
  if (!history || history.length === 0) {
    const defaultWelcome = {
      sender_id: targetRoomieUserId,
      sender_name: r.name,
      message: `Hola, vi tu perfil en Homii ("${r.career}"). ¿Sigues buscando compañero?`,
      created_at: new Date().toISOString()
    };
    msgs.appendChild(renderChatMessageElement(defaultWelcome, CURRENT_USER.id, r.name, roomieAvatarUrl));
  } else {
    (history || []).forEach(m => appendBubble(m));
  }

  // Suscripción real-time a Supabase
  activeChatChannel = db.channel('chat:' + chatId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chats',
      filter: `chat_id=eq.${chatId}`
    }, (payload) => {
      if (payload.new.sender_id !== CURRENT_USER.id) appendBubble(payload.new);
    })
    .subscribe();

  // Configurar botón e input de envío
  const newSend = sendBtn.cloneNode(true);
  sendBtn.parentNode.replaceChild(newSend, sendBtn);

  const doSend = async (text) => {
    text = (text || '').trim();
    if (!text) return;

    if (input) input.value = '';

    const localMsgObj = {
      sender_id: CURRENT_USER.id,
      sender_name: CURRENT_PROFILE?.name || CURRENT_USER.email,
      message: text,
      created_at: new Date().toISOString()
    };
    msgs.appendChild(renderChatMessageElement(localMsgObj, CURRENT_USER.id));
    msgs.scrollTop = msgs.scrollHeight;

    const { error: chatErr } = await db.from('chats').insert({
      chat_id: chatId,
      property_title: 'Compañero: ' + r.name + ' (' + r.career + ')',
      sender_id: CURRENT_USER.id,
      sender_name: CURRENT_PROFILE?.name || CURRENT_USER.email,
      receiver_id: targetRoomieUserId,
      message: text
    });

    if (chatErr) {
      alert('Error al enviar mensaje: ' + chatErr.message);
      console.error('Error enviando chat roomie:', chatErr);
    }
  };

  newSend.addEventListener('click', () => doSend(input?.value));
  if (input) { input.onkeypress = e => { if (e.key === 'Enter') doSend(input.value); }; }
}

function closeRoomieModal() {
  const modal = document.getElementById('roomie-modal');
  modal?.classList.remove('open');
  document.body.style.overflow = '';
  if (modal) {
    const left  = modal.querySelector('.roomie-profile-section');
    const right = modal.querySelector('.roomie-modal-layout > div:nth-child(2)');
    if (left)  left.style.display  = '';
    if (right) right.style.display = '';
  }
}

window.switchModalTab = function(modalId, tabName) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  const tabInfoBtn = modal.querySelector('.modal-mobile-tabs .modal-tab-btn:nth-child(1)');
  const tabChatBtn = modal.querySelector('.modal-mobile-tabs .modal-tab-btn:nth-child(2)');

  if (tabName === 'details') {
    tabInfoBtn?.classList.add('active');
    tabChatBtn?.classList.remove('active');
  } else {
    tabChatBtn?.classList.add('active');
    tabInfoBtn?.classList.remove('active');
  }

  if (modalId === 'property-modal') {
    const left  = modal.querySelector('.modal-left');
    const right = modal.querySelector('.modal-right');
    if (window.innerWidth <= 768) {
      if (tabName === 'chat') {
        if (left)  left.style.display  = 'none';
        if (right) right.style.display = 'block';
      } else {
        if (left)  left.style.display  = 'block';
        if (right) right.style.display = 'none';
      }
    } else {
      if (left)  left.style.display  = '';
      if (right) right.style.display = '';
    }
  } else if (modalId === 'roomie-modal') {
    const left  = modal.querySelector('.roomie-profile-section');
    const right = modal.querySelector('.roomie-modal-layout > div:nth-child(2)');
    if (window.innerWidth <= 768) {
      if (tabName === 'chat') {
        if (left)  left.style.display  = 'none';
        if (right) right.style.display = 'flex';
      } else {
        if (left)  left.style.display  = 'block';
        if (right) right.style.display = 'none';
      }
    } else {
      if (left)  left.style.display  = '';
      if (right) right.style.display = '';
    }
  }
};

async function submitRoomieProfile() {
  if (!CURRENT_USER) { openAuth(); return; }

  const name   = CURRENT_PROFILE?.name || CURRENT_USER?.email?.split('@')[0] || 'Usuario';
  const career = CURRENT_PROFILE?.occupation || 'Estudiante';
  const budget = parseInt(document.getElementById('rp-budget')?.value || '0');
  const type   = document.getElementById('rp-type')?.value;
  const schedule  = document.getElementById('rp-schedule')?.value;
  const gender    = document.getElementById('rp-gender')?.value;
  const desc      = document.getElementById('rp-desc')?.value.trim();
  const available = document.getElementById('rp-available')?.value.trim();

  let location  = null;

  if (type === 'tiene-lugar') {
    location = document.getElementById('rp-location')?.value.trim() || null;
    if (!location) {
      alert('Por favor ingrese el sector o ubicación de la propiedad.');
      return;
    }
  }

  if (!budget || !desc) { alert('Por favor completa todos los campos obligatorios.'); return; }

  const colors = ['#1a56db','#0369a1','#7c3aed','#059669','#d97706','#0f766e'];
  const color  = colors[Math.floor(Math.random() * colors.length)];

  const { error } = await db.from('roomies').insert({
    user_id: CURRENT_USER.id,
    name, career, budget, type, gender, schedule,
    location,
    available_from: available || 'Próximamente',
    description: desc,
    contact: CURRENT_USER.email,
    avatar_color: color,
    is_demo: false
  });

  if (error) { alert('Error al publicar perfil: ' + error.message); return; }

  document.getElementById('roomie-form')?.reset();
  const tieneContainer = document.getElementById('tiene-lugar-fields');
  if (tieneContainer) tieneContainer.style.display = 'none';
  syncRoomieFormUser();

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
    if (p.is_premium) {
      s('profile-avatar').classList.add('premium-avatar');
    } else {
      s('profile-avatar').classList.remove('premium-avatar');
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

  // Estado de Verificación Biométrica (solo estudiantes)
  const bioCard = s('profile-biometric-card');
  const bioArea = s('profile-biometric-status-area');
  
  if (bioCard && bioArea) {
    if (p.role === 'student') {
      bioCard.style.display = 'block';
      const localMetaStr = localStorage.getItem('homii_profile_meta_' + CURRENT_USER.id);
      const localMeta = localMetaStr ? JSON.parse(localMetaStr) : {};
      const status = p.is_verified || localMeta.is_verified || 'pending';
      const reason = p.rejection_reason || localMeta.rejection_reason || '';
      
      let html = '';
      if (status === 'approved') {
        html = `
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; color:#15803d; padding:1rem; border-radius:var(--radius-md); font-size:0.875rem;">
            <strong>✓ Cuenta Verificada Exitosamente:</strong> Tu identidad ha sido validada por el Administrador de Homii. Ya puedes reservar y postular a inmuebles con normalidad.
          </div>`;
      } else if (status === 'pending') {
        html = `
          <div style="background:#fffbeb; border:1px solid #fef3c7; color:#b45309; padding:1rem; border-radius:var(--radius-md); font-size:0.875rem;">
            <strong>⏳ Verificación Biométrica en Proceso:</strong> Tus documentos (selfie y cédula de identidad) están siendo validados por el equipo de Homii. Te notificaremos en un plazo máximo de 24 horas.
          </div>`;
      } else if (status === 'rejected') {
        html = `
          <div style="background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; padding:1rem; border-radius:var(--radius-md); font-size:0.875rem; display:flex; flex-direction:column; gap:0.5rem;">
            <div><strong>❌ Verificación Rechazada:</strong> ${reason || 'Documentos inconsistentes o ilegibles.'}</div>
            <div style="font-size:0.8rem; font-weight:500; margin-top:0.25rem;">Por favor, vuelve a subir tus archivos corregidos a continuación:</div>
          </div>
          
          <form onsubmit="event.preventDefault(); window.reuploadBiometrics();" style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;">
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              <div>
                <label class="form-label" style="font-size:0.8rem; font-weight:600;">Nueva Foto de tu Rostro (Selfie) *</label>
                <input type="file" id="re-selfie" accept="image/*" class="form-input" style="padding:0.4rem;" required onchange="window.handleReuploadFileChange('selfie')">
              </div>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem;">
                <div>
                  <label class="form-label" style="font-size:0.8rem; font-weight:600;">Cédula Frente *</label>
                  <input type="file" id="re-idcard-front" accept="image/*" class="form-input" style="padding:0.4rem;" required onchange="window.handleReuploadFileChange('front')">
                </div>
                <div>
                  <label class="form-label" style="font-size:0.8rem; font-weight:600;">Cédula Reverso *</label>
                  <input type="file" id="re-idcard-back" accept="image/*" class="form-input" style="padding:0.4rem;" required onchange="window.handleReuploadFileChange('back')">
                </div>
              </div>
            </div>
            <button type="submit" class="btn btn-primary" style="align-self:flex-start; margin-top:0.5rem; padding:0.6rem 1.2rem; font-weight:600;">Re-enviar Documentos</button>
          </form>`;
      }
      bioArea.innerHTML = html;
    } else {
      bioCard.style.display = 'none';
    }
  }

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

  // Mensajes recibidos (para todos los usuarios)
  const msgsSection = s('profile-messages');
  if (msgsSection) {
    msgsSection.style.display = 'block';
    await loadInboxMessages(msgsSection);
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

  // Actualizar también user_metadata en Supabase Auth
  db.auth.updateUser({
    data: { name, phone }
  }).catch(() => {});

  if (btn) { btn.disabled = false; btn.textContent = 'Guardar Cambios'; }

  Object.assign(CURRENT_PROFILE, updates);
  toggleEditProfileForm();
  updateNavUI();
  await renderProfileView();
  addNotif('Perfil Actualizado', 'Su información personal fue guardada correctamente.');
  alert(' Perfil actualizado exitosamente. Los cambios están guardados en la nube y son visibles desde cualquier dispositivo.');
};

function compressAndResizeAvatar(file, maxDimension = 250, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

window.uploadProfileAvatar = async function(e) {
  const file = e.target.files?.[0];
  if (!file || !CURRENT_USER || !CURRENT_PROFILE) return;

  if (file.size > 5 * 1024 * 1024) {
    alert('La imagen es demasiado grande. El tamaño máximo permitido es 5 MB.');
    return;
  }

  // 1. Comprimir y redimensionar imagen a max 250x250 px (Data URL liviano ~15KB)
  const compressedDataUrl = await compressAndResizeAvatar(file, 250, 0.75);

  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `avatars/${CURRENT_USER.id}.${ext}`;

  let avatarUrl = null;

  // 2. Intentar subir al bucket de Supabase Storage
  try {
    const { error: upErr } = await db.storage
      .from('homii-images')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (!upErr) {
      const { data: urlData } = db.storage.from('homii-images').getPublicUrl(path);
      if (urlData?.publicUrl) avatarUrl = urlData.publicUrl;
    } else {
      console.warn('Storage upload error:', upErr.message);
    }
  } catch (err) {
    console.warn('Storage not available:', err);
  }

  // 3. Fallback al Data URL comprimido (15KB) si Storage no retornó URL pública
  if (!avatarUrl) {
    avatarUrl = compressedDataUrl;
  }

  if (!avatarUrl) {
    alert('No se pudo procesar la foto de perfil. Por favor intente con otra imagen.');
    return;
  }

  // 4. Guardar URL/DataURL comprimido en la tabla profiles de Supabase DB para que persista en todos los dispositivos
  const profileUpsertPayload = {
    id: CURRENT_USER.id,
    name: CURRENT_PROFILE?.name || CURRENT_USER.email.split('@')[0],
    role: CURRENT_PROFILE?.role || 'student',
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString()
  };

  const { error: dbErr } = await db.from('profiles')
    .upsert(profileUpsertPayload, { onConflict: 'id' });

  if (dbErr) {
    console.error('Error al guardar avatar_url en Supabase DB:', dbErr.message);
    alert('Error al guardar foto en la base de datos: ' + dbErr.message);
    return;
  }

  // La foto de perfil se carga dinámicamente desde la tabla profiles mediante user_id, por lo que no es necesario guardar duplicadamente avatar_url en roomies

  // 5. Actualizar estado local
  CURRENT_PROFILE.avatar_url = avatarUrl;
  localStorage.setItem('homii_avatar_' + CURRENT_USER.id, avatarUrl);

  updateNavUI();
  await renderProfileView();
  addNotif('Foto Actualizada');
  alert('FOTO DE PERFIL ACTUALIZADA CORRECTAMENTE.');
};

async function loadInboxMessages(container) {
  if (!CURRENT_USER) return;

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
      const isMeSender = m.sender_id === CURRENT_USER.id;
      const otherId    = isMeSender ? m.receiver_id : m.sender_id;
      const otherName  = isMeSender ? (m.receiver_name || 'Usuario') : (m.sender_name || 'Usuario');
      convMap[m.chat_id] = { ...m, otherId, otherName, unread: 0 };
    }
    if (m.receiver_id === CURRENT_USER.id && !m.is_read) {
      convMap[m.chat_id].unread++;
    }
  });

  let convs = Object.values(convMap);

  // Cargar fotos y estado de suscripción de perfiles desde profiles DB para los participantes
  const otherIds = [...new Set(convs.map(c => c.otherId).filter(id => isValidUUID(id)))];
  if (otherIds.length > 0) {
    const { data: profs } = await db.from('profiles').select('id, name, avatar_url, avatar_color, is_premium').in('id', otherIds);
    (profs || []).forEach(p => {
      CHAT_PROFILES_CACHE[p.id] = p;
    });
  }

  // Ordenamiento de prioridad:
  // 1. Usuarios Premium primero
  // 2. El primer usuario en enviar mensaje (orden de llegada más antiguo) va primero
  convs.sort((a, b) => {
    const profA = CHAT_PROFILES_CACHE[a.otherId];
    const profB = CHAT_PROFILES_CACHE[b.otherId];

    const premA = (profA?.is_premium || a.is_premium) ? 1 : 0;
    const premB = (profB?.is_premium || b.is_premium) ? 1 : 0;

    if (premB !== premA) return premB - premA; // Prioridad Premium primero
    return new Date(a.created_at) - new Date(b.created_at); // Orden de llegada más antiguo primero
  });

  container.innerHTML = `
    <div class="panel-card-title">Mensajes recibidos <span class="badge badge-blue" style="font-size:0.7rem;margin-left:0.5rem;">${convs.length}</span></div>
    ${convs.map(c => {
      const cachedProf = CHAT_PROFILES_CACHE[c.otherId];
      const otherName  = cachedProf?.name || c.otherName || 'Usuario';
      const avatarUrl  = cachedProf?.avatar_url || null;
      const avatarBg   = cachedProf?.avatar_color || '#1a56db';
      const initial    = (otherName || 'U').charAt(0).toUpperCase();

      const avHtml = avatarUrl
        ? `<img src="${avatarUrl}" alt="${escAttr(otherName)}" style="width:100%;height:100%;object-fit:cover;">`
        : initial;

      return `
      <div class="prop-row" style="cursor:pointer;display:flex;align-items:center;gap:0.85rem;" onclick="openConversation('${c.chat_id}', '${escAttr(c.property_title || 'Consulta')}', '${escAttr(otherName)}', '${c.otherId}')">
        <div class="roomie-av" onclick="event.stopPropagation();openPublicProfile('${c.otherId}', '${escAttr(otherName)}')" style="background:${avatarUrl ? 'transparent' : avatarBg};width:42px;height:42px;border-radius:50%;overflow:hidden;flex-shrink:0;" title="Ver perfil público de ${escAttr(otherName)}">
          ${avHtml}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:0.85rem;font-weight:600;color:var(--text);">${otherName}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);">${formatChatTime(c.created_at)}</div>
          </div>
          <div style="font-size:0.75rem;color:var(--blue);font-weight:500;">${c.property_title || 'Consulta'}</div>
          <div style="font-size:0.78rem;color:var(--text-sec);margin-top:0.15rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.message}</div>
        </div>
        ${c.unread > 0 ? `<span class="badge badge-blue">${c.unread} nuevo</span>` : '<span class="badge badge-gray">Chat activo</span>'}
      </div>`;
    }).join('')}`;
}

let globalUserChatChannel = null;

function setupGlobalChatNotifications() {
  if (!CURRENT_USER) return;
  if (globalUserChatChannel) { globalUserChatChannel.unsubscribe(); }

  globalUserChatChannel = db.channel('user-notifications:' + CURRENT_USER.id)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chats',
      filter: `receiver_id=eq.${CURRENT_USER.id}`
    }, async (payload) => {
      const msg = payload.new;
      const senderName = msg.sender_name || 'Un usuario';
      addNotif('Nuevo mensaje de ' + senderName, `"${msg.message}"`);
      
      const msgsSec = document.getElementById('profile-messages');
      if (msgsSec && msgsSec.style.display !== 'none') {
        await loadInboxMessages(msgsSec, 'Mensajes recibidos');
      }

      const landSec = document.getElementById('landlord-messages');
      if (landSec && landSec.style.display !== 'none') {
        await loadInboxMessages(landSec, 'Mensajes recibidos');
      }
    })
    .subscribe();
}

async function loadLandlordMessages() {
  const section = document.getElementById('landlord-messages');
  if (section) await loadInboxMessages(section, 'Mensajes recibidos');
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

  const isVerifiedLandlord = CURRENT_PROFILE?.is_verified === 'approved' || CURRENT_PROFILE?.role === 'university';
  const unverifiedBanner = document.getElementById('landlord-unverified-banner');
  if (unverifiedBanner) {
    if (!isVerifiedLandlord) {
      unverifiedBanner.style.display = 'block';
      unverifiedBanner.innerHTML = `
        <div style="padding:1.25rem 1.5rem; background:#fffbe6; border-radius:var(--radius-xl); border:1px solid #ffe58f; margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
          <div>
            <div style="font-weight:700; color:#b45309; font-size:0.95rem;">Usted no está verificado como Propietario</div>
            <p style="font-size:0.82rem; color:#78350f; margin:0.25rem 0 0;">Debe verificar su cuenta con su cédula y foto en vivo para poder publicar sus propiedades.</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.openBiometricModal()" style="background:#f59e0b; border:none; color:#0f172a; font-weight:700; white-space:nowrap;">Verificar mi cuenta de propietario ahora</button>
        </div>`;
    } else {
      unverifiedBanner.style.display = 'none';
    }
  }

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
      list.innerHTML = (myProps || []).map(p => {
        const propMetaStr = localStorage.getItem('homii_prop_meta_' + p.id);
        const propMeta = propMetaStr ? JSON.parse(propMetaStr) : { status: p.status || 'available', waiting_list: p.waiting_list || [] };
        const status = propMeta.status || 'available';
        const waitingList = propMeta.waiting_list || [];

        let statusBadge = '<span class="badge badge-green">Disponible</span>';
        if (status === 'assigned') {
          statusBadge = '<span class="badge badge-red" style="background:#fee2e2;color:#dc2626;font-weight:700;">Alquilado</span>';
        } else if (status === 'in_progress') {
          statusBadge = `<span class="badge badge-amber" style="background:#fef3c7;color:#d97706;font-weight:700;">En Asignación (${waitingList.length} en espera)</span>`;
        }

        return `
        <div class="prop-row" style="flex-direction:column;align-items:stretch;gap:0.75rem;">
          <div style="display:flex;align-items:center;gap:0.85rem;">
            <div class="prop-row-img">
              ${p.images && p.images.length > 0 ? `<img src="${p.images[0]}" alt="${p.title}">` : `<svg viewBox="0 0 24 24" width="22" height="22" stroke="var(--border-blue)" stroke-width="1.5" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>`}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                <span style="font-weight:600;font-size:0.88rem;color:var(--text);">${p.title}</span>
                ${statusBadge}
              </div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${(p.location || '').split(',')[0]} &middot; <span style="color:var(--blue);font-weight:600;">$${p.price}/mes</span></div>
            </div>
            <div style="display:flex;gap:0.4rem;flex-wrap:wrap;justify-content:flex-end;">
              ${status !== 'assigned' ? `<button class="btn btn-primary btn-sm" onclick="openContractModal('${p.id}')">📜 Generar Contrato / Dar de Baja</button>` : ''}
              ${p.university_certified ? `<span class="badge badge-green">Verificado PUCEM</span>` : `<button class="btn btn-secondary btn-sm" onclick="requestVerif('${p.id}', '${escAttr(p.title)}')">Pedir verificación</button>`}
              ${p.featured ? `<span class="badge badge-blue">Destacado</span>` : `<button class="btn btn-outline btn-sm" onclick="makeFeatured('${p.id}')">Destacar</button>`}
              <button class="btn btn-danger btn-sm" onclick="deleteProp('${p.id}')">Eliminar</button>
            </div>
          </div>
          ${waitingList.length > 0 ? `
            <div style="background:var(--bg-section);border:1px solid var(--border);border-radius:var(--radius-md);padding:0.75rem;">
              <div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:0.5rem;text-transform:uppercase;">
                📋 Lista de Espera por Orden Estricto (${waitingList.length} Solicitantes)
              </div>
              <div style="display:flex;flex-direction:column;gap:0.4rem;">
                ${[...waitingList].sort((a,b)=>(a.is_premium && !b.is_premium ? -1 : (!a.is_premium && b.is_premium ? 1 : new Date(a.timestamp)-new Date(b.timestamp)))).map((u, idx) => `
                  <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.8rem;background:var(--bg);padding:0.4rem 0.6rem;border-radius:var(--radius-sm);">
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                      <span style="font-weight:700;color:var(--text-muted);">${idx + 1}.</span>
                      <span style="font-weight:600;color:var(--text);">${u.name}</span>
                      ${u.is_premium ? `<span class="badge badge-amber" style="font-size:0.65rem;padding:2px 6px;">👑 Prioridad 1 Premium</span>` : ''}
                      <span style="color:var(--text-muted);font-size:0.72rem;">(Cédula: ${u.cedula || 'Verificada'})</span>
                    </div>
                    <button class="btn btn-primary btn-sm" style="font-size:0.7rem;padding:0.2rem 0.5rem;" onclick="openContractModal('${p.id}')">
                      Asignar y Firmar
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>`;
      }).join('');
    }
  }

  await loadLandlordMessages();
}



window.makeFeatured = async function(id) {
  await db.from('properties').update({ featured: true }).eq('id', id);
  addNotif('Anuncio Destacado', 'Su propiedad ahora aparece destacada en el buscador.');
  renderLandlordPanel();
};

window.requestVerif = async function(id, title) {
  await db.from('properties').update({ verification_requested: true, status: 'pending_verification' }).eq('id', id);
  addNotif('Solicitud Enviada', `Solicitud de revisión enviada para "${title}". El administrador la revisará a la brevedad.`);
  alert('Solicitud enviada al Administrador.\n\nSu propiedad ha sido notificada al equipo de administración para su revisión y posterior publicación en el buscador público de arriendos.');
  renderLandlordPanel();
};

window.deleteProp = async function(id) {
  if (!confirm('¿Está seguro de eliminar este anuncio? Esta acción es irreversible.')) return;
  await db.from('properties').delete().eq('id', id);
  renderLandlordPanel();
  addNotif('Anuncio Eliminado', 'La propiedad fue removida del buscador.');
};

function setupPublishForm() {
  document.getElementById('prop-images')?.addEventListener('change', previewImages);
  document.getElementById('publish-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!CURRENT_USER) { openAuth(); return; }

    const btn = e.target.querySelector('[type=submit]');

    // Bloqueo estricto si el propietario no ha sido verificado por el administrador
    const currentStatus = CURRENT_PROFILE?.is_verified;
    if (CURRENT_PROFILE?.role !== 'university' && (currentStatus === 'pending' || currentStatus === 'rejected' || currentStatus === false || !currentStatus)) {
      alert('⚠️ Verificación Biométrica Requerida para Propietarios\n\nSu cuenta aún no ha sido verificada por el Administrador. Debe completar su verificación biométrica de identidad (selfie y cédula) y ser aprobado para poder publicar sus inmuebles.');
      if (btn) { btn.disabled = false; btn.textContent = 'Publicar Inmueble'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Publicando...'; }

    const title    = document.getElementById('prop-title')?.value.trim();
    const province = document.getElementById('prop-province')?.value || 'Guayas';
    const city     = document.getElementById('prop-city')?.value.trim() || '';
    const price    = parseInt(document.getElementById('prop-price')?.value);
    const rooms    = parseInt(document.getElementById('prop-rooms')?.value);
    const sector   = document.getElementById('prop-location')?.value.trim();
    const desc     = document.getElementById('prop-desc')?.value.trim();
    const amenities = [...document.querySelectorAll('.form-amenity:checked')].map(cb => cb.value);

    const fullLocation = city ? `${sector}, ${city}, ${province}` : `${sector}, ${province}`;

    // Subir hasta 5 imágenes a Supabase Storage
    let imgUrls = [];
    const files = window._pendingFiles || [];
    for (const file of files.slice(0, 5)) {
      const ext  = file.name.split('.').pop().toLowerCase();
      const path = `${CURRENT_USER.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await db.storage.from('homii-images').upload(path, file);
      if (!upErr) {
        const { data: { publicUrl } } = db.storage.from('homii-images').getPublicUrl(path);
        imgUrls.push(publicUrl);
      }
    }

    const { error } = await db.from('properties').insert({
      title,
      description: desc || '',
      price,
      rooms,
      bathrooms: 1,
      province,
      city,
      location: fullLocation,
      maps_query: fullLocation,
      distance_to_campus: 0.5,
      university_certified: false,
      is_verified: false,
      status: 'pending_verification',
      amenities: amenities.length ? amenities : [],
      landlord_id: CURRENT_USER.id,
      landlord_name: CURRENT_PROFILE?.name || 'Propietario',
      landlord_email: CURRENT_USER.email,
      rating_avg: 5.0,
      rating_count: 0,
      featured: false,
      images: imgUrls,
      is_demo: false,
      reviews: []
    });

    if (btn) { btn.disabled = false; btn.textContent = 'Publicar Inmueble'; }

    if (error) { alert('Error al registrar inmueble: ' + error.message); return; }

    document.getElementById('publish-form')?.reset();
    window._pendingFiles = [];
    const thumbsEl = document.getElementById('img-thumbs'); if (thumbsEl) thumbsEl.innerHTML = '';
    
    addNotif('Inmueble Registrado', `"${title}" ha quedado en revisión por el Administrador.`);
    renderLandlordPanel();
    alert('Inmueble registrado correctamente.\n\nPara que la propiedad aparezca publicada en el buscador público de arriendos, presione el botón "Pedir verificación al Administrador" en su panel para que el equipo apruebe su publicación.');
  });
}

function previewImages(e) {
  const newFiles = Array.from(e.target.files || []);
  window._pendingFiles = window._pendingFiles || [];
  
  // Acumular nuevas fotos con las existentes hasta un máximo estricto de 5
  window._pendingFiles = [...window._pendingFiles, ...newFiles].slice(0, 5);

  const thumbs = document.getElementById('img-thumbs');
  if (!thumbs) return;
  thumbs.innerHTML = window._pendingFiles.map((f, i) => `
    <div class="img-thumb" style="position:relative; width:65px; height:65px; border-radius:var(--radius-sm); overflow:hidden; border:1px solid var(--border);">
      <img src="${URL.createObjectURL(f)}" alt="Foto ${i+1}" style="width:100%; height:100%; object-fit:cover;">
      <button type="button" class="img-thumb-del" onclick="removeImg(${i})" style="position:absolute; top:2px; right:2px; background:rgba(220,38,38,0.85); color:white; border:none; border-radius:50%; width:18px; height:18px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">&times;</button>
    </div>`).join('');

  if (e.target) e.target.value = '';
}

window.removeImg = function(i) {
  window._pendingFiles = window._pendingFiles || [];
  window._pendingFiles.splice(i, 1);
  const thumbs = document.getElementById('img-thumbs');
  if (thumbs) {
    thumbs.innerHTML = window._pendingFiles.map((f, idx) => `
      <div class="img-thumb" style="position:relative; width:65px; height:65px; border-radius:var(--radius-sm); overflow:hidden; border:1px solid var(--border);">
        <img src="${URL.createObjectURL(f)}" alt="Foto ${idx+1}" style="width:100%; height:100%; object-fit:cover;">
        <button type="button" class="img-thumb-del" onclick="removeImg(${idx})" style="position:absolute; top:2px; right:2px; background:rgba(220,38,38,0.85); color:white; border:none; border-radius:50%; width:18px; height:18px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">&times;</button>
      </div>`).join('');
  }
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
    .update({ university_certified: true, is_verified: true, status: 'available', certification_type: isPucemAdmin ? 'pucem' : 'standard', verification_report: report })
    .eq('id', id)
    .select();

  // Fallback: si Supabase no reconoce certification_type en el schema cache, reintentar sin ella
  if (res.error && (res.error.message?.includes('Could not find') || res.error.code === 'PGRST204')) {
    res = await db.from('properties')
      .update({ university_certified: true, is_verified: true, status: 'available', verification_report: report })
      .eq('id', id)
      .select();
  }

  if (res.error) {
    alert('Error al certificar la propiedad: ' + res.error.message);
    console.error('Certify error:', res.error);
    return;
  }

  const propTitle = res.data?.[0]?.title || 'El inmueble';
  addNotif('Inmueble Aprobado', `"${propTitle}" ha sido verificado y publicado en el buscador.`);
  alert(`✓ Inmueble "${propTitle}" verificado y publicado exitosamente en el buscador público de arriendos.`);
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
window.openAuthRegister           = openAuthRegister;
window.closeAuth                  = closeAuth;
window.switchPanel                = switchPanel;
window.doLogin                    = doLogin;
window.doRegister                 = doRegister;
window.logout                     = logout;
window.filterListings             = filterListings;
window.filterRoomies              = filterRoomies;
window.closeActivation            = function() { document.getElementById('activation-popup')?.classList.remove('open'); };

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
    if (profile.is_premium) {
      avEl.classList.add('premium-avatar');
    } else {
      avEl.classList.remove('premium-avatar');
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
        if (avEl) {
          if (profile.is_premium) {
            avEl.classList.add('premium-avatar');
          } else {
            avEl.classList.remove('premium-avatar');
          }
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

// ============================================================
// SISTEMA DE LISTA DE ESPERA Y ESTADOS DE PROPIEDAD
// ============================================================

window.joinWaitingList = async function(propId) {
  if (!propId || typeof propId !== 'string' || propId.includes('${') || propId === 'undefined') {
    propId = openPropertyData?.id;
  }

  if (!CURRENT_USER) {
    openAuth();
    return;
  }

  if (CURRENT_PROFILE?.role === 'student' && CURRENT_PROFILE?.is_verified === 'pending') {
    alert('⚠️ Verificación Biométrica Pendiente\n\nTu registro está siendo revisado por el equipo de Homii. La asignación y reserva de propiedades estarán habilitadas tan pronto como tu cuenta sea aprobada.');
    return;
  }

  // Buscar la propiedad en APP.properties o Supabase
  let prop = APP.properties.find(p => p.id === propId) || openPropertyData;
  if (!prop && propId) {
    const { data } = await db.from('properties').select('*').eq('id', propId).maybeSingle();
    prop = data;
  }
  if (!prop) { alert('No se encontró la propiedad.'); return; }

  // Cargar lista de espera existente de metadatos locales o columna DB
  const propMetaStr = localStorage.getItem('homii_prop_meta_' + propId);
  const propMeta = propMetaStr ? JSON.parse(propMetaStr) : { status: prop.status || 'available', waiting_list: prop.waiting_list || [] };

  const isAlreadyInList = propMeta.waiting_list.some(u => u.user_id === CURRENT_USER.id);
  if (isAlreadyInList) {
    alert('Ya estás registrado en la lista de espera de esta propiedad.');
    return;
  }

  const isPremium = CURRENT_PROFILE?.is_premium || false;

  const newEntry = {
    user_id: CURRENT_USER.id,
    name: CURRENT_PROFILE?.name || CURRENT_USER.email,
    cedula: CURRENT_PROFILE?.cedula || '1310000000',
    phone: CURRENT_PROFILE?.phone || '0990000000',
    avatar_color: CURRENT_PROFILE?.avatar_color || '#1a56db',
    timestamp: new Date().toISOString(),
    is_premium: isPremium
  };

  propMeta.waiting_list.push(newEntry);
  propMeta.status = 'in_progress'; // Cambia el estado a En Asignación

  // Guardar en local storage y si es posible en Supabase
  localStorage.setItem('homii_prop_meta_' + propId, JSON.stringify(propMeta));
  await db.from('properties').update({ status: 'in_progress', waiting_list: propMeta.waiting_list }).eq('id', propId).catch(() => {});

  // Actualizar objeto en memoria
  prop.status = 'in_progress';
  prop.waiting_list = propMeta.waiting_list;

  addNotif('Solicitud de Reserva', 'Has solicitado reservar la propiedad ' + prop.title + '.');
  alert('¡Solicitud de reserva enviada con éxito!\n\nEl propietario ha recibido tu solicitud y se pondrá en contacto contigo.');
  
  if (openPropertyData && openPropertyData.id === propId) {
    openPropertyData.status = 'in_progress';
    openPropertyData.waiting_list = propMeta.waiting_list;
    openPropertyModal(openPropertyData);
  }
};

window.leaveWaitingList = async function(propId) {
  if (!CURRENT_USER) return;
  const propMetaStr = localStorage.getItem('homii_prop_meta_' + propId);
  let propMeta = propMetaStr ? JSON.parse(propMetaStr) : { status: 'available', waiting_list: [] };

  propMeta.waiting_list = propMeta.waiting_list.filter(u => u.user_id !== CURRENT_USER.id);
  if (propMeta.waiting_list.length === 0) propMeta.status = 'available';

  localStorage.setItem('homii_prop_meta_' + propId, JSON.stringify(propMeta));
  await db.from('properties').update({ status: propMeta.status, waiting_list: propMeta.waiting_list }).eq('id', propId).catch(() => {});

  alert('Has cancelado tu solicitud de reserva.');
  if (openPropertyData && openPropertyData.id === propId) {
    openPropertyData.status = propMeta.status;
    openPropertyData.waiting_list = propMeta.waiting_list;
    openPropertyModal(openPropertyData);
  }
};

// ============================================================
// HOMII PREMIUM & SIMULADOR DE PAGO
// ============================================================

let selectedPremiumTier = 'lifetime';

window.openPremiumModal = function() {
  const modal = document.getElementById('premium-modal');
  if (modal) modal.classList.add('open');
};

window.closePremiumModal = function() {
  const modal = document.getElementById('premium-modal');
  if (modal) modal.classList.remove('open');
};

window.selectPremiumPlan = function(tier) {
  selectedPremiumTier = tier;
  const planAnnual = document.getElementById('plan-annual');
  const planLifetime = document.getElementById('plan-lifetime');

  if (tier === 'annual') {
    if (planAnnual) { planAnnual.style.border = '2px solid var(--blue)'; planAnnual.style.background = '#eff6ff'; }
    if (planLifetime) { planLifetime.style.border = '2px solid var(--border)'; planLifetime.style.background = 'var(--bg-section)'; }
  } else {
    if (planLifetime) { planLifetime.style.border = '2px solid var(--blue)'; planLifetime.style.background = '#eff6ff'; }
    if (planAnnual) { planAnnual.style.border = '2px solid var(--border)'; planAnnual.style.background = 'var(--bg-section)'; }
  }
};

window.processPremiumPayment = async function() {
  if (!CURRENT_USER) {
    closePremiumModal();
    openAuth();
    return;
  }

  const btn = document.getElementById('btn-pay-premium');
  if (btn) { btn.disabled = true; btn.textContent = 'Procesando Pago Seguro...'; }

  setTimeout(async () => {
    if (btn) { btn.disabled = false; btn.textContent = '💳 Activar Homii Premium Ahora'; }

    // Actualizar metadatos y perfil
    if (CURRENT_PROFILE) {
      CURRENT_PROFILE.is_premium = true;
      CURRENT_PROFILE.premium_tier = selectedPremiumTier;
    }

    const profileMeta = JSON.parse(localStorage.getItem('homii_profile_meta_' + CURRENT_USER.id) || '{}');
    profileMeta.is_premium = true;
    profileMeta.premium_tier = selectedPremiumTier;
    localStorage.setItem('homii_profile_meta_' + CURRENT_USER.id, JSON.stringify(profileMeta));

    await db.auth.updateUser({ data: { is_premium: true, premium_tier: selectedPremiumTier } }).catch(() => {});
    await db.from('profiles').update({ is_premium: true, premium_tier: selectedPremiumTier }).eq('id', CURRENT_USER.id).catch(() => {});

    closePremiumModal();
    addNotif('👑 Homii Premium Activado', '¡Felicidades! Ahora cuentas con Prioridad Nivel 1 en arriendos.');
    alert('🎉 ¡Pago procesado exitosamente!\n\nTu cuenta ahora es Homii Premium (Prioridad Nivel 1). Tus solicitudes en listas de espera serán atendidas primero.');
  }, 1200);
};

// ============================================================
// GENERADOR DE CONTRATOS Y ALQUILER
// ============================================================

window.openContractModal = function(propId) {
  if (!propId || typeof propId !== 'string' || propId.includes('${') || propId === 'undefined') {
    propId = openPropertyData?.id;
  }

  const prop = APP.properties.find(p => p.id === propId) || openPropertyData;
  if (!prop) { alert('No se encontró el inmueble.'); return; }

  const modal = document.getElementById('contract-modal');
  const titleEl = document.getElementById('contract-prop-title');
  const propIdInp = document.getElementById('contract-prop-id');
  const priceInp = document.getElementById('contract-price');
  const selectTenant = document.getElementById('contract-tenant-select');

  if (titleEl) titleEl.textContent = 'Inmueble: ' + prop.title + ' ($' + prop.price + '/mes)';
  if (propIdInp) propIdInp.value = prop.id;
  if (priceInp) priceInp.value = prop.price;

  // Cargar lista de espera cargada
  const propMetaStr = localStorage.getItem('homii_prop_meta_' + prop.id);
  const propMeta = propMetaStr ? JSON.parse(propMetaStr) : { status: prop.status || 'available', waiting_list: prop.waiting_list || [] };
  
  // Ordenar lista de espera: Premium primero, luego por tiempo de llegada
  const sortedList = (propMeta.waiting_list || []).sort((a, b) => {
    if (a.is_premium && !b.is_premium) return -1;
    if (!a.is_premium && b.is_premium) return 1;
    return new Date(a.timestamp) - new Date(b.timestamp);
  });

  if (selectTenant) {
    if (sortedList.length === 0) {
      selectTenant.innerHTML = '<option value="">No hay usuarios en lista de espera (Inquilino directo)</option>';
    } else {
      selectTenant.innerHTML = sortedList.map((u, i) => `
        <option value="${u.user_id}">
          ${i + 1}. ${u.name} ${u.is_premium ? '👑 [Prioridad 1 Premium]' : ''} (Cédula: ${u.cedula || 'Verificada'})
        </option>
      `).join('');
    }
  }

  if (modal) modal.classList.add('open');
};

window.closeContractModal = function() {
  const modal = document.getElementById('contract-modal');
  if (modal) modal.classList.remove('open');
};

window.generateAndCompleteRent = async function() {
  const propId = document.getElementById('contract-prop-id')?.value;
  const price = document.getElementById('contract-price')?.value;
  const deposit = document.getElementById('contract-deposit')?.value;
  const months = document.getElementById('contract-months')?.value;
  const startDate = document.getElementById('contract-start-date')?.value;
  const tenantSelect = document.getElementById('contract-tenant-select');
  const tenantId = tenantSelect?.value;

  if (!propId || !price || !deposit || !startDate) {
    alert('Por favor complete todos los campos obligatorios del contrato.');
    return;
  }

  const btn = document.getElementById('btn-generate-contract');
  if (btn) { btn.disabled = true; btn.textContent = 'Generando Contrato...'; }

  setTimeout(async () => {
    if (btn) { btn.disabled = false; btn.textContent = '🔐 Generar Contrato y Marcar Inmueble como Alquilado'; }

    const propMetaStr = localStorage.getItem('homii_prop_meta_' + propId);
    const propMeta = propMetaStr ? JSON.parse(propMetaStr) : { status: 'available', waiting_list: [] };
    propMeta.status = 'assigned'; // Cambiar a Alquilado
    localStorage.setItem('homii_prop_meta_' + propId, JSON.stringify(propMeta));

    // Intentar actualizar la base de datos Supabase
    await db.from('properties').update({ status: 'assigned' }).eq('id', propId).catch(() => {});

    // Guardar el contrato en local y Supabase
    const contractObj = {
      id: 'contract_' + Date.now(),
      property_id: propId,
      landlord_id: CURRENT_USER?.id,
      tenant_id: tenantId || 'tenant_direct',
      price: parseFloat(price),
      deposit: parseFloat(deposit),
      months: parseInt(months),
      start_date: startDate,
      created_at: new Date().toISOString()
    };

    const contracts = JSON.parse(localStorage.getItem('homii_contracts') || '[]');
    contracts.push(contractObj);
    localStorage.setItem('homii_contracts', JSON.stringify(contracts));

    await db.from('contracts').insert(contractObj).catch(() => {});

    closeContractModal();
    if (openPropertyData && openPropertyData.id === propId) {
      closePropertyModal();
    }

    addNotif('Contrato Formalizado', 'La propiedad ha sido dada de baja y registrada oficialmente como Alquilada.');
    alert('✅ Contrato de Arrendamiento Generado Exitosamente.\n\nEl inmueble ha sido dado de baja de las búsquedas públicas y registrado en el historial de Homii.');

    // Abrir automáticamente la evaluación por estrellas post-contrato
    const propTitle = document.getElementById('contract-prop-title')?.textContent || 'el inmueble';
    openRatingModal('property', propId, propTitle);

    if (APP.currentView === 'landlord') {
      renderLandlordDashboard();
    }
  }, 1000);
};

// ============================================================
// PANEL DE ADMINISTRACIÓN GLOBAL DE HOMII & BIOMETRÍA MANUAL
// ============================================================

window.tempReuploadBiometricData = { selfie: '', front: '', back: '' };

window.handleReuploadFileChange = function(type) {
  let inputId = 're-selfie';
  if (type === 'front') inputId = 're-idcard-front';
  if (type === 'back') inputId = 're-idcard-back';
  
  const file = document.getElementById(inputId)?.files?.[0];
  if (file) {
    const r = new FileReader();
    r.onload = ev => {
      window.tempReuploadBiometricData[type] = ev.target.result;
    };
    r.readAsDataURL(file);
  }
};

window.reuploadBiometrics = async function() {
  if (!CURRENT_USER) return;
  
  const selfieFile = document.getElementById('re-selfie')?.files?.[0];
  const frontFile = document.getElementById('re-idcard-front')?.files?.[0];
  const backFile = document.getElementById('re-idcard-back')?.files?.[0];

  if (!selfieFile || !frontFile || !backFile) {
    alert('Por favor selecciona las tres fotos (Selfie, Frente y Reverso).');
    return;
  }

  const localMetaStr = localStorage.getItem('homii_profile_meta_' + CURRENT_USER.id);
  const localMeta = localMetaStr ? JSON.parse(localMetaStr) : {};
  
  localMeta.is_verified = 'pending';
  localMeta.rejection_reason = '';
  localMeta.selfie_url = window.tempReuploadBiometricData.selfie || localMeta.selfie_url || 'selfie_placeholder.png';
  localMeta.id_card_front_url = window.tempReuploadBiometricData.front || localMeta.id_card_front_url || 'idcard_front_placeholder.png';
  localMeta.id_card_back_url = window.tempReuploadBiometricData.back || localMeta.id_card_back_url || 'idcard_back_placeholder.png';

  localStorage.setItem('homii_profile_meta_' + CURRENT_USER.id, JSON.stringify(localMeta));

  // Actualizar Supabase con las fotos re-subidas
  await db.from('profiles').update({
    is_verified: 'pending',
    rejection_reason: '',
    selfie_url: localMeta.selfie_url,
    id_card_front_url: localMeta.id_card_front_url,
    id_card_back_url: localMeta.id_card_back_url
  }).eq('id', CURRENT_USER.id).catch(() => {});
  
  CURRENT_PROFILE.is_verified = 'pending';
  CURRENT_PROFILE.rejection_reason = '';

  alert('¡Documentos re-enviados con éxito!\n\nTu solicitud de verificación volverá a ser revisada por el Administrador de Homii.');
  
  // Recargar vistas
  loadUserProfile(CURRENT_USER);
  renderProfileView();
};

window.zoomBiometricImage = function(src, title) {
  const modal = document.getElementById('biometric-zoom-modal');
  const img = document.getElementById('zoom-modal-image');
  const titleEl = document.getElementById('zoom-modal-title');
  if (modal && img && titleEl) {
    img.src = src;
    titleEl.textContent = title;
    modal.classList.add('open');
  }
};

window.closeBiometricZoomModal = function() {
  const modal = document.getElementById('biometric-zoom-modal');
  if (modal) modal.classList.remove('open');
};

window.renderAdminPanel = async function() {
  const listEl        = document.getElementById('admin-verification-list');
  const countEl       = document.getElementById('admin-request-count');
  const pendingStat   = document.getElementById('admin-stat-pending');
  const studentsStat  = document.getElementById('admin-stat-students');
  const landlordsStat = document.getElementById('admin-stat-landlords');
  const premiumStat   = document.getElementById('admin-stat-premium');
  if (!listEl) return;

  let pendingList = [];

  // 1. Consultar base de datos real (Supabase)
  try {
    const { data: allProfiles, error: fetchErr } = await db.from('profiles').select('*');
    if (fetchErr) console.warn('Error al cargar perfiles para admin:', fetchErr.message);

    if (allProfiles && allProfiles.length > 0) {
      const students  = allProfiles.filter(p => p.role === 'student');
      const landlords = allProfiles.filter(p => p.role === 'landlord');
      const premium   = allProfiles.filter(p => p.is_premium || p.premium_tier === 'anual' || p.premium_tier === 'por-vida');

      if (studentsStat)  studentsStat.textContent  = students.length;
      if (landlordsStat) landlordsStat.textContent = landlords.length;
      if (premiumStat)   premiumStat.textContent   = premium.length;

      // Filtrar todos los usuarios (estudiantes y propietarios) con estado 'pending' o sin verificar
      const pendingDb = allProfiles.filter(p => p.role !== 'university' && (p.is_verified === 'pending' || p.is_verified === false || p.is_verified === 'unverified' || (!p.is_verified && p.role)));
      pendingList = pendingDb.map(u => {
        const metaStr = localStorage.getItem('homii_profile_meta_' + u.id);
        const meta    = metaStr ? JSON.parse(metaStr) : {};
        const selfie  = (u.selfie_url && u.selfie_url !== 'selfie_captured') ? u.selfie_url : (meta.selfie_url || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=60');
        const front   = (u.id_card_front_url && u.id_card_front_url !== 'idcard_front_captured') ? u.id_card_front_url : (meta.id_card_front_url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=60');
        const back    = (u.id_card_back_url && u.id_card_back_url !== 'idcard_back_captured') ? u.id_card_back_url : (meta.id_card_back_url || 'https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=400&auto=format&fit=crop&q=60');

        return {
          id: u.id,
          name: u.name || meta.name || 'Usuario Homii',
          email: u.email || 'correo@ejemplo.com',
          role: u.role || 'student',
          phone: u.phone || 'No registrado',
          cedula: u.cedula || meta.cedula || 'No especificada',
          selfie_url: selfie,
          id_card_front_url: front,
          id_card_back_url: back
        };
      });
    }
  } catch (e) {
    console.warn('Error en renderAdminPanel:', e);
  }

  // 2. Escanear localStorage por si hay solicitudes locales sin sincronizar
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('homii_profile_meta_')) {
      const uid  = key.replace('homii_profile_meta_', '');
      const meta = JSON.parse(localStorage.getItem(key));
      if (meta && meta.is_verified === 'pending') {
        const extraStr = localStorage.getItem('homii_extra_' + uid);
        const extra    = extraStr ? JSON.parse(extraStr) : {};
        if (!pendingList.some(u => u.id === uid)) {
          pendingList.push({
            id: uid,
            name: extra.name || 'Estudiante Local',
            email: 'correo_local@ejemplo.com',
            phone: extra.phone || '0990000000',
            cedula: meta.cedula || '1310000000',
            selfie_url: meta.selfie_url || 'selfie_placeholder.png',
            id_card_front_url: meta.id_card_front_url || 'idcard_front_placeholder.png',
            id_card_back_url: meta.id_card_back_url || 'idcard_back_placeholder.png'
          });
        }
      }
    }
  }

  // 3. Renderizar métricas de pendientes
  if (countEl) countEl.textContent = pendingList.length + ' Pendientes';
  if (pendingStat) pendingStat.textContent = pendingList.length;

  // 4. Si no hay solicitudes pendientes, mostrar estado limpio sin datos de prueba
  if (pendingList.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 3rem 1.5rem; text-align: center; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
        <h5 style="margin: 0; font-size: 1.1rem; color: var(--blue-dark); font-weight: 700;">No hay solicitudes de verificación pendientes</h5>
        <p style="margin: 0.4rem 0 0; font-size: 0.85rem; color: var(--text-sec);">Todas las cuentas de estudiantes están verificadas o no hay nuevas solicitudes en este momento.</p>
      </div>
    `;
    return;
  }

  // 5. Renderizar lista de solicitudes pendientes reales
  listEl.innerHTML = pendingList.map(u => `
    <div style="padding: 1.5rem; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 1rem; background: var(--bg-white);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
        <div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <h5 style="margin:0; font-size:1rem; color:var(--text); font-weight:600;">${u.name}</h5>
            <span class="badge ${u.role === 'landlord' ? 'badge-amber' : 'badge-blue'}" style="font-size:0.65rem;">${u.role === 'landlord' ? 'Propietario' : 'Estudiante'}</span>
            <span class="badge badge-gray" style="font-size:0.65rem;">Pendiente de Verificación</span>
          </div>
          <p style="margin:0.2rem 0 0; font-size:0.8rem; color:var(--text-muted);">
            Cédula: <strong>${u.cedula}</strong> &middot; Email: ${u.email} &middot; Tel: ${u.phone}
          </p>
        </div>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-sm" style="background:#10b981; color:white; border:none; padding:0.4rem 0.85rem; border-radius:var(--radius-md); font-weight:600; cursor:pointer;" onclick="window.approveUserBiometrics('${u.id}', false)">✓ Aprobar</button>
          <button class="btn btn-sm" style="background:#ef4444; color:white; border:none; padding:0.4rem 0.85rem; border-radius:var(--radius-md); font-weight:600; cursor:pointer;" onclick="window.rejectUserBiometrics('${u.id}', false)">✗ Rechazar</button>
        </div>
      </div>
      
      <!-- Documentos -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; background: var(--bg-section); padding: 0.85rem; border-radius: var(--radius-lg); border: 1px solid var(--border);">
        <div>
          <span style="font-size:0.7rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:0.35rem; text-transform:uppercase;">Selfie Rostro</span>
          <div style="width:100%; height:120px; background:#e2e8f0; border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="window.zoomBiometricImage('${u.selfie_url}', 'Selfie - ${escAttr(u.name)}')">
            <img src="${u.selfie_url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=60'">
          </div>
        </div>
        <div>
          <span style="font-size:0.7rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:0.35rem; text-transform:uppercase;">Cédula Frente</span>
          <div style="width:100%; height:120px; background:#e2e8f0; border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="window.zoomBiometricImage('${u.id_card_front_url}', 'Cédula Frente - ${escAttr(u.name)}')">
            <img src="${u.id_card_front_url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=60'">
          </div>
        </div>
        <div>
          <span style="font-size:0.7rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:0.35rem; text-transform:uppercase;">Cédula Reverso</span>
          <div style="width:100%; height:120px; background:#e2e8f0; border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="window.zoomBiometricImage('${u.id_card_back_url}', 'Cédula Reverso - ${escAttr(u.name)}')">
            <img src="${u.id_card_back_url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=400&auto=format&fit=crop&q=60'">
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // 6. Cargar y renderizar solicitudes de verificación de inmuebles
  const propListEl  = document.getElementById('admin-property-verification-list');
  const propCountEl = document.getElementById('admin-prop-request-count');

  if (propListEl) {
    try {
      const { data: pendingProps, error: propErr } = await db.from('properties')
        .select('*');

      const list = (pendingProps || []).filter(p => !p.is_demo && (!p.university_certified || !p.is_verified || p.status === 'pending_verification' || p.verification_requested));

      if (propCountEl) propCountEl.textContent = list.length + ' Inmuebles Pendientes';

      if (list.length === 0) {
        propListEl.innerHTML = `
          <div style="padding: 2.5rem 1.5rem; text-align: center; color: var(--text-muted);">
            <h5 style="margin: 0; font-size: 1rem; color: var(--blue-dark); font-weight: 700;">No hay inmuebles pendientes de aprobación</h5>
            <p style="margin: 0.3rem 0 0; font-size: 0.83rem; color: var(--text-sec);">Todas las propiedades están verificadas o no hay solicitudes pendientes en este momento.</p>
          </div>
        `;
      } else {
        propListEl.innerHTML = list.map(p => `
          <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; background: var(--bg-white);">
            <div>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <h5 style="margin:0; font-size:0.95rem; color:var(--text); font-weight:600;">${p.title}</h5>
                <span class="badge badge-amber" style="font-size:0.65rem;">Pendiente de Aprobación</span>
              </div>
              <p style="margin:0.25rem 0 0; font-size:0.8rem; color:var(--text-muted);">
                Propietario: <strong>${p.landlord_name || p.landlord_email || 'Arrendador'}</strong> &middot; Ubicación: ${p.location || 'Ecuador'} &middot; Precio: <strong>$${p.price}/mes</strong>
              </p>
            </div>
            <div style="display:flex; gap:0.5rem;">
              <button class="btn btn-sm" style="background:#10b981; color:white; border:none; padding:0.45rem 0.9rem; border-radius:var(--radius-md); font-weight:600; cursor:pointer;" onclick="window.approveProperty('${p.id}', '${escAttr(p.title)}')">✓ Aprobar y Publicar Inmueble</button>
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      console.warn('Error al cargar propiedades pendientes para admin:', err);
    }
  }
};

window.approveProperty = async function(id, title) {
  if (!confirm(`¿Desea aprobar y publicar el inmueble "${title}" en el buscador público?`)) return;

  const report = {
    inspectionDate: new Date().toISOString().split('T')[0],
    certifiedBy: CURRENT_PROFILE?.name || CURRENT_USER?.email || 'Administrador Homii',
    certificationType: 'Verificación Estándar Homii',
    certType: 'standard',
    standards: {
      waterPressure: 'Aprobado — Buena presión (42 PSI)',
      internetSpeed: 'Aprobado — Fibra Óptica 300 Mbps',
      fireSafety:    'Aprobado — Inspeccionado',
      structure:     'Aprobado — Estructura segura'
    }
  };

  // 1. Intentar actualizar con todos los campos
  let res = await db.from('properties')
    .update({
      university_certified: true,
      is_verified: true,
      status: 'available',
      verification_requested: false,
      verification_report: report
    })
    .eq('id', id)
    .select();

  // 2. Fallback seguro si el schema cache de Supabase aún no refresca alguna columna nueva
  if (res.error && (res.error.message?.includes('Could not find') || res.error.code === 'PGRST204')) {
    res = await db.from('properties')
      .update({
        university_certified: true,
        status: 'available',
        verification_requested: false
      })
      .eq('id', id)
      .select();
  }

  if (res.error) {
    alert('Error al aprobar propiedad: ' + res.error.message);
    console.error('Approve property error:', res.error);
    return;
  }

  addNotif('Inmueble Aprobado', `"${title}" ha sido verificado y publicado en el buscador.`);
  alert(`✓ Inmueble "${title}" verificado y publicado exitosamente. Ya es visible en el buscador público de arriendos.`);

  renderAdminPanel();
  if (typeof renderUniPanel === 'function') renderUniPanel();
  filterListings();
};

window.approveUserBiometrics = async function(userId, isDemo) {
  if (isDemo) {
    alert('✓ Demo Aprobada\n\nHas simulado la aprobación de esta cuenta de ejemplo.');
    document.getElementById('admin-verification-list').innerHTML = '<p style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.85rem;">Todas las solicitudes han sido gestionadas.</p>';
    if (document.getElementById('admin-stat-pending')) document.getElementById('admin-stat-pending').textContent = '0';
    if (document.getElementById('admin-request-count')) document.getElementById('admin-request-count').textContent = '0 Pendientes';
    return;
  }

  if (!confirm('¿Confirma que desea aprobar la verificación de identidad de este usuario?')) return;

  // 1. Intentar actualizar con cadena 'approved'
  let { error: strErr } = await db.from('profiles').update({ is_verified: 'approved', rejection_reason: '' }).eq('id', userId);

  // 2. Si falla por tipo de columna boolean, reintentar con boolean true
  if (strErr) {
    console.warn('String is_verified update warning, retrying with boolean true:', strErr.message);
    const { error: boolErr } = await db.from('profiles').update({ is_verified: true, rejection_reason: '' }).eq('id', userId);
    if (boolErr) console.error('Boolean is_verified update error:', boolErr.message);
  }

  // 3. Actualizar metadatos locales de respaldo
  const metaStr = localStorage.getItem('homii_profile_meta_' + userId);
  if (metaStr) {
    const meta = JSON.parse(metaStr);
    meta.is_verified = 'approved';
    meta.rejection_reason = '';
    localStorage.setItem('homii_profile_meta_' + userId, JSON.stringify(meta));
  }

  if (CURRENT_USER && CURRENT_USER.id === userId && CURRENT_PROFILE) {
    CURRENT_PROFILE.is_verified = 'approved';
  }

  addNotif('Cuenta Aprobada', 'La cuenta ha sido verificada exitosamente.');
  alert('🚀 Cuenta Aprobada Exitosamente.\n\nEl usuario ha sido verificado y ahora tiene acceso completo a la plataforma para publicar e interactuar.');
  
  renderAdminPanel();
};

window.rejectUserBiometrics = async function(userId, isDemo) {
  const reason = prompt('Ingrese el motivo de rechazo de la verificación:', 'Fotos de la cédula borrosas o no legibles.');
  if (reason === null) return;
  if (reason.trim() === '') {
    alert('Debes ingresar un motivo de rechazo.');
    return;
  }

  if (isDemo) {
    alert('✗ Demo Rechazada\n\nHas simulado el rechazo de esta cuenta de ejemplo.');
    document.getElementById('admin-verification-list').innerHTML = '<p style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.85rem;">Todas las solicitudes han sido gestionadas.</p>';
    if (document.getElementById('admin-stat-pending')) document.getElementById('admin-stat-pending').textContent = '0';
    if (document.getElementById('admin-request-count')) document.getElementById('admin-request-count').textContent = '0 Pendientes';
    return;
  }

  let { error: strErr } = await db.from('profiles').update({ is_verified: 'rejected', rejection_reason: reason.trim() }).eq('id', userId);
  if (strErr) {
    await db.from('profiles').update({ is_verified: false, rejection_reason: reason.trim() }).eq('id', userId).catch(() => {});
  }

  const metaStr = localStorage.getItem('homii_profile_meta_' + userId);
  if (metaStr) {
    const meta = JSON.parse(metaStr); 
    meta.is_verified = 'rejected';
    meta.rejection_reason = reason.trim();
    localStorage.setItem('homii_profile_meta_' + userId, JSON.stringify(meta));
  }

  alert('❌ Cuenta Rechazada.\n\nSe ha guardado el motivo. El usuario será notificado al iniciar sesión.');
  
  renderAdminPanel();
};

// Exportar al scope global para llamadas desde HTML
window.openPublicProfile       = openPublicProfile;
window.closePublicProfileModal = closePublicProfileModal;

