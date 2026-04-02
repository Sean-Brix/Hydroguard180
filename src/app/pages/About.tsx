import { motion, useInView } from 'motion/react';
import {
  MapPin, Users, Heart, Mountain,
  Shield, Zap, Building2, Landmark,
  ChevronRight, Navigation, BarChart3, Baby, ArrowUpRight
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import maplibregl from 'maplibre-gl';
// MapLibre CSS loaded via CDN in /src/styles/fonts.css
import CountUp from 'react-countup';

// Barangay 180 coordinates
const BRGY_LAT = 14.7633;
const BRGY_LNG = 121.0792;

// Animated counter
function AnimatedStat({ end, suffix = '', prefix = '', decimals = 0 }: { end: number; suffix?: string; prefix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <span ref={ref}>
      {isInView ? (
        <CountUp end={end} duration={2.5} separator="," prefix={prefix} suffix={suffix} decimals={decimals} />
      ) : '0'}
    </span>
  );
}

export function About() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [BRGY_LNG, BRGY_LAT],
      zoom: 14,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    // Custom marker
    const markerEl = document.createElement('div');
    markerEl.innerHTML = `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="background:#FF6A00;color:white;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 4px 12px rgba(255,106,0,0.4);">
          Barangay 180
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid #FF6A00;margin-top:-1px;"></div>
        <div style="width:12px;height:12px;background:#FF6A00;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);margin-top:4px;"></div>
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

  const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.42, 0, 0.58, 1] } }, // cubic-bezier for ease-in-out
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── HERO ─── */}
      <section className="relative bg-gradient-to-br from-[#26343A] to-[#1a252a] text-white py-20 lg:py-28 overflow-hidden">
        {/* Ambient effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#FF6A00]/10 rounded-full blur-[150px]"
            animate={{ opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/3 left-1/6 w-[300px] h-[300px] bg-blue-500/8 rounded-full blur-[120px]"
            animate={{ opacity: [0.08, 0.18, 0.08] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-full mb-6"
            >
              <Landmark size={14} className="text-[#FF6A00]" />
              <span className="text-sm text-gray-300">Caloocan City, Metro Manila</span>
            </motion.div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5">
              About <span className="text-[#FF6A00]">Barangay 180</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              A thriving community of over 18,000 residents committed to safety, growth, and innovation through the Hydro Guard 180 system.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── LOCATION & MAP ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm tracking-widest text-[#FF6A00] font-medium uppercase mb-3">Where We Are</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-3">Our Location</h2>
            <p className="text-gray-500 mb-8 max-w-md leading-relaxed">
              Situated in the heart of Caloocan City, Barangay 180 is a densely populated urban community within the National Capital Region.
            </p>

            <div className="space-y-4">
              {[
                {
                  icon: MapPin,
                  color: '#FF6A00',
                  bg: 'bg-orange-50',
                  label: 'Address',
                  value: 'Barangay 180, Caloocan City, NCR, Philippines',
                },
                {
                  icon: Navigation,
                  color: '#3B82F6',
                  bg: 'bg-blue-50',
                  label: 'Coordinates',
                  value: '14.7633° N, 121.0792° E',
                },
                {
                  icon: Mountain,
                  color: '#22C55E',
                  bg: 'bg-green-50',
                  label: 'Elevation',
                  value: '88 meters above sea level',
                },
                {
                  icon: Building2,
                  color: '#8B5CF6',
                  bg: 'bg-violet-50',
                  label: 'District',
                  value: 'North Caloocan, 3rd Congressional District',
                },
              ].map((item, idx) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-white hover:shadow-sm transition-all group"
                >
                  <div className={`flex-shrink-0 w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <item.icon size={20} style={{ color: item.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1F2937] mb-0.5">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* OpenFreeMap */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#FF6A00]/10 to-blue-500/10 rounded-[32px] blur-[40px]" />
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-200/60 bg-white">
              {/* Map container */}
              <div ref={mapContainerRef} className="w-full h-[380px] lg:h-[440px]" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />
              {/* Spacer to maintain parent height */}
              <div className="w-full h-[380px] lg:h-[440px]" />

              {/* Map overlay info bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#26343A]/90 via-[#26343A]/50 to-transparent p-4 pt-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                    <span className="text-sm text-white font-medium">Barangay 180</span>
                  </div>
                  <span className="text-xs text-gray-300 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/15">
                    OpenFreeMap
                  </span>
                </div>
              </div>

              {/* Loading state */}
              {!mapLoaded && (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-[#FF6A00] rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading map...</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── COMMUNITY STATS ─── */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-sm tracking-widest text-[#FF6A00] font-medium uppercase mb-3">Our Community</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-4">Community Profile</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              A dynamic and growing barangay with a young population dedicated to building a safer future together.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14"
          >
            {[
              { icon: Users, label: 'Total Population', value: 18802, suffix: '', desc: 'Census 2020', color: '#FF6A00', bg: 'bg-orange-50' },
              { icon: Heart, label: 'Median Age', value: 24, suffix: ' yrs', desc: 'Young community', color: '#EF4444', bg: 'bg-red-50' },
              { icon: Baby, label: 'Young Dependents', value: 32.39, suffix: '%', desc: 'Aged 0–14 years', color: '#3B82F6', bg: 'bg-blue-50', decimals: 2 },
              { icon: BarChart3, label: 'Dependency Ratio', value: 55, suffix: ':100', desc: 'Dependents per 100 working-age', color: '#22C55E', bg: 'bg-green-50' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="group bg-gray-50 hover:bg-white rounded-2xl p-6 border border-transparent hover:border-gray-200 hover:shadow-md transition-all"
              >
                <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <stat.icon size={22} style={{ color: stat.color }} />
                </div>
                <h3 className="text-3xl font-bold text-[#1F2937] mb-1">
                  <AnimatedStat end={stat.value} suffix={stat.suffix} decimals={stat.decimals ?? 0} />
                </h3>
                <p className="text-sm text-gray-800 font-medium mb-0.5">{stat.label}</p>
                <p className="text-xs text-gray-400">{stat.desc}</p>
              </motion.div>
            ))}
          </motion.div>


        </div>
      </section>

      {/* ─── DEMOGRAPHIC HIGHLIGHTS ─── */}
      <section className="py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <p className="text-sm tracking-widest text-[#FF6A00] font-medium uppercase mb-3">Key Data</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-4">Demographic Highlights</h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {[
              {
                icon: Users,
                color: '#FF6A00',
                bg: 'bg-orange-50',
                borderColor: 'border-l-[#FF6A00]',
                title: 'Dependency Ratio',
                stat: '55 : 100',
                desc: '55 dependents for every 100 working-age individuals, reflecting a community with significant youth and elderly populations requiring community services and safety protocols.',
              },
              {
                icon: Baby,
                color: '#3B82F6',
                bg: 'bg-blue-50',
                borderColor: 'border-l-blue-500',
                title: 'Young Dependents (0–14)',
                stat: '32.39%',
                desc: 'Nearly a third of the population is children, highlighting the critical importance of flood preparedness and evacuation planning for vulnerable young residents.',
              },
              {
                icon: Shield,
                color: '#22C55E',
                bg: 'bg-green-50',
                borderColor: 'border-l-green-500',
                title: 'Flood Risk Awareness',
                stat: '4 Alert Levels',
                desc: 'The Hydro Guard 180 system employs a 4-level alert framework calibrated to real-time water level data, ensuring appropriate response at every flood threshold.',
              },
              {
                icon: Zap,
                color: '#8B5CF6',
                bg: 'bg-violet-50',
                borderColor: 'border-l-violet-500',
                title: 'Emergency Response',
                stat: '~5 min',
                desc: 'Average emergency response time within the barangay, supported by trained volunteers, strategically placed sensors, and a coordinated alert system.',
              },
            ].map((item) => (
              <motion.div
                key={item.title}
                variants={itemVariants}
                className={`bg-white rounded-2xl border border-gray-200/80 border-l-4 ${item.borderColor} shadow-sm hover:shadow-md transition-all p-6`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center`}>
                    <item.icon size={20} style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-[#1F2937]">{item.title}</h3>
                      <span className="text-lg font-bold" style={{ color: item.color }}>{item.stat}</span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── MISSION / COMMITMENT CTA ─── */}
      <section className="py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative bg-[#26343A] rounded-3xl p-10 md:p-16 text-center overflow-hidden"
          >
            {/* Ambient glow */}
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
                  <Shield size={14} className="text-[#FF6A00]" />
                  <span className="text-sm text-gray-300">Our Commitment</span>
                </div>
              </motion.div>

              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Building a <span className="text-[#FF6A00]">Safer</span> Community
              </h2>
              <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                Barangay 180 is dedicated to ensuring the safety and well-being of all residents through innovative
                technology, proactive disaster preparedness, and strong community engagement. Hydro Guard 180 represents
                our commitment to protecting our growing community from flood risks while building resilience for the future.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/training"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#FF6A00] text-white rounded-xl font-medium hover:bg-[#E55F00] transition-all shadow-lg shadow-orange-500/25"
                >
                  Emergency Training
                  <ChevronRight size={16} />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-[#26343A] rounded-xl font-medium hover:bg-gray-100 transition-colors"
                >
                  Contact Us
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}