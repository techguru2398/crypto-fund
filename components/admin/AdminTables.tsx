// This file exports multiple simple table components for your admin dashboard

'use client';
import React from 'react';

const TableWrapper = ({ title, headers, rows }: { title: string, headers: string[], rows: any[][] }) => (
  <div className="neo-card mb-6">
    <h2 className="text-lg font-semibold mb-4">{title}</h2>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="px-4 py-2 border-b font-medium text-muted-foreground">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/20">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2 border-b">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const FundTable = () => (
  <TableWrapper
    title="Funds Overview"
    headers={["ID", "Name", "Total Value", "NAV", "Units"]}
    rows={[["hodl_index", "HODL Index", "$2.5M", "$1.2500000", "2,000,000"], ["eth_index", "ETH Focus", "$1.2M", "$2.0000000", "600,000"]]}
  />
);

export const SIPTable = () => (
  <TableWrapper
    title="Active SIPs"
    headers={["User", "Amount", "Frequency", "Next Run", "Status"]}
    rows={[["alice@example.com", "$100", "Monthly", "2025-05-01", "Active"], ["bob@example.com", "$250", "Weekly", "2025-04-20", "Paused"]]}
  />
);

export const UserTable = () => (
  <TableWrapper
    title="Users"
    headers={["Email", "Role", "KYC Status", "Joined"]}
    rows={[["admin@example.com", "Admin", "Approved", "2024-01-15"], ["user@example.com", "User", "Pending", "2024-03-10"]]}
  />
);

export const TransactionLogTable = () => (
  <TableWrapper
    title="Recent Transactions"
    headers={["User", "Type", "Amount", "Status", "Timestamp"]}
    rows={[["alice@example.com", "Deposit", "$500", "Completed", "2025-04-15 14:32"], ["bob@example.com", "Withdraw", "$200", "Pending", "2025-04-14 09:20"]]}
  />
);
