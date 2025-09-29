import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Moon, Sun, Bell, Lock, User, Building, Palette, Save, FileText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Breadcrumb } from './Breadcrumb';

export function Settings() {
  const [settings, setSettings] = useState({
    // Appearance
    theme: 'light',
    sidebarCollapsed: false,
    
    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    invoiceReminders: true,
    
    // Company Info
    companyName: 'FedHub Software Solutions',
    companyEmail: 'info@fedhubsoftware.com',
    companyPhone: '+91 9003285428',
    companyAddress: 'P No 69,70 Gokula Nandhana, Gokul Nagar, Hosur, Krishnagiri-DT, Tamilnadu, India-635109',
    companyGST: '33AACCF2123P1Z5',
    companyPAN: 'AACCF2123P',
    companyMSME: 'UDYAM-TN-06-0012345',
    
    // Invoice Settings
    defaultTaxRate: 18,
    defaultPaymentTerms: 30,
    invoicePrefix: 'INV',
    
    // Security
    twoFactorAuth: false,
    sessionTimeout: 60,
  });

  const handleSave = () => {
    // In a real app, this would save to backend/localStorage
    toast.success('Settings saved successfully!');
  };

  const toggleTheme = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    setSettings({ ...settings, theme: newTheme });
    
    // Apply theme to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const breadcrumbItems = [
    { label: 'Home', onClick: () => {} }
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumb items={breadcrumbItems} currentPage="Settings" />
      
      <div>
        <p className="text-muted-foreground">Manage your application preferences and configuration</p>
      </div>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
            </div>
            <Button variant="outline" onClick={toggleTheme} className="flex items-center gap-2">
              {settings.theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {settings.theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Sidebar</Label>
              <p className="text-sm text-muted-foreground">Default sidebar state</p>
            </div>
            <Switch
              checked={settings.sidebarCollapsed}
              onCheckedChange={(checked) => setSettings({ ...settings, sidebarCollapsed: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Invoice Reminders</Label>
              <p className="text-sm text-muted-foreground">Automatic reminders for overdue invoices</p>
            </div>
            <Switch
              checked={settings.invoiceReminders}
              onCheckedChange={(checked) => setSettings({ ...settings, invoiceReminders: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="companyEmail">Company Email</Label>
              <Input
                id="companyEmail"
                type="email"
                value={settings.companyEmail}
                onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyPhone">Phone Number</Label>
              <Input
                id="companyPhone"
                value={settings.companyPhone}
                onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="companyAddress">Address</Label>
              <Input
                id="companyAddress"
                value={settings.companyAddress}
                onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="companyGST">GST Number</Label>
              <Input
                id="companyGST"
                placeholder="33AACCF2123P1Z5"
                maxLength={15}
                value={settings.companyGST}
                onChange={(e) => setSettings({ ...settings, companyGST: e.target.value.toUpperCase() })}
              />
              <p className="text-xs text-muted-foreground mt-1">15-digit GST identification number</p>
            </div>
            <div>
              <Label htmlFor="companyPAN">PAN Number</Label>
              <Input
                id="companyPAN"
                placeholder="AACCF2123P"
                maxLength={10}
                value={settings.companyPAN}
                onChange={(e) => setSettings({ ...settings, companyPAN: e.target.value.toUpperCase() })}
              />
              <p className="text-xs text-muted-foreground mt-1">10-character PAN number</p>
            </div>
            <div>
              <Label htmlFor="companyMSME">MSME Number</Label>
              <Input
                id="companyMSME"
                placeholder="UDYAM-XX-00-0000000"
                value={settings.companyMSME}
                onChange={(e) => setSettings({ ...settings, companyMSME: e.target.value.toUpperCase() })}
              />
              <p className="text-xs text-muted-foreground mt-1">Udyam registration number</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.defaultTaxRate}
                onChange={(e) => setSettings({ ...settings, defaultTaxRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="paymentTerms">Payment Terms (days)</Label>
              <Input
                id="paymentTerms"
                type="number"
                min="1"
                value={settings.defaultPaymentTerms}
                onChange={(e) => setSettings({ ...settings, defaultPaymentTerms: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div>
              <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
              <Input
                id="invoicePrefix"
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={settings.twoFactorAuth ? "default" : "secondary"}>
                {settings.twoFactorAuth ? "Enabled" : "Disabled"}
              </Badge>
              <Switch
                checked={settings.twoFactorAuth}
                onCheckedChange={(checked) => setSettings({ ...settings, twoFactorAuth: checked })}
              />
            </div>
          </div>
          
          <Separator />
          
          <div>
            <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
            <p className="text-sm text-muted-foreground mb-2">Automatically log out after period of inactivity</p>
            <Select 
              value={settings.sessionTimeout.toString()} 
              onValueChange={(value) => setSettings({ ...settings, sessionTimeout: parseInt(value) })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="480">8 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}