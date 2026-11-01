import React, { useState } from 'react';
import { X, Camera, Upload, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Sun, Eye, Sliders } from 'lucide-react';
import { API_BASE_URL } from '../api/adminClient';

export default function FaceEnrollmentModal({ employee, isOpen, onClose, onSuccess }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [qualityReport, setQualityReport] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !employee) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = reader.result;
      setImagePreview(b64);
      setImageBase64(b64);
      analyzePhoto(b64);
    };
    reader.readAsDataURL(file);
  };

  const analyzePhoto = async (b64) => {
    setIsAnalyzing(true);
    setQualityReport(null);
    try {
      const primaryUrl = API_BASE_URL ? `${API_BASE_URL}/api/auth/face/analyze-quality` : '/api/auth/face/analyze-quality';
      let res;
      try {
        res = await fetch(primaryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ face_image_base64: b64 }),
        });
      } catch {
        res = await fetch('/api/auth/face/analyze-quality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ face_image_base64: b64 }),
        });
      }

      if (!res.ok) throw new Error('Face quality analysis failed');
      const data = await res.json();
      setQualityReport(data);
    } catch (err) {
      setError(err.message || 'Failed to inspect image quality');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEnroll = async () => {
    if (!imageBase64) return;
    setIsEnrolling(true);
    setError('');
    try {
      const token = localStorage.getItem('admin_token') || '';
      const payload = {
        user_id: employee.id,
        face_image_base64: imageBase64,
      };

      const primaryUrl = API_BASE_URL ? `${API_BASE_URL}/api/auth/register-face` : '/api/auth/register-face';
      let res;
      try {
        res = await fetch(primaryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      } catch {
        res = await fetch('/api/auth/register-face', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Enrollment rejected');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Face enrollment failed');
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative text-left overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              AI Face Quality Meter & Enrollment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {employee.full_name} ({employee.employee_id})
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Upload Zone */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Upload Portrait Photo
          </label>
          <div className="flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 hover:border-indigo-500 transition cursor-pointer relative bg-slate-50/50 dark:bg-slate-800/40">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {imagePreview ? (
              <div className="relative group">
                <img
                  src={imagePreview}
                  alt="Face Preview"
                  className="w-36 h-36 object-cover rounded-xl shadow-md border-2 border-indigo-500"
                />
                <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-xs">
                  Change
                </span>
              </div>
            ) : (
              <div className="text-center py-4">
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Click or drag photo here to inspect biometric quality
                </p>
                <p className="text-[10px] text-slate-400 mt-1">JPEG or PNG, front-facing, well-lit</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Quality Diagnostics */}
        {isAnalyzing && (
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-center text-xs text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Analyzing illumination, Laplacian variance & 128-D facial landmarks...</span>
          </div>
        )}

        {qualityReport && (
          <div className="mb-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" /> Biometric Quality Index
              </span>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  qualityReport.is_acceptable
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                }`}
              >
                {qualityReport.quality_score}/100 ({qualityReport.grade})
              </span>
            </div>

            {/* Score Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-500 ${
                  qualityReport.is_acceptable ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${qualityReport.quality_score}%` }}
              />
            </div>

            {/* Metric Pills */}
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <Sun className="w-3.5 h-3.5 mx-auto mb-1 text-amber-500" />
                <div className="text-slate-400 text-[10px]">Lighting</div>
                <div className="font-bold text-slate-700 dark:text-slate-300 capitalize">{qualityReport.metrics.lighting}</div>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <Eye className="w-3.5 h-3.5 mx-auto mb-1 text-blue-500" />
                <div className="text-slate-400 text-[10px]">Sharpness</div>
                <div className="font-bold text-slate-700 dark:text-slate-300 capitalize">{qualityReport.metrics.sharpness}</div>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <ShieldCheck className="w-3.5 h-3.5 mx-auto mb-1 text-indigo-500" />
                <div className="text-slate-400 text-[10px]">Framing</div>
                <div className="font-bold text-slate-700 dark:text-slate-300 capitalize">{qualityReport.metrics.framing}</div>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-600 dark:text-slate-300 italic">
              {qualityReport.recommendation}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleEnroll}
            disabled={!imageBase64 || isAnalyzing || isEnrolling}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {isEnrolling ? (
              <span>Registering 128-D Vector...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Save 128-D Biometric Face</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
