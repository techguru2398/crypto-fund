
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface TransactionItemProps {
  type: 'deposit' | 'withdrawal';
  date: string;
  amount: string;
  status: 'completed' | 'pending' | 'failed';
  description?: string;
  index: number;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ 
  type,
  date,
  amount,
  status,
  description,
  index
}) => {
  const isDeposit = type === 'deposit';
  
  const statusStyles = {
    completed: 'text-green-500 bg-green-500/10',
    pending: 'text-yellow-500 bg-yellow-500/10',
    failed: 'text-red-500 bg-red-500/10',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex items-center p-4 border-b border-border last:border-0"
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
        isDeposit ? 'bg-green-500/10' : 'bg-blue-500/10'
      }`}>
        {isDeposit ? (
          <ArrowDownLeft size={20} className="text-green-500" />
        ) : (
          <ArrowUpRight size={20} className="text-blue-500" />
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium">{isDeposit ? 'Deposit' : 'Withdrawal'}</h4>
            <p className="text-xs text-muted-foreground">{date}</p>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          
          <div className="text-right">
            <div className={`font-semibold ${isDeposit ? 'text-green-500' : 'text-blue-500'}`}>
              {isDeposit ? '+' : '-'}{amount}
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[status]}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TransactionItem;
