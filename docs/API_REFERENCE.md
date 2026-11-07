# 📡 مرجع واجهات برمجة التطبيقات (API & WebSocket Reference)

يوثق هذا المستند كافة نقاط النهاية (Endpoints) لبروتوكول REST API وقنوات الـ WebSocket المتاحة في نظام **Kernel Ping**.

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
    "bluetooth_wakeup_enabled": true,
    "server_volume": 85,
    "tts_voice_ar": "ar-SY-LaithNeural",
    "tts_voice_en": "en-US-AriaNeural"
  }
}
```

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
- **الاستجابة:**
```json
{
  "success": true,
  "volume": 75
}
```

---

### 🔹 استعراض التصنيفات المتاحة
- **الرابط:** `GET /api/categories`
- **الوصف:** إرجاع مصفوفة التصنيفات المفعلة لتنظيم الجمل بالواجهة (بما فيها تصنيف "غير مصنف").

---

### 🔹 استعراض الجمل الإذاعية الجاهزة
- **الرابط:** `GET /api/presets`
- **الوصف:** إرجاع كافة الجمل المخزنة مع عناوينها ونصوصها الموحدة.

---

### 🔹 إطلاق نداء جملة جاهزة
- **الرابط:** `POST /api/speak/preset/{preset_id}`
- **الوصف:** إضافة الجملة إلى طابور النطق مع مراعاة مهلة مانع الإزعاج. يحدد النظام لغة النطق آلياً بناءً على محتوى الجملة.
- **كود الخطأ عند وجود مهلة نشطة:** `429 Too Many Requests`.

---

### 🔹 نطق نص حر مخصص (Free Text Broadcast)
- **الرابط:** `POST /api/speak/custom`
- **الوصف:** إرسال نص مخصص ليتم تحويله إلى كلام مسموع بالمكتب عبر الذكاء الاصطناعي مع الكشف التلقائي عن اللغة وتطبيق مهلة التكرار الموحدة.
- **جسم الطلب:**
```json
{
  "title": "تذكير عام",
  "text": "يرجى من جميع الزملاء مراجعة المهام المسندة إليهم قبل نهاية اليوم.",
  "lang": "ar"
}
```

---

### 🔹 التشكيل الآلي للنصوص العربية
- **الرابط:** `POST /api/tashkeel`
- **الوصف:** ضبط الحركات والإعراب التلقائي للنصوص العربية لضمان سلامة النطق ومخارج الحروف.
- **جسم الطلب:**
```json
{
  "text": "السلام عليكم ورحمة الله وبركاته"
}
```

---

## 🔒 2. نقاط الإدارة المشفرة (Admin Protected Endpoints)

تتطلب جميع هذه النقاط ترويسة مصادقة صالحة:
`Authorization: Bearer <ADMIN_JWT_TOKEN>`

### 🔹 تسجيل فويس مباشر وبثه للبفلة (Zero Retention Voice Broadcast)
- **الرابط:** `POST /api/admin/broadcast-voice`
- **نوع المحتوى (Content-Type):** `multipart/form-data`
- **المعلمات:** `file` (ملف الصوت المسجل من متصفح الإدارة بصيغة webm أو ogg أو wav).
- **السلوك الداخلي:**
  1. استلام الملف وحفظه بمسار مؤقت فريد.
  2. تشغيل نغمة التنبيه المسبقة (بالصوت المحدد للنغمة).
  3. تشغيل التسجيل الصوتي عبر مكبر الصوت فورياً.
  4. **حذف الملف فور انتهاء النطق نهائياً من القرص الصلب دون أي تخزين.**
  5. تدوين حركة البث في سجل التدقيق بصيغة `[تسجيل صوتي مباشر من الإدارة - لم يتم حفظه]`.
- **الاستجابة:**
```json
{
  "success": true,
  "message": "Live voice announcement broadcasted to speaker and securely deleted",
  "result": {
    "id": "e812a4b9",
    "status": "broadcasted"
  }
}
```

---

### 🔹 استعراض وتحديث إعدادات الصوت
- **الاستعراض:** `GET /api/admin/settings`
- **التحديث:** `POST /api/admin/settings`
- **الحقول المدعومة:**
```json
{
  "spam_cooldown_enabled": true,
  "cooldown_seconds": 15,
  "pre_chime_enabled": true,
  "chime_tone": "airport",
  "chime_volume": 80,
  "bluetooth_wakeup_enabled": true,
  "server_volume": 85,
  "tts_voice_ar": "ar-SY-LaithNeural",
  "tts_voice_en": "en-US-AriaNeural",
  "speech_rate": "+0%",
  "speech_pitch": "+0Hz"
}
```

---

### 🔹 تجربة نغمة التنبيه
- **الرابط:** `POST /api/admin/test-chime`
- **جسم الطلب:**
```json
{
  "tone": "airport"
}
```
*يتم تشغيل النغمة بمستوى صوت النغمات المحدد في الإعدادات (`chime_volume`).*

---

### 🔹 إدارة الجمل (Presets CRUD)
- **إضافة جملة جديدة:** `POST /api/admin/presets`
  - تقبل عنواناً واحداً ونصاً واحداً، وتحدد تصنيف "غير مصنف" اختيارياً:
```json
{
  "id": "standup_alert",
  "category_id": "uncategorized",
  "title": "بدء الاجتماع الصباحي",
  "text": "فريق العمل، يرجى التوجه لقاعة الاجتماعات لبدء المزامنة الصباحية.",
  "icon": "Users",
  "color": "cyan"
}
```
- **تحديث جملة:** `PUT /api/admin/presets/{preset_id}`
- **حذف جملة:** `DELETE /api/admin/presets/{preset_id}`
- **إعادة بناء كاش الصوت لجملة:** `POST /api/admin/presets/{preset_id}/rebuild-cache`
- **إعادة بناء كافة الكاشات:** `POST /api/admin/presets/rebuild-all-cache`

---

### 🔹 سجل العمليات والتدقيق وحذف السجلات
- **استعراض السجل:** `GET /api/admin/audit`
- **حذف سجل فردي بعد التأكيد:** `DELETE /api/admin/audit/{entry_id}`
- **مسح كامل السجلات بعد التأكيد:** `DELETE /api/admin/audit`

---

## ⚡ 3. قناة الـ WebSocket الحية (`/ws`)

- **الرابط:** `ws://kernelping.local:8000/ws`
- **الوظيفة:** مزامنة لحظية بين الخادم وكافة المتصفحات المفتوحة.
- **الرسائل المرسلة:**
  - يتم بث كائن حالة النظام الكامل فور حدوث أي نداء، أو تغير في مستوى الصوت، أو بدء/انتهاء مهلة التكرار، أو تغير حالة كرت الصوت.
- **نبض الحياة (Keep-Alive):**
  - يرسل العميل رسالة نصية `"ping"` كل 15 ثانية، ويرد الخادم بـ `"pong"`.
