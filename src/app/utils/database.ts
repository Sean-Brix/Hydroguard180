// Database utility functions for managing JSON data
import usersData from '../../database/users.json';
import residentsData from '../../database/residents.json';
import waterMonitoringData from '../../database/water-monitoring.json';
import alertLevelsData from '../../database/alert-levels.json';
import auditLogsData from '../../database/audit-logs.json';
import settingsData from '../../database/settings.json';
import assetsData from '../../database/assets.json';

// In-memory storage (simulating database)
let users = [...usersData];
let residents = [...residentsData];
let waterMonitoring = [...waterMonitoringData];
let alertLevels = [...alertLevelsData];
let auditLogs = [...auditLogsData];
let settings = { ...settingsData };
let assets = { ...assetsData };

// FAQ data (in-memory)
let faqs: any[] = [
  {
    id: 'faq-1',
    category: 'Flood Monitoring',
    question: 'What is Hydro Guard 180?',
    answer: 'Hydro Guard 180 is a comprehensive flood monitoring and emergency response system designed specifically for Barangay 180 in Caloocan City. It uses IoT water-level sensors to provide real-time data and automated alerts to protect our community from flood-related disasters.',
    isPublished: true,
    order: 1,
    createdAt: '2025-11-15T08:00:00Z',
    updatedAt: '2025-11-15T08:00:00Z',
  },
  {
    id: 'faq-2',
    category: 'Flood Monitoring',
    question: 'How does the water monitoring system work?',
    answer: 'Our IoT water-level monitoring device continuously measures water levels at critical points in the barangay. The device sends readings every 1-5 minutes to our system, which automatically classifies the flood risk level and triggers appropriate alerts and safety protocols.',
    isPublished: true,
    order: 2,
    createdAt: '2025-11-15T08:10:00Z',
    updatedAt: '2025-11-15T08:10:00Z',
  },
  {
    id: 'faq-3',
    category: 'Flood Monitoring',
    question: 'How often is the water level updated?',
    answer: 'Water level data is updated every 1 to 5 minutes, depending on the current alert level. During critical situations, readings are taken more frequently to ensure accurate and timely information.',
    isPublished: true,
    order: 3,
    createdAt: '2025-11-15T08:20:00Z',
    updatedAt: '2025-11-15T08:20:00Z',
  },
  {
    id: 'faq-4',
    category: 'Alert System',
    question: 'What are the different alert levels?',
    answer: 'Our system uses four alert levels: Level 1 (Normal) - no flood risk; Level 2 (Advisory) - elevated water levels, stay informed; Level 3 (Warning) - significant flood risk, prepare to evacuate; Level 4 (Critical) - immediate danger, evacuate now.',
    isPublished: true,
    order: 4,
    createdAt: '2025-11-16T09:00:00Z',
    updatedAt: '2025-11-16T09:00:00Z',
  },
  {
    id: 'faq-5',
    category: 'Alert System',
    question: 'How will I be notified of flood alerts?',
    answer: 'Flood alerts are communicated through multiple channels: our website dashboard, SMS notifications to registered residents, barangay PA system announcements, and social media posts on the official Barangay 180 accounts.',
    isPublished: true,
    order: 5,
    createdAt: '2025-11-16T09:10:00Z',
    updatedAt: '2025-11-16T09:10:00Z',
  },
  {
    id: 'faq-6',
    category: 'Evacuation',
    question: 'Where are the evacuation centers?',
    answer: 'The primary evacuation centers are Barangay 180 Multi-Purpose Hall, Caloocan North High School, and the community basketball court. Specific assignments depend on your zone. Check the Training page for detailed information about each center.',
    isPublished: true,
    order: 6,
    createdAt: '2025-11-17T10:00:00Z',
    updatedAt: '2025-11-17T10:00:00Z',
  },
  {
    id: 'faq-7',
    category: 'Evacuation',
    question: 'What should I bring to an evacuation center?',
    answer: 'Bring your go-bag with essentials: valid IDs, important documents in waterproof bags, medications, first aid kit, flashlight, batteries, portable phone charger, water and non-perishable food for 3 days, change of clothes, and blankets.',
    isPublished: false,
    order: 7,
    createdAt: '2025-11-17T10:10:00Z',
    updatedAt: '2025-11-17T10:10:00Z',
  },
];

// Inquiries data (in-memory)
let inquiries: any[] = [
  {
    id: 'inq-1',
    name: 'Maria Santos',
    email: 'maria.santos@email.com',
    phone: '09171234567',
    subject: 'Flood Alert Notification',
    message: 'I would like to register my household for SMS flood alerts. We live near the creek area in Zone 3 and want to make sure we receive timely notifications during typhoon season.',
    status: 'unread',
    createdAt: '2026-02-20T14:30:00Z',
    repliedAt: null,
    reply: null,
  },
  {
    id: 'inq-2',
    name: 'Jose Reyes',
    email: 'jose.reyes@email.com',
    phone: '09189876543',
    subject: 'Evacuation Center Concern',
    message: 'The roof of the multi-purpose hall has some leaks. Can this be repaired before the rainy season? It might cause problems if used as an evacuation center.',
    status: 'read',
    createdAt: '2026-02-18T09:15:00Z',
    repliedAt: null,
    reply: null,
  },
  {
    id: 'inq-3',
    name: 'Ana Garcia',
    email: 'ana.garcia@email.com',
    phone: '09201112233',
    subject: 'Volunteer for Flood Response Team',
    message: 'I am interested in volunteering for the barangay flood response team. I have basic first aid training and am available during weekends. How can I sign up?',
    status: 'replied',
    createdAt: '2026-02-15T16:45:00Z',
    repliedAt: '2026-02-16T10:00:00Z',
    reply: 'Thank you for your interest, Ana! Please visit the Barangay Hall during office hours (Mon-Fri, 8AM-5PM) and ask for the BDRRMC desk. Bring a valid ID and we will process your volunteer registration.',
  },
  {
    id: 'inq-4',
    name: 'Pedro Cruz',
    email: 'pedro.cruz@email.com',
    phone: '',
    subject: 'Water Level Sensor Location',
    message: 'Where exactly is the water level sensor installed? I noticed some construction near the creek and want to make sure it won\'t affect the sensor readings.',
    status: 'unread',
    createdAt: '2026-02-25T11:20:00Z',
    repliedAt: null,
    reply: null,
  },
  {
    id: 'inq-5',
    name: 'Lorna Mendoza',
    email: 'lorna.m@email.com',
    phone: '09153344556',
    subject: 'Request for Flood History Data',
    message: 'I am a student researcher from PUP Caloocan and I would like to request access to historical flood data for my thesis about urban flooding patterns. Is this possible?',
    status: 'read',
    createdAt: '2026-02-22T13:00:00Z',
    repliedAt: null,
    reply: null,
  },
];

// Users
export const getUsers = () => users.filter(u => u.status !== 'deleted');
export const getUserById = (id: string) => users.find(u => u.id === id);
export const addUser = (user: any) => {
  users.push(user);
  return user;
};
export const updateUser = (id: string, updates: any) => {
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() };
    return users[index];
  }
  return null;
};
export const deleteUser = (id: string) => {
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index].status = 'archived';
    return true;
  }
  return false;
};
export const permanentDeleteUser = (id: string) => {
  const index = users.findIndex(u => u.id === id);
  if (index !== -1 && users[index].status === 'archived') {
    users[index].status = 'deleted';
    return true;
  }
  return false;
};

// Residents
export const getResidents = () => residents.filter(r => r.status !== 'deleted');
export const getResidentById = (id: string) => residents.find(r => r.id === id);
export const addResident = (resident: any) => {
  residents.push(resident);
  return resident;
};
export const updateResident = (id: string, updates: any) => {
  const index = residents.findIndex(r => r.id === id);
  if (index !== -1) {
    residents[index] = { ...residents[index], ...updates, updatedAt: new Date().toISOString() };
    return residents[index];
  }
  return null;
};
export const deleteResident = (id: string) => {
  const index = residents.findIndex(r => r.id === id);
  if (index !== -1) {
    residents[index].status = 'archived';
    return true;
  }
  return false;
};
export const permanentDeleteResident = (id: string) => {
  const index = residents.findIndex(r => r.id === id);
  if (index !== -1 && residents[index].status === 'archived') {
    residents[index].status = 'deleted';
    return true;
  }
  return false;
};

// Water Monitoring
export const getWaterMonitoring = () => waterMonitoring;
export const getLatestWaterReading = () => {
  if (waterMonitoring.length === 0) return null;
  return waterMonitoring[waterMonitoring.length - 1];
};
export const addWaterReading = (reading: any) => {
  waterMonitoring.push(reading);
  return reading;
};

// Alert Levels
export const getAlertLevels = () => alertLevels;
export const getAlertLevelByLevel = (level: number) => alertLevels.find(a => a.level === level);
export const getCurrentAlertLevel = () => {
  const latest = getLatestWaterReading();
  if (!latest) return getAlertLevelByLevel(1);

  const levelsBySeverity = [...alertLevels].sort((a, b) => b.level - a.level);
  const matchedLevel = levelsBySeverity.find(
    a => latest.waterLevel >= a.minWaterLevel && latest.waterLevel <= a.maxWaterLevel
  );

  if (matchedLevel) return matchedLevel;

  const minThreshold = Math.min(...alertLevels.map(a => a.minWaterLevel));
  const maxThreshold = Math.max(...alertLevels.map(a => a.maxWaterLevel));

  if (latest.waterLevel < minThreshold) return getAlertLevelByLevel(levelsBySeverity[0].level);
  if (latest.waterLevel > maxThreshold) return getAlertLevelByLevel(levelsBySeverity[levelsBySeverity.length - 1].level);

  return getAlertLevelByLevel(1);
};
export const updateAlertLevel = (level: number, updates: any) => {
  const index = alertLevels.findIndex(a => a.level === level);
  if (index !== -1) {
    alertLevels[index] = { ...alertLevels[index], ...updates };
    return alertLevels[index];
  }
  return null;
};

// Settings
export const getSettings = () => settings;
export const updateSettings = (updates: any) => {
  settings = { ...settings, ...updates };
  return settings;
};
export const addSensor = (sensor: any) => {
  if (!settings.sensors) settings.sensors = [];
  settings.sensors.push(sensor);
  return sensor;
};
export const updateSensor = (id: string, updates: any) => {
  if (!settings.sensors) return null;
  const index = settings.sensors.findIndex((s: any) => s.id === id);
  if (index !== -1) {
    settings.sensors[index] = { ...settings.sensors[index], ...updates };
    return settings.sensors[index];
  }
  return null;
};

// Audit Logs
export const getAuditLogs = () => auditLogs;
export const addAuditLog = (log: any) => {
  auditLogs.push(log);
  return log;
};

// Assets
export const getAssets = () => assets;
export const getAsset = (key: string) => (assets as any)[key] ?? null;

// FAQs
export const getFaqs = () => faqs;
export const getPublishedFaqs = () => faqs.filter(f => f.isPublished);
export const getFaqById = (id: string) => faqs.find(f => f.id === id);
export const addFaq = (faq: any) => {
  faqs.push(faq);
  return faq;
};
export const updateFaq = (id: string, updates: any) => {
  const index = faqs.findIndex(f => f.id === id);
  if (index !== -1) {
    faqs[index] = { ...faqs[index], ...updates, updatedAt: new Date().toISOString() };
    return faqs[index];
  }
  return null;
};
export const deleteFaq = (id: string) => {
  const index = faqs.findIndex(f => f.id === id);
  if (index !== -1) {
    faqs.splice(index, 1);
    return true;
  }
  return false;
};

// Inquiries
export const getInquiries = () => inquiries;
export const getInquiryById = (id: string) => inquiries.find(i => i.id === id);
export const addInquiry = (inquiry: any) => {
  const newInquiry = {
    id: `inq-${Date.now()}`,
    ...inquiry,
    status: inquiry.status || 'unread',
    createdAt: inquiry.createdAt || new Date().toISOString(),
    repliedAt: null,
    reply: null,
  };
  inquiries.push(newInquiry);
  return { success: true, data: newInquiry };
};
export const updateInquiry = (id: string, updates: any) => {
  const index = inquiries.findIndex(i => i.id === id);
  if (index !== -1) {
    inquiries[index] = { ...inquiries[index], ...updates };
    return inquiries[index];
  }
  return null;
};
export const deleteInquiry = (id: string) => {
  const index = inquiries.findIndex(i => i.id === id);
  if (index !== -1) {
    inquiries.splice(index, 1);
    return true;
  }
  return false;
};
export const getUnreadInquiriesCount = () => inquiries.filter(i => i.status === 'unread').length;

// Export data utilities
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};