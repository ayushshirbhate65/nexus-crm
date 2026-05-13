import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, ShieldCheck, User, Search } from 'lucide-react';
import api from '../utils/api';
import { mockUsers } from '../utils/mockData';

const ROLE_STYLES: Record<string, string> = {
  admin:    'bg-purple-100 text-purple-700',
  employee: 'bg-blue-100 text-blue-700',
};

// ── Add/Edit User Modal ──────────────────────────────────────
const UserModal = ({ user, onClose, onSave }: {
  user: any | null; onClose: () => void; onSave: (data: any) => Promise<void>;
}) => {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'employee',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && !form.password) { setError('Password is required for new users'); return; }
    setLoading(true); setError('');
    try { await onSave(form); onClose(); }
    catch (err: any) { setError(err?.response?.data?.error || 'Failed to save user'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl border w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">{isEdit ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name *</label>
            <input required className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="John Doe" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email *</label>
            <input required type="email" className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="user@crm.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input type="password" className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
              value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Role *</label>
            <select className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
              value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Role Permissions:</p>
            <p><span className="font-medium text-purple-600">Admin</span> — Full access: manage users, all customers, reports, settings</p>
            <p><span className="font-medium text-blue-600">Employee</span> — View & update assigned customers, follow-ups, own logs</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-lg hover:bg-accent text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-70">
              {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────
const UserManagementPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch {
      setUsers(mockUsers as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSave = async (form: any) => {
    if (editUser) {
      await api.put(`/users/${editUser.id}`, form);
      showToast('User updated successfully');
    } else {
      await api.post('/users', form);
      showToast('User created successfully');
    }
    loadUsers();
  };

  const handleDelete = async (u: any) => {
    if (!confirm(`Delete "${u.name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      showToast(`${u.name} deleted`);
      loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Delete failed');
    }
  };

  const filtered = users.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const admins = filtered.filter(u => u.role === 'admin');
  const employees = filtered.filter(u => u.role === 'employee');

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage employee accounts and access roles.</p>
        </div>
        <button onClick={() => { setEditUser(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium w-fit">
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Role Permissions Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[
          { role: 'Admin', icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200',
            perms: ['Full system access', 'Manage all users', 'View all customers', 'Delete records', 'Access reports & settings'] },
          { role: 'Employee', icon: User, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200',
            perms: ['View assigned customers', 'Update call status & notes', 'Log follow-ups', 'View own activity logs'] },
        ].map(({ role, icon: Icon, color, bg, perms }) => (
          <div key={role} className={`p-5 rounded-xl border ${bg}`}>
            <div className={`flex items-center gap-2 mb-3 font-semibold ${color}`}>
              <Icon size={18} /> {role} Role
            </div>
            <ul className="space-y-1.5">
              {perms.map(p => (
                <li key={p} className="text-sm flex items-center gap-2 text-muted-foreground">
                  <span className="text-green-500">✓</span> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input type="text" placeholder="Search users..."
          className="w-full pl-9 pr-4 py-2 bg-card border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">All Users ({filtered.length})</h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-500 rounded-full" /> {admins.length} Admins</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full" /> {employees.length} Employees</span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="divide-y">
            {filtered.map(u => (
              <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}
                    alt={u.name} className="w-10 h-10 rounded-full border bg-accent" />
                  <div>
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ROLE_STYLES[u.role] || 'bg-muted text-muted-foreground'}`}>
                    {u.role}
                  </span>
                  <p className="text-xs text-muted-foreground hidden md:block">
                    Since {new Date(u.created_at || Date.now()).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditUser(u); setShowModal(true); }}
                      className="p-1.5 hover:bg-accent rounded-md text-muted-foreground" title="Edit">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(u)}
                      className="p-1.5 hover:bg-red-50 rounded-md text-red-500" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">No users found.</div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <UserModal user={editUser} onClose={() => { setShowModal(false); setEditUser(null); }} onSave={handleSave} />
      )}
    </div>
  );
};

export default UserManagementPage;
