import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { InventoryPage } from './components/InventoryPage';
import { InvoicesPage } from './components/InvoicesPage';
import { CameraQRScanner } from './components/CameraQRScanner';
import { PinAuth } from './components/PinAuth';
import { initCloudSync } from './firebaseSync';

export const App: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'invoices'>('invoices');
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  useEffect(() => {
    initCloudSync();
  }, []);

  // Show PIN screen if not authenticated
  if (!authenticated) {
    return <PinAuth onAuthenticated={() => setAuthenticated(true)} />;
  }


  return (
    <div className="min-h-screen" style={{ background: '#060b18', color: '#e2e8f0', fontFamily: "'Cairo', system-ui, sans-serif" }}>
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenQRScanner={() => setIsQRScannerOpen(true)}
      />

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        {activeTab === 'inventory' ? (
          <InventoryPage onOpenQRScanner={() => setIsQRScannerOpen(true)} />
        ) : (
          <InvoicesPage />
        )}
      </main>

      {/* Global QR Camera */}
      <CameraQRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={(code) => alert(`تم مسح الرمز: ${code}`)}
      />
    </div>
  );
};

export default App;
