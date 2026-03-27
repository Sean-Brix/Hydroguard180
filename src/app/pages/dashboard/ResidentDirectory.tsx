import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { residentsAPI } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Edit, Archive, Trash2, Search, Download, Users, UserCheck, ArchiveIcon, RotateCcw } from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';

const exportToCSV = (rows: any[], filename: string) => {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? '';
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    ),
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

type StatusFilter = 'all' | 'active' | 'archived';

export function ResidentDirectory() {
  const { user: currentUser } = useAuth();
  const [residents, setResidents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [showDialog, setShowDialog] = useState(false);
  const [editingResident, setEditingResident] = useState<any>(null);
  const [formData, setFormData] = useState({
    residentName: '',
    address: '',
    contactNumber: '',
    emergencyContact: '',
    householdCount: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'archive' | 'delete';
    id: string;
    name: string;
  }>({ open: false, type: 'archive', id: '', name: '' });

  useEffect(() => {
    loadResidents();
  }, []);

  const loadResidents = async () => {
    try {
      const data = await residentsAPI.getAll();
      setResidents(data.filter((r: any) => r.status !== 'deleted'));
    } catch (error) {
      console.error('Error loading residents:', error);
      toast.error('Failed to load residents');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setFormErrors({});

    // Validate form
    const errors: Record<string, string> = {};
    if (!formData.residentName.trim()) errors.residentName = 'Resident name is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.contactNumber.trim()) errors.contactNumber = 'Contact number is required';
    if (!formData.emergencyContact.trim()) errors.emergencyContact = 'Emergency contact is required';
    if (!formData.householdCount.trim()) {
      errors.householdCount = 'Household count is required';
    } else if (isNaN(Number(formData.householdCount)) || Number(formData.householdCount) < 1) {
      errors.householdCount = 'Must be a valid number greater than 0';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the form errors');
      return;
    }
    
    try {
      if (editingResident) {
        await residentsAPI.update(editingResident.id, {
          ...formData,
          householdCount: parseInt(formData.householdCount)
        });
        toast.success('Resident updated successfully');
      } else {
        await residentsAPI.create({
          ...formData,
          householdCount: parseInt(formData.householdCount),
          status: 'active',
        });
        toast.success('Resident added successfully');
      }

      await loadResidents();
      setShowDialog(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving resident:', error);
      const errorMessage = error.message || (editingResident ? 'Failed to update resident' : 'Failed to add resident');
      toast.error(errorMessage);
    }
  };

  const handleEdit = (resident: any) => {
    setEditingResident(resident);
    setFormData({
      residentName: resident.residentName,
      address: resident.address,
      contactNumber: resident.contactNumber,
      emergencyContact: resident.emergencyContact,
      householdCount: resident.householdCount.toString(),
      notes: resident.notes || '',
    });
    setFormErrors({});
    setShowDialog(true);
  };

  const handleArchive = (id: string, name: string) => {
    setConfirmModal({ open: true, type: 'archive', id, name });
  };

  const handlePermanentDelete = (id: string, name: string) => {
    setConfirmModal({ open: true, type: 'delete', id, name });
  };

  const handleRestore = async (id: string) => {
    try {
      await residentsAPI.update(id, { status: 'active' });
      await loadResidents();
      toast.success('Resident restored');
    } catch (error) {
      console.error('Error restoring resident:', error);
      toast.error('Failed to restore resident');
    }
  };

  const executeConfirm = async () => {
    const { type, id, name } = confirmModal;
    try {
      if (type === 'archive') {
        await residentsAPI.update(id, { status: 'archived' });
        await loadResidents();
        toast.success('Resident archived');
      } else {
        await residentsAPI.delete(id);
        await loadResidents();
        toast.success('Resident permanently deleted');
      }
      setConfirmModal({ open: false, type: 'archive', id: '', name: '' });
    } catch (error) {
      console.error('Error:', error);
      toast.error(type === 'archive' ? 'Failed to archive resident' : 'Failed to delete resident');
    }
  };

  const handleExport = () => {
    exportToCSV(residents, 'resident-directory.csv');
    toast.success('Data exported successfully');
  };

  const resetForm = () => {
    setEditingResident(null);
    setFormData({
      residentName: '',
      address: '',
      contactNumber: '',
      emergencyContact: '',
      householdCount: '',
      notes: '',
    });
    setFormErrors({});
  };

  const filteredResidents = residents.filter((r) => {
    // Status filter
    if (statusFilter === 'active' && r.status !== 'active') return false;
    if (statusFilter === 'archived' && r.status !== 'archived') return false;
    
    // Search filter
    if (searchQuery) {
      return (
        r.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.contactNumber.includes(searchQuery)
      );
    }
    
    return true;
  });

  const counts = {
    all: residents.length,
    active: residents.filter(r => r.status === 'active').length,
    archived: residents.filter(r => r.status === 'archived').length,
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 lg:overflow-hidden overflow-y-auto custom-scrollbar">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-shrink-0">
        <h2 className="text-xl font-semibold text-gray-800">Resident Directory</h2>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={16} className="mr-1.5" />
            Export
          </Button>
          
          <Dialog open={showDialog} onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#FF6A00] hover:bg-[#E55F00]">
                <UserPlus size={16} className="mr-1.5" />
                Add Resident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingResident ? 'Edit Resident' : 'Add New Resident'}</DialogTitle>
                <DialogDescription>
                  {editingResident ? 'Update resident information' : 'Fill in the details to add a new resident to the directory'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resident Name *</label>
                  <Input
                    value={formData.residentName}
                    onChange={(e) => setFormData({ ...formData, residentName: e.target.value })}
                    className={formErrors.residentName ? 'border-red-500' : ''}
                  />
                  {formErrors.residentName && <p className="text-xs text-red-500 mt-1">{formErrors.residentName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={formErrors.address ? 'border-red-500' : ''}
                  />
                  {formErrors.address && <p className="text-xs text-red-500 mt-1">{formErrors.address}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                  <Input
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    placeholder="09XX XXX XXXX"
                    className={formErrors.contactNumber ? 'border-red-500' : ''}
                  />
                  {formErrors.contactNumber && <p className="text-xs text-red-500 mt-1">{formErrors.contactNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact *</label>
                  <Input
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="09XX XXX XXXX"
                    className={formErrors.emergencyContact ? 'border-red-500' : ''}
                  />
                  {formErrors.emergencyContact && <p className="text-xs text-red-500 mt-1">{formErrors.emergencyContact}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Household Count *</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.householdCount}
                    onChange={(e) => setFormData({ ...formData, householdCount: e.target.value })}
                    placeholder="Number of people in household"
                    className={formErrors.householdCount ? 'border-red-500' : ''}
                  />
                  {formErrors.householdCount && <p className="text-xs text-red-500 mt-1">{formErrors.householdCount}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-[#FF6A00] hover:bg-[#E55F00]">
                    {editingResident ? 'Update' : 'Add Resident'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-1 flex-shrink-0">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'default' : 'ghost'}
            onClick={() => setStatusFilter('all')}
            className={`flex-1 ${statusFilter === 'all' ? 'bg-[#FF6A00] hover:bg-[#E55F00]' : ''}`}
          >
            <Users size={16} className="mr-1.5" />
            All
            <Badge 
              variant="secondary" 
              className={`ml-2 ${statusFilter === 'all' ? 'bg-white/20 text-white' : ''}`}
            >
              {counts.all}
            </Badge>
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'active' ? 'default' : 'ghost'}
            onClick={() => setStatusFilter('active')}
            className={`flex-1 ${statusFilter === 'active' ? 'bg-[#FF6A00] hover:bg-[#E55F00]' : ''}`}
          >
            <UserCheck size={16} className="mr-1.5" />
            Active
            <Badge 
              variant="secondary" 
              className={`ml-2 ${statusFilter === 'active' ? 'bg-white/20 text-white' : ''}`}
            >
              {counts.active}
            </Badge>
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'archived' ? 'default' : 'ghost'}
            onClick={() => setStatusFilter('archived')}
            className={`flex-1 ${statusFilter === 'archived' ? 'bg-[#FF6A00] hover:bg-[#E55F00]' : ''}`}
          >
            <ArchiveIcon size={16} className="mr-1.5" />
            Archived
            <Badge 
              variant="secondary" 
              className={`ml-2 ${statusFilter === 'archived' ? 'bg-white/20 text-white' : ''}`}
            >
              {counts.archived}
            </Badge>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-2.5 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            type="text"
            placeholder="Search residents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {/* Residents Table — desktop only */}
      <div className="hidden lg:flex flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex-col">
        <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
          <Table className="min-w-[700px]">
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Emergency Contact</TableHead>
                <TableHead>Household</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No residents found
                  </TableCell>
                </TableRow>
              ) : (
                filteredResidents.map((resident) => (
                  <TableRow key={resident.id}>
                    <TableCell className="font-medium">{resident.residentName}</TableCell>
                    <TableCell>{resident.address}</TableCell>
                    <TableCell>{resident.contactNumber}</TableCell>
                    <TableCell>{resident.emergencyContact}</TableCell>
                    <TableCell>{resident.householdCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(resident)}
                        >
                          <Edit size={16} />
                        </Button>
                        {resident.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleArchive(resident.id, resident.residentName)}
                          >
                            <Archive size={16} />
                          </Button>
                        )}
                        {resident.status === 'archived' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(resident.id)}
                          >
                            <RotateCcw size={16} />
                          </Button>
                        )}
                        {resident.status === 'archived' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handlePermanentDelete(resident.id, resident.residentName)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Residents Cards — mobile only */}
      <div className="lg:hidden space-y-2 pb-4">
        {filteredResidents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
            <UserPlus className="mx-auto text-gray-300 mb-2" size={40} />
            <p className="text-sm text-gray-500">No residents found</p>
          </div>
        ) : (
          filteredResidents.map((resident) => (
            <div
              key={resident.id}
              className="bg-white rounded-lg shadow-sm border border-gray-100 p-3.5"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-[#1F2937] truncate">{resident.residentName}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{resident.address}</p>
                </div>
                {resident.status === 'archived' && (
                  <Badge variant="outline" className="text-[10px] shrink-0">Archived</Badge>
                )}
              </div>
              <div className="space-y-1 mb-3">
                <p className="text-xs text-gray-600">📱 {resident.contactNumber}</p>
                <p className="text-xs text-gray-600">🆘 {resident.emergencyContact}</p>
                <p className="text-xs text-gray-600">👥 {resident.householdCount} {resident.householdCount === 1 ? 'person' : 'people'}</p>
              </div>
              {resident.notes && (
                <p className="text-[11px] text-gray-400 mb-3 line-clamp-2">{resident.notes}</p>
              )}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => handleEdit(resident)}>
                  <Edit size={14} className="mr-1" /> Edit
                </Button>
                {resident.status === 'active' && (
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => handleArchive(resident.id, resident.residentName)}>
                    <Archive size={14} className="mr-1" /> Archive
                  </Button>
                )}
                {resident.status === 'archived' && (
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => handleRestore(resident.id)}>
                    <RotateCcw size={14} className="mr-1" /> Restore
                  </Button>
                )}
                {resident.status === 'archived' && (
                  <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" onClick={() => handlePermanentDelete(resident.id, resident.residentName)}>
                    <Trash2 size={14} className="mr-1" /> Delete
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, type: 'archive', id: '', name: '' })}
        onConfirm={executeConfirm}
        title={confirmModal.type === 'archive' ? 'Archive Resident' : 'Permanently Delete Resident'}
        description={
          confirmModal.type === 'archive'
            ? 'This resident will be moved to the archive and removed from the active contacts list.'
            : 'This action cannot be undone. The resident will be permanently removed from the system.'
        }
        detail={confirmModal.name}
        confirmLabel={confirmModal.type === 'archive' ? 'Archive' : 'Delete Permanently'}
        variant={confirmModal.type === 'archive' ? 'warning' : 'danger'}
      />
    </div>
  );
}
