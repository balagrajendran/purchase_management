import { useState } from 'react';
import { Layout } from './components/Layout';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ClientManagement } from './components/ClientManagement';
import { PurchaseManagement } from './components/PurchaseManagement';
import { InvoiceManagement } from './components/InvoiceManagement';
import { FinanceManagement } from './components/FinanceManagement';
import { Settings } from './components/Settings';
import { AnimatedBackground } from './components/AnimatedBackground';
import { PageTransition } from './components/PageTransition';
import { FloatingActionButton } from './components/FloatingActionButton';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return <ClientManagement />;
      case 'purchases':
        return <PurchaseManagement />;
      case 'invoices':
        return <InvoiceManagement />;
      case 'finance':
        return <FinanceManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <AnimatedBackground />
      
      {/* Full Width Header */}
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />
      
      {/* Layout with Sidebar and Main Content */}
      <div className="flex-1 flex">
        <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
          <PageTransition currentPage={currentPage}>
            {renderPage()}
          </PageTransition>
        </Layout>
      </div>
      
      <FloatingActionButton onPageChange={setCurrentPage} />
      <Toaster />
    </div>
  );
}