import { motion, useInView } from 'motion/react';
import { 
  Phone, Mail, MapPin, Clock, Send, AlertCircle, 
  Building2, PhoneCall, Flame, ShieldAlert, Siren,
  Hospital, Navigation
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import maplibregl from 'maplibre-gl';
import { inquiriesAPI, settingsAPI } from '../utils/api';

// Barangay 180 coordinates
const BRGY_LAT = 14.7633;
const BRGY_LNG = 121.0792;

export function Contact() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [sysSettings, setSysSettings] = useState<any>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [BRGY_LNG, BRGY_LAT],
      zoom: 15,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    // Custom marker
    const markerEl = document.createElement('div');
    markerEl.innerHTML = `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="background:#FF6A00;color:white;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;white-space:nowrap;box-shadow:0 4px 16px rgba(255,106,0,0.5);">
          Barangay 180 Hall
        </div>
        <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid #FF6A00;margin-top:-1px;"></div>
        <div style="width:14px;height:14px;background:#FF6A00;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);margin-top:6px;"></div>
      </div>
    `;

    new maplibregl.Marker({ element: markerEl })
      .setLngLat([BRGY_LNG, BRGY_LAT])
      .addTo(map);

    map.on('load', () => setMapLoaded(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inquiriesAPI.create(formData);
      toast.success('Message sent successfully! We will get back to you soon.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again later.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Pull contact numbers from centralized backend settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsAPI.get();
        setSysSettings(data);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  const sysContact = (sysSettings as any)?.contact || {};

  const emergencyContacts = [
    { name: 'Emergency Hotline', number: sysContact.emergencyHotline || '911', type: 'National Emergency', icon: PhoneCall, color: '#EF4444', bgColor: '#FEE2E2' },
    { name: 'Barangay 180 Hall', number: sysContact.barangayHall || '(02) 8123-4567', type: 'Barangay Office', icon: Building2, color: '#FF6A00', bgColor: '#FFF7ED' },
    { name: 'Caloocan MDRRMO', number: sysContact.drrmo || '(02) 8288-8150', type: 'Disaster Response', icon: ShieldAlert, color: '#F59E0B', bgColor: '#FEF3C7' },
    { name: 'NDRRMC Hotline', number: '911-1406', type: 'National Disaster', icon: Siren, color: '#DC2626', bgColor: '#FEE2E2' },
    { name: 'PNP Emergency', number: '117', type: 'Police', icon: ShieldAlert, color: '#3B82F6', bgColor: '#DBEAFE' },
    { name: 'Bureau of Fire', number: '(02) 426-0219', type: 'Fire Department', icon: Flame, color: '#DC2626', bgColor: '#FEE2E2' },
  ];

  const contactInfo = [
    {
      icon: MapPin,
      title: 'Address',
      content: `${(sysSettings as any)?.barangay || 'Barangay 180'} Hall\n${(sysSettings as any)?.city || 'Caloocan City'}, Metro Manila\nPhilippines 1400`,
      color: '#FF6A00',
    },
    {
      icon: Phone,
      title: 'Phone',
      content: sysContact.barangayHall || '(02) 8123-4567',
      color: '#3B82F6',
    },
    {
      icon: Mail,
      title: 'Email',
      content: 'info@barangay180.gov.ph\nhydroguard@barangay180.gov.ph',
      color: '#8B5CF6',
    },
    {
      icon: Clock,
      title: 'Office Hours',
      content: 'Monday - Friday: 8:00 AM - 5:00 PM\nSaturday: 8:00 AM - 12:00 PM\nSunday: Closed',
      color: '#22C55E',
    },
  ];

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* ─── HERO ─── */}
      <section 
        ref={heroRef}
        className="relative bg-gradient-to-br from-[#26343A] to-[#1a252a] text-white py-20 lg:py-28 overflow-hidden"
      >
        {/* Ambient effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#FF6A00]/12 rounded-full blur-[150px]"
            animate={{ opacity: [0.12, 0.25, 0.12] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/4 left-1/5 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[140px]"
            animate={{ opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-6"
            >
              <PhoneCall size={16} className="text-[#FF6A00]" />
              <span className="text-sm font-medium">We're Here to Help</span>
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Get in <span className="text-[#FF6A00]">Touch</span>
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-gray-300 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Have questions about flood preparedness? Need assistance? Reach out to Barangay 180 — we're available to serve our community.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left: Contact Info + Map */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div>
              <p className="text-sm tracking-widest text-[#FF6A00] font-medium uppercase mb-3">Contact Information</p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-6">
                Visit or Call Us
              </h2>
              
              <div className="space-y-5">
                {contactInfo.map((item, idx) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                    className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all"
                  >
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" 
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <item.icon size={22} style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#1F2937] mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{item.content}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Interactive Map */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="relative"
            >
              <div className="absolute -inset-2 bg-gradient-to-br from-[#FF6A00]/10 to-blue-500/10 rounded-[28px] blur-xl" />
              <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-200">
                <div 
                  ref={mapContainerRef} 
                  className="w-full h-[400px] bg-gray-100"
                  style={{ opacity: mapLoaded ? 1 : 0, transition: 'opacity 0.5s' }}
                />
                {!mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center text-gray-400">
                      <Navigation size={48} className="mx-auto mb-3 animate-pulse" />
                      <p className="text-sm">Loading map...</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <MapPin size={14} className="text-[#FF6A00]" />
                <span>Coordinates: {BRGY_LAT}° N, {BRGY_LNG}° E</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-br from-[#FF6A00]/5 to-transparent rounded-[28px]" />
              <div className="relative bg-white rounded-2xl shadow-lg border border-gray-100 p-8 lg:p-10">
                <div className="mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#1F2937] mb-2">Send Us a Message</h2>
                  <p className="text-gray-500">Fill out the form below and we'll respond within 24 hours.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Juan Dela Cruz"
                      className="h-12"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="juan@example.com"
                        className="h-12"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="09XX XXX XXXX"
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                      Subject *
                    </label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="How can we help you?"
                      className="h-12"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                      Message *
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us more about your inquiry..."
                      rows={6}
                      className="resize-none"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-[#FF6A00] hover:bg-[#E55F00] text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all"
                  >
                    <Send size={18} className="mr-2" />
                    Send Message
                  </Button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── EMERGENCY HOTLINES ─── */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50" />
        <div className="absolute inset-0 opacity-5" style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px' 
        }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 border border-red-200 rounded-full mb-4">
              <AlertCircle size={16} className="text-red-600" />
              <span className="text-sm font-semibold text-red-700">Emergency Contacts</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-4">
              Emergency Hotlines
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Save these numbers in your phone now. In an emergency, every second counts.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {emergencyContacts.map((contact, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.5 }}
                viewport={{ once: true }}
                className="group relative bg-white rounded-2xl p-6 border-2 hover:shadow-xl transition-all"
                style={{ borderColor: contact.color + '30' }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: contact.bgColor }}
                  >
                    <contact.icon size={22} style={{ color: contact.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span 
                      className="text-xs font-bold uppercase tracking-wider mb-1 block"
                      style={{ color: contact.color }}
                    >
                      {contact.type}
                    </span>
                    <h3 className="font-bold text-[#1F2937] text-sm">{contact.name}</h3>
                  </div>
                </div>
                <div 
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: contact.color }}
                >
                  {contact.number}
                </div>
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                  style={{ backgroundColor: contact.color }}
                />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="relative max-w-3xl mx-auto"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur opacity-20" />
            <div className="relative bg-white border-2 border-red-200 rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <AlertCircle size={24} className="text-red-600" />
                <p className="text-lg font-bold text-red-800">
                  For Life-Threatening Emergencies
                </p>
              </div>
              <p className="text-sm text-red-700">
                Always call <span className="font-bold text-xl">911</span> first for immediate police, fire, or medical emergencies. Other hotlines are for specific assistance and coordination.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}