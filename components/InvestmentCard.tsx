
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface InvestmentCardProps {
  title: string;
  description: string;
  amount?: string;
  icon?: React.ReactNode;
  to: string;
  delay?: number;
}

const InvestmentCard: React.FC<InvestmentCardProps> = ({ 
  title, 
  description, 
  amount, 
  icon, 
  to,
  delay = 0 
}) => {
  const router = useRouter();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="neo-card group cursor-pointer"
      onClick={() => router.push(to)}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          
          {amount && (
            <div className="text-2xl font-semibold">{amount}</div>
          )}
          
          <div className="flex items-center mt-4 text-primary text-sm font-medium">
            <span>Learn more</span>
            <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </div>
        
        {icon && (
          <div className="w-12 h-12 flex items-center justify-center bg-primary/10 rounded-full text-primary">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default InvestmentCard;
