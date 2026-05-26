import React, { useState, useRef, useEffect } from "react";
import { Send, Check, AlertTriangle, ShieldCheck, RefreshCw, Sparkles, AlertCircle } from "lucide-react";
import { ChatMessage } from "../types";

interface BotSimulatorProps {
  chatHistory: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSelectOption: (option: string, originalMsgId: string, platform: string, url: string) => void;
  isProcessing: boolean;
}

const SUGGESTIONS = [
  { label: "📍 تشغيل البوت /start", value: "/start" },
  { label: "ℹ️ المساعده /help", value: "/help" },
  { label: "📊 حالة النظام /status", value: "/status" },
  { label: "🎬 رابط يوتيوب شورتس", value: "https://www.youtube.com/shorts/Cq7Y_4wY3hM" },
  { label: "🎵 رابط تيك توك", value: "https://www.tiktok.com/@mr_beast/video/7321049281" },
  { label: "📸 رابط إنستغرام ريلز", value: "https://www.instagram.com/reel/C8yKl_2vT9s/" }
];

export default function BotSimulator({ chatHistory, onSendMessage, onSelectOption, isProcessing }: BotSimulatorProps) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleSuggestionClick = (val: string) => {
    if (isProcessing) return;
    onSendMessage(val);
  };

  // Extract platform and original raw url to pass to the option handler
  const extractPlatformAndUrl = (msgText: string): { platform: string; url: string } => {
    const isYt = /youtube/i.test(msgText) || /shorts/i.test(msgText);
    const isTiktok = /tiktok/i.test(msgText);
    const isInsta = /instagram/i.test(msgText);
    const pf = isYt ? "youtube" : isTiktok ? "tiktok" : isInsta ? "instagram" : "facebook";
    return {
      platform: pf,
      url: "https://simulated-url.com/media/src"
    };
  };

  return (
    <div className="bg-[#141418] text-[#E0E0E6] rounded-2xl shadow-xl border border-white/5 flex flex-col h-[650px]" id="bot-simulator">
      {/* Phone Header */}
      <div className="p-4 bg-[#0F0F12] border-b border-white/5 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            🤖
          </div>
          <div>
            <h3 className="font-semibold text-sm font-display">بوت تحميل الفيديو المطور</h3>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              متصل الآن (Online)
            </span>
          </div>
        </div>
        <div className="text-[11px] bg-white/5 text-white/65 font-medium px-2 py-0.5 rounded-md font-mono border border-white/5">
          Webhook Mode
        </div>
      </div>

      {/* Suggested Fast Actions */}
      <div className="p-2.5 bg-black/40 border-b border-white/5 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-thin scrollbar-thumb-white/10">
        {SUGGESTIONS.map((sug, idx) => (
          <button
            key={idx}
            onClick={() => handleSuggestionClick(sug.value)}
            disabled={isProcessing}
            className="inline-block text-[11px] bg-[#1E1E24] hover:bg-[#252530] border border-white/5 hover:border-white/10 text-white/80 px-2.5 py-1 rounded-full cursor-pointer transition-all disabled:opacity-50"
          >
            {sug.label}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#0A0A0C] to-[#0F0F12]">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/40 space-y-2">
            <Sparkles className="w-8 h-8 text-blue-500 opacity-60 animate-bounce" />
            <p className="text-xs font-medium text-white/85">أهلاً بك في بيئة اختبار البوت الافتراضية!</p>
            <p className="text-[11px] max-w-xs leading-relaxed text-white/30">
              اختر أحد الأوامر الجاهزة في الأعلى أو قم بلصق رابط فيديو من يوتيوب، تيك توك، أو إنستغرام لتجربة محاكاة تدفق التحميل والأزرار وصيغ الجودة.
            </p>
          </div>
        ) : (
          chatHistory.map((msg) => {
            const isUser = msg.sender === "user";
            const isSystem = msg.sender === "system";

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-[10px] bg-white/5 text-white/40 px-2.5 py-1 rounded-md border border-white/5 font-mono">
                    {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-2 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-xs self-end">
                    🤖
                  </div>
                )}
                <div className="flex flex-col space-y-1">
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? "bg-blue-600 text-white rounded-br-none shadow-[0_4px_15px_rgba(37,99,235,0.25)]"
                        : "bg-[#1F1F24] text-white/90 rounded-bl-none border border-white/5"
                    }`}
                    style={{ unicodeBidi: "embed", direction: "rtl" }}
                  >
                    {/* Render message formatting lines nicely */}
                    <div className="whitespace-pre-line">{msg.text}</div>

                    {/* Quality finished download card */}
                    {msg.completedDownload && (
                      <div className="mt-3 bg-black/40 p-2.5 rounded-xl border border-white/5 text-[11px] space-y-2 text-right">
                        <div className="flex items-center gap-1.5 text-blue-400 font-semibold font-sans">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>جاهز للتشغيل والتحميل المباشر</span>
                        </div>
                        <div className="text-white/40 text-[10px] space-y-0.5 font-mono">
                          <div>💡 {msg.completedDownload.title}</div>
                          <div>💾 الحجم المقدر: {msg.completedDownload.size}</div>
                          <div>⚙️ الجودة المكتملة: {msg.completedDownload.quality}</div>
                        </div>
                        <div className="pt-1 flex gap-1 justify-end">
                          <button 
                            onClick={() => alert("محاكاة التشغيل: تم بدء تشغيل ملف الفيديو بنجاح!")}
                            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] px-2.5 py-1 rounded-md font-semibold cursor-pointer border border-blue-500/20 font-sans"
                          >
                            ▶️ تشغيل (Play)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Inline keyboard options */}
                  {msg.buttons && msg.buttons.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                      {msg.buttons.map((btn, bidx) => {
                        const { platform, url } = extractPlatformAndUrl(msg.text);
                        return (
                          <button
                            key={bidx}
                            onClick={() => onSelectOption(btn, msg.id, platform, url)}
                            disabled={isProcessing}
                            className={`text-[10px] text-center font-medium bg-[#1A1A22] hover:bg-[#252530] text-blue-400 border border-white/5 py-1.5 px-2.5 rounded-xl cursor-pointer transition-all ${
                              msg.buttons?.length === 5 && bidx === 4 ? "col-span-2" : ""
                            }`}
                          >
                            {btn}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <span className="text-[9px] text-white/30 self-end font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Selector */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#0F0F12] border-t border-white/5 flex gap-2 rounded-b-2xl">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isProcessing ? "جاري المعالجة..." : "أرسل رسالة للبوت أو ألصق الرابط..."}
          disabled={isProcessing}
          className="flex-1 bg-[#141418] border border-white/5 text-slate-100 placeholder-white/20 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/30 disabled:opacity-50 text-right"
        />
        <button
          type="submit"
          disabled={isProcessing || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-all disabled:bg-[#1E1E24] disabled:text-white/20 cursor-pointer flex items-center justify-center w-9 h-9 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
