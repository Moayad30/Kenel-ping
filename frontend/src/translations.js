export const translations = {
  ar: {
    // Header
    appName: "Kernel Ping",
    appSubtitle: "نظام النداء والإذاعة الصوتي لمكتب كيرنال تك",
    badgeLabel: "كيرنال بينغ",
    statusReady: "البفلة جاهزة",
    statusSpeaking: "قيد النطق الآن بالمكتب",
    statusQueued: "في الطابور",
    volume: "مستوى الصوت",
    cooldownNotice: "مهلة التكرار",
    themeToggle: "تبديل المظهر",
    langToggle: "English",

    // Search & Filter
    searchPlaceholder: "ابحث عن جملة، تنبيه، أو أمر إذاعي...",
    allCategories: "الكل",
    presetsCount: "جملة متاحة للاستجابة الفورية",

    // Presets Grid
    quickAlertsTitle: "شبكة التنبيهات السريعة",
    quickAlertsSubtitle: "أوامر صوتية جاهزة بنقرة واحدة بدون تأخير",
    speakButton: "إذاعة النداء",
    cachedBadge: "مخزن محلياً",
    playingBadge: "جاري التشغيل...",

    // Custom Speech Box
    freeSpeechTitle: "صندوق النطق الحر",
    freeSpeechSubtitle: "تحويل أي نص إلى كلام مسموع بالمكتب عبر الذكاء الاصطناعي",
    freeSpeechPlaceholder: "اكتب رسالتك هنا ليتم نطقها في ارجاء المكتب",
    quickSuggestions: "اقتراحات سريعة:",
    charLimit: "حرف",
    speakNowButton: "نطق الرسالة الآن",
    speakingSubmitting: "جاري الإرسال...",
    tashkeelBtn: "تشكيل النص بالذكاء الاصطناعي ✨",
    tashkeelSuccess: "تم تشكيل النص بدقة عالية بنجاح ✨",
    tashkeelProcessing: "جاري التشكيل...",
    ctrlEnterHint: "Ctrl + Enter للإرسال الفوري",

    // Callout Box
    calloutTitle: "استدعاء الأجهزة والأفراد",
    calloutSubtitle: "توجيه نداء عاجل ومخصص باسم الشخص أو الدور الوظيفي",
    targetLabel: "الجهة أو الشخص المستدعى:",
    messageLabel: "الرسالة أو الإجراء المطلوب:",
    callMessagePlaceholder: "مثال: يرجى الحضور فوراً إلى قاعة السيرفرات أو الاجتماعات",
    callButton: "إرسال استدعاء عاجل 📢",
    callSubmitting: "جاري الاستدعاء...",
    callTargets: [
      "المهندس المناوب (On-Call)",
      "فريق الديف أوبس والبنية التحتية",
      "قائد الفريق التقني (Tech Lead)",
      "فريق تطوير الواجهات (Frontend)",
      "فريق الباك إند (Backend Team)",
      "إدارة المكتب والاستقبال",
      "فريق أمن المعلومات (Security)"
    ],

    // Toasts & Alerts
    cooldownWarning: "يرجى الانتظار {seconds} ثانية قبل إرسال نداء آخر منعاً للإزعاج",
    speakSuccess: "تم إطلاق نداء \"{title}\" بنجاح 🔊",
    customSuccess: "تم إرسال النص إلى إذاعة المكتب 🎙️",
    callSuccess: "تم إطلاق استدعاء {target} في أرجاء المكتب 📢",
    errorNetwork: "تعذر الاتصال بخادم الصوت",
    errorGeneric: "حدث خطأ أثناء معالجة الطلب",

    // Footer
    footerText: "نظام Kernel Ping © 2026 - بيئة الاتصال الصوتي الداخلي لمكتب كيرنال تك",

    // Admin Common
    adminTitle: "Stealth Admin Center",
    adminSubtitle: "مركز الإدارة والتحكم بهندسة الصوت والأنظمة الداخلية",
    adminBadge: "لوحة تحكم مشفرة",
    backToPublic: "الواجهة العامة",
    logout: "تسجيل الخروج",
    saveChanges: "حفظ التعديلات",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    actions: "إجراءات",
    status: "الحالة",

    // Admin Tabs
    tabAudio: "إعدادات وهندسة الصوت",
    tabCategories: "إدارة التصنيفات",
    tabPresets: "إدارة الجمل والتخزين (Presets CRUD)",
    tabAudit: "سجل العمليات والتدقيق (Activity Audit)",

    // Admin Audio Settings
    serverVolumeTitle: "صوت السيرفر الرئيسي (PipeWire / WirePlumber)",
    serverVolumeDesc: "التحكم المباشر بمستوى صوت مخرج الصوت الافتراضي (Default Sink) بسلاسة لسلك AUX أو البلوتوث.",
    voiceSettingsTitle: "أصوات النطق وتقليل أخطاء الكلام (TTS & Pronunciation)",
    voiceArLabel: "الصوت العربي الأساسي (Arabic Voice):",
    voiceEnLabel: "الصوت الإنجليزي الأساسي (English Voice):",
    testVoiceBtn: "تجربة الصوت ▶",
    testingVoice: "جاري التجربة...",
    smartPronunciationLabel: "المعالج الصوتي الذكي (Smart Pronunciation Normalizer):",
    smartPronunciationDesc: "توسيع الاختصارات البرمجية الشائعة (CI/CD, PR, DevOps, API) وإزالة الرموز التعبيرية تلقائياً لمنع أي تعثر بالنطق.",
    chimeSettingsTitle: "نغمات التنبيه وإيقاظ البلوتوث (Chimes & Bluetooth)",
    preChimeLabel: "تفعيل نغمة التنبيه المسبقة (Pre-Announcement Chime)",
    preChimeDesc: "تشغيل نغمة مميزة لجذب الانتباه قبل بدء الكلام",
    chimeToneLabel: "اختيار نوع النغمة:",
    testTone: "تجربة النغمة ▶",
    bluetoothWakeupLabel: "وضع إيقاظ البلوتوث الاستباقي (Bluetooth Wake-up)",
    bluetoothWakeupDesc: "إرسال نغمة ومهلة 400ms صمت لتنشيط مكبر الصوت A2DP ومستقبل البلوتوث قبل نطق الكلمات",
    cooldownSettingsTitle: "مانع الإزعاج والتكرار (Spam Cooldown)",
    cooldownToggleLabel: "تفعيل مانع الإزعاج بين النداءات",
    cooldownDurationLabel: "مهلة التكرار المحددة:",
    secondsUnit: "ثانية",

    // Admin Categories CRUD
    categoriesTitle: "إدارة تصنيفات النداءات",
    categoriesDesc: "إضافة وتعديل وحذف التصنيفات لتنظيم الجمل بالواجهة العامة",
    addCategoryBtn: "إضافة تصنيف جديد",
    catIdCol: "المعرف (ID)",
    catNameArCol: "الاسم بالعربية",
    catNameEnCol: "الاسم بالإنجليزية",
    catIconCol: "الأيقونة",
    catColorCol: "اللون",
    catOrderCol: "الترتيب",
    catPresetsCountCol: "عدد الجمل",
    addCategoryModalTitle: "إضافة تصنيف جديد",
    editCategoryModalTitle: "تعديل التصنيف",
    confirmDeleteCategory: "هل أنت متأكد من حذف هذا التصنيف؟",

    // Admin Presets CRUD
    presetsAdminTitle: "إدارة الجمل والتخزين المسبق (Audio Caching)",
    presetsAdminDesc: "توليد ملفات MP3 مسبقاً بزمن استجابة صفر ودون الاعتماد على الإنترنت",
    rebuildAllCacheBtn: "إعادة توليد وتخزين كافة الأصوات",
    addPresetBtn: "إضافة جملة جديدة",
    presetIdCol: "المعرف (ID)",
    presetTitleCol: "العنوان",
    presetCategoryCol: "التصنيف",
    presetTextCol: "النص المنطوق",
    presetCacheCol: "التخزين الصوتي",
    cacheArLabel: "عربي MP3",
    cacheEnLabel: "إنجليزي MP3",
    addPresetModalTitle: "إضافة جملة نداء جديدة",
    editPresetModalTitle: "تعديل جملة النداء",
    rebuildPresetCacheBtn: "إعادة بناء الصوت",

    // Admin Audit
    auditTitle: "سجل العمليات والتدقيق اللحظي (Audit Trail)",
    totalCalls: "إجمالي النداءات المنفذة",
    presetCalls: "نداءات الجمل الثابتة",
    customCalls: "النطق الحر",
    clearAllAuditBtn: "مسح السجل بالكامل",
    confirmClearAudit: "هل أنت متأكد من رغبتك في حذف كافة سجلات العمليات؟ لا يمكن التراجع عن هذا الإجراء.",
    deleteEntryBtn: "حذف السجل",
    auditTimeCol: "التوقيت",
    auditTitleCol: "العنوان",
    auditTypeCol: "المصدر",
    auditTextCol: "النص المنطوق",
    auditLangCol: "اللغة",
    auditIpCol: "عنوان IP",
    noAuditYet: "لا توجد عمليات مسجلة في السجل بعد",

    // Admin Login Screen
    loginTitle: "مركز العمليات الداخلي",
    loginSubtitle: "تسجيل الدخول إلى لوحة التحكم والإعدادات",
    usernameLabel: "اسم المستخدم:",
    passwordLabel: "كلمة المرور:",
    loginButton: "تسجيل الدخول للوحة التحكم",
    loginChecking: "جاري التحقق...",
    defaultCredentialsNotice: "بيانات الاعتماد الافتراضية: admin / kernel2026",
    loginError: "اسم المستخدم أو كلمة المرور غير صحيحة"
  },

  en: {
    // Header
    appName: "Kernel Ping",
    appSubtitle: "Office Public Address & Voice Broadcast System",
    badgeLabel: "PA System",
    statusReady: "Speaker Ready",
    statusSpeaking: "Broadcasting Now",
    statusQueued: "In Queue",
    volume: "Volume",
    cooldownNotice: "Cooldown",
    themeToggle: "Toggle Theme",
    langToggle: "العربية",

    // Search & Filter
    searchPlaceholder: "Search announcements, alerts, or keywords...",
    allCategories: "All",
    presetsCount: "presets ready for instant broadcast",

    // Presets Grid
    quickAlertsTitle: "Quick Alert Presets",
    quickAlertsSubtitle: "Zero-latency audio commands ready at one click",
    speakButton: "Broadcast",
    cachedBadge: "Locally Cached",
    playingBadge: "Playing...",

    // Custom Speech Box
    freeSpeechTitle: "Text-to-Speech Broadcast",
    freeSpeechSubtitle: "Convert any text into crisp office audio using Neural AI",
    freeSpeechPlaceholder: "Type your message here to be announced across the office",
    quickSuggestions: "Quick Templates:",
    charLimit: "chars",
    speakNowButton: "Speak Announcement",
    speakingSubmitting: "Dispatching...",
    tashkeelBtn: "AI Diacritize (Tashkeel) ✨",
    tashkeelSuccess: "Arabic text diacritized successfully ✨",
    tashkeelProcessing: "Diacritizing...",
    ctrlEnterHint: "Ctrl + Enter to instantly broadcast",

    // Callout Box
    calloutTitle: "Personnel & Device Callout",
    calloutSubtitle: "Direct an urgent voice page to a specific person or role",
    targetLabel: "Target Person / Role:",
    messageLabel: "Action or Instructions:",
    callMessagePlaceholder: "e.g., Please report to the server room or main hall immediately",
    callButton: "Dispatch Urgent Call 📢",
    callSubmitting: "Calling...",
    callTargets: [
      "On-Call Engineer",
      "DevOps & Infrastructure Team",
      "Tech Lead",
      "Frontend Team",
      "Backend Team",
      "Office Administration & Front Desk",
      "Security Team"
    ],

    // Toasts & Alerts
    cooldownWarning: "Please wait {seconds}s before sending another announcement to prevent spam",
    speakSuccess: "Announcement \"{title}\" broadcasted successfully 🔊",
    customSuccess: "Message dispatched to office speakers 🎙️",
    callSuccess: "Urgent call for {target} broadcasted across office 📢",
    errorNetwork: "Cannot connect to audio server",
    errorGeneric: "An error occurred while processing the request",

    // Footer
    footerText: "Kernel Ping System © 2026 — Internal Audio Communication for Kernel Tech",

    // Admin Common
    adminTitle: "Stealth Admin Center",
    adminSubtitle: "Audio Engine, Presets CRUD & Security Audit",
    adminBadge: "Encrypted Control Center",
    backToPublic: "Public Workspace",
    logout: "Log Out",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    actions: "Actions",
    status: "Status",

    // Admin Tabs
    tabAudio: "Audio Engine & Controls",
    tabCategories: "Categories Management",
    tabPresets: "Presets CRUD & Caching",
    tabAudit: "Activity Audit Trail",

    // Admin Audio Settings
    serverVolumeTitle: "Server Master Volume (PipeWire / WirePlumber)",
    serverVolumeDesc: "Direct control over default audio sink volume, compatible with AUX cable and Bluetooth A2DP.",
    voiceSettingsTitle: "Neural Voices & Phonetic Normalization (TTS)",
    voiceArLabel: "Primary Arabic Voice:",
    voiceEnLabel: "Primary English Voice:",
    testVoiceBtn: "Test Voice ▶",
    testingVoice: "Testing...",
    smartPronunciationLabel: "Smart Phonetic Normalizer:",
    smartPronunciationDesc: "Expands tech acronyms (CI/CD, PR, DevOps, API) and strips emojis to prevent speech glitches.",
    chimeSettingsTitle: "Chimes & Bluetooth Wake-up",
    preChimeLabel: "Pre-Announcement Attention Chime",
    preChimeDesc: "Plays a distinctive tone to catch attention before speech starts",
    chimeToneLabel: "Select Chime Tone:",
    testTone: "Test Chime ▶",
    bluetoothWakeupLabel: "Bluetooth Wake-up Ping / Delay",
    bluetoothWakeupDesc: "Plays tone followed by 400ms silence to un-mute A2DP Bluetooth sinks before words begin",
    cooldownSettingsTitle: "Spam Cooldown Protection",
    cooldownToggleLabel: "Enable anti-spam cooldown between broadcasts",
    cooldownDurationLabel: "Cooldown duration:",
    secondsUnit: "seconds",

    // Admin Categories CRUD
    categoriesTitle: "Announcement Categories Management",
    categoriesDesc: "Add, edit, and organize categories displayed on the public workspace",
    addCategoryBtn: "Add New Category",
    catIdCol: "Category ID",
    catNameArCol: "Name (Arabic)",
    catNameEnCol: "Name (English)",
    catIconCol: "Icon",
    catColorCol: "Color",
    catOrderCol: "Order",
    catPresetsCountCol: "Presets Count",
    addCategoryModalTitle: "Add New Category",
    editCategoryModalTitle: "Edit Category",
    confirmDeleteCategory: "Are you sure you want to delete this category?",

    // Admin Presets CRUD
    presetsAdminTitle: "Presets Management & Audio Caching",
    presetsAdminDesc: "Pre-generated zero-latency MP3 files for instant offline office broadcasts",
    rebuildAllCacheBtn: "Rebuild All Audio Caches",
    addPresetBtn: "Add New Preset",
    presetIdCol: "Preset ID",
    presetTitleCol: "Title",
    presetCategoryCol: "Category",
    presetTextCol: "Spoken Speech Text",
    presetCacheCol: "Audio Cache",
    cacheArLabel: "Arabic MP3",
    cacheEnLabel: "English MP3",
    addPresetModalTitle: "Add New Preset",
    editPresetModalTitle: "Edit Preset",
    rebuildPresetCacheBtn: "Rebuild Audio",

    // Admin Audit
    auditTitle: "Real-time Activity Audit Trail",
    totalCalls: "Total Announcements",
    presetCalls: "Preset Commands",
    customCalls: "Free Speech Broadcasts",
    clearAllAuditBtn: "Clear All Logs",
    confirmClearAudit: "Are you sure you want to clear all audit logs? This action cannot be undone.",
    deleteEntryBtn: "Delete Log",
    auditTimeCol: "Timestamp",
    auditTitleCol: "Title",
    auditTypeCol: "Source",
    auditTextCol: "Speech Text",
    auditLangCol: "Lang",
    auditIpCol: "IP Address",
    noAuditYet: "No announcements logged in audit trail yet",

    // Admin Login Screen
    loginTitle: "Internal Operations Center",
    loginSubtitle: "Sign in to access admin control center",
    usernameLabel: "Username:",
    passwordLabel: "Password:",
    loginButton: "Authenticate & Enter",
    loginChecking: "Verifying...",
    defaultCredentialsNotice: "Default credentials: admin / kernel2026",
    loginError: "Invalid username or password"
  }
};

