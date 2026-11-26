/* SmileDent | propuesta de diseño | Diseñado por Kevin Campos Vega
   Todo el movimiento y la reserva de citas viven aquí. */

// 1) Número de WhatsApp (demo: número de prueba de Kevin). Cambiar por el de la clínica, con código de país y sin signos.
const WHATSAPP = "50670323812";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

$$("[data-wa]").forEach(a => {
  a.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(a.dataset.wa)}`;
  a.target = "_blank"; a.rel = "noopener";
});

// 2) Titulares: suben palabra por palabra
$$(".split").forEach(el => {
  const walk = (node) => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t.trim()) { frag.append(t); return; }
          const w = document.createElement("span"); w.className = "w";
          const s = document.createElement("span"); s.textContent = t; w.append(s); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
  $$(".w>span", el).forEach((s, i) => s.style.setProperty("--i", i));
});

// 3) Entrada al hacer scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { threshold: .15, rootMargin: "0px 0px -5% 0px" });
$$(".rise,.split,.frame").forEach(el => io.observe(el));

// Fotos reales opcionales: el <img> se crea solo si el archivo existe en img/.
// Así la página se ve completa con o sin fotos, y no hay que tocar el código al agregarlas.
const probe = (src) => new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth > 0); i.onerror = () => res(false); i.src = src; });
const known = new Map();
const exists = (src) => { if (!known.has(src)) known.set(src, probe(src)); return known.get(src); };
const makeImg = (src, alt) => { const i = new Image(); i.src = src; i.alt = alt || ""; i.decoding = "async"; return i; };
// Retrato de la doctora: portada y sección "Conocé a la doctora"
exists("img/doctora.jpg").then(ok => {
  if (!ok) return;
  $$(".who, .doctor").forEach(box => {
    $("[data-slot]", box).prepend(makeImg("img/doctora.jpg", "Dra. Treisy Porras"));
    box.hidden = false;
  });
});
// Marco de la primera visita: las fotos que existan se alternan con un fundido
$$("[data-frame][data-photos]").forEach(frame => {
  const srcs = frame.dataset.photos.split(/\s+/).filter(Boolean);
  Promise.all(srcs.map(exists)).then(oks => {
    const live = srcs.filter((_, k) => oks[k]).map((s, k) => makeImg(s, k ? "" : frame.dataset.alt));
    if (!live.length) return;
    live.forEach(i => frame.append(i));
    frame.classList.add("has-img");
    let k = 0; requestAnimationFrame(() => live[0].classList.add("on"));
    if (live.length > 1 && !reduce) setInterval(() => { live[k].classList.remove("on"); k = (k + 1) % live.length; live[k].classList.add("on"); }, 5200);
  });
});

/* =====================================================================
   4) MOVIMIENTO: titular en escalera, diente, cinta y muro de reseñas
   ===================================================================== */
const hero = $(".hero"), stage = $("#stage"), nav = $("#nav");

// Cinta de frases: se desplaza con el scroll (no sola)
const tickerEl = $(".ticker"), tickerTrack = $(".ticker-track");
function moveTicker() {
  if (reduce || !tickerEl) return;
  const r = tickerEl.getBoundingClientRect(), half = tickerTrack.scrollWidth / 2;
  const prog = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1);
  tickerTrack.style.setProperty("--tx", (-half * .55 * prog).toFixed(1) + "px");
}

// Muro de reseñas: tres columnas que suben y bajan en sentidos opuestos
const wall = $("#wall"), wcols = $$(".wcol", wall || document);
const wide = matchMedia("(min-width: 1001px)");
function moveWall() {
  if (!wall) return;
  if (reduce || !wide.matches) { wcols.forEach(c => c.style.removeProperty("--ty")); return; }
  const r = wall.getBoundingClientRect();
  const prog = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1) - .5;
  wcols.forEach(c => c.style.setProperty("--ty", (prog * 2 * (+c.dataset.speed || 0) * 90).toFixed(1) + "px"));
}

// Barra, botón de WhatsApp, titular que converge, línea de pasos
const steps = $(".steps");
let ticking = false;
function onScroll() {
  const y = scrollY, h = hero.offsetHeight;
  nav.classList.toggle("solid", y > 24);
  document.documentElement.classList.toggle("past-hero", y > h * .7);
  if (!reduce) {
    const p = clamp(y / (h * .8), 0, 1);
    stage.style.setProperty("--hs", p.toFixed(3));
    stage.style.setProperty("--py", (-y * .1).toFixed(1));
  }
  moveTicker(); moveWall();
  if (steps) {
    const r = steps.getBoundingClientRect();
    steps.style.setProperty("--prog", clamp((innerHeight * .65 - r.top) / r.height, 0, 1).toFixed(3));
  }
  ticking = false;
}
addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
addEventListener("resize", onScroll);
onScroll();


/* =====================================================================
   5) RESERVA DE CITAS EN LÍNEA
   - Sin ENDPOINT: modo demostración (horarios simulados, no se envía nada).
   - Con ENDPOINT (URL del Apps Script, ver carpeta apps-script/): lee los
     horarios ocupados y guarda la cita en la hoja de Google de la doctora.
   ===================================================================== */
const BOOKING = {
  endpoint: "",                       // <-- pegar aquí la URL del Apps Script publicado
  whatsappConfirm: false,             // true solo cuando la confirmación por WhatsApp esté activada en Code.gs
  slotMinutes: 60,                    // duración de cada cita
  daysAhead: 14,                      // cuántos días hacia adelante se puede reservar
  hours: { 1:[9,18], 2:[9,18], 3:[9,18], 4:[9,18], 5:[9,18], 6:[9,14] },  // 0 = domingo (cerrado). Hora de inicio y cierre.
  services: [                         // ejemplo: ajustar a lo que ofrece la clínica
    ["Valoración y limpieza","i-check"], ["Odontología para niños y bebés","i-baby"],
    ["Restauración (resinas)","i-leaf"], ["Estética dental","i-eye"],
    ["Dolor o urgencia","i-feather"], ["No estoy seguro","i-chat"]
  ]
};
(() => {
  const card = $("#book");
  if (!card) return;
  const st = { step: 1, service: "", date: "", time: "", pre: null };
  const DAYS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  const DS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"], MS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const MFULL = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","setiembre","octubre","noviembre","diciembre"];
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const fmt12 = (t) => { const [h,m] = t.split(":").map(Number); return `${((h+11)%12)+1}:${pad(m)} ${h<12?"a. m.":"p. m."}`; };
  const longDate = (s) => { const d = new Date(s+"T12:00"); return `${DAYS[d.getDay()]} ${d.getDate()} de ${MFULL[d.getMonth()]}`; };

  // Servicios
  const svc = $("#svc");
  BOOKING.services.forEach(([name, icon]) => {
    const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-pressed", "false"); b.dataset.name = name;
    b.innerHTML = `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#${icon}"/></svg><span></span>`;
    $("span", b).textContent = name;
    b.onclick = () => { st.service = name; $$("button", svc).forEach(x => x.setAttribute("aria-pressed", x === b)); sync(); };
    svc.append(b);
  });

  // Días
  const daysEl = $("#days"), slotsEl = $("#slots");
  const slotsFor = (d) => {
    const h = BOOKING.hours[d.getDay()]; if (!h) return [];
    const out = [], now = new Date();
    for (let m = h[0]*60; m + BOOKING.slotMinutes <= h[1]*60; m += BOOKING.slotMinutes) {
      const t = `${pad(Math.floor(m/60))}:${pad(m%60)}`, at = new Date(`${iso(d)}T${t}`);
      if (at - now > 60*60*1000) out.push(t);            // mínimo 1 hora de anticipación
    }
    return out;
  };
  const today = new Date(); today.setHours(0,0,0,0);
  const openDays = [];
  for (let i = 0; i <= BOOKING.daysAhead; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    if (!BOOKING.hours[d.getDay()] || !slotsFor(d).length) continue;
    openDays.push({ d, i });
    const b = document.createElement("button"); b.type = "button"; b.setAttribute("role","option"); b.setAttribute("aria-selected","false"); b.dataset.date = iso(d);
    b.innerHTML = `<small>${i===0?"Hoy":DS[d.getDay()]}</small><b>${d.getDate()}</b><span>${MS[d.getMonth()]}</span>`;
    b.onclick = () => { st.date = iso(d); st.time = ""; $$("button", daysEl).forEach(x => x.setAttribute("aria-selected", x === b)); loadSlots(d); sync(); };
    daysEl.append(b);
  }

  // Horarios ocupados: demo simulado o consulta real al Apps Script
  const demoTaken = (date) => { let h = 0; for (const c of date) h = (h*31 + c.charCodeAt(0)) | 0; return (t) => ((h ^ (parseInt(t)*2654435761)) >>> 0) % 100 < 28; };
  async function takenFor(date) {
    if (!BOOKING.endpoint) { await new Promise(r => setTimeout(r, 450)); const f = demoTaken(date); return (t) => f(t); }
    const r = await fetch(`${BOOKING.endpoint}?action=slots&date=${date}`); const j = await r.json();
    const set = new Set(j.taken || []); return (t) => set.has(t);
  }
  async function loadSlots(d) {
    slotsEl.innerHTML = '<div class="sk"></div>'.repeat(6);
    try {
      const isTaken = await takenFor(iso(d)), list = slotsFor(d);
      slotsEl.innerHTML = "";
      list.forEach(t => {
        const b = document.createElement("button"); b.type = "button"; b.textContent = fmt12(t); b.dataset.time = t; b.setAttribute("aria-pressed","false");
        if (isTaken(t)) b.disabled = true;
        b.onclick = () => { st.time = t; $$("button", slotsEl).forEach(x => x.setAttribute("aria-pressed", x === b)); sync(); };
        slotsEl.append(b);
      });
      if (!$("button:not(:disabled)", slotsEl)) slotsEl.innerHTML = '<p class="hint">Ese día ya no tiene espacios. Probá con otro.</p>';
      // Si la persona llegó desde una hora sugerida del inicio, queda marcada
      if (st.pre && st.pre.date === iso(d)) {
        const b = $(`button[data-time="${st.pre.time}"]:not(:disabled)`, slotsEl);
        if (b) b.click();
        clearPre();
      }
    } catch { slotsEl.innerHTML = '<p class="hint">No pudimos cargar los horarios. Revisá tu conexión e intentá de nuevo.</p>'; }
  }

  // Hora sugerida desde el inicio
  const preEl = $("#pre");
  function clearPre() { st.pre = null; preEl.hidden = true; preEl.textContent = ""; }
  function showPre() {
    preEl.textContent = `Hora elegida: ${longDate(st.pre.date)}, ${fmt12(st.pre.time)} Falta escoger el servicio.`;
    const q = document.createElement("button"); q.type = "button"; q.textContent = "Quitar";
    q.onclick = () => { clearPre(); };
    preEl.append(q); preEl.hidden = false;
  }

  // Navegación entre pasos
  const next = $("#bNext"), back = $("#bBack"), form = $("#bform"), err = $("#berr");
  function show(n) {
    st.step = n;
    $$(".b-pane", card).forEach(p => p.classList.toggle("on", +p.dataset.step === n));
    $$(".b-steps li", card).forEach(li => { const s = +li.dataset.s; li.classList.toggle("on", s === Math.min(n,3)); li.classList.toggle("done", s < n); });
    back.hidden = n === 1 || n === 4; $("#bnav").hidden = n === 4;
    next.textContent = n === 3 ? "Confirmar mi cita" : "Continuar";
    if (n === 3) $("#sum").textContent = `${st.service} · ${longDate(st.date)} · ${fmt12(st.time)}`;
    if (n === 2 && st.pre) { const b = $(`button[data-date="${st.pre.date}"]`, daysEl); if (b) b.click(); else clearPre(); }
    sync();
  }
  function sync() { next.disabled = (st.step === 1 && !st.service) || (st.step === 2 && !(st.date && st.time)); }
  back.onclick = () => show(st.step - 1);
  next.onclick = () => st.step < 3 ? (show(st.step + 1), card.scrollIntoView({behavior: reduce ? "auto" : "smooth", block:"start"})) : submit();

  function resetAll() {
    st.service = ""; st.date = ""; st.time = ""; clearPre();
    $$("button", svc).forEach(x => x.setAttribute("aria-pressed", "false"));
    $$("button", daysEl).forEach(x => x.setAttribute("aria-selected", "false"));
    slotsEl.innerHTML = '<p class="hint">Primero escogé un día.</p>';
    form.reset(); err.textContent = ""; next.disabled = false;
  }
  const goBook = () => $("#cita").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });

  async function submit() {
    err.textContent = ""; $$("input,textarea", form).forEach(x => x.classList.remove("bad"));
    const f = Object.fromEntries(new FormData(form)), digits = f.phone.replace(/\D/g, "").replace(/^506/, "");
    if (f.name.trim().length < 3) { form.name.classList.add("bad"); err.textContent = "Escribí tu nombre completo."; return; }
    if (digits.length !== 8) { form.phone.classList.add("bad"); err.textContent = "Revisá tu número: debe tener 8 dígitos."; return; }
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) { form.email.classList.add("bad"); err.textContent = "Ese correo no parece válido."; return; }
    next.disabled = true; next.textContent = "Reservando…";
    const feel = f.feel ?? "";
    const notes = [feel ? `Cómo llega a la visita: ${feel}.` : "", (f.notes || "").trim()].filter(Boolean).join(" ");
    const data = { date: st.date, time: st.time, service: st.service, name: f.name.trim(), phone: digits, email: (f.email||"").trim(), notes };
    try {
      if (BOOKING.endpoint) {
        const r = await fetch(BOOKING.endpoint, { method: "POST", body: JSON.stringify(data) }); const j = await r.json();
        if (!j.ok) { if (j.error === "taken") { err.textContent = "Alguien acaba de tomar esa hora. Escogé otra, por favor."; show(2); loadSlots(new Date(st.date+"T12:00")); return; } throw new Error(j.error); }
      } else await new Promise(r => setTimeout(r, 700));
      done(data, feel);
    } catch { err.textContent = "No pudimos guardar tu cita. Intentá de nuevo en un momento."; next.disabled = false; next.textContent = "Confirmar mi cita"; }
  }
  function done(d, feel) {
    show(4);
    const ok = $("#okSum"); ok.textContent = "";
    const line = (txt, strong) => { const e = document.createElement(strong ? "b" : "span"); e.textContent = txt; ok.append(e, document.createElement("br")); };
    line(d.service, true); line(`${longDate(d.date)} a las ${fmt12(d.time)}`); line(`A nombre de ${d.name}`);
    if (feel) line(`La doctora sabrá que llegás: ${feel.toLowerCase()}`);
    ok.lastChild.remove();
    const s = d.date.replace(/-/g,"") + "T" + d.time.replace(":","") + "00";
    const e = new Date(`${d.date}T${d.time}`); e.setMinutes(e.getMinutes() + BOOKING.slotMinutes);
    const end = iso(e).replace(/-/g,"") + "T" + pad(e.getHours()) + pad(e.getMinutes()) + "00";
    const ics = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SmileDent//Cita//ES","BEGIN:VEVENT",`UID:${Date.now()}@smiledent`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").slice(0,15)}Z`,
      `DTSTART;TZID=America/Costa_Rica:${s}`,`DTEND;TZID=America/Costa_Rica:${end}`,`SUMMARY:Cita en SmileDent (${d.service})`,"LOCATION:SmileDent, Grecia, Alajuela","END:VEVENT","END:VCALENDAR"].join("\r\n");
    $("#icsBtn").href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const c = $("#chgBtn"); c.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola, necesito cambiar mi cita del ${longDate(d.date)} a las ${fmt12(d.time)} (${d.name}).`)}`; c.target = "_blank"; c.rel = "noopener";
    $("#demoNote").hidden = !!BOOKING.endpoint;
    const ch = !BOOKING.endpoint ? "" : BOOKING.whatsappConfirm ? "Te enviamos la confirmación por WhatsApp" + (d.email ? " y por correo." : ".") : (d.email ? "Te enviamos la confirmación por correo." : "");
    $("#chan").textContent = ch;
  }

  // Desde el resto de la página: una fila de servicios o una hora sugerida
  window.SmileBook = {
    preselect(date, time) {
      if (st.step === 4) resetAll();
      st.pre = { date, time }; showPre();
      if (st.service) show(2); else show(1);
      goBook();
    },
    setService(name) {
      if (st.step === 4) resetAll();
      const b = $$("button", svc).find(x => x.dataset.name === name);
      if (b) b.click();
      show(2); goBook();
    }
  };
  $$("[data-svc]").forEach(b => b.addEventListener("click", () => window.SmileBook.setService(b.dataset.svc)));

  // Horas libres reales (o simuladas en la demo) en el primer pantallazo: la primera de cada uno de los próximos días
  (async () => {
    const list = $("#heroSlots");
    try {
      const days = openDays.slice(0, 5);
      const taken = await Promise.all(days.map(({ d }) => takenFor(iso(d))));
      const picks = [];
      days.forEach(({ d, i }, k) => {
        if (picks.length >= 3) return;
        const t = slotsFor(d).find(x => !taken[k](x));
        if (t) picks.push({ d, i, t });
      });
      if (!picks.length) throw new Error("none");
      list.innerHTML = "";
      picks.forEach(({ d, i, t }) => {
        const li = document.createElement("li"), b = document.createElement("button"); b.type = "button";
        const day = i === 0 ? "Hoy" : i === 1 ? "Mañana" : `${DS[d.getDay()]} ${d.getDate()}`;
        b.textContent = `${day} · ${fmt12(t)}`;
        b.onclick = () => window.SmileBook.preselect(iso(d), t);
        li.append(b); list.append(li);
      });
    } catch { $(".open").hidden = true; }
  })();
  show(1);
})();
