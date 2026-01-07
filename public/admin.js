let token = "";

const adminLogin = document.getElementById("adminLogin");
const adminPanel = document.getElementById("adminPanel");

const adminPass = document.getElementById("adminPass");
const btnAdminLogin = document.getElementById("btnAdminLogin");
const adminToast = document.getElementById("adminToast");

const fullName = document.getElementById("fullName");
const phone = document.getElementById("phone");
const empPass = document.getElementById("empPass");
const btnAddEmp = document.getElementById("btnAddEmp");
const btnAdminLogout = document.getElementById("btnAdminLogout");
const panelToast = document.getElementById("panelToast");

const langBtn = document.getElementById("langBtn");
const btnRefresh = document.getElementById("btnRefresh");
const empList = document.getElementById("empList");

function toast(el, msg, err=false){
  el.textContent = msg || "";
  el.style.color = err ? "rgba(255,220,220,0.95)" : "rgba(234,242,255,0.92)";
}

function applyI18n(){
  const lang = getLang();
  document.documentElement.lang = (lang === "ar") ? "ar" : "he";
  document.documentElement.dir = "rtl";

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  fullName.placeholder = t("fullNamePh");
  phone.placeholder = t("phonePh");
  empPass.placeholder = t("passPh");

  langBtn.textContent = t("switchTo");
}

langBtn.addEventListener("click", () => {
  const next = getLang() === "he" ? "ar" : "he";
  setLang(next);
  applyI18n();
});

applyI18n();

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

async function fetchEmployees(){
  if (!token) return;
  empList.textContent = "…";
  const r = await fetch("/api/admin/employees", {
    headers: { "Authorization": "Bearer " + token }
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) {
    empList.textContent = "";
    return;
  }

  const rows = j.employees || [];
  if (rows.length === 0) {
    empList.textContent = "";
    return;
  }

  const header = `<div style="display:flex; gap:10px; font-weight:800; margin-bottom:8px;">
    <div style="flex:1">${t("nameCol")}</div>
    <div style="width:160px">${t("phoneCol")}</div>
  </div>`;

  const items = rows.map(e => `
    <div style="display:flex; gap:10px; padding:8px 0; border-top:1px solid rgba(255,255,255,0.10);">
      <div style="flex:1">${escapeHtml(e.full_name || "")}</div>
      <div style="width:160px; opacity:.85">${escapeHtml(e.phone || "")}</div>
    </div>
  `).join("");

  empList.innerHTML = header + items;
}

btnAdminLogin.addEventListener("click", async () => {
  toast(adminToast, "");
  const password = adminPass.value.trim();
  if (!password) return toast(adminToast, t("fillAll"), true);

  const r = await fetch("/api/admin/login", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ password })
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) return toast(adminToast, t("adminWrong"), true);

  token = j.token;
  adminLogin.classList.add("hidden");
  adminPanel.classList.remove("hidden");
  toast(panelToast, "");
  await fetchEmployees();
});

btnAddEmp.addEventListener("click", async () => {
  toast(panelToast, "");
  const body = {
    full_name: fullName.value.trim(),
    phone: phone.value.trim(),
    password: empPass.value
  };

  if (!body.full_name || !body.phone || !body.password) {
    return toast(panelToast, t("fillAll"), true);
  }

  const r = await fetch("/api/admin/employees", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify(body)
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) return toast(panelToast, j.message || "Error", true);

  toast(panelToast, t("addedOk"));
  fullName.value = "";
  phone.value = "";
  empPass.value = "";
  await fetchEmployees();
});

btnRefresh.addEventListener("click", fetchEmployees);

btnAdminLogout.addEventListener("click", () => {
  token = "";
  adminPanel.classList.add("hidden");
  adminLogin.classList.remove("hidden");
  adminPass.value = "";
  empList.textContent = "";
  toast(adminToast, "");
  toast(panelToast, "");
});
