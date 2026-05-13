import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Download, Plus, MoreVertical, ExternalLink,
  RefreshCw, X, ChevronLeft, ChevronRight, Edit2, Trash2, Upload, FileSpreadsheet
} from 'lucide-react';
import Papa from 'papaparse';
import api from '../utils/api';
import { mockCustomers } from '../utils/mockData';
import { useAuth } from '../hooks/useAuth';
import { Customer } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const STATUS_STYLES: Record<string, string> = {
  responded:     'bg-green-100 text-green-700',
  pending:       'bg-amber-100 text-amber-700',
  forwarded:     'bg-purple-100 text-purple-700',
  not_responded: 'bg-red-100 text-red-700',
};

const SERVICE_TYPES = ['Technical Support','Billing Inquiry','Product Demo','Warranty Claim','General Inquiry'];
const CALL_STATUSES = ['pending','responded','not_responded','forwarded'];

// ── Modal: Add / Edit Customer ──────────────────────────────
const CustomerModal = ({ customer, employees, onClose, onSave, isAdmin }: {
  customer: Partial<Customer> | null;
  employees: any[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  isAdmin: boolean;
}) => {
  const isEdit = !!customer?.id;
  const [form, setForm] = useState({
    name: customer?.name || '',
    contact_number: customer?.contact_number || '',
    service_type: customer?.service_type || SERVICE_TYPES[0],
    call_status: customer?.call_status || 'pending',
    response_notes: customer?.response_notes || '',
    service_done: customer?.service_done || false,
    forward_to_senior: customer?.forward_to_senior || false,
    assigned_employee_id: customer?.assigned_employee_id || '',
    follow_up_date: customer?.follow_up_date || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await onSave(form); onClose(); }
    catch (err: any) { setError(err?.response?.data?.error || 'Failed to save'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border-none w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">{isEdit ? 'Edit Customer' : 'Add New Customer'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          {isAdmin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-medium">Full Name *</label>
                  <input required className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Customer Name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Contact Number</label>
                  <input className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
                    value={form.contact_number} onChange={e => setForm({...form, contact_number: e.target.value})} placeholder="+1 234-567-8900" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Assign To</label>
                  <select className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
                    value={form.assigned_employee_id} onChange={e => setForm({...form, assigned_employee_id: e.target.value})}>
                    <option value="">Unassigned</option>
                    {employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Service Type</label>
                  <select className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
                    value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})}>
                    {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Follow-up Date</label>
                  <input type="datetime-local" className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
                    value={form.follow_up_date} onChange={e => setForm({...form, follow_up_date: e.target.value})} />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Call Status</label>
            <select className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
              value={form.call_status} onChange={e => setForm({...form, call_status: e.target.value as any})}>
              {CALL_STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Response Notes</label>
            <textarea rows={3} className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm resize-none"
              value={form.response_notes} onChange={e => setForm({...form, response_notes: e.target.value})} placeholder="Add notes..." />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" className="w-4 h-4 rounded accent-primary"
                checked={form.service_done} onChange={e => setForm({...form, service_done: e.target.checked})} />
              Service Done
            </label>
            {isAdmin && (
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" className="w-4 h-4 rounded accent-primary"
                  checked={form.forward_to_senior} onChange={e => setForm({...form, forward_to_senior: e.target.checked})} />
                Forward to Senior
              </label>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-lg hover:bg-accent text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-70">
              {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Customer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Modal: Customer Detail ───────────────────────────────────
const DetailModal = ({ customer, onClose, onEdit }: { customer: Customer; onClose: () => void; onEdit: () => void }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl border-none w-full max-w-md">
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-xl font-bold">Customer Details</h2>
        <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg"><X size={20} /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {customer.name[0]}
          </div>
          <div>
            <h3 className="text-lg font-bold">{customer.name}</h3>
            <p className="text-sm text-muted-foreground">{customer.customer_code || customer.id}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Contact', customer.contact_number],
            ['Service', customer.service_type],
            ['Status', customer.call_status?.replace('_',' ')],
            ['Assigned To', customer.assigned_employee_name],
            ['Service Done', customer.service_done ? 'Yes ✓' : 'No'],
            ['Forwarded', customer.forward_to_senior ? 'Yes' : 'No'],
            ['Date', new Date(customer.date_time).toLocaleString()],
          ].map(([k, v]) => (
            <div key={k} className="space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{k}</p>
              <p className="font-medium">{v || '—'}</p>
            </div>
          ))}
        </div>
        {customer.response_notes && (
          <div className="space-y-1 pt-2 border-t">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Notes</p>
            <p className="text-sm">{customer.response_notes}</p>
          </div>
        )}
        <button onClick={onEdit} className="w-full mt-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2">
          <Edit2 size={16} /> Edit Customer
        </button>
      </div>
    </div>
  </div>
);

// ── Modal: Google Sheet Import ─────────────────────────────
const GoogleImportModal = ({ onClose, onImport }: { onClose: () => void, onImport: (url: string) => Promise<void> }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true); setError('');
    try {
      await onImport(url);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Import failed. Check URL and API setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border-none w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Import from Google Sheet</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg"><X size={20} /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Paste your Google Sheet URL below to import all customer data. Make sure the sheet is shared with your service account email.</p>
        <form onSubmit={handleImport} className="space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Spreadsheet URL</label>
            <input required className="w-full px-3 py-2.5 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-lg hover:bg-accent text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading || !url}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-70 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Upload size={18} /> Import Now</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main CustomerList Component ──────────────────────────────
const ITEMS_PER_PAGE = 8;

const CustomerList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [useRealApi, setUseRealApi] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // ── Load customers ─────────────────────────────────────────
  const loadCustomers = async () => {
    setLoading(true);
    try {
      if (useRealApi) {
        const res = await api.get('/customers', {
          params: { search: searchTerm, status: statusFilter, page, limit: ITEMS_PER_PAGE }
        });
        setCustomers(res.data.customers);
        setTotal(res.data.total);
      } else {
        // Fallback to mock data
        let filtered = mockCustomers.filter(c => {
          const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c as any).id.toString().includes(searchTerm);
          const matchStatus = statusFilter === 'all' || (c as any).call_status === statusFilter;
          return matchSearch && matchStatus;
        });
        setTotal(filtered.length);
        setCustomers(filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) as any);
      }
    } catch {
      setUseRealApi(false);
      let filtered = mockCustomers.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c as any).id.toString().includes(searchTerm);
        const matchStatus = statusFilter === 'all' || (c as any).call_status === statusFilter;
        return matchSearch && matchStatus;
      });
      setTotal(filtered.length);
      setCustomers(filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) as any);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await api.get('/users');
      setEmployees(res.data.filter((u: any) => u.role === 'employee'));
    } catch { /* no employees list if not admin */ }
  };

  useEffect(() => { loadCustomers(); }, [searchTerm, statusFilter, page, useRealApi]);
  useEffect(() => { if (isAdmin) loadEmployees(); }, [isAdmin]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Actions ────────────────────────────────────────────────
  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => { setIsSyncing(false); loadCustomers(); }, 2000);
  };

  const handleDownload = () => {
    if (!customers || customers.length === 0) {
      alert('No data to export');
      return;
    }
    try {
      const headers = ['ID', 'Name', 'Contact', 'Service Type', 'Status', 'Assigned To', 'Service Done', 'Date'];
      const rows = customers.map(c => [
        c.customer_code || c.id || '', 
        c.name || '', 
        c.contact_number || '', 
        c.service_type || '',
        c.call_status || '', 
        c.assigned_employee_name || '',
        c.service_done ? 'Yes' : 'No', 
        new Date(c.date_time || Date.now()).toLocaleDateString()
      ]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `customers_${new Date().getTime()}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export Error:', err);
      alert('Failed to export CSV: ' + err.message);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setLoading(true);
          const data = results.data.map((row: any) => ({
            name: row.Name || row.name || '',
            contact_number: row.Contact || row.contact || row.Phone || row.phone || '',
            service_type: row.Service || row.service || 'Imported'
          }));
          
          await api.post('/customers/bulk', data);
          alert(`Successfully imported ${data.length} customers`);
          loadCustomers();
        } catch (err: any) {
          alert('Import failed: ' + (err.response?.data?.error || err.message));
        } finally {
          setLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  const handleSaveCustomer = async (form: any) => {
    if (editCustomer) {
      await api.put(`/customers/${editCustomer.id}`, form);
    } else {
      await api.post('/customers', form);
    }
    loadCustomers();
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete "${customer.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/customers/${customer.id}`);
      loadCustomers();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'Manage all customer interactions.' : 'View your assigned customers.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition-colors text-sm font-medium">
            <Upload size={16} /> Import CSV
          </button>
          <button onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition-colors text-sm font-medium">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={handleSync} disabled={isSyncing}
            className={cn("flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition-colors text-sm font-medium",
              isSyncing && "opacity-50 cursor-not-allowed")}>
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            Sync
          </button>
          {isAdmin && (
            <button onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-green-200 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-bold shadow-sm">
              <FileSpreadsheet size={16} /> Link Google Sheet
            </button>
          )}
          {isAdmin && (
            <button onClick={() => { setEditCustomer(null); setShowAddModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium">
              <Plus size={16} /> Add Customer
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card border rounded-xl shadow-sm">
        {/* Filters */}
        <div className="p-4 border-b flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input type="text" placeholder="Search by name, ID or phone..."
              className="w-full pl-10 pr-4 py-2 bg-accent/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
              value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-accent/50 rounded-lg">
              <Filter size={16} className="text-muted-foreground" />
              <select className="bg-transparent border-none outline-none text-sm"
                value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="responded">Responded</option>
                <option value="not_responded">Not Responded</option>
                <option value="forwarded">Forwarded</option>
              </select>
            </div>
            <button onClick={handleDownload} title="Export CSV"
              className="p-2 border rounded-lg hover:bg-accent transition-colors">
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left bg-muted/30">
                <th className="px-6 py-4 font-semibold text-sm">Customer</th>
                <th className="px-6 py-4 font-semibold text-sm">Contact</th>
                <th className="px-6 py-4 font-semibold text-sm">Status</th>
                <th className="px-6 py-4 font-semibold text-sm">Service</th>
                <th className="px-6 py-4 font-semibold text-sm">Assigned To</th>
                <th className="px-6 py-4 font-semibold text-sm text-center">Done</th>
                <th className="px-6 py-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Loading...
                  </div>
                </td></tr>
              ) : customers.length > 0 ? customers.map(customer => (
                <tr key={(customer as any).id || customer.id} className="hover:bg-muted/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {customer.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.customer_code || customer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{customer.contact_number}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", STATUS_STYLES[customer.call_status])}>
                      {customer.call_status?.replace('_',' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{customer.service_type}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold">
                        {(customer.assigned_employee_name || '?')[0]}
                      </div>
                      {customer.assigned_employee_name || 'Unassigned'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold",
                      customer.service_done ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground")}>
                      {customer.service_done ? '✓' : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1" ref={openMenu === String(customer.id) ? menuRef : undefined}>
                      <button onClick={() => setDetailCustomer(customer)}
                        className="p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground" title="View Details">
                        <ExternalLink size={15} />
                      </button>
                      <button onClick={() => { setEditCustomer(customer); setShowAddModal(true); }}
                        className="p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground" title="Edit">
                        <Edit2 size={15} />
                      </button>
                      {isAdmin && (
                        <div className="relative">
                          <button onClick={() => setOpenMenu(prev => prev === String(customer.id) ? null : String(customer.id))}
                            className="p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground">
                            <MoreVertical size={15} />
                          </button>
                          {openMenu === String(customer.id) && (
                            <div className="absolute right-0 mt-1 w-36 bg-card border rounded-lg shadow-lg z-20 overflow-hidden">
                              <button onClick={() => { setEditCustomer(customer); setShowAddModal(true); setOpenMenu(null); }}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent flex items-center gap-2">
                                <Edit2 size={14} /> Edit
                              </button>
                              <button onClick={() => { handleDelete(customer); setOpenMenu(null); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                  No customers found matching your criteria.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {customers.length} of {total} customers</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 border rounded hover:bg-accent disabled:opacity-40 flex items-center gap-1">
              <ChevronLeft size={16} /> Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={cn("w-8 h-8 rounded border text-sm font-medium",
                  page === p ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent")}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
              className="p-1.5 border rounded hover:bg-accent disabled:opacity-40 flex items-center gap-1">
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <CustomerModal
          customer={editCustomer}
          employees={employees}
          isAdmin={isAdmin}
          onClose={() => { setShowAddModal(false); setEditCustomer(null); }}
          onSave={handleSaveCustomer}
        />
      )}

      {/* Detail Modal */}
      {detailCustomer && (
        <DetailModal
          customer={detailCustomer}
          onClose={() => setDetailCustomer(null)}
          onEdit={() => { setEditCustomer(detailCustomer); setDetailCustomer(null); setShowAddModal(true); }}
        />
      )}
      {/* Google Import Modal */}
      {showImportModal && (
        <GoogleImportModal
          onClose={() => setShowImportModal(false)}
          onImport={async (url) => {
            await api.post('/google-sheets/import', { spreadsheetId: url });
            alert('Import successful!');
            loadCustomers();
          }}
        />
      )}
    </div>
  );
};

export default CustomerList;
