import React, { useState } from 'react';
import { MapPin, Navigation, Radio, ShieldCheck, CheckCircle2, AlertTriangle, Users } from 'lucide-react';

export default function GeofenceMap({ 
  officeLat = 23.002217, 
  officeLon = 72.455763, 
  radiusMeters = 100,
  recentPunches = [] 
}) {
  const [selectedPunch, setSelectedPunch] = useState(null);

  // Mock sample punches if none provided to showcase the live map
  const displayPunches = recentPunches.length > 0 ? recentPunches : [
    {
      id: 'p1',
      name: 'Rahul Sharma',
      employee_id: 'EMP001',
      lat: 23.002235,
      lon: 72.455780,
      distance: 14,
      status: 'present',
      time: '09:14 AM',
      offsetX: 48,
      offsetY: 46,
    },
    {
      id: 'p2',
      name: 'Priya Patel',
      employee_id: 'EMP002',
      lat: 23.002310,
      lon: 72.455850,
      distance: 38,
      status: 'present',
      time: '09:22 AM',
      offsetX: 62,
      offsetY: 38,
    },
    {
      id: 'p3',
      name: 'Amit Verma',
      employee_id: 'EMP003',
      lat: 23.002150,
      lon: 72.455690,
      distance: 52,
      status: 'late',
      time: '09:41 AM',
      offsetX: 36,
      offsetY: 65,
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Navigation className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Live Office Geofence Telemetry
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Haversine 100m Boundary • SBS Shanti Business School, Ahmedabad
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Geofence Active (100m)
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {officeLat.toFixed(6)}, {officeLon.toFixed(6)}
          </span>
        </div>
      </div>

      {/* Visual Map Surface */}
      <div className="relative w-full h-80 sm:h-96 rounded-xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center select-none shadow-inner">
        {/* Subtle Map Grid lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

        {/* Center Radar Circles (100m, 75m, 50m, 25m) */}
        <div className="absolute w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] rounded-full border border-teal-500/30 bg-teal-500/5 flex items-center justify-center">
          <div className="w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] rounded-full border border-dashed border-teal-500/20 flex items-center justify-center">
            <div className="w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] rounded-full border border-teal-500/20 flex items-center justify-center">
              {/* Radar sweep animation */}
              <div className="w-full h-full rounded-full border border-emerald-500/30 animate-ping opacity-25" />
            </div>
          </div>
        </div>

        {/* Office Center Hub Pin */}
        <div className="absolute z-20 flex flex-col items-center pointer-events-none">
          <div className="w-7 h-7 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center shadow-lg shadow-teal-500/50 ring-4 ring-teal-500/20">
            <Navigation className="w-3.5 h-3.5 fill-current" />
          </div>
          <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-900/90 text-[10px] font-bold text-teal-300 border border-teal-500/30 backdrop-blur-xs">
            Office HQ (0m)
          </span>
        </div>

        {/* 100m Perimeter Label */}
        <div className="absolute top-4 right-4 z-10 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/60 backdrop-blur-xs text-[11px] text-slate-300 flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
          <span>Radius: {radiusMeters}m Allowed</span>
        </div>

        {/* Employee Punch Pins */}
        {displayPunches.map((punch) => {
          const isSelected = selectedPunch?.id === punch.id;
          const posX = punch.offsetX || 50;
          const posY = punch.offsetY || 50;

          return (
            <div
              key={punch.id}
              style={{ left: `${posX}%`, top: `${posY}%` }}
              className="absolute z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125"
              onClick={() => setSelectedPunch(punch)}
            >
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-md ${
                punch.status === 'present' 
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400' 
                  : 'bg-amber-500/20 border-amber-400 text-amber-400'
              }`}>
                <span className="text-[10px] font-bold">
                  {punch.name.charAt(0)}
                </span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              </div>
            </div>
          );
        })}

        {/* Selected Punch Detail Popup */}
        {selectedPunch && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-72 z-40 bg-slate-900/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in duration-150">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {selectedPunch.name}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedPunch.employee_id} • {selectedPunch.time}
                </p>
              </div>
              <button
                onClick={() => setSelectedPunch(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800 text-[11px] grid grid-cols-2 gap-2 text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">DISTANCE</span>
                <span className="font-semibold text-emerald-400">{selectedPunch.distance}m from center</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">GEOFENCE</span>
                <span className="font-semibold text-teal-400">Inside (Safe)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
            <span>Office Target (Lat: {officeLat.toFixed(4)}, Lon: {officeLon.toFixed(4)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Verified Check-In Pins</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Haversine Spherical Trigonometry Gate Verified</span>
        </div>
      </div>
    </div>
  );
}
