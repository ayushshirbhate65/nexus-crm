import React, { useState } from 'react';
import { User, Lock, Save, Eye, EyeOff, Bell, Database, Shield, FileSpreadsheet, RefreshCw, ExternalLink, Users, PlusCircle } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const SettingsPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'profile' | 'security' | 'notifications' | 'system' | 'integrations' | 'staff'>('profile');
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState(false);

  const showToast = (msg: string, isError = false) => {
    setToast(msg); setToastError(isError);
    setTimeout(() => setToast(''), 3500);
  };

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [profileLoading, setProfileLoading] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await api.put('/settings/profile', { name });
      showToast('Profile updated successfully!');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to update profile', true);
    } finally {
      setProfileLoading(false);
    }
  };

  // Password form
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) { showToast('New passwords do not match', true); return; }
    if (newPwd.length < 6) { showToast('Password must be at least 6 characters', true); return; }
    setPwdLoading(true);
    try {
      await api.put('/settings/profile', { name, currentPassword: currentPwd, newPassword: newPwd });
      showToast('Password changed successfully!');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Password change failed', true);
    } finally {
      setPwdLoading(false);
    }
  };

  // Notification preferences (local state only)
  const [notifs, setNotifs] = useState({
    newCustomer: true, callMissed: true, followUpReminder: true, systemAlerts: false,
  });

  // Google Sheets Config
  const [googleConfig, setGoogleConfig] = useState({ spreadsheetId: '', clientEmail: '', privateKey: '' });
  const [configLoading, setConfigLoading] = useState(false);

  React.useEffect(() => {
    if (tab === 'integrations' && user?.role === 'admin') {
      api.get('/settings/google').then(res => setGoogleConfig(res.data)).catch(() => {});
    }
  }, [tab, user]);

  const handleGoogleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigLoading(true);
    try {
      await api.post('/settings/google', googleConfig);
      showToast('Integrations updated!');
    } catch (err: any) {
      showToast('Failed to update config', true);
    } finally {
      setConfigLoading(false);
    }
  };

  // Staff creation form
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', role: 'employee' });
  const [staffLoading, setStaffLoading] = useState(false);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.email || !staffForm.password) {
      showToast('Please fill all fields', true);
      return;
    }
    setStaffLoading(true);
    try {
      await api.post('/users', staffForm);
      showToast(`Employee ${staffForm.name} created successfully!`);
      setStaffForm({ name: '', email: '', password: '', role: 'employee' });
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to create employee', true);
    } finally {
      setStaffLoading(false);
    }
  };

  const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(user?.role === 'admin' ? [
      { id: 'staff', label: 'Staff', icon: Users },
      { id: 'integrations', label: 'Integrations', icon: FileSpreadsheet },
      { id: 'system', label: 'System', icon: Database }
    ] : []),
  ] as const;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium text-white ${toastError ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and configuration.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-accent/60 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b"><h2 className="font-semibold text-lg">Profile Information</h2></div>
          <form onSubmit={handleProfileSave} className="p-6 space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-5">
              <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                alt={user?.name} className="w-20 h-20 rounded-full border-4 border-primary/20 bg-accent" />
              <div>
                <p className="font-bold text-lg">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>{user?.role}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Display Name</label>
                <input className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email Address</label>
                <input disabled className="w-full px-3 py-2 border rounded-lg bg-muted/50 outline-none text-sm text-muted-foreground cursor-not-allowed"
                  value={user?.email} />
                <p className="text-xs text-muted-foreground">Email cannot be changed. Contact admin.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Role</label>
                <input disabled className="w-full px-3 py-2 border rounded-lg bg-muted/50 outline-none text-sm text-muted-foreground cursor-not-allowed capitalize"
                  value={user?.role} />
              </div>
            </div>

            <button type="submit" disabled={profileLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-70">
              <Save size={16} /> {profileLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {tab === 'security' && (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b"><h2 className="font-semibold text-lg">Change Password</h2></div>
          <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
            {[
              { label: 'Current Password', value: currentPwd, onChange: setCurrentPwd, placeholder: '••••••••' },
              { label: 'New Password', value: newPwd, onChange: setNewPwd, placeholder: 'Min. 6 characters' },
              { label: 'Confirm New Password', value: confirmPwd, onChange: setConfirmPwd, placeholder: 'Repeat new password' },
            ].map(f => (
              <div key={f.label} className="space-y-1.5">
                <label className="text-sm font-medium">{f.label}</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'}
                    className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm pr-10"
                    value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}

            <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground">
              Password must be at least 6 characters long. Use a mix of letters, numbers and symbols for better security.
            </div>

            <button type="submit" disabled={pwdLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-70">
              <Shield size={16} /> {pwdLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b"><h2 className="font-semibold text-lg">Notification Preferences</h2></div>
          <div className="p-6 space-y-5">
            {[
              { key: 'newCustomer', label: 'New Customer Assigned', desc: 'Get notified when a customer is assigned to you' },
              { key: 'callMissed', label: 'Call Missed Alert', desc: 'Alert when a call is marked as not responded' },
              { key: 'followUpReminder', label: 'Follow-up Reminders', desc: 'Reminders for scheduled follow-up calls' },
              { key: 'systemAlerts', label: 'System Alerts', desc: 'System maintenance and update notifications' },
            ].map(n => (
              <div key={n.key} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
                <button onClick={() => setNotifs(prev => ({ ...prev, [n.key]: !prev[n.key as keyof typeof prev] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${notifs[n.key as keyof typeof notifs] ? 'bg-primary' : 'bg-muted'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    notifs[n.key as keyof typeof notifs] ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
            <button onClick={() => showToast('Preferences saved!')}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
              <Save size={16} /> Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* Integrations Tab (admin only) */}
      {tab === 'integrations' && user?.role === 'admin' && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-700 rounded-lg"><FileSpreadsheet size={20} /></div>
                <h2 className="font-semibold text-lg">Google Sheets Sync</h2>
              </div>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Real-time Sync Active</span>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Sync Status</h3>
                  <div className="p-4 bg-muted/30 rounded-xl border space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Auto-sync:</span>
                      <span className="text-green-600 font-bold">Enabled</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Sync:</span>
                      <span className="font-medium">Just now</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rows Synced:</span>
                      <span className="font-medium">All Customers</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Configuration</h3>
                  <form onSubmit={handleGoogleSave} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">Spreadsheet ID</label>
                      <input className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
                        placeholder="e.g. 1aBC...xyZ"
                        value={googleConfig.spreadsheetId} onChange={e => setGoogleConfig({...googleConfig, spreadsheetId: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">Service Account Email</label>
                      <input className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
                        placeholder="service-account@project.iam.gserviceaccount.com"
                        value={googleConfig.clientEmail} onChange={e => setGoogleConfig({...googleConfig, clientEmail: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">Private Key</label>
                      <textarea className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-xs font-mono h-20"
                        placeholder="-----BEGIN PRIVATE KEY-----\n..."
                        value={googleConfig.privateKey} onChange={e => setGoogleConfig({...googleConfig, privateKey: e.target.value})} />
                    </div>
                    <button type="submit" disabled={configLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-70">
                      <Save size={16} /> {configLoading ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </form>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                <p className="font-semibold flex items-center gap-2 mb-1"><RefreshCw size={14} /> How it works</p>
                <p className="text-xs opacity-90">Every time you add or update a customer in this CRM, the corresponding row in your Google Sheet is automatically updated. Changes are reflected instantly.</p>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <button 
                  onClick={async () => {
                    try {
                      showToast('Syncing all data...');
                      await api.post('/google-sheets/sync');
                      showToast('Google Sheet updated successfully!');
                    } catch (err: any) {
                      showToast(err?.response?.data?.error || 'Sync failed', true);
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-all shadow-md active:scale-95"
                >
                  <RefreshCw size={18} /> Run Full Sync Now
                </button>
                
                <a 
                  href={`https://docs.google.com/spreadsheets/d/${process.env.VITE_GOOGLE_SHEET_ID || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-card border rounded-lg text-sm font-bold hover:bg-accent transition-all"
                >
                  <ExternalLink size={18} /> Open Google Sheet
                </a>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-lg">Setup Instructions</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>1. Create a Project in <a href="https://console.cloud.google.com/" className="text-primary hover:underline">Google Cloud Console</a>.</p>
              <p>2. Enable the <strong>Google Sheets API</strong>.</p>
              <p>3. Create a <strong>Service Account</strong> and download the JSON key.</p>
              <p>4. Share your Google Sheet with the Service Account email (Editor permissions).</p>
              <p>5. Copy the <code>Spreadsheet ID</code> from the sheet URL and paste it into <code>.env</code>.</p>
            </div>
          </div>
        </div>
      )}

      {/* Staff Tab (admin only) */}
      {tab === 'staff' && user?.role === 'admin' && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Users size={20} /></div>
                <h2 className="font-semibold text-lg">Create Employee Account</h2>
              </div>
              <a href="/users" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                Manage all users <ExternalLink size={14} />
              </a>
            </div>
            
            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name</label>
                  <input required className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
                    placeholder="Employee Name"
                    value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email Address (Login ID)</label>
                  <input required type="email" className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
                    placeholder="employee@company.com"
                    value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Password</label>
                  <input required type="password" title="At least 6 characters" className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
                    placeholder="••••••••"
                    value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Role</label>
                  <select className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
                    value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})}>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                Newly created employees can login immediately with the email and password provided above.
              </div>

              <button type="submit" disabled={staffLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-70">
                <PlusCircle size={16} /> {staffLoading ? 'Creating...' : 'Create Employee Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* System Tab (admin only) */}
      {tab === 'system' && user?.role === 'admin' && (
        <div className="space-y-5">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b"><h2 className="font-semibold text-lg">Database Configuration</h2></div>
            <div className="p-6 space-y-4 text-sm">
              {[
                ['Host', 'localhost'],
                ['Database', 'Ayush'],
                ['User', 'Ayush'],
                ['Status', '🟢 Connected'],
                ['Port', '3306 (MySQL)'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-muted-foreground font-medium">{k}</span>
                  <span className="font-mono font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b"><h2 className="font-semibold text-lg">API Server</h2></div>
            <div className="p-6 space-y-4 text-sm">
              {[
                ['Backend URL', 'http://localhost:5000'],
                ['Frontend URL', 'http://localhost:5173'],
                ['Auth', 'JWT (8h expiry)'],
                ['Version', '1.0.0'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-muted-foreground font-medium">{k}</span>
                  <span className="font-mono font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
