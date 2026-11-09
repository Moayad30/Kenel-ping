# 📡 مرجع واجهات برمجة التطبيقات (API & WebSocket Reference)

يوثق هذا المستند كافة نقاط النهاية (Endpoints) لبروتوكول REST API وقنوات الـ WebSocket المتاحة في نظام **Kernel Ping Center**.

---

## 🌐 1. النقاط العامة للأعضاء (Public Member Endpoints)

### 🔹 1.1 فحص حالة النظام ومخرج الصوت
- **الرابط:** `GET /api/status`
- **الوصف:** إرجاع الحالة اللحظية للنظام، مخرج الصوت المتصل، العنصر قيد النطق حالياً، طول الطابور، ومستوى الصوت ومهلة التكرار المتبقية.
- **مثال الاستجابة (200 OK):**
```json
{
  "status": "ready",
  "current_item": null,
  "queue_length": 0,
  "server_volume": 85,
  "cooldown_remaining": 0,
  "audio_device": {
    "device_name": "HD-Audio Generic (ALC256 Analog)",
    "card_type": "internal",
    "is_bluetooth": false,
    "is_external_speaker": false,
    "speaker_connected": false,
    "active_output": "Internal Sound Card",
    "label_ar": "صوت الجهاز جاهز",
    "label_en": "Device Audio Ready",
    "card_details": "كرت الصوت المدمج بالجهاز (HD-Audio Generic (ALC256 Analog))"
  },
  "settings": {
    "spam_cooldown_enabled": true,
    "cooldown_seconds": 15,
    "pre_chime_enabled": true,
    "chime_tone": "airport",
    "chime_volume": 80,
    "chime_timing": "synchronized",
    "pre_chime_silence": 0.5,
    "inter_chime_delay": 0.5
  }
}
```

---

### 🔹 1.2 التحكم بمستوى صوت مخرج الصوت
- **الرابط:** `POST /api/volume`
- **الوصف:** ضبط مستوى صوت مخرج الصوت المباشر من نافذة إعدادات الصوت في شريط التنقل العلوي (يدعم تضخيماً حتى 150%).
- **جسم الطلب (Request Body):**
```json
{
  "volume": 120
}
```
*(النطاق المسموح: من `0` إلى `150`)*
- **الاستجابة (200 OK):**
```json
{
  "success": true,
  "volume": 120
}
```

---

### 🔹 1.3 الإيقاف الفوري للصوت (Instant Stop Audio)
- **الرابط:** `POST /api/audio/stop`
- **الوصف:** إنهاء عملية تشغيل الصوت فوراً (`mpv`)، وإلغاء أي عناصر تنتظر دورها في طابور النطق، وإعادة النظام لحالة الجاهزية (`ready`). متاح لكافة الأعضاء والمشرفين.
- **مثال الاستجابة (200 OK):**
```json
{
  "success": true,
  "stopped": true
}
```

---

### 🔹 1.4 إذاعة نداء من الجمل الجاهزة (Preset Announcement)
- **الرابط:** `POST /api/speak/preset/{preset_id}`
- **الوصف:** إدراج نداء صوتي محدد مسبقاً في طابور النطق الصوتي مع الكشف التلقائي عن اللغة وتشغيل الملف الصوتي المخزن محلياً بسرعة فائقة.
- **مثال الاستجابة (200 OK):**
```json
{
  "success": true,
  "message": "Queued successfully",
  "item": {
    "id": "a1b2c3d4",
    "title": "Welcome to Reception",
    "text": "أهلاً بكم في مكتب الدعم الفني، يرجى التوجه لمكتب الاستقبال لتسجيل الجهاز.",
    "preset_id": "welcome_reception",
    "timestamp": "2026-11-09 10:15:30",
    "language": "ar"
  }
}
```

---

### 🔹 1.5 النطق الحر للنصوص (Free Speech Studio)
- **الرابط:** `POST /api/speak/custom`
- **الوصف:** تحويل أي نص مخصص (حتى 400 حرف) إلى كلام صوتي مسموع عبر محرك الذكاء الاصطناعي العصبي مع تشكيل النص وضبط النبرة.
- **جسم الطلب:**
```json
{
  "title": "تنبيه طارئ",
  "text": "يرجى من جميع أعضاء الفريق الفني التجمع في قاعة الصيانة فوراً.",
  "lang": "ar"
}
```

---

### 🔹 1.6 تشكيل النص العربي بالذكاء الاصطناعي (AI Tashkeel)
- **الرابط:** `POST /api/tashkeel`
- **الوصف:** ضبط وتشكيل أواخر وحركات الكلمات العربية بدقة لضمان النطق السليم عبر محرك مشكال (Mishkal).
- **جسم الطلب:**
```json
{
  "text": "تم استلام جهاز جديد"
}
```
- **الاستجابة:**
```json
{
  "diacritized": "تَمَّ اسْتِلَامُ جِهَازٍ جَدِيدٍ"
}
```

---

### 🔹 1.7 إدارة واستدعاء القوالب الروتينية (Routine Actions)
- `GET /api/routines`: استرجاع كافة القوالب الروتينية والعدادات السريعة.
- `POST /api/routines`: إضافة قالب روتيني جديد.
- `PUT /api/routines/{id}`: تعديل قالب روتيني قائم.
- `DELETE /api/routines/{id}`: حذف قالب روتيني.
- `POST /api/routines/{id}/speak`: نطق الإجراء الروتيني بعد تعويض الرقم المحدد:
```json
{
  "value": "15"
}
```

---

### 🔹 1.8 إدارة واستخدام الاقتراحات السريعة (Quick Snippets)
- `GET /api/snippets`: استرجاع كافة العبارات النصية القصيرة المقترحة في صندوق النطق الحر.
- `POST /api/snippets`: إضافة عبارة جديدة.
- `DELETE /api/snippets/{id}`: حذف عبارة مقترحة.

---

## 🔒 2. نقاط الإدارة والتحكم (Admin Endpoints)

> [!NOTE]
> تتطلب كافة نقاط الإدارة إرفاق رمز المصادقة في ترويسة الطلب:
> `Authorization: Bearer <TOKEN>`

### 🔹 2.1 تسجيل دخول المشرف
- **الرابط:** `POST /api/auth/login`
- **جسم الطلب:**
```json
{
  "username": "admin",
  "password": "your_secure_password"
}
```
- **الاستجابة (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 🔹 2.2 إعدادات الصوت وهندسة النظام
- `GET /api/admin/settings`: استرجاع إعدادات النظام الحالية.
- `POST /api/admin/settings`: حفظ وتطبيق إعدادات الصوت (نغمة التنبيه، مستوى صوت النغمة حتى 150%، التوقيت المتزامن/الفوري، مهل الصمت `pre_chime_silence` و `inter_chime_delay`، مهلة التكرار، والأصوات العصبية).

---

### 🔹 2.3 إدارة التصنيفات (Categories Management)
- `GET /api/admin/categories`: استرجاع قائمة التصنيفات.
- `POST /api/admin/categories`: إضافة تصنيف جديد (يتم توليد الـ Slug تلقائياً في حال عدم إدخاله):
```json
{
  "name_ar": "مختبر البرمجيات",
  "name_en": "Software Lab"
}
```
- `PUT /api/admin/categories/{id}`: تعديل بيانات تصنيف قائم.
- `DELETE /api/admin/categories/{id}`: حذف تصنيف غير مستخدم.

---

### 🔹 2.4 إدارة الجمل الثابتة (Presets Management)
- `GET /api/admin/presets`: استرجاع كافة الجمل الجاهزة.
- `POST /api/admin/presets`: إضافة جملة جديدة وتوليد ملفاتها الصوتية مسبقاً.
- `PUT /api/admin/presets/{id}`: تعديل بيانات جملة قائمة.
- `DELETE /api/admin/presets/{id}`: حذف جملة وملفاتها الصوتية.
- `POST /api/admin/presets/reorder`: إعادة ترتيب الجمل.
- `POST /api/admin/rebuild-cache`: إعادة بناء وتوليد ملفات الكاش الصوتي لكافة الجمل أو لجملة محددة.

---

### 🔹 2.5 سجل التدقيق والعمليات (Audit Trail)
- `GET /api/admin/audit`: استرجاع إحصائيات وآخر 50 عملية نداء مسجلة في السجل اللحظي (مع قدرة استيعاب تتجاوز 50,000 عملية).
- `DELETE /api/admin/audit/{entry_id}`: حذف سطر فردي محدد من سجل العمليات.

---

## ⚡ 3. قناة مقبس الويب التفاعلية (WebSocket Protocol)

- **الرابط:** `ws://<SERVER_HOST>/ws`
- **آلية العمل:**
  - فور اتصال العميل بالمقبس، يرسل الخادم حالة النظام اللحظية (`get_state_dict`).
  - عند حدوث أي تغيير في النظام (بدء نطق، انتهاء نطق، تغيير صوت، استدعاء قالب، أو إيقاف صوت)، يرسل الخادم حزمة JSON فورية لكافة المتصفحات المتصلة لتحديث واجهاتها بنعومة ولحظياً.
  - يدعم المقبس نبضات البينغ للحفاظ على استمرار الجلسة:
    - يرسل العميل: `"ping"`
    - يرد الخادم: `"pong"`
