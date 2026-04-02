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
      // Dynamically import jsPDF
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const timestamp = format(new Date(), 'MMMM dd, yyyy h:mm a');
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Water Monitoring Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(timestamp, pageWidth / 2, 27, { align: 'center' });
      doc.text(`Total Records: ${filteredReadings.length}`, pageWidth / 2, 32, { align: 'center' });
      
      let yPosition = 45;
      
      // Water Monitoring Data Table
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Monitoring Readings', 14, yPosition);
      yPosition += 10;
      
      const tableData = filteredReadings.map(reading => {
        const alertInfo = getAlertLevelByLevel(reading.alertLevel);
        return [
          format(new Date(reading.timestamp), 'MMM dd, yyyy'),
          format(new Date(reading.timestamp), 'h:mm a'),
          `${reading.waterLevel} ${reading.waterLevelUnit || 'm'}`,
          `Level ${reading.alertLevel} - ${alertInfo?.name || 'Unknown'}`
        ];
      });
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Time', 'Water Level', 'Alert Level']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [38, 52, 58] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 25 },
          2: { cellWidth: 30 },
          3: { cellWidth: 55 },
          4: { cellWidth: 25 }
        }
      });
      
      // Calculate summary statistics
      const waterLevels = filteredReadings.map(r => r.waterLevel);
      const avgWaterLevel = waterLevels.reduce((sum, level) => sum + level, 0) / waterLevels.length;
      const maxWaterLevel = Math.max(...waterLevels);
      const minWaterLevel = Math.min(...waterLevels);
      
      // Alert level distribution
      const alertDistribution: Record<number, number> = {};
      filteredReadings.forEach(r => {
        alertDistribution[r.alertLevel] = (alertDistribution[r.alertLevel] || 0) + 1;
      });
      
      const mostFrequentAlert = Object.entries(alertDistribution)
        .sort((a, b) => b[1] - a[1])[0];
      
      // Add new page for summary
      doc.addPage();
      yPosition = 20;
      
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Summary Statistics', 14, yPosition);
      yPosition += 15;
      
      // Summary table
      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: [
          ['Total Readings', filteredReadings.length.toString()],
          ['Average Water Level', `${avgWaterLevel.toFixed(2)} ${filteredReadings[0]?.waterLevelUnit || 'm'}`],
          ['Highest Water Level', `${maxWaterLevel.toFixed(2)} ${filteredReadings[0]?.waterLevelUnit || 'm'}`],
          ['Lowest Water Level', `${minWaterLevel.toFixed(2)} ${filteredReadings[0]?.waterLevelUnit || 'm'}`],
          ['Most Frequent Alert', mostFrequentAlert ? `Level ${mostFrequentAlert[0]} (${mostFrequentAlert[1]} times)` : 'N/A'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [38, 52, 58] },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 20;
      
      // Alert Level Distribution
      doc.setFontSize(14);
      doc.text('Alert Level Distribution', 14, yPosition);
      yPosition += 10;
      
      const distributionData = Object.entries(alertDistribution)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .map(([level, count]) => {
          const alertInfo = getAlertLevelByLevel(parseInt(level));
          const percentage = ((count / filteredReadings.length) * 100).toFixed(1);
          return [
            `Level ${level}`,
            alertInfo?.name || 'Unknown',
            count.toString(),
            `${percentage}%`
          ];
        });
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Level', 'Name', 'Count', 'Percentage']],
        body: distributionData,
        theme: 'grid',
        headStyles: { fillColor: [38, 52, 58] },
      });
      
      // Footer on all pages
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `HydroGuard 180 - Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      // Save the PDF
      const filename = `water-monitoring-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      doc.save(filename);
      toast.success('Water monitoring report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
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
            <span><span className="font-semibold text-[#1F2937]">{readings.length}</span> total</span>
            <span><span className="font-semibold text-[#1F2937]">{readings[0]?.waterLevel || 0}</span> cm latest</span>
            <span><span className="font-semibold text-[#1F2937]">{(readings.reduce((sum, r) => sum + r.waterLevel, 0) / readings.length || 0).toFixed(1)}</span> cm avg</span>
            <span><span className="font-semibold text-[#1F2937]">{Math.max(...readings.map(r => r.waterLevel), 0)}</span> cm peak</span>
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
                <TableHead>Water Level</TableHead>
                <TableHead>Alert Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReadings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">
                    No readings found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReadings.map((reading) => (
                  <TableRow key={reading.id}>
                    <TableCell>{formatDate(reading.timestamp)}</TableCell>
                    <TableCell>{formatTime(reading.timestamp)}</TableCell>
                    <TableCell className="font-semibold">
                      {reading.waterLevel} {reading.waterLevelUnit}
                    </TableCell>
                    <TableCell>{getAlertBadge(reading.alertLevel)}</TableCell>
                  </TableRow>
                ))
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
