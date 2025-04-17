'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import DataTable from '@/components/DataTable';
import { sipColumns } from '@/components/admin/columns/SipColumns';
import SipFilter from '@/components/admin/filters/SipFilter';

const AdminSipsPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState('');
  const [fundId, setFundId] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  return (
    <div className="min-h-screen sm:pt-20">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-semibold mb-4">Systematic Investment Plans</h1>
        <DataTable
          columns={sipColumns}
          fetchUrl={`/api/admin/sips?status=${statusFilter}&fund=${fundId}`}
          filters={
            <SipFilter
              status={statusFilter}
              fundId={fundId}
              setStatus={setStatusFilter}
              setFundId={setFundId}
            />
          }
        />
      </div>
    </div>
  );
};

export default AdminSipsPage;
