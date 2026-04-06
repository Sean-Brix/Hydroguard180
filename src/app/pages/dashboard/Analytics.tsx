import { useCallback, useEffect, useState } from 'react';
import { waterMonitoringAPI, alertLevelsAPI } from '../../utils/api';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { BarChart3, TrendingUp, Droplets, AlertTriangle, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useWaterMonitoringSSE } from '../../hooks/useWaterMonitoringSSE';

type AnalyticsStats = {
  totalRecords: number;
  averageWaterLevel: number;
  highestLevel: number;
  mostFrequentAlert: number;
  level1Count: number;
  level2Count: number;
  level3Count: number;
  level4Count: number;
};

const EMPTY_STATS: AnalyticsStats = {
  totalRecords: 0,
  averageWaterLevel: 0,
  highestLevel: 0,
  mostFrequentAlert: 1,
  level1Count: 0,
  level2Count: 0,
  level3Count: 0,
  level4Count: 0,
};

export function Analytics() {
  const [alertLevels, setAlertLevels] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });
  const [stats, setStats] = useState<AnalyticsStats>(EMPTY_STATS);
  const [showInsights, setShowInsights] = useState(false);

  const applyStats = useCallback((data: any) => {
    const alertDistribution = data?.alertDistribution || {};
    const levelCounts = {
      1: alertDistribution[1] || 0,
      2: alertDistribution[2] || 0,
      3: alertDistribution[3] || 0,
      4: alertDistribution[4] || 0,
    };

    const mostFrequentAlert = Object.entries(levelCounts).reduce(
      (current, next) => Number(current[1]) >= Number(next[1]) ? current : next,
      ['1', levelCounts[1]] as [string, number],
    )[0];

    setStats({
      totalRecords: data?.totalReadings || 0,
      averageWaterLevel: Number((data?.averageWaterLevel || 0).toFixed(2)),
      highestLevel: data?.maxWaterLevel || 0,
      mostFrequentAlert: Number.parseInt(mostFrequentAlert, 10),
      level1Count: levelCounts[1],
      level2Count: levelCounts[2],
      level3Count: levelCounts[3],
      level4Count: levelCounts[4],
    });
  }, []);

  const loadStats = useCallback(async (params?: { startDate?: string; endDate?: string }) => {
    try {
      const statsData = await waterMonitoringAPI.getStats(params);
      applyStats(statsData);
    } catch (error) {
      console.error('Error loading analytics stats:', error);
      setStats(EMPTY_STATS);
    }
  }, [applyStats]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, levelsData] = await Promise.all([
          waterMonitoringAPI.getStats(),
          alertLevelsAPI.getAll(),
        ]);

        setAlertLevels(levelsData);
        applyStats(statsData);
      } catch (error) {
        console.error('Error loading analytics data:', error);
      }
    };

    loadData();
  }, [applyStats]);

  const handleWaterMonitoringUpdate = useCallback((newRecord: any) => {
    console.log('Analytics real-time update:', newRecord);

    if (dateRange.start || dateRange.end) {
      void loadStats({
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
      });
      return;
    }

    setStats((previous) => {
      const totalRecords = previous.totalRecords + 1;
      const nextCounts = {
        1: previous.level1Count,
        2: previous.level2Count,
        3: previous.level3Count,
        4: previous.level4Count,
      };

      if (nextCounts[newRecord.alertLevel as keyof typeof nextCounts] !== undefined) {
        nextCounts[newRecord.alertLevel as keyof typeof nextCounts] += 1;
      }

      const mostFrequentAlert = Object.entries(nextCounts).reduce(
        (current, next) => Number(current[1]) >= Number(next[1]) ? current : next,
        ['1', nextCounts[1]] as [string, number],
      )[0];

      const averageWaterLevel =
        totalRecords === 0
          ? 0
          : ((previous.averageWaterLevel * previous.totalRecords) + newRecord.waterLevel) / totalRecords;

      return {
        totalRecords,
        averageWaterLevel: Number(averageWaterLevel.toFixed(2)),
        highestLevel: Math.max(previous.highestLevel, newRecord.waterLevel),
        mostFrequentAlert: Number.parseInt(mostFrequentAlert, 10),
        level1Count: nextCounts[1],
        level2Count: nextCounts[2],
        level3Count: nextCounts[3],
        level4Count: nextCounts[4],
      };
    });
  }, [dateRange.end, dateRange.start, loadStats]);

  useWaterMonitoringSSE(handleWaterMonitoringUpdate);

  const handleFilterByDateRange = () => {
    if (!dateRange.start || !dateRange.end) {
      void loadStats();
      return;
    }

    void loadStats({
      startDate: dateRange.start,
      endDate: dateRange.end,
    });
  };

  const mostFrequentAlertInfo = alertLevels.find((alertLevel) => alertLevel.level === stats.mostFrequentAlert);

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 flex-shrink-0">From</label>
            <Input
              type="date"
              className="h-8 text-sm"
              value={dateRange.start}
              onChange={(event) => setDateRange({ ...dateRange, start: event.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 flex-shrink-0">To</label>
            <Input
              type="date"
              className="h-8 text-sm"
              value={dateRange.end}
              onChange={(event) => setDateRange({ ...dateRange, end: event.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleFilterByDateRange} size="sm" className="h-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-xs">
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                setDateRange({ start: '', end: '' });
                void loadStats();
              }}
            >
              Reset
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowInsights(true)}>
              <Info size={14} className="mr-1" />
              Insights
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="text-blue-600" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-500">Total Records</p>
              <p className="text-xl font-bold text-[#1F2937]">{stats.totalRecords}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-sky-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Droplets className="text-sky-600" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-500">Avg Level</p>
              <p className="text-xl font-bold text-[#1F2937]">
                {stats.averageWaterLevel}
                <span className="text-xs text-gray-400 ml-0.5">cm</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="text-red-600" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-500">Highest</p>
              <p className="text-xl font-bold text-[#1F2937]">
                {stats.highestLevel}
                <span className="text-xs text-gray-400 ml-0.5">cm</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="text-orange-600" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-500">Most Frequent</p>
              <p className="text-xl font-bold text-[#1F2937]">Lv {stats.mostFrequentAlert}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col min-h-0">
          <h3 className="text-sm font-bold text-[#1F2937] mb-3 flex-shrink-0">Alert Level Distribution</h3>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {alertLevels.map((alertInfo: any) => {
              const countKey = `level${alertInfo.level}Count` as keyof AnalyticsStats;
              const count = stats[countKey] as number;
              const pct = ((count / stats.totalRecords) * 100 || 0);

              return (
                <div key={alertInfo.level}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium text-gray-700">Level {alertInfo.level} {alertInfo.name}</span>
                    <span className="text-xs font-semibold text-gray-900">
                      {count} <span className="text-gray-400 font-normal">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{ backgroundColor: alertInfo.color, width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col min-h-0">
          <h3 className="text-sm font-bold text-[#1F2937] mb-3 flex-shrink-0">Recommendations</h3>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            <div className="border-l-3 border-[#22C55E] pl-3">
              <h4 className="text-xs font-semibold text-[#1F2937] mb-1">Current Trend</h4>
              <p className="text-xs text-gray-600">
                {stats.mostFrequentAlert === 1
                  ? 'Water levels are predominantly normal. Continue regular monitoring.'
                  : stats.mostFrequentAlert === 2
                    ? 'Water levels show advisory status. Maintain increased vigilance.'
                    : stats.mostFrequentAlert === 3
                      ? 'Warning levels detected frequently. Prepare for potential evacuation.'
                      : 'Critical levels recorded. Immediate action required.'}
              </p>
            </div>
            <div className="border-l-3 border-[#FF6A00] pl-3">
              <h4 className="text-xs font-semibold text-[#1F2937] mb-1">Peak Monitoring</h4>
              <p className="text-xs text-gray-600">
                Highest recorded: {stats.highestLevel} cm.
                {stats.highestLevel > 100
                  ? ' Exceeded critical threshold â€” review emergency response.'
                  : stats.highestLevel > 80
                    ? ' Reached warning level â€” ensure preparedness protocols.'
                    : ' Levels remain manageable with current protocols.'}
              </p>
            </div>
            <div className="border-l-3 border-[#2563EB] pl-3">
              <h4 className="text-xs font-semibold text-[#1F2937] mb-1">Summary</h4>
              <p className="text-xs text-gray-600">
                Normal conditions {((stats.level1Count / stats.totalRecords) * 100 || 0).toFixed(1)}% of the time across {stats.totalRecords} records.
              </p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showInsights && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setShowInsights(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative">
                <button
                  onClick={() => setShowInsights(false)}
                  className="absolute top-4 right-4 p-1 rounded-md hover:bg-gray-100 text-gray-400"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Info className="text-blue-600" size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-[#1F2937]">Data Insights</h3>
                </div>
                <ul className="space-y-2.5 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    Analysis based on {stats.totalRecords} monitoring records
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                    Average water level: {stats.averageWaterLevel} cm
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    Peak reading: {stats.highestLevel} cm
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                    Most frequent alert level: Level {stats.mostFrequentAlert} ({mostFrequentAlertInfo?.name})
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                    Normal conditions: {((stats.level1Count / stats.totalRecords) * 100 || 0).toFixed(1)}% of the time
                  </li>
                </ul>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
