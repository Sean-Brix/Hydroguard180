import { Link } from 'react-router';
import { motion, useInView, useScroll, useTransform, useSpring } from 'motion/react';
import {
  BookOpen, Phone, Shield, Droplets, Users,
  ChevronRight, Waves, Clock, MapPin,
  Zap, Bell, Activity
} from 'lucide-react';
import { waterMonitoringAPI, alertLevelsAPI } from '../utils/api';
import { useEffect, useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import CountUp from 'react-countup';
import { useWaterMonitoringSSE } from '../hooks/useWaterMonitoringSSE';

// Hero image from assets
import heroImage from "../../assets/hero-image.png";
// Original City Hall photo for How It Works section
import cityHallImage from "../../assets/city-hall.png";

// Animated counter wrapper
function AnimatedStat({ end, suffix = '', prefix = '' }: { end: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <span ref={ref}>
      {isInView ? (
        <CountUp end={end} duration={2.5} separator="," prefix={prefix} suffix={suffix} />
      ) : '0'}
    </span>
  );
}

// Section wrapper
function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`relative ${className}`}>
      {children}
    </section>
  );
}

export function Home() {
  const [currentAlert, setCurrentAlert] = useState<any>(null);
  const [latestReading, setLatestReading] = useState<any>(null);
  const [alertLevels, setAlertLevelsList] = useState<any[]>([]);

  // Parallax scroll for hero background
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  // Smooth out the raw scroll progress with a spring for buttery motion
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 80, damping: 30, mass: 0.5 });
  // Background image: subtle vertical shift + scale
  const heroImgY = useTransform(smoothProgress, [0, 1], ['0%', '10%']);
  const heroScale = useTransform(smoothProgress, [0, 1], [1, 1.03]);
  // Overlays fade stronger as you scroll
  const overlayOpacity = useTransform(smoothProgress, [0, 0.5, 1], [0.75, 0.85, 1]);
  // Content layer moves up at a different rate (multi-layer depth)
  const contentY = useTransform(smoothProgress, [0, 1], ['0px', '-30px']);
  const contentOpacity = useTransform(smoothProgress, [0, 0.7, 1], [1, 0.9, 0.2]);

  useEffect(() => {
    loadData();
  }, []);

  // Real-time SSE updates
  const handleWaterMonitoringUpdate = useCallback((newRecord: any) => {
    console.log('🌊 Real-time update received:', newRecord);
    setLatestReading(newRecord);

    const alert = alertLevels.find((a: any) => a.level === newRecord.alertLevel) || null;

    if (alert) {
      setCurrentAlert(alert);
    }
  }, [alertLevels]);

  const { isConnected } = useWaterMonitoringSSE(handleWaterMonitoringUpdate);

  const loadData = async () => {
    try {
      const [latest, levels] = await Promise.all([
        waterMonitoringAPI.getLatest().catch(() => null),
        alertLevelsAPI.getAll(),
      ]);

      setAlertLevelsList(levels);

      if (latest) {
        setLatestReading(latest);

        const alert = levels.find((a: any) => a.level === latest.alertLevel) || null;
        setCurrentAlert(alert);
      } else {
        setCurrentAlert(levels.find((a: any) => a.level === 1));
        setLatestReading(null);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getAlertColor = (level: number) => {
    const alertInfo = alertLevels.find((a: any) => a.level === level);
    return alertInfo?.color || '#22C55E';
  };

  const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } };
  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <div className="overflow-x-hidden bg-gray-50">
      {/* ─── HERO ─── */}
      <section ref={heroRef} className="relative min-h-[100vh] flex items-end overflow-hidden">
        {/* Full-bleed background — Caloocan City Hall with parallax */}
        <motion.div className="absolute inset-0" style={{ y: heroImgY, scale: heroScale }}>
          <img
            src={heroImage}
            alt="Lungsod ng Caloocan City Hall"
            className="w-full h-[120%] object-cover object-[center_70%] brightness-[0.85]"
          />
        </motion.div>
        {/* Multi-layer overlays for depth — darken as you scroll */}
        <motion.div className="absolute inset-0" style={{ opacity: overlayOpacity }}>
          <div className="absolute inset-0 bg-gradient-to-t from-[#26343A] via-[#26343A]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#26343A]/40 to-transparent" />
        </motion.div>
        {/* Bottom seamless blend */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 to-transparent" />

        {/* Ambient light effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#FF6A00]/10 rounded-full blur-[150px]"
            animate={{ opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/3 left-1/6 w-[300px] h-[300px] bg-blue-500/8 rounded-full blur-[120px]"
            animate={{ opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
        </div>

        {/* Content positioned at bottom, overlapping the photo */}
        <motion.div className="relative w-full z-10 pb-36" style={{ y: contentY, opacity: contentOpacity }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Location tag */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-full">
                <MapPin size={13} className="text-[#FF6A00]" />
                <span className="text-sm text-gray-300">Barangay 180, Caloocan City</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-sm text-gray-300">Live</span>
              </div>
            </motion.div>

            {/* Title */}
            <div className="overflow-hidden mb-4">
              <motion.h1
                className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-[1.02]"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                Hydro Guard
              </motion.h1>
            </div>
            <div className="overflow-hidden mb-8">
              <motion.h1
                className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.02]"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="text-[#FF6A00]">180</span>
              </motion.h1>
            </div>

            {/* Subtitle + CTAs in a row */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="max-w-lg"
              >
                <p className="text-lg md:text-xl text-gray-300 leading-relaxed mb-8">
                  Advanced flood monitoring and rapid emergency response system protecting the residents of Barangay 180.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/training"
                    className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#FF6A00] text-white rounded-xl font-medium hover:bg-[#E55F00] transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02]"
                  >
                    <BookOpen size={18} />
                    Emergency Training
                    <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    to="/contact"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/[0.08] border border-white/15 text-white rounded-xl font-medium hover:bg-white/[0.14] transition-all backdrop-blur-sm"
                  >
                    <Phone size={18} />
                    Emergency Hotlines
                  </Link>
                </div>
              </motion.div>

              {/* Floating live stats on the right */}
              <motion.div
                className="flex flex-wrap lg:flex-nowrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.3 }}
              >
                {[
                  { label: 'Water Level', value: `${latestReading?.waterLevel ?? '--'} cm`, icon: Droplets },
                  { label: 'Alert', value: currentAlert?.name ?? 'Safe', icon: Bell },
                  { label: 'Sensors', value: isConnected ? 'Connected' : 'Reconnecting', icon: Activity },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-xl min-w-[140px]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <item.icon size={16} className="text-[#FF6A00]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm text-white font-medium">{item.value}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── LIVE STATUS BOARD ─── */}
      <Section className="relative z-20 px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="max-w-7xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            {/* Alert Status Card */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Bell size={14} />
                  <span>Alert Status</span>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ color: getAlertColor(currentAlert?.level ?? 1), backgroundColor: `${getAlertColor(currentAlert?.level ?? 1)}15` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getAlertColor(currentAlert?.level ?? 1) }} />
                  Level {currentAlert?.level ?? 1}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[#1F2937] mb-1">{currentAlert?.name ?? 'Loading...'}</h3>
              <p className="text-sm text-gray-500 mb-4">{currentAlert?.action ?? ''}</p>
              <div className="flex items-center gap-3">
                {alertLevels.map((al) => (
                  <div key={al.level} className="flex-1">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        backgroundColor: al.level <= (currentAlert?.level ?? 1) ? getAlertColor(al.level) : '#e5e7eb',
                      }}
                    />
                    <p className="text-[10px] text-gray-400 mt-1 text-center">Lvl {al.level}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Water Level Card */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Droplets size={14} />
                  <span>Water Level</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} />
                  {latestReading ? format(new Date(latestReading.timestamp), 'HH:mm') : '--:--'}
                </div>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-4xl font-bold text-[#1F2937]">{latestReading?.waterLevel ?? '--'}</span>
                <span className="text-lg text-gray-400 pb-1">cm</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">Water Distance Monitoring</p>
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundColor: getAlertColor(currentAlert?.level ?? 1) }}
                  initial={{ width: '0%' }}
                  whileInView={{ width: `${Math.min((latestReading?.waterLevel ?? 0), 100)}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
                <span>0 cm</span>
                <span>100 cm</span>
              </div>
            </motion.div>

            {/* System Status Card */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Activity size={14} />
                  <span>System Status</span>
                </div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Live Telemetry</span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-500 mb-1">Data Stream</p>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-500'}`} />
                      <p className="text-sm font-semibold text-[#1F2937]">{isConnected ? 'Connected' : 'Retrying'}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-500 mb-1">Last Update</p>
                    <p className="text-sm font-semibold text-[#1F2937]">
                      {latestReading ? format(new Date(latestReading.timestamp), 'MMM d, HH:mm:ss') : '--'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Rainfall', value: latestReading?.rainfallIndicator || 'N/A' },
                    { label: 'Alert Level', value: `Level ${currentAlert?.level ?? 1}` },
                    { label: 'Station', value: latestReading?.deviceStatus || 'Active' },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-lg px-2 py-2 text-center">
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="text-sm font-semibold text-[#1F2937]">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500 mb-2">Current threshold range</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-orange-50 px-3 py-2">
                      <p className="text-[11px] text-gray-500">Current Level</p>
                      <p className="text-sm font-semibold" style={{ color: getAlertColor(currentAlert?.level ?? 1) }}>
                        {currentAlert?.name || 'Monitoring'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[11px] text-gray-500">Safe Baseline</p>
                      <p className="text-sm font-semibold text-[#1F2937]">{alertLevels[0]?.maxWaterLevel ?? '--'} cm max</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </Section>

      {/* ─── COMMUNITY STATS ─── */}
      <Section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-sm tracking-widest text-[#FF6A00] font-medium uppercase mb-3">Our Community</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-4">About Barangay 180</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              A resilient community working together. Our system ensures the safety of every resident through technology and preparedness.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {[
              { icon: Users, label: 'Residents Protected', value: 18802, suffix: '', color: '#3B82F6', bg: 'bg-blue-50' },
              { icon: Droplets, label: 'Monitoring Stations', value: 3, suffix: ' Active', color: '#FF6A00', bg: 'bg-orange-50' },
              { icon: Zap, label: 'Response Time', value: 0, suffix: '', color: '#8B5CF6', bg: 'bg-violet-50', textOverride: 'Real-time' },
              { icon: Shield, label: 'Safety Protocols', value: 4, suffix: ' Levels', color: '#22C55E', bg: 'bg-green-50' },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="group bg-gray-50 hover:bg-white rounded-2xl p-6 border border-transparent hover:border-gray-200 hover:shadow-md transition-all cursor-default"
              >
                <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <stat.icon size={22} style={{ color: stat.color }} />
                </div>
                <h3 className="text-3xl font-bold text-[#1F2937] mb-1">
                  {stat.textOverride ? stat.textOverride : <AnimatedStat end={stat.value} suffix={stat.suffix} />}
                </h3>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ─── FEATURES ─── */}
      <Section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
            >
              <p className="text-sm tracking-widest text-[#FF6A00] font-medium uppercase mb-3">How It Works</p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-5">Comprehensive Protection</h2>
              <p className="text-gray-500 mb-10 leading-relaxed max-w-md">
                Hydro Guard 180 integrates IoT technology with community protocols to ensure rapid response during heavy rainfall and flooding events.
              </p>

              <div className="space-y-5">
                {[
                  { title: 'IoT Water Sensors', desc: 'Real-time water level data collection.', icon: Waves, color: '#3B82F6', bg: 'bg-blue-50' },
                  { title: 'Smart Alert System', desc: 'Automated 4-level warnings based on water thresholds.', icon: Bell, color: '#FF6A00', bg: 'bg-orange-50' },
                  { title: 'Resident Directory', desc: 'Quick access to emergency contacts for all households.', icon: Users, color: '#8B5CF6', bg: 'bg-violet-50' },
                ].map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.15 }}
                    viewport={{ once: true }}
                    className="flex gap-4 p-4 rounded-xl hover:bg-white transition-colors group"
                  >
                    <div className={`flex-shrink-0 w-11 h-11 ${feature.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <feature.icon size={20} style={{ color: feature.color }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#1F2937] mb-0.5">{feature.title}</h4>
                      <p className="text-sm text-gray-500">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right: Photo with overlay */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -inset-6 bg-gradient-to-tr from-[#FF6A00]/10 to-blue-500/10 rounded-[40px] blur-[50px]" />
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <img
                  src={cityHallImage}
                  alt="Lungsod ng Caloocan City Hall"
                  className="w-full h-80 lg:h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#26343A]/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Sensors', value: 'Online', dot: 'bg-green-500' },
                      { label: 'Water', value: `${latestReading?.waterLevel ?? '--'} cm`, dot: 'bg-blue-500' },
                      { label: 'Alerts', value: 'Active', dot: 'bg-[#FF6A00]' },
                    ].map((m) => (
                      <div key={m.label} className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                          <span className="text-[10px] text-gray-300 uppercase">{m.label}</span>
                        </div>
                        <p className="text-sm font-semibold text-white">{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {alertLevels.map((al) => (
                  <div key={al.level} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: al.color }} />
                    <span>Lvl {al.level}: {al.minWaterLevel}–{al.maxWaterLevel === 999 ? '∞' : al.maxWaterLevel} cm</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ─── CTA ─── */}
      <Section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative bg-[#26343A] rounded-3xl p-10 md:p-16 text-center overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#FF6A00] rounded-full blur-[120px] opacity-15" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500 rounded-full blur-[120px] opacity-10" />

            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/15 rounded-full mb-8">
                  <MapPin size={14} className="text-[#FF6A00]" />
                  <span className="text-sm text-gray-300">Barangay 180, Caloocan City</span>
                </div>
              </motion.div>

              <h2 className="text-3xl md:text-5xl font-bold text-white mb-5">Ready to get involved?</h2>
              <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
                Join our community preparedness program and help keep Barangay 180 safe during the rainy season.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/training"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#FF6A00] text-white rounded-xl font-medium hover:bg-[#E55F00] transition-all shadow-lg shadow-orange-500/25"
                >
                  Start Training
                  <ChevronRight size={16} />
                </Link>
                <Link
                  to="/faq"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-[#26343A] rounded-xl font-medium hover:bg-gray-100 transition-colors"
                >
                  Read FAQ
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>
    </div>
  );
}
