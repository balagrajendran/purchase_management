import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  Plus, 
  Edit, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  CreditCard, 
  FileText, 
  Copy, 
  ArrowLeft,
  Users,
  Save,
  X,
  CheckCircle,
  Search,
  Filter,
  Trash2,
  MoreVertical,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { mockClients } from '../data/mockData';
import { Client } from '../types';
import { Breadcrumb } from './Breadcrumb';
import { toast } from 'sonner@2.0.3';
import { motion, AnimatePresence } from 'motion/react';

export function ClientManagement() {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [currentView, setCurrentView] = useState<'list' | 'add' | 'edit'>('list');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [sameAsBilling, setSameAsBilling] = useState(true);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'company' | 'createdAt' | 'city'>('company');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [formData, setFormData] = useState({
    // Basic Information
    company: '',
    contactPerson: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
    
    // Business Information
    gstNumber: '',
    msmeNumber: '',
    panNumber: '',
    
    // Billing Address
    billingAddress: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India'
    },
    
    // Shipping Address
    shippingAddress: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India'
    },
    
    // Banking Information
    bankDetails: {
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      accountHolderName: ''
    }
  });

  const resetForm = () => {
    setFormData({
      company: '',
      contactPerson: '',
      email: '',
      phone: '',
      status: 'active' as 'active' | 'inactive',
      gstNumber: '',
      msmeNumber: '',
      panNumber: '',
      billingAddress: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India'
      },
      shippingAddress: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India'
      },
      bankDetails: {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: ''
      }
    });
    setSameAsBilling(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const clientData: Client = {
      id: editingClient?.id || Date.now().toString(),
      company: formData.company,
      contactPerson: formData.contactPerson,
      email: formData.email,
      phone: formData.phone,
      status: formData.status,
      gstNumber: formData.gstNumber,
      msmeNumber: formData.msmeNumber,
      panNumber: formData.panNumber,
      billingAddress: formData.billingAddress,
      shippingAddress: sameAsBilling ? formData.billingAddress : formData.shippingAddress,
      sameAsShipping: sameAsBilling,
      bankDetails: formData.bankDetails.bankName ? formData.bankDetails : undefined,
      // Legacy fields
      name: formData.contactPerson,
      address: `${formData.billingAddress.street}, ${formData.billingAddress.city}, ${formData.billingAddress.state} ${formData.billingAddress.postalCode}`,
      createdAt: editingClient?.createdAt || new Date(),
    };

    if (editingClient) {
      setClients(clients.map(client => 
        client.id === editingClient.id ? clientData : client
      ));
      toast.success('Client updated successfully!');
    } else {
      setClients([...clients, clientData]);
      toast.success('Client added successfully!');
    }
    
    setCurrentView('list');
    resetForm();
    setEditingClient(null);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      company: client.company,
      contactPerson: client.contactPerson,
      email: client.email,
      phone: client.phone,
      status: client.status || 'active',
      gstNumber: client.gstNumber || '',
      msmeNumber: client.msmeNumber || '',
      panNumber: client.panNumber || '',
      billingAddress: client.billingAddress,
      shippingAddress: client.shippingAddress || client.billingAddress,
      bankDetails: client.bankDetails || {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: ''
      }
    });
    setSameAsBilling(client.sameAsShipping || false);
    setCurrentView('edit');
  };

  const handleDelete = (clientId: string) => {
    setClients(clients.filter(client => client.id !== clientId));
    toast.success('Client deleted successfully!');
  };

  const handleAddNew = () => {
    setEditingClient(null);
    resetForm();
    setCurrentView('add');
  };

  const handleCancel = () => {
    setCurrentView('list');
    resetForm();
    setEditingClient(null);
  };

  const copyShippingFromBilling = () => {
    if (sameAsBilling) {
      setFormData(prev => ({
        ...prev,
        shippingAddress: { ...prev.billingAddress }
      }));
    }
  };

  const getBreadcrumbItems = () => {
    const items = [{ label: 'Home', onClick: () => {} }];
    
    if (currentView === 'add') {
      items.push({ label: 'Client Management', onClick: () => setCurrentView('list') });
      return { items, currentPage: 'Add Client' };
    } else if (currentView === 'edit') {
      items.push({ label: 'Client Management', onClick: () => setCurrentView('list') });
      return { items, currentPage: 'Edit Client' };
    }
    
    return { items, currentPage: 'Client Management' };
  };

  const { items: breadcrumbItems, currentPage } = getBreadcrumbItems();

  // Filtered and sorted clients
  const filteredAndSortedClients = useMemo(() => {
    let filtered = clients.filter(client => {
      const matchesSearch = 
        client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm);
      
      const matchesState = stateFilter === 'all' || client.billingAddress.state === stateFilter;
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      
      return matchesSearch && matchesState && matchesStatus;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;
      
      switch (sortBy) {
        case 'company':
          aValue = a.company;
          bValue = b.company;
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'city':
          aValue = a.billingAddress.city;
          bValue = b.billingAddress.city;
          break;
        default:
          aValue = a.company;
          bValue = b.company;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [clients, searchTerm, stateFilter, statusFilter, sortBy, sortOrder]);

  // Get unique states for filter dropdown
  const uniqueStates = useMemo(() => {
    const states = [...new Set(clients.map(client => client.billingAddress.state))];
    return states.filter(state => state).sort();
  }, [clients]);

  // List View
  if (currentView === 'list') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <Breadcrumb items={breadcrumbItems} currentPage={currentPage} />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Client Management
              </h1>
            </div>
          </div>
          
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={handleAddNew}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Client
            </Button>
          </motion.div>
        </div>

        {/* Filters and Search */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-900/50 dark:to-blue-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-blue-500/20">
              <Filter className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-medium">Search & Filter Clients</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by company, contact, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/70 dark:bg-gray-800/70"
                />
              </div>
            </div>

            {/* State Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filter by State</Label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="bg-white/70 dark:bg-gray-800/70">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {uniqueStates.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectItem value="active">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>Active</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                      <span>Inactive</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sort by</Label>
              <Select value={sortBy} onValueChange={(value: 'company' | 'createdAt' | 'city') => setSortBy(value)}>
                <SelectTrigger className="bg-white/70 dark:bg-gray-800/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company Name</SelectItem>
                  <SelectItem value="createdAt">Date Added</SelectItem>
                  <SelectItem value="city">City</SelectItem>
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
          {(searchTerm || stateFilter !== 'all' || statusFilter !== 'all') && (
            <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStateFilter('all');
                  setStatusFilter('all');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </Button>
            </div>
          )}
        </motion.div>

        {/* Client Details Summary */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">Client Details</h3>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-white/70 dark:bg-gray-800/70">
              {filteredAndSortedClients.length} of {clients.length} Clients
            </Badge>
            {(searchTerm || stateFilter !== 'all' || statusFilter !== 'all') && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Filtered
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Clients List */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
        >
          {filteredAndSortedClients.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 px-8"
            >
              <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">
                {searchTerm || stateFilter !== 'all' ? 'No clients match your filters' : 'No clients found'}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchTerm || stateFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Add your first client to get started'
                }
              </p>
            </motion.div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50">
                  <TableHead className="font-medium">Company</TableHead>
                  <TableHead className="font-medium">Contact Person</TableHead>
                  <TableHead className="font-medium">Email</TableHead>
                  <TableHead className="font-medium">Phone</TableHead>
                  <TableHead className="font-medium">Location</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredAndSortedClients.map((client, index) => (
                    <motion.tr
                      key={client.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="group border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 transition-all duration-300"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-300">
                            <Building className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                              {client.company}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{client.contactPerson}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2 group/email">
                          <Mail className="w-4 h-4 text-muted-foreground group-hover/email:text-blue-600 transition-colors" />
                          <span className="text-sm group-hover/email:text-blue-600 transition-colors truncate max-w-[200px]">
                            {client.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2 group/phone">
                          <Phone className="w-4 h-4 text-muted-foreground group-hover/phone:text-green-600 transition-colors" />
                          <span className="text-sm group-hover/phone:text-green-600 transition-colors">
                            {client.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2 group/location">
                          <MapPin className="w-4 h-4 text-muted-foreground group-hover/location:text-purple-600 transition-colors" />
                          <span className="text-sm group-hover/location:text-purple-600 transition-colors truncate max-w-[150px]">
                            {client.billingAddress.city}, {client.billingAddress.state}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={client.status === 'active' ? 'default' : 'secondary'}
                          className={client.status === 'active' 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-sm' 
                            : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0 shadow-sm'
                          }
                        >
                          {client.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-center space-x-1">
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(client)}
                              className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                              title="Edit Client"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </Button>
                          </motion.div>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                                  title="Delete Client"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </motion.div>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{client.company}</strong>? 
                                  This action cannot be undone and will permanently remove all client data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(client.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Client
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </motion.div>
      </motion.div>
    );
  }

  // Add/Edit Form View
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <Breadcrumb items={breadcrumbItems} currentPage={currentPage} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Clients</span>
            </Button>
          </motion.div>
          
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20">
              {editingClient ? <Edit className="w-6 h-6 text-blue-600" /> : <Plus className="w-6 h-6 text-blue-600" />}
            </div>
            <div>
              <h1 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h1>
              <p className="text-muted-foreground">
                {editingClient ? 'Update client information below' : 'Enter comprehensive client details including business information, addresses, and banking details'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <TabsTrigger value="basic" className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Basic Info</span>
                  </TabsTrigger>
                  <TabsTrigger value="business" className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Business</span>
                  </TabsTrigger>
                  <TabsTrigger value="address" className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>Addresses</span>
                  </TabsTrigger>
                  <TabsTrigger value="banking" className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Banking</span>
                  </TabsTrigger>
                </TabsList>
                
                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-medium">Basic Information</h3>
                      <Badge variant="secondary">Required</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="company" className="flex items-center space-x-1">
                          <span>Company Name</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => setFormData({...formData, company: e.target.value})}
                          required
                          placeholder="Enter company name"
                          className="bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactPerson" className="flex items-center space-x-1">
                          <span>Contact Person</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="contactPerson"
                          value={formData.contactPerson}
                          onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                          required
                          placeholder="Enter contact person name"
                          className="bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center space-x-1">
                          <span>Email Address</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          required
                          placeholder="Enter email address"
                          className="bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center space-x-1">
                          <span>Phone Number</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          required
                          placeholder="Enter phone number"
                          className="bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="status" className="flex items-center space-x-1">
                          <span>Status</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => setFormData({...formData, status: value})}>
                          <SelectTrigger className="bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-blue-500">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span>Active</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="inactive">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                <span>Inactive</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div></div>
                    </div>
                  </motion.div>
                </TabsContent>
                
                {/* Business Information Tab */}
                <TabsContent value="business" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                        <FileText className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="text-lg font-medium">Business Information</h3>
                      <Badge variant="secondary">Required</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="gstNumber" className="flex items-center space-x-1">
                          <span>GST Number</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="gstNumber"
                          value={formData.gstNumber}
                          onChange={(e) => setFormData({...formData, gstNumber: e.target.value})}
                          required
                          placeholder="22AAAAA0000A1Z5"
                          maxLength={15}
                          className="bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-green-500 transition-colors"
                        />
                        <p className="text-xs text-muted-foreground">15-digit GST identification number</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="panNumber" className="flex items-center space-x-1">
                          <span>PAN Number</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="panNumber"
                          value={formData.panNumber}
                          onChange={(e) => setFormData({...formData, panNumber: e.target.value.toUpperCase()})}
                          required
                          placeholder="ABCDE1234F"
                          maxLength={10}
                          className="bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-green-500 transition-colors"
                        />
                        <p className="text-xs text-muted-foreground">10-character PAN number</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="msmeNumber" className="flex items-center space-x-1">
                        <span>MSME Number</span>
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="msmeNumber"
                        value={formData.msmeNumber}
                        onChange={(e) => setFormData({...formData, msmeNumber: e.target.value})}
                        required
                        placeholder="UDYAM-XX-00-0000000"
                        className="bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-green-500 transition-colors"
                      />
                      <p className="text-xs text-muted-foreground">Udyam registration number for MSME benefits</p>
                    </div>
                  </motion.div>
                </TabsContent>
                
                {/* Addresses Tab */}
                <TabsContent value="address" className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    {/* Billing Address */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
                          <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-medium">Billing Address</h3>
                        <Badge variant="secondary">Required</Badge>
                      </div>
                      
                      <div className="space-y-4 p-6 border rounded-xl bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-900/10 dark:to-cyan-900/10 border-blue-200 dark:border-blue-800">
                        <div className="space-y-2">
                          <Label htmlFor="billingStreet" className="flex items-center space-x-1">
                            <span>Street Address</span>
                            <span className="text-red-500">*</span>
                          </Label>
                          <Textarea
                            id="billingStreet"
                            value={formData.billingAddress.street}
                            onChange={(e) => setFormData({
                              ...formData,
                              billingAddress: { ...formData.billingAddress, street: e.target.value }
                            })}
                            required
                            placeholder="Enter street address"
                            rows={2}
                            className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500 transition-colors"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="billingCity" className="flex items-center space-x-1">
                              <span>City</span>
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="billingCity"
                              value={formData.billingAddress.city}
                              onChange={(e) => setFormData({
                                ...formData,
                                billingAddress: { ...formData.billingAddress, city: e.target.value }
                              })}
                              required
                              placeholder="Enter city"
                              className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500 transition-colors"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="billingState" className="flex items-center space-x-1">
                              <span>State</span>
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="billingState"
                              value={formData.billingAddress.state}
                              onChange={(e) => setFormData({
                                ...formData,
                                billingAddress: { ...formData.billingAddress, state: e.target.value }
                              })}
                              required
                              placeholder="Enter state"
                              className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="billingPostalCode" className="flex items-center space-x-1">
                              <span>Postal Code</span>
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="billingPostalCode"
                              value={formData.billingAddress.postalCode}
                              onChange={(e) => setFormData({
                                ...formData,
                                billingAddress: { ...formData.billingAddress, postalCode: e.target.value }
                              })}
                              required
                              placeholder="Enter postal code"
                              className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500 transition-colors"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="billingCountry" className="flex items-center space-x-1">
                              <span>Country</span>
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="billingCountry"
                              value={formData.billingAddress.country}
                              onChange={(e) => setFormData({
                                ...formData,
                                billingAddress: { ...formData.billingAddress, country: e.target.value }
                              })}
                              required
                              placeholder="Enter country"
                              className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Shipping Address */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                            <MapPin className="w-5 h-5 text-green-600" />
                          </div>
                          <h3 className="text-lg font-medium">Shipping Address</h3>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="sameAsBilling"
                              checked={sameAsBilling}
                              onCheckedChange={(checked: any) => {
                                setSameAsBilling(checked as boolean);
                                if (checked) {
                                  copyShippingFromBilling();
                                }
                              }}
                            />
                            <Label htmlFor="sameAsBilling" className="text-sm">Same as billing address</Label>
                          </div>
                          {sameAsBilling && (
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={copyShippingFromBilling}
                                className="flex items-center space-x-1"
                              >
                                <Copy className="w-4 h-4" />
                                <span>Copy</span>
                              </Button>
                            </motion.div>
                          )}
                        </div>
                      </div>
                      
                      {!sameAsBilling && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 p-6 border rounded-xl bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="shippingStreet">Street Address</Label>
                            <Textarea
                              id="shippingStreet"
                              value={formData.shippingAddress.street}
                              onChange={(e) => setFormData({
                                ...formData,
                                shippingAddress: { ...formData.shippingAddress, street: e.target.value }
                              })}
                              placeholder="Enter street address"
                              rows={2}
                              className="bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-700 focus:border-green-500 transition-colors"
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="shippingCity">City</Label>
                              <Input
                                id="shippingCity"
                                value={formData.shippingAddress.city}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  shippingAddress: { ...formData.shippingAddress, city: e.target.value }
                                })}
                                placeholder="Enter city"
                                className="bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-700 focus:border-green-500 transition-colors"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="shippingState">State</Label>
                              <Input
                                id="shippingState"
                                value={formData.shippingAddress.state}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  shippingAddress: { ...formData.shippingAddress, state: e.target.value }
                                })}
                                placeholder="Enter state"
                                className="bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-700 focus:border-green-500 transition-colors"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="shippingPostalCode">Postal Code</Label>
                              <Input
                                id="shippingPostalCode"
                                value={formData.shippingAddress.postalCode}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  shippingAddress: { ...formData.shippingAddress, postalCode: e.target.value }
                                })}
                                placeholder="Enter postal code"
                                className="bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-700 focus:border-green-500 transition-colors"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="shippingCountry">Country</Label>
                              <Input
                                id="shippingCountry"
                                value={formData.shippingAddress.country}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  shippingAddress: { ...formData.shippingAddress, country: e.target.value }
                                })}
                                placeholder="Enter country"
                                className="bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-700 focus:border-green-500 transition-colors"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </TabsContent>
                
                {/* Banking Information Tab */}
                <TabsContent value="banking" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                        <CreditCard className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-medium">Banking Details</h3>
                      <Badge variant="outline">Optional</Badge>
                    </div>
                    
                    <div className="space-y-4 p-6 border rounded-xl bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10 border-purple-200 dark:border-purple-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bankName">Bank Name</Label>
                          <Input
                            id="bankName"
                            value={formData.bankDetails.bankName}
                            onChange={(e) => setFormData({
                              ...formData,
                              bankDetails: { ...formData.bankDetails, bankName: e.target.value }
                            })}
                            placeholder="Enter bank name"
                            className="bg-white/70 dark:bg-gray-800/70 border-purple-200 dark:border-purple-700 focus:border-purple-500 transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accountHolderName">Account Holder Name</Label>
                          <Input
                            id="accountHolderName"
                            value={formData.bankDetails.accountHolderName}
                            onChange={(e) => setFormData({
                              ...formData,
                              bankDetails: { ...formData.bankDetails, accountHolderName: e.target.value }
                            })}
                            placeholder="Enter account holder name"
                            className="bg-white/70 dark:bg-gray-800/70 border-purple-200 dark:border-purple-700 focus:border-purple-500 transition-colors"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="accountNumber">Account Number</Label>
                          <Input
                            id="accountNumber"
                            value={formData.bankDetails.accountNumber}
                            onChange={(e) => setFormData({
                              ...formData,
                              bankDetails: { ...formData.bankDetails, accountNumber: e.target.value }
                            })}
                            placeholder="Enter account number"
                            className="bg-white/70 dark:bg-gray-800/70 border-purple-200 dark:border-purple-700 focus:border-purple-500 transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ifscCode">IFSC Code</Label>
                          <Input
                            id="ifscCode"
                            value={formData.bankDetails.ifscCode}
                            onChange={(e) => setFormData({
                              ...formData,
                              bankDetails: { ...formData.bankDetails, ifscCode: e.target.value.toUpperCase() }
                            })}
                            placeholder="SBIN0001234"
                            maxLength={11}
                            className="bg-white/70 dark:bg-gray-800/70 border-purple-200 dark:border-purple-700 focus:border-purple-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>
              </Tabs>
              
              {/* Action Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel}
                    className="flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingClient ? 'Update Client' : 'Add Client'}</span>
                  </Button>
                </motion.div>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}