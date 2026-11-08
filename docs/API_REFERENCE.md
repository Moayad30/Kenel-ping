# 📡 مرجع واجهات برمجة التطبيقات (API & WebSocket Reference)

يوثق هذا المستند كافة نقاط النهاية (Endpoints) لبروتوكول REST API وقنوات الـ WebSocket المتاحة في نظام **Kernel Ping Center**.

---

## 🌐 1. النقاط العامة (Public Endpoints — متاحة لكافة أعضاء المكتب)

### 🔹 فحص حالة النظام وكرت الصوت والبفلة
- **الرابط:** `GET /api/status`
- **الوصف:** إرجاع الحالة اللحظية للبفلة أو كرت الصوت المدمج، مخرج الصوت المتصل، العنصر قيد النطق، طول الطابور، ومستوى الصوت ومهلة التكرار المتبقية.
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
  }
}
```

---

### 🔹 إعادة الاتصال بالبفلة عن بُعد (Bluetooth Reconnect)
- **الرابط:** `POST /api/bluetooth/reconnect`
- **الوصف:** يتيح لأعضاء المكتب ومسؤولي النظام إرسال أمر لإعادة ربط البفلة لاسلكياً عبر البلوتوث وتعيينها كمخرج افتراضي في PipeWire فورياً في حال انطفائها دون الذهاب للسيرفر.
- **مثال الطلب:**
```json
{
  "mac": "XX:XX:XX:XX:XX:XX"
}
```
*(حقل الماك اختياري، حيث يكتشف النظام تلقائياً أول سماعة أو مكبر مقترن بالسيرفر)*
- **الاستجابة:**
```json
{
  "ok": true,
  "message": "Connected to Bluetooth speaker successfully",
  "connected": true
}
```

---

### 🔹 استعلام حالة أجهزة البلوتوث المقترنة
- **الرابط:** `GET /api/bluetooth/status`
- **الوصف:** استرجاع قائمة بكافة أجهزة البلوتوث المقترنة بالسيرفر وحالة اتصال كل منها.

---

### 🔹 التحكم بمستوى صوت الجهاز للأعضاء
- **الرابط:** `POST /api/volume`
- **الوصف:** يتيح لأعضاء المكتب ضبط مستوى صوت مخرج الصوت المباشر من نافذة إعدادات الصوت في الشريط العلوي.
- **جسم الطلب (Request Body):**
```json
{
  "volume": 75
}
```

---

### 🔹 إدارة واستدعاء الإجراءات الروتينية (Routine Actions)
- `GET /api/routines`: استرجاع كافة القوالب الروتينية والعدادات السريعة.
- `POST /api/routines`: إضافة قالب روتيني جديد.
- `PUT /api/routines/{id}`: تعديل قالب روتيني قائم.
- `DELETE /api/routines/{id}`: حذف قالب روتيني.
- `POST /api/routines/{id}/speak`: نطق الإجراء الروتيي بعد تعويض الرقم المحدد:
```json
{
  "number_val": 42
}
```

---

### 🔹 إدارة اقتراحات النطق السريع (Quick Snippets)
- `GET /api/snippets`: جلب قائمة الاقتراحات السريعة لصندوق النطق الحر.
- `POST /api/snippets`: إضافة اقتراح جديد:
```json
{
  "text": "يرجى الحضور لقاعة الاجتماعات"
}
```
- `DELETE /api/snippets/{id}`: إزالة اقتراح غير مرغوب فيه.

---

### 🔹 جلب التصنيفات العامة
- **الرابط:** `GET /api/categories`
- **الوصف:** جلب كافة أقسام وتصنيفات الجمل الإذاعية مرتبة حسب الأولوية.

---

### 🔹 جلب الجمل الجاهزة
- **الرابط:** `GET /api/presets`
- **الوصف:** استرجاع بطاقات الجمل الثابتة (مع العنوان الموحد، النص الموحد، والتصنيف).

---

### 🔹 إطلاق نداء من الجمل الجاهزة
- **الرابط:** `POST /api/speak/{preset_id}`
- **الوصف:** وضع الجملة في طابور النطق ونطقها فورياً مع نغمة التنبيه المسبقة.

---

### 🔹 النطق الحر المباشر مع تطبيق المهلة
- **الرابط:** `POST /api/speak/custom`
- **جسم الطلب:**
```json
{
  "text": "يرجى مراجعة الجهاز رقم 12 فوراً",
  "lang": "ar"
}
```

---

## 🔒 2. نقاط الإدارة الحصرية (Admin Endpoints — تتطلب توكن Bearer)

### 🔹 تسجيل دخول الإدارة
- **الرابط:** `POST /api/admin/login`
- **جسم الطلب:**
```json
{
  "username": "admin",
  "password": "kernel2026"
}
```
- **الاستجابة:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

### 🔹 البث الصوتي المباشر للفويس بدون تخزين (Zero Retention Voice Broadcast)
- **الرابط:** `POST /api/admin/broadcast-voice`
- **نوع المحتوى:** `multipart/form-data`
- **المعاملات:** ملف صوتي مباشر باسم `file` (`.webm` أو `.ogg`).
- **السلوك الأمني:** يُعزف الصوت على البفلة ويُحذف الملف فورياً من الخادم عبر `unlink()`.

---

### 🔹 اختبار الفويس مؤقتاً على البفلة (Test Voice on Speaker)
- **الرابط:** `POST /api/admin/test-voice-recording`
- **نوع المحتوى:** `multipart/form-data`
- **الوصف:** تجربة نطق العينة المسجلة على بفلة المكتب مع الحذف الفوري التام للملف.

---

### 🔹 تعديل إعدادات النظام وهندسة الصوت
- **الرابط:** `PUT /api/admin/settings`
- **جسم الطلب:**
```json
{
  "spam_cooldown_enabled": true,
  "cooldown_seconds": 15,
  "pre_chime_enabled": true,
  "chime_tone": "bell",
  "chime_volume": 75,
  "bluetooth_wakeup_enabled": true,
  "server_volume": 85,
  "tts_voice_ar": "ar-SA-HamedNeural",
  "tts_voice_en": "en-US-BrianMultilingualNeural"
}
```

---

### 🔹 حذف سجل العمليات والتدقيق مع التأكيد
- **حذف سطر واحد محدد:** `DELETE /api/admin/audit/{entry_id}`
- **تفريغ ومسح السجل بالكامل:** `DELETE /api/admin/audit`

---

## ⚡ 3. قناة الـ WebSocket اللحظية (Real-Time WebSocket)

- **الرابط:** `ws://<SERVER_HOST>:8000/ws`
- **الوصف:** بث لحظي مستمر لحالة النظام (`system_state`)، طول الطابور، الثواني المتبقية لمهلة التكرار، وتحديثات كرت الصوت والبفلة لكافة المتصفحات المتصلة دون الحاجة لطلب التحديث (Zero Polling).
