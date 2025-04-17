'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, DollarSign, BarChart3 } from 'lucide-react';
import PerformanceChart from '@/components/PerformanceChart';
import NavValueCard from '@/components/NavValueCard';
import Navbar from '@/components/Navbar';
import { useRouter } from "next/navigation";
import { useSession, signOut } from 'next-auth/react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { funds } from '@/lib/fund';
import { NavButtonLabel } from 'react-day-picker';
import { useToast } from "@/hooks/use-toast";

const AdminFundsPage = () => {
  type NavData = {
    total_value: string;
    nav: string;
    total_units: string;
  };
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [navData, setNavData] = useState<NavData | null>(null);

  // New state for asset allocations from Fireblocks
  const [assetAllocations, setAssetAllocations] = useState<any>([]);
  const [isAssetLoading, setIsAssetLoading] = useState(true);
  const [selectedFund, setSelectedFund] = useState(funds[0].id);
  const [vix, setVix] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  // Fetch NAV data
  useEffect(() => {
    if (status !== 'authenticated') return;
    setIsLoading(true);
    const fetchNav = async () => {
      try {
        const res = await fetch(`/api/nav?fundId=${selectedFund}`);
        const data = await res.json();
        if (!res.ok || data.error) 
          setNavData(null);
        else
          setNavData(data);
      } catch (err) {
        console.error('❌ NAV Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNav();
  }, [status, selectedFund]);

  // Fetch asset breakdown
  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchAssets = async () => {
      try {
        const res = await fetch('/api/asset-breakdown');
        if (!res.ok) throw new Error('Failed to fetch assets');
        const data = await res.json();

        let totalValue = 0;
        data.assets.forEach((a) => {
          totalValue += parseFloat(a.value);
        });

        data.assets.forEach((a) => {
          a.percentage = ((parseFloat(a.value) / totalValue) * 100).toFixed(2);
        });

        setAssetAllocations(data.assets);
      } catch (err) {
        console.error('❌ Asset error:', err);
      } finally {
        setIsAssetLoading(false);
      }
    };

    fetchAssets();
  }, [status]);

  useEffect(() => {
    handleRefreshVIX();
  }, [status]);
  
  // Animation variants for Framer Motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const handleRefreshVIX = async () => {
    try {
      const res = await fetch('/api/vix');
      const vix = await res.json();
      setVix(vix);
    } catch (err) {
      console.error('❌ Failed to fetch VIX:', err);
    }
  };

  const handleRebalance = async () => {
    try {
      const res = await fetch(`/api/admin/rebalance?fundId=${selectedFund}`, {
        method: 'POST',
      });
      const result = await res.json();
      if (!res.ok || result.error){
        console.log("res:", result.error);
        toast({
          title: "Rebalance failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Success",
        description: "Rebalance triggered",
      });
    } catch (err) {
      console.error('❌ Error triggering rebalance:', err);
      toast({
        title: "Rebalance failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };
  
  const handleExportLedgerCSV = () => {
    window.open(`/api/admin/export-ledger?fundId=${selectedFund}`, '_blank');
  };
  
  const handleExportNavCSV = () => {
    window.open(`/api/admin/export-nav?fundId=${selectedFund}`, '_blank');
  };

  return (
    <div className="min-h-screen pb-20 sm:pb-0 sm:pt-20">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-semibold">Funds</h1>
            <p className="text-muted-foreground">Overview of portfolio</p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="fund-select" className="text-sm text-muted-foreground">
              Fund:
            </label>
            <Select value={selectedFund} onValueChange={setSelectedFund}>
              <SelectTrigger id="fund-select" className="w-56">
                <SelectValue placeholder="Select a fund" />
              </SelectTrigger>
              <SelectContent>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    {fund.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.header>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <motion.div variants={itemVariants}>
            <NavValueCard
              title="Total Value"
              value={isLoading ? 'Loading...' : navData ? `$${parseFloat(navData.total_value).toFixed(7)}` : 'No data'}
              change={undefined}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <NavValueCard
              title="NAV per Unit"
              value={isLoading ? 'Loading...' : navData ? `$${parseFloat(navData.nav).toFixed(7)}` : 'No data'}
              change={undefined}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <NavValueCard
              title="Total Units"
              value={isLoading ? 'Loading...' : navData ? `$${parseFloat(navData.total_units).toFixed(7)}` : 'No data'}
              change={undefined}
            />
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants} className="mb-8">
          <PerformanceChart height={350} fundId={selectedFund} />
        </motion.div>

        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          <motion.div variants={itemVariants} className="neo-card">
            <h3 className="text-lg font-medium mb-4">Asset Allocation</h3>
            {isAssetLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {
                  (() => {
                    const selected = funds.find(fund => fund.id === selectedFund);
                    if (!selected) return null;

                    return selected.asset_ids.map((asset, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium">{asset}</span>
                          <span>{selected.normal_weight[index] * 100}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${selected.normal_weight[index] * 100}%` }}
                            transition={{ duration: 1, delay: index * 0.2 }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                      </div>
                    ));
                  })()
                }
                
              </div>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="neo-card">
          <h3 className="text-lg font-medium mb-4">Actions</h3>

<div className="space-y-4">
  {/* VIX Display + Refresh */}
  <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground">VIX (Volatility Index)</span>
    <div className="flex items-center gap-2">
      <span className="font-semibold">{vix !== null ? vix.toFixed(2) : '...'}</span>
      <button
        onClick={handleRefreshVIX}
        className="text-xs text-primary hover:underline"
      >
        Refresh
      </button>
    </div>
  </div>

  {/* Force Rebalance */}
  <button
    onClick={handleRebalance}
    className="w-full px-4 py-2 bg-primary text-white text-sm rounded hover:bg-primary/90 transition"
  >
    Force Rebalance
  </button>

  {/* CSV Exports */}
  <div className="space-y-2">
    <button
      onClick={handleExportLedgerCSV}
      className="w-full px-4 py-2 border text-sm rounded hover:bg-accent"
    >
      Export Ledger CSV
    </button>
    <button
      onClick={handleExportNavCSV}
      className="w-full px-4 py-2 border text-sm rounded hover:bg-accent"
    >
      Export NAV History CSV
    </button>
  </div>
</div>

          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminFundsPage;
