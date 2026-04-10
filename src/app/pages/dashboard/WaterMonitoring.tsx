import { useState, useEffect, useCallback } from 'react';
import { waterMonitoringAPI, alertLevelsAPI } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Droplets, Download, Filter, Plus, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useWaterMonitoringSSE } from '../../hooks/useWaterMonitoringSSE';
import Chart from 'chart.js/auto';

export function WaterMonitoring() {
  const [readings, setReadings] = useState<any[]>([]);
  const [alertLevels, setAlertLevels] = useState<any[]>([]);
  const [filteredReadings, setFilteredReadings] = useState<any[]>([]);
  const [filterLevel, setFilterLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD
  const [monthFilter, setMonthFilter] = useState(''); // YYYY-MM
  const [yearFilter, setYearFilter] = useState(''); // YYYY
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newReading, setNewReading] = useState({
    waterLevel: '',
  });

  useEffect(() => {
    loadReadings();
  }, []);

  // Comparing current and previous values to determine trend status:
  const getTrend = (current: number, previous?: number) => {
  if (!previous) return '➖ Stable';

  // Reveresed Logic (IMPORTANT)
  if (current < previous) return '⬆ Rising'; // water is rising (danger)
  if (current > previous) return '⬇ Falling'; // water is falling (safe)
  return '➖ Stable';
};

  // Real-time timestamp formatting for better readability:
  const formatTimeWithSeconds = (timestamp: string) => {
    const date = new Date(timestamp);

    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');

    return `${hh}:${mm}:${ss}`;
  };

  // Function of time difference
  const getTimeSinceLastReading = (lastTimestamp?: string) => {
    if (!lastTimestamp) return 'N/A';

    const now = new Date().getTime();
    const last = new Date(lastTimestamp).getTime();

    const diffMs = now - last;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) return `${minutes} min ago`;
    return `${seconds} sec ago`;
  };
  
  // Real-time SSE updates
  const handleWaterMonitoringUpdate = useCallback((newRecord: any) => {
    setReadings(prev => {
      // Deduplicate: skip if record already exists (e.g. from manual add)
      if (prev.some(r => r.id === newRecord.id)) return prev;
      return [newRecord, ...prev];
    });
    toast.success(`New water level reading: ${newRecord.waterLevel} cm`, {
      description: `Alert Level ${newRecord.alertLevel} - ${format(new Date(newRecord.timestamp), 'PPp')}`,
    });
  }, []);

  const { isConnected } = useWaterMonitoringSSE(handleWaterMonitoringUpdate);

  useEffect(() => {
    applyFilters();
  }, [readings, filterLevel, searchQuery]);

  const loadReadings = async () => {
    try {
      setLoading(true);
      const [response, levels] = await Promise.all([
        waterMonitoringAPI.getAll({ limit: 1000 }),
        alertLevelsAPI.getAll(),
      ]);
      const data = response.data || [];
      const sorted = data.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setReadings(sorted);
      setAlertLevels(levels || []);
    } catch (error: any) {
      console.error('Failed to load readings:', error);
      toast.error(error.message || 'Failed to load water monitoring data');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get alert level info by its numeric level
  const getAlertLevelByLevel = (level: number) => {
    return alertLevels.find((a: any) => a.level === level);
  };

  const getAlertLevels = () => alertLevels;

  const get30MinIntervalData = (data: any[]) => {
    if (!data.length) return [];

    const sorted = [...data].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const result = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = result[result.length - 1];
      const current = sorted[i];

      const diffMinutes =
        (new Date(current.timestamp).getTime() -
          new Date(prev.timestamp).getTime()) /
        (1000 * 60);

      if (diffMinutes >= 30) {
        result.push(current);
      }
    }

    return result;
  };

  const applyFilters = () => {
    let filtered = [...readings];

    if (dateFilter) {
      filtered = filtered.filter(r => 
        format(new Date(r.timestamp), 'yyyy-MM-dd') === dateFilter
      );
    }

    if (monthFilter) {
      filtered = filtered.filter(r => 
        format(new Date(r.timestamp), 'yyyy-MM') === monthFilter
      );
    }

    if (yearFilter) {
      filtered = filtered.filter(r => 
        format(new Date(r.timestamp), 'yyyy') === yearFilter
      );
    }

    if (filterLevel !== 'all') {
      filtered = filtered.filter(r => r.alertLevel === parseInt(filterLevel));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      filtered = filtered.filter(r => {
        const date = format(new Date(r.timestamp), 'MMMM dd, yyyy').toLowerCase();
        const time = format(new Date(r.timestamp), 'h:mm:ss a').toLowerCase();
        const waterLevel = String(r.waterLevel).toLowerCase();
        const alertLevel = `level ${r.alertLevel}`.toLowerCase();

        return (
          date.includes(query) ||
          time.includes(query) ||
          waterLevel.includes(query) ||
          alertLevel.includes(query)
        );
      });
    }

    setFilteredReadings(filtered);
  };


  const handleAddReading = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const waterLevel = parseFloat(newReading.waterLevel);
      
      // Alert level is calculated automatically by the backend
      const created = await waterMonitoringAPI.create({
        waterLevel,
        deviceStatus: 'Online',
        notes: 'Manual entry',
      });

      // Optimistically insert the returned record so the UI updates instantly.
      // When SSE fires with the same record, deduplication by ID prevents a duplicate.
      if (created?.id) {
        setReadings(prev => {
          if (prev.some(r => r.id === created.id)) return prev;
          return [created, ...prev];
        });
      }

      setShowAddDialog(false);
      setNewReading({ waterLevel: '' });
      toast.success('Reading added successfully');
    } catch (error: any) {
      console.error('Failed to add reading:', error);
      toast.error(error.message || 'Failed to add reading');
    } finally {
      setLoading(false);
    }
  };

const handleExport = async () => {
  try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      // PAGE SETUP
      const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      });

      const marginLeft = 20;
      const marginRight = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let y = 20;

      const timestamp = format(new Date(), 'MMMM dd, yyyy h:mm a');

      // =========================
      // 📊 WATER LEVEL DATA
      // =========================
      const waterLevels = filteredReadings.map(r => r.waterLevel);

      // Sort readings by timestamp ascending for trend analysis
      const sortedReadings = [...filteredReadings].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Basic statistics
      const avgWaterLevel =
        waterLevels.reduce((sum, val) => sum + val, 0) / (waterLevels.length || 1);

      // Handle case where there are no readings to avoid -Infinity/Infinity
      const maxWaterLevel = waterLevels.length ? Math.max(...waterLevels) : 0;
      const minWaterLevel = waterLevels.length ? Math.min(...waterLevels) : 0;

      // =========================
      // ⚠️ ALERT ANALYSIS
      // =========================
      const alertDistribution: Record<number, number> = {};

      filteredReadings.forEach(r => {
        alertDistribution[r.alertLevel] =
          (alertDistribution[r.alertLevel] || 0) + 1;
      });

      const mostFrequentAlert = Object.entries(alertDistribution)
        .sort((a, b) => b[1] - a[1])[0];

      const highestAlertLevel = Math.max(
        ...filteredReadings.map(r => r.alertLevel),
        0
      );

      let floodRiskText = '';

      if (highestAlertLevel >= 4)
        floodRiskText = 'HIGH RISK: Possible flooding. Immediate action required.';
      else if (highestAlertLevel === 3)
        floodRiskText = 'MODERATE RISK: Water levels rising.';
      else if (highestAlertLevel === 2)
        floodRiskText = 'LOW RISK: Slight elevation detected.';
      else floodRiskText = 'SAFE: Normal water levels.';

      // =========================
      // 📈 TREND ANALYSIS
      // =========================

      let rising = 0,
        falling = 0,
        stable = 0;

      filteredReadings.forEach((reading, index) => {
        const prev = filteredReadings[index - 1];
        const trend = getTrend(reading.waterLevel, prev?.waterLevel);

        if (trend.includes('Rising')) rising++;
        else if (trend.includes('Falling')) falling++;
        else stable++;
      });

      let trendText = '';

      if (rising > falling)
        trendText = 'Water levels are increasing over time.';
      else if (falling > rising)
        trendText = 'Water levels are decreasing.';
      else trendText = 'Water levels are stable.';

    // =========================
    // 🧠 DESCRIPTION FUNCTIONS (STEP 2)
    // =========================

    const generateWaterLevelDescription = () => {
  const trend =
    rising > falling
      ? 'increasing'
      : falling > rising
      ? 'decreasing'
      : 'stable';

    return `
  The HydroGuard 180 Water Distance Monitoring System recorded a total of ${filteredReadings.length} water level readings during the selected monitoring period, which are collected at approximately 30-minute intervals to ensure consistent environmental tracking and accurate flood detection analysis.

  Based on the gathered data, the overall water level trend is observed to be ${trend}. The recorded values range from a minimum of ${minWaterLevel.toFixed(2)} cm to a maximum of ${maxWaterLevel.toFixed(2)} cm, showing the fluctuation of water distance over time. These variations may indicate environmental changes such as rainfall intensity, drainage flow conditions, or surrounding water accumulation patterns.

  The computed average water level of ${avgWaterLevel.toFixed(2)} cm represents the general condition of the monitored area, providing a baseline for evaluating whether water levels are within safe or critical thresholds.

  The system continuously monitors changes in water levels every 30 minutes, allowing real-time detection of sudden rises or drops. This interval-based monitoring is essential for early flood warning systems, especially in flood-prone areas where rapid water level changes may occur.

  Overall, the collected data suggests that the monitored environment is currently classified under a ${trend} water behavior pattern. Continuous monitoring and data analysis are recommended to improve predictive accuracy and enhance disaster preparedness and response planning.
    `.trim();
  };

    const generateWaterLevelSummary = () => {
      const risk =
        highestAlertLevel >= 4
          ? 'high risk'
          : highestAlertLevel === 3
          ? 'moderate risk'
          : highestAlertLevel === 2
          ? 'low risk'
          : 'safe condition';

      return `
    The monitoring data indicates a ${risk} level based on recorded water readings. 
    The system shows ${rising > falling ? 'an increasing' : falling > rising ? 'a decreasing' : 'a stable'} trend overall. 
    HydroGuard 180 successfully tracks real-time water behavior for flood prevention and early warning purposes.
      `.trim();
    };

    // =========================
    // 🧾 GENERATE TEXT (STEP 3)
    // =========================

    const description150 = generateWaterLevelDescription();
    const summary100 = generateWaterLevelSummary();

      // =========================
      // HEADER TITLE 
      // =========================
      doc.setFontSize(18);
      doc.text('HYDROGUARD 180 WATER DISTANCE MONITORING REPORT',
        pageWidth / 2, y,
        { align: 'center',}
      );

      // =========================
      // ADDRESS
      // =========================
      doc.setFont('times', 'normal');
      doc.setFontSize(14);

      doc.text(
        'Barangay 180, Soldiers Hills Subdivision, North Caloocan City, Metro Manila, Philippines',
        pageWidth / 2, 
        y,
        { align: 'center' }
      );

      y += 10;

      // ==============================
      // DATE + TIME (RIGHT SIDE ALIGN
      // ==============================
      const now = new Date();
      const dateText = format(now, 'MMMM dd, yyyy');
      const timeText = format(now, 'h:mm:ss a');

      doc.setFontSize(11);

      doc.text(`Date: ${dateText}`, pageWidth - marginRight, y, { align: 'right' });
      doc.text(`Time: ${timeText}`, pageWidth - marginRight, y + 6, { align: 'right' });
      y += 15;



      // =========================
      // 📌 SUMMARY SECTION
      // =========================
      const summary = `
  This report contains ${filteredReadings.length} water level readings collected by HydroGuard 180 system.

  Average Water Level: ${avgWaterLevel.toFixed(2)} cm
  Maximum Water Level: ${maxWaterLevel.toFixed(2)} cm
  Minimum Water Level: ${minWaterLevel.toFixed(2)} cm

  Most Frequent Alert Level: ${mostFrequentAlert?.[0] || 'N/A'}
      `;

    // ====================================
    // 🧠 AI DESCRIPTION + SUMMARY SECTION
    // ====================================

    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.text('Analysis Description', 14, y);
    y += 6;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    const descLines = doc.splitTextToSize(description150, pageWidth - 28);
    doc.text(descLines, 14, y);
    y += descLines.length * 5 + 10;

    // -------------------------

    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    y += 10; // extra spacing before summary
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.text('Report Summary', 14, y);
    y += 6;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    const summaryLines = doc.splitTextToSize(summary100, pageWidth - 28);
    doc.text(summaryLines, 14, y);
    y += summaryLines.length * 5 + 15;

      const splitSummary = doc.splitTextToSize(summary, pageWidth - 28);
      doc.text(splitSummary, 14, y);
      y += splitSummary.length * 5 + 10;

      // =========================
      // ⚠️ FLOOD RISK
      // =========================
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.text('Flood Risk Assessment', 14, y);
      y += 6;

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.text(doc.splitTextToSize(floodRiskText, pageWidth - 28), 14, y);
      y += 15;

      // =========================
      // 📈 TREND TEXT
      // =========================
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.text('Trend Analysis', 14, y);
      y += 6;

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.text(doc.splitTextToSize(trendText, pageWidth - 28), 14, y);
      y += 15;

      // ===========================
      // STEP 1: GET 30-MIN DATA
      // ===========================
      const filtered30MinData = get30MinIntervalData(filteredReadings);

      // =========================
      // 📋 TABLE (UPDATED STRUCTURE)
      // =========================
      const tableData = filtered30MinData.map((reading, index) => {
        const prev = filtered30MinData[index - 1];
        const trend = getTrend(reading.waterLevel, prev?.waterLevel);
        const alertInfo = getAlertLevelByLevel(reading.alertLevel);

        return [
          format(new Date(reading.timestamp), 'MMM dd, yyyy'),
          `${reading.waterLevel} cm`,
          trend,
          `Level ${reading.alertLevel} - ${alertInfo?.name || 'Unknown'}`,
          format(new Date(reading.timestamp), 'h:mm:ss a'),
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [
          ['Date', 'Water Distance', 'Trend', 'Alert Level', 'Last Update'],
        ],
        body: tableData,

        headStyles: {
          fillColor: [255, 106, 0],
          textColor: 255,
          fontStyle: 'bold',
        },

        styles: {
          fontSize: 8,
          overflow: 'linebreak',
        },

        margin: { left: marginLeft, right: marginRight },

        // 👇 ADD THIS INSIDE autoTable
        didDrawPage: function (data) {
          const pageCount = doc.getNumberOfPages();
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height;

          doc.setFontSize(10);
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        },
      });

    // Update Y position after table
    const chartLabels = filtered30MinData.map(r =>
      format(new Date(r.timestamp), 'MM/dd HH:mm')
    );

    const chartData = filtered30MinData.map(r => r.waterLevel);

    // ❗ FIX: proper validation
    if (!chartData || chartData.length < 2) {
      console.warn("Not enough data for chart");
    } else {
      // destroy previous chart safely
      if ((window as any).myChartInstance) {
        (window as any).myChartInstance.destroy();
        (window as any).myChartInstance = null;
      }

      // create canvas
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 300;

      const ctx = canvas.getContext('2d');

      if (ctx) {
        (window as any).myChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: chartLabels,
            datasets: [
              {
                label: 'Water Level (cm)',
                data: chartData,
                borderWidth: 2,
                tension: 0.3,
                borderColor: '#FF6A00',
                fill: false,
              },
            ],
          },
          options: {
            responsive: false,
            animation: false,
            plugins: {
              title: {
                display: true,
                text: 'Water Level Trend (1-Hour Interval)',
              },
            },
          },
        });

    const chartImage = canvas.toDataURL('image/png');

    doc.addPage();
    doc.setFontSize(14);
    doc.text('Water Level Graph', 14, 20);
    doc.addImage(chartImage, 'PNG', marginLeft, y + 10, 170, 80);

    y += 100; // adjust Y position after chart
  }
}

// =========================
// PAGE NUMBERS
// =========================
const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);

    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
      // =========================
      // 💾 EXPORT FILE
      // =========================
      const fileDate = format(new Date(), 'MM-dd-yy');
      doc.save(`Report Analytic of HydroGuard180 Water Monitoring (${fileDate}).pdf`);

      toast.success('Report exported successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Export failed');
    }
  };

  const getAlertBadge = (level: number) => {
      const alertInfo = getAlertLevelByLevel(level);
      if (!alertInfo) return null;
      
      return (
        <Badge style={{ backgroundColor: alertInfo.color, color: 'white' }}>
          Level {level} - {alertInfo.name}
        </Badge>
      );
    };

    const formatDate = (timestamp: string) => {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (timestamp: string) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 lg:overflow-hidden overflow-y-auto custom-scrollbar">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#1F2937]">Water Monitoring</h1>
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
              isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
            {isConnected ? 'Live' : 'Connecting…'}
          </span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer size={16} className="mr-1.5" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={16} className="mr-1.5" />
            Export PDF
          </Button>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#FF6A00] hover:bg-[#E55F00]">
                <Plus size={16} className="mr-1.5" />
                Add Reading
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Manual Reading</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddReading} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Water Distance (cm) *</label>
                  <Input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={newReading.waterLevel}
                    onChange={(e) => setNewReading({ ...newReading, waterLevel: e.target.value })}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">Alert level will be calculated automatically</p>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-[#FF6A00] hover:bg-[#E55F00]" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Reading'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} disabled={loading}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters + Stats — compact row */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[10px] text-gray-500 mb-1">
              <Filter size={10} className="inline mr-0.5" />
              Alert Level
            </label>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {getAlertLevels().map((level: any) => (
                  <SelectItem key={level.level} value={String(level.level)}>
                    Level {level.level} - {level.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[10px] text-gray-500 mb-1">Search</label>
            <Input
              type="text"
              placeholder="Search..."
              className="h-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
          
            {/* Total Reading of Water Level */}
            <span>
              <span className="font-semibold text-[#1F2937]">
                {readings.length}
                </span>total</span>
            
            {/* Latest Reading of Water Level */}    
            <span>
              <span className="font-semibold text-[#1F2937]">
                {readings[0]?.waterLevel || 0}
                </span> cm latest</span>
            
            {/* Time since last reading was taken */}
            <span>
              <span className="font-semibold text-[#1F2937]">
                {readings?.length && readings[0]?.timestamp
                  ? getTimeSinceLastReading(readings[0].timestamp)
                  : "No data"}
              </span> last detect
            </span>
            
            {/* Peak reading of water level */}
            <span>
              <span className="font-semibold text-[#1F2937]">
                {Math.max(...readings.map(r => r.waterLevel), 0)}
                </span> cm peak</span>
          </div>
        </div>
      </div>

      {/* Readings Table — desktop only */}
      <div className="hidden lg:flex flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex-col">
        <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
          <Table className="min-w-[600px]">
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Water Distance cm</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Alert Level</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReadings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No readings found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReadings.map((reading, index) => {
                  const prev = filteredReadings[index - 1];
                  const trend = getTrend(reading.waterLevel, prev?.waterLevel);
                  const alertInfo = getAlertLevelByLevel(reading.alertLevel);

                  return (
                    <TableRow key={reading.id}>
                      {/* Date and time formatting for better readability */}
                      <TableCell>{formatDate(reading.timestamp)}</TableCell>

                      {/* Time */}
                      <TableCell>{formatTime(reading.timestamp)}</TableCell>

                      {/* Water level */}
                      <TableCell className="font-semibold">
                        {reading.waterLevel} cm
                      </TableCell>

                      {/* Trend indicator with colored arrows and text */}
                        <TableCell>
                          <span
                            style={{
                              color: alertInfo?.color || '#6b7280',
                              fontWeight: 500,
                              fontSize: '16px',
                            }}
                          >
                            {trend}
                          </span>
                        </TableCell>

                      {/* Alert level */}
                      <TableCell>
                        {getAlertBadge(reading.alertLevel)}
                      </TableCell>

                      {/* Last Update */}
                      <TableCell className="text-sm text-gray-500">
                        {formatTimeWithSeconds(reading.timestamp)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}            
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Readings Cards — mobile only */}
      <div className="lg:hidden space-y-2 pb-4">
        {filteredReadings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
            <Droplets className="mx-auto text-gray-300 mb-2" size={40} />
            <p className="text-sm text-gray-500">No readings found</p>
          </div>
        ) : (
          filteredReadings.map((reading) => {
            const alertInfo = getAlertLevelByLevel(reading.alertLevel);
            return (
              <div
                key={reading.id}
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-3.5"
                style={{ borderLeftWidth: 4, borderLeftColor: alertInfo?.color || '#d1d5db' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">
                    {formatDate(reading.timestamp)} • {formatTime(reading.timestamp)}
                  </span>
                  {getAlertBadge(reading.alertLevel)}
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Water Level</p>
                    <p className="text-lg font-bold text-[#1F2937]">{reading.waterLevel} <span className="text-xs font-normal text-gray-500">{reading.waterLevelUnit}</span></p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
