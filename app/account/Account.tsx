'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Bell, ExternalLink, LogOut, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useRouter } from "next/navigation";

const Account = () => {
  const router = useRouter();
  const [user] = useState({
    name: 'Alex Johnson',
    email: 'alex@example.com',
    createdAt: 'January 2023',
    notificationsEnabled: true
  });
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/signin");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  if (!authChecked) return null;
  
  const handleLogout = () => {
    console.log('Logout clicked');
    localStorage.removeItem("token"); // clear expired token
    router.push("/signin");
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <div className="min-h-screen pb-20 sm:pb-0 sm:pt-20">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-semibold">Account</h1>
          <p className="text-muted-foreground">Manage your profile and preferences</p>
        </motion.header>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="neo-card p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <User size={36} />
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-semibold">{user.name}</h2>
              <p className="text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground mt-1">Member since {user.createdAt}</p>
            </div>
            
            <div>
              <button className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium">
                Edit Profile
              </button>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          <motion.div variants={itemVariants} className="space-y-4">
            <h3 className="text-lg font-medium mb-4">Account Settings</h3>
            
            {[
              { 
                icon: <Mail size={20} />, 
                title: 'Email Address', 
                subtitle: user.email,
                action: <ChevronRight size={18} className="text-muted-foreground" /> 
              },
              { 
                icon: <Lock size={20} />, 
                title: 'Password', 
                subtitle: '••••••••',
                action: <ChevronRight size={18} className="text-muted-foreground" /> 
              },
              { 
                icon: <Bell size={20} />, 
                title: 'Notifications', 
                subtitle: user.notificationsEnabled ? 'Enabled' : 'Disabled',
                action: (
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={user.notificationsEnabled}
                      onChange={() => {}}
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                  </div>
                )
              },
            ].map((item, index) => (
              <div 
                key={index}
                className="neo-card p-4 flex items-center"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mr-4">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                </div>
                <div>
                  {item.action}
                </div>
              </div>
            ))}
          </motion.div>
          
          <motion.div variants={itemVariants} className="space-y-4">
            <h3 className="text-lg font-medium mb-4">Security & Legal</h3>
            
            {[
              { 
                icon: <ExternalLink size={20} />, 
                title: 'Connected Services', 
                subtitle: 'Manage third-party integrations',
                action: <ChevronRight size={18} className="text-muted-foreground" /> 
              },
              { 
                icon: <Lock size={20} />, 
                title: 'Two-Factor Authentication', 
                subtitle: 'Not enabled',
                action: <ChevronRight size={18} className="text-muted-foreground" /> 
              },
            ].map((item, index) => (
              <div 
                key={index}
                className="neo-card p-4 flex items-center"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mr-4">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                </div>
                <div>
                  {item.action}
                </div>
              </div>
            ))}
            
            <div className="mt-8">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center py-3 px-4 border border-red-300 text-red-500 rounded-lg font-medium hover:bg-red-50 transition-colors"
              >
                <LogOut size={18} className="mr-2" />
                Log Out
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Account;
