import { useState, useEffect } from "react";
import { Server, Terminal, Sparkles, LogOut, ArrowLeftRight, HelpCircle } from "lucide-react";
import Dashboard from "./components/Dashboard";
import BotSimulator from "./components/BotSimulator";
import LogsPanel from "./components/LogsPanel";
import DeploymentGuide from "./components/DeploymentGuide";
import { SystemStats, DownloadLog, ChatMessage } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dash" | "guide">("dash");
  const [isCleaning, setIsCleaning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // High fidelity default telemetry stats (synced with middleware server)
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 1420,
    activeUsers: 342,
    downloadsToday: 189,
    successfulDownloads: 178,
    failedDownloads: 11,
    cpuUsage: 14,
    memoryUsage: 124,
    memoryTotal: 512,
    queueLength: 0,
    concurrencyLimit: 5
  });

  const [logs, setLogs] = useState<DownloadLog[]>([]);

  // Local chat instance simulator history
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "init-1",
      sender: "system",
      text: "تم ربط محاكاة بوت تيليجرام بنظام الويب هوك الخاص بالسيرفر",
      timestamp: "21:49:00"
    },
    {
      id: "bot-welcome",
      sender: "bot",
      text: "👋 أهلاً بك في بوت تحميل الفيديوهات المطور!\n\nأرسل لي أي رابط من المنصات التالية وسأقوم بتحميله فوراً وبأعلى جودة متاحة:\n• 🎬 يوتيوب (YouTube & Shorts)\n• 🎵 تيك توك (TikTok)\n• 📸 إنستغرام (Instagram Reels)\n• 👥 فيسبوك (Facebook)\n\n💡 أرسل أو اختر /help للحصول على مساعدة كاملة.",
      timestamp: "21:49:02"
    }
  ]);

  // Sync / Poll admin dashboard stats from the fullstack Express backend in real-time
  const fetchDashboardStats = async () => {
    try {
      const resp = await fetch("/api/admin");
      if (resp.ok) {
        const data = await resp.json();
        setStats({
          totalUsers: data.totals.total_users,
          activeUsers: data.totals.active_users_today,
          downloadsToday: data.totals.downloads_today,
          successfulDownloads: data.totals.successful_downloads,
          failedDownloads: data.totals.failed_downloads,
          cpuUsage: data.totals.cpu_usage,
          memoryUsage: data.totals.memory_usage,
          memoryTotal: data.totals.memory_total,
          queueLength: data.totals.queue_length,
          concurrencyLimit: data.config.max_file_size_mb === 50 ? 5 : 8
        });
        setLogs(data.recent_logs);
      }
    } catch (e) {
      console.error("Failed to sync stats with full-stack middleware:", e);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    // Poll stats every 3 seconds to keep graphs, tables, and logging rows perfectly fresh as users click simulated buttons
    const interval = setInterval(fetchDashboardStats, 3000);
    return () => clearInterval(interval);
  }, []);

  // Force sweeping temporary files (Admin API Action)
  const handleForceCleanup = async () => {
    setIsCleaning(true);
    try {
      await fetch("/api/admin/cleanup", { method: "POST" });
      setTimeout(() => {
        setIsCleaning(false);
        fetchDashboardStats();
      }, 1000);
    } catch {
      setIsCleaning(false);
    }
  };

  // Simulates client message send pipeline
  const handleSendMessage = async (text: string) => {
    if (isProcessing) return;

    const userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      // Notify endpoint of new simulation event
      const resp = await fetch("/api/telegram/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "user_message",
          text,
          userId: "1928172",
          username: "saleanaidan"
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        setTimeout(() => {
          const botMsg: ChatMessage = {
            id: "msg-bot-" + Date.now(),
            sender: "bot",
            text: data.text,
            buttons: data.buttons,
            timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })
          };
          setChatHistory((prev) => [...prev, botMsg]);
          setIsProcessing(false);
          fetchDashboardStats(); // update counters
        }, 800);
      }
    } catch {
      setIsProcessing(false);
    }
  };

  // Handles inline keyboard quality select callback simulator flow
  const handleSelectOption = async (option: string, originalMsgId: string, platform: string, url: string) => {
    setIsProcessing(true);

    // Filter quality parameter label cleanly
    const qualityMap: Record<string, string> = {
      "🎬 أفضل جودة (Best)": "best",
      "🖥️ 1080p": "1080p",
      "📺 720p": "720p",
      "📱 480p": "480p",
      "🎵 ملف صوتي MP3": "mp3"
    };
    const mappedQuality = qualityMap[option] || "720p";

    // Add inline clicked update notification in chat log
    const statusMsgId = "status-" + Date.now();
    
    // Simulate callback initiation
    const triggerWebhookWebhook = async () => {
      await fetch("/api/telegram/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select_quality",
          platform,
          url: "https://youtube.com/watch?v=ytdl_engine_test",
          qualitySelected: mappedQuality,
          userId: "1928172",
          username: "saleanaidan"
        })
      });
      fetchDashboardStats();
    };

    await triggerWebhookWebhook();

    setChatHistory((prev) => [
      ...prev,
      {
        id: statusMsgId + "-step1",
        sender: "bot",
        text: `⏳ **جاري تحليل الرابط والتحويل...**\n⚙️ الجودة المتبعة: ${option}\n⚠️ يرجى عدم إرسال روابط مكررة حالياً.`,
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })
      }
    ]);

    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        {
          id: statusMsgId + "-step2",
          sender: "bot",
          text: `📥 **جاري تحميل مقطع الفيديو...**\n📦 المصدر: ${platform.toUpperCase()}\n🤖 الحجم المفترض: ${(5 + Math.random() * 25).toFixed(1)} MB`,
          timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })
        }
      ]);
    }, 1500);

    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        {
          id: statusMsgId + "-step3",
          sender: "bot",
          text: `📤 **جاري دفع وتصدير الملف النهائي لتيليجرام...**`,
          timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })
        }
      ]);
    }, 3000);

    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        {
          id: statusMsgId + "-step4",
          sender: "bot",
          text: `✅ **تم إرسال وتحميل الملف بنجاح!**`,
          completedDownload: {
            title: `Telegram_Downloader_Result_${platform}.mp4`,
            size: `${(5 + Math.random() * 25).toFixed(1)} MB`,
            platform: platform.toUpperCase(),
            quality: option
          },
          timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })
        }
      ]);
      setIsProcessing(false);
      fetchDashboardStats(); // reload logs log audit table index
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#E0E0E6] flex flex-col font-sans" id="app-root">
      {/* Top Main Navigation Header */}
      <header className="bg-[#0D0D10] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2 font-display">
                منصة تحليل وقنوات بوتات تيليجرام
                <span className="text-[10px] bg-white/5 text-blue-400 px-2 py-0.5 rounded-full font-semibold border border-white/10 font-mono">
                  v2.1.0 Cloud
                </span>
              </h1>
              <p className="text-[11px] text-white/40 font-medium">
                Telegram Video Downloader Administration & Interactive Sandbox
              </p>
            </div>
          </div>

          {/* Tab Selector Links */}
          <div className="flex items-center gap-2 bg-[#141418] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab("dash")}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === "dash" 
                  ? "bg-white/10 text-white border border-white/10 shadow-inner" 
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              لوحة التحكم (Dashboard)
            </button>
            <button
              onClick={() => setActiveTab("guide")}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === "guide" 
                  ? "bg-white/10 text-white border border-white/10 shadow-inner" 
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              أكواد النشر الجاهز (Deployment Repo)
            </button>
          </div>

        </div>
      </header>

      {/* Main Core Viewport Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column Mock Phone Sandbox */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-4">
            <div className="bg-[#141418] p-4 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 font-serif italic text-4xl">★</div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 justify-end mb-2">
                بيئة اختبار البوت التفاعلية للمشتركين (Telegram UI Sandbox)
                <Sparkles className="w-4 h-4 text-blue-500" />
              </h3>
              <p className="text-[11px] text-white/40 leading-relaxed text-right">
                جرب محاكاة إرسال الروابط أو الضغط على الأزرار لترى كيف يعمل المطبخ البرمجي (بايثون/FastAPI) الخاص بالتحميل بمختلف المراحل، وتراقب تحديث لوحة التحكم فورا.
              </p>
            </div>
            <BotSimulator
              chatHistory={chatHistory}
              onSendMessage={handleSendMessage}
              onSelectOption={handleSelectOption}
              isProcessing={isProcessing}
            />
          </div>

          {/* Right Column Monitor Screens */}
          <div className="lg:col-span-12 xl:col-span-7 space-y-8">
            {activeTab === "dash" ? (
              <>
                <Dashboard
                  stats={stats}
                  logs={logs}
                  onForceCleanup={handleForceCleanup}
                  isCleaning={isCleaning}
                />
                <LogsPanel logs={logs} />
              </>
            ) : (
              <DeploymentGuide />
            )}
          </div>

        </div>
      </main>

      {/* Footer Banner */}
      <footer className="bg-[#0D0D10] border-t border-white/5 py-6 mt-12 text-center text-xs text-white/30">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 font-mono">
          <span>Deployment Status: Cloud Run Verified</span>
          <span>© 2026 Developer Cloud Platform Services</span>
        </div>
      </footer>
    </div>
  );
}
