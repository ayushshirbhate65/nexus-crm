import { useState, useEffect } from 'react';
import { Calendar, Phone, Clock, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';
import { mockCustomers } from '../utils/mockData';
import { Customer } from '../types';

// ── Reschedule Modal ─────────────────────────────────────────
const RescheduleModal = ({ customer, onClose, onSave }: {
  customer: Customer; onClose: () => void; onSave: (date: string, note: string) => Promise<void>;
}) => {
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await onSave(date, note); onClose(); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border-none w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold">Reschedule Follow-up</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Scheduling for <span className="font-semibold text-foreground">{customer.name}</span>
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Follow-up Date & Time *</label>
            <input required type="datetime-local" min={new Date().toISOString().slice(0,16)}
              className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
              value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Note (optional)</label>
            <textarea rows={3} placeholder="Add a note for this follow-up..."
              className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm resize-none"
              value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-lg hover:bg-accent text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-70">
              {loading ? 'Saving...' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Call Modal ───────────────────────────────────────────────
const CallModal = ({ customer, onClose, onDone }: {
  customer: Customer; onClose: () => void; onDone: (notes: string, status: string) => Promise<void>;
}) => {
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('responded');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await onDone(notes, status); onClose(); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border-none w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold">Log Call Result</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Phone size={22} className="text-green-600" />
            </div>
            <div>
              <p className="font-semibold">{customer.name}</p>
              <p className="text-sm text-muted-foreground">{customer.contact_number}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Call Outcome</label>
            <select className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm"
              value={status} onChange={e => setStatus(e.target.value)}>
              <option value="responded">Responded ✓</option>
              <option value="not_responded">Not Responded</option>
              <option value="forwarded">Forwarded to Senior</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Call Notes</label>
            <textarea rows={3} placeholder="What happened on this call?"
              className="w-full px-3 py-2 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary outline-none text-sm resize-none"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-lg hover:bg-accent text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-70 flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> {loading ? 'Saving...' : 'Log Call'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────
const FollowUpPage = () => {
  const [followUps, setFollowUps] = useState<Customer[]>([]);
  const [callTarget, setCallTarget] = useState<Customer | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Customer | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadFollowUps = async () => {
    try {
      const res = await api.get('/customers', { params: { status: 'pending', limit: 50 } });
      const notRes = await api.get('/customers', { params: { status: 'not_responded', limit: 50 } });
      setFollowUps([...res.data.customers, ...notRes.data.customers]);
    } catch {
      const fallback = mockCustomers.filter(c => c.call_status === 'pending' || c.call_status === 'not_responded');
      setFollowUps(fallback as any);
    }
  };

  useEffect(() => { loadFollowUps(); }, []);

  const handleCallDone = async (notes: string, status: string) => {
    if (!callTarget) return;
    try {
      await api.put(`/customers/${(callTarget as any).id}`, {
        call_status: status,
        response_notes: notes,
        service_done: status === 'responded',
      });
      showToast(`Call logged for ${callTarget.name}`);
      loadFollowUps();
    } catch {
      showToast('Saved locally (server unavailable)');
    }
  };

  const handleReschedule = async (date: string, note: string) => {
    if (!rescheduleTarget) return;
    try {
      await api.put(`/customers/${(rescheduleTarget as any).id}`, {
        call_status: 'pending',
        response_notes: note || rescheduleTarget.response_notes,
        follow_up_date: date,
      });
      showToast(`Follow-up rescheduled for ${rescheduleTarget.name}`);
      loadFollowUps();
    } catch {
      showToast('Rescheduled (server unavailable)');
    }
  };

  const todayCount = followUps.filter(c => {
    if (!(c as any).follow_up_date) return false;
    const d = new Date((c as any).follow_up_date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const upcomingCount = followUps.filter(c => {
    if (!(c as any).follow_up_date) return false;
    const d = new Date((c as any).follow_up_date);
    const future = new Date(); future.setDate(future.getDate() + 7);
    return d > new Date() && d <= future;
  }).length;

  const overdueCount = followUps.filter(c => c.call_status === 'not_responded').length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Follow-ups</h1>
        <p className="text-muted-foreground mt-1">Manage scheduled calls and pending interactions.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl border shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3 text-amber-600 mb-2">
            <Clock size={20} /><h3 className="font-semibold">Today's Tasks</h3>
          </div>
          <p className="text-3xl font-bold">{todayCount || followUps.filter(c => c.call_status === 'pending').length}</p>
          <p className="text-sm text-muted-foreground mt-1">Pending follow-ups</p>
        </div>
        <div className="bg-card p-6 rounded-xl border shadow-sm border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <Calendar size={20} /><h3 className="font-semibold">Upcoming</h3>
          </div>
          <p className="text-3xl font-bold">{upcomingCount || followUps.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Next 7 days</p>
        </div>
        <div className="bg-card p-6 rounded-xl border shadow-sm border-l-4 border-l-red-500">
          <div className="flex items-center gap-3 text-red-600 mb-2">
            <AlertCircle size={20} /><h3 className="font-semibold">Overdue</h3>
          </div>
          <p className="text-3xl font-bold">{overdueCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Not responded — urgent</p>
        </div>
      </div>

      {/* Follow-up Cards */}
      {followUps.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">
          <CheckCircle2 size={48} className="mx-auto mb-3 text-green-500 opacity-50" />
          <p className="font-semibold">All clear! No pending follow-ups.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {followUps.map(customer => (
            <div key={(customer as any).id || customer.id}
              className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-lg font-bold">
                    {customer.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{customer.name}</h4>
                    <p className="text-sm text-muted-foreground">{customer.contact_number}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  customer.call_status === 'not_responded' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {customer.call_status?.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar size={15} />
                  <span>Last: {new Date(customer.date_time).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone size={15} />
                  <span>Service: {customer.service_type}</span>
                </div>
                {customer.follow_up_date && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                    <Clock size={15} />
                    <span>Scheduled: {new Date(customer.follow_up_date).toLocaleString()}</span>
                  </div>
                )}
                {customer.response_notes && (
                  <p className="text-sm text-muted-foreground italic mt-1 line-clamp-2">"{customer.response_notes}"</p>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setCallTarget(customer)}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2">
                  <Phone size={15} /> Call Now
                </button>
                <button onClick={() => setRescheduleTarget(customer)}
                  className="flex-1 py-2.5 border rounded-lg font-medium hover:bg-accent transition-colors text-sm flex items-center justify-center gap-2">
                  <Calendar size={15} /> Reschedule
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {callTarget && (
        <CallModal customer={callTarget} onClose={() => setCallTarget(null)} onDone={handleCallDone} />
      )}
      {rescheduleTarget && (
        <RescheduleModal customer={rescheduleTarget} onClose={() => setRescheduleTarget(null)} onSave={handleReschedule} />
      )}
    </div>
  );
};

export default FollowUpPage;
