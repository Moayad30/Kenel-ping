# 🐧 دليل التثبيت والتشغيل الشامل على سيرفر Debian 13 (Trixie)

يوفر هذا الدليل مساراً إجرائياً متكاملاً خطوة بخطوة لتثبيت وتشغيل نظام **Kernel Ping Center** على خادم يعمل بنظام **Debian 13 (Trixie)** ليعمل كنظام خدمة مستقل ومستمر على مدار الساعة (`24/7 Daemon Service`)، يقلع تلقائياً عند تشغيل السيرفر أو بعد انقطاع الكهرباء، مع ربطه بالنطاق المحلي **`http://kernelping.local`**.

---

## 📋 المتطلبات الأساسية

- جهاز سيرفر يعمل بنظام **Debian 13** (سواء كان جهاز PC مكتبي، خادم صغير مثل Intel NUC، سيرفر رفوف، أو Raspberry Pi 5).
- مخرج صوت متصل بالسيرفر (سماعة AUX 3.5mm، كرت صوت USB، أو شاشة HDMI).
- حساب مستخدم يتمتع بصلاحيات `sudo` (سنفترض اسم المستخدم `kerneladmin` في هذا الدليل، ويمكنك استبداله باسم حسابك).
- اتصال بالشبكة المحلية (Local Network عبر كابل إيثرنت أو Wi-Fi).

---

## 🛠️ الخطوة 1: تحديث النظام وتثبيت الحزم الأساسية

افتح الطرفية (Terminal) على سيرفر دبيان ونفذ الأوامر التالية:

```bash
# 1. تحديث مستودعات النظام وترقية الحزم
sudo apt update && sudo apt upgrade -y

# 2. تثبيت لغة بايثون ومحرك الصوت وحزم البناء
sudo apt install -y python3 python3-pip python3-venv git curl ffmpeg mpv build-essential

# 3. تثبيت بيئة Node.js و npm لبناء الواجهات
sudo apt install -y nodejs npm

# 4. تثبيت خادم الصوت الحديث PipeWire وملحقاته
sudo apt install -y pipewire pipewire-pulse pipewire-alsa wireplumber libspa-0.2-bluetooth alsa-utils

# 5. تثبيت خادم النطاق المحلي Avahi وخادم الويب العكسي Nginx
sudo apt install -y avahi-daemon avahi-utils nginx
```

---

## 🔊 الخطوة 2: تهيئة خادم الصوت للسيرفرات بدون واجهة (Headless Audio)

في سيرفرات لينكس التي تعمل بدون واجهة رسومية، تتوقف خدمات الصوت للمستخدم عند قفل الجلسة أو تسجيل الخروج. لمنع ذلك وضمان تشغيل الصوت **بشكل دائم حتى بعد الإقلاع ودون تسجيل دخول أي مستخدم**:

### 1. إضافة المستخدم إلى مجموعة الصوت (Audio Group):
```bash
sudo usermod -aG audio $USER
```

### 2. تفعيل استمرار الجلسة للمستخدم (Enable User Lingering):
```bash
# يسمح للخدمات الصوتية للمستخدم بالعمل في الخلفية دائماً
sudo loginctl enable-linger $USER
```

### 3. تفعيل خدمات صوت PipeWire:
```bash
systemctl --user enable --now pipewire pipewire-pulse wireplumber
```

### 4. اختبار خروج الصوت من السيرفر:
```bash
# فحص حالة كرت الصوت والمخرج الافتراضي
wpctl status

# تجربة تشغيل نغمة اختبارية عبر mpv
mpv --no-video /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || speaker-test -t wav -c 2 -l 1
```

> [!TIP]
> إذا كان لديك أكثر من مخرج صوت وتريد تعيين مخرج معين كافتراضي، اعثر على رقم المعرف الخاص به من أمر `wpctl status` ثم نفذ:
> ```bash
> wpctl set-default <ID>
> ```

---

## 📂 الخطوة 3: تجهيز المشروع والبيئة الافتراضية

سنقوم بوضع المشروع في المسار القياسي `/opt/kernelping` أو في المجلد المنزلي:

```bash
# 1. الانتقال للمجلد المنزلي واستنساخ المشروع
cd /home/$USER
# (إذا كان لديك المجلد مسبقاً، ادخل إليه مباشرة)
cd /home/$USER/kernelping

# 2. إنشاء بيئة بايثون الافتراضية
python3 -m venv venv

# 3. ترقية pip وتثبيت متطلبات الباك إند
./venv/bin/pip install --upgrade pip
./venv/bin/pip install fastapi uvicorn edge-tts mishkal pyarabic pydantic PyJWT python-multipart websockets aiofiles httpx

# 4. بناء ملفات الواجهة الأمامية للإنتاج
cd frontend
npm install
npm run build
cd ..

# 5. توليد نغمات التنبيه الصوتية
./venv/bin/python3 backend/generate_chimes.py
```

---

## 🌐 الخطوة 4: تفعيل رابط النطاق المحلي `kernelping.local`

نريد أن يستطيع أي شخص في المكتب فتح **`http://kernelping.local`** مباشرة من أي هاتف أو كمبيوتر دون كتابة رقم الـ IP أو كتابة رقم المنفذ `:8000`:

### أ) إعداد خادم Avahi mDNS:
1. تأكد من تفعيل خدمة `avahi-daemon`:
```bash
sudo systemctl enable --now avahi-daemon
```

2. إنشاء ملف خدمة النطاق المحلي لـ Kernel Ping:
```bash
sudo nano /etc/avahi/services/kernelping.service
```
ضع المحتوى التالي في الملف:
```xml
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
```

3. ضبط اسم المضيف (Hostname) ليكون `kernelping`:
```bash
sudo hostnamectl set-hostname kernelping
sudo systemctl restart avahi-daemon
```

### ب) إعداد خادم Nginx كوسيط عكسي (Reverse Proxy على المنفذ 80):
يقوم Nginx باستقبال الطلبات القادمة على المنفذ القياسي 80 وتمريرها لسيرفر النظام على المنفذ 8000 مع دعم مقابس الويب (WebSockets):

1. إنشاء ملف إعدادات Nginx:
```bash
sudo nano /etc/nginx/sites-available/kernelping
```

2. ألصق الإعدادات التالية:
```nginx
server {
    listen 80;
    server_name kernelping.local localhost;

    client_max_body_size 50M;

    # توجيه الطلبات للباك إند
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        
        # دعم مقابس الويب (WebSockets)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_read_timeout 86400;
    }
}
```

3. تفعيل الإعداد واختباره وإعادة تشغيل Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/kernelping /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## ⚙️ الخطوة 5: إنشاء خدمة الإقلاع التلقائي الدائمة (`systemd`)

لضمان عمل النظام **تلقائياً عند تشغيل السيرفر أو بعد انقطاع الكهرباء وإعادة التشغيل** دون تدخل بشري:

1. إنشاء ملف الخدمة في Systemd:
```bash
sudo nano /etc/systemd/system/kernelping.service
```

2. أضف المحتوى التالي (تأكد من تعديل اسم المستخدم والمجلد إذا كان مختلفاً عن `/home/moayad/kernelping`):
```ini
[Unit]
Description=Kernel Ping Center Audio Announcement Daemon
After=network.target sound.target pipewire.service avahi-daemon.service
Wants=sound.target

[Service]
Type=simple
User=moayad
Group=moayad
WorkingDirectory=/home/moayad/kernelping

# تمرير مسار مقبس الصوت PipeWire لضمان خروج الصوت في الخلفية
Environment="XDG_RUNTIME_DIR=/run/user/1000"
Environment="PIPEWIRE_RUNTIME_DIR=/run/user/1000"
Environment="PULSE_RUNTIME_PATH=/run/user/1000/pulse"

# تشغيل الخادم عبر البيئة الافتراضية
ExecStart=/home/moayad/kernelping/venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1

# إعادة التشغيل التلقائي فوراً في حال حدوث أي خطأ
Restart=always
RestartSec=3s

# حدود استخدام الموارد
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

> [!NOTE]
> لمعرفة رقم الـ UID الخاص بمستخدمك (المستخدم في `/run/user/1000` أعلاه)، نفذ الأمر: `id -u $USER`. إذا كان الناتج `1001` مثلاً، استبدل `1000` بـ `1001`.

3. تفعيل وتشغيل الخدمة:
```bash
# إعادة تحميل إعدادات Systemd
sudo systemctl daemon-reload

# تمكين الخدمة لتعمل تلقائياً مع إقلاع النظام
sudo systemctl enable kernelping.service

# تشغيل الخدمة الآن
sudo systemctl start kernelping.service

# التحقق من حالة الخدمة
sudo systemctl status kernelping.service
```

---

## 🛡️ الخطوة 6: ضبط الجدار الناري (Firewall Setup)

إذا كنت تستخدم جدار الحماية `ufw` أو `iptables`، يجب السماح للمنافذ بالمرور:

```bash
# في حال استخدام UFW:
sudo ufw allow 80/tcp comment "Kernel Ping HTTP via Nginx"
sudo ufw allow 8000/tcp comment "Kernel Ping Direct Port"
sudo ufw allow 5353/udp comment "mDNS Avahi Discovery"
sudo ufw reload

# أو عبر IPTables مباشرة:
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 8000 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 5353 -j ACCEPT
```

---

## ✅ الخطوة 7: التحقق والاختبار الشامل

الآن السيرفر جاهز تماماً! يمكنك اختباره من أي جهاز على نفس شبكة المكتب:

1. **من أي متصفح في الشبكة (كمبيوتر، آيفون، أندرويد):**
   - الرابط المباشر: **`http://kernelping.local`** (أو `http://<SERVER_IP>`)
   - لوحة الإدارة: **`http://kernelping.local/admin`**
2. **اختبار الإقلاع بعد إعادة التشغيل:**
   - قم بإعادة تشغيل السيرفر للتأكد من عمل الخدمة تلقائياً:
     ```bash
     sudo reboot
     ```
   - بعد إقلاع السيرفر (خلال 10-15 ثانية)، افتح الرابط `http://kernelping.local` وتأكد أن الواجهة تعمل والصوت يخرج فوراً دون الحاجة لتسجيل الدخول على السيرفر!

---

## 🔧 أوامر الإدارة السريعة على دبيان

```bash
# عرض السجلات اللحظية للنظام:
sudo journalctl -u kernelping -f

# إعادة تشغيل النظام:
sudo systemctl restart kernelping

# إيقاف الخدمة:
sudo systemctl stop kernelping

# فحص كرت الصوت:
wpctl status
```
