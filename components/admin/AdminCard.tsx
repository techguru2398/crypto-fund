'use client';
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type AdminCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  link?: string;
  className?: string;
};

const AdminCard: React.FC<AdminCardProps> = ({
  icon,
  title,
  value,
  subtitle,
  link,
  className,
}) => {
  const CardContent = (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'p-5 rounded-xl border border-border bg-background hover:bg-muted/30 transition-colors shadow-sm',
        className
      )}
    >
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-4">
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
          <div className="text-xl font-semibold text-foreground">{value}</div>
        </div>
      </div>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </motion.div>
  );

  return link ? <Link href={link}>{CardContent}</Link> : CardContent;
};

export default AdminCard;
