import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { InventoryPage } from './components/InventoryPage';
import { InvoicesPage } from './components/InvoicesPage';
import { PinAuth } from './components/PinAuth';
import { WifiSyncModal } from './components/WifiSyncModal';
import { ToastContainer } from './components/Toast';
import { initCloudSync } from './firebaseSync';
import { Camera } from 'lucide-react';

export const App: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'invoices'>('invoices');
  const [cameraTrigger, setCameraTrigger] = useState(0);
  const [isWifiModalOpen, setIsWifiModalOpen] = useState(false);

  useEffect(() => {
    initCloudSync();
  }, []);

  // Show PIN screen if not authenticated
  if (!authenticated) {
    return <PinAuth onAuthenticated={() => setAuthenticated(true)} />;
  }

  const handleNavbarCamera = () => {
    setActiveTab('invoices');
    setCameraTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen" style={{ background: '#060b18', color: '#e2e8f0', fontFamily: "'Cairo', system-ui, sans-serif" }}>
      {/* Top Floating Toast Notifications */}
      <ToastContainer />

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenQRScanner={handleNavbarCamera}
        onOpenWifiSync={() => setIsWifiModalOpen(true)}
      />

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '1rem 0.5rem 5rem' }}>
        {activeTab === 'inventory' ? (
          <InventoryPage onOpenQRScanner={handleNavbarCamera} />
        ) : (
          <InvoicesPage cameraTrigger={cameraTrigger} />
        )}
      </main>

      {/* 📸 Floating Action Camera Button (FAB) - Large & Always Visible */}
      <button
        onClick={handleNavbarCamera}
        style={{
          position: 'fixed',
          bottom: '1.25rem',
          left: '1.25rem',
          zIndex: 50,
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
          color: '#ffffff',
          border: '2px solid rgba(255, 255, 255, 0.30)',
          borderRadius: '1.25rem',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          boxShadow: '0 10px 30px rgba(99, 102, 241, 0.60), 0 0 20px rgba(99, 102, 241, 0.40)',
          cursor: 'pointer',
          fontFamily: "'Cairo', sans-serif",
          fontWeight: 900,
          fontSize: '0.9rem',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <Camera className="w-6 h-6 text-white animate-pulse" />
        <span style={{ whiteSpace: 'nowrap' }}>فتح الكاميرا 📷</span>
      </button>

      {/* Local Wi-Fi PC Sync Modal */}
      <WifiSyncModal
        isOpen={isWifiModalOpen}
        onClose={() => setIsWifiModalOpen(false)}
        onOpenQRScanner={handleNavbarCamera}
      />
    </div>
  );
};

export default App;
