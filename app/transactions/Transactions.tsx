'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter } from 'lucide-react';
import TransactionItem from '@/components/TransactionItem';
import Navbar from '@/components/Navbar';
import { useRouter } from "next/navigation";

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  date: string;
  amount: string;
  status: 'completed' | 'pending' | 'failed';
  description?: string;
}

const Transactions = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/signin");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  useEffect(() => {
    // Replace the mock API fetch with a real fetch from the portfolio endpoint.
    // The portfolio endpoint returns { email, investments, redemptions }
    const fetchhistoryData = () => {
      const email = "jaide@atmax.in"; // adjust as needed
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No JWT token found');
        setIsLoading(false);
        return;
      }
      fetch(`/api/history?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((res) => {
          if (res.status === 401) {
            // Optional: handle expired token
            localStorage.removeItem('token');
            router.push('/signin');
            throw new Error('Unauthorized');
          }
          return res.json();
        })
        .then((data) => {
        
          // Map investments and redemptions to a unified transaction format.
          const investmentTransactions: Transaction[] = data.investments.map((inv: any, index: number) => ({
            id: `inv-${index}-${inv.timestamp}`,
            type: 'deposit',
            date: new Date(inv.timestamp).toLocaleDateString(),
            amount: `$${parseFloat(inv.amount_usd).toFixed(2)}`,
            status: 'completed',
            description: `Investment in ${inv.asset_id}`
          }));

          const redemptionTransactions: Transaction[] = data.redemptions.map((red: any, index: number) => ({
            id: `red-${index}-${red.timestamp}`,
            type: 'withdrawal',
            date: new Date(red.timestamp).toLocaleDateString(),
            amount: `$${parseFloat(red.value_usd).toFixed(2)}`,
            status: 'completed',
            description: `Redemption`
          }));

          // Combine the two arrays and sort by date descending
          const combined = [...investmentTransactions, ...redemptionTransactions].sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });
          setTransactions(combined);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching transaction history:", err);
          setIsLoading(false);
        });
    }
    if (authChecked) fetchhistoryData();
  }, [authChecked]);

  if (!authChecked) return null;

  const filteredTransactions = transactions.filter((tx) => {
    const matchesFilter = filter === 'all' || tx.type === filter;
    const matchesSearch =
      tx.amount.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    return matchesFilter && (searchQuery === '' || matchesSearch);
  });

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  return (
    <div className="min-h-screen pb-20 sm:pb-0 sm:pt-20">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-semibold">Transaction History</h1>
          <p className="text-muted-foreground">View all your deposits and withdrawals</p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-between gap-4 mb-6"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-muted-foreground" />
            <div className="flex overflow-x-auto space-x-1 bg-secondary/50 rounded-full">
              {[
                { value: 'all', label: 'All' },
                { value: 'deposit', label: 'Deposits' },
                { value: 'withdrawal', label: 'Withdrawals' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value as any)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors relative ${
                    filter === option.value
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {filter === option.value && (
                    <motion.div
                      layoutId="filterIndicator"
                      className="absolute inset-0 bg-primary rounded-full"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="neo-card overflow-hidden"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-primary animate-spin" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto bg-secondary/50 rounded-full flex items-center justify-center mb-4">
                <Search size={24} className="text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No transactions found</h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? `No results for "${searchQuery}"`
                  : 'You have no transactions yet'
                }
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredTransactions.map((transaction, index) => (
                <TransactionItem
                  key={transaction.id}
                  type={transaction.type}
                  date={transaction.date}
                  amount={transaction.amount}
                  status={transaction.status}
                  description={transaction.description}
                  index={index}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Transactions;
