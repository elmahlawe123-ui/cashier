import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { InventoryPage } from './components/InventoryPage';
import { InvoicesPage } from './components/InvoicesPage';
import { PinAuth } from './components/PinAuth';
import { initCloudSync } from './firebaseSync';

export const App: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'invoices'>('invoices');
  const [cameraTrigger, setCameraTrigger] = useState(0);

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
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenQRScanner={handleNavbarCamera}
      />

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '1rem 0.5rem 4rem' }}>
        {activeTab === 'inventory' ? (
          <InventoryPage onOpenQRScanner={handleNavbarCamera} />
        ) : (
          <InvoicesPage cameraTrigger={cameraTrigger} />
        )}
      </main>
    </div>
  );
};

export default App;
