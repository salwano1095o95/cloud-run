import { useState } from "react";
import { ShieldCheck, HardDrive, Terminal, Award, HelpCircle, Code, Server, AppWindow, ArrowRightLeft } from "lucide-react";

export default function DeploymentGuide() {
  const [activeTab, setActiveTab] = useState<"arch" | "deploy" | "security" | "scaling">("arch");

  return (
    <div className="bg-[#141418] rounded-2xl border border-white/5 p-5 space-y-6" id="deployment-guide">
      {/* Tab Selectors */}
      <div className="flex border-b border-white/5 pb-3 overflow-x-auto whitespace-nowrap gap-2">
        <button
          onClick={() => setActiveTab("arch")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
            activeTab === "arch" 
              ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
              : "text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          مخطط المعمارية والملفات (Architecture)
        </button>

        <button
          onClick={() => setActiveTab("deploy")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
            activeTab === "deploy" 
              ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
              : "text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          خطوات النشر السحابي (Deploy Guide)
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
            activeTab === "security" 
              ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
              : "text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          الدليل الأمني والحماية (Security)
        </button>

        <button
          onClick={() => setActiveTab("scaling")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
            activeTab === "scaling" 
              ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
              : "text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          هيكلة الأداء والترقية (Performance & Scaling)
        </button>
      </div>

      {/* Tab 1: Architecture Diagrams */}
      {activeTab === "arch" && (
        <div className="space-y-6 text-right">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5 justify-end">
              مخطط تدفق العمليات (Download Pipeline Flows)
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            </h4>
            <div className="mt-4 bg-black/60 p-4 rounded-xl border border-white/5 text-left font-mono text-[11px] text-blue-400 overflow-x-auto whitespace-pre leading-relaxed">
{`   [User Link] ────────────────────► [Telegram Hook API] ────────► [Verify Cooldown DB]
                                            │ (X-Telegram-Secret Validation)  │
                                            ▼                                 ▼
    [Deliver Audio/Video] ◄──────── [Format & Download] ◄─── [Validate URL] ◄─ [Extract Metadata ytdl]
            │                         (/tmp storage)             (Anti-SSRF)
            ▼
    [Immediate sweep temp]`}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5 justify-end">
              هيكل مستودع الكود (Production Project Directory Structure)
              <Code className="w-4 h-4 text-blue-400" />
            </h4>
            <div className="mt-3 bg-black/60 p-4 rounded-xl border border-white/5 text-left font-mono text-[11px] text-white/70 leading-relaxed">
{`telegram-downloader-platform/
├── backend_python/             # Complete Python 3.12 FastAPI microservice
│   ├── config.py             # Pydantic system settings & env variables validator
│   ├── db.py                 # SQLite transaction managers, audits & spam limits
│   ├── downloader.py         # yt-dlp async engine, sanitizers & file constraints
│   ├── bot.py                # Telegram raw async HTTPS events & Arabic templates
│   ├── main.py               # FastAPI router hooks, telemetry (/metrics) & health
│   ├── requirements.txt      # Stable python wheels (fastapi, yt-dlp, psutil, httpx)
│   ├── Dockerfile            # Optimized python:slim with ffmpeg bindings
│   └── .dockerignore         # Safe exclusions protecting local env states
├── src/                      # Modern React Analytics & Simulator UI
├── server.ts                 # Fullstack Express Simulator middleware (port 3000)
└── package.json              # Sandbox workspace compilation script bindings`}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Deployment Guide */}
      {activeTab === "deploy" && (
        <div className="space-y-6 text-right leading-relaxed animate-fade-in">
          <div>
            <h4 className="text-sm font-bold text-white justify-end flex gap-1.5 items-center">
              1. إعداد المتغيرات البيئية (.env file setup)
              <Terminal className="w-4 h-4 text-blue-400" />
            </h4>
            <p className="text-xs text-white/40 mt-1">قم بإنشاء ملف `.env` في المسار الرئيسي واحرص على ملئه بالقيم الآمنة دون رفعها لمستودع Git:</p>
            <div className="mt-2 bg-black/60 p-4 rounded-xl border border-white/5 text-left font-mono text-[11px] text-white/70">
{`TELEGRAM_BOT_TOKEN="123456789:AAH_your_token_from_botfather"
WEBHOOK_URL="https://telegram-downloader-y3mda2p-ew.a.run.app/telegram/webhook"
SECRET_TOKEN="YourSecureSignatureValue321!"
MAX_FILE_SIZE_MB=50
RATE_LIMIT_COOLDOWN_SEC=10
MAX_CONCURRENT_DOWNLOADS=5`}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white justify-end flex gap-1.5 items-center">
              2. أوامر البناء والنشر على Google Cloud Run
              <Server className="w-4 h-4 text-emerald-400" />
            </h4>
            <div className="mt-2 bg-black/60 p-4 rounded-xl border border-white/5 text-left font-mono text-[11px] text-white/70 space-y-2">
              <div><span className="text-emerald-400"># 1. تسجيل الدخول في منصة Google Cloud</span></div>
              <div>gcloud auth login</div>
              <div>gcloud config set project [YOUR_PROJECT_ID]</div>
              <div className="pt-2"><span className="text-emerald-400"># 2. بناء الحاوية ودفعها إلى Google Artifact Registry</span></div>
              <div>gcloud builds submit --tag gcr.io/[YOUR_PROJECT_ID]/telegram-downloader ./backend_python</div>
              <div className="pt-2"><span className="text-emerald-400"># 3. النشر على Cloud Run مع حجز الذاكرة العشوائية المناسبة لـ yt-dlp</span></div>
              <div>gcloud run deploy telegram-downloader \</div>
              <div>  --image gcr.io/[YOUR_PROJECT_ID]/telegram-downloader \</div>
              <div>  --platform managed \</div>
              <div>  --region europe-west2 \</div>
              <div>  --allow-unauthenticated \</div>
              <div>  --memory 1Gi \</div>
              <div>  --cpu 1 \</div>
              <div>  --set-env-vars="TELEGRAM_BOT_TOKEN=[TOKEN],SECRET_TOKEN=[TOKEN],WEBHOOK_URL=https://[LINK]/telegram/webhook"</div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white justify-end flex gap-1.5 items-center">
              3. تفعيل الويب هوك (Activate Telegram Webhook)
              <AppWindow className="w-4 h-4 text-indigo-400" />
            </h4>
            <p className="text-xs text-white/40 mt-1">
              بعد اكتمال النشر، سيقوم السيرفر بتنشيط الويب هوك تلقائياً خلال التحميل الأول، ويمكنك أيضاً ربطه يدوياً عن طريق إرسال طلب GET مباشر للرابط:
            </p>
            <div className="mt-2 bg-black/60 p-3 rounded-xl border border-white/5 text-left font-mono text-[11px] text-blue-400 truncate">
              {`https://api.telegram.org/bot[YOUR_BOT_TOKEN]/setWebhook?url=[YOUR_CLOUD_RUN_URL]/telegram/webhook&secret_token=[YOUR_SECRET_TOKEN]`}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security */}
      {activeTab === "security" && (
        <div className="space-y-4 text-right leading-relaxed animate-fade-in">
          <div className="bg-[#0F0F12] p-4 rounded-xl border border-white/5 flex items-start gap-3 flex-row-reverse">
            <div className="bg-blue-500/10 text-blue-400 p-2.5 rounded-lg border border-blue-500/10"><ShieldCheck className="w-4 h-4" /></div>
            <div>
              <h4 className="text-xs font-bold text-white font-sans">التحقق من صحة Webhook لمنع انتحال الهوية (SSRF Defense)</h4>
              <p className="text-[11px] text-white/50 mt-1">
                نستخدم ترويسة <code className="font-mono text-[10px] bg-black/40 text-blue-300 px-1 py-0.5 rounded border border-white/5">X-Telegram-Bot-Api-Secret-Token</code> الخاصة. نرفض تماماً معالجة أي طلب وارد إلى البوابة الخلفية للويب هوك ما لم يحتوي على القيمة المطابقة للسر المولد مسبقاً، مما يقضي على هجمات التزييف تماماً.
              </p>
            </div>
          </div>

          <div className="bg-[#0F0F12] p-4 rounded-xl border border-white/5 flex items-start gap-3 flex-row-reverse">
            <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-lg border border-emerald-500/10"><ShieldCheck className="w-4 h-4" /></div>
            <div>
              <h4 className="text-xs font-bold text-white font-sans">تنقية وحظر هجمات حقن الأوامر (Sanitization & Command Shell Injection)</h4>
              <p className="text-[11px] text-white/50 mt-1">
                لا نمرر الروابط مباشرة إلى موجه أوامر Bash. نستخدم مكتبة <code className="font-mono text-[10px] bg-black/40 text-blue-300 px-1 py-0.5 rounded border border-white/5">yt_dlp</code> برمجياً عبر استدعاءات بايثون ومستمعات الترابط الفردية، ويتم اختيار خيار <code className="font-mono text-[10px] bg-black/40 text-blue-300 px-1 py-0.5 rounded border border-white/5">restrictfilenames</code> لتجنب محاولات تجاوز المسار وحقن الرموز الخبيثة.
              </p>
            </div>
          </div>

          <div className="bg-[#0F0F12] p-4 rounded-xl border border-white/5 flex items-start gap-3 flex-row-reverse">
            <div className="bg-amber-500/10 text-amber-400 p-2.5 rounded-lg border border-amber-500/10"><ShieldCheck className="w-4 h-4" /></div>
            <div>
              <h4 className="text-xs font-bold text-white font-sans">حماية موارد الذاكرة من الإغراق (Resource Protection)</h4>
              <p className="text-[11px] text-white/50 mt-1">
                يتم تحديد حجم الملف الأقصى بـ 50MB (الحد المسموح لملفات بوتات تيليجرام العادية)، مما يحمي الخادم من نفاد سعة التخزين المؤقت، إلى جانب تفعيل محدد معدلات الاستعلام (Rate Limiter) لمنع إغراق الخادم بالطلبات المكثفة من مستخدم واحد.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Performance & Scaling */}
      {activeTab === "scaling" && (
        <div className="space-y-4 text-right leading-relaxed animate-fade-in">
          <div className="bg-[#0F0F12] p-4 rounded-xl border border-white/5">
            <h4 className="text-xs font-bold text-white font-sans">تحسين سرعة معالجة الملفات الكبيرة (File I/O Optimization)</h4>
            <p className="text-[11px] text-white/50 mt-1">
              يتم النشر على بيئات Google Cloud Run في السيرفرات السحابية. نظراً لأن نظام الملفات في Cloud Run يعمل على الذاكرة العشوائية المستأجرة بالكامل (tmpfs)، فإن عمليات القراءة والمزامنة للتخزين المؤقت لمجلد <code className="font-mono text-[10px] bg-black/40 text-blue-300 px-1 py-0.5 rounded border border-white/5">/tmp</code> فائقة السرعة وتقارب سرعة المعالجة المباشرة للذاكرة.
            </p>
          </div>

          <div className="bg-[#0F0F12] p-4 rounded-xl border border-white/5">
            <h4 className="text-xs font-bold text-white font-sans">الترقية لتغطية مئات الآلاف من الاستعلامات (Production Scaling Strategy)</h4>
            <p className="text-[11px] text-white/50 mt-1">
              على الرغم من كفاية SQLite لقضاء آلاف الطلبات اليومية، إلا أنه لترقية النظام وتجاوز حدود توازي السيرفرات في الحالات الضخمة:
            </p>
            <ul className="text-[11px] text-white/40 list-disc list-inside mt-2 space-y-1.5 pr-3">
              <li>تعديل رابط الاتصال في ملف الإعدادات للربط بقاعدة بيانات <strong className="text-white font-semibold">Google Cloud SQL (PostgreSQL)</strong> المدارة لتأمين معايير ACID التامة.</li>
              <li>فصل معالجة الفيديوهات الثقيلة في طوابير معالجة موزعة حقيقية باستخدام <strong className="text-white font-semibold">Celery / RabbitMQ</strong> وتفعيل سيرفرات مخصصة (Workers) لمعالجة التحميل بعيداً عن سيرفر الويب هوك لتوليد استقرار بنسبة 100%.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
