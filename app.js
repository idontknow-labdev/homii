// ============================================================
// --- CUENTAS POR DEFECTO ---
const DEFAULT_ACCOUNTS = [
  {
    id: 1,
    name: "Administrador PUCEM",
    email: "admin@pucem.edu.ec",
    password: "pucem2026",
    role: "university",
    avatar: "A",
    institution: "Pontificia Universidad Católica de Manabí"
  },
  {
    id: 2,
    name: "Carlos Ruiz",
    email: "propietario@homii.ec",
    password: "homii123",
    role: "landlord",
    avatar: "C",
    phone: "0991234567"
  }
];

// --- PROPIEDADES DE DEMOSTRACIÓN ---
const DEFAULT_PROPERTIES = [
  {
    id: 1,
    title: "Habitación Estudiantil — Sector PUCEM Norte",
    description: "Habitación amoblada a tres minutos caminando del campus PUCEM. Ambiente tranquilo, escritorio amplio, armario empotrado, ventilación natural y acceso a internet de fibra óptica. El propietario reside en la misma casa, lo que garantiza atención oportuna ante cualquier eventualidad.",
    price: 180,
    rooms: 1, bathrooms: 1,
    location: "Calle Córdova y Av. Universitaria, Portoviejo, Manabí",
    mapsQuery: "Pontificia Universidad Católica de Manabí, Portoviejo",
    distanceToCampus: 0.3,
    universityCertified: true, universityCertifiedBy: "PUCEM",
    amenities: ["agua", "internet", "electricidad", "amoblado"],
    landlordName: "Carlos Ruiz", landlordEmail: "propietario@homii.ec",
    landlordRating: 4.9, propertyRating: 4.8, featured: true, images: [],
    verificationReport: {
      inspectionDate: "2026-05-10",
      standards: { waterPressure: "Excelente (48 PSI)", internetSpeed: "Fibra Óptica 300 Mbps", fireSafety: "Aprobado — Extintor y Detector de Humo", structure: "Aprobado — Sin fisuras ni humedad" }
    },
    reviews: [
      { author: "Mateo Solórzano (Estudiante PUCEM)", rating: 5, text: "Ubicación insuperable. El internet nunca falla, perfecto para clases virtuales y entregas académicas." },
      { author: "Sofía García (Estudiante PUCEM)", rating: 4, text: "Muy cómodo y tranquilo. El propietario es sumamente atento." }
    ]
  },
  {
    id: 2,
    title: "Apartamento Dos Habitaciones — Cdla. Los Ceibos",
    description: "Espacioso apartamento en la ciudadela Los Ceibos, bien conectada con el centro de Portoviejo y el campus PUCEM. Cocina equipada, lavandería independiente, sala-comedor amplia y balcón ventilado. Ideal para profesionales o estudiantes de posgrado.",
    price: 380,
    rooms: 2, bathrooms: 2,
    location: "Av. 5 de Junio y Calle 13, Cdla. Los Ceibos, Portoviejo",
    mapsQuery: "Cdla. Los Ceibos, Portoviejo, Manabí, Ecuador",
    distanceToCampus: 1.8,
    universityCertified: false, universityCertifiedBy: null,
    amenities: ["internet", "mascotas", "lavanderia"],
    landlordName: "Sofía Mendoza", landlordEmail: "sofia.mendoza@gmail.com",
    landlordRating: 4.7, propertyRating: 4.6, featured: false, images: [],
    verificationReport: null,
    reviews: [{ author: "Juan Pereira (Inquilino)", rating: 5, text: "Excelente ventilación y zona segura. Cerca de supermercados y servicios básicos." }]
  },
  {
    id: 3,
    title: "Habitación Universitaria Certificada — La Floresta",
    description: "Habitación individual en casa compartida con otros estudiantes de la PUCEM. Ambiente de estudio colaborativo, cocina y áreas comunes amplias, WiFi de alta velocidad. Propietario con convenio formal con la universidad.",
    price: 150,
    rooms: 1, bathrooms: 1,
    location: "Calle Olmedo y Calle Mejía, Barrio La Floresta, Portoviejo",
    mapsQuery: "Barrio La Floresta, Portoviejo, Manabí, Ecuador",
    distanceToCampus: 0.5,
    universityCertified: true, universityCertifiedBy: "PUCEM",
    amenities: ["agua", "internet", "electricidad", "lavanderia"],
    landlordName: "Manuel Espinoza", landlordEmail: "manuel.espinoza@gmail.com",
    landlordRating: 4.6, propertyRating: 4.5, featured: false, images: [],
    verificationReport: {
      inspectionDate: "2026-06-01",
      standards: { waterPressure: "Buena (35 PSI)", internetSpeed: "Fibra 150 Mbps", fireSafety: "Aprobado — Extintor en pasillo principal", structure: "Aprobado — Inspección civil superada" }
    },
    reviews: [{ author: "Lucía Reyes (Estudiante PUCEM)", rating: 4, text: "Buen ambiente de estudio. Los compañeros de casa son respetuosos." }]
  },
  {
    id: 4,
    title: "Suite Ejecutiva — Centro de Portoviejo",
    description: "Suite amoblada de alta gama en el centro de Portoviejo. Acabados modernos, seguridad las 24 horas y parqueadero privado. Pensada para profesionales o consultores que se instalan temporalmente en Manabí.",
    price: 750,
    rooms: 2, bathrooms: 2,
    location: "Av. Olmedo y Calle Rocafuerte, Centro, Portoviejo",
    mapsQuery: "Centro de Portoviejo, Manabí, Ecuador",
    distanceToCampus: 3.5,
    universityCertified: false, universityCertifiedBy: null,
    amenities: ["internet", "electricidad", "mascotas", "amoblado", "lavanderia"],
    landlordName: "Bienes Raíces Manabí S.A.", landlordEmail: "bienesraices@manabi.com",
    landlordRating: 4.8, propertyRating: 4.9, featured: true, images: [],
    verificationReport: null,
    reviews: [{ author: "Roberto Meza (Gerente Regional)", rating: 5, text: "Atención corporativa impecable. Seguridad y acabados excepcionales." }]
  },
  {
    id: 5,
    title: "Cuarto Económico — Barrio San Marcos",
    description: "Cuarto sencillo, limpio y bien ventilado a minutos de la PUCEM en bus o bicicleta. Servicios básicos incluidos en el precio. Indicado para estudiantes foráneos que buscan optimizar su presupuesto.",
    price: 120,
    rooms: 1, bathrooms: 1,
    location: "Calle Arroyo y Calle Sucre, Barrio San Marcos, Portoviejo",
    mapsQuery: "Barrio San Marcos, Portoviejo, Manabí, Ecuador",
    distanceToCampus: 1.2,
    universityCertified: false, universityCertifiedBy: null,
    amenities: ["agua", "internet"],
    landlordName: "María Gutiérrez", landlordEmail: "maria.g@hotmail.com",
    landlordRating: 4.2, propertyRating: 4.0, featured: false, images: [], verificationReport: null, reviews: []
  },
  {
    id: 6,
    title: "Mini Departamento Amoblado — Av. Universitaria",
    description: "Mini departamento de estreno frente al campus PUCEM. Edificio con sistema de seguridad, área verde compartida y ciclovía en el barrio. A cinco minutos caminando de la Facultad de Ingeniería.",
    price: 280,
    rooms: 1, bathrooms: 1,
    location: "Av. Universitaria 450, Frente a PUCEM, Portoviejo",
    mapsQuery: "Av. Universitaria, Portoviejo, Manabí, Ecuador",
    distanceToCampus: 0.1,
    universityCertified: true, universityCertifiedBy: "PUCEM",
    amenities: ["agua", "internet", "electricidad", "mascotas", "amoblado"],
    landlordName: "Carlos Ruiz", landlordEmail: "propietario@homii.ec",
    landlordRating: 4.9, propertyRating: 4.9, featured: true, images: [],
    verificationReport: {
      inspectionDate: "2026-05-22",
      standards: { waterPressure: "Excelente (44 PSI)", internetSpeed: "Fibra Óptica 400 Mbps", fireSafety: "Aprobado — Aspersores automáticos", structure: "Ecológico Certificado — Aislamiento térmico" }
    },
    reviews: [{ author: "Diego Vinces (Estudiante PUCEM)", rating: 5, text: "El mejor lugar donde he vivido. Las áreas comunes para estudiar en grupo son espectaculares." }]
  },
  {
    id: 7,
    title: "Casa Compartida — Urbanización El Florón",
    description: "Habitación en casa compartida en una de las urbanizaciones más tranquilas de Portoviejo. Jardín exterior, sala de estudio equipada, cocina moderna y conexión a internet estable.",
    price: 160,
    rooms: 1, bathrooms: 1,
    location: "Calle Los Pinos, Urb. El Florón, Portoviejo",
    mapsQuery: "Urbanización El Florón, Portoviejo, Manabí, Ecuador",
    distanceToCampus: 2.8,
    universityCertified: false, universityCertifiedBy: null,
    amenities: ["agua", "internet", "electricidad"],
    landlordName: "Patricia Loor", landlordEmail: "patricia.loor@gmail.com",
    landlordRating: 4.5, propertyRating: 4.4, featured: false, images: [], verificationReport: null, reviews: []
  },
  {
    id: 8,
    title: "Estudio Completo — Barrio La Alborada",
    description: "Estudio completamente amoblado en el barrio La Alborada. Cocina americana, cama doble, escritorio y televisor. Adecuado para estudiantes de posgrado o docentes visitantes de la PUCEM.",
    price: 250,
    rooms: 1, bathrooms: 1,
    location: "Calle 10 de Agosto y Calle Guayaquil, La Alborada, Portoviejo",
    mapsQuery: "Barrio La Alborada, Portoviejo, Manabí, Ecuador",
    distanceToCampus: 1.5,
    universityCertified: false, universityCertifiedBy: null,
    amenities: ["internet", "amoblado"],
    landlordName: "Jorge Valdivia", landlordEmail: "j.valdivia@gmail.com",
    landlordRating: 4.5, propertyRating: 4.3, featured: false, images: [],
    verificationReport: null,
    reviews: [{ author: "Emma Bravo (Docente PUCEM)", rating: 4, text: "Muy funcional para mi estadía temporal. Ubicación conveniente y propietario atento." }]
  }
];

// --- PERFILES ROOMIE DE DEMOSTRACIÓN ---
const DEFAULT_ROOMIES = [
  {
    id: 1,
    name: "Camila T.",
    career: "Medicina — 2do año",
    year: 2,
    budget: 140,
    type: "busca-lugar",
    gender: "Femenino",
    schedule: "Diurno",
    availableFrom: "Agosto 2026",
    habits: ["No fumadora", "Sin mascotas", "Silenciosa"],
    description: "Estudiante foránea de Loja buscando compañera de cuarto para compartir gastos en Portoviejo. Prefiero zona cercana al campus. Soy ordenada, estudiosa y respeto los horarios de descanso.",
    contact: "c.torres@pucem.edu.ec",
    avatarColor: "#1a56db"
  },
  {
    id: 2,
    name: "Andrés M.",
    career: "Ingeniería en Sistemas — 3er año",
    year: 3,
    budget: 120,
    type: "tiene-lugar",
    location: "Cdla. Los Ceibos, Portoviejo",
    totalRent: 240,
    gender: "Masculino",
    schedule: "Mixto",
    availableFrom: "Septiembre 2026",
    habits: ["No fumador", "Mascotas permitidas", "Sociable"],
    description: "Tengo un departamento de dos habitaciones en Los Ceibos buscando compañero para dividir el arriendo. El departamento cuenta con cocina equipada, sala y zona de lavandería. Ambiente tranquilo pero sociable.",
    contact: "a.mora@pucem.edu.ec",
    avatarColor: "#0ea5e9"
  },
  {
    id: 3,
    name: "Valentina R.",
    career: "Derecho — 4to año",
    year: 4,
    budget: 160,
    type: "busca-lugar",
    gender: "Femenino",
    schedule: "Diurno",
    availableFrom: "Agosto 2026",
    habits: ["No fumadora", "Sin mascotas", "Ordenada"],
    description: "Estudiante de Derecho en cuarto año. Busco compañera de habitación o departamento compartido. Tengo horario diurno y estudio hasta entrada la tarde. Pago puntual garantizado.",
    contact: "v.roman@pucem.edu.ec",
    avatarColor: "#7c3aed"
  },
  {
    id: 4,
    name: "Luis C.",
    career: "Arquitectura — 1er año",
    year: 1,
    budget: 100,
    type: "busca-lugar",
    gender: "Masculino",
    schedule: "Diurno",
    availableFrom: "Agosto 2026",
    habits: ["No fumador", "Sin mascotas", "Tranquilo"],
    description: "Recién ingresado a la PUCEM desde Manta. Busco habitación compartida con ambiente tranquilo y cercana al campus. Presupuesto ajustado pero puntual. Prefiero zona universitaria.",
    contact: "l.cabrera@pucem.edu.ec",
    avatarColor: "#059669"
  },
  {
    id: 5,
    name: "Mariana P.",
    career: "Enfermería — 2do año",
    year: 2,
    budget: 130,
    type: "tiene-lugar",
    location: "Barrio La Floresta, Portoviejo",
    totalRent: 260,
    gender: "Femenino",
    schedule: "Mixto",
    availableFrom: "Julio 2026",
    habits: ["No fumadora", "Mascotas pequeñas", "Ordenada", "Sociable"],
    description: "Tengo una habitación disponible en casa compartida en La Floresta, a cinco minutos de la PUCEM. Somos tres estudiantes actualmente. El ambiente es tranquilo y colaborativo. Busco una compañera responsable.",
    contact: "m.perez@pucem.edu.ec",
    avatarColor: "#d97706"
  },
  {
    id: 6,
    name: "Roberto V.",
    career: "Contabilidad — 3er año",
    year: 3,
    budget: 150,
    type: "busca-lugar",
    gender: "Masculino",
    schedule: "Nocturno",
    availableFrom: "Septiembre 2026",
    habits: ["Fumador", "Sin mascotas", "Sociable"],
    description: "Estudiante de Contabilidad con jornada nocturna buscando habitación o compañero. Duermo de día y salgo a clases por la tarde-noche. Busco ambiente tranquilo durante la mañana.",
    contact: "r.vasquez@pucem.edu.ec",
    avatarColor: "#0f766e"
  }
];

// ============================================================
// PERSISTENCIA — localStorage
// ============================================================

function initDB() {
  if (!localStorage.getItem("homii_accounts"))    localStorage.setItem("homii_accounts",    JSON.stringify(DEFAULT_ACCOUNTS));
  if (!localStorage.getItem("homii_properties"))  localStorage.setItem("homii_properties",  JSON.stringify(DEFAULT_PROPERTIES));
  if (!localStorage.getItem("homii_roomies"))      localStorage.setItem("homii_roomies",     JSON.stringify(DEFAULT_ROOMIES));
}

const getAccounts   = () => JSON.parse(localStorage.getItem("homii_accounts")   || "[]");
const getProperties = () => JSON.parse(localStorage.getItem("homii_properties") || "[]");
const getRoomies    = () => JSON.parse(localStorage.getItem("homii_roomies")    || "[]");
const saveAccounts   = d => localStorage.setItem("homii_accounts",   JSON.stringify(d));
const saveProperties = d => localStorage.setItem("homii_properties", JSON.stringify(d));
const saveRoomies    = d => localStorage.setItem("homii_roomies",    JSON.stringify(d));
const getCurrentUser = ()  => { const s = localStorage.getItem("homii_session"); return s ? JSON.parse(s) : null; };
const setCurrentUser = u  => localStorage.setItem("homii_session", JSON.stringify(u));
const clearSession   = () => localStorage.removeItem("homii_session");

// ============================================================
// ESTADO DE LA APLICACIÓN
// ============================================================

const APP = {
  currentView: "landing",
  galleryIndex: {},
  notifications: [
    { id: 1, title: "Bienvenido a Homii", text: "Plataforma oficial de arriendos para la comunidad PUCEM.", time: "Ahora", unread: true }
  ],
  supportHistory: [
    { sender: "bot", text: "Hola. Soy el asistente de soporte de Homii. ¿En qué puedo ayudarle?" }
  ],
  directChats: {},
  pendingRoute: null
};

// ============================================================
// INICIALIZACIÓN
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  initDB();
  setupNav();
  setupSegmentTabs();
  setupAuth();
  setupSearch();
  setupRoomie();
  setupPublishForm();
  setupSupport();
  setupNotifications();
  setupActivation();
  updateNavUI();
  navigate("landing");
});

// ============================================================
// NAVEGACIÓN
// ============================================================

function navigate(viewId) {
  if (viewId === "landlord" || viewId === "university") {
    if (!guardRoute(viewId)) return;
  }

  APP.currentView = viewId;
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const target = document.getElementById(viewId + "-view");
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.dataset.view === viewId);
  });

  if (viewId === "search")     filterListings();
  if (viewId === "roomie")     filterRoomies();
  if (viewId === "landlord")   renderLandlordPanel();
  if (viewId === "university") renderUniPanel();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupNav() {
  document.querySelectorAll(".nav-link").forEach(l => {
    l.addEventListener("click", () => { if (l.dataset.view) navigate(l.dataset.view); });
  });
  document.querySelector(".logo")?.addEventListener("click", () => navigate("landing"));
  document.getElementById("btn-login")?.addEventListener("click", () => openAuth());
  document.getElementById("btn-register")?.addEventListener("click", () => openAuthRegister());
  document.getElementById("btn-logout")?.addEventListener("click", logout);
  document.getElementById("hero-search-btn")?.addEventListener("click", () => {
    const kw = document.getElementById("quick-search")?.value.trim();
    if (kw) { const fi = document.getElementById("filter-keyword"); if (fi) fi.value = kw; }
    navigate("search");
  });
  document.getElementById("quick-search")?.addEventListener("keypress", e => {
    if (e.key === "Enter") document.getElementById("hero-search-btn")?.click();
  });
}

function guardRoute(route) {
  const user = getCurrentUser();
  if (!user) { APP.pendingRoute = route; openAuth(); return false; }
  if (route === "landlord"   && user.role !== "landlord")   { APP.pendingRoute = route; openAuth(); return false; }
  if (route === "university" && user.role !== "university") { APP.pendingRoute = route; openAuth(); return false; }
  return true;
}

// ============================================================
// AUTENTICACIÓN
// ============================================================

function setupAuth() {
  document.getElementById("auth-modal")?.addEventListener("click", e => {
    if (e.target.id === "auth-modal") closeAuth();
  });
  document.getElementById("auth-close")?.addEventListener("click", closeAuth);
  document.getElementById("login-form")?.addEventListener("submit", e => { e.preventDefault(); doLogin(); });
  document.getElementById("register-form")?.addEventListener("submit", e => { e.preventDefault(); doRegister(); });
  document.getElementById("to-register")?.addEventListener("click", () => switchPanel("register"));
  document.getElementById("to-login")?.addEventListener("click", () => switchPanel("login"));

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeAuth(); closePropertyModal(); closeRoomieModal(); }
  });
}

function switchPanel(which) {
  document.getElementById("panel-login").style.display    = which === "login"    ? "flex" : "none";
  document.getElementById("panel-register").style.display = which === "register" ? "flex" : "none";
}

function openAuth() {
  document.getElementById("auth-modal")?.classList.add("open");
  switchPanel("login");
  clearAuthErrors();
}

function openAuthRegister() {
  document.getElementById("auth-modal")?.classList.add("open");
  switchPanel("register");
  clearAuthErrors();
}

function closeAuth() { document.getElementById("auth-modal")?.classList.remove("open"); }

function clearAuthErrors() {
  ["login-error", "register-error"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ""; el.style.display = "none"; }
  });
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = "block"; }
}

function doLogin() {
  const email = document.getElementById("login-email").value.trim();
  const pass  = document.getElementById("login-password").value;
  const user  = getAccounts().find(a => a.email === email && a.password === pass);

  if (!user) { showAuthError("login-error", "Correo electrónico o contraseña incorrectos."); return; }

  setCurrentUser(user);
  closeAuth();
  updateNavUI();
  addNotif("Sesión iniciada", "Bienvenido, " + user.name + ".");

  if (APP.pendingRoute) {
    const r = APP.pendingRoute; APP.pendingRoute = null; navigate(r);
  } else if (user.role === "landlord") navigate("landlord");
  else if (user.role === "university") navigate("university");
}

function doRegister() {
  const name  = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const pass  = document.getElementById("reg-password").value;
  const role  = document.getElementById("reg-role").value;
  const phone = document.getElementById("reg-phone").value.trim();

  if (!name || !email || !pass) { showAuthError("register-error", "Completa todos los campos obligatorios."); return; }
  if (pass.length < 6)          { showAuthError("register-error", "La contraseña debe tener al menos 6 caracteres."); return; }

  const accounts = getAccounts();
  if (accounts.find(a => a.email === email)) { showAuthError("register-error", "Este correo ya está registrado."); return; }

  const newUser = { id: Date.now(), name, email, password: pass, role, avatar: name.charAt(0).toUpperCase(), phone: phone || null };
  accounts.push(newUser);
  saveAccounts(accounts);
  setCurrentUser(newUser);
  closeAuth();
  updateNavUI();
  addNotif("Cuenta creada", "Bienvenido a Homii x PUCEM, " + name + ".");
  if (role === "landlord") navigate("landlord"); else navigate("landing");
}

function logout() {
  clearSession(); updateNavUI(); navigate("landing");
  addNotif("Sesión cerrada", "Ha cerrado sesión exitosamente.");
}

function updateNavUI() {
  const user = getCurrentUser();
  const guestEl = document.getElementById("nav-guest");
  const userEl  = document.getElementById("nav-user");
  const nameEl  = document.getElementById("nav-username");
  const avEl    = document.getElementById("nav-avatar");
  const llLink  = document.querySelector(".nav-landlord-link");
  const uniLink = document.querySelector(".nav-uni-link");

  if (user) {
    if (guestEl) guestEl.style.display = "none";
    if (userEl)  userEl.style.display  = "flex";
    if (nameEl)  nameEl.textContent    = user.name.split(" ")[0];
    if (avEl)  { avEl.textContent = user.avatar || user.name.charAt(0).toUpperCase(); avEl.style.background = userColor(user.id); }
    if (llLink)  llLink.style.display  = user.role === "landlord"   ? "list-item" : "none";
    if (uniLink) uniLink.style.display = user.role === "university" ? "list-item" : "none";
  } else {
    if (guestEl) guestEl.style.display = "flex";
    if (userEl)  userEl.style.display  = "none";
    if (llLink)  llLink.style.display  = "none";
    if (uniLink) uniLink.style.display = "none";
  }
}

function userColor(id) {
  const palette = ["#1d4ed8","#0369a1","#059669","#7c3aed","#b45309","#0f766e","#be185d"];
  return palette[id % palette.length];
}

// ============================================================
// SEGMENTOS DE LANDING
// ============================================================

const SEGMENTS = {
  student: {
    title: "Su hogar seguro, validado por la PUCEM",
    desc: "Mudarse a Portoviejo para estudiar en la PUCEM es una decisión importante. Homii le ayuda a encontrar arriendos a pasos del campus, inspeccionados físicamente por nuestro equipo de campo y respaldados por el convenio oficial con la Pontificia Universidad Católica de Manabí.",
    features: ["A minutos caminando del campus PUCEM", "Inmuebles inspeccionados y certificados", "Soporte exclusivo Homii Student", "Filtros rápidos de agua, internet y electricidad"],
    quote: "Llegué desde Loja sin conocer Portoviejo. Gracias a Homii Student encontré un cuarto certificado a tres cuadras de la PUCEM con internet de fibra. Mis padres quedaron completamente tranquilos.",
    author: "Sofía Valenzuela — Estudiante de Medicina, PUCEM"
  },
  general: {
    title: "Arrendamientos transparentes, rápidos y directos",
    desc: "Encuentre su próximo departamento o estudio en Portoviejo con filtros reales que importan: internet estable, agua constante, precio justo de mercado y políticas de mascotas flexibles.",
    features: ["Buscador con filtros precisos", "Trato directo con propietarios verificados", "Comparación de precios y valoraciones reales", "Plataforma autogestionable sin intermediarios"],
    quote: "Detestaba buscar arriendos porque las fotos nunca coinciden con la realidad. En Homii los filtros son exactos y las fotos corresponden a los inmuebles reales. Encontré mi departamento en un fin de semana.",
    author: "Javier Pérez — Diseñador, Portoviejo"
  },
  landlord: {
    title: "Mayor visibilidad y arrendamiento directo",
    desc: "¿Tiene inmuebles en Portoviejo o Manabí? Homii le da visibilidad directa entre miles de estudiantes de la PUCEM y arrendatarios en general, con herramientas para gestionar sus propiedades de forma profesional.",
    features: ["Publicación gratuita con fotos reales", "Calificaciones bidireccionales y transparentes", "Plan destacado con mayor alcance en búsquedas", "Certificación Homii Student PUCEM"],
    quote: "Tengo dos departamentos cerca de la PUCEM y los arrendaba lentamente antes de Homii. Desde que publiqué, ambos están ocupados todo el año. La verificación universitaria hace toda la diferencia.",
    author: "Rosa María Delgado — Propietaria en Portoviejo"
  },
  admin: {
    title: "Gestión centralizada de múltiples unidades",
    desc: "Optimice la tasa de ocupación de sus condominios y edificios en Manabí. Monitoree consultas, gestione contratos y garantice el estándar de calidad que los estudiantes e inquilinos exigentes buscan.",
    features: ["Panel de métricas centralizado", "Soporte prioritario Homii", "Gestión masiva de listados", "Certificación colectiva de condominio"],
    quote: "Administro un edificio de 16 departamentos en Portoviejo. Homii ha centralizado todas las consultas de estudiantes de la PUCEM de manera muy eficiente.",
    author: "Alberto Castro — Administrador de Condominios"
  },
  worker: {
    title: "Transición a Manabí sin dificultad",
    desc: "Si su empresa o institución lo reubica en Portoviejo o Manta, Homii facilita el proceso con estancias ejecutivas completamente amobladas y listas para habitar desde el primer día.",
    features: ["Estudios ejecutivos completamente amoblados", "Ubicación estratégica en zonas laborales", "Contratos temporales flexibles", "Todos los servicios incluidos desde el primer día"],
    quote: "Me trasladaron a la sede de Portoviejo. Encontré un mini departamento amoblado con todos los servicios activos. El proceso fue rápido y confiable gracias a las fotos verificadas.",
    author: "Eduardo Castillo — Consultor, Portoviejo"
  }
};

function setupSegmentTabs() {
  document.querySelectorAll(".seg-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".seg-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      renderSegment(tab.dataset.seg);
    });
  });
  renderSegment("student");
}

function renderSegment(key) {
  const d = SEGMENTS[key];
  if (!d) return;
  document.querySelectorAll(".seg-panel").forEach(p => p.classList.remove("active"));
  const panel = document.getElementById("seg-panel-" + key);
  if (panel) {
    panel.innerHTML = `
      <div>
        <h3 class="seg-panel-title">${d.title}</h3>
        <p class="seg-panel-desc">${d.desc}</p>
        <ul class="seg-features">
          ${d.features.map(f => `<li><span class="seg-check">&#10003;</span>${f}</li>`).join("")}
        </ul>
      </div>
      <div class="seg-quote">
        <p class="seg-quote-text">"${d.quote}"</p>
        <p class="seg-quote-author">— ${d.author}</p>
      </div>`;
    panel.classList.add("active");
  }
}

// ============================================================
// BUSCADOR DE ARRIENDOS
// ============================================================

function setupSearch() {
  const priceSlider = document.getElementById("filter-price");
  const priceVal    = document.getElementById("filter-price-val");
  if (priceSlider && priceVal) {
    priceSlider.addEventListener("input", () => { priceVal.textContent = "$" + priceSlider.value; filterListings(); });
  }
  const distSlider = document.getElementById("filter-distance");
  const distVal    = document.getElementById("filter-distance-val");
  if (distSlider && distVal) {
    distSlider.addEventListener("input", () => { distVal.textContent = distSlider.value + " km"; filterListings(); });
  }
  ["filter-keyword","filter-rooms","filter-certified","sort-by"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", filterListings);
    document.getElementById(id)?.addEventListener("input",  filterListings);
  });
  document.querySelectorAll(".filter-amenity").forEach(cb => cb.addEventListener("change", filterListings));
}

function filterListings() {
  const kw        = (document.getElementById("filter-keyword")?.value  || "").toLowerCase().trim();
  const maxPrice  = parseInt(document.getElementById("filter-price")?.value    || "1200");
  const minRooms  = document.getElementById("filter-rooms")?.value             || "any";
  const certOnly  = document.getElementById("filter-certified")?.checked       || false;
  const maxDist   = parseFloat(document.getElementById("filter-distance")?.value || "10");
  const sortBy    = document.getElementById("sort-by")?.value                  || "featured";
  const amenities = [...document.querySelectorAll(".filter-amenity:checked")].map(cb => cb.value);

  let props = getProperties().filter(p => {
    const matchKw    = !kw      || p.title.toLowerCase().includes(kw) || p.description.toLowerCase().includes(kw) || p.location.toLowerCase().includes(kw);
    const matchPrice = p.price <= maxPrice;
    const matchRooms = minRooms === "any" || p.rooms >= parseInt(minRooms);
    const matchCert  = !certOnly || p.universityCertified;
    const matchDist  = p.distanceToCampus <= maxDist;
    const matchAmen  = amenities.every(a => p.amenities.includes(a));
    return matchKw && matchPrice && matchRooms && matchCert && matchDist && matchAmen;
  });

  if (sortBy === "price-asc")    props.sort((a, b) => a.price - b.price);
  else if (sortBy === "price-desc") props.sort((a, b) => b.price - a.price);
  else if (sortBy === "distance") props.sort((a, b) => a.distanceToCampus - b.distanceToCampus);
  else if (sortBy === "rating")   props.sort((a, b) => b.propertyRating - a.propertyRating);
  else props.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  renderListingsGrid(props);
}

function renderListingsGrid(list) {
  const grid  = document.getElementById("listings-grid");
  const count = document.getElementById("listings-count");
  if (!grid) return;
  if (count) count.textContent = list.length;

  if (list.length === 0) {
    grid.innerHTML = `<div class="no-results-msg">No se encontraron propiedades con los filtros seleccionados.</div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const img    = p.images && p.images.length > 0 ? p.images[0] : null;
    const stars  = "★".repeat(Math.round(p.propertyRating)) + "☆".repeat(5 - Math.round(p.propertyRating));

    return `
    <article class="prop-card ${p.featured ? "featured" : ""}" onclick="openPropertyModal(${p.id})">
      <div class="prop-img">
        ${img
          ? `<img src="${img}" alt="${p.title}">`
          : `<div class="prop-img-placeholder"><svg viewBox="0 0 24 24" width="40" height="40" stroke-width="1.2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`}
        <div class="prop-price-overlay">
          <div class="prop-price">$${p.price}<span>/mes</span></div>
          ${p.images && p.images.length > 1 ? `<span class="badge badge-gray" style="font-size:0.65rem;">${p.images.length} fotos</span>` : ""}
        </div>
        <div class="prop-badges-top">
          ${p.universityCertified ? `<span class="badge badge-pucem">Certificado PUCEM</span>` : ""}
        </div>
        ${p.featured ? `<div class="prop-featured-tag">Destacado</div>` : ""}
      </div>
      <div class="prop-body">
        <h4 class="prop-title">${p.title}</h4>
        <p class="prop-location">
          <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M12 2a8 8 0 00-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 00-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
          ${p.location.split(",")[0]}
        </p>
        <div class="prop-specs">
          <span>${p.rooms} hab.</span>
          <span>${p.bathrooms} baño</span>
          <span>${p.distanceToCampus} km PUCEM</span>
        </div>
        <div class="prop-amenities">
          ${p.amenities.slice(0,3).map(a => `<span class="amenity-tag">${capitalize(a)}</span>`).join("")}
          ${p.amenities.length > 3 ? `<span class="amenity-tag">+${p.amenities.length - 3}</span>` : ""}
        </div>
        <div class="prop-footer">
          <div class="prop-rating"><span class="rating-stars">${stars}</span> ${p.propertyRating}</div>
          ${p.universityCertified ? `<span class="badge badge-green">Verificado</span>` : ""}
        </div>
      </div>
    </article>`;
  }).join("");
}

// ============================================================
// MODAL DE DETALLE DE PROPIEDAD
// ============================================================

function openPropertyModal(id) {
  const p = getProperties().find(x => x.id === id);
  if (!p) return;

  APP.galleryIndex[id] = 0;

  document.getElementById("detail-title").textContent        = p.title;
  document.getElementById("detail-location").textContent     = p.location;
  document.getElementById("detail-price").innerHTML          = `$${p.price}<span>/mes</span>`;
  document.getElementById("detail-rooms").textContent        = `${p.rooms} Habitación(es)`;
  document.getElementById("detail-baths").textContent        = `${p.bathrooms} Baño(s)`;
  document.getElementById("detail-distance").textContent     = `${p.distanceToCampus} km a PUCEM`;
  document.getElementById("detail-desc").textContent         = p.description;

  const badgesRow = document.getElementById("detail-badges");
  if (badgesRow) {
    badgesRow.innerHTML = p.universityCertified
      ? `<span class="badge badge-pucem">Certificado PUCEM</span>`
      : `<span class="badge badge-gray">Arriendo General</span>`;
    if (p.featured) badgesRow.innerHTML += ` <span class="badge badge-blue">Destacado</span>`;
  }

  const amenEl = document.getElementById("detail-amenities");
  if (amenEl) amenEl.innerHTML = p.amenities.map(a => `<span class="amenity-tag" style="font-size:0.82rem;padding:0.25rem 0.6rem;">${capitalize(a)}</span>`).join("");

  renderGallery(p);

  const q = encodeURIComponent(p.mapsQuery || p.location);
  const frame = document.getElementById("detail-map");
  const mapLink = document.getElementById("detail-map-link");
  const mapCta  = document.getElementById("detail-map-cta");
  if (frame)   frame.src = `https://maps.google.com/maps?q=${q}&output=embed&hl=es&z=16`;
  if (mapLink) mapLink.href = `https://www.google.com/maps/search/?api=1&query=${q}`;
  if (mapCta)  mapCta.href  = `https://www.google.com/maps/search/?api=1&query=${q}`;

  const verifBox = document.getElementById("detail-verif");
  if (verifBox) {
    if (p.verificationReport) {
      verifBox.style.display = "block";
      document.getElementById("verif-date").textContent       = "Inspección: " + p.verificationReport.inspectionDate;
      document.getElementById("verif-water").textContent      = p.verificationReport.standards.waterPressure;
      document.getElementById("verif-internet").textContent   = p.verificationReport.standards.internetSpeed;
      document.getElementById("verif-safety").textContent     = p.verificationReport.standards.fireSafety;
      document.getElementById("verif-structure").textContent  = p.verificationReport.standards.structure;
    } else {
      verifBox.style.display = "none";
    }
  }

  const revEl = document.getElementById("detail-reviews");
  if (revEl) {
    revEl.innerHTML = p.reviews && p.reviews.length > 0
      ? p.reviews.map(r => `
          <div class="review-item">
            <div class="review-top">
              <span class="review-author">${r.author}</span>
              <span class="review-stars">${"★".repeat(r.rating)}</span>
            </div>
            <p class="review-text">"${r.text}"</p>
          </div>`).join("")
      : `<p style="font-size:0.83rem;color:var(--text-muted);font-style:italic;">Sin reseñas todavía.</p>`;
  }

  const landlordAv = document.getElementById("detail-landlord-av");
  if (landlordAv) { landlordAv.textContent = p.landlordName.charAt(0); landlordAv.style.background = userColor(p.id); }
  document.getElementById("detail-landlord-name").textContent   = p.landlordName;
  document.getElementById("detail-landlord-rating").textContent = "Calificación: " + p.landlordRating + " / 5.0";

  setupDirectChat(p);

  document.getElementById("property-modal")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function renderGallery(p) {
  const wrap = document.getElementById("detail-gallery");
  if (!wrap) return;
  const idx = APP.galleryIndex[p.id] || 0;
  const q   = encodeURIComponent(p.mapsQuery || p.location);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;

  if (!p.images || p.images.length === 0) {
    wrap.innerHTML = `
      <div class="gallery-placeholder" onclick="window.open('${mapsUrl}','_blank')" style="height:230px;cursor:pointer;" title="Ver en Google Maps">
        <svg viewBox="0 0 24 24" width="48" height="48" stroke-width="1" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Sin imágenes. Clic para ver en Google Maps.</span>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="gallery-wrap">
      <img src="${p.images[idx]}" alt="Foto ${idx + 1}"
           onclick="window.open('${mapsUrl}','_blank')" title="Ver ubicación en Google Maps">
      ${p.images.length > 1 ? `
        <button class="gallery-nav-btn gallery-prev" onclick="changeGallery(${p.id},-1)">&#8249;</button>
        <button class="gallery-nav-btn gallery-next" onclick="changeGallery(${p.id}, 1)">&#8250;</button>
        <div class="gallery-dots">
          ${p.images.map((_,i) => `<span class="gallery-dot ${i===idx?'on':''}" onclick="setGallery(${p.id},${i})"></span>`).join("")}
        </div>
        <div class="gallery-counter">${idx+1} / ${p.images.length}</div>
      ` : ""}
      <div class="gallery-maps-hover" onclick="window.open('${mapsUrl}','_blank')">Ver ubicación en Google Maps</div>
    </div>`;
}

window.changeGallery = function(id, dir) {
  const p = getProperties().find(x => x.id === id);
  if (!p || !p.images) return;
  APP.galleryIndex[id] = ((APP.galleryIndex[id] || 0) + dir + p.images.length) % p.images.length;
  renderGallery(p);
};
window.setGallery = function(id, idx) {
  APP.galleryIndex[id] = idx;
  renderGallery(getProperties().find(x => x.id === id));
};

function closePropertyModal() {
  document.getElementById("property-modal")?.classList.remove("open");
  document.body.style.overflow = "";
  const f = document.getElementById("detail-map"); if (f) f.src = "";
}

// Chat directo con propietario
function setupDirectChat(p) {
  const msgs   = document.getElementById("direct-chat-msgs");
  const input  = document.getElementById("direct-chat-input");
  const sendBtn = document.getElementById("direct-chat-send");
  if (!msgs || !sendBtn || !input) return;

  if (!APP.directChats[p.id]) {
    APP.directChats[p.id] = [
      { side: "in", text: `Hola, soy ${p.landlordName}. Gracias por su interés en "${p.title}". ¿En qué puedo ayudarle?` }
    ];
  }

  const render = () => {
    msgs.innerHTML = APP.directChats[p.id].map(m =>
      `<div class="chat-bubble chat-${m.side}">${m.text}</div>`
    ).join("");
    msgs.scrollTop = msgs.scrollHeight;
  };
  render();

  const sendMsg = text => {
    if (!text.trim()) return;
    APP.directChats[p.id].push({ side: "out", text });
    input.value = "";
    render();
    setTimeout(() => {
      const t = text.toLowerCase();
      let reply = "Gracias por escribir. Cualquier consulta adicional estoy disponible.";
      if (t.includes("visitar") || t.includes("ver"))  reply = "Puedo coordinar una visita de lunes a sábado de 9:00 a 18:00. ¿Qué día le conviene?";
      if (t.includes("precio") || t.includes("descuento")) reply = "El precio publicado es el valor mensual final. Si el contrato es por un año completo, podríamos conversar.";
      if (t.includes("mascota")) reply = "Se aceptan mascotas pequeñas o medianas con un depósito adicional de garantía.";
      if (t.includes("agua") || t.includes("internet") || t.includes("luz")) reply = "Los servicios incluidos están detallados en el anuncio. Para consultas específicas, con gusto le aclaro.";
      if (t.includes("contrato")) reply = "El contrato mínimo es de 6 meses, con 1 mes de garantía. Para estudiantes PUCEM, el proceso está avalado por la universidad.";
      APP.directChats[p.id].push({ side: "in", text: reply });
      render();
      addNotif("Mensaje de " + p.landlordName, reply.substring(0, 55) + "...");
    }, 1400);
  };

  const newSend = sendBtn.cloneNode(true);
  sendBtn.parentNode.replaceChild(newSend, sendBtn);
  newSend.addEventListener("click", () => sendMsg(input.value));
  input.onkeypress = e => { if (e.key === "Enter") sendMsg(input.value); };

  document.querySelectorAll(".direct-preset").forEach(chip => {
    const nc = chip.cloneNode(true);
    chip.parentNode.replaceChild(nc, chip);
    nc.addEventListener("click", () => sendMsg(nc.textContent.trim()));
  });
}

// ============================================================
// ROOMIE — BUSCAR COMPANERO
// ============================================================

function setupRoomie() {
  // Filtros
  ["roomie-budget","roomie-type","roomie-schedule","roomie-gender"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", filterRoomies);
    document.getElementById(id)?.addEventListener("input",  filterRoomies);
  });

  const budgetSlider = document.getElementById("roomie-budget");
  const budgetVal    = document.getElementById("roomie-budget-val");
  if (budgetSlider && budgetVal) {
    budgetSlider.addEventListener("input", () => { budgetVal.textContent = "$" + budgetSlider.value; filterRoomies(); });
  }

  // Formulario para publicar perfil
  document.getElementById("roomie-form")?.addEventListener("submit", e => {
    e.preventDefault();
    submitRoomieProfile();
  });

  // Modal
  document.getElementById("roomie-modal")?.addEventListener("click", e => {
    if (e.target.id === "roomie-modal") closeRoomieModal();
  });
  document.getElementById("roomie-modal-close")?.addEventListener("click", closeRoomieModal);

  // Stats en hero
  updateRoomieStats();
}

function filterRoomies() {
  const maxBudget = parseInt(document.getElementById("roomie-budget")?.value || "500");
  const type      = document.getElementById("roomie-type")?.value    || "all";
  const schedule  = document.getElementById("roomie-schedule")?.value || "all";
  const gender    = document.getElementById("roomie-gender")?.value   || "all";

  let list = getRoomies().filter(r => {
    const matchBudget   = r.budget <= maxBudget;
    const matchType     = type     === "all" || r.type     === type;
    const matchSchedule = schedule === "all" || r.schedule.toLowerCase() === schedule.toLowerCase();
    const matchGender   = gender   === "all" || r.gender.toLowerCase()   === gender.toLowerCase();
    return matchBudget && matchType && matchSchedule && matchGender;
  });

  renderRoomieGrid(list);
}

function renderRoomieGrid(list) {
  const grid  = document.getElementById("roomie-grid");
  const count = document.getElementById("roomie-count");
  if (!grid) return;
  if (count) count.textContent = list.length;

  if (list.length === 0) {
    grid.innerHTML = `<div class="no-results-msg" style="grid-column:1/-1;">No se encontraron perfiles con los filtros seleccionados.</div>`;
    return;
  }

  grid.innerHTML = list.map(r => {
    const typeLabel = r.type === "tiene-lugar" ? "Tiene lugar, busca compañero" : "Busca lugar y compañero";
    const typeClass = r.type === "tiene-lugar" ? "type-tiene-lugar" : "type-busca-lugar";

    return `
    <div class="roomie-card" onclick="openRoomieModal(${r.id})">
      <div class="roomie-card-header">
        <div class="roomie-av" style="background:${r.avatarColor}">${r.name.charAt(0)}</div>
        <div>
          <div class="roomie-name">${r.name}</div>
          <div class="roomie-career">${r.career} — PUCEM</div>
        </div>
      </div>
      <span class="roomie-type-tag ${typeClass}">${typeLabel}</span>
      <div class="roomie-budget">$${r.budget}<span>/mes (su parte)</span></div>
      <div class="roomie-info-row">
        <span>Horario: ${r.schedule}</span>
        <span>${r.gender}</span>
        <span>Desde: ${r.availableFrom}</span>
      </div>
      <div class="roomie-habits">
        ${r.habits.map(h => `<span class="habit-tag">${h}</span>`).join("")}
      </div>
      <p class="roomie-desc">${r.description.substring(0, 120)}...</p>
      <div class="roomie-footer">
        <span class="badge badge-blue">Ver perfil completo</span>
        ${r.type === "tiene-lugar" ? `<span class="badge badge-green">Lugar disponible</span>` : ""}
      </div>
    </div>`;
  }).join("");
}

function openRoomieModal(id) {
  const r = getRoomies().find(x => x.id === id);
  if (!r) return;

  const typeLabel = r.type === "tiene-lugar" ? "Tiene lugar, busca compañero" : "Busca lugar y compañero";
  const typeClass = r.type === "tiene-lugar" ? "type-tiene-lugar" : "type-busca-lugar";

  document.getElementById("rmodal-title").textContent  = r.name + " — " + r.career;
  document.getElementById("rmodal-career").textContent = "PUCEM — " + r.career;

  const avEl = document.getElementById("rmodal-avatar");
  if (avEl) { avEl.textContent = r.name.charAt(0); avEl.style.background = r.avatarColor; }

  const typeEl = document.getElementById("rmodal-type");
  if (typeEl) { typeEl.textContent = typeLabel; typeEl.className = "roomie-type-tag " + typeClass; }

  const infoTable = document.getElementById("rmodal-info");
  if (infoTable) {
    let rows = [
      ["Presupuesto mensual (su parte)", "$" + r.budget + " / mes"],
      ["Horario", r.schedule],
      ["Género", r.gender],
      ["Disponibilidad", r.availableFrom],
      ["Hábitos", r.habits.join(", ")]
    ];
    if (r.type === "tiene-lugar") {
      rows.push(["Ubicación del lugar", r.location || "Portoviejo, Manabí"]);
      rows.push(["Arriendo total mensual", "$" + (r.totalRent || "N/D") + " (entre dos: $" + Math.ceil((r.totalRent || 0) / 2) + " c/u)"]);
    }
    infoTable.innerHTML = rows.map(([k, v]) => `
      <div class="info-row">
        <span class="info-key">${k}</span>
        <span class="info-val">${v}</span>
      </div>`).join("");
  }

  document.getElementById("rmodal-desc").textContent    = r.description;
  document.getElementById("rmodal-contact").textContent = r.contact;

  // Chat roomie
  setupRoomieChat(r);

  document.getElementById("roomie-modal")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function setupRoomieChat(r) {
  if (!APP.directChats["roomie_" + r.id]) {
    APP.directChats["roomie_" + r.id] = [
      { side: "in", text: `Hola, soy ${r.name}. Gracias por revisar mi perfil. ¿Tiene alguna pregunta sobre la convivencia o el lugar?` }
    ];
  }

  const msgs    = document.getElementById("roomie-chat-msgs");
  const input   = document.getElementById("roomie-chat-input");
  const sendBtn = document.getElementById("roomie-chat-send");
  if (!msgs || !sendBtn || !input) return;

  const render = () => {
    msgs.innerHTML = APP.directChats["roomie_" + r.id].map(m =>
      `<div class="chat-bubble chat-${m.side}">${m.text}</div>`
    ).join("");
    msgs.scrollTop = msgs.scrollHeight;
  };
  render();

  const sendMsg = text => {
    if (!text.trim()) return;
    APP.directChats["roomie_" + r.id].push({ side: "out", text });
    input.value = "";
    render();
    setTimeout(() => {
      const t = text.toLowerCase();
      let reply = "Con gusto le respondo. Cualquier otra duda no dude en preguntar.";
      if (t.includes("visitar") || t.includes("ver el")) reply = "Podemos coordinar una visita al lugar. Tengo disponibilidad los fines de semana principalmente.";
      if (t.includes("horario") || t.includes("sched")) reply = "Mi horario es " + r.schedule.toLowerCase() + ". Eso significa que estaría en casa principalmente en " + (r.schedule === "Diurno" ? "la tarde y noche." : "la mañana y tarde.");
      if (t.includes("precio") || t.includes("costo") || t.includes("gasto")) reply = "Mi presupuesto mensual para el arriendo es $" + r.budget + ". Los gastos de servicios los dividiríamos en partes iguales.";
      if (t.includes("mascota")) reply = r.habits.some(h => h.toLowerCase().includes("mascota")) ? "Sí, acepto mascotas. Cuénteme más sobre la suya." : "Prefiero no tener mascotas en el lugar, si no le parece un inconveniente.";
      if (t.includes("hola") || t.includes("buenas")) reply = "Hola, bienvenido. Cuénteme, ¿está buscando roomie para un lugar específico o también está buscando vivienda?";
      APP.directChats["roomie_" + r.id].push({ side: "in", text: reply });
      render();
    }, 1300);
  };

  const newSend = sendBtn.cloneNode(true);
  sendBtn.parentNode.replaceChild(newSend, sendBtn);
  newSend.addEventListener("click", () => sendMsg(input.value));
  input.onkeypress = e => { if (e.key === "Enter") sendMsg(input.value); };
}

function closeRoomieModal() {
  document.getElementById("roomie-modal")?.classList.remove("open");
  document.body.style.overflow = "";
}

function submitRoomieProfile() {
  const user = getCurrentUser();
  const name = document.getElementById("rp-name")?.value.trim();
  const career = document.getElementById("rp-career")?.value.trim();
  const budget = parseInt(document.getElementById("rp-budget")?.value || "0");
  const type = document.getElementById("rp-type")?.value;
  const schedule = document.getElementById("rp-schedule")?.value;
  const gender = document.getElementById("rp-gender")?.value;
  const desc = document.getElementById("rp-desc")?.value.trim();
  const available = document.getElementById("rp-available")?.value.trim();

  if (!name || !career || !budget || !desc) {
    alert("Por favor completa todos los campos obligatorios.");
    return;
  }

  const colors = ["#1a56db","#0369a1","#7c3aed","#059669","#d97706","#0f766e"];
  const roomies = getRoomies();
  const newR = {
    id: Date.now(),
    name,
    career,
    year: 1,
    budget,
    type,
    gender,
    schedule,
    availableFrom: available || "Próximamente",
    habits: [],
    description: desc,
    contact: user ? user.email : "contacto@pucem.edu.ec",
    avatarColor: colors[roomies.length % colors.length]
  };

  roomies.push(newR);
  saveRoomies(roomies);
  document.getElementById("roomie-form")?.reset();
  filterRoomies();
  updateRoomieStats();
  addNotif("Perfil de Roomie Publicado", "Su perfil ya está visible en la sección Buscar Compañero.");
  alert("Perfil publicado correctamente. Otros estudiantes podrán contactarle.");
}

function updateRoomieStats() {
  const roomies = getRoomies();
  const statEl = document.getElementById("roomie-hero-stat");
  const buscaEl = document.getElementById("roomie-stat-busca");
  const tieneEl = document.getElementById("roomie-stat-tiene");
  if (statEl)  statEl.textContent  = roomies.length;
  if (buscaEl) buscaEl.textContent = roomies.filter(r => r.type === "busca-lugar").length;
  if (tieneEl) tieneEl.textContent = roomies.filter(r => r.type === "tiene-lugar").length;
}

// ============================================================
// PANEL PROPIETARIO
// ============================================================

function renderLandlordPanel() {
  const user = getCurrentUser(); if (!user) return;
  const myProps = getProperties().filter(p => p.landlordEmail === user.email);

  document.getElementById("stat-listings").textContent   = myProps.length;
  document.getElementById("stat-views").textContent      = myProps.length * 147;
  document.getElementById("stat-inquiries").textContent  = myProps.length * 4;

  const list = document.getElementById("landlord-list");
  if (!list) return;

  if (myProps.length === 0) {
    list.innerHTML = `<p style="font-size:0.85rem;color:var(--text-muted);text-align:center;padding:1.5rem;">Aún no tiene propiedades publicadas. Use el formulario para crear su primer anuncio.</p>`;
    return;
  }

  list.innerHTML = myProps.map(p => `
    <div class="prop-row">
      <div class="prop-row-img">
        ${p.images && p.images.length > 0
          ? `<img src="${p.images[0]}" alt="${p.title}">`
          : `<svg viewBox="0 0 24 24" width="22" height="22" stroke="var(--border-blue)" stroke-width="1.5" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`}
      </div>
      <div class="prop-row-info" style="margin-left:0.85rem;">
        <h5>${p.title}</h5>
        <p>${p.location.split(",")[0]} &middot; <span style="color:var(--blue);font-weight:600;">$${p.price}/mes</span></p>
      </div>
      <div class="prop-row-actions">
        ${p.universityCertified ? `<span class="badge badge-green">Verificado PUCEM</span>` : `<button class="btn btn-secondary btn-sm" onclick="requestVerif(${p.id})">Pedir Verificación</button>`}
        ${p.featured ? `<span class="badge badge-blue">Destacado</span>` : `<button class="btn btn-outline btn-sm" onclick="makeFeatured(${p.id})">Destacar</button>`}
        <button class="btn btn-outline btn-sm" onclick="openPropertyModal(${p.id})">Ver</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProp(${p.id})">Eliminar</button>
      </div>
    </div>`).join("");
}

window.makeFeatured = function(id) {
  const props = getProperties();
  const p = props.find(x => x.id === id);
  if (!p) return;
  p.featured = true;
  saveProperties(props);
  addNotif("Anuncio Destacado", `"${p.title}" ahora aparece destacado en el buscador.`);
  renderLandlordPanel();
};

window.requestVerif = function(id) {
  const p = getProperties().find(x => x.id === id);
  if (!p) return;
  addNotif("Solicitud Enviada", `Inspección de campo agendada para "${p.title}".`);
  alert("Solicitud enviada. Nuestro equipo de campo de la PUCEM coordinará la visita de inspección técnica en los próximos días.");
};

window.deleteProp = function(id) {
  if (!confirm("¿Está seguro de eliminar este anuncio?")) return;
  saveProperties(getProperties().filter(x => x.id !== id));
  renderLandlordPanel();
  addNotif("Anuncio Eliminado", "La propiedad fue removida del buscador.");
};

function setupPublishForm() {
  document.getElementById("prop-images")?.addEventListener("change", previewImages);
  document.getElementById("prop-maps-address")?.addEventListener("input", updateMapsPreview);
  document.getElementById("publish-form")?.addEventListener("submit", e => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) { openAuth(); return; }

    const title    = document.getElementById("prop-title").value.trim();
    const price    = parseInt(document.getElementById("prop-price").value);
    const rooms    = parseInt(document.getElementById("prop-rooms").value);
    const location = document.getElementById("prop-location").value.trim();
    const mapsAddr = document.getElementById("prop-maps-address").value.trim() || location;
    const distance = parseFloat(document.getElementById("prop-distance").value);
    const desc     = document.getElementById("prop-desc").value.trim();
    const amenities = [...document.querySelectorAll(".form-amenity:checked")].map(cb => cb.value);
    const imgs     = window._uploadedImgs || [];

    const props = getProperties();
    props.push({
      id: Date.now(), title, description: desc, price, rooms, bathrooms: 1,
      location, mapsQuery: mapsAddr, distanceToCampus: distance,
      universityCertified: false, universityCertifiedBy: null,
      amenities: amenities.length ? amenities : ["internet"],
      landlordName: user.name, landlordEmail: user.email,
      landlordRating: 5.0, propertyRating: 4.5,
      featured: false, images: imgs, verificationReport: null, reviews: []
    });
    saveProperties(props);

    document.getElementById("publish-form").reset();
    window._uploadedImgs = [];
    const prev = document.getElementById("img-thumbs"); if (prev) prev.innerHTML = "";
    const mp   = document.getElementById("maps-preview"); if (mp) mp.style.display = "none";

    addNotif("Propiedad Publicada", `"${title}" ya está visible en el buscador.`);
    renderLandlordPanel();
    alert("Propiedad publicada exitosamente. Ya es visible en el buscador de Homii x PUCEM.");
  });
}

function previewImages(e) {
  const files = Array.from(e.target.files);
  const reads = files.map(f => new Promise(res => {
    const r = new FileReader();
    r.onload = ev => res(ev.target.result);
    r.readAsDataURL(f);
  }));
  Promise.all(reads).then(results => {
    window._uploadedImgs = results;
    const thumbs = document.getElementById("img-thumbs");
    if (!thumbs) return;
    thumbs.innerHTML = results.map((src, i) => `
      <div class="img-thumb">
        <img src="${src}" alt="Foto ${i+1}">
        <button type="button" class="img-thumb-del" onclick="removeImg(${i})">x</button>
      </div>`).join("");
  });
}

window.removeImg = function(i) {
  window._uploadedImgs = window._uploadedImgs || [];
  window._uploadedImgs.splice(i, 1);
  const thumbs = document.getElementById("img-thumbs");
  if (thumbs) {
    thumbs.innerHTML = window._uploadedImgs.map((src, idx) => `
      <div class="img-thumb"><img src="${src}" alt="Foto ${idx+1}">
      <button type="button" class="img-thumb-del" onclick="removeImg(${idx})">x</button></div>`).join("");
  }
};

function updateMapsPreview() {
  const addr = document.getElementById("prop-maps-address")?.value.trim();
  const prev = document.getElementById("maps-preview");
  const link = document.getElementById("maps-preview-link");
  if (!addr || !prev || !link) return;
  link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  link.textContent = `Ver "${addr}" en Google Maps`;
  prev.style.display = "block";
}

// ============================================================
// PORTAL UNIVERSITARIO
// ============================================================

function renderUniPanel() {
  const pending    = getProperties().filter(p => !p.universityCertified);
  const certified  = getProperties().filter(p => p.universityCertified);

  document.getElementById("uni-pending-count").textContent    = pending.length;
  document.getElementById("uni-certified-count").textContent  = certified.length;

  const tbody = document.getElementById("uni-table-body");
  if (!tbody) return;

  if (pending.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;font-style:italic;">No hay inmuebles pendientes de certificación.</td></tr>`;
    return;
  }

  tbody.innerHTML = pending.map(p => `
    <tr>
      <td>
        <div class="table-prop-name">${p.title}</div>
        <div class="table-prop-addr">${p.location.split(",").slice(0,2).join(",")}</div>
      </td>
      <td>${p.landlordName}</td>
      <td>$${p.price}/mes</td>
      <td>${p.distanceToCampus} km</td>
      <td>
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.mapsQuery || p.location)}" target="_blank" class="btn btn-secondary btn-sm">Ver mapa</a>
      </td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="certifyProp(${p.id})">Certificar</button>
      </td>
    </tr>`).join("");
}

window.certifyProp = function(id) {
  const props = getProperties();
  const p = props.find(x => x.id === id); if (!p) return;
  p.universityCertified = true;
  p.universityCertifiedBy = "PUCEM";
  p.verificationReport = {
    inspectionDate: new Date().toISOString().split("T")[0],
    standards: {
      waterPressure: "Aprobado — Excelente (42 PSI)",
      internetSpeed: "Aprobado — Fibra Óptica 300 Mbps",
      fireSafety: "Aprobado — Certificado contra incendios",
      structure: "Aprobado — Inspector civil PUCEM"
    }
  };
  saveProperties(props);
  addNotif("Inmueble Certificado", `"${p.title}" ahora tiene el sello Homii Student PUCEM.`);
  renderUniPanel();
  addTlEntry("Certificación PUCEM Otorgada", `La administración validó "${p.title}".`, true);
  alert(`Certificación PUCEM otorgada a:\n"${p.title}"\n\nEl propietario y los estudiantes serán notificados.`);
};

function addTlEntry(title, desc, ok) {
  const tl = document.getElementById("uni-timeline");
  if (!tl) return;
  const d = document.createElement("div");
  d.className = "tl-item " + (ok ? "ok" : "");
  d.innerHTML = `<div class="tl-time">Ahora mismo</div><div class="tl-title">${title}</div><div class="tl-desc">${desc}</div>`;
  tl.insertBefore(d, tl.firstChild);
}

// ============================================================
// SOPORTE
// ============================================================

function setupSupport() {
  const btn  = document.getElementById("support-btn");
  const win  = document.getElementById("support-win");
  const close = document.getElementById("support-close");
  const send  = document.getElementById("support-send");
  const inp   = document.getElementById("support-inp");
  if (!btn || !win) return;

  btn.onclick = () => win.classList.toggle("open");
  close?.addEventListener("click", () => win.classList.remove("open"));

  const render = () => {
    const body = win.querySelector(".support-msgs");
    if (!body) return;
    body.innerHTML = APP.supportHistory.map(m =>
      `<div class="chat-bubble chat-${m.sender === "user" ? "out" : "in"}">${m.text}</div>`
    ).join("");
    body.scrollTop = body.scrollHeight;
  };

  const doSend = () => {
    const text = inp?.value.trim(); if (!text) return;
    APP.supportHistory.push({ sender: "user", text });
    if (inp) inp.value = "";
    render();
    setTimeout(() => {
      const t = text.toLowerCase();
      let reply = "Su consulta ha sido registrada. Un agente de Homii le responderá a la brevedad. También puede escribirnos a soporte@homii.ec";
      if (t.includes("verific") || t.includes("certific") || t.includes("pucem")) reply = "La certificación PUCEM se realiza mediante inspección presencial. Nuestro equipo de campo verifica agua, internet, electricidad y estructura. El proceso toma entre 3 y 5 días hábiles.";
      if (t.includes("precio") || t.includes("costo") || t.includes("comisión")) reply = "Homii es gratuito para arrendatarios. Para propietarios cobramos comisión solo al concretar el arrendamiento (5% del primer mes). El plan Destacado tiene un costo de $9.99 al mes.";
      if (t.includes("roomie") || t.includes("compañero")) reply = "La sección Buscar Compañero permite encontrar estudiantes de la PUCEM con quienes compartir el costo del arriendo. Puede publicar su perfil de forma gratuita.";
      if (t.includes("hola") || t.includes("buenas")) reply = "Buen día. Estoy disponible para ayudarle. Puede consultarme sobre verificaciones, arriendos, la sección Roomie o cualquier problema con su cuenta.";
      if (t.includes("disputa") || t.includes("problema") || t.includes("queja")) reply = "Lamentamos el inconveniente. Las disputas se resuelven en un máximo de 48 horas mediante nuestro equipo de mediación. Necesitamos el identificador de la propiedad y la descripción del problema.";
      APP.supportHistory.push({ sender: "bot", text: reply });
      render();
    }, 1200);
  };

  send?.addEventListener("click", doSend);
  inp?.addEventListener("keypress", e => { if (e.key === "Enter") doSend(); });
  render();
}

// ============================================================
// NOTIFICACIONES
// ============================================================

function setupNotifications() {
  const bell   = document.getElementById("bell-btn");
  const panel  = document.getElementById("notif-panel");
  const clear  = document.getElementById("notif-clear");

  bell?.addEventListener("click", e => {
    e.stopPropagation();
    panel?.classList.toggle("open");
    APP.notifications.forEach(n => n.unread = false);
    updateBellDot();
    renderNotifs();
  });

  clear?.addEventListener("click", () => {
    APP.notifications = [];
    updateBellDot();
    renderNotifs();
  });

  document.addEventListener("click", e => {
    if (panel && !panel.contains(e.target) && !bell?.contains(e.target)) {
      panel.classList.remove("open");
    }
  });

  renderNotifs();
  updateBellDot();
}

function renderNotifs() {
  const body = document.getElementById("notif-body");
  if (!body) return;
  body.innerHTML = APP.notifications.length === 0
    ? `<div class="notif-empty">Sin notificaciones pendientes.</div>`
    : APP.notifications.map(n => `
        <div class="notif-item ${n.unread ? "unread" : ""}">
          <div class="notif-title">${n.title}</div>
          <div class="notif-txt">${n.text}</div>
          <div class="notif-time">${n.time}</div>
        </div>`).join("");
}

function addNotif(title, text) {
  APP.notifications.unshift({ id: Date.now(), title, text, time: "Ahora mismo", unread: true });
  updateBellDot();
  renderNotifs();
}

function updateBellDot() {
  const dot = document.getElementById("bell-dot");
  if (dot) dot.style.display = APP.notifications.some(n => n.unread) ? "block" : "none";
}

// ============================================================
// ACTIVACIÓN ESTUDIANTIL
// ============================================================

function setupActivation() {
  document.querySelectorAll(".activation-trigger").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      document.getElementById("activation-popup")?.classList.add("open");
    });
  });
  document.getElementById("activation-close")?.addEventListener("click", () => {
    document.getElementById("activation-popup")?.classList.remove("open");
  });
  document.getElementById("activation-popup")?.addEventListener("click", e => {
    if (e.target.id === "activation-popup") document.getElementById("activation-popup").classList.remove("open");
  });
  document.getElementById("btn-activate")?.addEventListener("click", () => {
    document.getElementById("activation-popup")?.classList.remove("open");
    addNotif("Homii Student Activo", "Su cuenta estudiantil PUCEM ha sido activada exitosamente.");
    alert("Activación exitosa.\nAhora tiene acceso preferencial a los inmuebles certificados por la PUCEM.");
  });
}

// ============================================================
// UTILIDADES
// ============================================================

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

// Exponer al ámbito global
window.navigate = navigate;
window.openPropertyModal = openPropertyModal;
window.closePropertyModal = closePropertyModal;
window.openRoomieModal = openRoomieModal;
window.closeRoomieModal = closeRoomieModal;
window.openAuth = openAuth;
window.closeAuth = closeAuth;
window.logout = logout;
window.certifyProp = window.certifyProp;
window.filterListings = filterListings;
window.filterRoomies = filterRoomies;
