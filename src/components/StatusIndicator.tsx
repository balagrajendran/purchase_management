import { motion } from 'motion/react';
import { Wifi, WifiOff, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';

export function StatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Simulate activity indicator
    const interval = setInterval(() => {
      setIsActive(prev => !prev);
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center space-x-2">
      {/* Connection Status */}
      <motion.div
        className="flex items-center space-x-1"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {isOnline ? (
          <motion.div
            className="flex items-center space-x-1 text-green-500"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Wifi className="h-3 w-3" />
            <span className="text-xs hidden sm:block">Online</span>
          </motion.div>
        ) : (
          <motion.div
            className="flex items-center space-x-1 text-red-500"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <WifiOff className="h-3 w-3" />
            <span className="text-xs hidden sm:block">Offline</span>
          </motion.div>
        )}
      </motion.div>

      {/* Activity Indicator */}
      <motion.div
        className="flex items-center space-x-1"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <motion.div
          animate={{
            scale: isActive ? [1, 1.2, 1] : 1,
            opacity: isActive ? [0.5, 1, 0.5] : 0.3
          }}
          transition={{ duration: 0.5 }}
        >
          <Activity className={`h-3 w-3 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
        </motion.div>
        <span className="text-xs text-muted-foreground hidden sm:block">
          {isActive ? 'Active' : 'Idle'}
        </span>
      </motion.div>
    </div>
  );
}