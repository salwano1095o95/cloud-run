export interface DownloadLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'unknown';
  url: string;
  fileSize: string; // e.g. "12.4 MB"
  status: 'completed' | 'failed' | 'processing' | 'queued';
  duration: number; // in seconds
  error?: string;
  qualitySelected?: string;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  downloadsToday: number;
  successfulDownloads: number;
  failedDownloads: number;
  cpuUsage: number;
  memoryUsage: number; // in MB
  memoryTotal: number; // e.g. 512
  queueLength: number;
  concurrencyLimit: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  username?: string;
  text: string;
  timestamp: string;
  buttons?: string[]; // Inline keyboard options
  completedDownload?: {
    title: string;
    size: string;
    platform: string;
    quality: string;
  };
}
