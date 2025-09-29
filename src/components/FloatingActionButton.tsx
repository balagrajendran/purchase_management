import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ShoppingCart, Users, FileText } from 'lucide-react';

interface FloatingActionButtonProps {
  onPageChange: (page: string) => void;
}

const quickActions = [
  { 
    id: 'purchases', 
    label: 'New Purchase Order', 
    icon: ShoppingCart,
    description: 'Create a new purchase order'
  },
  { 
    id: 'clients', 
    label: 'Add New Client', 
    icon: Users,
    description: 'Register a new client'
  },
  { 
    id: 'invoices', 
    label: 'Generate Invoice', 
    icon: FileText,
    description: 'Create a new invoice'
  },
];

export function FloatingActionButton({ onPageChange }: FloatingActionButtonProps) {
  return (
    <motion.div
      className="fixed bottom-8 right-8 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 200 }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative"
          >
            <Button
              size="lg"
              className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-2xl border-0 backdrop-blur-xl"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Plus className="h-6 w-6 text-white" />
              </motion.div>
            </Button>
            
            {/* Pulsing ring effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          className="w-64 backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-white/20 shadow-2xl"
          align="end"
          side="top"
        >
          <DropdownMenuLabel className="text-center">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">
              Quick Actions
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {quickActions.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <DropdownMenuItem 
                onClick={() => onPageChange(action.id)}
                className="p-3 hover:bg-white/50 dark:hover:bg-gray-800/50 cursor-pointer group"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-200">
                    <action.icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </DropdownMenuItem>
            </motion.div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}