import { useState, useEffect } from 'react';
import { History, Search, UserCheck, Clock } from 'lucide-react';
import api from '../utils/api';
import { mockLogs } from '../utils/mockData';
import { useAuth } from '../hooks/useAuth';

const ACTION_COLORS: Record<string, string> = {
  Login:            'bg-blue-100 text-blue-700',
  'Customer Update':'bg-green-100 text-green-700',
  'Case Forwarded': 'bg-purple-100 text-purple-700',
  'Customer Created':'bg-emerald-100 text-emerald-700',
  'Customer Deleted':'bg-red-100 text-red-700',
  'User Created':   'bg-indigo-100 text-indigo-700',
  'User Updated':   'bg-amber-100 text-amber-700',
  'User Deleted':   'bg-red-100 text-red-700',
  'Profile Updated':'bg-cyan-100 text-cyan-700',
};

const ActivityLogsPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/logs', { params: { page, limit: 15 } });
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch {
      setLogs(mockLogs as any);
      setTotal(mockLogs.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [page]);

  const filtered = logs.filter(l =>
    !search ||
    l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.details?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">
          {user?.role === 'admin' ? 'All system activities and audit trail.' : 'Your activity history.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: 'Total Actions', value: total, icon: History, color: 'bg-blue-500' },
          { label: 'Unique Users', value: [...new Set(logs.map(l => l.user_id))].length, icon: UserCheck, color: 'bg-purple-500' },
          { label: 'Today', value: logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length, icon: Clock, color: 'bg-green-500' },
        ].map(s => (
          <div key={s.label} className="bg-card p-5 rounded-xl border shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.color}`}><s.icon size={22} className="text-white" /></div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input type="text" placeholder="Search logs..."
              className="w-full pl-9 pr-4 py-2 bg-accent/50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-left">
                {['Timestamp', 'User', 'Action', 'Details', 'Entity'].map(h => (
                  <th key={h} className="px-6 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length > 0 ? filtered.map((log, i) => (
                <tr key={log.id || i} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-bold">
                        {(log.user_name || '?')[0]}
                      </div>
                      <div>
                        <p className="font-medium">{log.user_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">{log.details}</td>
                  <td className="px-6 py-4 text-muted-foreground capitalize">{log.entity_type || log.action?.toLowerCase()}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 border rounded hover:bg-accent disabled:opacity-40 text-xs font-medium">Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 border rounded hover:bg-accent disabled:opacity-40 text-xs font-medium">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogsPage;
