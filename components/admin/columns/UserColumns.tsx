'use client';
import { ColumnDef } from '@tanstack/react-table';

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  verified: boolean;
  created_at: string;
};

export const columns: ColumnDef<User>[] = [
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
    accessorKey: 'name',
    header: 'Name',
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ getValue }) => <span>{getValue() as string}</span>,
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ getValue }) => {
      const role = getValue() as string;
      return (
        <span
          className={`inline-block px-2 py-1 text-xs rounded ${
            role === 'admin'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {role}
        </span>
      );
    },
  },
  {
    accessorKey: 'verified',
    header: 'Verified',
    cell: ({ getValue }) => {
      const verified = getValue() as boolean;
      return (
        <span
          className={`inline-block px-2 py-1 text-xs rounded ${
            verified
              ? 'bg-blue-100 text-blue-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {verified ? 'Yes' : 'No'}
        </span>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ getValue }) => {
      const dateStr = getValue() as string;
      const date = new Date(dateStr);
      return <span>{date.toLocaleDateString()}</span>;
    },
  },
];
