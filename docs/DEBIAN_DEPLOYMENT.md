# 🐧 دليل التثبيت والتشغيل الشامل على سيرفر Debian 13 (Trixie)

يوفر هذا الدليل مساراً إجرائياً متكاملاً وشديد التفصيل خطوة بخطوة لنقل وتثبيت وتشغيل نظام **Kernel Ping Center** على خادم يعمل بنظام **Debian 13 (Trixie)** ليعمل كنظام خدمة مستقل ومستمر على مدار الساعة (`24/7 Production Daemon Service`)، يقلع ذاتياً عند تشغيل السيرفر أو بعد انقطاع التيار الكهربائي، مع منع وضع السكون، وربطه بالنطاق المحلي **`http://kernelping.local`**.

---

## 📋 المتطلبات الأساسية والمواصفات الموصى بها

- **نظام التشغيل:** Debian 13 (Trixie) معمارية `x86_64` أو `aarch64` (يدعم أجهزة PC المكتبية، خوادم الرفوف، Intel NUC، وأجهزة Raspberry Pi 4/5).
- **المعالج والذاكرة:** معالج ثنائي النواة (Dual Core) بتردد 1.5 GHz أو أعلى، وذاكرة عشوائية (RAM) لا تقل عن 2 GB.
- **التخزين:** مساحة فارغة لا تقل عن 5 GB (لتخزين كاش الملفات الصوتية MP3 ومكتبات النظام).
- **مخرج الصوت (Audio Output):**
  - كرت صوت مدمج ومنفذ AUX 3.5mm، أو
  - كرت صوت خارجي USB Audio DAC، أو
  - مخرج صوت HDMI متصل بشاشة أو بفلة، أو
  - مستقبل صوت بلوتوث (Bluetooth Speaker).
- **الصلاحيات والشبكة:** حساب مستخدم يتمتع بصلاحيات `sudo`، واتصال بشبكة المكتب المحلية (Local Area Network عبر كابل إيثرنت أو Wi-Fi).

---

## 📦 الخطوة 1: نقل ملفات المشروع إلى السيرفر (Codebase Transfer)

إذا كنت تقوم بنقل المشروع من جهاز التطوير الحالي إلى سيرفر دبيان الجديد، اتبع إحدى الطرق المباشرة التالية:

### الطريقة أ: الاستنساخ عبر Git (الأسرع والأسهل):
```bash
# تسجيل الدخول لسيرفر دبيان والتوجه للمجلد المنزلي
cd ~
git clone <YOUR_GIT_REPOSITORY_URL> kernelping
cd kernelping
```

### الطريقة ب: النقل عبر rsync من جهازك المكتبي:
من طرفية جهازك، استبعد مجلدات `venv` و `node_modules` المؤقتة لتقليل الحجم وتسريع النقل:
```bash
rsync -avz --exclude 'venv' --exclude 'frontend/node_modules' --exclude '.git' /home/moayad/kernelping/ user@<SERVER_IP>:/home/user/kernelping/
```

### الطريقة ج: ضغط المشروع في ملف ZIP ونقله:
```bash
# على جهازك المكتبي:
tar --exclude='venv' --exclude='frontend/node_modules' -czvf kernelping.tar.gz -C /home/moayad kernelping
scp kernelping.tar.gz user@<SERVER_IP>:~/

# على سيرفر دبيان:
tar -xzvf ~/kernelping.tar.gz -C ~/
cd ~/kernelping
```

---

## 🛠️ الخطوة 2: تحديث حزم دبيان وتثبيت التبعيات البرمجية

افتح الطرفية (Terminal) على سيرفر دبيان ونفذ الأوامر التالية بالترتيب:

```bash
# 1. تحديث مستودعات النظام وترقية الحزم الأساسية
sudo apt update && sudo apt upgrade -y

# 2. تثبيت بايثون 3 وبيئتها الافتراضية، ومحرك mpv و ffmpeg وأدوات البناء
sudo apt install -y python3 python3-pip python3-venv git curl ffmpeg mpv build-essential

# 3. تثبيت بيئة Node.js و npm لبناء واجهة المستخدم (Vite Frontend)
sudo apt install -y nodejs npm

# 4. تثبيت خادم الصوت المتقدم PipeWire وحزم WirePlumber و ALSA و Bluetooth
sudo apt install -y pipewire pipewire-pulse pipewire-alsa wireplumber libspa-0.2-bluetooth alsa-utils

# 5. تثبيت خادم النطاق المحلي Avahi وخادم الويب العكسي Nginx
sudo apt install -y avahi-daemon avahi-utils nginx
```

---

## ⚡ الخطوة 3: منع السيرفر من الدخول في وضع السكون (Disable System Sleep)

لضمان بقاء السيرفر مستيقظاً ومستعداً لبث الصوت في أي لحظة دون انقطاع:

```bash
# تعطيل وضع السكون والتعليق والسبات نهائياً
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

# التحقق من نجاح التعطيل
sudo systemctl status sleep.target
```

---

## 🔊 الخطوة 4: تهيئة خادم الصوت للسيرفرات المستقلة (Headless PipeWire Audio)

في سيرفرات لينكس التي تعمل بدون واجهة مستخدم رسومية (Headless Server)، تتوقف خدمات الصوت بمجرد تسجيل الخروج. لمنع ذلك وجعل الصوت يعمل تلقائياً **حتى بدون تسجيل دخول أي مستخدم بشري**:

### 1. إضافة المستخدم إلى مجموعة الصوت (Audio Group):
```bash
sudo usermod -aG audio $USER
```

### 2. تفعيل ميزة استمرار الجلسة للمستخدم (User Lingering):
```bash
# يسمح لمقابس وخدمات PipeWire الصوتية بالعمل في الخلفية بشكل دائم بعد إقلاع السيرفر
sudo loginctl enable-linger $USER
```

### 3. تفعيل وتشغيل خدمات صوت PipeWire و WirePlumber:
```bash
systemctl --user enable --now pipewire pipewire-pulse wireplumber
```

### 4. فحص واختيار كرت الصوت الافتراضي:
```bash
# فحص حالة كروت ومخارج الصوت المتصلة
wpctl status
```
ستظهر قائمة بمخارج الصوت تحت بند `Audio -> Sinks` مع رقم معرّف بجوار كل مخرج (مثل `42` أو `48`). لتعيين مخرج معين كافتراضي:
```bash
wpctl set-default <ID>
```

### 5. اختبار خروج الصوت من السيرفر تجريبياً:
```bash
# رفع صوت المخرج الافتراضي إلى 100%
wpctl set-volume -l 1.5 @DEFAULT_AUDIO_SINK@ 1.0

# تشغيل نغمة اختبارية عبر mpv
mpv --no-video /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || speaker-test -t wav -c 2 -l 1
```

---

## 📂 الخطوة 5: بناء المشروع وتجهيز البيئة الافتراضية

توجه إلى مجلد المشروع وقم بتجهيز بيئة التشغيل للإنتاج:

```bash
# 1. الدخول لمجلد المشروع
cd ~/kernelping

# 2. إنشاء بيئة بايثون الافتراضية
python3 -m venv venv

# 3. ترقية pip وتثبيت متطلبات الباك إند بالكامل
./venv/bin/pip install --upgrade pip
./venv/bin/pip install fastapi uvicorn edge-tts mishkal pyarabic pydantic PyJWT python-multipart websockets aiofiles httpx

# 4. بناء ملفات الواجهة الأمامية للإنتاج (Frontend Production Build)
cd frontend
npm install
npm run build
cd ..

# 5. توليد نغمات التنبيه الصوتية الرسمية
./venv/bin/python3 backend/generate_chimes.py

# 6. اختبار تشغيل الخادم يدوياً لدقيقة للتأكد من خلوه من الأخطاء
./venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
*(اضغط `Ctrl + C` لإيقاف الاختبار اليدوي بعد التأكد من رسالة `Application startup complete`)*.

---

## 🌐 الخطوة 6: تفعيل رابط النطاق المحلي `kernelping.local`

لتمكين كافة أجهزة المكتب وهواتف الطلاب وفريق العمل من الدخول مباشرة عبر **`http://kernelping.local`** دون الحاجة لكتابة رقم الـ IP أو المنفذ `:8000`:

### أ) إعداد اسم المضيف (Hostname) وخادم Avahi mDNS:
```bash
# 1. ضبط اسم جهاز السيرفر
sudo hostnamectl set-hostname kernelping

# 2. تفعيل خدمة Avahi
sudo systemctl enable --now avahi-daemon

# 3. إنشاء ملف إعلان الخدمة للنطاق المحلي
sudo tee /etc/avahi/services/kernelping.service > /dev/null << 'EOF'
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">Kernel Ping Center</name>
  <service>
    <type>_http._tcp</type>
    <port>80</port>
    <host-name>kernelping.local</host-name>
  </service>
</service-group>
EOF

# 4. إعادة تشغيل Avahi لتطبيق الإعدادات
sudo systemctl restart avahi-daemon
```

### ب) إعداد خادم Nginx كوسيط عكسي (Reverse Proxy على المنفذ 80):
يقوم Nginx باستقبال الطلبات على المنفذ القياسي 80 وتمريرها لسيرفر النظام على المنفذ 8000 مع دعم كامل ودائم لمقابس الويب (WebSockets):

```bash
# 1. إنشاء ملف تهيئة الموقع في Nginx
sudo tee /etc/nginx/sites-available/kernelping > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name kernelping.local localhost "";

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;

        # دعم اتصال مقابس الويب اللحظي (WebSockets)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400;
    }
}
EOF

# 2. تفعيل الموقع وإلغاء الموقع الافتراضي وفحص الإعدادات
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/kernelping /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## ⚙️ الخطوة 7: إنشاء خدمة الإقلاع التلقائي الدائمة (`systemd`)

لضمان عمل النظام **تلقائياً وبشكل صامت في الخلفية فور إقلاع السيرفر وإعادة التشغيل التلقائي فوراً في حال حدوث أي عطل طارئ**:

1. معرفة اسم المستخدم ومسار المجلد ورقم الـ UID:
```bash
echo "User: $USER | UID: $(id -u) | Path: $(pwd)"
```
*(في الخطوة التالية، افترضنا أن المستخدم هو `kerneladmin`، والمسار هو `/home/kerneladmin/kernelping`، والـ UID هو `1000`. قم بتعديلها لتطابق بياناتك)*.

2. إنشاء ملف خدمة النظام:
```bash
sudo tee /etc/systemd/system/kernelping.service > /dev/null << EOF
[Unit]
Description=Kernel Ping Center Audio Announcement Daemon
After=network.target sound.target pipewire.service avahi-daemon.service
Wants=sound.target

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=$(pwd)

# تمرير مسار مقبس صوت PipeWire للمستخدم لضمان خروج الصوت في الخلفية دون جلسة تفاعلية
Environment="XDG_RUNTIME_DIR=/run/user/$(id -u)"
Environment="PIPEWIRE_RUNTIME_DIR=/run/user/$(id -u)"
Environment="PULSE_RUNTIME_PATH=/run/user/$(id -u)/pulse"

# تشغيل خادم التطبيق عبر البيئة الافتراضية
ExecStart=$(pwd)/venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1

# إعادة التشغيل التلقائي المستمر
Restart=always
RestartSec=3s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF
```

3. تفعيل وبدء تشغيل الخدمة:
```bash
# إعادة تحميل إعدادات Systemd
sudo systemctl daemon-reload

# تمكين الخدمة لتعمل تلقائياً عند الإقلاع
sudo systemctl enable kernelping.service

# تشغيل الخدمة الآن
sudo systemctl start kernelping.service

# التحقق من حالة الخدمة
sudo systemctl status kernelping.service
```

---

## 🛡️ الخطوة 8: ضبط الجدار الناري (Firewall Setup)

إذا كان جدار الحماية `ufw` أو `iptables` مفعلاً على السيرفر، افتح المنافذ التالية:

```bash
# في حال استخدام UFW:
sudo ufw allow 80/tcp comment "Kernel Ping Web"
sudo ufw allow 8000/tcp comment "Kernel Ping API"
sudo ufw allow 5353/udp comment "mDNS Avahi Discovery"
sudo ufw reload
```

---

## ✅ الخطوة 9: الاختبار الشامل والتأكد من نجاح الإقلاع

1. **الدخول عبر متصفح الأجهزة (هواتف آيفون، أندرويد، أجهزة لابتوب):**
   - افتح المتصفح وتوجه إلى: **`http://kernelping.local`**
   - لوحة الإدارة: **`http://kernelping.local/admin`** (بيانات الدخول: `admin` / `kernel2026`).
2. **اختبار خروج الصوت:**
   - اضغط على أي جملة جاهزة أو قم بإرسال نص حر، وتأكد من انطلاق نغمة التنبيه ونطق الجملة بصوت `Hamed` أو `Andrew` بوضوح فائق من البفلة المتصلة بالسيرفر.
3. **اختبار إعادة الإقلاع الفعلي (Power-Cut & Reboot Simulation):**
   - نفذ أمر إعادة التشغيل على السيرفر:
     ```bash
     sudo reboot
     ```
   - انتظر حوالي 15-20 ثانية حتى يكتمل إقلاع السيرفر.
   - افتح **`http://kernelping.local`** من هاتفك دون لمس السيرفر أو تسجيل الدخول فيه، واضغط على أي زر نداء لتتأكد من خروج الصوت فوراً وبجاهزية كاملة!

---

## 🔧 أوامر المراقبة والصيانة السريعة على دبيان

| الأمر | الوظيفة |
| :--- | :--- |
| `sudo journalctl -u kernelping -f` | متابعة سجلات النظام والبث اللحظي مباشرة (Live Logs) |
| `sudo systemctl status kernelping` | فحص حالة عمل الخادم واستهلاك الذاكرة |
| `sudo systemctl restart kernelping` | إعادة تشغيل نظام Kernel Ping |
| `sudo systemctl stop kernelping` | إيقاف النظام مؤقتاً |
| `wpctl status` | فحص كروت ومخارج الصوت المتصلة ومستوى الصوت |
| `wpctl set-volume -l 1.5 @DEFAULT_AUDIO_SINK@ 1.2` | ضبط مستوى الصوت المباشر لكامل النظام إلى 120% |
