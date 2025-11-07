'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {  
  Menu, 
  X, 
  Rocket, 
  Play, 
  Target, 
  BarChart, 
  LayoutDashboard, 
  Code, 
  Users, 
  Star, 
  Check,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoData, setDemoData] = useState([
    { name: 'BTC JAN 2025 $50K+', volume: 'Volume: $2.4M (↑ 340%)' },
    { name: 'ETH Q1 2025 $4K+', volume: 'Volume: $1.8M (↑ 280%)' },
    { name: 'DeFi TVL $100B+', volume: 'Volume: $980K (↑ 420%)' },
    { name: 'ADA 2025 $2+', volume: 'Volume: $650K (↑ 190%)' }
  ]);

  // Header background on scroll
  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('.header');
      if (header) {
        if (window.scrollY > 50) {
          header.classList.add('bg-white/95', 'backdrop-blur-md', 'shadow-sm');
        } else {
          header.classList.remove('bg-white/95', 'backdrop-blur-md', 'shadow-sm');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Live demo simulation
  useEffect(() => {
    const alerts = [
        [
        { name: 'BTC JAN 2025 $50K+', volume: 'Volume: $2.4M (↑ 340%)' },
        { name: 'ETH Q1 2025 $4K+', volume: 'Volume: $1.8M (↑ 280%)' },
        { name: 'DeFi TVL $100B+', volume: 'Volume: $980K (↑ 420%)' },
        { name: 'ADA 2025 $2+', volume: 'Volume: $650K (↑ 190%)' }
        ],
        [
        { name: 'SOL 2025 $500+', volume: 'Volume: $3.1M (↑ 410%)' },
        { name: 'DOT Q1 2025 $50+', volume: 'Volume: $1.2M (↑ 320%)' },
        { name: 'AVAX 2025 $200+', volume: 'Volume: $890K (↑ 270%)' },
        { name: 'LINK 2025 $50+', volume: 'Volume: $720K (↑ 240%)' }
        ],
        [
        { name: 'MATIC 2025 $1+', volume: 'Volume: $1.5M (↑ 380%)' },
        { name: 'UNI Q2 2025 $10+', volume: 'Volume: $950K (↑ 290%)' },
        { name: 'SUSHI 2025 $5+', volume: 'Volume: $780K (↑ 350%)' },
        { name: 'COMP 2025 $100+', volume: 'Volume: $620K (↑ 220%)' }
        ]
    ];

    let index = 0;
    const interval = setInterval(() => {
        setDemoData(alerts[index % alerts.length]);
        index++;
    }, 3000);

    return () => clearInterval(interval);
    }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900 overflow-x-hidden">
      
      <header className="header fixed top-0 left-0 right-0 z-50 bg-white/80 transition-all duration-300">
        <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3 text-2xl font-extrabold text-brand-green-deep">
            <img src="/logo.png" alt="KalshiWhale Logo" className="w-32 h-32" />
          </Link>

          <ul className="hidden md:flex list-none gap-8 items-center">
            <li><a href="#features" className="text-neutral-900 hover:text-brand-green-primary transition-colors font-medium">Features</a></li>
            <li><a href="#how-it-works" className="text-neutral-900 hover:text-brand-green-primary transition-colors font-medium">How It Works</a></li>
            <li>
              <Link href="/dashboard" className="text-neutral-900 hover:text-brand-green-primary transition-colors font-medium">
                Dashboard
              </Link>
            </li>
          </ul>

          <div className="flex gap-4 items-center">
            <Link 
              href="/dashboard" 
              className="px-6 py-3 bg-kalshi-gradient text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all hidden sm:flex items-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[998]"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-4/5 max-w-sm bg-white p-6 z-[999]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end mb-8">
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <ul className="flex flex-col list-none gap-8 items-start">
                <li><a href="#features" className="text-xl font-medium" onClick={() => setMobileMenuOpen(false)}>Features</a></li>
                <li><a href="#how-it-works" className="text-xl font-medium" onClick={() => setMobileMenuOpen(false)}>How It Works</a></li>
                <li>
                  <Link href="/dashboard" className="text-xl font-medium" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/dashboard" 
                    className="mt-4 px-6 py-3 bg-kalshi-gradient text-white rounded-lg font-semibold shadow-lg w-full flex items-center justify-center gap-2"
                  >
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </li>
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Hero Section --- */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-gray-50 to-brand-green-light/20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'url(data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="%231aae6f" fill-opacity="0.03"><circle cx="30" cy="30" r="1"/></g></svg>)'}}></div>
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center relative">
          <div>
            <h1 className="text-5xl lg:text-6xl font-black leading-tight mb-6">
              Track <span className="text-gradient">Crypto Whales</span> in Real-Time
            </h1>
            <p className="text-xl text-neutral-600 mb-8 leading-relaxed">
              Get early signals from prediction markets. Our algorithms detect whale activity, volume surges, and market momentum before others notice. Join professional traders who rely on KalshiWhale for market intelligence.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <Link href="/dashboard" className="px-8 py-4 bg-kalshi-gradient text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5" /> Go to Dashboard
              </Link>
              <a href="#how-it-works" className="px-8 py-4 bg-transparent text-brand-green-deep border-2 border-brand-green-deep rounded-lg font-semibold hover:bg-brand-green-deep hover:text-white transition-all flex items-center gap-2">
                <Play className="w-5 h-5" /> How It Works
              </a>
            </div>

            <div className="flex flex-wrap gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-brand-green-deep">99.9%</div>
                <div className="text-sm text-neutral-500 uppercase tracking-wide">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-brand-green-deep">2min</div>
                <div className="text-sm text-neutral-500 uppercase tracking-wide">Update Rate</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-brand-green-deep">1000+</div>
                <div className="text-sm text-neutral-500 uppercase tracking-wide">Connections</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <motion.div 
              className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-1 hover:rotate-0 transition-transform"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex justify-between items-center mb-5 pb-4 border-b border-gray-200">
                <div className="font-semibold text-neutral-900">Live Whale Alerts</div>
                <div className="flex items-center gap-2 text-brand-green-primary">
                  <div className="w-2 h-2 bg-brand-green-primary rounded-full animate-pulse"></div>
                  Live
                </div>
              </div>

              <AnimatePresence mode="popLayout">
                {demoData.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                  >
                    <div>
                      <div className="font-semibold text-sm text-neutral-900">{item.name}</div>
                      <div className="text-xs text-neutral-600">{item.volume}</div>
                    </div>
                    <div className="bg-brand-green-light text-brand-green-deep px-3 py-1 rounded-full text-xs font-semibold">WHALE ALERT</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- Features Section --- */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">Professional Whale Detection & Market Intelligence</h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Advanced algorithms, real-time data, and professional-grade tools for serious traders.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Target, title: 'Whale Detection System', desc: 'Identify whale activity with our core detection algorithms.', features: ['3x Volume Surge Detection', '15% Odds Flip Monitoring', 'Order Book Imbalance', '$1M+ Trade Alerts'] },
              { icon: BarChart, title: 'Real-Time Intelligence', desc: 'Get instant updates and track market momentum with live data.', features: ['Live WebSocket Streaming', 'Top Market Ranking', 'Historical Trend Analysis', 'Performance Metrics'] },
              { icon: LayoutDashboard, title: 'Professional Dashboard', desc: 'A multi-tab interface built for serious analysis on all devices.', features: ['Multi-Tab Interface', 'Real-Time UI Updates', 'Advanced Filtering', 'Mobile Responsive'] },
              { icon: Code, title: 'Modern Tech Architecture', desc: 'Built on a scalable, high-performance stack for reliability.', features: ['FastAPI Python Backend', 'Next.js 14 Frontend', 'Zustand State Management', 'React Query Data Fetching'] },
              { icon: Users, title: 'Core Use Cases', desc: 'Gain a competitive edge, whether you are a trader or a fund.', features: ['Early Signal Detection', 'Market Momentum Tracking', 'Risk Assessment', 'Competitive Intelligence'] },
              { icon: Star, title: 'Competitive Advantages', desc: 'Our platform is built for speed, accuracy, and a seamless user experience.', features: ['2-Minute Update Cycles', 'Instant WebSocket Alerts', 'Scalable Architecture', 'Professional-Grade UI/UX'] }
            ].map((feature, index) => (
              <div key={index} className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-kalshi-gradient rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-neutral-600 mb-6 leading-relaxed">{feature.desc}</p>
                <ul className="space-y-2">
                  {feature.features.map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-neutral-600">
                      <Check className="w-5 h-5 text-brand-green-primary flex-shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- How It Works Section --- */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">How KalshiWhale Works</h2>
            <p className="text-xl text-neutral-600">From Raw Data to Actionable Signals in 4 Simple Steps</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: 1, title: 'Data Collection', desc: 'Our system ingests data from the Kalshi API every 2 minutes, monitoring volume, odds, and order books.' },
              { step: 2, title: 'AI Analysis', desc: 'Advanced algorithms analyze patterns, detect anomalies, and identify whale activity using our proprietary models.' },
              { step: 3, title: 'Signal Generation', desc: 'When whale activity is confirmed, instant alerts are generated with confidence scores and market context.' },
              { step: 4, title: 'Real-Time Delivery', desc: 'Signals are delivered instantly via WebSocket to your dashboard, ensuring you never miss a market movement.' }
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 bg-kalshi-gradient rounded-full flex items-center justify-center text-3xl font-bold text-white mx-auto mb-6">{step.step}</div>
                <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                <p className="text-neutral-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Stats Section --- */}
      <section className="py-20 bg-kalshi-gradient text-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold mb-4">Trusted by Professional Traders</h2>
          <p className="text-xl mb-16 opacity-90">Our infrastructure is built for enterprise-grade performance.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '1,000+', desc: 'Daily Active Users' },
              { value: '<500ms', desc: 'API Response Time' },
              { value: '99.9%', desc: 'Uptime Guarantee' },
              { value: '2 min', desc: 'Data Update Rate' }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-lg opacity-90">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section id="cta" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold mb-6">Get Your Edge Today</h2>
          <p className="text-xl text-neutral-600 mb-10">
            Stop guessing and start tracking. Access the same institutional-grade intelligence that professional traders use.
          </p>
          <Link 
            href="/dashboard" 
            className="px-10 py-5 bg-kalshi-gradient text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all text-xl flex items-center gap-2 justify-center"
          >
            <LayoutDashboard className="w-6 h-6" /> Go to Dashboard
          </Link>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-neutral-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="border-t border-neutral-700 pt-8 text-center text-neutral-400">
            <p>&copy; {new Date().getFullYear()} KalshiWhale. All rights reserved. Built for serious traders.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}