'use client';
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';
import { ShieldCheck, Settings, Users, BarChart3, RefreshCw } from 'lucide-react';
import AdminCard from '@/components/admin/AdminCard';
import { FundTable, SIPTable, UserTable, TransactionLogTable} from '@/components/admin/AdminTables';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import FundComparisonChart from '@/components/FundComparisonChart';

const AdminDashboard = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [totalUsers, setTotalUsers] = useState('0');
  const [totalFunds, setTotalFunds] = useState('0');
  const [totalSips, setTotalSips] = useState('0');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const fetchBriefData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/brief`);
        const data = await res.json();
        if (!res.ok || data.error) {
          setTotalUsers("Failed get data");
          setTotalFunds("Failed get data");
          setTotalSips("Failed get data");
        }
        else {
          setTotalUsers(data.users);
          setTotalFunds(data.funds);
          setTotalSips(data.sips);
        }
      } catch (err) {
        console.error('❌ Get Brief Error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBriefData();
  }, [status]);

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <div className="min-h-screen pb-20 sm:pt-20">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage platform operations</p>
        </motion.header>

        <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
          <AdminCard icon={<Users />} title="Users" value={isLoading ? 'Loading...' : totalUsers } link="/admin/users" />
          <AdminCard icon={<BarChart3 />} title="Funds" value={isLoading ? 'Loading...' : totalFunds } link="/admin/funds" />
          <AdminCard icon={<ShieldCheck />} title="SIPs Active" value={isLoading ? 'Loading...' : totalSips } link="/admin/sips" />
        </motion.section>

        <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="mb-10">
          <FundComparisonChart />
        </motion.section>

      </div>
    </div>
  );
};

export default AdminDashboard;
