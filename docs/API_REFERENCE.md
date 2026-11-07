# 📡 مرجع واجهات برمجة التطبيقات (API & WebSocket Reference)

يوثق هذا المستند كافة نقاط النهاية (Endpoints) لبروتوكول REST API وقنوات الـ WebSocket المتاحة في نظام **Kernel Ping**.

---

## 🌐 1. النقاط العامة (Public Endpoints — لا تتطلب مصادقة)

### 🔹 فحص حالة النظام والبفلة
- **الرابط:** `GET /api/status`
- **الوصف:** إرجاع الحالة اللحظية للبفلة، العنصر قيد النطق، طول الطابور، ومستوى الصوت.
- **مثال الاستجابة (200 OK):**
```json
{
  "status": "ready",
  "current_item": null,
  "queue_length": 0,
  "server_volume": 85,
  "settings": {
    "spam_cooldown_enabled": true,
    "cooldown_seconds": 15,
    "pre_chime_enabled": true,
    "chime_tone": "airport",
    "bluetooth_wakeup_enabled": true,
    "tts_voice_ar": "ar-SY-LaithNeural",
    "tts_voice_en": "en-US-BrianMultilingualNeural",
    "smart_pronunciation_enabled": true
  }
}
```

---

### 🔹 استعراض تصنيفات النداءات
- **الرابط:** `GET /api/categories`
- **الوصف:** استرجاع مصفوفة التصنيفات مرتبة حسب الحقل `order`.

---

### 🔹 استعراض الجمل الإذاعية الثابتة
- **الرابط:** `GET /api/presets`
- **الوصف:** إرجاع قائمة كافة الجمل المصنفة مع نصوصها وأيقوناتها.

---

### 🔹 إطلاق نداء من الجمل الثابتة
- **الرابط:** `POST /api/speak/preset/{preset_id}`
- **الوصف:** إضافة الجملة المحددة إلى طابور الإذاعة الفوري وتشغيل ملفها الصوتي المحلي.
- **رموز الاستجابة:**
  - `200 OK`: تم إدراج النداء بنجاح.
  - `429 Too Many Requests`: في حال تفعيل مانع الإزعاج ومحاولة الإرسال قبل انقضاء المهلة.
  - `404 Not Found`: الجملة غير موجودة.

---

### 🔹 نطق رسالة حرة عبر الذكاء الاصطناعي
- **الرابط:** `POST /api/speak/custom`
- **محتوى الطلب (Body JSON):**
```json
{
  "text": "تذكير للفريق، موعد اجتماع السبرينت بعد قليل",
  "title": "تذكير السبرينت",
  "lang": "ar"
}
```
- **الشروط:** النص مطلوب، الحد الأقصى 400 حرف.

---

### 🔹 تشكيل النص العربي آلياً (AI Tashkeel)
- **الرابط:** `POST /api/tashkeel`
- **محتوى الطلب (Body JSON):**
```json
{
  "text": "نذكر الجميع ببدء صلاة الظهر بعد قليل"
}
```
- **مثال الاستجابة (200 OK):**
```json
{
  "success": true,
  "original": "نذكر الجميع ببدء صلاة الظهر بعد قليل",
  "diacritized": "نَذْكُرُ الْجَمِيعَ بِبَدْءِ صَلَاَةِ الظُّهْرِ بَعْد قَلِيلٍ"
}
```

---

## 🔒 2. نقاط الإدارة المخفية (Stealth Admin Endpoints)
> تتطلب جميع هذه النقاط (باستثناء تسجيل الدخول) تمرير الترويسة:
> `Authorization: Bearer <token>`

### 🔹 تسجيل دخول الأدمن
- **الرابط:** `POST /api/auth/login`
- **المدخلات:** `{"username": "admin", "password": "..."}`
- **الاستجابة:** إرجاع توكن JWT مشفر صالح لمدة 72 ساعة.

---

### 🔹 التحقق من صلاحية الجلسة
- **الرابط:** `GET /api/admin/verify`

---

### 🔹 جلب وحفظ إعدادات النظام
- **جلب الإعدادات:** `GET /api/admin/settings`
- **تحديث الإعدادات:** `POST /api/admin/settings`
- **تعديل الصوت السريع:** `POST /api/admin/volume` مع Body: `{"volume": 85}`

---

### 🔹 تجربة نغمات وأصوات النماذج الحية
- **تجربة النغمة:** `POST /api/admin/test-chime` — `{"tone": "airport"}`
- **تجربة الصوت:** `POST /api/admin/test-voice` — `{"voice": "ar-SY-LaithNeural", "lang": "ar"}`

---

### 🔹 إدارة التصنيفات (Categories CRUD)
- `GET /api/admin/categories` — قائمة التصنيفات.
- `POST /api/admin/categories` — إنشاء تصنيف جديد.
- `PUT /api/admin/categories/{cat_id}` — تعديل تصنيف قائم.
- `DELETE /api/admin/categories/{cat_id}` — حذف تصنيف.

---

### 🔹 إدارة الجمل والتخزين الصوتي (Presets CRUD)
- `GET /api/admin/presets` — قائمة الجمل مع حالة الكاش (`cached_ar`, `cached_en`).
- `POST /api/admin/presets` — إنشاء جملة جديدة مع توليد فوري لملف الـ MP3.
- `PUT /api/admin/presets/{preset_id}` — تحديث نصوص الجملة وتحديث ملف الصوت.
- `DELETE /api/admin/presets/{preset_id}` — حذف الجملة وملفاتها الصوتية من القرص.
- `POST /api/admin/presets/{preset_id}/rebuild-cache` — إعادة توليد صوت جملة محددة.
- `POST /api/admin/presets/rebuild-all-cache` — إعادة توليد كافة الأصوات بالكامل.

---

### 🔹 سجل العمليات والتدقيق (Activity Audit)
- `GET /api/admin/audit` — استرجاع إحصائيات الإذاعة وآخر العمليات.
- `DELETE /api/admin/audit/{entry_id}` — حذف عملية محددة من السجل.
- `DELETE /api/admin/audit` — مسح وتصفير سجل العمليات بالكامل.

---

## ⚡ 3. قناة الـ WebSocket الحية (`/ws`)

- **الرابط:** `ws://<server-ip>:8000/ws`
- **آلية العمل:**
  1. بمجرد اتصال العميل، يُرسل الخادم حالة النظام اللحظية كاملة.
  2. عند حدوث أي حدث صوتي (بدء كلام، انتهاء كلام، إضافة للطابور، أو تغيير لمستوى الصوت في السيرفر)، يُبث الحدث تلقائياً لكافة المتصفحات المتصلة فوراً.
  3. يرسل المتصفح نبضة `ping` كل 15 ثانية، ويرد الخادم بـ `pong` للحفاظ على استقرار الاتصال.

