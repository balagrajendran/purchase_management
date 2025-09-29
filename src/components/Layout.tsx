import { useState } from 'react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from './ui/sidebar';
import { BarChart3, ShoppingCart, Users, FileText, Home, Settings, Menu, Wallet } from 'lucide-react';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-full w-full">
        <Sidebar collapsible="icon" className="border-r border-white/20 relative">
          <SidebarContent className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 relative">
            {/* Sidebar Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
            <div className="p-4 border-b border-white/20 relative z-10">
              <motion.div 
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2"
                >
                  <SidebarTrigger className="bg-white/30 dark:bg-gray-800/30 hover:bg-white/50 dark:hover:bg-gray-800/50 border-white/20" />
                </motion.div>
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                  className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20"
                >
                  <Menu className="w-5 h-5 text-blue-600" />
                </motion.div>
                <div>
                  <h1 className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Quick Access
                  </h1>
                </div>
              </motion.div>
            </div>
            <SidebarGroup className="relative z-10">
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => onPageChange(item.id)}
                          isActive={currentPage === item.id}
                          className="group relative overflow-hidden transition-all duration-200 hover:bg-white/50 dark:hover:bg-gray-800/50 data-[state=open]:bg-gradient-to-r data-[state=open]:from-blue-500/20 data-[state=open]:to-purple-500/20"
                        >
                          <item.icon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                          <span className="group-hover:translate-x-1 transition-transform duration-200">
                            {item.label}
                          </span>
                          {currentPage === item.id && (
                            <motion.div
                              className="absolute right-2 w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                              layoutId="activeIndicator"
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </motion.div>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        
        <main className="flex-1 overflow-auto p-6 bg-background/50">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}