import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, Plus, Trash2, Settings as SettingsIcon, Bell, Activity, Download, Users, Shield, Edit2, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { settingsAPI, auditLogsAPI, usersAPI } from '../../utils/api';
import { format } from 'date-fns';

export function Settings() {
  const [settings, setSettings] = useState<any>(null);
  const [sensors, setSensors] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSensor, setEditingSensor] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingSensor, setDeletingSensor] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, logsData] = await Promise.all([
        settingsAPI.get(),
        auditLogsAPI.getAll({ limit: 15 })
      ]);
      
      setSettings(settingsData);
      setSensors(settingsData.sensors || []);
      setAuditLogs(logsData.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlerts = async (checked: boolean) => {
    try {
      const updatedSettings = { ...settings, alertsEnabled: checked };
      await settingsAPI.update(updatedSettings);
      setSettings(updatedSettings);
      toast.success(checked ? 'Alerts enabled' : 'Alerts disabled');
    } catch (error) {
      console.error('Error updating alerts:', error);
      toast.error('Failed to update alerts');
    }
  };

  const handleUpdateCalibration = async (field: string, value: number) => {
    try {
      const newCalibration = { ...settings.calibration, [field]: value };
      const updatedSettings = { ...settings, calibration: newCalibration };
      await settingsAPI.update(updatedSettings);
      setSettings(updatedSettings);
      toast.success('Calibration updated');
    } catch (error) {
      console.error('Error updating calibration:', error);
      toast.error('Failed to update calibration');
    }
  };

  const handleAddSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const newSensor = {
      id: `S-${Date.now()}`,
      name: formData.get('name'),
      location: formData.get('location'),
      status: 'Active',
      lastCalibration: new Date().toISOString().split('T')[0],
    };
    
    try {
      const updatedSensors = [...sensors, newSensor];
      const updatedSettings = { ...settings, sensors: updatedSensors };
      await settingsAPI.update(updatedSettings);
      setSensors(updatedSensors);
      setSettings(updatedSettings);
      form.reset();
      toast.success('Sensor registered successfully');
    } catch (error) {
      console.error('Error adding sensor:', error);
      toast.error('Failed to register sensor');
    }
  };

  const handleEditSensor = (sensor: any) => {
    setEditingSensor({ ...sensor });
    setEditDialogOpen(true);
  };

  const handleDeleteSensor = (sensor: any) => {
    setDeletingSensor(sensor);
    setDeleteDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      const updatedSensors = sensors.map(s => 
        s.id === editingSensor.id ? editingSensor : s
      );
      const updatedSettings = { ...settings, sensors: updatedSensors };
      await settingsAPI.update(updatedSettings);
      setSensors(updatedSensors);
      setSettings(updatedSettings);
      setEditDialogOpen(false);
      setEditingSensor(null);
      toast.success('Sensor updated successfully');
    } catch (error) {
      console.error('Error updating sensor:', error);
      toast.error('Failed to update sensor');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const updatedSensors = sensors.filter(s => s.id !== deletingSensor.id);
      const updatedSettings = { ...settings, sensors: updatedSensors };
      await settingsAPI.update(updatedSettings);
      setSensors(updatedSensors);
      setSettings(updatedSettings);
      setDeleteDialogOpen(false);
      setDeletingSensor(null);
      toast.success('Sensor deleted successfully');
    } catch (error) {
      console.error('Error deleting sensor:', error);
      toast.error('Failed to delete sensor');
    }
  };

  const handleBackup = async () => {
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
      doc.text('HydroGuard System Backup', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(timestamp, pageWidth / 2, 27, { align: 'center' });
      
      let yPosition = 40;
      
      // System Settings
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('System Settings', 14, yPosition);
      yPosition += 10;
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Setting', 'Value']],
        body: [
          ['System Name', settings?.systemName || 'N/A'],
          ['Barangay', settings?.barangay || 'N/A'],
          ['City', settings?.city || 'N/A'],
          ['Alerts Enabled', settings?.alertsEnabled ? 'Yes' : 'No'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [38, 52, 58] },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
      
      // Sensors
      if (sensors.length > 0) {
        doc.setFontSize(14);
        doc.text('Registered Sensors', 14, yPosition);
        yPosition += 10;
        
        autoTable(doc, {
          startY: yPosition,
          head: [['ID', 'Name', 'Location', 'Status']],
          body: sensors.map(s => [
            s.id,
            s.name,
            s.location,
            s.status
          ]),
          theme: 'grid',
          headStyles: { fillColor: [38, 52, 58] },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }
      
      // Users Summary
      const users = await usersAPI.getAll();
      if (users.length > 0 && yPosition < 250) {
        doc.setFontSize(14);
        doc.text('User Accounts', 14, yPosition);
        yPosition += 10;
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Name', 'Email', 'Role']],
          body: users.slice(0, 10).map((u: any) => [
            u.fullName,
            u.email,
            u.role
          ]),
          theme: 'grid',
          headStyles: { fillColor: [38, 52, 58] },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }
      
      // Add new page for audit logs
      doc.addPage();
      yPosition = 20;
      
      // Recent Audit Logs
      if (auditLogs.length > 0) {
        doc.setFontSize(14);
        doc.text('Recent Audit Logs', 14, yPosition);
        yPosition += 10;
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Time', 'User', 'Action', 'Details']],
          body: auditLogs.slice(0, 20).map(log => [
            format(new Date(log.timestamp), 'MMM d, h:mm a'),
            log.userName,
            log.action,
            log.details.substring(0, 40) + (log.details.length > 40 ? '...' : '')
          ]),
          theme: 'grid',
          headStyles: { fillColor: [38, 52, 58] },
          styles: { fontSize: 8 },
        });
      }
      
      // Footer on all pages
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount} | Generated by HydroGuard 180`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      doc.save(`HydroGuard_Backup_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Backup downloaded successfully');
    } catch (error) {
      console.error('Error generating backup:', error);
      toast.error('Failed to generate backup');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 lg:overflow-hidden overflow-y-auto custom-scrollbar">
      

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2.5 mb-4 flex-shrink-0">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <SettingsIcon className="text-gray-600" size={18} />
            </div>
            <h2 className="text-sm font-bold text-[#1F2937]">System Settings</h2>
          </div>

          <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2.5">
                <Bell className="text-gray-500" size={16} />
                <div>
                  <p className="font-medium text-[#1F2937] text-sm">System Alerts</p>
                  <p className="text-[11px] text-gray-500">Enable/disable automated warnings</p>
                </div>
              </div>
              <Switch checked={settings?.alertsEnabled} onCheckedChange={handleToggleAlerts} />
            </div>

            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="text-gray-500" size={16} />
                <p className="font-medium text-[#1F2937] text-sm">Device Calibration</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500">Zero Point Offset</label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={settings?.calibration?.zeroPointOffset || 0}
                    onChange={(e) => handleUpdateCalibration('zeroPointOffset', parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Scale Factor</label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={settings?.calibration?.scaleFactor || 1}
                    onChange={(e) => handleUpdateCalibration('scaleFactor', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <Button onClick={handleBackup} variant="outline" size="sm" className="w-full flex items-center gap-2">
                <Download size={14} />
                Backup System Data
              </Button>
            </div>
          </div>
        </div>

        {/* Sensor Registration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2.5 mb-4 flex-shrink-0">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <Activity className="text-green-600" size={18} />
            </div>
            <h2 className="text-sm font-bold text-[#1F2937]">Sensors</h2>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mb-3 pr-1 custom-scrollbar">
            {sensors.map((sensor) => (
              <div
                key={sensor.id}
                className="flex justify-between items-center p-2.5 border border-gray-100 rounded-lg bg-gray-50/50"
              >
                <div className="flex-1">
                  <p className="font-medium text-xs text-[#1F2937]">{sensor.name}</p>
                  <p className="text-[10px] text-gray-500">
                    {sensor.location} • {sensor.id}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      sensor.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {sensor.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleEditSensor(sensor)}
                  >
                    <Edit2 size={14} className="text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDeleteSensor(sensor)}
                  >
                    <Trash2 size={14} className="text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddSensor} className="space-y-2 pt-3 border-t border-gray-100 flex-shrink-0">
            <p className="text-xs font-medium text-gray-700">Register New Sensor</p>
            <Input name="name" placeholder="Sensor Name" required className="h-8 text-sm" />
            <Input name="location" placeholder="Location" required className="h-8 text-sm" />
            <Button type="submit" size="sm" className="w-full bg-[#26343A] hover:bg-[#1f2b30]">
              <Plus size={14} className="mr-1.5" /> Register
            </Button>
          </form>
        </div>
      </div>

      {/* Audit Log — compact, scrollable within fixed area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex-shrink-0 lg:max-h-[200px] flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center">
            <Shield className="text-purple-600" size={14} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1F2937]">Audit Log</h2>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Time</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">User</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Action</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                    </td>
                    <td className="py-2 px-3 font-medium text-[#1F2937]">{log.userName}</td>
                    <td className="py-2 px-3 text-gray-700">{log.action}</td>
                    <td className="py-2 px-3 text-gray-500 max-w-[200px] truncate">{log.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400">
                    No audit logs available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden divide-y divide-gray-50">
          {auditLogs.length > 0 ? (
            auditLogs.map((log) => (
              <div key={log.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[#1F2937]">{log.userName}</span>
                  <span className="text-[10px] text-gray-400">{format(new Date(log.timestamp), 'MMM d, h:mm a')}</span>
                </div>
                <p className="text-xs text-gray-700">{log.action}</p>
                <p className="text-[11px] text-gray-400 truncate">{log.details}</p>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-gray-400 text-xs">
              No audit logs available
            </div>
          )}
        </div>
      </div>

      {/* Edit Sensor Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Sensor</DialogTitle>
            <DialogDescription>
              Update sensor information. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Sensor Name</Label>
              <Input
                id="edit-name"
                value={editingSensor?.name || ''}
                onChange={(e) => setEditingSensor({ ...editingSensor, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={editingSensor?.location || ''}
                onChange={(e) => setEditingSensor({ ...editingSensor, location: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950"
                value={editingSensor?.status || 'Active'}
                onChange={(e) => setEditingSensor({ ...editingSensor, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-[#26343A] hover:bg-[#1f2b30]">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Sensor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this sensor? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900">{deletingSensor?.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {deletingSensor?.location} • {deletingSensor?.id}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmDelete} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Sensor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}