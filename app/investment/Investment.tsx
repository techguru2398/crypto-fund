'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { PiggyBank, ArrowRight, CreditCard, Landmark, RefreshCw } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { loadStripeOnramp } from '@stripe/crypto'; // Import loadStripeOnramp from Stripe
import { useRouter } from "next/navigation";


const Investment = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') === 'withdraw' ? 'withdraw' : 'deposit';
  
  const [type, setType] = useState<'deposit' | 'withdraw'>(initialType);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionComplete, setTransactionComplete] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // State to store portfolio data from API
  const [portfolioData, setPortfolioData] = useState(null);
  const [showOnrampModal, setShowOnrampModal] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/signin");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  // Fetch portfolio data on component mount (using a hardcoded email for now)
  useEffect(() => {
    const fetchPortfolioData = () => {
      const email = "jaide@atmax.in"; // adjust as needed
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No JWT token found');
        return;
      }
      fetch(`/api/portfolio?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((res) => {
          if (res.status === 401) {
            // Optional: handle expired token
            localStorage.removeItem('token');
            router.push('/signin');
            throw new Error('Unauthorized');
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
    if (authChecked) fetchPortfolioData();
  }, [authChecked]);

  if (!authChecked) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setAmount(value);
  };

  const handleContinue = () => {
    if (step === 1) {
      setStep(2);
    } else {
      setIsSubmitting(true);
      startOnrampFlow();
    }
  };

  const startOnrampFlow = async () => {
    try {
      // 1. Fetch the client secret from your backend
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn('No JWT token found');
        setIsSubmitting(false);
        return;
      }
      const res = await fetch("/api/create-onramp-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          transaction_details: {
            destination_currency: "usdc",
            destination_exchange_amount: parseFloat(amount) * 100, // Use actual amount input
            destination_network: "ethereum", // or 'ethereum'
          },
        }),
      });
      if (res.status === 401) {
        localStorage.removeItem("token"); // clear expired token
        router.push("/signin");           // redirect
        return;
      }
      const data = await res.json();
      const clientSecret = data.client_secret;
  
      if (!clientSecret) {
        throw new Error("Client secret not returned from server.");
      }
  
      // 2. Load Stripe Onramp
      const onramp = await loadStripeOnramp("pk_test_51OlfUEH2M8Zi7WwPb0afyP5uLG49OCDUOgeEzJLi0iDovjh4a4aW3neAtqlGwacDCqlwIV2IwlVE4rgvHR4cqnyV00ihUStLBF");
  
      // 3. Get container
      setShowOnrampModal(true); // <-- Trigger modal open before mount
      
      // 4. Create and mount session
      setTimeout(async () => {
        const container = document.getElementById("onramp-container");
        if (!container) throw new Error("Onramp container not found");
        container.innerHTML = "";
  
        const session = await onramp.createSession({
          clientSecret,
          appearance: {
            theme: "dark",
          },
        });

        
  
      session.mount(container); // Attach to DOM
      }
      , 1000);
  
      setTransactionComplete(true);
    } catch (error) {
      console.error("❌ Onramp Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  


  const resetForm = () => {
    setAmount('');
    setPaymentMethod('');
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
          className="mb-8"
        >
          <h1 className="text-3xl font-semibold">
            {type === 'deposit' ? 'Invest in Crypto Fund' : 'Withdraw from Crypto Fund'}
          </h1>
          <p className="text-muted-foreground">
            {type === 'deposit' 
              ? 'Add funds to your investment portfolio' 
              : 'Withdraw funds from your investment portfolio'}
          </p>
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
                      <span className={step >= 1 ? 'text-primary font-medium' : ''}>Amount</span>
                      <span className={step >= 2 ? 'text-primary font-medium' : ''}>Payment Method</span>
                    </div>
                  </div>
                  
                  {step === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-medium mb-2">
                        Enter {type === 'deposit' ? 'investment' : 'withdrawal'} amount
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
                    </motion.div>
                  )}
                  
                  {step === 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-medium mb-4">
                        Select payment method
                      </label>
                      
                      <div className="space-y-3 mb-6">
                        {[
                          { id: 'card', label: 'Credit/Debit Card', icon: <CreditCard size={20} /> },
                          { id: 'bank', label: 'Bank Transfer', icon: <Landmark size={20} /> },
                        ].map((method) => (
                          <div
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id)}
                            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                              paymentMethod === method.id
                                ? 'border-primary bg-primary/10'
                                : 'border-input hover:bg-secondary/50'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mr-3">
                              {method.icon}
                            </div>
                            <span className="font-medium">{method.label}</span>
                            {paymentMethod === method.id && (
                              <div className="ml-auto w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="p-4 bg-secondary/50 rounded-lg mb-6">
                        <div className="flex justify-between mb-2">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-medium">${amount}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-muted-foreground">Fee</span>
                          <span className="font-medium">$0.00</span>
                        </div>
                        <div className="border-t border-border my-2 pt-2">
                          <div className="flex justify-between">
                            <span className="font-medium">Total</span>
                            <span className="font-medium">${amount}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <button
                    onClick={handleContinue}
                    disabled={
                      (step === 1 && (!amount || parseFloat(amount) <= 0)) ||
                      (step === 2 && !paymentMethod) ||
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
            
            <motion.div variants={itemVariants} className="neo-card">
              <h3 className="text-lg font-medium mb-4">Asset Allocation</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">BTC_TEST</span>
                    <span>50%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '50%' }} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">LTC_TEST</span>
                    <span>50%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: '50%' }} />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
      {showOnrampModal && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-background rounded-2xl shadow-xl max-w-md w-full p-6 relative">
      <button
        onClick={() => setShowOnrampModal(false)}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
      >
        ✕
      </button>
      <h2 className="text-lg font-semibold mb-4">Complete your payment</h2>
      <div id="onramp-container" className="w-full h-[600px] overflow-hidden rounded-xl border border-muted" />
    </div>
  </div>
)}


    </div>
  );
};

export default Investment;
