'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { PiggyBank, ArrowRight, CreditCard, Landmark, RefreshCw, BadgeDollarSign, SquareActivity } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useRouter } from "next/navigation";
import { jwtDecode } from 'jwt-decode';
import { Calendar } from '@/components/ui/calendar';
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from '@stripe/stripe-js';
import { useSession, signOut } from 'next-auth/react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { funds } from '@/lib/fund';

// type MyJwtPayload = {
//   id: string;
//   email: string;
//   role: string;
// };

// type EditSipData = {
//   amount: number;
//   frequency: string;
//   status: string;
//   startDate: Date | undefined;
// };
type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);


const Investment = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const initialType = searchParams?.get('type') === 'withdraw' ? 'withdraw' : 'deposit';
  const sessionId = searchParams?.get('session_id');
  
  const [type, setType] = useState<'deposit' | 'withdraw'>(initialType);
  const [amount, setAmount] = useState('');
  const [inputMethod, setInputMethod] = useState<string>('');
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionComplete, setTransactionComplete] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // State to store portfolio data from API
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [showCreateSipModal, setShowCreateSipModal] = useState(false);
  const [showEditSipModal, setShowEditSipModal] = useState(false);
  
  const [sipData, setSipData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [editSipData, setEditSipData] = useState({
    id: 0,
    amount: 0,
    frequency: 'daily',
    status: 'active',
    startDate: undefined as Date | undefined,
    fund_id: funds[0].id,
    payment_method_id: undefined as string | undefined,
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [paymentMethodExist, setPaymentMethodExist] = useState(false);
  const [selectedFund, setSelectedFund] = useState(funds[0].id);
  const { toast } = useToast();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);
  
  useEffect(() => {
    if(sessionId) {
      toast({
        title: "Payment successed",
        description: "Session ID: " + sessionId,
      });
    }
  }, [router, sessionId]);

   // Fetch payment method state on component mount
   useEffect(() => {
    const fetchPaymentMethods = () => {
      fetch(`/api/account/get-payment-method`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then((res) => {
          if (res.status === 401) {
            router.push('/signin');
            return;
          }
          return res.json();
        })
        .then((data) => {
          if(data.error) {
            console.error("Get payment method error :", data.error);
            return;
          }
          setPaymentMethods(data.payment_methods);
        })
        .catch((err) => {
          console.error("Get payment method error:", err);
        });
    }
    if (status === "authenticated") 
      fetchPaymentMethods();
  }, [status, router]); 

  // Fetch portfolio data on component mount (using a hardcoded email for now)
  useEffect(() => {
    const fetchPortfolioData = () => {
      fetch(`/api/portfolio`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then((res) => {
          if (res.status === 401) {
            router.push('/signin');
            return;
          }
          return res.json();
        })
        .then((data) => {
          setPortfolioData(data);
        })
        .catch((err) => {
          console.error("Error fetching portfolio data:", err);
        });
    }
    if (status === "authenticated") 
      fetchPortfolioData();
  }, [status, router]);

  // Fetch Sip data on component mount
  useEffect(() => {
    const fetchSipData = () => {
      fetch(`/api/sip/get-info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then((res) => {
          if (res.status === 401) {
            router.push('/signin');
            return;
          }
          return res.json();
        })
        .then((data) => {
          console.log("length: ", data.length);
          console.log("data: ", data);
          setSipData(data);
        })
        .catch((err) => {
          console.error("Error fetching sip data:", err);
        });
    }
    if (status === "authenticated") 
      fetchSipData();
  }, [status, router]);

  if (status === 'unauthenticated') return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setAmount(value);
  };

  const handleContinue = () => {
    if (step === 1) {
      setStep(2);
    } else {
      setIsSubmitting(true);
      startCheckoutFlow();
    }
  };

  const startCheckoutFlow = async () => {
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination_amount: parseFloat(amount),
          input_method: inputMethod
        }),
      });
      if (res.status === 401) {
        router.push("/signin");   
        return;
      }

      const data = await res.json();
      const stripe = await stripePromise;
      await stripe?.redirectToCheckout({ sessionId: data.id });
  
      setTransactionComplete(true);
    } catch (error) {
      console.error("❌ Onramp Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onShowCreateSipModal = () => {
    setEditSipData({
      id: 0,
      amount: 0,
      frequency: 'daily',
      status: 'active',
      startDate: undefined,
      fund_id: funds[0].id,
      payment_method_id: undefined,
    })
    setShowCreateSipModal(true);
  }

  // const onShowEditSipModal = () => {
  //   setEditSipData({
  //     amount: sipData[0].amount_usd,
  //     frequency: sipData[0].frequency,
  //     status: sipData[0].status,
  //     startDate: sipData[0].next_run,
  //     fund_id: sipData[0].fund_id,
  //     payment_method_id: sipData[0].payment_method_id,
  //   })
  //   setShowEditSipModal(true);
  // }
  
  const formatDate = (str: string) => {
    const date = new Date(str);
    const pad = (n: number) => n.toString().padStart(2, "0");
  
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}:` +
           `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  };

  const createSip = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/sip/create-sip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({data: editSipData}),
      });

      const result = await res.json();
      if (!res.ok || result.success == false){
        console.log("res:", result.error);
        toast({
          title: "Create Sip failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "SIP Created",
        description: "Your SIP has been successfully created.",
      });
      setShowCreateSipModal(false);
      setSipData((prev: any[]) => [...prev, result.data]);
    } catch (err: any) {
      toast({
        title: "Create Sip failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const editSip = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/sip/edit-sip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: editSipData}),
      });

      const result = await res.json();
      if (!res.ok){
        console.log("res:", result.error);
        toast({
          title: "Edit Sip failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "SIP Edited",
        description: "Your SIP has been successfully edited.",
      });
      setShowEditSipModal(false);
      setSipData(result.data);
    } catch (err: any) {
      toast({
        title: "Edit Sip failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelSip = async (sipId) => {
    setLoading(true);
    try {
      const res = await fetch("/api/sip/cancel-sip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sipId: sipId}),
      });

      const result = await res.json();
      if (!res.ok){
        console.log("res:", result.error);
        toast({
          title: "Cancel Sip failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "SIP Cancelled",
        description: "Your SIP has been successfully cancelled.",
      });
      setSipData(result.data);
    } catch (err: any) {
      toast({
        title: "Cancel Sip failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

 



  const resetForm = () => {
    setAmount('');
    setInputMethod('');
    setStep(1);
    setTransactionComplete(false);
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
      {/* <div id="onramp-container" className="w-full min-h-[600px] mt-4" /> */}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-semibold">
              {type === 'deposit' ? 'Invest in Crypto Fund' : 'Withdraw from Crypto Fund'}
            </h1>
            <p className="text-muted-foreground">
              {type === 'deposit' 
                ? 'Add funds to your investment portfolio' 
                : 'Withdraw funds from your investment portfolio'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="fund-select" className="text-sm text-muted-foreground">
              Fund:
            </label>
            <Select value={selectedFund} onValueChange={setSelectedFund}>
              <SelectTrigger id="fund-select" className="w-56">
                <SelectValue placeholder="Select a fund" />
              </SelectTrigger>
              <SelectContent>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    {fund.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.header>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible" 
            className="lg:col-span-8"
          >
            <motion.div variants={itemVariants} className="neo-card mb-6">
              <div className="flex mb-6">
                <button
                  className={`flex-1 py-3 rounded-l-lg ${
                    type === 'deposit'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                  onClick={() => setType('deposit')}
                >
                  Deposit
                </button>
                <button
                  className={`flex-1 py-3 rounded-r-lg ${
                    type === 'withdraw'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                  onClick={() => setType('withdraw')}
                >
                  Withdraw
                </button>
              </div>
              
              {transactionComplete ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center py-8"
                >
                  <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium mb-2">Transaction Successful</h3>
                  <p className="text-muted-foreground mb-6">
                    Your {type === 'deposit' ? 'investment' : 'withdrawal'} of ${amount} has been processed successfully.
                  </p>
                  <button
                    onClick={resetForm}
                    className="flex items-center mx-auto bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Make Another Transaction
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="relative mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-full h-2 bg-secondary rounded-full">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: step === 1 ? '50%' : '100%' }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span className={step >= 1 ? 'text-primary font-medium' : ''}>Input Method</span>
                      <span className={step >= 2 ? 'text-primary font-medium' : ''}>Amount</span>
                    </div>
                  </div>

                  {step === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-medium mb-4">
                        Select your input method
                      </label>
                      
                      <div className="space-y-3 mb-6">
                        {[
                          { id: 'fiat', label: 'Enter the amount of fiat to invest.', icon: <BadgeDollarSign size={20} /> },
                          { id: 'unit', label: 'Enter the number of units to buy.', icon: <SquareActivity size={20} /> },
                        ].map((method) => (
                          <div
                            key={method.id}
                            onClick={() => setInputMethod(method.id)}
                            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                              inputMethod === method.id
                                ? 'border-primary bg-primary/10'
                                : 'border-input hover:bg-secondary/50'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mr-3">
                              {method.icon}
                            </div>
                            <span className="font-medium">{method.label}</span>
                            {inputMethod === method.id && (
                              <div className="ml-auto w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  
                  {step === 2 && ( inputMethod == 'fiat' ? (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-medium mb-2">
                        Enter the amount of fiat to {type === 'deposit' ? 'invest' : 'withdraw'}.
                      </label>
                      <div className="relative mb-6">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500">$</span>
                        </div>
                        <input
                          type="text"
                          value={amount}
                          onChange={handleAmountChange}
                          placeholder="0.00"
                          className="bg-background pl-8 pr-4 py-3 border border-input rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-6">
                        {['100', '500', '1000', '5000'].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setAmount(preset)}
                            className="px-4 py-2 border border-input rounded-lg hover:bg-secondary transition-colors"
                          >
                            ${preset}
                          </button>
                        ))}
                      </div>
                    </motion.div> ) : (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-medium mb-2">
                        Enter the number of units to {type === 'deposit' ? 'buy' : 'sell'}.
                      </label>
                      <div className="relative mb-6">
                        <input
                          type="text"
                          value={amount}
                          onChange={handleAmountChange}
                          placeholder="0"
                          className="bg-background pl-8 pr-4 py-3 border border-input rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-6">
                        {['1', '5', '10', '50'].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setAmount(preset)}
                            className="px-4 py-2 border border-input rounded-lg hover:bg-secondary transition-colors"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </motion.div> )
                  )}
                  
                  
                  <button
                    onClick={handleContinue}
                    disabled={
                      (step === 1 && !inputMethod) ||
                      (step === 2 && (!amount || parseFloat(amount) <= 0)) ||
                      isSubmitting
                    }
                    className="w-full flex items-center justify-center bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="w-5 h-5 rounded-full border-2 border-transparent border-t-white animate-spin mr-2" />
                    ) : null}
                    {step === 1 ? 'Continue' : 'Complete Transaction'}
                    {!isSubmitting && <ArrowRight size={16} className="ml-2" />}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-4"
          >
            {/* <motion.div variants={itemVariants} className="neo-card mb-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3">
                  <PiggyBank size={20} />
                </div>
                <h3 className="text-lg font-medium">Systematic Investment Plan</h3>
              </div>
              
              {sipData ? sipData.length == 0 ? 
                <div>
                  <div className="flex justify-between">
                    <span className="font-medium">There is no plan</span>
                  </div>
                  <div className="border-t border-border my-2 pt-2 flex justify-between">
                    <span className="text-muted-foreground">{paymentMethodExist ? "Card connected" : "Card not connected"}</span>
                  </div>
                  <div className="border-t border-border my-2 pt-2 flex justify-end gap-2">
                    <button
                      className="bg-primary text-primary-foreground px-5 py-1 rounded-lg font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!paymentMethodExist}
                      onClick={onShowCreateSipModal}
                    >
                      Create plan
                    </button>
                  </div>
                </div> : 
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">${sipData[0].amount_usd}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="font-medium">{sipData[0].frequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next run</span>
                    <span className="font-medium">{format(sipData[0].next_run, "yyyy-MM-dd")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">{sipData[0].status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Create Date</span>
                    <span className="font-medium">{format(sipData[0].created_at, "yyyy-MM-dd")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Update Date</span>
                    <span className="font-medium">{format(sipData[0].updated_at, "yyyy-MM-dd")}</span>
                  </div>
                  <div className="border-t border-border my-2 pt-2 flex justify-between">
                    <span className="text-muted-foreground">{paymentMethodExist ? "Card connected" : "Card not connected"}</span>
                  </div>
                  <div className="border-t border-border my-2 pt-2 flex justify-end gap-2">
                    <button
                      className="bg-primary text-primary-foreground px-5 py-1 rounded-lg font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!paymentMethodExist}
                      onClick={onShowEditSipModal}
                    >
                      Edit plan
                    </button>
                    <button
                      className="bg-red-600 text-primary-foreground px-5 py-1 rounded-lg font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!paymentMethodExist}
                      onClick={cancelSip}
                    >
                      Cancel plan
                    </button>
                  </div>
                </div>
                : 
                <div>Loading sip data...</div>
              }
            </motion.div> */}
            <motion.div variants={itemVariants} className="neo-card mb-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3">
                  <PiggyBank size={20} />
                </div>
                <h3 className="text-lg font-medium">Investment Summary</h3>
              </div>
              
              {portfolioData ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current NAV</span>
                    <span className="font-medium">${portfolioData.nav.toFixed(7)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Units</span>
                    <span className="font-medium">{portfolioData.units}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Portfolio Value</span>
                    <span className="font-medium">${portfolioData.value_usd.toLocaleString()}</span>
                  </div>
                  
                  <div className="border-t border-border my-2 pt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Performance (YTD)</span>
                      <span className="text-green-500 font-medium">+10.5%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>Loading portfolio data...</div>
              )}
            </motion.div>
            
            <motion.div variants={itemVariants} className="neo-card space-y-4">
              <h3 className="text-lg font-medium mb-4">Asset Allocation</h3>
              {
                (() => {
                  const selected = funds.find(fund => fund.id === selectedFund);
                  if (!selected) return null;

                  return selected.asset_ids.map((asset, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">{asset}</span>
                        <span>{selected.share[index]}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${selected.share[index]}%` }}
                          transition={{ duration: 1, delay: index * 0.2 }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </div>
                  ));
                })()
              }
            </motion.div>
          </motion.div>
          
        </div>
        <motion.div variants={itemVariants} className="neo-card mb-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Your SIP Plans</h3>
          <button
            onClick={onShowCreateSipModal}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium shadow hover:bg-primary/90"
          >
            + Add SIP
          </button>
        </div>

        {sipData && sipData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Frequency</th>
                  <th className="px-4 py-2 font-medium">Next Run</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Card</th>
                  <th className="px-4 py-2 font-medium">Fund</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                  <th className="px-4 py-2 font-medium">Updated</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sipData.map((sip: any, idx: number) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="px-4 py-2">${sip.amount_usd}</td>
                    <td className="px-4 py-2">{sip.frequency}</td>
                    <td className="px-4 py-2">{format(sip.next_run, "yyyy-MM-dd")}</td>
                    <td className="px-4 py-2 capitalize">{sip.status}</td>
                    <td className="px-4 py-2">
                      {paymentMethods.some((payment) => payment?.id == sip.stripe_payment_method_id) ? (
                        <span className="text-green-600 font-medium">Connected</span>
                      ) : (
                        <span className="text-red-500 font-medium">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{sip.fund_id}</td>
                    <td className="px-4 py-2">{format(sip.created_at, "yyyy-MM-dd")}</td>
                    <td className="px-4 py-2">{format(sip.updated_at, "yyyy-MM-dd")}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button
                        onClick={() => {
                          setEditSipData({
                            id: sip.id,
                            amount: sip.amount_usd,
                            frequency: sip.frequency,
                            status: sip.status,
                            startDate: new Date(sip.next_run),
                            fund_id: sip.fund_id,
                            payment_method_id: sip.stripe_payment_method_id
                          });
                          setShowEditSipModal(true);
                        }}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          cancelSip(sip.id);
                        }}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">You don’t have any SIPs yet.</p>
        )}
      </motion.div>

      </div>
      {showCreateSipModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg p-8 relative">
            <button
              onClick={() => setShowCreateSipModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>

            <h2 className="text-xl font-semibold mb-6">
              Create Systematic Investment Plan
            </h2>
            <div className="w-full rounded-xl border border-muted px-5 py-5">
              <form onSubmit={createSip} className="space-y-6">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium mb-2">
                    Amount
                  </label>
                  <div className="relative mb-6">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <Input
                      type="number"
                      id="amount"
                      name="amount"
                      value={editSipData.amount}
                      onChange={(e) =>
                        setEditSipData({
                          ...editSipData,
                          amount: Number(e.target.value),
                        })
                      }
                      placeholder="Enter amount"
                      required
                      step="0.01"
                      min="0.01"
                      className="bg-background pl-8 pr-4 py-3 border border-input rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fund Index
                  </label>
                  <Select
                    value={editSipData.fund_id}
                    onValueChange={(value) =>
                      setEditSipData({ ...editSipData, fund_id: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a fund" />
                    </SelectTrigger>
                    <SelectContent>
                      {funds.map((fund) => (
                        <SelectItem key={fund.id} value={fund.id}>
                          {fund.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Frequency
                  </label>
                  <Select
                    value={editSipData.frequency}
                    onValueChange={(value) =>
                      setEditSipData({ ...editSipData, frequency: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Payment Method
                  </label>
                  <Select
                    value={editSipData.payment_method_id}
                    onValueChange={(value) =>
                      setEditSipData({ ...editSipData, payment_method_id: value })
                    }
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods?.map((card: any) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.brand.toUpperCase()} •••• {card.last4} — Expires {card.exp_month}/{card.exp_year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    SIP Start Date
                  </label>
                  <Input
                    type="text"
                    // readOnly
                    value={
                      editSipData.startDate
                        ? format(editSipData.startDate, "yyyy-MM-dd")
                        : ""
                    }
                    onChange={(e) =>
                      setEditSipData({
                        ...editSipData,
                        startDate: new Date(e.target.value),
                      })
                    }
                    onClick={() => setShowCalendar(!showCalendar)}
                    placeholder="Select a date"
                    required
                    className="bg-background px-4 py-3 border border-input rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {showCalendar && (
                    <div className="absolute bottom-full mb-2 left-0 z-50 rounded-xl border border-border bg-background shadow-xl">
                      <Calendar
                        mode="single"
                        selected={editSipData.startDate}
                        onSelect={(date) => {
                          setEditSipData({
                            ...editSipData,
                            startDate: date ?? undefined,
                          });
                          setShowCalendar(false);
                        }}
                        fromDate={new Date()}
                        className="rounded-xl p-4"
                      />
                    </div>
                  )}
                </div>

                <div className='pt-6'>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-primary px-6 py-3 text-base font-medium text-white transition duration-300 hover:bg-primary/90"
                  >
                    {loading ? "Creating..." : "Create SIP"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showEditSipModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg p-8 relative">
            <button
              onClick={() => setShowEditSipModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>

            <h2 className="text-xl font-semibold mb-6">
              Edit Systematic Investment Plan
            </h2>
            <div className="w-full rounded-xl border border-muted px-5 py-5">
              <form onSubmit={editSip} className="space-y-6">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium mb-2">
                    Amount
                  </label>
                  <div className="relative mb-6">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <Input
                      type="number"
                      id="amount"
                      name="amount"
                      value={editSipData.amount}
                      onChange={(e) =>
                        setEditSipData({
                          ...editSipData,
                          amount: Number(e.target.value),
                        })
                      }
                      placeholder="Enter amount"
                      required
                      step="0.01"
                      min="0.01"
                      className="bg-background pl-8 pr-4 py-3 border border-input rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fund Index
                  </label>
                  <Select
                    value={editSipData.fund_id}
                    onValueChange={(value) =>
                      setEditSipData({ ...editSipData, fund_id: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a fund" />
                    </SelectTrigger>
                    <SelectContent>
                      {funds.map((fund) => (
                        <SelectItem key={fund.id} value={fund.id}>
                          {fund.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Frequency
                  </label>
                  <Select
                    value={editSipData.frequency}
                    onValueChange={(value) =>
                      setEditSipData({ ...editSipData, frequency: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Payment Method
                  </label>
                  <Select
                    value={editSipData.payment_method_id}
                    onValueChange={(value) =>
                      setEditSipData({ ...editSipData, payment_method_id: value })
                    }
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods?.map((card: any) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.brand.toUpperCase()} •••• {card.last4} — Expires {card.exp_month}/{card.exp_year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status
                  </label>
                  <Select
                    value={editSipData.status}
                    onValueChange={(value) =>
                      setEditSipData({ ...editSipData, status: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    Next run time
                  </label>
                  <Input
                    type="text"
                    // readOnly
                    value={
                      editSipData.startDate
                        ? format(editSipData.startDate, "yyyy-MM-dd")
                        : ""
                    }
                    onChange={(e) =>
                      setEditSipData({
                        ...editSipData,
                        startDate: new Date(e.target.value),
                      })
                    }
                    onClick={() => setShowCalendar(!showCalendar)}
                    placeholder="Select a date"
                    required
                    className="bg-background px-4 py-3 border border-input rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {showCalendar && (
                    <div className="absolute bottom-full mb-2 left-0 z-50 rounded-xl border border-border bg-background shadow-xl">
                      <Calendar
                        mode="single"
                        selected={editSipData.startDate}
                        onSelect={(date) => {
                          setEditSipData({
                            ...editSipData,
                            startDate: date ?? undefined,
                          });
                          setShowCalendar(false);
                        }}
                        fromDate={new Date()}
                        className="rounded-xl p-4"
                      />
                    </div>
                  )}
                </div>

                <div className='pt-6'>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-primary px-6 py-3 text-base font-medium text-white transition duration-300 hover:bg-primary/90"
                  >
                    {loading ? "Editing..." : "Edit SIP"}
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

export default Investment;
