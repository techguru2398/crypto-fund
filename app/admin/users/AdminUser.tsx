'use client';
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import DataTable from '@/components/DataTable';
import { columns } from '@/components/admin/columns/UserColumns';
import UserFilter from '@/components/admin/filters/UserFilter';

const AdminUsersPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [kycStatus, setKycStatus] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  return (
    <div className="min-h-screen sm:pt-20">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-semibold mb-4">User Accounts</h1>
        <DataTable
          columns={columns}
          fetchUrl={`/api/admin/users?kyc=${kycStatus}&role=${role}`}
          filters={
            <UserFilter
              kycStatus={kycStatus}
              role={role}
              setKycStatus={setKycStatus}
              setRole={setRole}
            />
          }
        />
      </div>
    </div>
  );
};

export default AdminUsersPage;
