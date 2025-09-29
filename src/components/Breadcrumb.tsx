import { motion } from 'motion/react';
import { Button } from './ui/button';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  currentPage: string;
}

export function Breadcrumb({ items, currentPage }: BreadcrumbProps) {
  return (
    <motion.div
      className="flex flex-col space-y-2 mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="p-1 rounded-md hover:bg-white/20 transition-colors"
        >
          <Home className="w-4 h-4" />
        </motion.div>
        
        {items.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <ChevronRight className="w-4 h-4 text-blue-500/60" />
            {item.onClick ? (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto font-normal hover:text-primary text-sm transition-colors"
                onClick={item.onClick}
              >
                {item.label}
              </Button>
            ) : (
              <span className="font-medium text-foreground">{item.label}</span>
            )}
          </div>
        ))}
      </nav>
      
      {/* Page Title */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          {currentPage}
        </h1>
        <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2"></div>
      </motion.div>
    </motion.div>
  );
}