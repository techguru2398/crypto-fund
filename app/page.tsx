'use client';
import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { motion } from 'framer-motion';
import { TrendingUp, PieChart, ShieldCheck } from 'lucide-react';


export default function Home() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    window.location.href = "/";
  };

  const parallaxValue = scrollPosition * 0.3;
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen overflow-hidden flex flex-col items-center justify-center px-6 text-center">
        <div className="fixed top-4 right-16 flex items-center justify-end gap-4">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="bg-destructive text-white px-8 py-3 rounded-lg font-medium"
            >
              Log Out
            </button>
          ) : (
            <>
              <Link
                href="/signin"
                className="bg-secondary text-secondary-foreground px-8 py-3 rounded-lg font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium shadow-lg"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="z-10 max-w-3xl"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-tight mb-6">
            Invest in crypto with <span className="text-primary">confidence</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
            A professionally managed crypto fund powered by Fireblocks. Simple, secure, and designed for long-term growth.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium shadow-lg"
              >
                View Dashboard
              </motion.button>
            </Link>
            <Link href="/investment">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-secondary text-secondary-foreground px-8 py-3 rounded-lg font-medium"
              >
                Invest Now
              </motion.button>
            </Link>
          </div>
        </motion.div>
        
        {/* Background Elements */}
        <div 
          className="absolute inset-0 -z-10 opacity-20"
          style={{ 
            transform: `translateY(${parallaxValue}px)`,
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(74, 109, 255, 0.2) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(74, 109, 255, 0.2) 0%, transparent 50%)',
          }}
        />
      </section>
      
      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-semibold mb-4">Why Choose Our Fund</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our crypto fund combines expert management with institutional-grade security to help you navigate the complex world of digital assets.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <TrendingUp size={36} />,
                title: "Performance Focused",
                description: "Our professionally managed fund aims to deliver long-term growth through strategic asset allocation."
              },
              {
                icon: <ShieldCheck size={36} />,
                title: "Institutional Security",
                description: "Built on Fireblocks infrastructure, your assets benefit from enterprise-grade security and custody."
              },
              {
                icon: <PieChart size={36} />,
                title: "Optimized Portfolio",
                description: "Our index-based approach provides balanced exposure to the most promising digital assets."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="neo-card flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-medium mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-secondary/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-semibold mb-4">Ready to start investing?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of investors who trust our platform for their crypto investment needs.
            </p>
            <Link href="/investment">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium shadow-lg"
              >
                Get Started
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-8 md:mb-0">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-2">
                  <div className="w-4 h-4 bg-primary rounded-full" />
                </div>
                <span className="text-lg font-semibold">HODL Fund</span>
              </div>
              <p className="text-sm text-muted-foreground">
                A secure, professionally managed crypto investment solution.
              </p>
            </div>
            
            <div className="text-sm text-center md:text-right text-muted-foreground">
              <p>© {new Date().getFullYear()} HODL Fund. All rights reserved.</p>
              <p className="mt-1">
                <Link href="#" className="hover:text-foreground">Terms of Service</Link> • 
                <Link href="#" className="hover:text-foreground ml-2">Privacy Policy</Link>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}