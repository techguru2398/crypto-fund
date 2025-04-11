'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Bell, ExternalLink, LogOut, ChevronRight, ShieldCheck, Unlock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useRouter } from "next/navigation";
import KycWidget from '@/components/KycWidget'
import { useSession, signOut } from 'next-auth/react';
import { useToast } from "@/hooks/use-toast";
import PaymentCard from "@/components/paymentCard";
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';


type Account = {
  name: string;
  email: string;
  verified: boolean;
  created_at: string;
  password_hash: string | null;
  payment_methods: Array<any>;
};

const Account = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<'personal' | 'verification' | 'notification' | 'payment_method' | 'sip_setting'>('personal');
  const [kycToken, setKycToken] = useState<string | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [verified, setVerified] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStripePaymentModal, setShowStripePaymentModal] = useState(false);
  const [stripeCustomerClientSecret, setStripeCustomerClientSecret] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();

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
        setCustomerId(data.stripe_customer_id);
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

  const showChangePasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setShowPasswordModal(true);
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({currentPassword: currentPassword, newPassword: newPassword}),
      });

      const result = await res.json();
      if (!res.ok || result.success == false){
        console.log("res:", result.error);
        toast({
          title: "Password change failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Success",
        description: "Password change successful",
      });
      setAccount({
        ...account!,
        password_hash: result.newPassword
      });
      setShowPasswordModal(false);
    } catch (err: any) {
      toast({
        title: "Password change failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getClientSecret = async () => {
    setLoading(true);
    const res = await fetch('/api/stripe/get-client-secret', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
    })
    setLoading(false);
    const data = await res.json();
    setStripeCustomerClientSecret(data.client_secret);
    setCustomerId(data.customerId);
    setShowStripePaymentModal(true);
  }

  const savePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !stripeCustomerClientSecret) return;
    setLoading(true);
    try {
      const result = await stripe.confirmCardSetup(stripeCustomerClientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });
      console.log("payment method: ", result.setupIntent);
      if (result.setupIntent?.payment_method) {
        const res = await fetch('/api/stripe/save-card', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payment_method_id: result.setupIntent.payment_method, customerId: customerId }),
        });
        if (res.status === 401) {
          router.push("/signin");   
          return;
        }
        const data = await res.json();
        if (!res.ok || data.success == false){
          toast({
            title: "Save Card failed",
            description: data.error,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Success",
          description: "Card saved successfully!'",
        });
        setAccount({
          ...account!,
          payment_methods: data.payment_methods
        })
        setShowStripePaymentModal(false);
      } else {
        toast({
          title: "Failed",
          description: result.error?.message || 'Error saving card.',
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeCard = async (paymentMethodId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/remove-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method_id: paymentMethodId, customerId: customerId }),
      });
      if (res.status === 401) {
        router.push("/signin");   
        return;
      }
      const result = await res.json();
      if (!res.ok || result.success == false){
        console.log("res:", result.error);
        toast({
          title: "Remove Card failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Success",
        description: "Your card has been successfully removed.",
      });
      setAccount({
        ...account!,
        payment_methods: result.payment_methods
      })
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
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
          className="flex flex-col sm:flex-row justify-between gap-4 mb-6"
        >
          <div className="flex overflow-x-auto space-x-1 bg-secondary/50 rounded-full">
            {[
              { value: 'personal', label: 'Personal' },
              { value: 'verification', label: 'Verification' },
              { value: 'notification', label: 'Notifications' },
              { value: 'payment_method', label: 'Payment methods' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTab(option.value as any)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors relative ${
                  tab === option.value
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === option.value && (
                  <motion.div
                    layoutId="filterIndicator"
                    className="absolute inset-0 bg-primary rounded-full"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{option.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {tab == 'personal' &&
          <div>
              <motion.div
                variants={containerVariants}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
              >
                <motion.div variants={itemVariants} className="neo-card">
                  <h3 className="text-lg font-medium mb-4">Personal details</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{account?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{account?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member since</span>
                      <span className="font-medium">{account?.created_at.split('T')[0]}</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="neo-card">
                  <div 
                    onClick={showChangePasswordModal}
                    className="flex-1 items-center p-4 border rounded-lg cursor-pointer transition-colors hover:bg-secondary/50"
                  >
                    <h4 className="font-medium">Change password</h4>
                    <p className="text-sm text-muted-foreground">Choose a unique password to protect your account</p>
                  </div>
                </motion.div>
              </motion.div>
              {
                showPasswordModal && 
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
                  <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg p-8 relative">
                    <button
                      onClick={() => setShowPasswordModal(false)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
                    >
                      ✕
                    </button>
        
                    <h2 className="text-xl font-semibold mb-6">
                      Change Password
                    </h2>
                    <div className="w-full rounded-xl border border-muted px-5 py-5">
                      <form onSubmit={changePassword} className="space-y-6">
                        <div className="relative mb-6">
                          { account?.password_hash ?
                            <input
                              type="text"
                              id="currentPassword"
                              name="currentPassword"
                              value={currentPassword}
                              onChange={(e) =>
                                setCurrentPassword(e.target.value)
                              }
                              placeholder="Current password"
                              required
                              className="bg-background pl-8 pr-4 py-3 border border-input rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                            /> : 
                            <input
                              type="text"
                              id="currentPassword"
                              name="currentPassword"
                              value={currentPassword}
                              onChange={(e) =>
                                setCurrentPassword(e.target.value)
                              }
                              placeholder="Current password"
                              className="bg-background pl-8 pr-4 py-3 border border-input rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          }
                        </div>
        
                        <div className="relative mb-6">
                          <input
                            type="text"
                            id="newPassword"
                            name="newPassword"
                            value={newPassword}
                            onChange={(e) =>
                              setNewPassword(e.target.value)
                            }
                            placeholder="New password"
                            required
                            className="bg-background pl-8 pr-4 py-3 border border-input rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div className='pt-6'>
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-md bg-primary px-6 py-3 text-base font-medium text-white transition duration-300 hover:bg-primary/90"
                          >
                            {loading ? "Changing..." : "Change password"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
              </div>
              }
          </div>
        }
        {tab == 'verification' &&
          <div>
              <motion.div
                variants={containerVariants}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
              >
                <motion.div variants={itemVariants} className="neo-card">
                  <h3 className="text-lg font-medium mb-4">Personal verification</h3>
                  <div 
                    className="flex items-center p-4 border rounded-lg transition-colors justify-between pr-6"
                  >
                    <div>
                      <h4 className="font-medium">{account?.name}</h4>
                      <p className="text-sm text-muted-foreground">{verified ? "Your personal identity has been succesfully verified." : "Your personal identity remains unverified."}</p>

                    </div>
                    <div className="ml-auto w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      {
                        verified ?
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          :
                          <button
                            onClick={startKyc}
                            className="bg-primary text-white px-2 py-1 rounded-lg text-sm"
                          >
                            Start
                          </button>
                      }
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="neo-card space-y-3">
                  <h3 className="text-lg font-medium mb-4">Steps to verify your identity</h3>
                  <div 
                    className="flex items-center p-4 border rounded-lg transition-colors"
                  >
                    { verified ? 
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div> :
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5c3.866 0 7 3.134 7 7s-3.134 7-7 7-7-3.134-7-7 3.134-7 7-7z" />
                        </svg>
                      </div>
                    }
                    <div className='pl-5'>
                      <h4 className="font-medium">1. Phone verification</h4>
                      <p className="text-sm text-muted-foreground">Confirm your phone number to help secure your account.</p>
                    </div>
                  </div>
                  <div 
                    className="flex items-center p-4 border rounded-lg transition-colors"
                  >
                    { verified ? 
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div> :
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5c3.866 0 7 3.134 7 7s-3.134 7-7 7-7-3.134-7-7 3.134-7 7-7z" />
                        </svg>
                      </div>
                    }
                    <div className='pl-5'>
                      <h4 className="font-medium">2. Provide identity document</h4>
                      <p className="text-sm text-muted-foreground"> Upload a copy of government-issued ID (like a passport or driver&rsquo;s license) to verify your identity.</p>
                    </div>
                  </div>
                  <div 
                    className="flex items-center p-4 border rounded-lg transition-colors"
                  >
                    { verified ? 
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div> :
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5c3.866 0 7 3.134 7 7s-3.134 7-7 7-7-3.134-7-7 3.134-7 7-7z" />
                        </svg>
                      </div>
                    }
                    <div className='pl-5'>
                      <h4 className="font-medium">3. Perform a liveness check</h4>
                      <p className="text-sm text-muted-foreground">Complete a quick selfie or video to confirm that you&rsquo;re a real person and not using a stolen ID.</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
              {
                showPasswordModal && 
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
                  <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg p-8 relative">
                    <button
                      onClick={() => setShowPasswordModal(false)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
                    >
                      ✕
                    </button>
        
                    <h2 className="text-xl font-semibold mb-6">
                      Change Password
                    </h2>
                    <div className="w-full rounded-xl border border-muted px-5 py-5">
                      <form onSubmit={changePassword} className="space-y-6">
                        <div className="relative mb-6">
                          { account?.password_hash ?
                            <input
                              type="text"
                              id="currentPassword"
                              name="currentPassword"
                              value={currentPassword}
                              onChange={(e) =>
                                setCurrentPassword(e.target.value)
                              }
                              placeholder="Current password"
                              required
                              className="bg-background pl-8 pr-4 py-3 border border-input rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                            /> : 
                            <input
                              type="text"
                              id="currentPassword"
                              name="currentPassword"
                              value={currentPassword}
                              onChange={(e) =>
                                setCurrentPassword(e.target.value)
                              }
                              placeholder="Current password"
                              className="bg-background pl-8 pr-4 py-3 border border-input rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          }
                        </div>
        
                        <div className="relative mb-6">
                          <input
                            type="text"
                            id="newPassword"
                            name="newPassword"
                            value={newPassword}
                            onChange={(e) =>
                              setNewPassword(e.target.value)
                            }
                            placeholder="New password"
                            required
                            className="bg-background pl-8 pr-4 py-3 border border-input rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div className='pt-6'>
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-md bg-primary px-6 py-3 text-base font-medium text-white transition duration-300 hover:bg-primary/90"
                          >
                            {loading ? "Changing..." : "Change password"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
              </div>
              }
          </div>
        }
        {tab == 'notification' &&
          <div>
               <motion.div variants={itemVariants} className="neo-card space-y-3">
                  <div 
                    className="flex items-center p-4 border rounded-lg transition-colors"
                  >
                      <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5c3.866 0 7 3.134 7 7s-3.134 7-7 7-7-3.134-7-7 3.134-7 7-7z" />
                        </svg>
                      </div>
                    <div className='pl-5'>
                      <h4 className="font-medium"> No notification found </h4>
                    </div>
                  </div>
                </motion.div>
          </div>
        }
        {tab == 'payment_method' &&
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="neo-card p-6 mb-8 space-y-4"
            >
              <div className='flex justify-between items-center mb-4'>
                <h3 className="text-lg font-medium">Save payment methods</h3>
                <button
                  onClick={getClientSecret}
                  disabled={loading}
                  className="bg-primary text-primary-foreground px-5 py-1 rounded-lg font-medium shadow-lg"
                >
                  Add payment method
                </button>
              </div>
              <div 
                className="items-center p-4 border rounded-lg transition-colors space-y-4"
              >
                { account?.payment_methods.map((card) => (
                  <PaymentCard 
                    key={card.id}
                    card={{
                      id: card.id,
                      brand: card.brand,
                      exp_month: card.exp_month,
                      exp_year: card.exp_year,
                      last4: card.last4
                    }} 
                    onRemove={removeCard}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        }
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

{showStripePaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg p-8 relative">
            <button
              onClick={() => setShowStripePaymentModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>

            <h2 className="text-xl font-semibold mb-6">
              Set payment method
            </h2>
            <div className="w-full rounded-xl border border-muted px-5 py-5">
              <form onSubmit={savePaymentMethod} className="space-y-6">
                <CardElement />
                <div className='pt-6'>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-primary px-6 py-3 text-base font-medium text-white transition duration-300 hover:bg-primary/90"
                  >
                    {loading ? "Saving..." : "Save Card"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Account;
