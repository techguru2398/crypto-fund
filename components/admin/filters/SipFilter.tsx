'use client';
import React from 'react';
import { funds } from '@/lib/fund';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const statuses = ['all', 'active', 'paused', 'cancelled'];

const SipFilter = ({
  status,
  fundId,
  setStatus,
  setFundId,
}: {
  status: string;
  fundId: string;
  setStatus: (val: string) => void;
  setFundId: (val: string) => void;
}) => {
  return (
    <div className="flex gap-4">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>
              {s.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={fundId} onValueChange={setFundId}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Fund" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem key="all" value="all">
              ALL
            </SelectItem>
          {funds.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SipFilter;
