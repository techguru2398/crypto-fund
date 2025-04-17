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
  const [activeTab, setActiveTab] = useState('funds');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

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
          <AdminCard icon={<Users />} title="Users" value="345" link="/admin/users" />
          <AdminCard icon={<BarChart3 />} title="Funds" value="$2.5M" link="/admin/funds" />
          <AdminCard icon={<ShieldCheck />} title="SIPs Active" value="128" link="/admin/sips" />
        </motion.section>

        <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="mb-10">
          <FundComparisonChart />
        </motion.section>

        {/* <Tabs defaultValue="funds" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="funds">Funds</TabsTrigger>
            <TabsTrigger value="sips">SIPs</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="funds">
          <h2 className="text-xl font-semibold mb-4">Fund Overview</h2>
          <FundTable />
          </TabsContent>

          <TabsContent value="sips">
          <h2 className="text-xl font-semibold mb-4">Systematic Investment Plans (SIPs)</h2>
          <SIPTable />
          </TabsContent>

          <TabsContent value="users">
          <h2 className="text-xl font-semibold mb-4">Users</h2>
          <UserTable />
          </TabsContent>

          <TabsContent value="logs">
          <h2 className="text-xl font-semibold mb-4">Transaction Logs</h2>
          <TransactionLogTable />
          </TabsContent>
        </Tabs> */}
      </div>
    </div>
  );
};

export default AdminDashboard;
