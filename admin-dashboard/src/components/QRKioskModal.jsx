import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, ShieldCheck, RefreshCw, Maximize2, Minimize2, Sparkles, MapPin } from 'lucide-react';

export default function QRKioskModal({ isOpen, onClose }) {
  const [tokenData, setTokenData] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    fetchNewToken();
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchNewToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const fetchNewToken = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/attendance/kiosk/token');
      if (res.ok) {
        const data = await res.json();
        setTokenData(data);
        setCountdown(data.expires_in_seconds || 30);
      }
    } catch (err) {
      console.error('Error fetching kiosk token:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen) return null;

  const qrPayload = tokenData?.payload_string || tokenData?.token || 'SBS_CAMPUS_GATE_PUNCH';
  const progressPercent = ((30 - countdown) / 30) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className={`relative w-full ${isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-md rounded-3xl'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col items-center justify-between text-center transition-all duration-300`}>
        
        {/* Top Controls */}
        <div className="w-full flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Anti-Screenshot Gate Kiosk</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Toggle Fullscreen Gate Kiosk"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Campus & Gate Title */}
        <div className="my-4 space-y-1">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            SBS Campus • Gate Kiosk #01
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            <span>Scan with Smart Attendance Mobile App</span>
          </p>
        </div>

        {/* Dynamic Rotating QR Code Card */}
        <div className="relative p-5 bg-white dark:bg-slate-950 rounded-3xl border-2 border-indigo-500/30 dark:border-indigo-500/40 shadow-xl flex flex-col items-center justify-center">
          
          {/* Animated Refresh Badge */}
          <div className="absolute -top-3 px-3 py-0.5 bg-gradient-to-r from-indigo-600 to-sky-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refreshes in {countdown}s</span>
          </div>

          {/* QR Code SVG */}
          <div className="p-2 bg-white rounded-2xl shadow-inner mt-2">
            <QRCodeSVG
              value={qrPayload}
              size={isFullscreen ? 280 : 220}
              level="H"
              includeMargin={false}
              fgColor="#0f172a"
            />
          </div>

          {/* Countdown Linear Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-amber-500 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${100 - progressPercent}%` }}
            />
          </div>
        </div>

        {/* Security Disclosures */}
        <div className="mt-5 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-left text-xs text-slate-600 dark:text-slate-300 w-full space-y-1">
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Dynamic Cryptographic Gate Protocol</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            QR code updates automatically every 30 seconds. Screenshots sent via WhatsApp or photo forwards expire immediately to eliminate proxy attendance.
          </p>
        </div>

        {/* Manual Refresh Trigger */}
        <button
          onClick={fetchNewToken}
          className="mt-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Force Refresh QR Now</span>
        </button>

      </div>
    </div>
  );
}
