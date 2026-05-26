import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Local state for simulation to make the Admin Dashboard feel fully alive and interactive!
let stats = {
  totalUsers: 1420,
  activeUsers: 342,
  downloadsToday: 189,
  successfulDownloads: 178,
  failedDownloads: 11,
  cpuUsage: 14,
  memoryUsage: 124, // MB
  memoryTotal: 512, // MB
  queueLength: 0
};

interface SimLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'unknown';
  url: string;
  fileSize: string;
  status: 'completed' | 'failed' | 'processing' | 'queued';
  duration: number;
  error?: string;
  qualitySelected?: string;
}

let logs: SimLog[] = [
  {
    id: "tx-8921",
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    userId: "8271029",
    username: "ahmed_ar",
    platform: "tiktok",
    url: "https://www.tiktok.com/@creator/video/987162534",
    fileSize: "8.4 MB",
    status: "completed",
    duration: 3.2,
    qualitySelected: "best"
  },
  {
    id: "tx-8920",
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    userId: "1928371",
    username: "sara_khan",
    platform: "instagram",
    url: "https://www.instagram.com/reel/C8xlK29uH2S/",
    fileSize: "14.1 MB",
    status: "completed",
    duration: 4.8,
    qualitySelected: "1080p"
  },
  {
    id: "tx-8919",
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    userId: "5546190",
    username: "khalid_ar",
    platform: "youtube",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    fileSize: "32.0 MB",
    status: "completed",
    duration: 12.1,
    qualitySelected: "720p"
  },
  {
    id: "tx-8918",
    timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
    userId: "2938102",
    username: "fatima_33",
    platform: "facebook",
    url: "https://www.facebook.com/watch/?v=8817265152",
    fileSize: "0.0 MB",
    status: "failed",
    duration: 15.0,
    error: "Extraction Timeout: Media host did not respond in 15s",
    qualitySelected: "best"
  }
];

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;

  // API 1: Healthcheck
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      storage: {
        total_gb: "20.00",
        free_gb: "17.42"
      }
    });
  });

  // API 2: Metrics in Prometheus format (simulated JSON wrapper)
  app.get("/api/metrics", (req: Request, res: Response) => {
    res.json({
      system_memory_used_mb: stats.memoryUsage + (Math.random() * 4 - 2),
      system_cpu_percent: Math.max(5, Math.min(95, stats.cpuUsage + Math.floor(Math.random() * 6 - 3))),
      concurrency_limit: 5,
      active_queue_length: stats.queueLength,
      total_users: stats.totalUsers,
      active_users_today: stats.activeUsers,
      downloads_today: stats.downloadsToday,
      successful_downloads: stats.successfulDownloads,
      failed_downloads: stats.failedDownloads
    });
  });

  // API 3: Admin dashboard aggregation
  app.get("/api/admin", (req: Request, res: Response) => {
    res.json({
      totals: {
        total_users: stats.totalUsers,
        active_users_today: stats.activeUsers,
        downloads_today: stats.downloadsToday,
        successful_downloads: stats.successfulDownloads,
        failed_downloads: stats.failedDownloads,
        cpu_usage: Math.max(5, Math.min(95, stats.cpuUsage + Math.floor(Math.random() * 6 - 3))),
        memory_usage: Math.round(stats.memoryUsage + (Math.random() * 4 - 2)),
        memory_total: stats.memoryTotal,
        queue_length: stats.queueLength
      },
      recent_logs: logs,
      config: {
        max_file_size_mb: 50,
        rate_limit_cooldown_sec: 10,
        temporary_dir: "/tmp/downloads"
      }
    });
  });

  // API 4: Interactive Simulator Webhook updates!
  app.post("/api/telegram/simulate", (req: Request, res: Response) => {
    const { action, text, qualitySelected, messageId, userId, username } = req.body;
    const resolvedUser = userId || "9928172";
    const resolvedName = username || "simulate_user";

    if (action === "user_message") {
      // Simulate receiving command or URL
      const input = (text || "").trim();
      
      // Update session metrics
      if (!logs.some(l => l.userId === resolvedUser)) {
        stats.totalUsers += 1;
      }
      stats.activeUsers = Math.min(stats.totalUsers, stats.activeUsers + 1);

      // Respond based on command
      if (input.startsWith("/")) {
        if (input === "/start") {
          res.json({
            role: "bot",
            text: `👋 أهلاً بك يا ${resolvedName} في بوت تحميل الفيديوهات المطور!\n\nأرسل لي أي رابط من المنصات التالية وسأقوم بتحميله فوراً وبأعلى جودة متاحة:\n• 🎬 يوتيوب (YouTube & Shorts)\n• 🎵 تيك توك (TikTok)\n• 📸 إنستغرام (Instagram Reels)\n• 👥 فيسبوك (Facebook)\n\n💡 **ميزات البوت:**\n⚡ فائق السرعة وبدون إعلانات\n⚙️ يتيح لك اختيار الجودة المناسبة\n🎵 إمكانية استخراج الصوت فقط بصيغة MP3`
          });
        } else if (input === "/help") {
          res.json({
            role: "bot",
            text: `ℹ️ **كيفية استخدام البوت:**\n\n1. قم بنسخ رابط الفيديو الذي ترغب بتحميله من أي تطبيق (يوتيوب، تيك توك، إنستغرام، فيسبوك).\n2. الصق الرابط هنا في المحادثة وأرسله.\n3. انتظر ثوانٍ لتحليل الرابط، ثم اختر الجودة أو MP3 من الأزرار المتاحة.\n4. سيقوم البوت بتحميل الفيديو وإرساله لك كملف قابل للتشغيل.\n\n⚠️ **تنبيه:** الحد الأقصى لحجم الفيديو هو 50 ميجابايت التزاماً بقيود تيليجرام.`
          });
        } else if (input === "/status") {
          res.json({
            role: "bot",
            text: `📊 **حالة النظام واشتراكك:**\n\n🟢 الخادم: متصل ويعمل بكفاءة عالية (Online)\n📥 تحميلاكت المكتملة: ${Math.floor(Math.random() * 5 + 3)} فيديو\n🛡️ حد الحماية من السبام: 10 ثوانٍ بين كل طلب تحميل\n⚡ سرعة التحميل: غير محدودة`
          });
        } else {
          res.json({
            role: "bot",
            text: `🤖 **حول هذا البوت:**\n\nبرنامج لتحميل الفيديوهات والملفات الصوتية من شبكات التواصل الاجتماعي بشكل آمن وسريع.\n\n• الإصدار: 2.1.0-Release\n• التقنيات المستخدمة: FastAPI / Async Python / yt-dlp / Cloud Run`
          });
        }
        return;
      }

      // Check URL platforms
      const isYt = /youtube\.com|youtu\.be/i.test(input);
      const isTiktok = /tiktok\.com/i.test(input);
      const isInsta = /instagram\.com/i.test(input);
      const isFb = /facebook\.com|fb\.watch/i.test(input);

      if (isYt || isTiktok || isInsta || isFb) {
        const platform = isYt ? "youtube" : isTiktok ? "tiktok" : isInsta ? "instagram" : "facebook";
        res.json({
          role: "bot",
          text: `📥 **تم العثور على الفيديو!**\n\n📌 العنوان: فيديو تيليجرام المحمل الجديد (${platform})\n⏱️ المدة: 42 ثانية\n\nاختر الصيغة أو الجودة المطلوبة للتحميل:`,
          buttons: ["🎬 أفضل جودة (Best)", "🖥️ 1080p", "📺 720p", "📱 480p", "🎵 ملف صوتي MP3"],
          platform,
          url: input
        });
      } else {
        res.json({
          role: "bot",
          text: `👋 أرسل لي رابط فيديو صحيح من يوتيوب، تيك توك، إنستغرام أو فيسبوك، وسأقوم بتحميله فوراً!`
        });
      }
    } else if (action === "select_quality") {
      // User selected quality button -> proceed through step animation
      const platform = req.body.platform || "youtube";
      const url = req.body.url || "https://youtube.com/watch?v=mock";
      const q = qualitySelected || "720p";

      // Increment counters
      stats.downloadsToday += 1;
      stats.queueLength += 1;

      // Create a pending log entry
      const txId = "tx-" + Math.floor(1000 + Math.random() * 9000);
      const newLog: SimLog = {
        id: txId,
        timestamp: new Date().toISOString(),
        userId: resolvedUser,
        username: resolvedName,
        platform: platform,
        url: url,
        fileSize: "Calculating...",
        status: "queued",
        duration: 0,
        qualitySelected: q
      };
      
      logs.unshift(newLog);

      setTimeout(() => {
        // Transition queue to processing
        stats.queueLength = Math.max(0, stats.queueLength - 1);
        const logIndex = logs.findIndex(l => l.id === txId);
        if (logIndex !== -1) {
          logs[logIndex].status = "processing";
        }
      }, 1500);

      setTimeout(() => {
        const isSuccess = Math.random() > 0.05; // 95% success rate in sim
        const size = `${(5 + Math.random() * 25).toFixed(1)} MB`;
        const dur = parseFloat((2 + Math.random() * 8).toFixed(1));

        const logIndex = logs.findIndex(l => l.id === txId);
        if (logIndex !== -1) {
          if (isSuccess) {
            logs[logIndex].status = "completed";
            logs[logIndex].fileSize = size;
            logs[logIndex].duration = dur;
            stats.successfulDownloads += 1;
          } else {
            logs[logIndex].status = "failed";
            logs[logIndex].fileSize = "0 MB";
            logs[logIndex].duration = dur;
            logs[logIndex].error = "Connection tracking reset by peer";
            stats.failedDownloads += 1;
          }
        }
      }, 4000);

      res.json({
        txId,
        message: "Pipeline initiated"
      });
    }
  });

  // Serve static UI assets inside applet
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
