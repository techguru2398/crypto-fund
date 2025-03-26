'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, DollarSign, BarChart3 } from 'lucide-react';
import PerformanceChart from '@/components/PerformanceChart';
import NavValueCard from '@/components/NavValueCard';
import Navbar from '@/components/Navbar';

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [navData, setNavData] = useState(null);

  // New state for asset allocations from Fireblocks
  const [assetAllocations, setAssetAllocations] = useState([]);
  const [isAssetLoading, setIsAssetLoading] = useState(true);

  useEffect(() => {
    // Fetch the latest NAV data from the API
    fetch('/api/nav')
      .then((res) => res.json())
      .then((data) => {
        console.log("aaa ", data);
        setNavData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching NAV data:', err);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    // Fetch current asset allocations from Fireblocks API
    fetch('/api/asset-breakdown')
      .then((res) => res.json())
      .then((data) => {
        console.log('Asset allocations:', data.assets);
      
        setAssetAllocations(data.assets);
        //  compute total value of assets
        let totalValue = 0;
        data.assets.forEach((asset) => {
          totalValue += parseFloat(asset.value);
        });
        console.log('Total value:', totalValue);

        //  compute percentage of each asset
        data.assets.forEach((asset) => {
          asset.percentage = ((parseFloat(asset.value) / totalValue) * 100).toFixed(2);
        });


        console.log(data);
        setIsAssetLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching asset allocation:', err);
        setIsAssetLoading(false);
      });
  }, []);

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
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your investment portfolio
          </p>
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
              value={isLoading ? 'Loading...' : navData ? `$${navData.total_value.toLocaleString()}` : ''}
              change={null}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <NavValueCard
              title="NAV per Unit"
              value={isLoading ? 'Loading...' : navData ? `$${navData.nav ? parseFloat(navData.nav).toFixed(7) : ''}` : ''}
              change={null}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <NavValueCard
              title="Your Units"
              value={isLoading ? 'Loading...' : navData?.total_units}
            />
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants} className="mb-8">
          <PerformanceChart height={350} />
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
                {assetAllocations.map((asset, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{asset.name}</span>
                      <span>
                        {asset.percentage}%
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${asset.percentage}%` }}
                        transition={{ duration: 1, delay: index * 0.2 }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="neo-card">
            <h3 className="text-lg font-medium mb-4">Quick Actions</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: <DollarSign size={24} />,
                  title: 'Deposit',
                  desc: 'Add funds to your account',
                  link: '/investment',
                },
                {
                  icon: <Wallet size={24} />,
                  title: 'Withdraw',
                  desc: 'Request a withdrawal',
                  link: '/investment?type=withdraw',
                },
                {
                  icon: <BarChart3 size={24} />,
                  title: 'View Performance',
                  desc: 'See detailed statistics',
                  link: '/dashboard/performance',
                },
              ].map((action, index) => (
                <motion.a
                  key={index}
                  href={action.link}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
                >
                  <div className="flex items-start">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3">
                      {action.icon}
                    </div>
                    <div>
                      <h4 className="font-medium">{action.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {action.desc}
                      </p>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
