import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const threshold = 80;

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current === 0 || window.scrollY > 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;
    
    if (distance > 0) {
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    startY.current = 0;
  };

  const rotation = (pullDistance / threshold) * 360;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {pullDistance > 0 && (
        <motion.div
          className="absolute top-0 left-0 right-0 flex justify-center items-center"
          style={{ height: pullDistance }}
          initial={{ opacity: 0 }}
          animate={{ opacity: pullDistance / threshold }}
        >
          <motion.div
            animate={{ rotate: isRefreshing ? 360 : rotation }}
            transition={{ duration: isRefreshing ? 1 : 0, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
          >
            <RefreshCw className="w-6 h-6 text-slate-400" />
          </motion.div>
        </motion.div>
      )}
      <motion.div
        style={{ transform: `translateY(${pullDistance}px)` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}