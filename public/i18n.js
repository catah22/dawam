const I18N = {
  he: {
    langName: "עברית",
    switchTo: "العربية",
    appName: "דוואם",
    appSub: "נוכחות עובדים • כניסה/יציאה למשמרת",

    loginTitle: "התחברות עובד/ת",
    loginHint: "הכניסו פרטים כדי להתחיל.",
    phoneLabel: "מספר (טלפון/מספר עובד)",
    phonePh: "+9725XXXXXXXX",
    passLabel: "סיסמה",
    passPh: "••••••••",
    loginBtn: "התחבר/י",
    tip: "טיפ: המערכת שולחת לבעל העסק הודעה על כניסה/יציאה עם השעה.",
    wrongCreds: "פרטים שגויים. נסו שוב.",

    hello: "שלום,",
    chooseAction: "בבקשה בחר/י פעולה.",
    checkIn: "כניסה למשמרת",
    checkOut: "יציאה מהמשמרת",
    status: "סטטוס",
    lastTime: "שעה אחרונה",
    connected: "מחובר/ת",
    logout: "התנתקות",
    savedIn: "נרשמה כניסה למשמרת ✅",
    alreadyOpen: "כבר קיימת כניסה פתוחה.",
    savedOut: "נרשמה יציאה מהמשמרת ✅",
    noOpen: "אין משמרת פתוחה או שיש שגיאה.",

    shiftHours: "שעות במשמרת",
    totalHours30: "סה״כ 30 ימים",
    workDays: "ימים שעבדתי (30 ימים)",

    adminLink: "כניסת מנהל",
    adminTitle: "כניסת מנהל",
    adminHint: "הזן סיסמת מנהל כדי להוסיף עובדים.",
    adminPassLabel: "סיסמת מנהל",
    adminLoginBtn: "התחברות",
    adminWrong: "סיסמה שגויה.",
    addEmpTitle: "הוספת עובד חדש",
    addEmpHint: "מלא שם מלא, מספר, וסיסמה לעובד.",
    fullName: "שם מלא",
    fullNamePh: "למשל: דוד כהן",
    addBtn: "הוסף עובד",
    adminLogout: "התנתקות מנהל",
    fillAll: "נא למלא את כל השדות.",
    addedOk: "עובד נוסף בהצלחה ✅",
    listTitle: "עובדים קיימים",
    refresh: "רענון",
    phoneCol: "מספר",
    nameCol: "שם"
  },

  ar: {
    langName: "العربية",
    switchTo: "עברית",
    appName: "دوام",
    appSub: "دوام الموظفين • تسجيل دخول/خروج",

    loginTitle: "تسجيل دخول الموظف",
    loginHint: "أدخل بياناتك للبدء.",
    phoneLabel: "رقم الموظف/الهاتف",
    phonePh: "+9725XXXXXXXX",
    passLabel: "كلمة المرور",
    passPh: "••••••••",
    loginBtn: "تسجيل الدخول",
    tip: "نصيحة: النظام يرسل إشعارًا لصاحب المتجر عند الدخول/الخروج مع الوقت.",
    wrongCreds: "بيانات غير صحيحة، حاول مرة أخرى.",

    hello: "مرحبًا،",
    chooseAction: "اختر العملية.",
    checkIn: "تسجيل دخول الدوام",
    checkOut: "تسجيل خروج الدوام",
    status: "الحالة",
    lastTime: "آخر وقت",
    connected: "متصل",
    logout: "تسجيل خروج",
    savedIn: "تم تسجيل الدخول ✅",
    alreadyOpen: "يوجد دخول مفتوح بالفعل.",
    savedOut: "تم تسجيل الخروج ✅",
    noOpen: "لا يوجد دوام مفتوح أو يوجد خطأ.",

    shiftHours: "ساعات الدوام",
    totalHours30: "مجموع 30 يوم",
    workDays: "الأيام اللي اشتغلتها (30 يوم)",

    adminLink: "دخول المدير",
    adminTitle: "دخول المدير",
    adminHint: "أدخل كلمة مرور المدير لإضافة موظفين.",
    adminPassLabel: "كلمة مرور المدير",
    adminLoginBtn: "دخول",
    adminWrong: "كلمة المرور غير صحيحة.",
    addEmpTitle: "إضافة موظف جديد",
    addEmpHint: "أدخل الاسم الكامل والرقم وكلمة المرور.",
    fullName: "الاسم الكامل",
    fullNamePh: "مثال: محمد أحمد",
    addBtn: "إضافة موظف",
    adminLogout: "خروج المدير",
    fillAll: "رجاءً عبّئ كل الحقول.",
    addedOk: "تمت الإضافة بنجاح ✅",
    listTitle: "الموظفون الحاليون",
    refresh: "تحديث",
    phoneCol: "الرقم",
    nameCol: "الاسم"
  }
};

function getLang() {
  return localStorage.getItem("dawam_lang") || "he";
}
function setLang(lang) {
  localStorage.setItem("dawam_lang", lang);
}
function t(key) {
  const lang = getLang();
  return (I18N[lang] && I18N[lang][key]) || I18N.he[key] || key;
}
