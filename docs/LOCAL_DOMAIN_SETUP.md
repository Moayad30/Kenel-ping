# 🌐 دليل إعداد النطاق المحلي (kernelping.local Setup Guide)

يشرح هذا الدليل كيفية تمكين كافة أجهزة المكتب (الحواسيب المحمولة، الشاشات، وهواتف الفريق) من الوصول إلى نظام **Kernel Ping** عبر النطاق المخصص المباشر:
👉 **`http://kernelping.local`**

---

## 🧭 كيف تعمل النطاقات المحلية المنتهية بـ `.local`؟

وفقاً للمعيار القياسي العالمي **RFC 6762**، فإن النطاقات المنتهية بالامتداد `.local` لا تتطلب اشتراك دومين أو اتصالاً بالإنترنت الخارجي، بل تعتمد على تقنية **Multicast DNS (mDNS)** التي تبث اسم الجهاز عبر الشبكة المحلية (LAN / Wi-Fi) ليتمكن أي جهاز متصل بنفس الراوتر من التعرف عليه فوراً.

---

## 🐧 1. إعداد السيرفر (Fedora أو Debian)

### على نظام فيدورا (Fedora KDE 44 Workstation):
```bash
# 1. التأكد من وجود حزم avahi
sudo dnf install -y avahi avahi-tools

# 2. تشغيل وتفعيل خدمة Avahi
sudo systemctl enable --now avahi-daemon

# 3. فتح منفذ mDNS في جدار الحماية (Firewalld)
sudo firewall-cmd --add-service=mdns --permanent
sudo firewall-cmd --reload
```

### على نظام دبيان (Debian 13 Server):
```bash
# 1. تثبيت الحزم
sudo apt update && sudo apt install -y avahi-daemon avahi-utils

# 2. تشغيل الخدمة
sudo systemctl enable --now avahi-daemon
```

---

## 📝 2. تثبيت الاسم المحلي في `/etc/hosts`

على الجهاز الذي يستضيف النظام (السيرفر نفسه)، نفذ الأمر التالي لضمان التوجيه اللحظي:
```bash
echo "127.0.0.1  kernelping.local" | sudo tee -a /etc/hosts
```
أو قم بتشغيل الاسكريبت الآلي المرفق بالمشروع:
```bash
./scripts/setup_domain.sh
```

---

## 📱 3. دعم أجهزة العملاء المختلفة في المكتب (Client Devices)

بمجرد تشغيل خدمة `avahi-daemon` على السيرفر:

1. **أجهزة Apple (MacBook, iPhone, iPad):**
   - تدعم بروتوكول Bonjour/mDNS بشكل افتراضي ومدمج منذ سنوات.
   - يفتح المتصفح فوراً ويكتب العضو: `http://kernelping.local:8000/` أو `http://kernelping.local/`.

2. **أجهزة Windows (Windows 10 / Windows 11):**
   - تدعم نظام mDNS تلقائياً دون الحاجة لتثبيت أي برامج إضافية.
   - يكتب المستخدم في Edge أو Chrome: `http://kernelping.local:8000/`.

3. **أجهزة Linux (Ubuntu, Fedora, Arch, Mint):**
   - تدعم التوجيه عبر مكتبة `nss-mdns` المدمجة بمعظم التوزيعات.

4. **أجهزة Android والشبكات الكبيرة:**
   - إذا كان راوتر المكتب يحتوي على خادم DNS داخلي (مثل MikroTik، Pi-hole، أو OpenWrt):
     * يمكنك ببساطة إضافة سجل ثابت (Static DNS Entry):
       - Name: `kernelping.local`
       - IP Address: `<عنوان_الآي_بي_الداخلي_للسيرفر>`
     * بهذا يعمل الرابط 100% على كافة الهواتف والشاشات الذكية بدون استثناء!

