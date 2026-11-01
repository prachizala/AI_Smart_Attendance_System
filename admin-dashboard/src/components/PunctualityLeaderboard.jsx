import React, { useState, useEffect } from 'react';
import { Trophy, Award, Medal, Zap, TrendingUp, Sparkles, Star, ChevronRight, ShieldCheck } from 'lucide-react';

export default function PunctualityLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [period, setPeriod] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/attendance/leaderboard?limit=8');
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
      setPeriod(data.period || 'Current Month');
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const topThree = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  const getTierBadge = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'diamond':
        return 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
      case 'gold':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'silver':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
      default:
        return 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-400 text-white rounded-2xl shadow-sm shadow-amber-500/20">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Punctuality & Trust Leaderboard
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full">
                Gamified AI
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ranked on consecutive on-time punches, geofence compliance, and 300–900 credit trust scale.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700">
          Period: {period}
        </span>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-xs text-slate-400">
          Computing real-time punctuality vectors...
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-400">
          No employee punctuality records calculated yet.
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topThree.map((emp, index) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;

              const cardStyle = isFirst
                ? 'bg-gradient-to-b from-amber-50/80 to-amber-100/30 dark:from-amber-950/40 dark:to-slate-900 border-amber-300 dark:border-amber-700/60 shadow-sm shadow-amber-500/10'
                : isSecond
                ? 'bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-900 border-slate-300 dark:border-slate-700'
                : 'bg-gradient-to-b from-orange-50/60 to-orange-100/20 dark:from-orange-950/30 dark:to-slate-900 border-orange-200 dark:border-orange-800/60';

              const medalColor = isFirst
                ? 'text-amber-500 bg-amber-100 dark:bg-amber-950/80'
                : isSecond
                ? 'text-slate-400 bg-slate-200 dark:bg-slate-800'
                : 'text-amber-700 bg-amber-100/80 dark:bg-amber-950/60';

              return (
                <div
                  key={emp.user_id}
                  className={`p-5 rounded-3xl border relative overflow-hidden flex flex-col justify-between ${cardStyle}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${medalColor}`}>
                        #{emp.rank}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                          {emp.full_name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {emp.employee_id}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getTierBadge(emp.tier)}`}>
                      {emp.tier}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Trust Score:</span>
                      <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                        {emp.score} <span className="text-[10px] text-slate-400">/ 900</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">On-Time Accuracy:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {emp.on_time_ratio}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, emp.on_time_ratio)}%` }}
                      />
                    </div>

                    <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 truncate pt-1">
                      {emp.badge}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ranks 4 to 8 Table */}
          {remaining.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Rank</th>
                    <th className="py-2.5 px-4">Employee</th>
                    <th className="py-2.5 px-4">Department</th>
                    <th className="py-2.5 px-4 text-center">Score</th>
                    <th className="py-2.5 px-4 text-center">On-Time Ratio</th>
                    <th className="py-2.5 px-4 text-right">Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {remaining.map((emp) => (
                    <tr key={emp.user_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-4 font-bold text-slate-600 dark:text-slate-400 font-mono">
                        #{emp.rank}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-white">{emp.full_name}</span>
                        <span className="text-[11px] font-mono text-slate-400 ml-1.5">({emp.employee_id})</span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                        {emp.department}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {emp.score}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {emp.on_time_ratio}%
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTierBadge(emp.tier)}`}>
                          {emp.tier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
