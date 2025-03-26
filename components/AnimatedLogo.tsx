
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const AnimatedLogo: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    
    // Reset animation on hover
    const resetAnimation = () => {
      const paths = svg.querySelectorAll('path');
      paths.forEach((path) => {
        path.style.animation = 'none';
        // Force reflow with a safer method
        void path.getBoundingClientRect();
        path.style.animation = '';
      });
    };

    svg.addEventListener('mouseenter', resetAnimation);
    return () => {
      svg?.removeEventListener('mouseenter', resetAnimation);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-12 h-12 flex items-center justify-center"
    >
      <svg 
        ref={svgRef}
        width="48" 
        height="48" 
        viewBox="0 0 48 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <circle 
          cx="24" 
          cy="24" 
          r="22" 
          className="fill-primary/10 stroke-primary" 
          strokeWidth="2"
          strokeDasharray="138.2"
          strokeDashoffset="138.2"
          style={{
            animation: 'dash 1.5s ease-in-out forwards',
          }}
        />
        <path 
          d="M16 24L21 29L32 18" 
          className="stroke-primary" 
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="30"
          strokeDashoffset="30"
          style={{
            animation: 'dash 0.8s ease-in-out forwards 0.6s',
          }}
        />
        <style>{`
          @keyframes dash {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>
      </svg>
    </motion.div>
  );
};

export default AnimatedLogo;
