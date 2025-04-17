'use client';
import { ColumnDef } from '@tanstack/react-table';

export type SIP = {
  id: number;
  email: string;
  fund_id: string;
  amount_usd: number;
  frequency: string;
  status: string;
  next_run: string;
  created_at: string;
  updated_at: string;
};

export const sipColumns: ColumnDef<SIP>[] = [
  {
    id: 'displayId',
    header: '#',
    cell: (info) => {
      const rowIndex = info.row.index;
      const pageIndex = info.table.options.meta?.page || 1;
      const displayIndex = (pageIndex - 1) * 10 + rowIndex + 1;
      return <span className="text-muted-foreground">{displayIndex}</span>;
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'fund_id',
    header: 'Fund ID',
  },
  {
    accessorKey: 'amount_usd',
    header: 'Amount (USD)',
    cell: ({ getValue }) => `$${parseFloat(getValue() as string).toFixed(2)}`,
  },
  {
    accessorKey: 'frequency',
    header: 'Frequency',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue() as string;
      return (
        <span
          className={`inline-block px-2 py-1 text-xs rounded ${
            status === 'active'
              ? 'bg-green-100 text-green-800'
              : status === 'paused'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {status.toUpperCase()}
        </span>
      );
    },
  },
  {
    accessorKey: 'next_run',
    header: 'Next Run',
    cell: ({ getValue }) => new Date(getValue() as string).toLocaleString(),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
  },
  {
    accessorKey: 'updated_at',
    header: 'Updated',
    cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
  },
];
