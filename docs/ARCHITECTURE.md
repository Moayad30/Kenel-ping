# 🏗️ معمارية وهيكلية نظام Kernel Ping (Architecture Deep Dive)

يقوم نظام **Kernel Ping** على معمارية معيارية حديثة مصممة خصيصاً للتشغيل الموثوق في بيئات العمل المشتركة، مع التركيز على الأداء السريع، عزل الواجهات، ومنع تضارب الصوت نهائياً.

---

## 📐 المخطط المعماري العام (System Architecture Flowchart)

```mermaid
flowchart TD
    subgraph Clients["أجهزة وواجهات المستخدمين (Clients)"]
        PublicUI["🌐 الواجهة العامة للأعضاء (/)\n(عرض كرت الصوت المتصل، التحكم بمستوى الصوت، الجمل، والنطق الحر)"]
        AdminUI["🔒 لوحة الإدارة (/admin)\n(تسجيل فويس مباشر للبفلة، هندسة الصوت، الجمل والتصنيفات، وتدقيق العمليات)"]
    end

    subgraph BackendEngine["خادم التطبيق ومحرك الصوت (FastAPI Backend)"]
        API["FastAPI REST Endpoints\n(/api/speak, /api/volume, /api/presets, /api/admin)"]
        WS["WebSocket Hub (/ws)\n(مزامنة الحالة اللحظية، مهلة التكرار، ومستوى الصوت)"]
        AuthLayer["طبقة التحقق المشفرة\n(PyJWT Bearer Tokens)"]
        TashkeelEngine["معالج التشكيل الآلي (AI Tashkeel)\n(Mishkal Arabic Vocalizer)"]
        VoiceHandler["معالج الفويس المباشر (Zero Retention Handler)\n(استلام البث، تشغيله، وحذفه فورياً)"]
        
        subgraph QueueSystem["نظام الطابور والمخرجات الصوتية (Audio Engine)"]
            Q["asyncio.Queue\n(معالجة تسلسلية لمنع تداخل الأصوات)"]
            Worker["Queue Worker Thread\n(Chime -> BT Ping -> MP3 Playback)"]
            Cooldown["Universal Spam Cooldown Tracker\n(تتبع مهلة التكرار للجمل والنطق الحر)"]
            SinkDetector["مكتشف كرت الصوت الفعلي\n(PipeWire / WirePlumber / ALSA Detection)"]
        end
    end

    subgraph LinuxAudioSubsystem["بيئة الصوت لنظام التشغيل (Linux Audio Subsystem)"]
        PipeWire["خادم صوت PipeWire"]
        MPV["مشغل الصوت mpv (Low-Latency)"]
        HardwareCard["كرت الصوت الفعلي (Internal ALC256 / Bluetooth Speaker / AUX)"]
    end

    PublicUI <-->|HTTP REST & WebSockets| API
    AdminUI <-->|Authorized JWT REST & WebSockets| API
    API --> AuthLayer
    API --> QueueSystem
    API --> VoiceHandler
    VoiceHandler --> MPV
    QueueSystem --> Worker
    Worker --> MPV
    MPV --> PipeWire
    PipeWire --> HardwareCard
    SinkDetector -.->|مراقبة واستعلام| HardwareCard
```

---

## 🏛️ المكونات الأساسية للنظام

### 1. واجهة الأعضاء العامة (Public Workspace)
- واجهة خفيفة وسريعة مصممة بنظام SPA عبر React 19 و Tailwind CSS.
- تتصل بالخادم عبر قناتين:
  - **REST API:** لإرسال الأوامر والنداءات وضبط مستوى الصوت.
  - **WebSocket:** لاستقبال التحديثات اللحظية (تغير حالة البفلة، دوران الطابور، مستوى الصوت، والمهلة المتبقية).
- تتيح لأي عضو معرفة كرت الصوت الفعلي المتصل وضبط درجة علو الصوت مباشرة.

### 2. لوحة الإدارة والتحكم (Admin Control Center)
- لوحة محمية بمصادقة مشفرة عبر JWT (JSON Web Tokens).
- تدمج الواجهة العامة بالكامل لإتاحة الاستخدام السريع، مع إضافة استديو التسجيل الصوتي المباشر (Voice Broadcast Studio) للبث إلى البفلة مع الحذف الفوري التام.
- إدارة تصنيفات الجمل (بما فيها خيار "غير مصنف").
- سجل العمليات والتدقيق مع تأكيد الحذف لمنع الأخطاء البشرية.

### 3. خادم التطبيق ومحرك الصوت (FastAPI & AudioEngine)
- مبني على لغة Python 3 بنظام غير متزامن بالكامل (`asyncio`).
- نظام طابور تسلسلي يمنع تراكب الأصوات أو انقطاعها.
- كشف ذكي عن كرت الصوت النشط والتفريق بين المخرج الداخلي والسماعة الخارجية.
- تحكم مستقل بمستوى صوت نغمات التنبيه المسبقة.

### 4. محرك توقيت النغمة المتزامن (Synchronized Chime Engine)
- **دورة المعالجة المتزامنة (Zero Gap Audio Cycle):**
  1. استلام الطلب ووضعه في طابور `asyncio.Queue`.
  2. سحب العنصر وتوليد الصوت عبر `edge-tts` (أو جلب ملف الـ MP3 المخزن محلياً).
  3. التأكد من جهوزية الملف الصوتي على القرص 100%.
  4. إطلاق نغمة التنبيه (Pre-Chime) على مستوى الصوت المحدد.
  5. تطبيق مهلة إيقاظ البلوتوث (400ms).
  6. تشغيل الصوت فوراً عبر `mpv` دون أي ثانية صمت أو تأخير بعد النغمة.

### 5. نظام الإيقاف الطارئ وحماية البث المباشر (Emergency Stop & Mic Protection)
- يتيح إنهاء عملية تشغيل `mpv` النشطة وتفريغ طابور النداءات وإعادة النظام لحالة `ready`.
- **طبقة أمان مخصصة للبث المباشر للمشرف (`source: admin_voice`):**
  - عند بث صوت بشري مباشر من مايك المشرف، يُحظر على الأعضاء إيقافه نهائياً من الواجهة أو عبر الـ API.
  - يتحقق مسار `/api/audio/stop` في الباك إند من توكن المشرف المشفر (`JWT`)؛ وإذا لم يكن المشرف هو من طلب الإيقاف، يتم إرجاع استجابة `HTTP 403 Forbidden` فوراً لحماية الرسالة الصوتية الحية من المقاطعة.
