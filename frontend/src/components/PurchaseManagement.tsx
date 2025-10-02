import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Purchase, Client, PurchaseItem } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { 
  SUPPORTED_CURRENCIES, 
  DEFAULT_CURRENCY, 
  formatCurrency, 
  convertCurrency, 
  getCurrencySymbol,
  getExchangeRateDisclaimer 
} from '../utils/currency';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  ArrowLeft, 
  Save, 
  X, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  FileText,
  Calendar,
  User,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { mockPurchases, mockClients } from '../data/mockData';

export function PurchaseManagement() {
  const [currentView, setCurrentView] = useState<'list' | 'add' | 'edit' | 'view'>('list');
  const [purchases, setPurchases] = useState<Purchase[]>(mockPurchases);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'poNumber' | 'createdAt' | 'total'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Form data
  const [formData, setFormData] = useState({
    clientId: '',
    status: 'pending' as Purchase['status'],
    notes: ''
  });
  
  // Items management
  const [items, setItems] = useState<Omit<PurchaseItem, 'id' | 'total'>[]>([]);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportData, setBulkImportData] = useState('');
  
  // New item form state
  const [newItem, setNewItem] = useState({
    name: '',
    model: '',
    supplier: '',
    quantity: 1,
    unitPrice: 0,
    uom: 'pcs',
    currency: DEFAULT_CURRENCY
  });

  // Calculation functions
  const calculateItemTotal = (quantity: number, unitPrice: number) => quantity * unitPrice;
  
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const itemTotal = calculateItemTotal(item.quantity, item.unitPrice);
      // Convert to INR for subtotal calculation
      const itemTotalInINR = convertCurrency(itemTotal, item.currency, DEFAULT_CURRENCY);
      return sum + itemTotalInINR;
    }, 0);
  };
  
  const calculateTax = (subtotal: number) => subtotal * 0.18; // 18% GST
  
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + calculateTax(subtotal);
  };

  // Generate PO Number
  const generatePONumber = () => {
    const year = new Date().getFullYear();
    const existingPOs = purchases.filter(p => p.poNumber?.startsWith(`PO-${year}`));
    const nextNumber = existingPOs.length + 1;
    return `PO-${year}-${nextNumber.toString().padStart(3, '0')}`;
  };

  // Filtered and sorted purchases
  const filteredAndSortedPurchases = useMemo(() => {
    let filtered = purchases.filter(purchase => {
      const client = mockClients.find(c => c.id === purchase.clientId);
      const matchesSearch = 
        purchase.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client?.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || purchase.status === statusFilter;
      const matchesClient = clientFilter === 'all' || purchase.clientId === clientFilter;
      
      return matchesSearch && matchesStatus && matchesClient;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: string | Date | number;
      let bValue: string | Date | number;
      
      switch (sortBy) {
        case 'poNumber':
          aValue = a.poNumber;
          bValue = b.poNumber;
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'total':
          aValue = a.total;
          bValue = b.total;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [purchases, searchTerm, statusFilter, clientFilter, sortBy, sortOrder]);

  const resetForm = () => {
    setFormData({ clientId: '', status: 'pending', notes: '' });
    setItems([]);
    setNewItem({
      name: '',
      model: '',
      supplier: '',
      quantity: 1,
      unitPrice: 0,
      uom: 'pcs',
      currency: DEFAULT_CURRENCY
    });
    setEditingPurchase(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error('Please add at least one item to the purchase');
      return;
    }
    
    const purchaseItems: PurchaseItem[] = items.map((item, index) => ({
      ...item,
      id: `${Date.now()}-${index}`,
      total: calculateItemTotal(item.quantity, item.unitPrice),
    }));

    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    const total = subtotal + tax;

    if (editingPurchase) {
      setPurchases(purchases.map(purchase => 
        purchase.id === editingPurchase.id 
          ? { ...purchase, ...formData, items: purchaseItems, subtotal, tax, total, baseCurrency: DEFAULT_CURRENCY }
          : purchase
      ));
      toast.success('Purchase updated successfully!');
    } else {
      const newPurchase: Purchase = {
        id: Date.now().toString(),
        poNumber: generatePONumber(),
        ...formData,
        items: purchaseItems,
        subtotal,
        tax,
        total,
        baseCurrency: DEFAULT_CURRENCY,
        createdAt: new Date(),
      };
      setPurchases([...purchases, newPurchase]);
      toast.success('Purchase created successfully!');
    }

    setCurrentView('list');
    resetForm();
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      clientId: purchase.clientId,
      status: purchase.status,
      notes: purchase.notes || '',
    });
    setItems(purchase.items.map(item => ({
      name: item.name,
      model: item.model,
      supplier: item.supplier || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      uom: item.uom,
      currency: item.currency || DEFAULT_CURRENCY,
    })));
    setCurrentView('edit');
  };

  const handleView = (purchase: Purchase) => {
    setViewPurchase(purchase);
    setCurrentView('view');
  };

  const handleDelete = (id: string) => {
    setPurchases(purchases.filter(p => p.id !== id));
    toast.success('Purchase deleted successfully!');
  };

  const handleAddNew = () => {
    setEditingPurchase(null);
    resetForm();
    setCurrentView('add');
  };

  const handleCancel = () => {
    setCurrentView('list');
    resetForm();
    setEditingPurchase(null);
    setViewPurchase(null);
  };

  // Handle new item form
  const updateNewItem = (field: keyof typeof newItem, value: string | number) => {
    setNewItem(prev => ({ ...prev, [field]: value }));
  };

  const saveNewItem = () => {
    if (!newItem.name.trim() || !newItem.model.trim() || !newItem.supplier.trim() || newItem.quantity <= 0 || newItem.unitPrice <= 0) {
      toast.error('Please fill all required fields with valid values');
      return;
    }

    const itemToAdd = {
      ...newItem,
      quantity: Number(newItem.quantity),
      unitPrice: Number(newItem.unitPrice)
    };

    setItems(prev => [...prev, itemToAdd]);
    
    // Reset form
    setNewItem({
      name: '',
      model: '',
      supplier: '',
      quantity: 1,
      unitPrice: 0,
      uom: 'pcs',
      currency: DEFAULT_CURRENCY
    });

    toast.success('Item added successfully!', {
      description: `${itemToAdd.name} from ${itemToAdd.supplier} has been added to your order.`
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    toast.success('Item removed successfully!');
  };

  // Focus on item name input when using keyboard shortcut
  const focusItemNameInput = () => {
    const nameInput = document.querySelector('input[placeholder="Enter item name"]') as HTMLInputElement;
    if (nameInput) {
      nameInput.focus();
      nameInput.select();
      toast.info('🚀 Ready to add new item! Form focused.', {
        duration: 2000,
      });
    }
  };

  // Keyboard shortcut for focusing item input (Ctrl/Cmd + Plus)
  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === '=' && (currentView === 'add' || currentView === 'edit')) {
      event.preventDefault();
      focusItemNameInput();
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'add' || currentView === 'edit') {
      document.addEventListener('keydown', handleKeyboardShortcuts);
      return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
    }
  }, [handleKeyboardShortcuts, currentView]);

  // Bulk import functions
  const generateSampleCSV = () => {
    const sampleData = [
      ['Item Name', 'Model', 'Supplier', 'Quantity', 'Unit Price', 'UOM', 'Currency'],
      ['Sample Item 1', 'Model ABC-123', 'Tech Suppliers Ltd', '10', '99.99', 'pcs', 'INR'],
      ['Sample Item 2', 'Model XYZ-456', 'Global Parts Inc', '5', '199.99', 'kg', 'USD'],
      ['Sample Item 3', 'Model DEF-789', 'Local Vendor Co', '25', '49.99', 'boxes', 'INR']
    ];
    
    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_items_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Sample CSV template downloaded!', {
      description: 'Use this template to format your bulk import data.'
    });
  };

  const processBulkImport = () => {
    if (!bulkImportData.trim()) {
      toast.error('Please paste CSV data before importing');
      return;
    }

    try {
      const lines = bulkImportData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Validate headers
      const requiredHeaders = ['item name', 'model', 'supplier', 'quantity', 'unit price', 'uom', 'currency'];
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      
      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
        return;
      }

      const newItems: Omit<PurchaseItem, 'id' | 'total'>[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        if (values.length !== headers.length) {
          toast.error(`Row ${i + 1}: Incorrect number of columns`);
          return;
        }
        
        const nameIndex = headers.indexOf('item name');
        const modelIndex = headers.indexOf('model');
        const supplierIndex = headers.indexOf('supplier');
        const quantityIndex = headers.indexOf('quantity');
        const priceIndex = headers.indexOf('unit price');
        const uomIndex = headers.indexOf('uom');
        const currencyIndex = headers.indexOf('currency');
        
        const quantity = parseInt(values[quantityIndex]);
        const unitPrice = parseFloat(values[priceIndex]);
        const currency = values[currencyIndex] || DEFAULT_CURRENCY;
        
        if (isNaN(quantity) || quantity <= 0) {
          toast.error(`Row ${i + 1}: Invalid quantity value`);
          return;
        }
        
        if (isNaN(unitPrice) || unitPrice <= 0) {
          toast.error(`Row ${i + 1}: Invalid unit price value`);
          return;
        }
        
        // Validate currency
        const validCurrency = SUPPORTED_CURRENCIES.find(c => c.code === currency);
        if (!validCurrency) {
          toast.error(`Row ${i + 1}: Invalid currency code '${currency}'`);
          return;
        }
        
        newItems.push({
          name: values[nameIndex] || '',
          model: values[modelIndex] || '',
          supplier: values[supplierIndex] || '',
          quantity: quantity,
          unitPrice: unitPrice,
          uom: values[uomIndex] || 'pcs',
          currency: currency
        });
      }
      
      if (newItems.length > 0) {
        setItems(prevItems => [...prevItems, ...newItems]);
        setShowBulkImport(false);
        setBulkImportData('');
        
        toast.success(`🎉 Successfully imported ${newItems.length} items!`, {
          description: `${newItems.length} new items added to your purchase order.`,
          duration: 3000
        });
      }
      
    } catch (error) {
      toast.error('Error processing CSV data. Please check the format.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (currentView === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Purchase Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your purchase orders and track their status
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={handleAddNew} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Purchase
            </Button>
          </motion.div>
        </div>

        {/* Filters and Search */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-gray-50/50 to-purple-50/50 dark:from-gray-900/50 dark:to-purple-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-purple-500/20">
              <Filter className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-medium">Search & Filter Purchases</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by PO#, client, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/70 dark:bg-gray-800/70"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white/70 dark:bg-gray-800/70">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span>Pending</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="approved">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                      <span>Approved</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Completed</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span>Rejected</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Client Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filter by Client</Label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="bg-white/70 dark:bg-gray-800/70">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {mockClients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sort by</Label>
              <Select value={sortBy} onValueChange={(value: 'poNumber' | 'createdAt' | 'total') => setSortBy(value)}>
                <SelectTrigger className="bg-white/70 dark:bg-gray-800/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="poNumber">PO Number</SelectItem>
                  <SelectItem value="createdAt">Date Created</SelectItem>
                  <SelectItem value="total">Total Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Order</Label>
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-full justify-start bg-white/70 dark:bg-gray-800/70"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || statusFilter !== 'all' || clientFilter !== 'all') && (
            <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setClientFilter('all');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </Button>
            </div>
          )}
        </motion.div>

        {/* Purchase Details Summary */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium">Purchase Details</h3>
              <p className="text-sm text-muted-foreground">Comprehensive purchase order overview</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-white/70 dark:bg-gray-800/70">
              {filteredAndSortedPurchases.length} of {purchases.length} Purchases
            </Badge>
            {(searchTerm || statusFilter !== 'all' || clientFilter !== 'all') && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                Filtered
              </Badge>
            )}
          </div>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Purchase Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAndSortedPurchases.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {purchases.length === 0 ? 'No purchases yet' : 'No purchases match your filters'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {purchases.length === 0 
                    ? 'Get started by creating your first purchase.' 
                    : 'Try adjusting your search or filter criteria'
                  }
                </p>
                {purchases.length === 0 && (
                  <Button onClick={handleAddNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Purchase
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO#</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredAndSortedPurchases.map((purchase, index) => {
                        const client = mockClients.find(c => c.id === purchase.clientId);
                        return (
                          <motion.tr
                            key={purchase.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-muted/50"
                          >
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {purchase.poNumber}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-medium">{client?.company}</div>
                                <div className="text-sm text-muted-foreground">{client?.contactPerson}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {purchase.items.length} {purchase.items.length === 1 ? 'item' : 'items'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(purchase.total, purchase.baseCurrency || DEFAULT_CURRENCY)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(purchase.status)}>
                                {getStatusIcon(purchase.status)}
                                <span className="ml-1 capitalize">{purchase.status}</span>
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {purchase.createdAt.toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center space-x-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" onClick={() => handleView(purchase)}>
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View Details</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" onClick={() => handleEdit(purchase)}>
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit Purchase</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleDelete(purchase.id)}
                                        className="hover:text-red-600"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete Purchase</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Form view (add/edit)
  if (currentView === 'add' || currentView === 'edit') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>{editingPurchase ? 'Edit Purchase' : 'Create New Purchase'}</span>
              </CardTitle>
              <Button variant="outline" onClick={handleCancel}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to List
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium">Basic Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-xl bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-900/10 dark:to-cyan-900/10 border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    <Label htmlFor="client" className="flex items-center space-x-1">
                      <span>Client</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.clientId} onValueChange={(value: any) => setFormData({ ...formData, clientId: value })}>
                      <SelectTrigger className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{client.company}</span>
                              <span className="text-sm text-muted-foreground">{client.contactPerson}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="flex items-center space-x-1">
                      <span>Status</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.status} onValueChange={(value: Purchase['status']) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                      <Package className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Order Items</h3>
                      <Badge variant="outline" className="mt-1 bg-purple-50 text-purple-700 border-purple-200">
                        {items.length} {items.length === 1 ? 'Item' : 'Items'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Bulk Import Button */}
                    <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center space-x-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
                          title="Import multiple items from CSV"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Bulk Import</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center space-x-2">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                            <span>Bulk Import Items</span>
                          </DialogTitle>
                          <DialogDescription>
                            Import multiple items at once using CSV format. Download the sample template below to see the required format.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          {/* Sample Template Download */}
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-blue-900 dark:text-blue-100">Sample CSV Template</h4>
                                <p className="text-sm text-blue-700 dark:text-blue-300">Download this template to format your data correctly</p>
                              </div>
                              <Button onClick={generateSampleCSV} variant="outline" size="sm" className="flex items-center space-x-2">
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                              </Button>
                            </div>
                          </div>
                          
                          {/* CSV Data Input */}
                          <div className="space-y-2">
                            <Label htmlFor="csvData">Paste CSV Data</Label>
                            <Textarea
                              id="csvData"
                              placeholder="Item Name,Model,Quantity,Unit Price,UOM
Office Chair,ErgoMax Pro 2024,10,299.99,pcs
Standing Desk,FlexiDesk Height Adjustable,5,599.99,pcs"
                              value={bulkImportData}
                              onChange={(e) => setBulkImportData(e.target.value)}
                              className="min-h-[200px] font-mono text-sm"
                            />
                            <p className="text-sm text-muted-foreground">
                              Required columns: Item Name, Model, Quantity, Unit Price, UOM
                            </p>
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowBulkImport(false)}>
                            Cancel
                          </Button>
                          <Button onClick={processBulkImport} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                            <Upload className="w-4 h-4 mr-2" />
                            Import Items
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                
                {/* Add Item Form */}
                <div className="p-6 border rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-200 dark:border-blue-800">
                  <h4 className="text-lg font-medium mb-4 flex items-center space-x-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    <span>Add New Item</span>
                  </h4>
                  
                  <div className="space-y-4">
                    {/* First Row - Item Name, Model, and Supplier */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="flex items-center space-x-1">
                          <span>Item Name</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={newItem.name}
                          onChange={(e) => updateNewItem('name', e.target.value)}
                          placeholder="Enter item name"
                          className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label className="flex items-center space-x-1">
                          <span>Model</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={newItem.model}
                          onChange={(e) => updateNewItem('model', e.target.value)}
                          placeholder="Enter model number"
                          className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label className="flex items-center space-x-1">
                          <span>Supplier</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={newItem.supplier}
                          onChange={(e) => updateNewItem('supplier', e.target.value)}
                          placeholder="Enter supplier name"
                          className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    {/* Second Row - Quantity, UOM, Currency, and Unit Price */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="flex items-center space-x-1">
                          <span>Quantity</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={newItem.quantity}
                          onChange={(e) => updateNewItem('quantity', parseInt(e.target.value) || 1)}
                          placeholder="Enter quantity"
                          className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label className="flex items-center space-x-1">
                          <span>UOM</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Select value={newItem.uom} onValueChange={(value: any) => updateNewItem('uom', value)}>
                          <SelectTrigger className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500">
                            <SelectValue placeholder="Select UOM" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                            <SelectItem value="kg">Kilograms (kg)</SelectItem>
                            <SelectItem value="ltr">Liters (ltr)</SelectItem>
                            <SelectItem value="mtr">Meters (mtr)</SelectItem>
                            <SelectItem value="sqft">Square Feet (sqft)</SelectItem>
                            <SelectItem value="boxes">Boxes</SelectItem>
                            <SelectItem value="sets">Sets</SelectItem>
                            <SelectItem value="rolls">Rolls</SelectItem>
                            <SelectItem value="tons">Tons</SelectItem>
                            <SelectItem value="units">Units</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center space-x-1">
                          <span>Currency</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Select value={newItem.currency} onValueChange={(value: any) => updateNewItem('currency', value)}>
                          <SelectTrigger className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500">
                            <SelectValue placeholder="Select Currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_CURRENCIES.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                {currency.symbol} {currency.code} - {currency.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center space-x-1">
                          <span>Unit Price ({getCurrencySymbol(newItem.currency)})</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newItem.unitPrice}
                          onChange={(e) => updateNewItem('unitPrice', parseFloat(e.target.value) || 0)}
                          placeholder="Enter unit price"
                          className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    {/* Item Total Display and Save Button */}
                    <div className="flex items-center justify-between pt-4 border-t border-blue-200 dark:border-blue-700">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Item Total:</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-lg px-3 py-1">
                          {formatCurrency(calculateItemTotal(newItem.quantity, newItem.unitPrice), newItem.currency)}
                        </Badge>
                      </div>
                      <Button 
                        type="button"
                        onClick={saveNewItem}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Item
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Items List */}
                {items.length > 0 && (
                  <div className="border rounded-xl bg-white dark:bg-gray-800 overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b">
                      <h4 className="text-lg font-medium flex items-center space-x-2">
                        <Package className="w-5 h-5 text-gray-600" />
                        <span>Added Items ({items.length})</span>
                      </h4>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[180px]">Item Name</TableHead>
                            <TableHead className="w-[120px]">Model</TableHead>
                            <TableHead className="w-[140px]">Supplier</TableHead>
                            <TableHead className="w-[80px] text-center">Qty</TableHead>
                            <TableHead className="w-[70px] text-center">UOM</TableHead>
                            <TableHead className="w-[80px] text-center">Currency</TableHead>
                            <TableHead className="w-[110px] text-right">Unit Price</TableHead>
                            <TableHead className="w-[110px] text-right">Total</TableHead>
                            <TableHead className="w-[80px] text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {items.map((item, index) => (
                              <motion.tr
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                              >
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-gray-600 dark:text-gray-400">{item.model}</TableCell>
                                <TableCell className="text-gray-600 dark:text-gray-400">{item.supplier}</TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-center text-sm text-gray-500 dark:text-gray-400 uppercase">{item.uom}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="text-xs">
                                    {item.currency}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(item.unitPrice, item.currency)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(calculateItemTotal(item.quantity, item.unitPrice), item.currency)}</TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="p-6 border rounded-xl bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium">Order Summary</h3>
                </div>
                <div className="space-y-3 text-right">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(calculateSubtotal(), DEFAULT_CURRENCY)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST (18%):</span>
                    <span className="font-medium">{formatCurrency(calculateTax(calculateSubtotal()), DEFAULT_CURRENCY)}</span>
                  </div>
                  <div className="border-t border-green-200 dark:border-green-700 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-2xl font-bold text-green-600">{formatCurrency(calculateTotal(), DEFAULT_CURRENCY)}</span>
                    </div>
                  </div>
                  {items.some(item => item.currency !== DEFAULT_CURRENCY) && (
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                      <p className="text-xs text-muted-foreground italic">
                        * {getExchangeRateDisclaimer()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        All amounts converted to {DEFAULT_CURRENCY} for calculation.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-gray-500/20 to-slate-500/20">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-medium">Additional Notes</h3>
                </div>
                <div className="p-6 border rounded-xl bg-gradient-to-br from-gray-50/50 to-slate-50/50 dark:from-gray-900/10 dark:to-slate-900/10 border-gray-200 dark:border-gray-800">
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any additional notes or special instructions..."
                    rows={4}
                    className="bg-white/70 dark:bg-gray-800/70 border-gray-200 dark:border-gray-700 focus:border-gray-500"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <Save className="w-4 h-4 mr-2" />
                  {editingPurchase ? 'Update Purchase' : 'Create Purchase'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // View mode
  if (currentView === 'view' && viewPurchase) {
    const client = mockClients.find(c => c.id === viewPurchase.clientId);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>Purchase Order Details</span>
                <Badge className={getStatusColor(viewPurchase.status)}>
                  {getStatusIcon(viewPurchase.status)}
                  <span className="ml-1 capitalize">{viewPurchase.status}</span>
                </Badge>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => handleEdit(viewPurchase)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to List
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Purchase Information */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium">Purchase Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border rounded-xl bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-900/10 dark:to-cyan-900/10 border-blue-200 dark:border-blue-800">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">PO Number</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="font-mono">
                      {viewPurchase.poNumber}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Purchase ID</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="font-mono">
                      #{viewPurchase.id}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Created Date</Label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{viewPurchase.createdAt.toLocaleDateString('en-IN', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Total Items</Label>
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span>{viewPurchase.items.length} {viewPurchase.items.length === 1 ? 'item' : 'items'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Information */}
            {client && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium">Client Information</h3>
                </div>
                
                <div className="p-6 border rounded-xl bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Company</Label>
                        <p className="text-lg font-semibold">{client.company}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Contact Person</Label>
                        <p>{client.contactPerson}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                        <p>{client.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                        <p>{client.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Items Details */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium">Order Items</h3>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {viewPurchase.items.length} {viewPurchase.items.length === 1 ? 'Item' : 'Items'}
                </Badge>
              </div>

              <div className="border rounded-xl bg-white dark:bg-gray-800 overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                        <TableHead className="font-semibold">Item Name</TableHead>
                        <TableHead className="font-semibold">Model</TableHead>
                        <TableHead className="font-semibold">Supplier</TableHead>
                        <TableHead className="font-semibold text-center">Quantity</TableHead>
                        <TableHead className="font-semibold text-center">UOM</TableHead>
                        <TableHead className="font-semibold text-center">Currency</TableHead>
                        <TableHead className="font-semibold text-right">Unit Price</TableHead>
                        <TableHead className="font-semibold text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {viewPurchase.items.map((item, index) => (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          >
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-muted-foreground">{item.model}</TableCell>
                            <TableCell className="text-muted-foreground">{item.supplier || 'N/A'}</TableCell>
                            <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs uppercase">
                                {item.uom}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs">
                                {item.currency || 'INR'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.unitPrice, item.currency || 'INR')}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.total, item.currency || 'INR')}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-medium">Order Summary</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Financial Summary */}
                <div className="p-6 border rounded-xl bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200 dark:border-amber-800">
                  <h4 className="font-medium mb-4">Financial Breakdown</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(viewPurchase.subtotal, viewPurchase.baseCurrency || DEFAULT_CURRENCY)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">GST (18%):</span>
                      <span className="font-medium">{formatCurrency(viewPurchase.tax, viewPurchase.baseCurrency || DEFAULT_CURRENCY)}</span>
                    </div>
                    <div className="border-t border-amber-200 dark:border-amber-700 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total Amount:</span>
                        <span className="text-2xl font-bold text-amber-600">
                          {formatCurrency(viewPurchase.total, viewPurchase.baseCurrency || DEFAULT_CURRENCY)}
                        </span>
                      </div>
                    </div>
                    {viewPurchase.items.some(item => (item.currency || DEFAULT_CURRENCY) !== DEFAULT_CURRENCY) && (
                      <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700">
                        <p className="text-xs text-muted-foreground italic">
                          * {getExchangeRateDisclaimer()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Information */}
                <div className="p-6 border rounded-xl bg-gradient-to-br from-slate-50/50 to-gray-50/50 dark:from-slate-900/10 dark:to-gray-900/10 border-slate-200 dark:border-slate-800">
                  <h4 className="font-medium mb-4">Purchase Details</h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <Badge className={getStatusColor(viewPurchase.status)} size="lg">
                          {getStatusIcon(viewPurchase.status)}
                          <span className="ml-2 capitalize">{viewPurchase.status}</span>
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                      <p className="text-sm text-muted-foreground">
                        {viewPurchase.createdAt.toLocaleString('en-IN', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Total Items</Label>
                      <p className="text-sm text-muted-foreground">
                        {viewPurchase.items.reduce((sum, item) => sum + item.quantity, 0)} units across {viewPurchase.items.length} different items
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {viewPurchase.notes && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-gray-500/20 to-slate-500/20">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-medium">Additional Notes</h3>
                </div>
                
                <div className="p-6 border rounded-xl bg-gradient-to-br from-gray-50/50 to-slate-50/50 dark:from-gray-900/10 dark:to-slate-900/10 border-gray-200 dark:border-gray-800">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                      {viewPurchase.notes}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t">
              <Button variant="outline" onClick={handleCancel}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to List
              </Button>
              <div className="flex items-center space-x-3">
                <Button variant="outline" onClick={() => handleEdit(viewPurchase)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Purchase
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleDelete(viewPurchase.id)}
                  className="text-red-600 hover:bg-red-50 hover:border-red-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Invalid view state</p>
    </div>
  );
}