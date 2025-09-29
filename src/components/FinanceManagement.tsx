import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

import { motion } from 'motion/react';
import { 
  Wallet, 
  TrendingDown, 
  TrendingUp, 
  Receipt, 
  Plus, 
  Edit, 
  Trash2,
  DollarSign,
  Calculator,
  FileText,
  Calendar,
  Filter,
  UploadCloud,
  Search,
  X
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Breadcrumb } from './Breadcrumb';
import { toast } from 'sonner@2.0.3';

interface FinanceRecord {
  id: string;
  type: 'invested' | 'expense' | 'tds';
  category: string;
  amount: number;
  description: string;
  date: Date;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
  taxYear?: string; // For TDS records
}

const mockFinanceData: FinanceRecord[] = [
  {
    id: '1',
    type: 'invested',
    category: 'Equipment',
    amount: 250000,
    description: 'New development servers and workstations',
    date: new Date('2024-09-15'),
    paymentMethod: 'Bank Transfer',
    status: 'completed',
    reference: 'INV-EQ-001'
  },
  {
    id: '2',
    type: 'expense',
    category: 'Office Rent',
    amount: 45000,
    description: 'Monthly office rent - September 2024',
    date: new Date('2024-09-01'),
    paymentMethod: 'UPI',
    status: 'completed',
    reference: 'RENT-SEP-2024'
  },
  {
    id: '3',
    type: 'expense',
    category: 'Software Licenses',
    amount: 28000,
    description: 'Annual software licenses renewal',
    date: new Date('2024-09-10'),
    paymentMethod: 'Credit Card',
    status: 'completed',
    reference: 'LIC-2024-001'
  },
  {
    id: '4',
    type: 'tds',
    category: 'Professional Services',
    amount: 12500,
    description: 'TDS on consultant payment',
    date: new Date('2024-09-20'),
    paymentMethod: 'Bank Transfer',
    status: 'completed',
    reference: 'TDS-PS-001',
    taxYear: '2024-25'
  },
  {
    id: '5',
    type: 'invested',
    category: 'Marketing',
    amount: 75000,
    description: 'Digital marketing campaign investment',
    date: new Date('2024-09-25'),
    paymentMethod: 'Bank Transfer',
    status: 'completed',
    reference: 'MKT-DIG-001'
  },
  {
    id: '6',
    type: 'expense',
    category: 'Utilities',
    amount: 8500,
    description: 'Electricity and internet bills',
    date: new Date('2024-09-28'),
    paymentMethod: 'UPI',
    status: 'pending',
    reference: 'UTIL-SEP-2024'
  }
];

const categoryOptions = {
  invested: ['Equipment', 'Technology', 'Marketing', 'R&D', 'Infrastructure', 'Training'],
  expense: ['Office Rent', 'Utilities', 'Software Licenses', 'Travel', 'Supplies', 'Professional Services'],
  tds: ['Professional Services', 'Rent', 'Interest', 'Commission', 'Contractor Payments', 'Other']
};

const paymentMethods = ['Bank Transfer', 'UPI', 'Credit Card', 'Debit Card', 'Cash', 'Cheque'];

export function FinanceManagement() {
  const [currentView, setCurrentView] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [financeData, setFinanceData] = useState<FinanceRecord[]>(mockFinanceData);
  const [selectedRecord, setSelectedRecord] = useState<FinanceRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'expense' as 'invested' | 'expense' | 'tds',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    status: 'completed' as 'completed' | 'pending' | 'failed',
    reference: '',
    taxYear: ''
  });

  // Calculate totals
  const totalInvested = financeData
    .filter(record => record.type === 'invested' && record.status === 'completed')
    .reduce((sum, record) => sum + record.amount, 0);

  const totalExpenses = financeData
    .filter(record => record.type === 'expense' && record.status === 'completed')
    .reduce((sum, record) => sum + record.amount, 0);

  const totalTDS = financeData
    .filter(record => record.type === 'tds' && record.status === 'completed')
    .reduce((sum, record) => sum + record.amount, 0);

  const profit = totalInvested - totalExpenses - totalTDS;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'invested': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'expense': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'tds': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount || !formData.description || !formData.paymentMethod) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newRecord: FinanceRecord = {
      id: `${Date.now()}`,
      type: formData.type,
      category: formData.category,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: new Date(formData.date),
      paymentMethod: formData.paymentMethod,
      status: formData.status,
      reference: formData.reference || `${formData.type.toUpperCase()}-${Date.now()}`,
      taxYear: formData.type === 'tds' ? formData.taxYear : undefined
    };

    setFinanceData([...financeData, newRecord]);
    
    // Reset form
    setFormData({
      type: 'expense',
      category: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      status: 'completed',
      reference: '',
      taxYear: ''
    });
    
    toast.success('Finance record added successfully');
    setCurrentView('records');
  };

  // Reset form when navigating to add record
  const handleAddRecord = () => {
    setFormData({
      type: 'expense',
      category: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      status: 'completed',
      reference: '',
      taxYear: ''
    });
    setCurrentView('addRecord');
  };



  // Filter data
  const filteredData = financeData.filter(record => {
    const searchMatch = searchTerm === '' || 
      record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return searchMatch;
  });

  const breadcrumbItems = [
    { label: 'Home', onClick: () => {} }
  ];

  if (currentView === 'overview') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <Breadcrumb items={breadcrumbItems} currentPage="Finance" />
        
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Finance
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <UploadCloud className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Button 
              onClick={() => setCurrentView('addRecord')}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Record
            </Button>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard className="group cursor-pointer" onClick={() => setCurrentView('records')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Wallet className="h-4 w-4 text-green-600" />
                </motion.div>
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  ₹{totalInvested.toLocaleString()}
                </motion.div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline w-3 h-3 mr-1 text-green-500" />
                  Capital investments & assets
                </p>
              </CardContent>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="group cursor-pointer" onClick={() => setCurrentView('records')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </motion.div>
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                >
                  ₹{totalExpenses.toLocaleString()}
                </motion.div>
                <p className="text-xs text-muted-foreground">
                  Operating costs & overheads
                </p>
              </CardContent>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="group cursor-pointer" onClick={() => setCurrentView('records')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Calculator className="h-4 w-4 text-blue-600" />
                </motion.div>
              </CardHeader>
              <CardContent>
                <motion.div 
                  className={`text-2xl font-bold bg-gradient-to-r ${profit >= 0 ? 'from-blue-600 to-indigo-600' : 'from-red-600 to-rose-600'} bg-clip-text text-transparent`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                >
                  ₹{profit.toLocaleString()}
                </motion.div>
                <p className="text-xs text-muted-foreground">
                  {profit >= 0 ? (
                    <>
                      <TrendingUp className="inline w-3 h-3 mr-1 text-green-500" />
                      Profit after expenses & TDS
                    </>
                  ) : (
                    <>
                      <TrendingDown className="inline w-3 h-3 mr-1 text-red-500" />
                      Loss after expenses & TDS
                    </>
                  )}
                </p>
              </CardContent>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard className="group cursor-pointer" onClick={() => setCurrentView('records')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total TDS</CardTitle>
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Receipt className="h-4 w-4 text-orange-600" />
                </motion.div>
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                >
                  ₹{totalTDS.toLocaleString()}
                </motion.div>
                <p className="text-xs text-muted-foreground">
                  Tax deducted at source
                </p>
              </CardContent>
            </GlassCard>
          </motion.div>
        </div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <GlassCard>
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
                <Search className="h-5 w-5" />
                <span className="text-sm">Search & Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by description, category, payment method, or reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/70 dark:bg-gray-800/70"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                {/* Results Counter */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {searchTerm ? (
                      <>Showing {filteredData.length} of {financeData.length} records for "{searchTerm}"</>
                    ) : (
                      <>Showing {filteredData.length} of {financeData.length} records</>
                    )}
                  </div>
                  {searchTerm && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Search Active
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </GlassCard>
        </motion.div>

        {/* Detailed Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassCard>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Finance Records
                </CardTitle>
                <Button variant="outline" onClick={() => setCurrentView('records')}>
                  View Full Table
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData
                      .sort((a, b) => b.date.getTime() - a.date.getTime())
                      .slice(0, 10)
                      .map((record, index) => (
                        <motion.tr 
                          key={record.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + index * 0.05 }}
                          className="hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${
                                record.type === 'invested' ? 'bg-green-100 dark:bg-green-900/20' :
                                record.type === 'expense' ? 'bg-red-100 dark:bg-red-900/20' :
                                'bg-orange-100 dark:bg-orange-900/20'
                              }`}>
                                {record.type === 'invested' ? (
                                  <Wallet className="w-4 h-4 text-green-600" />
                                ) : record.type === 'expense' ? (
                                  <TrendingDown className="w-4 h-4 text-red-600" />
                                ) : (
                                  <Receipt className="w-4 h-4 text-orange-600" />
                                )}
                              </div>
                              <span className="capitalize font-medium">{record.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{record.description}</TableCell>
                          <TableCell>{record.category}</TableCell>
                          <TableCell>
                            <span className={`font-semibold ${
                              record.type === 'invested' ? 'text-green-600' :
                              record.type === 'expense' ? 'text-red-600' :
                              'text-orange-600'
                            }`}>
                              {record.type === 'invested' ? '+' : '-'}₹{record.amount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>{record.date.toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {record.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(record.status)}>
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setIsDialogOpen(true);
                                }}
                                className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                              >
                                <Edit className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setFinanceData(financeData.filter(item => item.id !== record.id));
                                  toast.success('Record deleted successfully');
                                }}
                                className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                  </TableBody>
                </Table>
              </div>
              {filteredData.length > 10 && (
                <div className="mt-4 text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentView('records')}
                    className="text-sm"
                  >
                    View All {filteredData.length} Records
                  </Button>
                </div>
              )}
            </CardContent>
          </GlassCard>
        </motion.div>

      </motion.div>
    );
  }

  // Add Record Submodule
  if (currentView === 'addRecord') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <Breadcrumb items={[...breadcrumbItems, { label: 'Finance', onClick: () => setCurrentView('overview') }]} currentPage="Add Record" />
        
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Add Finance Record
            </h1>
            <p className="text-muted-foreground">
              Create a new financial record for tracking investments, expenses, or TDS transactions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <UploadCloud className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Button variant="outline" onClick={() => setCurrentView('overview')}>
              Back to Overview
            </Button>
          </div>
        </div>

        <GlassCard className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Finance Record Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <div className="border-b border-white/20 pb-4">
                  <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Basic Information
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Essential details about the financial transaction
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Type */}
                  <div className="space-y-3">
                    <Label htmlFor="type" className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Transaction Type *
                    </Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: 'invested' | 'expense' | 'tds') => 
                        setFormData({...formData, type: value, category: ''})
                      }
                    >
                      <SelectTrigger className="h-12 bg-white/5 border-white/20 hover:bg-white/10 transition-all">
                        <SelectValue placeholder="Select transaction type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invested" className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-green-600" />
                          Invested
                        </SelectItem>
                        <SelectItem value="expense" className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          Expense
                        </SelectItem>
                        <SelectItem value="tds" className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-orange-600" />
                          TDS
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category */}
                  <div className="space-y-3">
                    <Label htmlFor="category" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Category *
                    </Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({...formData, category: value})}
                    >
                      <SelectTrigger className="h-12 bg-white/5 border-white/20 hover:bg-white/10 transition-all">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions[formData.type].map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-3">
                    <Label htmlFor="amount" className="text-sm font-medium flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Amount *
                    </Label>
                    <div className="relative">
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        min="0"
                        step="0.01"
                        required
                        className="h-12 pl-8 bg-white/5 border-white/20 hover:bg-white/10 transition-all"
                      />
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-3">
                    <Label htmlFor="paymentMethod" className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Payment Method *
                    </Label>
                    <Select 
                      value={formData.paymentMethod} 
                      onValueChange={(value) => setFormData({...formData, paymentMethod: value})}
                    >
                      <SelectTrigger className="h-12 bg-white/5 border-white/20 hover:bg-white/10 transition-all">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date */}
                  <div className="space-y-3">
                    <Label htmlFor="date" className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Transaction Date *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                      className="h-12 bg-white/5 border-white/20 hover:bg-white/10 transition-all"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-3">
                    <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value: 'completed' | 'pending' | 'failed') => 
                        setFormData({...formData, status: value})
                      }
                    >
                      <SelectTrigger className="h-12 bg-white/5 border-white/20 hover:bg-white/10 transition-all">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-6">
                <div className="border-b border-white/20 pb-4">
                  <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Additional Details
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Optional information for better record keeping
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Description */}
                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Description *
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Enter detailed transaction description..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={4}
                      required
                      className="bg-white/5 border-white/20 hover:bg-white/10 transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-6">
                    {/* Reference */}
                    <div className="space-y-3">
                      <Label htmlFor="reference" className="text-sm font-medium">Reference Number</Label>
                      <Input
                        id="reference"
                        placeholder="Auto-generated if left empty"
                        value={formData.reference}
                        onChange={(e) => setFormData({...formData, reference: e.target.value})}
                        className="h-12 bg-white/5 border-white/20 hover:bg-white/10 transition-all"
                      />
                    </div>

                    {/* Tax Year (for TDS only) */}
                    {formData.type === 'tds' && (
                      <div className="space-y-3">
                        <Label htmlFor="taxYear" className="text-sm font-medium">Tax Year</Label>
                        <Input
                          id="taxYear"
                          placeholder="e.g., 2024-25"
                          value={formData.taxYear}
                          onChange={(e) => setFormData({...formData, taxYear: e.target.value})}
                          className="h-12 bg-white/5 border-white/20 hover:bg-white/10 transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t border-white/20">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCurrentView('overview')}
                  className="px-8"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-8"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Record
                </Button>
              </div>
            </form>
          </CardContent>
        </GlassCard>
      </motion.div>
    );
  }

  // Records View (detailed table)
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <Breadcrumb items={[...breadcrumbItems, { label: 'Finance', onClick: () => setCurrentView('overview') }]} currentPage="Finance Records" />
      
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Finance Records
          </h1>
          <p className="text-muted-foreground">
            Detailed view of all financial transactions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setCurrentView('overview')}>
            Back to Overview
          </Button>
          <Button 
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <Button 
            onClick={() => setCurrentView('addRecord')}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      {/* Filters */}
      <GlassCard>
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <span className="text-sm">Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Type Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type</Label>
              <Select value={selectedType} onValueChange={(value: 'invested' | 'expense' | 'tds' | 'all') => setSelectedType(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="invested">Invested</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                  <SelectItem value="tds">TDS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {getAvailableCategories().map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Method</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {getAvailablePaymentMethods().map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Results Counter */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {filteredData.length} of {financeData.length} records
            </div>
          </div>
        </CardContent>
      </GlassCard>

      <GlassCard>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-white/5">
                  <TableHead className="font-medium">Type</TableHead>
                  <TableHead className="font-medium">Category</TableHead>
                  <TableHead className="font-medium">Description</TableHead>
                  <TableHead className="font-medium">Amount</TableHead>
                  <TableHead className="font-medium">Payment Method</TableHead>
                  <TableHead className="font-medium">Date</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">Tax Year</TableHead>
                  <TableHead className="font-medium text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No records found matching the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .map((record, index) => (
                      <motion.tr 
                        key={record.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${
                              record.type === 'invested' ? 'bg-green-100 dark:bg-green-900/20' :
                              record.type === 'expense' ? 'bg-red-100 dark:bg-red-900/20' :
                              'bg-orange-100 dark:bg-orange-900/20'
                            }`}>
                              {record.type === 'invested' ? (
                                <Wallet className="w-3 h-3 text-green-600" />
                              ) : record.type === 'expense' ? (
                                <TrendingDown className="w-3 h-3 text-red-600" />
                              ) : (
                                <Receipt className="w-3 h-3 text-orange-600" />
                              )}
                            </div>
                            <Badge className={getTypeColor(record.type)}>
                              {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{record.category}</TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={record.description}>
                            {record.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${
                            record.type === 'invested' ? 'text-green-600' :
                            record.type === 'expense' ? 'text-red-600' :
                            'text-orange-600'
                          }`}>
                            {record.type === 'invested' ? '+' : '-'}₹{record.amount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {record.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.date.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.taxYear || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </GlassCard>
    </motion.div>
  );
}