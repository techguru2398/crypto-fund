'use client';
import { ColumnDef } from '@tanstack/react-table';

export type Fund = {
  id: string;
  name: string;
  vault_name: string;
  normal_weight: number[];
  volatile_weight: number[];
};

export const columns: ColumnDef<Fund>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'name',
    header: 'Fund Name',
  },
  {
    accessorKey: 'vault_name',
    header: 'Vault Name',
  },
  {
    id: 'normal_weight',
    header: 'Normal Weights',
    cell: ({ row }) => {
      const fund = row.original;
      return fund.normal_weight.map(w => `${(w * 100).toFixed(1)}%`).join(', ');
    },
  },
  {
    id: 'volatile_weight',
    header: 'Volatile Weights',
    cell: ({ row }) => {
      const fund = row.original;
      return fund.volatile_weight.map(w => `${(w * 100).toFixed(1)}%`).join(', ');
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const fund = row.original;
      return (
        <div className="flex gap-2">
          <button
            className="text-sm text-blue-600 underline"
            onClick={() => alert(`Viewing holdings for ${fund.id}`)}
          >
            Holdings
          </button>
          <button
            className="text-sm text-green-600 underline"
            onClick={() => alert(`Trigger rebalance for ${fund.id}`)}
          >
            Rebalance
          </button>
          <button
            className="text-sm text-muted-foreground underline"
            onClick={() => alert(`Viewing logs for ${fund.id}`)}
          >
            Logs
          </button>
        </div>
      );
    },
  },
];
