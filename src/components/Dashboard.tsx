import { ArrowUpRight, Cpu, Database, HardDrive, RefreshCw, Server, Users } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SystemStats, DownloadLog } from "../types";

interface DashboardProps {
  stats: SystemStats;
  logs: DownloadLog[];
  onForceCleanup: () => void;
  isCleaning: boolean;
}

// Simulated historic hourly database for elegant analytics trends mapping
const chartData = [
  { hour: "12 AM", downloads: 42, users: 15 },
  { hour: "4 AM", downloads: 18, users: 8 },
  { hour: "8 AM", downloads: 65, users: 40 },
  { hour: "12 PM", downloads: 124, users: 82 },
  { hour: "4 PM", downloads: 156, users: 95 },
  { hour: "8 PM", downloads: 198, users: 134 },
  { hour: "11 PM", downloads: 144, users: 110 },
];

export default function Dashboard({ stats, logs, onForceCleanup, isCleaning }: DashboardProps) {
  const successRate = stats.downloadsToday > 0 
    ? Math.round((stats.successfulDownloads / stats.downloadsToday) * 100) 
    : 100;

  return (
    <div className="space-y-6" id="dashboard-root">
      {/* Upper Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#141418] p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-white/50" />
              حالة منصة السيرفر الرئيسية (Main Server Cloud Run Instance)
            </h2>
            <p className="text-xs text-white/40 font-mono">
              Region: europe-west2 | Type: CPU Allocator | Webhook: Active (/telegram/webhook)
            </p>
          </div>
        </div>

        <button
          onClick={onForceCleanup}
          disabled={isCleaning}
          className="self-start sm:self-auto flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10 text-white/70 hover:bg-white/5 hover:text-white cursor-pointer transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isCleaning ? "animate-spin" : ""}`} />
          {isCleaning ? "جاري تنظيف الملفات المؤقتة..." : "تفريغ الملفات المؤقتة فورياً (/tmp)"}
        </button>
      </div>

      {/* Grid Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered Users */}
        <div className="bg-[#141418] border border-white/5 p-5 rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-serif italic text-4xl">01</div>
          <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">إجمالي مستخدمي البوت</div>
          <div className="mt-2">
            <span className="text-3xl font-light text-white font-mono">{stats.totalUsers}</span>
            <div className="text-[10px] text-emerald-400 mt-2 font-mono flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>+18% هذا الأسبوع</span>
            </div>
          </div>
        </div>

        {/* Downloads Today */}
        <div className="bg-[#141418] border border-white/5 p-5 rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-serif italic text-4xl">02</div>
          <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">عمليات التحميل اليوم</div>
          <div className="mt-2">
            <span className="text-3xl font-light text-white font-mono">{stats.downloadsToday}</span>
            <div className="text-[10px] text-blue-400 mt-2 font-mono">
              <span>{stats.successfulDownloads} ناجح</span>
              <span className="text-white/20 mx-1">|</span>
              <span className="text-rose-400">{stats.failedDownloads} فشل</span>
            </div>
          </div>
        </div>

        {/* Pipeline Success Rate */}
        <div className="bg-[#141418] border border-white/5 p-5 rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-serif italic text-4xl">03</div>
          <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">معدل نجاح المعالجة</div>
          <div className="mt-2">
            <span className="text-3xl font-light text-white font-mono">{successRate}<span className="text-lg opacity-50">%</span></span>
            <div className="text-[10px] text-amber-400 mt-2 font-mono italic">
              <span>معدل معيار yt-dlp المستقر</span>
            </div>
          </div>
        </div>

        {/* Active downloads Queue */}
        <div className="bg-[#141418] border border-white/5 p-5 rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-serif italic text-4xl">04</div>
          <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">طابور التحميل النشط</div>
          <div className="mt-2">
            <span className="text-3xl font-light text-white font-mono">{stats.queueLength} / {stats.concurrencyLimit}</span>
            <div className="text-[10px] text-white/30 mt-2 font-mono italic underline decoration-blue-500/50 underline-offset-4">
              <span>توازي المعالجة المسموح</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Memory Bar */}
        <div className="bg-[#141418] border border-white/5 p-5 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-blue-500" />
              استهلاك الذاكرة العشوائية (RAM)
            </span>
            <span className="text-xs font-mono font-medium text-blue-400">
              {stats.memoryUsage} MB / {stats.memoryTotal} MB
            </span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-500" 
              style={{ width: `${(stats.memoryUsage / stats.memoryTotal) * 100}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-[10px] text-white/30 font-mono">
            <span>Minimum: 64MB</span>
            <span>Threshold: 80%</span>
          </div>
        </div>

        {/* CPU Bar */}
        <div className="bg-[#141418] border border-white/5 p-5 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-500" />
              معدل استهلاك المعالج (vCPU)
            </span>
            <span className="text-xs font-mono font-medium text-emerald-400">
              {stats.cpuUsage}%
            </span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500" 
              style={{ width: `${stats.cpuUsage}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-[10px] text-white/30 font-mono">
            <span>Auto Scaling Trigger: 70%</span>
            <span>Instance Mode: Async Loop</span>
          </div>
        </div>
      </div>

      {/* Analytics Graph */}
      <div className="bg-[#141418] border border-white/5 p-5 rounded-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold text-white font-display">مخطط الطلبات وسلوك المستخدمين النشط</h3>
            <p className="text-xs text-white/50 mt-0.5">معدل التحميل المكتمل مقسم على فترات اليوم</p>
          </div>
          <span className="text-xs bg-white/5 text-blue-400 px-2 py-1 rounded-md font-medium text-[10px] border border-white/10">تحديث مباشر</span>
        </div>
        <div className="w-full h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" stroke="#4b5563" fontSize={10} tickLine={false} />
              <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
              <Tooltip 
                contentStyle={{ background: "#0F0F12", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", color: "#e0e0e6", direction: "rtl" }}
                itemStyle={{ color: "#2563eb" }}
              />
              <Area type="monotone" dataKey="downloads" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorDownloads)" name="التحميلات" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
