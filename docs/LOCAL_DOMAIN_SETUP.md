# 🌐 دليل إعداد النطاق المحلي (kernelping.local Setup Guide)

يشرح هذا الدليل كيفية تمكين كافة أجهزة المكتب (الحواسيب المحمولة، الشاشات، وهواتف الفريق) من الوصول إلى نظام **Kernel Ping Center** عبر النطاق المخصص المباشر:
👉 **`http://kernelping.local`** (أو `http://kernelping.local:8000`) دون الحاجة لحفظ أو كتابة أرقام الـ IP المتغيرة.

---

## 🧭 كيف تعمل النطاقات المحلية المنتهية بـ `.local`؟

وفقاً للمعيار القياسي العالمي **RFC 6762**، فإن النطاقات المنتهية بالامتداد `.local` لا تتطلب اشتراك دومين أو اتصالاً بالإنترنت الخارجي، بل تعتمد على تقنية **Multicast DNS (mDNS / Zeroconf)** التي تبث اسم الجهاز عبر الشبكة المحلية (LAN / Wi-Fi) ليتمكن أي جهاز متصل بنفس الراوتر من التعرف عليه فوراً.

---

## 🐧 1. إعداد السيرفر على أنظمة Linux (Debian / Ubuntu / Fedora)

### أ) على نظام دبيان (Debian 13) وأوبونتو:
```bash
# 1. تثبيت حزم Avahi
sudo apt update && sudo apt install -y avahi-daemon avahi-utils

# 2. تشغيل وتفعيل خدمة Avahi
sudo systemctl enable --now avahi-daemon

# 3. تعيين اسم الجهاز ليكون kernelping
sudo hostnamectl set-hostname kernelping
sudo systemctl restart avahi-daemon
```

### ب) على نظام فيدورا (Fedora):
```bash
# 1. تثبيت الحزم
sudo dnf install -y avahi avahi-tools

# 2. تشغيل الخدمة وفتح منفذ mDNS في جدار الحماية
sudo systemctl enable --now avahi-daemon
sudo firewall-cmd --add-service=mdns --permanent
sudo firewall-cmd --reload
```

---

## 🪟 2. إعداد النطاق إذا كان السيرفر يعمل على Windows 10

1. **تغيير اسم جهاز الويندوز إلى `kernelping`:**
   - افتح **Settings > System > About**.
   - اضغط **Rename this PC** واكتب: `kernelping`.
   - أعد تشغيل الجهاز.
2. **تثبيت خدمة Bonjour للبث:**
   - نزل وثبت أداة آبل المجانية [Bonjour Print Services](https://support.apple.com/kb/DL999).
   - ستقوم الخدمة ببث اسم الجهاز تلقائياً بالصيغة: `kernelping.local`.
3. **فتح منفذ mDNS وجدار الحماية:**
   ```powershell
   New-NetFirewallRule -DisplayName "Kernel Ping mDNS" -Direction Inbound -LocalPort 5353 -Protocol UDP -Action Allow
   New-NetFirewallRule -DisplayName "Kernel Ping HTTP" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
   ```

---

## ⚡ 3. إلغاء الحاجة لكتابة رقم المنفذ `:8000` عبر Nginx

لجعل الرابط يفتح فوراً بمجرد كتابة **`http://kernelping.local`** (على المنفذ القياسي 80):

على سيرفر دبيان/لينكس، قم بتثبيت خادم Nginx وتوجيه المنفذ 80 للمنفذ 8000:
```nginx
# /etc/nginx/sites-available/kernelping
server {
    listen 80;
    server_name kernelping.local localhost;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```
ثم تفعيل الإعداد:
```bash
sudo ln -sf /etc/nginx/sites-available/kernelping /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx
```

---

## 📱 4. توافق أجهزة الفريق المختلفة في المكتب

بمجرد تشغيل السيرفر وبث النطاق:

| نوع الجهاز | طريقة الدخول | ملاحظات التوافق |
| :--- | :--- | :--- |
| **أجهزة Apple (Mac, iPhone, iPad)** | `http://kernelping.local` | مدعوم بشكل افتراضي وتلقائي بنسبة 100% عبر خدمة Apple Bonjour المدمجة في نظام iOS و macOS. |
| **أجهزة Windows 10 / 11** | `http://kernelping.local:8000` | مدعوم تلقائياً عبر ميزة mDNS المدمجة في ويندوز 10 (إصدار 1803 وما بعده). |
| **أجهزة Linux** | `http://kernelping.local:8000` | مدعوم عبر مكتبة `nss-mdns` المدمجة بمعظم التوزيعات. |
| **أجهزة أندرويد الحديثة (Android 12+)** | `http://kernelping.local` | تدعم الـ mDNS مباشرة في متصفح كروم. |
| **أجهزة أندرويد القديمة أو شبكات المؤسسات** | عبر خيار الراوتر أدناه | اقرأ الخطوة 5 لتثبيته في راوتر المكتب. |

---

## 📡 5. الحل الشامل لكافة الأجهزة عبر راوتر المكتب (Router Local DNS)

إذا كنت تريد أن يعمل الرابط **`http://kernelping.local`** على **كافة** الهواتف والأجهزة القديمة والجديدة بدون أي استثناء وبدون أي إعدادات على أجهزة المستخدمين:

1. ادخل لصفحة لوحة تحكم راوتر المكتب (مثل: MikroTik أو TP-Link أو OpenWrt أو Huawei).
2. في إعدادات الـ DHCP، قم بتثبيت عنوان الآي بي الداخلي للسيرفر (مثال: `192.168.1.50`).
3. في إعدادات **DNS / Static Entries**، أضف سجلاً جديداً:
   - **Hostname / Domain:** `kernelping.local`
   - **IP Address:** `192.168.1.50`
4. احفظ الإعدادات. الآن بمجرد اتصال أي هاتف بالواي فاي، سيتعرف الراوتر فوراً على `kernelping.local` ويوجهه لسيرفر النظام مباشرة!
