# 🐧 دليل النقل والتشغيل الاحترافي على سيرفر Debian 13 (Debian Deployment Guide)

يوضح هذا الدليل خطوة بخطوة كيفية نقل وتشغيل نظام **Kernel Ping** على سيرفر **Debian 13 (Trixie)** ليعمل كنظام خدمة مستمر (Daemon System Service) على مدار الساعة في مكتب كيرنال تك.

---

## 📋 المتطلبات الأساسية

- جهاز سيرفر يعمل بنظام **Debian 13** (سواء كان خادماً مصغراً مثل Intel NUC أو جهاز PC مكتبي أو Raspberry Pi 5).
- مخرج صوت متصل بالسيرفر (سماعة AUX 3.5mm، بطاقة صوت USB، أو مكبر صوت مقترن بالبلوتوث).
- حساب مستخدم قياسي (مثلاً: `moayad` أو `kerneladmin`) يتمتع بصلاحيات `sudo`.

---

## 🛠️ الخطوة 1: تثبيت الحزم وخادم الصوت PipeWire

افتح الطرفية على سيرفر دبيان ونفذ الأوامر التالية:

```bash
# 1. تحديث مستودعات الحزم
sudo apt update && sudo apt upgrade -y

# 2. تثبيت الحزم الأساسية ومحرك بايثون
sudo apt install -y python3 python3-pip python3-venv git curl ffmpeg mpv

# 3. تثبيت خادم الصوت الحديث PipeWire ومتحكم WirePlumber
sudo apt install -y pipewire pipewire-pulse pipewire-alsa wireplumber libspa-0.2-bluetooth

# 4. تثبيت خادم النطاق المحلي Avahi (لتمكين الوصول عبر kernelping.local)
sudo apt install -y avahi-daemon avahi-utils
```

---

## 🔊 الخطوة 2: تهيئة الصوت في وضع السيرفر بدون واجهة (Headless PipeWire)

في سيرفرات لينكس التي تعمل بدون واجهة رسومية (Headless)، يتوقف خادم الصوت عند تسجيل خروج المستخدم. لمنع ذلك وضمان عمل خادم الصوت **بشكل دائم حتى بدون وجود أي مستخدم مسجل الدخول**:

### 1. تفعيل ميزة الاستمرار (Enable User Lingering):
```bash
# استبدل moayad باسم المستخدم الخاص بك على السيرفر
sudo loginctl enable-linger moayad
```

### 2. تفعيل خدمات صوت PipeWire للمستخدم:
```bash
systemctl --user enable --now pipewire pipewire-pulse wireplumber
```

### 3. اختبار خروج الصوت من السيرفر:
```bash
# التحقق من أن مخرج الصوت الافتراضي جاهز
wpctl status

# تجربة تشغيل نغمة اختبارية
mpv --no-video /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true
```

> [!TIP]
> إذا كنت تستخدم **سماعة بلوتوث (Bluetooth Speaker)**:
> يمكنك إقرانها وحفظها عبر أداة `bluetoothctl`:
> ```bash
> bluetoothctl
> power on
> scan on
> # بعد ظهور الماك أدرس الخاص بالسماعة:
> pair XX:XX:XX:XX:XX:XX
> trust XX:XX:XX:XX:XX:XX
> connect XX:XX:XX:XX:XX:XX
> exit
> ```

---

## 📂 الخطوة 3: نسخ ملفات المشروع وتجهيز البيئة الافتراضية

انسخ مجلد `kernelping` إلى المجلد المنزلي على السيرفر `/home/moayad/kernelping`:

```bash
cd /home/moayad/kernelping

# 1. إنشاء البيئة الافتراضية لبايثون
python3 -m venv venv

# 2. تفعيل البيئة وتثبيت المتطلبات
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r backend/requirements.txt || ./venv/bin/pip install fastapi uvicorn edge-tts mishkal pyarabic pydantic PyJWT python-multipart websockets aiofiles

# 3. التأكد من صلاحيات التنفيذ
chmod +x run.sh start_production.sh scripts/setup_domain.sh

# 4. إعداد النطاق المحلي
./scripts/setup_domain.sh
```

---

## ⚙️ الخطوة 4: إنشاء خدمة النظام التلقائية (Systemd Service)

لضمان إقلاع نظام **Kernel Ping** تلقائياً عند تشغيل السيرفر أو بعد انقطاع الكهرباء وإعادة التشغيل، سنقوم بإنشاء خدمة Systemd:

أنشئ ملف الخدمة عبر الأمر:
```bash
sudo nano /etc/systemd/system/kernelping.service
```

الصق المحتوى التالي داخل الملف (مع التأكد من مطابقة اسم المستخدم والمسار):

```ini
[Unit]
Description=Kernel Ping Office PA & Audio Announcement System
After=network.target sound.target

[Service]
Type=simple
User=moayad
WorkingDirectory=/home/moayad/kernelping
Environment=PATH=/home/moayad/kernelping/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=XDG_RUNTIME_DIR=/run/user/1000
ExecStart=/home/moayad/kernelping/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

ثم فعل الخدمة وشغلها:
```bash
# إعادة تحميل إعدادات systemd
sudo systemctl daemon-reload

# تفعيل الخدمة لتعمل تلقائياً مع إقلاع الجهاز
sudo systemctl enable kernelping.service

# تشغيل الخدمة فوراً
sudo systemctl start kernelping.service

# التحقق من حالة الخدمة
sudo systemctl status kernelping.service
```

---

## 🌐 الخطوة 5: ربط المنفذ 80 بدون كتابة :8000 في المتصفح

لكي يتمكن أي شخص في المكتب من كتابة:
`http://kernelping.local` مباشرة في المتصفح دون الحاجة لكتابة رقم المنفذ `:8000`:

### الخيار الأبسط والأسرع (Port Forwarding via Iptables):
```bash
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8000

# لحفظ الإعداد ليبقى بعد إعادة التشغيل:
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

### الخيار البديل الاحترافي (Nginx Reverse Proxy):
```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/kernelping
```
محتوى ملف Nginx:
```nginx
server {
    listen 80;
    server_name kernelping.local;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
تفعيل الرابط في Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/kernelping /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

---

## 🛡️ الخطوة 6: ضبط جدار الحماية (Firewall)

إذا كان جدار الحماية `ufw` مفعلاً على سيرفر دبيان:
```bash
# السماح بمرور حركة الويب
sudo ufw allow 80/tcp
sudo ufw allow 8000/tcp

# السماح بحركة mDNS للنطاق المحلي kernelping.local
sudo ufw allow 5353/udp

sudo ufw reload
```

---

## 🎉 تهانينا! النظام الآن يعمل في بيئة الإنتاج الكاملة
يمكن لأي مهندس أو عضو بالفريق فتح جهازه والاتصال بالواي فاي والدخول مباشرة إلى:
👉 **`http://kernelping.local/`**
وللمسؤولين للتحكم بالنظام:
👉 **`http://kernelping.local/admin`**

