import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Volume2, VolumeX } from 'lucide-react';
import { alertLevelsAPI } from '../utils/api';
import { toast } from 'sonner';

export function AlertSystem() {
  const [alertLevel, setAlertLevel] = useState<any>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchCurrentAlertLevel = async () => {
      try {
        const current = await alertLevelsAPI.getCurrent();
        // Only trigger for Warning (3) or Danger (4)
        if (current && current.level >= 3) {
          if (alertLevel?.level !== current.level) {
            setAlertLevel(current);
            setAcknowledged(false);
            // Play sound if enabled
            if (audioEnabled && audioRef.current) {
              audioRef.current.play().catch(e => console.log('Audio play failed:', e));
            }
          }
        } else {
          setAlertLevel(null);
        }
      } catch (error) {
        console.error('Failed to fetch current alert level:', error);
      }
    };

    // Check alert level every 5 seconds
    const interval = setInterval(() => {
      fetchCurrentAlertLevel();
    }, 5000);

    fetchCurrentAlertLevel();

    return () => clearInterval(interval);
  }, [alertLevel, audioEnabled]);

  const handleAcknowledge = () => {
    setAcknowledged(true);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    if (!audioEnabled) {
      toast.success('Audio alerts enabled');
    } else {
      toast.info('Audio alerts disabled');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  };

  if (!alertLevel || acknowledged) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <div className={`bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border-t-8 ${alertLevel.level === 4 ? 'border-red-600' : 'border-orange-500'}`}>
          <div className={`p-6 ${alertLevel.level === 4 ? 'bg-red-50' : 'bg-orange-50'}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${alertLevel.level === 4 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                  <AlertTriangle size={32} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {alertLevel.level === 4 ? 'CRITICAL ALERT' : 'FLOOD WARNING'}
                  </h2>
                  <p className="font-medium text-gray-700">Level {alertLevel.level}: {alertLevel.name}</p>
                </div>
              </div>
              <button 
                onClick={handleAcknowledge}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <p className="text-lg text-gray-800 mb-6 leading-relaxed">
              {alertLevel.description}
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Required Action:</h3>
              <p className="text-gray-700 font-medium">
                {alertLevel.protocols?.[0] || "Evacuate immediately to designated safe zones."}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAcknowledge}
                className={`flex-1 py-3 px-6 rounded-lg font-bold text-white shadow-lg transition-transform active:scale-95 ${
                  alertLevel.level === 4 
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' 
                    : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30'
                }`}
              >
                Acknowledge Warning
              </button>
              
              <button
                onClick={toggleAudio}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                title={audioEnabled ? "Mute Alarm" : "Enable Alarm Sound"}
              >
                {audioEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Hidden Audio Element */}
        <audio ref={audioRef} loop>
          <source src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" type="audio/mpeg" />
        </audio>
      </motion.div>
    </AnimatePresence>
  );
}
