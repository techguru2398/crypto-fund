'use client';
import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

type Props = {
  kycStatus: string;
  role: string;
  setKycStatus: (value: string) => void;
  setRole: (value: string) => void;
};

export default function UserFilter({ kycStatus, role, setKycStatus, setRole }: Props) {
  return (
    <div className="flex gap-4 items-center">
      <Select value={kycStatus} onValueChange={setKycStatus}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="KYC Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
      </Select>

      <Select value={role} onValueChange={setRole}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="user">User</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
