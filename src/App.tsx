/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Image as ImageIcon, Video, FileArchive } from 'lucide-react';
import { cn } from './lib/utils';
import ImageOptimizer from './components/ImageOptimizer';
import VideoOptimizer from './components/VideoOptimizer';

type Tab = 'images' | 'videos';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('images');

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-orange-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              activeTab === 'images' ? "bg-orange-500" : "bg-blue-500"
            )}>
              {activeTab === 'images' ? (
                <ImageIcon className="text-white w-5 h-5" />
              ) : (
                <Video className="text-white w-5 h-5" />
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight">OptiMedia</h1>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('images')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'images' 
                  ? "bg-white text-orange-600 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <ImageIcon className="w-4 h-4" />
              Imágenes
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'videos' 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Video className="w-4 h-4" />
              Videos
            </button>
          </div>

          <div className="flex items-center gap-4 hidden sm:flex">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">v2.0.0</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {activeTab === 'images' ? <ImageOptimizer /> : <VideoOptimizer />}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-gray-100 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm text-gray-400">
            © 2026 OptiMedia. Herramienta de optimización local.
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Procesamiento 100% Local
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
