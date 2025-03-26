
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, LineChart, PiggyBank, ClipboardList, User, Menu, X } from 'lucide-react';
import AnimatedLogo from './AnimatedLogo';
import { usePathname } from 'next/navigation';
import Link from 'next/link'

const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  
  // Close mobile menu when changing routes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/dashboard', label: 'Dashboard', icon: LineChart },
    { to: '/investment', label: 'Invest', icon: PiggyBank },
    { to: '/transactions', label: 'History', icon: ClipboardList },
    { to: '/account', label: 'Account', icon: User },
  ];

  return (
    <>
      {/* Desktop Navigation - Fixed at bottom for iOS feel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-[#1A1F2C]/90 backdrop-blur-md border-t border-gray-800">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.to;
            return (
              <Link 
                key={item.to} 
                href={item.to}
                className="relative flex flex-col items-center justify-center w-16 h-16"
              >
                {isActive && (
                  <motion.div
                    layoutId="navIndicator"
                    initial={false}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className="absolute inset-0 w-12 h-12 mx-auto rounded-full bg-primary/20"
                  />
                )}
                <div className={`z-10 flex flex-col items-center justify-center ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                  <item.icon size={24} strokeWidth={2} />
                  <span className="mt-1 text-xs font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop Navigation - Top Bar */}
      <div className="hidden sm:flex fixed top-0 left-0 right-0 z-50 h-16 px-6 items-center justify-between bg-[#1A1F2C]/90 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <AnimatedLogo />
            <span className="font-semibold text-xl tracking-tight text-white">HODL Fund</span>
          </Link>
        </div>
        <nav className="flex items-center space-x-1">
          {navItems.map((item) => {
            const isActive = pathname === item.to;
            return (
              <Link
                key={item.to}
                href={item.to}
                className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 
                ${isActive 
                  ? 'text-primary bg-primary/20' 
                  : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="flex items-center space-x-1">
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Menu Button */}
      <button
        className="fixed top-4 right-4 z-50 sm:hidden bg-[#1A1F2C] rounded-full p-2 shadow-button"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Full Screen Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 sm:hidden bg-[#1A1F2C] flex flex-col items-center justify-center"
          >
            <div className="w-full max-w-sm px-4">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                >
                  <Link
                    href={item.to}
                    className={`flex items-center space-x-4 w-full px-4 py-3 mb-2 rounded-lg ${
                      pathname === item.to
                        ? 'bg-primary/20 text-primary'
                        : 'text-gray-300'
                    }`}
                  >
                    <item.icon size={24} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
