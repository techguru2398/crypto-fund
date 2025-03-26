
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface NavValueCardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    percentage: string;
    positive: boolean;
  };
  delay?: number;
}

const NavValueCard: React.FC<NavValueCardProps> = ({ 
  title, 
  value, 
  change,
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="neo-card"
    >
      <div className="flex flex-col">
        <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
        <div className="text-2xl font-semibold mb-3">{value}</div>
        
        {change && (
          <div className={`flex items-center text-sm font-medium ${
            change.positive ? 'text-green-500' : 'text-red-500'
          }`}>
            {change.positive ? (
              <TrendingUp size={16} className="mr-1" />
            ) : (
              <TrendingDown size={16} className="mr-1" />
            )}
            <span>{change.value} ({change.percentage})</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NavValueCard;
