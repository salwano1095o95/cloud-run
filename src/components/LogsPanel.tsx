import { Download, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { DownloadLog } from "../types";

interface LogsPanelProps {
  logs: DownloadLog[];
}

export default function LogsPanel({ logs }: LogsPanelProps) {
  return (
    <div className="bg-[#141418] rounded-2xl border border-white/5 shadow-none pb-3 overflow-hidden" id="logs-panel">
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#1A1A20]/50">
        <div>
          <h3 className="text-sm font-semibold text-white font-display">سجل المعالجة وطلبات التحميل (Audit Logs)</h3>
          <p className="text-xs text-white/40 mt-0.5">سجل فوري لمراقبة العمليات وسلامة تحميل روابط المستخدمين</p>
        </div>
        <span className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded text-white/40 font-mono">
          {logs.length} سجلات نشطة
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="bg-[#0F0F12] text-[10px] uppercase text-white/30 border-b border-white/5">
              <th className="px-4 py-3 font-medium text-right">رقم العملية</th>
              <th className="px-4 py-3 font-medium text-right">المنصة</th>
              <th className="px-4 py-3 font-medium text-right">المستخدم</th>
              <th className="px-4 py-3 font-medium text-right font-mono">الرابط المصدري</th>
              <th className="px-4 py-3 font-medium text-right">الحجم</th>
              <th className="px-4 py-3 font-medium text-right">فترة المعالجة</th>
              <th className="px-4 py-3 font-medium text-right">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/70">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-white/30 font-sans">
                  لا توجد عمليات مسجلة حالياً. قم بطلب تحميل في النافذة الجانبية للبدء.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
                  <td className="px-4 py-3.5 font-mono text-white/40">{log.id}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        log.platform === "youtube"
                          ? "bg-red-500/10 text-red-400 border border-red-500/10 font-mono"
                          : log.platform === "tiktok"
                          ? "bg-white/10 text-white/95 border border-white/10 font-mono"
                          : log.platform === "instagram"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/10 font-mono"
                          : log.platform === "facebook"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/10 font-mono"
                          : "bg-white/5 text-white/50 border border-white/5 font-mono"
                      }`}
                    >
                      {log.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-white/90">
                    <span className="font-semibold text-xs">@{log.username}</span>
                    <span className="block text-[9px] text-[#E0E0E6]/30 font-mono mt-0.5">ID: {log.userId}</span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-white/40 max-w-[140px] truncate text-left" title={log.url}>
                    {log.url}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-white/60">{log.fileSize}</td>
                  <td className="px-4 py-3.5 font-mono text-white/40">
                    {log.status === "processing" ? "معالجة..." : `${log.duration}s`}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 justify-end">
                      {log.status === "completed" && (
                        <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-sans">
                          <CheckCircle className="w-3 h-3" />
                          مكتمل
                        </span>
                      )}
                      {log.status === "failed" && (
                        <span 
                          className="flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/10 px-2 py-0.5 rounded text-[10px] font-sans cursor-help"
                          title={log.error}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          فشل
                        </span>
                      )}
                      {log.status === "processing" && (
                        <span className="flex items-center gap-1 text-blue-400 bg-blue-500/10 border border-blue-500/10 px-2 py-0.5 rounded text-[10px] font-sans animate-pulse">
                          <Clock className="w-3 h-3" />
                          جاري التحميل...
                        </span>
                      )}
                      {log.status === "queued" && (
                        <span className="flex items-center gap-1 text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] font-sans">
                          <Clock className="w-3 h-3" />
                          في الانتظار
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

