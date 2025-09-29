import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Bell, 
  User, 
  Moon, 
  Sun, 
  Settings, 
  ChevronDown,
  Plus,
  Home,
  LogOut,
  Menu,
  BarChart3
} from 'lucide-react';

import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { GlassCard } from './GlassCard';
import { StatusIndicator } from './StatusIndicator';
import { HeaderBackground } from './HeaderBackground';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const pageNames: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Client Management',
  purchases: 'Purchase Management',
  invoices: 'Invoice Management',
  settings: 'Settings',
};

const quickActions = [
  { id: 'new-purchase', label: 'New Purchase', icon: Plus },
  { id: 'new-client', label: 'New Client', icon: User },
  { id: 'new-invoice', label: 'New Invoice', icon: Plus },
];

export function Header({ currentPage, onPageChange }: HeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications] = useState([
    { id: 1, title: 'New purchase order approved', time: '2 min ago', unread: true },
    { id: 2, title: 'Invoice payment received', time: '1 hour ago', unread: true },
    { id: 3, title: 'Client registration completed', time: '3 hours ago', unread: false },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };



  return (
    <motion.header
      className="sticky top-0 z-50 w-full"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <GlassCard className="rounded-none border-0 border-b border-white/20 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 relative">
        <HeaderBackground />
        <div className="flex h-16 items-center justify-between px-6 relative z-10">
          {/* Left Section - Company Branding and Current Page */}
          <div className="flex items-center space-x-6">
            {/* Company Branding */}
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="p-3 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm"
              >
                <BarChart3 className="w-7 h-7 text-blue-600" />
              </motion.div>
              <div>
                <motion.h1 
                  className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  FedHub Software Solutions
                </motion.h1>
                <p className="text-sm text-muted-foreground">Purchase Management System</p>
              </div>
            </motion.div>


          </div>

          {/* Center Section - Spacer */}
          <div className="flex-1"></div>

          {/* Right Section - Status, Actions and User Menu */}
          <motion.div
            className="flex items-center space-x-4"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >

            {/* Quick Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 border-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Quick Actions
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-white/20">
                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {quickActions.map((action) => (
                  <DropdownMenuItem key={action.id} className="hover:bg-white/50 dark:hover:bg-gray-800/50">
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="relative overflow-hidden bg-white/30 dark:bg-gray-800/30 hover:bg-white/50 dark:hover:bg-gray-800/50"
              >
                <motion.div
                  initial={false}
                  animate={{ rotate: isDarkMode ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {isDarkMode ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </motion.div>
              </Button>
            </motion.div>

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="relative bg-white/30 dark:bg-gray-800/30 hover:bg-white/50 dark:hover:bg-gray-800/50"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <motion.div
                        className="absolute -top-1 -right-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Badge className="h-5 w-5 p-0 text-xs bg-red-500 hover:bg-red-600">
                          {unreadCount}
                        </Badge>
                      </motion.div>
                    )}
                  </Button>
                </motion.div>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-white/20">
                <div className="p-4 border-b border-white/20">
                  <h4 className="font-semibold">Notifications</h4>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      className="p-4 border-b border-white/10 hover:bg-white/30 dark:hover:bg-gray-800/30 cursor-pointer"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${notification.unread ? 'bg-blue-500' : 'bg-gray-300'}`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-muted-foreground">{notification.time}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-white/30 dark:bg-gray-800/30 hover:bg-white/50 dark:hover:bg-gray-800/50 p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/api/placeholder/32/32" alt="User" />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                        FS
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-white/20" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">FedHub Admin</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      admin@fedhubsoftware.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onPageChange('dashboard')}
                  className="hover:bg-white/50 dark:hover:bg-gray-800/50"
                >
                  <Home className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onPageChange('settings')}
                  className="hover:bg-white/50 dark:hover:bg-gray-800/50"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="hover:bg-white/50 dark:hover:bg-gray-800/50">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </div>
      </GlassCard>
    </motion.header>
  );
}