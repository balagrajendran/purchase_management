import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { mockPurchases, mockInvoices, mockClients } from '../data/mockData';
import { DollarSign, ShoppingCart, Users, FileText, TrendingUp, Filter, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { GlassCard } from './GlassCard';
import { Breadcrumb } from './Breadcrumb';

export function Dashboard() {
  // Filter states
  const [revenueTimeFilter, setRevenueTimeFilter] = useState('monthly');
  const [statusFilter, setStatusFilter] = useState('all');

  // Generate dynamic revenue data based on actual purchases
  const generateRevenueData = (timeFilter: string) => {
    const currentDate = new Date();
    const data = [];
    
    switch (timeFilter) {
      case 'weekly': {
        // Last 8 weeks
        for (let i = 7; i >= 0; i--) {
          const weekStart = new Date(currentDate);
          weekStart.setDate(currentDate.getDate() - (i * 7) - currentDate.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          const weekPurchases = mockPurchases.filter(purchase => {
            const purchaseDate = new Date(purchase.createdAt);
            return purchaseDate >= weekStart && purchaseDate <= weekEnd;
          });
          
          data.push({
            period: `Week ${8 - i}`,
            purchases: weekPurchases.length,
            revenue: weekPurchases.reduce((sum, purchase) => sum + purchase.total, 0)
          });
        }
        break;
      }
      
      case 'monthly': {
        // Last 6 months
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 5; i >= 0; i--) {
          const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
          const monthName = months[targetDate.getMonth()];
          
          const monthPurchases = mockPurchases.filter(purchase => {
            const purchaseDate = new Date(purchase.createdAt);
            return purchaseDate.getMonth() === targetDate.getMonth() && 
                   purchaseDate.getFullYear() === targetDate.getFullYear();
          });
          
          data.push({
            period: monthName,
            purchases: monthPurchases.length,
            revenue: monthPurchases.reduce((sum, purchase) => sum + purchase.total, 0)
          });
        }
        break;
      }
      
      case 'quarterly': {
        // Last 4 quarters
        const quarters = ['Q4', 'Q1', 'Q2', 'Q3', 'Q4'];
        for (let i = 3; i >= 0; i--) {
          const currentQuarter = Math.floor(currentDate.getMonth() / 3);
          const targetQuarter = (currentQuarter - i + 4) % 4;
          const quarterStartMonth = targetQuarter * 3;
          const quarterYear = currentDate.getFullYear() - (currentQuarter - i < 0 ? 1 : 0);
          
          const quarterPurchases = mockPurchases.filter(purchase => {
            const purchaseDate = new Date(purchase.createdAt);
            const purchaseQuarter = Math.floor(purchaseDate.getMonth() / 3);
            return purchaseQuarter === targetQuarter && 
                   purchaseDate.getFullYear() === quarterYear;
          });
          
          data.push({
            period: `${quarters[targetQuarter + 1]} ${quarterYear}`,
            purchases: quarterPurchases.length,
            revenue: quarterPurchases.reduce((sum, purchase) => sum + purchase.total, 0)
          });
        }
        break;
      }
      
      case 'yearly': {
        // Last 3 years
        for (let i = 2; i >= 0; i--) {
          const targetYear = currentDate.getFullYear() - i;
          
          const yearPurchases = mockPurchases.filter(purchase => {
            const purchaseDate = new Date(purchase.createdAt);
            return purchaseDate.getFullYear() === targetYear;
          });
          
          data.push({
            period: targetYear.toString(),
            purchases: yearPurchases.length,
            revenue: yearPurchases.reduce((sum, purchase) => sum + purchase.total, 0)
          });
        }
        break;
      }
      
      default:
        return [];
    }
    
    return data;
  };

  // Generate dynamic status data based on actual purchases
  const generateStatusData = (statusFilter: string) => {
    let filteredPurchases = mockPurchases;
    
    if (statusFilter !== 'all') {
      filteredPurchases = mockPurchases.filter(purchase => purchase.status === statusFilter);
    }
    
    const statusCounts = {
      completed: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };
    
    filteredPurchases.forEach(purchase => {
      if (statusCounts.hasOwnProperty(purchase.status)) {
        statusCounts[purchase.status as keyof typeof statusCounts]++;
      }
    });
    
    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    
    return [
      { 
        name: 'Completed', 
        value: total > 0 ? Math.round((statusCounts.completed / total) * 100) : 0, 
        count: statusCounts.completed,
        color: '#22c55e' 
      },
      { 
        name: 'Pending', 
        value: total > 0 ? Math.round((statusCounts.pending / total) * 100) : 0, 
        count: statusCounts.pending,
        color: '#f59e0b' 
      },
      { 
        name: 'Approved', 
        value: total > 0 ? Math.round((statusCounts.approved / total) * 100) : 0, 
        count: statusCounts.approved,
        color: '#3b82f6' 
      },
      { 
        name: 'Rejected', 
        value: total > 0 ? Math.round((statusCounts.rejected / total) * 100) : 0, 
        count: statusCounts.rejected,
        color: '#ef4444' 
      },
    ].filter(item => item.value > 0); // Only show statuses that have data
  };

  const revenueData = generateRevenueData(revenueTimeFilter);
  const statusData = generateStatusData(statusFilter);
  const totalRevenue = mockPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const totalPurchases = mockPurchases.length;
  const totalClients = mockClients.length;
  const totalInvoices = mockInvoices.length;

  const recentPurchases = mockPurchases
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const breadcrumbItems = [
    { label: 'Home', onClick: () => {} }
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} currentPage="Dashboard" />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.3 }}
              >
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div 
                className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                ${totalRevenue.toLocaleString()}
              </motion.div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline w-3 h-3 mr-1 text-emerald-500" />
                +12.5% from last month
              </p>
            </CardContent>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.3 }}
              >
                <ShoppingCart className="h-4 w-4 text-blue-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div 
                className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              >
                {totalPurchases}
              </motion.div>
              <p className="text-xs text-muted-foreground">
                +2 new this week
              </p>
            </CardContent>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.3 }}
              >
                <Users className="h-4 w-4 text-purple-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div 
                className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              >
                {totalClients}
              </motion.div>
              <p className="text-xs text-muted-foreground">
                +1 new client this month
              </p>
            </CardContent>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.3 }}
              >
                <FileText className="h-4 w-4 text-orange-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div 
                className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              >
                {totalInvoices}
              </motion.div>
              <p className="text-xs text-muted-foreground">
                1 pending payment
              </p>
            </CardContent>
          </GlassCard>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <GlassCard>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Revenue
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Select value={revenueTimeFilter} onValueChange={setRevenueTimeFilter}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={revenueTimeFilter === 'weekly' ? -45 : 0}
                    textAnchor={revenueTimeFilter === 'weekly' ? 'end' : 'middle'}
                    height={revenueTimeFilter === 'weekly' ? 80 : 60}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? `₹${value.toLocaleString()}` : value,
                      name === 'revenue' ? 'Revenue' : 'Purchases'
                    ]}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="url(#colorGradient)" 
                    radius={[4, 4, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
              {revenueData.length === 0 && (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No revenue data for selected period</p>
                  </div>
                </div>
              )}
            </CardContent>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassCard>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  Purchase Status Distribution
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value}% (${entry.count})`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value}% (${props.payload.count} purchases)`,
                      name
                    ]}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {statusData.length === 0 && (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No purchase data for selected status</p>
                  </div>
                </div>
              )}
              
              {/* Status Legend */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {statusData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground">
                      {entry.name}: {entry.count} purchases
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </GlassCard>
        </motion.div>
      </div>

      {/* Recent Purchases */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <GlassCard>
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Recent Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPurchases.map((purchase, index) => {
                const client = mockClients.find(c => c.id === purchase.clientId);
                return (
                  <motion.div 
                    key={purchase.id} 
                    className="flex items-center justify-between p-4 backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 border border-white/20 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                  >
                    <div>
                      <p className="font-medium">{client?.company || 'Unknown Client'}</p>
                      <p className="text-sm text-muted-foreground">
                        {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''} • {purchase.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                        ${purchase.total.toLocaleString()}
                      </span>
                      <Badge className={getStatusColor(purchase.status)}>
                        {purchase.status}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </GlassCard>
      </motion.div>
    </div>
  );
}