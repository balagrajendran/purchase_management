import React, { useState, useCallback, useEffect } from 'react';
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
  Download
} from 'lucide-react';
import { mockPurchases, mockClients } from '../data/mockData';

export function PurchaseManagementNew() {
  const [currentView, setCurrentView] = useState<'list' | 'add' | 'edit' | 'view'>('list');
  const [purchases, setPurchases] = useState<Purchase[]>(mockPurchases);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
  
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
    quantity: 1,
    unitPrice: 0,
    uom: 'pcs'
  });

  // Calculation functions
  const calculateItemTotal = (quantity: number, unitPrice: number) => quantity * unitPrice;
  
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item.quantity, item.unitPrice), 0);
  };
  
  const calculateTax = (subtotal: number) => subtotal * 0.18; // 18% GST
  
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + calculateTax(subtotal);
  };

  const resetForm = () => {
    setFormData({ clientId: '', status: 'pending', notes: '' });
    setItems([]);
    setNewItem({
      name: '',
      model: '',
      quantity: 1,
      unitPrice: 0,
      uom: 'pcs'
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
          ? { ...purchase, ...formData, items: purchaseItems, subtotal, tax, total }
          : purchase
      ));
      toast.success('Purchase updated successfully!');
    } else {
      const newPurchase: Purchase = {
        id: Date.now().toString(),
        ...formData,
        items: purchaseItems,
        subtotal,
        tax,
        total,
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
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      uom: item.uom,
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
    if (!newItem.name.trim() || !newItem.model.trim() || newItem.quantity <= 0 || newItem.unitPrice <= 0) {
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
      quantity: 1,
      unitPrice: 0,
      uom: 'pcs'
    });

    toast.success('Item added successfully!', {
      description: `${itemToAdd.name} has been added to your order.`
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
      ['Item Name', 'Model', 'Quantity', 'Unit Price', 'UOM'],
      ['Sample Item 1', 'Model ABC-123', '10', '99.99', 'pcs'],
      ['Sample Item 2', 'Model XYZ-456', '5', '199.99', 'kg'],
      ['Sample Item 3', 'Model DEF-789', '25', '49.99', 'boxes']
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
      const requiredHeaders = ['item name', 'model', 'quantity', 'unit price', 'uom'];
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
        const quantityIndex = headers.indexOf('quantity');
        const priceIndex = headers.indexOf('unit price');
        const uomIndex = headers.indexOf('uom');
        
        const quantity = parseInt(values[quantityIndex]);
        const unitPrice = parseFloat(values[priceIndex]);
        
        if (isNaN(quantity) || quantity <= 0) {
          toast.error(`Row ${i + 1}: Invalid quantity value`);
          return;
        }
        
        if (isNaN(unitPrice) || unitPrice <= 0) {
          toast.error(`Row ${i + 1}: Invalid unit price value`);
          return;
        }
        
        newItems.push({
          name: values[nameIndex] || '',
          model: values[modelIndex] || '',
          quantity: quantity,
          unitPrice: unitPrice,
          uom: values[uomIndex] || 'pcs'
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Purchase Orders</span>
              <Badge variant="outline" className="ml-2">
                {purchases.length} Total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No purchases yet</h3>
                <p className="text-gray-500 mb-4">Get started by creating your first purchase.</p>
                <Button onClick={handleAddNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Purchase
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                      {purchases.map((purchase) => {
                        const client = mockClients.find(c => c.id === purchase.clientId);
                        return (
                          <motion.tr
                            key={purchase.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="hover:bg-muted/50"
                          >
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
                              ₹{purchase.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                      <SelectTrigger className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.company} - {client.contactPerson}
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="flex items-center space-x-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300">
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
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Import multiple items from CSV</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                {/* Add Item Form */}
                <div className="p-6 border rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-200 dark:border-blue-800">
                  <h4 className="text-lg font-medium mb-4 flex items-center space-x-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    <span>Add New Item</span>
                  </h4>
                  
                  <div className="space-y-4">
                    {/* First Row - Item Name and Model */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                    
                    {/* Second Row - Quantity, UOM, and Unit Price */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <Select value={newItem.uom} onValueChange={(value) => updateNewItem('uom', value)}>
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
                          <span>Unit Price (₹)</span>
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
                          ₹{calculateItemTotal(newItem.quantity, newItem.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            <TableHead className="w-[200px]">Item Name</TableHead>
                            <TableHead className="w-[150px]">Model</TableHead>
                            <TableHead className="w-[100px] text-center">Qty</TableHead>
                            <TableHead className="w-[80px] text-center">UOM</TableHead>
                            <TableHead className="w-[120px] text-right">Unit Price</TableHead>
                            <TableHead className="w-[120px] text-right">Total</TableHead>
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
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-center text-sm text-gray-500 dark:text-gray-400 uppercase">{item.uom}</TableCell>
                                <TableCell className="text-right">₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-right font-medium">₹{calculateItemTotal(item.quantity, item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
                    <span className="font-medium">₹{calculateSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST (18%):</span>
                    <span className="font-medium">₹{calculateTax(calculateSubtotal()).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-green-200 dark:border-green-700 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-2xl font-bold text-green-600">₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
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

  // View mode would go here
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">View mode implementation...</p>
    </div>
  );
}