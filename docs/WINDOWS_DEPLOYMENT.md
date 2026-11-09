# 🪟 دليل التثبيت والتشغيل الشامل على Windows 10 (Windows Deployment Guide)

يوضح هذا الدليل خطوة بخطوة كيفية تثبيت وتشغيل نظام **Kernel Ping Center** على جهاز يعمل بنظام **Windows 10** ليعمل كخادم إذاعة وصوت دائم (`Windows Background Service`) يعمل تلقائياً مع بدء تشغيل الجهاز وبعد إعادة الإقلاع، مع إمكانية الوصول إليه عبر الرابط المحلي **`http://kernelping.local:8000`**.

---

## 📋 المتطلبات الأساسية

- جهاز حاسوب مكتبي أو لابتوب يعمل بنظام **Windows 10** (إصدار 64-bit).
- مخرج صوت متصل بالجهاز (سماعات سلكية AUX 3.5mm، كرت صوت USB، أو مكبر صوت بلوتوث).
- حساب مستخدم بصلاحيات المشرف (Administrator).
- اتصال بالشبكة المحلية (Wi-Fi أو كابل إيثرنت).

---

## 🛠️ الخطوة 1: تثبيت البرمجيات والأدوات المطلوبة

قبل تشغيل النظام، نحتاج إلى تثبيت الأدوات التالية على ويندوز 10:

### 1. تثبيت Python 3.10 أو 3.11:
1. حمل بايثون من الموقع الرسمي: [python.org/downloads](https://www.python.org/downloads/)
2. أثناء التثبيت، **تأكد تماماً من وضع علامة صح على خيار**:
   > ☑️ **Add Python to PATH** (هام جداً لتعمل الأوامر في موجه الأوامر).
3. اختر **Install Now**.

### 2. تثبيت Node.js (لبناء الواجهات):
1. حمل نسخة LTS من: [nodejs.org](https://nodejs.org/)
2. قم بتثبيتها بالإعدادات الافتراضية.

### 3. تثبيت مشغل الصوتيات MPV Player:
يحتاج النظام لمشغل `mpv` منخفض التأخير لتشغيل الصوتيات:
1. حمل نسخة ويندوز من [mpv.io/installation](https://mpv.io/installation/) أو من مستودع [shinchiro mpv builds](https://sourceforge.net/projects/mpv-player-windows/files/).
2. فك الضغط عن المجلد وضعه في المسار: `C:\mpv`
3. إضافة MPV لمتغيرات النظام (PATH):
   - افتح قائمة ابدأ واكتب: **Environment Variables** (تعديل متغيرات بيئة النظام).
   - اضغط على **Environment Variables...** بالأسفل.
   - في قسم **System variables**، اختر **Path** ثم اضغط **Edit**.
   - اضغط **New** وأضف: `C:\mpv`
   - اضغط **OK** في كافة النوافذ.
   - افتح موجه الأوامر (`cmd`) واكتب `mpv --version` للتأكد من ظهوره بنجاح.

---

## 📂 الخطوة 2: تثبيت المشروع وإعداد البيئة

افتح موجه الأوامر كمسؤول (**Command Prompt as Administrator**) أو PowerShell:

```powershell
# 1. إنشاء مجلد المشروع في قرص C (أو في أي مسار تفضله)
cd C:\
# إذا كنت قد نسخت المشروع، توجه للمجلد:
cd C:\kernelping

# 2. إنشاء البيئة الافتراضية لبايثون
python -m venv venv

# 3. تفعيل البيئة وترقية pip وتثبيت الاعتماديات
venv\Scripts\python.exe -m pip install --upgrade pip
venv\Scripts\pip.exe install fastapi uvicorn edge-tts mishkal pyarabic pydantic PyJWT python-multipart websockets aiofiles httpx

# 4. بناء ملفات الواجهة الأمامية (Frontend)
cd frontend
npm install
npm run build
cd ..

# 5. توليد نغمات التنبيه
venv\Scripts\python.exe backend\generate_chimes.py
```

---

## 🔊 الخطوة 3: اختبار التشغيل اليدوي ومخرج الصوت

للتأكد من أن كل شيء يعمل بسلاسة قبل تحويله لخدمة دائمة:

1. شغل السيرفر مؤقتاً عبر الأمر:
   ```cmd
   venv\Scripts\uvicorn.exe backend.main:app --host 0.0.0.0 --port 8000
   ```
2. افتح المتصفح على جهازك وجرب الدخول إلى:
   - الواجهة العامة: `http://localhost:8000/`
   - لوحة الإدارة: `http://localhost:8000/admin`
3. جرب الضغط على أي نداء وتأكد من خروج الصوت بوضوح من السماعات المتصلة بالويندوز.
4. اضغط `Ctrl + C` في الطرفية لإيقاف التشغيل اليدوي تمهيداً لضبط الإقلاع التلقائي.

---

## ⚙️ الخطوة 4: تشغيل النظام كخدمة دائمة مع إقلاع الويندوز (Windows Service)

ليعمل النظام **بشكل دائم في الخلفية وبدون الحاجة لفتح أي نافذة سوداء، ويعيد تشغيل نفسه تلقائياً حتى بعد إعادة تشغيل الكمبيوتر**:

نستخدم أداة **NSSM (Non-Sucking Service Manager)** وهي الأداة القياسية الأفضل لتحويل أي تطبيق إلى خدمة ويندوز حقيقية:

### 1. تحميل أداة NSSM:
1. حمل الأداة مجاناً من: [nssm.cc/download](https://nssm.cc/download)
2. فك الضغط، وانسخ الملف `win64\nssm.exe` إلى المجلد `C:\kernelping\nssm.exe` أو `C:\Windows\System32`.

### 2. تثبيت خدمة Kernel Ping:
افتح موجه الأوامر كمسؤول (**CMD as Administrator**) ونفذ:

```cmd
C:\kernelping\nssm.exe install KernelPing "C:\kernelping\venv\Scripts\uvicorn.exe" "backend.main:app --host 0.0.0.0 --port 8000"
```

ثم اضبط مجلد العمل ومسار MPV:
```cmd
# ضبط مجلد التشغيل
C:\kernelping\nssm.exe set KernelPing AppDirectory "C:\kernelping"

# ضبط الإقلاع التلقائي مع الويندوز
C:\kernelping\nssm.exe set KernelPing Start SERVICE_AUTO_START

# ضبط إعادة التشغيل الفوري عند حدوث أي خطأ
C:\kernelping\nssm.exe set KernelPing AppExit Default Restart
C:\kernelping\nssm.exe set KernelPing AppRestartDelay 3000
```

### 3. تشغيل الخدمة والتحقق منها:
```cmd
# تشغيل الخدمة الآن
C:\kernelping\nssm.exe start KernelPing

# التحقق من حالتها
C:\kernelping\nssm.exe status KernelPing
```
> [!TIP]
> يمكنك أيضاً فتح نافذة خدمات ويندوز (`services.msc`)، وستجد خدمة باسم **`KernelPing`** مفعّلة على وضع **Automatic** وتعمل في الخلفية بهدوء تام.

---

## 🛡️ الخطوة 5: فتح جدار حماية ويندوز (Windows Defender Firewall)

للسماح للهواتف والأجهزة الأخرى على شبكة الـ Wi-Fi بالوصول للسيرفر:

افتح **PowerShell كمسؤول** ونفذ الأمر التالي لفتح المنفذ 8000:
```powershell
New-NetFirewallRule -DisplayName "Kernel Ping Center Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

---

## 🌐 الخطوة 6: تفعيل الرابط المحلي `kernelping.local` على ويندوز

لتمكين كافة الأجهزة من فتح الموقع عبر **`http://kernelping.local:8000`**:

### الطريقة 1 (الأسهل والأقوى): تفعيل خدمة Bonjour / mDNS على ويندوز
يتضمن نظام ويندوز 10 دعماً لبروتوكول mDNS، ولكن لبث اسم الجهاز لباقي هواتف الشبكة:
1. إذا كان لديك تطبيق **iTunes** أو **iCloud for Windows** مثبتاً، فخدمة Bonjour مثبتة مسبقاً وتبث النطاق تلقائياً.
2. إذا لم يكن مثبتاً، يمكنك تنزيل خدمة **Bonjour Print Services for Windows** من آبل:
   [support.apple.com/kb/DL999](https://support.apple.com/kb/DL999)
3. قم بتغيير اسم جهاز الكمبيوتر إلى `kernelping`:
   - افتح **Settings > System > About**.
   - اضغط **Rename this PC** واكتب: `kernelping`.
   - أعد تشغيل الجهاز. سيبث الجهاز اسمه تلقائياً بالصيغة: `kernelping.local`.

### الطريقة 2: عبر راوتر المكتب (Router Local DNS)
- ادخل لصفحة الراوتر في المكتب (MikroTik أو TP-Link أو غيره).
- في قسم **DHCP Server / Static Lease**، ثبت الـ IP لجهاز ويندوز (مثلاً: `192.168.1.50`).
- في قسم **DNS / Static DNS**، أضف سجلاً جديداً:
  - **Name:** `kernelping.local`
  - **IP:** `192.168.1.50`
- بهذه الطريقة، أي جهاز يتصل بشبكة الـ Wi-Fi سيتعرف فوراً على الرابط دون أي برامج إضافية!

### الطريقة 3: للأجهزة المكتبية عبر ملف Hosts
على أي جهاز كمبيوتر آخر في المكتب يريد الدخول:
- افتح الملف `C:\Windows\System32\drivers\etc\hosts` كمسؤول.
- أضف سطراً: `<IP_SERVER_WINDOWS> kernelping.local`

---

## ✅ الخطوة 7: التحقق النهائي

1. أعد تشغيل جهاز ويندوز 10 للتأكد من نجاح الإقلاع الذاتي.
2. بعد الإقلاع، توجه لأي هاتف محمول على نفس شبكة الـ Wi-Fi.
3. افتح المتصفح واكتب:
   - **`http://kernelping.local:8000/`** (أو `http://<WINDOWS_IP>:8000/`)
   - لوحة الإدارة: **`http://kernelping.local:8000/admin`**
4. اضغط على أي نداء للتأكد من خروج الصوت فوراً من مكبرات صوت الويندوز بنجاح!

---

## 🔧 أوامر إدارة الخدمة على ويندوز

```cmd
# إيقاف الخدمة:
C:\kernelping\nssm.exe stop KernelPing

# إعادة تشغيل الخدمة:
C:\kernelping\nssm.exe restart KernelPing

# حذف الخدمة (في حال أردت إزالتها لاحقاً):
C:\kernelping\nssm.exe remove KernelPing confirm
```

