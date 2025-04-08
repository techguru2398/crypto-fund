'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Bell, ExternalLink, LogOut, ChevronRight, ShieldCheck, Unlock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useRouter } from "next/navigation";
import KycWidget from '@/components/KycWidget'
import { useSession, signOut } from 'next-auth/react';

type Account = {
  name: string;
  email: string;
  verified: boolean;
  createdAt: string;
};

const Account = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [kycToken, setKycToken] = useState<string | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [verified, setVerified] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try{
        const res = await fetch(`/api/account`);
        if (res.status === 401) {
          router.push('/signin');
          return;
        }
        const data = await res.json();
        console.log("account :", data);
        setAccount(data);
        setVerified(data.verified);
      } catch (err) {
        console.error('Error fetching user data:', err);
      } 
    }
    if (status === "authenticated") {
      fetchUserInfo();
    }
  }, [status, router]);

  const startKyc = async () => {

    const res = await fetch('/api/kyc/token', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
    })
    if (res.status === 401) {
      router.push("/signin");
      return;
    }
    const data = await res.json();
    if (!res.ok || data.success == false){
      console.log("res:", data.error);
      return;
    }
    console.log("token : ", data);
    setKycToken(data.token)
    setShowKycModal(true);
  }
  
  const handleLogout = () => {
    console.log('Logout clicked');
    signOut(); 
    // router.push("/signin");
  };

  const onVerified = async () => {
    try {
      const res = await fetch("/api/kyc/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await res.json();

      if(result.success){
        setVerified(true);
      }
    } catch (err: any) {
    } 
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

  if (status === 'unauthenticated') return null;

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
              <h2 className="text-2xl font-semibold">{account?.name}</h2>
              <p className="text-muted-foreground">{account?.email}</p>
              <p className="text-sm text-muted-foreground mt-1">Member since {account?.createdAt}</p>
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
                subtitle: account?.email,
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
                subtitle: 'Enabled',
                action: (
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={true}
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
                icon: verified ? <Unlock size={20} /> : <Lock size={20} />, 
                title: 'KYC status', 
                subtitle: verified ? 'Verified' : 'Not verified',
                action: !verified && (
                  <div className="group cursor-pointer" onClick={startKyc}>
                    <ChevronRight
                      size={18}
                      className="text-muted-foreground group-hover:text-white transition-colors"
                    />
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

      {showKycModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-xl shadow-xl max-w-4xl w-full relative overflow-hidden">
            <button
              onClick={() => setShowKycModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>
            <KycWidget 
              accessToken={kycToken!} 
              applicantEmail={account?.email as string} 
              applicantPhone="" 
              onVerified={onVerified}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default Account;
