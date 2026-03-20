import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { MonthlySummary, DashboardStats } from '../api/client';

const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const thaiMonthsShort = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

// ============================================================
// SVG Bar Chart Component
// ============================================================
interface BarChartProps {
  data: { label: string; withdrawn: number; added: number }[];
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, height = 280 }) => {
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = Math.max(600, data.length * 80);
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.flatMap(d => [d.withdrawn, d.added]), 1);
  const niceMax = Math.ceil(maxVal / 10) * 10;

  const barGroupWidth = chartW / data.length;
  const barWidth = Math.min(24, barGroupWidth * 0.3);
  const gap = 4;

  // Y-axis ticks
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((niceMax / tickCount) * i));

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="select-none">
        {/* Grid lines */}
        {ticks.map(tick => {
          const y = padding.top + chartH - (tick / niceMax) * chartH;
          return (
            <g key={tick}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400">{tick}</text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const cx = padding.left + barGroupWidth * i + barGroupWidth / 2;
          const withdrawnH = (d.withdrawn / niceMax) * chartH;
          const addedH = (d.added / niceMax) * chartH;
          const isHovered = hoveredIndex === i;

          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              {/* Hover background */}
              {isHovered && (
                <rect
                  x={cx - barGroupWidth / 2 + 4}
                  y={padding.top}
                  width={barGroupWidth - 8}
                  height={chartH}
                  fill="#f0fdf4"
                  rx={4}
                />
              )}

              {/* Added bar (blue) */}
              <rect
                x={cx - barWidth - gap / 2}
                y={padding.top + chartH - addedH}
                width={barWidth}
                height={addedH}
                rx={3}
                fill={isHovered ? '#3b82f6' : '#93c5fd'}
                className="transition-all duration-200"
              />

              {/* Withdrawn bar (green) */}
              <rect
                x={cx + gap / 2}
                y={padding.top + chartH - withdrawnH}
                width={barWidth}
                height={withdrawnH}
                rx={3}
                fill={isHovered ? '#14b84b' : '#86efac'}
                className="transition-all duration-200"
              />

              {/* X-axis label */}
              <text
                x={cx}
                y={height - padding.bottom + 18}
                textAnchor="middle"
                className="text-[11px] fill-slate-500 font-medium"
              >
                {d.label}
              </text>

              {/* Tooltip */}
              {isHovered && (
                <g>
                  <rect
                    x={cx - 55}
                    y={padding.top - 8}
                    width={110}
                    height={36}
                    rx={6}
                    fill="white"
                    stroke="#e2e8f0"
                    strokeWidth={1}
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
                  />
                  <text x={cx} y={padding.top + 7} textAnchor="middle" className="text-[10px] fill-blue-600 font-medium">
                    รับเข้า: {d.added}
                  </text>
                  <text x={cx} y={padding.top + 21} textAnchor="middle" className="text-[10px] fill-green-600 font-medium">
                    เบิกออก: {d.withdrawn}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* X-axis line */}
        <line x1={padding.left} y1={padding.top + chartH} x2={width - padding.right} y2={padding.top + chartH} stroke="#cbd5e1" />
      </svg>
    </div>
  );
};

// ============================================================
// Donut Chart Component (สัดส่วนตามหมวดหมู่)
// ============================================================
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

const DonutChart: React.FC<DonutChartProps> = ({ data, size = 180 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="text-sm text-slate-400 text-center py-8">ไม่มีข้อมูล</div>;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;
  const innerRadius = radius * 0.6;

  let startAngle = -90;

  const arcs = data.map(d => {
    const angle = (d.value / total) * 360;
    const endAngle = startAngle + angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const ix1 = cx + innerRadius * Math.cos(startRad);
    const iy1 = cy + innerRadius * Math.sin(startRad);
    const ix2 = cx + innerRadius * Math.cos(endRad);
    const iy2 = cy + innerRadius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      'Z',
    ].join(' ');

    startAngle = endAngle;
    return { ...d, path, percentage: Math.round((d.value / total) * 100) };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="flex-shrink-0">
        {arcs.map((arc, i) => (
          <path key={i} d={arc.path} fill={arc.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" className="text-2xl font-bold fill-slate-900">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="text-[10px] fill-slate-400">รายการทั้งหมด</text>
      </svg>
      <div className="space-y-2">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: arc.color }}></div>
            <span className="text-slate-600">{arc.label}</span>
            <span className="font-bold text-slate-900">{arc.value}</span>
            <span className="text-slate-400 text-xs">({arc.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// Main: ReportSummary
// ============================================================
interface ReportSummaryProps {
  onNavigateHome?: () => void;
}

const ReportSummary: React.FC<ReportSummaryProps> = ({ onNavigateHome }) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

  // Data
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [yearlyData, setYearlyData] = useState<{ month: number; withdrawn: number; added: number }[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Year range
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  // ============================================================
  // Fetch monthly summary
  // ============================================================
  const fetchMonthlySummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMonthlySummary(selectedYear, selectedMonth);
      setMonthlySummary(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [selectedYear, selectedMonth]);

  // ============================================================
  // Fetch yearly data (all 12 months)
  // ============================================================
  const fetchYearlyData = useCallback(async () => {
    setLoading(true);
    try {
      const results: { month: number; withdrawn: number; added: number }[] = [];
      for (let m = 1; m <= 12; m++) {
        try {
          const data = await api.getMonthlySummary(selectedYear, m);
          const withdrawn = data.reduce((s: number, r: MonthlySummary) => s + r.total_withdrawn, 0);
          const added = data.reduce((s: number, r: MonthlySummary) => s + r.total_added, 0);
          results.push({ month: m, withdrawn, added });
        } catch {
          results.push({ month: m, withdrawn: 0, added: 0 });
        }
      }
      setYearlyData(results);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [selectedYear]);

  // ============================================================
  // Fetch stats
  // ============================================================
  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    if (viewMode === 'monthly') fetchMonthlySummary();
    else fetchYearlyData();
  }, [viewMode, fetchMonthlySummary, fetchYearlyData]);

  // ============================================================
  // Computed
  // ============================================================
  const totalWithdrawn = monthlySummary.reduce((s, r) => s + r.total_withdrawn, 0);
  const totalAdded = monthlySummary.reduce((s, r) => s + r.total_added, 0);
  const totalTransactions = monthlySummary.reduce((s, r) => s + r.transaction_count, 0);

  // Category breakdown for donut chart
  const categoryMap = new Map<string, number>();
  monthlySummary.forEach(r => {
    categoryMap.set(r.category_name, (categoryMap.get(r.category_name) || 0) + r.total_withdrawn);
  });
  const categoryColors: Record<string, string> = {
    'สารเคมี': '#EF4444',
    'วัสดุวิทยาศาสตร์': '#3B82F6',
    'วัสดุสำนักงาน': '#F59E0B',
    'วัสดุงานบ้าน': '#10B981',
  };
  const donutData = Array.from(categoryMap.entries()).map(([label, value]) => ({
    label,
    value,
    color: categoryColors[label] || '#94a3b8',
  }));

  // Yearly chart data
  const yearlyChartData = yearlyData.map(d => ({
    label: thaiMonthsShort[d.month - 1],
    withdrawn: d.withdrawn,
    added: d.added,
  }));

  // Monthly top items chart
  const monthlyChartData = monthlySummary
    .sort((a, b) => b.total_withdrawn - a.total_withdrawn)
    .slice(0, 10)
    .map(r => ({
      label: r.item_name.length > 20 ? r.item_name.slice(0, 18) + '...' : r.item_name,
      withdrawn: r.total_withdrawn,
      added: r.total_added,
    }));

  const yearlyTotalWithdrawn = yearlyData.reduce((s, d) => s + d.withdrawn, 0);
  const yearlyTotalAdded = yearlyData.reduce((s, d) => s + d.added, 0);

  return (
    <div className="min-h-screen bg-[#f6f7f8]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans Thai', sans-serif" }}>
      <div className="p-8 max-w-7xl mx-auto w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <button onClick={onNavigateHome} className="hover:text-[#14b84b] transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-base">home</span>
            <span>หน้าหลัก</span>
          </button>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-[#14b84b] font-medium">สรุปรายงาน</span>
        </div>

        {/* Title + Controls */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">สรุปรายงานการเบิกใช้</h2>
            <p className="text-slate-500 text-sm mt-1">
              {viewMode === 'monthly'
                ? `ข้อมูลประจำเดือน${thaiMonths[selectedMonth - 1]} พ.ศ. ${selectedYear + 543}`
                : `ข้อมูลประจำปี พ.ศ. ${selectedYear + 543}`
              }
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div className="bg-slate-100 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'monthly' ? 'bg-white text-[#14b84b] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                รายเดือน
              </button>
              <button
                onClick={() => setViewMode('yearly')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'yearly' ? 'bg-white text-[#14b84b] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                รายปี
              </button>
            </div>

            {/* Year selector */}
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-slate-500 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b]"
            >
              {years.map(y => (
                <option key={y} value={y}>พ.ศ. {y + 543}</option>
              ))}
            </select>

            {/* Month selector (only in monthly view) */}
            {viewMode === 'monthly' && (
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 border border-slate-200 rounded-lg text-slate-500 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b]"
              >
                {thaiMonths.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {viewMode === 'monthly' ? (
            <>
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                <p className="text-xs text-slate-400 font-medium mb-1">รายการที่เบิกใช้</p>
                <p className="text-2xl font-bold text-slate-900">{monthlySummary.length}</p>
                <p className="text-xs text-slate-400 mt-1">รายการ</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                <p className="text-xs text-slate-400 font-medium mb-1">จำนวนเบิกออกรวม</p>
                <p className="text-2xl font-bold text-green-600">{totalWithdrawn}</p>
                <p className="text-xs text-slate-400 mt-1">ชิ้น</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                <p className="text-xs text-slate-400 font-medium mb-1">จำนวนรับเข้ารวม</p>
                <p className="text-2xl font-bold text-blue-600">{totalAdded}</p>
                <p className="text-xs text-slate-400 mt-1">ชิ้น</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                <p className="text-xs text-slate-400 font-medium mb-1">ธุรกรรมทั้งหมด</p>
                <p className="text-2xl font-bold text-amber-600">{totalTransactions}</p>
                <p className="text-xs text-slate-400 mt-1">ครั้ง</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                <p className="text-xs text-slate-400 font-medium mb-1">วัสดุในระบบ</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.totalItems || 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                <p className="text-xs text-slate-400 font-medium mb-1">เบิกออกรวมทั้งปี</p>
                <p className="text-2xl font-bold text-green-600">{yearlyTotalWithdrawn}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                <p className="text-xs text-slate-400 font-medium mb-1">รับเข้ารวมทั้งปี</p>
                <p className="text-2xl font-bold text-blue-600">{yearlyTotalAdded}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                <p className="text-xs text-slate-400 font-medium mb-1">ของใกล้หมด</p>
                <p className="text-2xl font-bold text-red-600">{stats?.lowStockCount || 0}</p>
              </div>
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className={`grid ${viewMode === 'monthly' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'} gap-6 mb-6`}>
          {/* Bar Chart */}
          <div className={`bg-white rounded-xl border border-slate-200 p-6 ${viewMode === 'monthly' ? 'lg:col-span-2' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#14b84b]">bar_chart</span>
                {viewMode === 'monthly' ? 'วัสดุที่เบิกใช้มากที่สุด' : `สรุปรับเข้า-เบิกออก ปี ${selectedYear + 543}`}
              </h3>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-400"></div>
                  <span className="text-slate-500">รับเข้า</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-green-400"></div>
                  <span className="text-slate-500">เบิกออก</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="h-[280px] flex items-center justify-center">
                <div className="text-sm text-slate-400">กำลังโหลดข้อมูล...</div>
              </div>
            ) : (viewMode === 'yearly' ? yearlyChartData : monthlyChartData).length === 0 ? (
              <div className="h-[280px] flex items-center justify-center">
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">analytics</span>
                  <p className="text-sm text-slate-400">ไม่มีข้อมูลในช่วงเวลานี้</p>
                </div>
              </div>
            ) : (
              <BarChart data={viewMode === 'yearly' ? yearlyChartData : monthlyChartData} />
            )}
          </div>

          {/* Donut Chart (monthly only) */}
          {viewMode === 'monthly' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-[#14b84b]">donut_small</span>
                สัดส่วนตามหมวดหมู่
              </h3>
              {donutData.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center">
                  <p className="text-sm text-slate-400">ไม่มีข้อมูล</p>
                </div>
              ) : (
                <DonutChart data={donutData} />
              )}
            </div>
          )}
        </div>

        {/* Detail Table (monthly view) */}
        {viewMode === 'monthly' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#14b84b]">table_chart</span>
                รายละเอียดการเบิกใช้ประจำเดือน{thaiMonths[selectedMonth - 1]}
              </h3>
              <span className="text-xs text-slate-400">{monthlySummary.length} รายการ</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-3.5 font-bold border-b border-slate-200 w-12">ลำดับ</th>
                    <th className="px-6 py-3.5 font-bold border-b border-slate-200">รายการวัสดุ</th>
                    <th className="px-6 py-3.5 font-bold border-b border-slate-200">หมวดหมู่</th>
                    <th className="px-6 py-3.5 font-bold border-b border-slate-200 text-center">เบิกออก</th>
                    <th className="px-6 py-3.5 font-bold border-b border-slate-200 text-center">รับเข้า</th>
                    <th className="px-6 py-3.5 font-bold border-b border-slate-200 text-center">จำนวนครั้ง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-6 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: '60%' }}></div></td>
                        ))}
                      </tr>
                    ))
                  ) : monthlySummary.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">analytics</span>
                        <p className="text-sm text-slate-400">ไม่มีข้อมูลการเบิกใช้ในเดือนนี้</p>
                      </td>
                    </tr>
                  ) : (
                    monthlySummary.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 text-sm text-slate-400 font-medium">{String(i + 1).padStart(2, '0')}</td>
                        <td className="px-6 py-3.5">
                          <span className="font-bold text-slate-900 text-sm">{row.item_name}</span>
                          <span className="text-xs text-slate-400 ml-2">({row.unit})</span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{
                              backgroundColor: (categoryColors[row.category_name] || '#94a3b8') + '18',
                              color: categoryColors[row.category_name] || '#94a3b8',
                            }}
                          >
                            {row.category_name}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="font-bold text-green-600">{row.total_withdrawn}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="font-bold text-blue-600">{row.total_added}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="text-slate-600 font-medium">{row.transaction_count}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Footer totals */}
                {monthlySummary.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-sm">
                      <td colSpan={3} className="px-6 py-3.5 text-right text-slate-600">รวมทั้งหมด</td>
                      <td className="px-6 py-3.5 text-center text-green-600">{totalWithdrawn}</td>
                      <td className="px-6 py-3.5 text-center text-blue-600">{totalAdded}</td>
                      <td className="px-6 py-3.5 text-center text-slate-600">{totalTransactions}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Yearly Table */}
        {viewMode === 'yearly' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#14b84b]">table_chart</span>
                สรุปรายเดือน ปี {selectedYear + 543}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-3.5 font-bold border-b border-slate-200">เดือน</th>
                    <th className="px-6 py-3.5 font-bold border-b border-slate-200 text-center">เบิกออก</th>
                    <th className="px-6 py-3.5 font-bold border-b border-slate-200 text-center">รับเข้า</th>
                    <th className="px-6 py-3.5 font-bold border-b border-slate-200 text-center">ผลต่าง</th>
                    <th className="px-6 py-3.5 font-bold border-b border-slate-200">สัดส่วนเบิกออก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {yearlyData.map(d => {
                    const diff = d.added - d.withdrawn;
                    const maxWithdrawn = Math.max(...yearlyData.map(y => y.withdrawn), 1);
                    const barPercent = (d.withdrawn / maxWithdrawn) * 100;
                    return (
                      <tr key={d.month} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 text-sm font-medium text-slate-900">
                          {thaiMonths[d.month - 1]}
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold text-green-600">{d.withdrawn}</td>
                        <td className="px-6 py-3.5 text-center font-bold text-blue-600">{d.added}</td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {diff >= 0 ? '+' : ''}{diff}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#14b84b] rounded-full transition-all duration-500"
                                style={{ width: `${barPercent}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-slate-400 w-8 text-right">{d.withdrawn}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-sm">
                    <td className="px-6 py-3.5 text-slate-600">รวมทั้งปี</td>
                    <td className="px-6 py-3.5 text-center text-green-600">{yearlyTotalWithdrawn}</td>
                    <td className="px-6 py-3.5 text-center text-blue-600">{yearlyTotalAdded}</td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`${yearlyTotalAdded - yearlyTotalWithdrawn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {yearlyTotalAdded - yearlyTotalWithdrawn >= 0 ? '+' : ''}{yearlyTotalAdded - yearlyTotalWithdrawn}
                      </span>
                    </td>
                    <td className="px-6 py-3.5"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReportSummary;