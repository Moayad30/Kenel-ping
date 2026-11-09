# 🪟 دليل التثبيت والتشغيل الشامل على Windows 10 (Windows Deployment Guide)

يوضح هذا الدليل مساراً تفصيلياً شاملاً خطوة بخطوة لنقل وتثبيت وتشغيل نظام **Kernel Ping Center** على جهاز كمبيوتر مكتبي أو لابتوب يعمل بنظام **Windows 10** (أو Windows 11) ليعمل كخادم إذاعة وصوت دائم على مدار الساعة (`24/7 Windows Background Service`)، يقلع ذاتياً في الخلفية مع بدء تشغيل الجهاز دون الحاجة لفتح أي نوافذ سوداء، مع منع وضع السكون، وإتاحة الوصول إليه عبر الرابط المحلي **`http://kernelping.local:8000`**.

---

## 📋 المتطلبات الأساسية والمواصفات الموصى بها

- **نظام التشغيل:** Windows 10 (إصدار 64-bit، Pro أو Home أو Enterprise).
- **المعالج والذاكرة:** معالج Intel Core i3 / AMD Ryzen 3 أو أعلى، وذاكرة عشوائية (RAM) لا تقل عن 4 GB.
- **مخرج الصوت (Audio Output):**
  - سماعات سلكية متصلة بمنفذ AUX 3.5mm، أو
  - كرت صوت خارجي USB Audio Dongle/DAC، أو
  - مكبر صوت بلوتوث مقترن بالويندوز (A2DP Bluetooth Speaker).
- **الصلاحيات:** حساب مستخدم يتمتع بصلاحيات المسؤول (Run as Administrator).
- **الشبكة:** اتصال مستقر بشبكة المكتب المحلية (Wi-Fi أو كابل إيثرنت LAN).

---

## 📦 الخطوة 1: نقل المشروع من جهاز التطوير إلى جهاز الويندوز

### الطريقة أ: الاستنساخ عبر Git (الأسهل):
1. افتح **PowerShell** أو **Command Prompt**.
2. انتقل إلى القرص الرئيسي `C:\` واستنسخ المشروع:
   ```cmd
   cd C:\
   git clone <YOUR_GIT_REPO_URL> kernelping
   cd kernelping
   ```

### الطريقة ب: النقل عبر ملف مضغوط (ZIP):
1. على جهازك الحالي، اضغط مجلد المشروع مع استبعاد مجلدي `venv` و `frontend/node_modules`.
2. انسخ الملف المضغوط إلى جهاز ويندوز وفك الضغط عنه في المسار:
   ```
   C:\kernelping
   ```
   *(تأكد أن بنية المجلد تكون: `C:\kernelping\backend` و `C:\kernelping\frontend` و `C:\kernelping\storage`)*.

---

## 🛠️ الخطوة 2: تثبيت البرمجيات والأدوات المطلوبة على ويندوز

قبل تشغيل النظام، يجب توفير بيئة التشغيل الأساسية:

### 1. تثبيت Python 3.10 أو 3.11:
1. حمل المثبت الرسمي من: [python.org/downloads/windows](https://www.python.org/downloads/windows/)
2. شغل ملف التثبيت:
   > [!IMPORTANT]
   > في الشاشة الأولى للتثبيت، **ضع علامة صح إجبارياً على**:
   > ☑️ **Add Python to PATH**
3. اختر **Customize installation** وتأكد من تفعيل `pip`، ثم اضغط **Install**.
4. تأكد من نجاح التثبيت بفتح `cmd` وكتابة:
   ```cmd
   python --version
   ```

### 2. تثبيت بيئة Node.js (لبناء الواجهات):
1. حمل نسخة LTS من: [nodejs.org](https://nodejs.org/)
2. قم بتثبيتها بالخيارات الافتراضية (Next ثم Next ثم Finish).

### 3. تثبيت مشغل الصوتيات MPV Player:
مشغل `mpv` هو القلب النابض لبث الصوت المنخفض التأخير:
1. حمل نسخة ويندوز 64-bit من: [mpv.io/installation](https://mpv.io/installation/) أو من مستودع [SourceForge mpv-player-windows](https://sourceforge.net/projects/mpv-player-windows/files/).
2. فك الضغط عن المحتويات داخل المجلد: `C:\mpv` (بحيث يكون الملف `C:\mpv\mpv.exe` موجوداً مباشرة).
3. إضافة مجلد MPV إلى متغيرات البيئة (System PATH):
   - اضغط مفتاحي `Windows + R` واكتب: `sysdm.cpl` واضغط Enter.
   - انتقل لتبويب **Advanced** (خيارات متقدمة) ثم اضغط زر **Environment Variables** (متغيرات البيئة).
   - في القسم السفلي (System variables)، حدد السطر المسمى **Path** واضغط **Edit**.
   - اضغط زر **New** واكتب: `C:\mpv`
   - اضغط **OK** في كافة النوافذ لحفظ الإعداد.
4. افتح نافذة موجه أوامر جديدة (`cmd`) واكتب:
   ```cmd
   mpv --version
   ```
   *(إذا ظهر إصدار MPV، فهذا يعني أن التثبيت تم بنجاح 100%)*.

---

## ⚡ الخطوة 3: منع جهاز الويندوز من الدخول في وضع السكون (Disable Sleep)

في بيئات العمل والمكاتب، يدخل ويندوز 10 تلقائياً في وضع السكون (Sleep/Standby) بعد 15-30 دقيقة من عدم لمس الماوس، مما يوقف الخادم والصوت. لمنع ذلك:

افتح **موجه الأوامر كمسؤول (CMD as Administrator)** ونفذ الأوامر التالية:

```cmd
# 1. منع السكون عند التوصيل بالكهرباء نهائياً (0 دقيقة = Never Sleep)
powercfg /change standby-timeout-ac 0

# 2. منع إطفاء شاشة المراقبة أو تعيينها لمهلة طويلة (اختياري)
powercfg /change monitor-timeout-ac 120

# 3. منع إيقاف تشغيل القرص الصلب
powercfg /change disk-timeout-ac 0

# 4. تعطيل وضع السبات (Hibernation)
powercfg /hibernate off
```

---

## 📂 الخطوة 4: تثبيت اعتماديات الباك إند وبناء الواجهة الأمامية

افتح موجه الأوامر كمسؤول (`cmd`) وتوجه لمجلد المشروع:

```cmd
cd C:\kernelping

:: 1. إنشاء البيئة الافتراضية لبايثون
python -m venv venv

:: 2. ترقية مدير الحزم pip
venv\Scripts\python.exe -m pip install --upgrade pip

:: 3. تثبيت مكتبات الباك إند بالكامل
venv\Scripts\pip.exe install fastapi uvicorn edge-tts mishkal pyarabic pydantic PyJWT python-multipart websockets aiofiles httpx

:: 4. تثبيت حزم وبناء الواجهة الأمامية للإنتاج
cd frontend
npm install
npm run build
cd ..

:: 5. توليد نغمات التنبيه الرسمية
venv\Scripts\python.exe backend\generate_chimes.py
```

---

## 🔊 الخطوة 5: اختبار التشغيل اليدوي ومخرج الصوت

1. قم بتشغيل الخادم يدوياً للتأكد من سلامة كافة المكتبات:
   ```cmd
   cd C:\kernelping
   venv\Scripts\uvicorn.exe backend.main:app --host 0.0.0.0 --port 8000
   ```
2. افتح المتصفح على جهاز الويندوز وتوجه إلى:
   - الواجهة العامة: `http://localhost:8000/`
   - لوحة الإدارة: `http://localhost:8000/admin` (بيانات الدخول: `admin` / `kernel2026`).
3. اضغط على أي نداء وتأكد من سماع نغمة التنبيه ونطق الجملة بوضوح عبر مكبرات الصوت.
4. بعد نجاح الاختبار، اضغط `Ctrl + C` في الطرفية لإيقاف السيرفر المؤقت.

---

## ⚙️ الخطوة 6: تشغيل النظام كخدمة دائمة مع إقلاع الويندوز (Windows Service via NSSM)

لجعل النظام يعمل **تلقائياً في الخلفية كخدمة نظام أصلية (System Service) تبدأ مع تشغيل الكمبيوتر وقبل تسجيل الدخول، وتعمل دون إظهار أي نوافذ سوداء، مع إعادة التشغيل التلقائي فوراً في حال حدوث أي خطأ**:

نستخدم أداة **NSSM (Non-Sucking Service Manager)**:

### 1. تحميل أداة NSSM:
1. حمل الأداة مجاناً من: [nssm.cc/download](https://nssm.cc/download)
2. فك الضغط عن الملف المحمل، وانسخ الملف `win64\nssm.exe` وضعه في مجلد المشروع:
   ```
   C:\kernelping\nssm.exe
   ```

### 2. تثبيت وتكوين الخدمة:
افتح موجه الأوامر كمسؤول (`cmd as Administrator`) ونفذ الأوامر التالية بالترتيب:

```cmd
:: تثبيت الخدمة وتوجيهها لمسار تشغيل uvicorn
C:\kernelping\nssm.exe install KernelPing "C:\kernelping\venv\Scripts\uvicorn.exe" "backend.main:app --host 0.0.0.0 --port 8000"

:: ضبط مجلد العمل للخدمة
C:\kernelping\nssm.exe set KernelPing AppDirectory "C:\kernelping"

:: ضبط نوع الإقلاع إلى تلقائي مع إقلاع النظام
C:\kernelping\nssm.exe set KernelPing Start SERVICE_AUTO_START

:: ضبط إعادة التشغيل التلقائي الفوري في حال حدوث أي تعطل
C:\kernelping\nssm.exe set KernelPing AppExit Default Restart
C:\kernelping\nssm.exe set KernelPing AppRestartDelay 3000

:: إضافة مسار MPV لبيئة الخدمة
C:\kernelping\nssm.exe set KernelPing AppEnvironmentExtra "PATH=C:\mpv;%PATH%"

:: تشغيل الخدمة الآن
C:\kernelping\nssm.exe start KernelPing
```

### 3. التحقق من حالة الخدمة:
```cmd
C:\kernelping\nssm.exe status KernelPing
```
*(يجب أن يظهر الناتج: `SERVICE_RUNNING`)*.
> [!TIP]
> يمكنك أيضاً فتح إدارة الخدمات في ويندوز بالضغط على `Windows + R` وكتابة `services.msc`. ستجد خدمة جديدة باسم **`KernelPing`** حالتها **Running** ونوع إقلاعها **Automatic**.

---

## 🛡️ الخطوة 7: فتح جدار حماية ويندوز (Windows Defender Firewall)

لكي تتمكن أجهزة المكتب وهواتف الطلاب المتصلة بشبكة الـ Wi-Fi من الوصول إلى الخادم، يجب السماح بحركة المرور عبر المنفذ 8000:

افتح **PowerShell كمسؤول (Run as Administrator)** ونفذ الأمر التالي:

```powershell
New-NetFirewallRule -DisplayName "Kernel Ping Center Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

---

## 🌐 الخطوة 8: إتاحة الرابط المحلي `kernelping.local:8000`

### الخيار 1 (الموصى به والأنسب لكافة أجهزة المكتب): عبر راوتر المكتب
1. ادخل إلى لوحة تحكم راوتر المكتب (مثل MikroTik أو TP-Link أو Huawei).
2. في قسم **DHCP Server / Static Leases**، قم بتثبيت عنوان الـ IP لجهاز سيرفر الويندوز (مثلاً: `192.168.1.50`).
3. في قسم **DNS / Static DNS**، أضف سجلاً جديداً:
   - **Hostname:** `kernelping.local`
   - **IP Address:** `192.168.1.50`
4. بمجرد تطبيق هذا الإعداد، سيستطيع أي جهاز أو هاتف بمجرد اتصاله بشبكة الواي فاي فتح:
   **`http://kernelping.local:8000`** مباشرة!

### الخيار 2: عبر تثبيت خدمة Bonjour على الويندوز
1. إذا كان تطبيق **iTunes** أو **iCloud** مثبتاً على جهاز الويندوز، فخدمة Bonjour مثبتة مسبقاً وتعمل.
2. إذا لم تكن مثبتة، حمل أداة **Bonjour Print Services for Windows** من آبل:
   [support.apple.com/kb/DL999](https://support.apple.com/kb/DL999)
3. غير اسم الكمبيوتر إلى `kernelping`:
   - توجه إلى: **Settings > System > About**.
   - اضغط **Rename this PC** واكتب: `kernelping`.
   - أعد تشغيل الكمبيوتر.

---

## ✅ الخطوة 9: الاختبار النهائي ومحاكاة الإقلاع التلقائي

1. قم بإعادة تشغيل جهاز الكمبيوتر للتأكد من عمل الخدمة في الخلفية:
   ```cmd
   shutdown /r /t 0
   ```
2. بعد إقلاع الويندوز وبدون فتح أي برنامج، توجه إلى هاتفك المحمول المتصل بنفس شبكة الـ Wi-Fi.
3. افتح المتصفح وتوجه إلى:
   - **`http://kernelping.local:8000/`** (أو `http://<WINDOWS_IP>:8000/`)
   - لوحة الإدارة: **`http://kernelping.local:8000/admin`**
4. اضغط على أي زر نداء، وستسمع الصوت ينطلق فوراً من سماعات الويندوز بنجاح واحترافية كاملة!

---

## 🔧 أوامر إدارة الخدمة على ويندوز

افتح موجه الأوامر كمسؤول (`cmd as Administrator`):

| الأمر | الوظيفة |
| :--- | :--- |
| `C:\kernelping\nssm.exe status KernelPing` | التحقق من حالة عمل السيرفر |
| `C:\kernelping\nssm.exe restart KernelPing` | إعادة تشغيل خدمة Kernel Ping |
| `C:\kernelping\nssm.exe stop KernelPing` | إيقاف الخدمة مؤقتاً |
| `C:\kernelping\nssm.exe start KernelPing` | إعادة تشغيل الخدمة المتوقفة |
| `C:\kernelping\nssm.exe remove KernelPing confirm` | إلغاء تثبيت وحذف الخدمة بالكامل من الويندوز |

