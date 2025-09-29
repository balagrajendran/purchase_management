import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ClientManagement } from './components/ClientManagement';
import { PurchaseManagement } from './components/PurchaseManagement';
import { InvoiceManagement } from './components/InvoiceManagement';
import { FinanceManagement } from './components/FinanceManagement';
import { Settings } from './components/Settings';
import { Login } from './components/Login';
import { AnimatedBackground } from './components/AnimatedBackground';
import { PageTransition } from './components/PageTransition';
import { FloatingActionButton } from './components/FloatingActionButton';
import { Toaster } from './components/ui/sonner';

interface AuthState {
  isAuthenticated: boolean;
  user: {
    email: string;
    role: string;
  } | null;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null
  });

  // Check for saved authentication state on app load
  useEffect(() => {
    const savedAuth = localStorage.getItem('fedhub_auth');
    if (savedAuth) {
      try {
        const parsedAuth = JSON.parse(savedAuth);
        setAuthState(parsedAuth);
      } catch (error) {
        console.error('Error parsing saved auth state:', error);
        localStorage.removeItem('fedhub_auth');
      }
    }
  }, []);

  const handleLogin = (credentials: { email: string; password: string; rememberMe: boolean }) => {
    // Determine user role based on email domain or patterns
    // In a real application, this would come from your backend API
    let role = 'User';
    if (credentials.email.includes('admin') || credentials.email.includes('administrator')) {
      role = 'Administrator';
    } else if (credentials.email.includes('manager') || credentials.email.includes('mgr')) {
      role = 'Manager';
    } else if (credentials.email.endsWith('@fedhubsoftware.com')) {
      role = 'Employee';
    }

    const newAuthState: AuthState = {
      isAuthenticated: true,
      user: {
        email: credentials.email,
        role: role
      }
    };

    setAuthState(newAuthState);
    
    // Save to localStorage if "Remember me" is checked
    if (credentials.rememberMe) {
      localStorage.setItem('fedhub_auth', JSON.stringify(newAuthState));
    }
  };

  const handleLogout = () => {
    setAuthState({
      isAuthenticated: false,
      user: null
    });
    localStorage.removeItem('fedhub_auth');
    setCurrentPage('dashboard');
  };

  // Show login page if not authenticated
  if (!authState.isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

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
        return <Settings onLogout={handleLogout} userInfo={authState.user} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <AnimatedBackground />
      
      {/* Full Width Header */}
      <Header 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
        user={authState.user}
        onLogout={handleLogout}
      />
      
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