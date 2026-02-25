/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Camera, 
  MapPin, 
  Play, 
  Square, 
  History, 
  Settings,
  Navigation,
  Clock,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LogEntry {
  id: string;
  timestamp: string;
  status: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export default function App() {
  const [piIp, setPiIp] = useState<string>('192.168.1.100'); // Default placeholder
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [crackStatus, setCrackStatus] = useState<string>('Initializing...');
  const [crackDetected, setCrackDetected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
    distance: 0,
    scanTime: 0,
    crackCount: 0,
    battery: 85,
    speed: 0
  });
  const [gps, setGps] = useState({
    lat: '28.6139° N',
    lng: '77.2090° E'
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for crack status
  const [isMockMode, setIsMockMode] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const pollStatus = async () => {
      if (isMockMode) {
        const isCrack = Math.random() > 0.9;
        setCrackStatus(isCrack ? 'CRACK DETECTED!' : 'All Clear');
        if (isCrack && !crackDetected) {
          addLog('Mock: Crack detected!', 'error');
          setStats(prev => ({ ...prev, crackCount: prev.crackCount + 1 }));
        }
        setCrackDetected(isCrack);
        return;
      }

      try {
        // Try /status JSON endpoint first (recommended), fallback to / HTML
        let isCrack = false;
        try {
          const statusRes = await fetch(`http://${piIp}:5000/status`, { mode: 'cors' });
          if (statusRes.ok) {
            const data = await statusRes.json();
            isCrack = data.crack_status?.toLowerCase().includes('crack detected');
          } else {
            throw new Error('No status endpoint');
          }
        } catch {
          const rootRes = await fetch(`http://${piIp}:5000/`, { mode: 'cors' });
          const text = await rootRes.text();
          isCrack = text.toLowerCase().includes('crack detected');
        }

        setCrackStatus(isCrack ? 'CRACK DETECTED!' : 'All Clear');
        
        if (isCrack && !crackDetected) {
          addLog('Crack detected at current coordinates!', 'error');
          setStats(prev => ({ ...prev, crackCount: prev.crackCount + 1 }));
        }
        setCrackDetected(isCrack);
      } catch (error) {
        console.error('Failed to fetch status:', error);
        setCrackStatus('Connection Error');
      }
    };

    const interval = setInterval(() => {
      if (isScanning) {
        pollStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [piIp, isScanning, crackDetected]);

  // Simulation for stats
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning) {
      interval = setInterval(() => {
        setStats(prev => ({
          ...prev,
          distance: +(prev.distance + 0.05).toFixed(2),
          scanTime: prev.scanTime + 1,
          speed: 1.2 + Math.random() * 0.3
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const addLog = (status: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      status,
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const toggleScan = () => {
    const nextState = !isScanning;
    setIsScanning(nextState);
    addLog(nextState ? 'Scan started' : 'Scan stopped', nextState ? 'success' : 'warning');
    if (!nextState) setStats(prev => ({ ...prev, speed: 0 }));
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">TrackGuard Monitor</h1>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Railway Inspection System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowSetup(true)}
              className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/5 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              Pi Setup Guide
            </button>
            <button 
              onClick={() => setIsMockMode(!isMockMode)}
              className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${
                isMockMode 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                  : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {isMockMode ? 'Mock Mode ON' : 'Use Real Pi'}
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full border border-white/5">
              <Settings className="w-4 h-4 text-zinc-400" />
              {isEditingIp ? (
                <input 
                  type="text" 
                  value={piIp} 
                  onChange={(e) => setPiIp(e.target.value)}
                  onBlur={() => setIsEditingIp(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingIp(false)}
                  autoFocus
                  className="bg-transparent border-none outline-none text-xs w-32 text-emerald-400"
                />
              ) : (
                <span 
                  onClick={() => setIsEditingIp(true)}
                  className="text-xs font-mono cursor-pointer hover:text-emerald-400 transition-colors"
                >
                  {piIp}:5000
                </span>
              )}
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isScanning ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}>
              <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{isScanning ? 'Live' : 'Standby'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Video & Controls */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Video Feed */}
          <section className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 shadow-2xl group">
            <img 
              src={isScanning ? `http://${piIp}:5000/video` : "https://picsum.photos/seed/railway/1280/720?blur=10"} 
              alt="Live Feed"
              className={`w-full h-full object-cover transition-opacity duration-500 ${isScanning ? 'opacity-100' : 'opacity-40'}`}
              referrerPolicy="no-referrer"
            />
            
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <Camera className="w-8 h-8 text-zinc-500" />
                </div>
                <p className="text-zinc-400 font-medium">Feed Paused. Start scan to view live stream.</p>
              </div>
            )}

            {/* Overlay UI */}
            <div className="absolute top-4 left-4 flex gap-2">
              <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest">REC</span>
              </div>
              <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">FPS: 24</span>
              </div>
            </div>

            <AnimatePresence>
              {crackDetected && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 border-4 border-red-500/50 pointer-events-none flex items-center justify-center"
                >
                  <div className="bg-red-600 text-white px-8 py-3 rounded-xl font-black text-2xl tracking-tighter shadow-2xl shadow-red-600/40 animate-bounce uppercase">
                    Crack Detected!
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute bottom-4 right-4">
              <button 
                onClick={toggleScan}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg ${
                  isScanning 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                }`}
              >
                {isScanning ? (
                  <><Square className="w-5 h-5 fill-current" /> Stop Scan</>
                ) : (
                  <><Play className="w-5 h-5 fill-current" /> Start Scan</>
                )}
              </button>
            </div>
          </section>

          {/* Status & Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Crack Status</span>
                <AlertTriangle className={`w-4 h-4 ${crackDetected || crackStatus === 'Connection Error' ? 'text-red-400' : 'text-zinc-600'}`} />
              </div>
              <div className={`text-xl font-bold ${crackDetected || crackStatus === 'Connection Error' ? 'text-red-400' : 'text-emerald-400'}`}>
                {isScanning ? crackStatus : 'System Idle'}
              </div>
              {crackStatus === 'Connection Error' && isScanning && !isMockMode && (
                <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-[10px] text-red-400 font-medium leading-relaxed">
                    <strong>Connection Failed:</strong> Browsers block HTTPS sites from accessing local HTTP IPs (Mixed Content). 
                    <br/><br/>
                    1. Enable "Insecure content" in browser site settings.
                    <br/>
                    2. Ensure <code>flask-cors</code> is enabled on your Pi.
                    <br/>
                    3. Or toggle <strong>Mock Mode</strong> above to test UI.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Distance Traveled</span>
                <Navigation className="w-4 h-4 text-zinc-600" />
              </div>
              <div className="text-xl font-bold text-white">
                {stats.distance} <span className="text-sm font-normal text-zinc-500">meters</span>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Scan Duration</span>
                <Clock className="w-4 h-4 text-zinc-600" />
              </div>
              <div className="text-xl font-bold text-white">
                {formatTime(stats.scanTime)}
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <section className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-400" />
                <h2 className="font-bold text-sm">Activity Log</h2>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">{logs.length} entries</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-zinc-900 text-zinc-500 uppercase text-[10px] font-bold tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-zinc-600 italic">No activity recorded yet.</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-zinc-400">{log.timestamp}</td>
                        <td className="px-4 py-3 font-medium">{log.status}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter ${
                            log.type === 'error' ? 'bg-red-500/10 text-red-400' :
                            log.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                            log.type === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {log.type}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column: GPS & Secondary Stats */}
        <div className="lg:col-span-4 space-y-6">
          {/* GPS Section */}
          <section className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold">GPS Location</h2>
            </div>
            
            <div className="aspect-square bg-zinc-800 rounded-xl border border-white/5 relative overflow-hidden group">
              {/* Mock Map Grid */}
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="w-4 h-4 bg-emerald-500 rounded-full animate-ping absolute inset-0" />
                  <div className="w-4 h-4 bg-emerald-500 rounded-full relative z-10 border-2 border-white" />
                </div>
              </div>
              <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10">
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div>
                    <span className="text-zinc-500 block">LATITUDE</span>
                    <span className="text-white">{gps.lat}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">LONGITUDE</span>
                    <span className="text-white">{gps.lng}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Neo 6M GPS Module connected. Real-time coordinates are updated every 5 seconds during active scan.
            </p>
          </section>

          {/* Bot Health */}
          <section className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 space-y-6">
            <h2 className="font-bold text-sm uppercase tracking-widest text-zinc-500">Bot Health</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Battery Level</span>
                  <span className="font-bold text-emerald-400">{stats.battery}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.battery}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Current Speed</span>
                  <span className="font-bold text-white">{stats.speed.toFixed(1)} m/s</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.speed / 2.5) * 100}%` }}
                    className="h-full bg-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Cracks Found</div>
                  <div className="text-xl font-bold text-red-400">{stats.crackCount}</div>
                </div>
                <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Signal</div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`w-1 h-3 rounded-full ${i <= 3 ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 hover:bg-zinc-800 transition-colors flex flex-col items-center gap-2 group">
              <Zap className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase">Flashlight</span>
            </button>
            <button className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 hover:bg-zinc-800 transition-colors flex flex-col items-center gap-2 group">
              <CheckCircle2 className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase">Self Test</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto p-6 text-center text-zinc-600 text-[10px] uppercase tracking-[0.2em]">
        &copy; 2024 TrackGuard Systems &bull; Autonomous Railway Inspection
      </footer>

      {/* Setup Modal */}
      <AnimatePresence>
        {showSetup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSetup(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                <h2 className="text-xl font-bold">Raspberry Pi Setup</h2>
                <button 
                  onClick={() => setShowSetup(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <Square className="w-5 h-5 rotate-45" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">1. Install Dependencies</h3>
                  <p className="text-xs text-zinc-400">Run this on your Raspberry Pi to allow the dashboard to connect:</p>
                  <pre className="bg-black p-4 rounded-xl text-xs font-mono text-zinc-300 border border-white/5">
                    pip install flask flask-cors opencv-python numpy
                  </pre>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">2. Update Python Code</h3>
                  <p className="text-xs text-zinc-400">Add <strong>CORS</strong> support and a <strong>JSON status</strong> endpoint to your script:</p>
                  <pre className="bg-black p-4 rounded-xl text-[10px] font-mono text-zinc-300 border border-white/5 overflow-x-auto">
{`from flask import Flask, render_template, Response, jsonify
from flask_cors import CORS # <--- ADD THIS
import cv2
import numpy as np

app = Flask(__name__)
CORS(app) # <--- ADD THIS

# ... (your existing camera and detection code)

@app.route('/')
def index():
    return render_template("index.html", status=crack_status)

# ADD THIS ENDPOINT FOR THE DASHBOARD
@app.route('/status')
def status():
    return jsonify({"crack_status": crack_status})

@app.route('/video')
def video():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)`}
                  </pre>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <h4 className="text-xs font-bold text-amber-400 mb-1">Browser Security Note</h4>
                  <p className="text-[10px] text-amber-400/80 leading-relaxed">
                    Because this dashboard runs on HTTPS, you must click the <strong>Lock icon</strong> in your browser address bar, go to <strong>Site Settings</strong>, and set <strong>Insecure Content</strong> to <strong>Allow</strong> to connect to your local Pi IP.
                  </p>
                </div>
              </div>
              
              <div className="p-6 border-t border-white/5 bg-zinc-900/50">
                <button 
                  onClick={() => setShowSetup(false)}
                  className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
