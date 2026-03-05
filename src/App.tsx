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
  CheckCircle2,
  Plus,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Declare Leaflet for TypeScript
declare global {
  interface Window {
    L: any;
  }
}

interface LogEntry {
  id: string;
  timestamp: string;
  lat: number;
  lng: number;
  dist: number;
  severity: 'Low' | 'Medium' | 'High';
  status: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

const TRACK_PATH = [
  [17.664, 75.893], // Solapur Jn
  [17.600, 75.645], // Mohol
  [18.026, 75.163], // Madha
  [18.085, 75.025], // Kurduvadi Jn
  [18.176, 74.925], // Kem
  [18.255, 74.855], // Jeur
  [18.285, 74.755], // Bhigwan
  [18.465, 74.585], // Daund Jn
  [18.455, 74.355], // Kedgaon
  [18.485, 74.125], // Uruli
  [18.495, 73.985], // Loni
  [18.529, 73.874]  // Pune Jn
];

const INITIAL_CRACKS: LogEntry[] = [
  {
    id: '1',
    timestamp: '2024-03-01 10:20',
    lat: 17.632,
    lng: 75.769,
    dist: 30,
    severity: 'Medium',
    status: 'Crack at 17.632, 75.769',
    type: 'warning'
  },
  {
    id: '2',
    timestamp: '2024-03-02 14:45',
    lat: 18.170,
    lng: 74.940,
    dist: 110,
    severity: 'High',
    status: 'Crack at 18.170, 74.940',
    type: 'error'
  },
  {
    id: '3',
    timestamp: '2024-03-03 09:15',
    lat: 18.475,
    lng: 74.450,
    dist: 210,
    severity: 'Low',
    status: 'Crack at 18.475, 74.450',
    type: 'info'
  }
];

function getPointOnPath(progress: number) {
  const totalSegments = TRACK_PATH.length - 1;
  const segmentIndex = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
  const segmentProgress = (progress * totalSegments) % 1;
  
  const start = TRACK_PATH[segmentIndex];
  const end = TRACK_PATH[segmentIndex + 1];
  
  const lat = start[0] + (end[0] - start[0]) * segmentProgress;
  const lng = start[1] + (end[1] - start[1]) * segmentProgress;
  
  return { lat, lng };
}

export default function App() {
  const [piIp, setPiIp] = useState<string>('10.75.72.15');
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isMockMode, setIsMockMode] = useState(true); // Default to mock for demo
  const [showSetup, setShowSetup] = useState(false);
  const [crackStatus, setCrackStatus] = useState<string>('System Ready');
  const [crackDetected, setCrackDetected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_CRACKS);
  const [stats, setStats] = useState({
    distance: 0,
    scanTime: 0,
    crackCount: 3,
    battery: 92,
    speed: 0
  });

  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!window.L) return;

    if (!mapRef.current) {
      mapRef.current = window.L.map('map-container').setView([18.1, 74.8], 8);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Add Railway Track Polyline
      window.L.polyline(TRACK_PATH, {
        color: '#10b981',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10'
      }).addTo(mapRef.current);

      // Add Start/End Markers
      window.L.marker([17.664, 75.893]).addTo(mapRef.current).bindPopup('<b>Solapur Jn</b><br>Start Point');
      window.L.marker([17.600, 75.645]).addTo(mapRef.current).bindPopup('<b>Mohol</b>');
      window.L.marker([18.026, 75.163]).addTo(mapRef.current).bindPopup('<b>Madha</b>');
      window.L.marker([18.085, 75.025]).addTo(mapRef.current).bindPopup('<b>Kurduvadi Jn</b>');
      window.L.marker([18.176, 74.925]).addTo(mapRef.current).bindPopup('<b>Kem</b>');
      window.L.marker([18.255, 74.855]).addTo(mapRef.current).bindPopup('<b>Jeur</b>');
      window.L.marker([18.285, 74.755]).addTo(mapRef.current).bindPopup('<b>Bhigwan</b>');
      window.L.marker([18.465, 74.585]).addTo(mapRef.current).bindPopup('<b>Daund Jn</b>');
      window.L.marker([18.455, 74.355]).addTo(mapRef.current).bindPopup('<b>Kedgaon</b>');
      window.L.marker([18.485, 74.125]).addTo(mapRef.current).bindPopup('<b>Uruli</b>');
      window.L.marker([18.495, 73.985]).addTo(mapRef.current).bindPopup('<b>Loni</b>');
      window.L.marker([18.529, 73.874]).addTo(mapRef.current).bindPopup('<b>Pune Jn</b><br>End Point');
    }

    // Update Crack Markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    logs.forEach(log => {
      if (log.lat && log.lng) {
        const marker = window.L.marker([log.lat, log.lng], {
          icon: window.L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg animate-pulse"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        }).addTo(mapRef.current);

        marker.bindPopup(`
          <div class="p-2 text-xs">
            <b class="text-red-600 uppercase">Crack Detected</b><br>
            <b>Location:</b> ${log.lat}, ${log.lng}<br>
            <b>Distance:</b> ${log.dist} km from Solapur<br>
            <b>Severity:</b> <span class="${log.severity === 'High' ? 'text-red-500' : log.severity === 'Medium' ? 'text-amber-500' : 'text-blue-500'} font-bold">${log.severity}</span><br>
            <b>Detected:</b> ${log.timestamp}
          </div>
        `);
        markersRef.current.push(marker);
      }
    });

    return () => {
      // Cleanup if needed
    };
  }, [logs]);

  // Status Polling Logic
  useEffect(() => {
    const pollStatus = async () => {
      if (isMockMode) {
        // Mock logic: randomly detect crack every 30s if scanning
        if (isScanning && Math.random() > 0.98) {
          handleNewDetection();
        }
        return;
      }

      try {
        const res = await fetch(`http://${piIp}:5000/status`, { mode: 'cors' });
        if (res.ok) {
          const data = await res.json();
          const isCrack = data.crack_status?.toLowerCase().includes('crack detected');
          setCrackStatus(isCrack ? 'CRACK DETECTED!' : 'All Clear');
          if (isCrack && !crackDetected) {
            handleNewDetection();
          }
          setCrackDetected(isCrack);
        }
      } catch (error) {
        setCrackStatus('Connection Error');
      }
    };

    const interval = setInterval(() => {
      if (isScanning) pollStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [piIp, isScanning, isMockMode, crackDetected]);

  // Stats Simulation
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

  const handleNewDetection = async () => {
    const progress = Math.random();
    const { lat, lng } = getPointOnPath(progress);
    const newDist = Math.floor(progress * 264);
    const severities: ('Low' | 'Medium' | 'High')[] = ['Low', 'Medium', 'High'];
    const severity = severities[Math.floor(Math.random() * 3)];

    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      lat: +lat.toFixed(4),
      lng: +lng.toFixed(4),
      dist: newDist,
      severity,
      status: `Crack at ${lat.toFixed(2)}, ${lng.toFixed(2)}`,
      type: severity === 'High' ? 'error' : severity === 'Medium' ? 'warning' : 'info'
    };

    setLogs(prev => [newLog, ...prev]);
    setStats(prev => ({ ...prev, crackCount: prev.crackCount + 1 }));
    setCrackDetected(true);
    
    // Simulate POST to /api/detect
    console.log('Simulating POST to /api/detect', newLog);
  };

  const toggleScan = () => {
    setIsScanning(!isScanning);
    if (isScanning) setStats(prev => ({ ...prev, speed: 0 }));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-[1000]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">TrackGuard Monitor</h1>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Solapur-Pune Railway Division</p>
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all ${
                isMockMode 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}
            >
              {isMockMode ? <Database className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              {isMockMode ? 'Sample Data' : 'Live Pi'}
            </button>
            
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full border border-white/5">
              <Settings className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono text-zinc-400">{piIp}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Sidebar: Status & History */}
        <aside className="lg:col-span-4 border-r border-white/5 bg-zinc-900/20 overflow-y-auto p-6 space-y-6">
          {/* Live Status Card */}
          <section className={`p-6 rounded-2xl border transition-all duration-500 ${
            crackDetected ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Live Status</h2>
              <div className={`w-2 h-2 rounded-full ${isScanning ? 'animate-pulse bg-emerald-400' : 'bg-zinc-600'}`} />
            </div>
            <div className={`text-2xl font-black tracking-tighter uppercase ${crackDetected ? 'text-red-500' : 'text-emerald-500'}`}>
              {crackDetected ? 'CRACK DETECTED!' : 'Track Safe'}
            </div>
            <p className="text-[10px] text-zinc-500 mt-2 font-mono">
              Last Scan: {new Date().toLocaleTimeString()} | {isMockMode ? 'Simulated' : 'Pi Feed'}
            </p>
            
            <div className="mt-6 flex gap-3">
              <button 
                onClick={toggleScan}
                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  isScanning ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                }`}
              >
                {isScanning ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                {isScanning ? 'Stop Scan' : 'Start Scan'}
              </button>
              <button 
                onClick={handleNewDetection}
                className="p-3 bg-zinc-800 rounded-xl border border-white/5 hover:bg-zinc-700 transition-colors"
                title="Simulate New Detection"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </section>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5">
              <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Total Cracks</div>
              <div className="text-xl font-bold text-red-400">{stats.crackCount}</div>
            </div>
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5">
              <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Track Distance</div>
              <div className="text-xl font-bold text-white">264 <span className="text-xs font-normal text-zinc-500">km</span></div>
            </div>
          </div>

          {/* Crack History Table */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Detection History</h3>
              <button onClick={() => setLogs(INITIAL_CRACKS)} className="text-[10px] text-zinc-600 hover:text-zinc-400 underline">Reset</button>
            </div>
            <div className="space-y-3">
              {logs.map(log => (
                <div key={log.id} className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all group cursor-pointer" onClick={() => mapRef.current?.setView([log.lat, log.lng], 12)}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${log.severity === 'High' ? 'bg-red-500' : log.severity === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter">{log.severity} Severity</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-600">{log.timestamp}</span>
                  </div>
                  <div className="text-xs font-medium text-zinc-400 mb-1">
                    {log.dist} km from Solapur Jn
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 flex justify-between">
                    <span>{log.lat}, {log.lng}</span>
                    <span className="text-emerald-500 group-hover:underline">View on Map</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* Main Content: Map */}
        <div className="lg:col-span-8 relative flex flex-col">
          {/* Map Container */}
          <div id="map-container" className="flex-1 z-0" />

          {/* Track Progress Bar */}
          <div className="absolute bottom-6 left-6 right-6 z-[500] bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
              <span>Solapur Jn (0 km)</span>
              <span className="text-emerald-400">Current Progress: {stats.distance} km</span>
              <span>Pune Jn (264 km)</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(90deg, transparent 95%, white 95%)', backgroundSize: '10% 100%' }} />
              <motion.div 
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                animate={{ width: `${(stats.distance / 264) * 100}%` }}
              />
            </div>
          </div>

          {/* Map Legend */}
          <div className="absolute top-6 right-6 z-[500] bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 text-[10px] font-bold uppercase tracking-widest space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-emerald-500" />
              <span className="text-zinc-300">Railway Track</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-zinc-300">Crack Detected</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-black border-t border-white/5 p-4 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-600">
        &copy; 2024 TrackGuard Systems &bull; Solapur-Pune Railway Division &bull; Autonomous Inspection Unit
      </footer>

      <style>{`
        .leaflet-container {
          background: #0a0a0a !important;
        }
        .leaflet-tile {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .leaflet-popup-content-wrapper {
          background: #18181b !important;
          color: #f4f4f5 !important;
          border-radius: 12px !important;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .leaflet-popup-tip {
          background: #18181b !important;
        }
        .custom-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      {/* Setup Modal */}
      <AnimatePresence>
        {showSetup && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
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
                  <p className="text-xs text-zinc-400">Use this robust script optimized for <strong>USB Cameras</strong> and the dashboard:</p>
                  <pre className="bg-black p-4 rounded-xl text-[10px] font-mono text-zinc-300 border border-white/5 overflow-x-auto">
{`from flask import Flask, Response, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import time

app = Flask(__name__)
CORS(app)

# --- CAMERA SETUP ---
camera = None
for index in [0, 1, 2]:
    cap = cv2.VideoCapture(index)
    if cap.isOpened():
        camera = cap
        break
    cap.release()

crack_status = "No Crack Detected"

def detect_crack(frame):
    global crack_status
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 50, 150)
    crack_pixels = np.sum(edges == 255)
    if crack_pixels > 4000:
        crack_status = "CRACK DETECTED!"
    else:
        crack_status = "No Crack Detected"
    return frame

def generate_frames():
    while True:
        success, frame = camera.read()
        if not success: break
        frame = detect_crack(frame)
        ret, buffer = cv2.imencode('.jpg', frame)
        yield (b'--frame\\r\\n'
               b'Content-Type: image/jpeg\\r\\n\\r\\n' + buffer.tobytes() + b'\\r\\n')

@app.route('/status')
def status():
    return jsonify({"crack_status": crack_status})

@app.route('/video')
def video():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)`}
                  </pre>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <h4 className="text-xs font-bold text-amber-400 mb-1">Browser Security Note</h4>
                  <p className="text-[10px] text-amber-400/80 leading-relaxed">
                    Because this dashboard runs on HTTPS, you must click the <strong>Lock icon</strong> in your browser address bar, go to <strong>Site Settings</strong>, and set <strong>Insecure Content</strong> to <strong>Allow</strong>.
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
