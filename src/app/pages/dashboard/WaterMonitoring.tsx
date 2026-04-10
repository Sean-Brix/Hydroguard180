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

  const getAlertLevelByLevel = (level: number) => {
    return alertLevels.find((a: any) => a.level === level);
  };

  const getAlertLevels = () => alertLevels;

  const applyFilters = () => {
    let filtered = [...readings];

    if (filterLevel !== 'all') {
      filtered = filtered.filter(r => r.alertLevel === parseInt(filterLevel));
    }

    if (searchQuery) {
      filtered = filtered.filter(r => 
        new Date(r.timestamp).toLocaleString().includes(searchQuery)
      );
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
      /*const { default: Chart } = await import('chart.js/auto');*/

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const timestamp = format(new Date(), 'MMMM dd, yyyy h:mm a');

      // =========================
      // 📊 CALCULATIONS FIRST
      // =========================
      const waterLevels = filteredReadings.map(r => r.waterLevel);

      const avgWaterLevel =
        waterLevels.reduce((sum, level) => sum + level, 0) / (waterLevels.length || 1);

      const maxWaterLevel = Math.max(...waterLevels, 0);
      const minWaterLevel = Math.min(...waterLevels, 0);

      const alertDistribution: Record<number, number> = {};
      filteredReadings.forEach(r => {
        alertDistribution[r.alertLevel] = (alertDistribution[r.alertLevel] || 0) + 1;
      });

      const mostFrequentAlert = Object.entries(alertDistribution)
        .sort((a, b) => b[1] - a[1])[0];

      // =========================
      // 🧠 TREND ANALYSIS
      // =========================
      let rising = 0, falling = 0, stable = 0;

      filteredReadings.forEach((reading, index) => {
        const prev = filteredReadings[index - 1];
        const trend = getTrend(reading.waterLevel, prev?.waterLevel);

        if (trend.includes('Rising')) rising++;
        else if (trend.includes('Falling')) falling++;
        else stable++;
      });

      // =========================
      // ⚠️ FLOOD RISK
      // =========================
      const highestAlertLevel = Math.max(...filteredReadings.map(r => r.alertLevel), 0);

      let floodRiskText = '';
      if (highestAlertLevel >= 4) floodRiskText = 'HIGH RISK: Possible flooding. Immediate action required.';
      else if (highestAlertLevel === 3) floodRiskText = 'MODERATE RISK: Water levels rising.';
      else if (highestAlertLevel === 2) floodRiskText = 'LOW RISK: Slight elevation detected.';
      else floodRiskText = 'SAFE: Normal water levels.';

      // =========================
      // 📈 TREND STATEMENT
      // =========================
      let trendText = '';
      if (rising > falling) trendText = 'Water levels are increasing over time.';
      else if (falling > rising) trendText = 'Water levels are decreasing.';
      else trendText = 'Water levels are stable.';

      // =========================
      // 📝 PAGE 1 CONTENT
      // =========================
      doc.setFontSize(20);
      doc.text('Water Monitoring Report', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.text(timestamp, pageWidth / 2, 27, { align: 'center' });

      let yPosition = 40;

      // Summary
      const summaryText = `
  This report presents the analysis of ${filteredReadings.length} recorded water readings.

  Average: ${avgWaterLevel.toFixed(2)} cm
  Highest: ${maxWaterLevel.toFixed(2)} cm
  Lowest: ${minWaterLevel.toFixed(2)} cm

  Most frequent alert: Level ${mostFrequentAlert?.[0] || 'N/A'}.
      `;

      const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 28);
      doc.text(splitSummary, 14, yPosition);
      yPosition += splitSummary.length * 5 + 8;

      // Flood Risk
      doc.setFontSize(12);
      doc.text('Flood Risk Interpretation', 14, yPosition);
      yPosition += 6;

      doc.setFontSize(10);
      doc.text(doc.splitTextToSize(floodRiskText, pageWidth - 28), 14, yPosition);
      yPosition += 10;

      // Trend
      doc.setFontSize(12);
      doc.text('Trend Observation', 14, yPosition);
      yPosition += 6;

      doc.setFontSize(10);
      doc.text(doc.splitTextToSize(trendText, pageWidth - 28), 14, yPosition);
      yPosition += 10;

      // =========================
      // 📋 TABLE (UPDATED)
      // =========================
      const tableData = filteredReadings.map((reading, index) => {
        const prev = filteredReadings[index - 1];
        const trend = getTrend(reading.waterLevel, prev?.waterLevel);
        const alertInfo = getAlertLevelByLevel(reading.alertLevel);

        return [
          format(new Date(reading.timestamp), 'MMM dd, yyyy'),
          format(new Date(reading.timestamp), 'h:mm a'),
          `${reading.waterLevel} cm`,
          trend,
          `Level ${reading.alertLevel} - ${alertInfo?.name || 'Unknown'}`,
          formatTimeWithSeconds(reading.timestamp)
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Time', 'Water Distance', 'Trend', 'Alert Level', 'Last Update']],
        body: tableData,
        styles: { fontSize: 8 }
      });

      // =========================
      // 📊 CHART PAGE
      // =========================
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 300;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      new Chart(ctx, {
        type: 'line',
        data: {
          labels: filteredReadings.map(r =>
            format(new Date(r.timestamp), 'MM/dd HH:mm')
          ),
          datasets: [{
            label: 'Water Level',
            data: waterLevels,
            borderWidth: 2,
            tension: 0.3,
            borderColor: '#FF6A00',
            fill: false
          }]
        },
        options: {
          responsive: false,
          animation: false,
          plugins: {
            title: {
              display: true,
              text: 'Water Level Trend Over Time'
            }
          }
        }
      });

      const chartImage = canvas.toDataURL('image/png');

      doc.addPage();
      doc.text('Water Level Graph', 14, 20);
      doc.addImage(chartImage, 'PNG', 15, 30, 180, 80);

      // =========================
      // 💾 SAVE
      // =========================
      doc.save(`water-monitoring-${Date.now()}.pdf`);
      toast.success('Exported successfully');

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
        <div className="flex flex-wrap items-end gap-3">
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
