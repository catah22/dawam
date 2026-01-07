const api = {
  auth: (phone, password) => fetch("/api/auth", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ phone, password })
  }).then(r => r.json().then(j => ({ ok:r.ok, ...j }))),

  checkin: (employee_id) => fetch("/api/checkin", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ employee_id })
  }).then(r => r.json().then(j => ({ ok:r.ok, ...j }))),

  checkout: (employee_id) => fetch("/api/checkout", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ employee_id })
  }).then(r => r.json().then(j => ({ ok:r.ok, ...j }))),

  summary: (employee_id) => fetch(`/api/summary?employee_id=${encodeURIComponent(employee_id)}`)
    .then(r => r.json().then(j => ({ ok:r.ok, ...j })))
};

const loginCard = document.getElementById("loginCard");
const shiftCard = document.getElementById("shiftCard");

const phoneInput = document.getElementById("phone");
const passInput  = document.getElementById("password");

const btnLogin = document.getElementById("btnLogin");
const empName = document.getElementById("empName");
const btnCheckIn = document.getElementById("btnCheckIn");
const btnCheckOut = document.getElementById("btnCheckOut");
const btnLogout = document.getElementById("btnLogout");

const toast = document.getElementById("toast");
const toast2 = document.getElementById("toast2");
const statusText = document.getElementById("statusText");
const lastTime = document.getElementById("lastTime");

const shiftHoursVal = document.getElementById("shiftHoursVal");
const totalHoursVal = document.getElementById("totalHoursVal");
const daysList = document.getElementById("daysList");

const langBtn = document.getElementById("langBtn");

document.getElementById("year").textContent = new Date().getFullYear();

let currentEmployee = null;

function showToast(el, msg, isError=false){
  el.textContent = msg || "";
  el.style.color = isError ? "rgba(255,220,220,0.95)" : "rgba(234,242,255,0.92)";
}

function setLoading(btn, loading){
  btn.disabled = loading;
  btn.style.opacity = loading ? 0.85 : 1;
  btn.textContent = loading ? "…" : btn.dataset.label;
}

function applyI18n(){
  const lang = getLang();
  document.documentElement.lang = (lang === "ar") ? "ar" : "he";
  document.documentElement.dir = "rtl";

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  phoneInput.placeholder = t("phonePh");
  passInput.placeholder = t("passPh");

  btnLogin.dataset.label = t("loginBtn");
  btnCheckIn.dataset.label = t("checkIn");
  btnCheckOut.dataset.label = t("checkOut");

  statusText.textContent = t("connected");
  langBtn.textContent = t("switchTo");
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

async function refreshSummary(){
  if (!currentEmployee) return;
  const r = await api.summary(currentEmployee.id).catch(() => ({ ok:false }));
  if (!r.ok) return;

  totalHoursVal.textContent = (r.total_hours ?? "—") + "h";

  if (!r.days || r.days.length === 0) {
    daysList.textContent = "—";
    return;
  }

  daysList.innerHTML = r.days
    .slice(0, 60)
    .map(d => `<div>${escapeHtml(d.date)} — ${escapeHtml(d.hours)}h</div>`)
    .join("");
}

[btnLogin, btnCheckIn, btnCheckOut].forEach(b => b.dataset.label = b.textContent.trim());

langBtn.addEventListener("click", () => {
  const next = getLang() === "he" ? "ar" : "he";
  setLang(next);
  applyI18n();
});

applyI18n();

btnLogin.addEventListener("click", async () => {
  showToast(toast, "");

  const phone = (phoneInput.value || "").trim();
  const password = (passInput.value || "");

  if (!phone || !password) return showToast(toast, t("fillAll"), true);

  setLoading(btnLogin, true);
  const res = await api.auth(phone, password).catch(() => ({ ok:false }));
  setLoading(btnLogin, false);

  if (!res.ok) return showToast(toast, t("wrongCreds"), true);

  currentEmployee = res.employee;
  empName.textContent = currentEmployee.full_name || "";
  statusText.textContent = t("connected");
  lastTime.textContent = "—";
  shiftHoursVal.textContent = "—";
  totalHoursVal.textContent = "—";
  daysList.textContent = "—";

  loginCard.classList.add("hidden");
  shiftCard.classList.remove("hidden");

  // Auto check-in immediately
  showToast(toast2, "");
  setLoading(btnCheckIn, true);
  const ci = await api.checkin(currentEmployee.id).catch(() => ({ ok:false }));
  setLoading(btnCheckIn, false);

  if (ci.ok) {
    lastTime.textContent = ci.time || "—";
    showToast(toast2, ci.already ? t("alreadyOpen") : t("savedIn"));
    await refreshSummary();
  } else {
    showToast(toast2, "Server error", true);
  }
});

btnCheckIn.addEventListener("click", async () => {
  if (!currentEmployee) return;
  showToast(toast2, "");
  setLoading(btnCheckIn, true);
  const ci = await api.checkin(currentEmployee.id).catch(() => ({ ok:false }));
  setLoading(btnCheckIn, false);

  if (ci.ok) {
    lastTime.textContent = ci.time || "—";
    showToast(toast2, ci.already ? t("alreadyOpen") : t("savedIn"));
    await refreshSummary();
  } else {
    showToast(toast2, "Server error", true);
  }
});

btnCheckOut.addEventListener("click", async () => {
  if (!currentEmployee) return;
  showToast(toast2, "");
  setLoading(btnCheckOut, true);
  const co = await api.checkout(currentEmployee.id).catch(() => ({ ok:false }));
  setLoading(btnCheckOut, false);

  if (co.ok) {
    lastTime.textContent = co.time || "—";
    if (co.shift_hours != null) shiftHoursVal.textContent = co.shift_hours + "h";
    if (co.total_hours_30d != null) totalHoursVal.textContent = co.total_hours_30d + "h";
    showToast(toast2, `${t("savedOut")} | ${t("shiftHours")}: ${co.shift_hours ?? "—"}h`);
    await refreshSummary();
  } else {
    showToast(toast2, t("noOpen"), true);
  }
});

btnLogout.addEventListener("click", () => {
  currentEmployee = null;
  phoneInput.value = "";
  passInput.value = "";
  showToast(toast, "");
  showToast(toast2, "");
  shiftCard.classList.add("hidden");
  loginCard.classList.remove("hidden");
  phoneInput.focus();
});

passInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnLogin.click();
});
