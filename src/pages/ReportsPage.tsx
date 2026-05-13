import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { TrendingUp, TrendingDown, Users, CheckCircle2, PhoneMissed, PhoneCall, Download } from 'lucide-react';
import { mockCustomers } from '../utils/mockData';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6'];

const weeklyData = [
  { day: 'Mon', calls: 18, resolved: 14, pending: 4 },
  { day: 'Tue', calls: 24, resolved: 20, pending: 4 },
  { day: 'Wed', calls: 21, resolved: 13, pending: 8 },
  { day: 'Thu', calls: 28, resolved: 23, pending: 5 },
  { day: 'Fri', calls: 34, resolved: 30, pending: 4 },
  { day: 'Sat', calls: 12, resolved: 10, pending: 2 },
  { day: 'Sun', calls: 7,  resolved: 5,  pending: 2 },
];

const monthlyTrend = [
  { month: 'Jan', customers: 42 }, { month: 'Feb', customers: 55 },
  { month: 'Mar', customers: 48 }, { month: 'Apr', customers: 70 },
  { month: 'May', customers: 63 }, { month: 'Jun', customers: 82 },
  { month: 'Jul', customers: 91 }, { month: 'Aug', customers: 78 },
  { month: 'Sep', customers: 95 }, { month: 'Oct', customers: 110 },
  { month: 'Nov', customers: 98 }, { month: 'Dec', customers: 120 },
];

const serviceBreakdown = [
  { name: 'Technical Support', value: 35 },
  { name: 'Billing Inquiry', value: 25 },
  { name: 'Product Demo', value: 20 },
  { name: 'Warranty Claim', value: 12 },
  { name: 'General Inquiry', value: 8 },
];

const MetricCard = ({ title, value, sub, icon: Icon, color, trend, up }: any) => (
  <div className="bg-card p-6 rounded-xl border shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${color}`}><Icon size={22} className="text-white" /></div>
      <span className={cn("flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
        up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
        {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {trend}
      </span>
    </div>
    <p className="text-3xl font-bold">{value}</p>
    <p className="text-sm font-medium mt-1">{title}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
  </div>
);

const ReportsPage = () => {
  const [range, setRange] = useState<'weekly' | 'monthly'>('weekly');
  const responded = mockCustomers.filter(c => c.call_status === 'responded').length;
  const notResponded = mockCustomers.filter(c => c.call_status === 'not_responded').length;
  const serviceDone = mockCustomers.filter(c => c.service_done).length;

  const handleExport = () => {
    const rows = [
      ['Day', 'Total Calls', 'Resolved', 'Pending'],
      ...weeklyData.map(d => [d.day, String(d.calls), String(d.resolved), String(d.pending)])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'crm-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Performance metrics and trends across your CRM.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-accent rounded-lg p-1">
            {(['weekly','monthly'] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize",
                  range === r ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard title="Total Customers" value={mockCustomers.length} sub="All time" icon={Users} color="bg-blue-500" trend="+12%" up />
        <MetricCard title="Calls Responded" value={responded} sub="This week" icon={PhoneCall} color="bg-green-500" trend="+5%" up />
        <MetricCard title="Calls Missed" value={notResponded} sub="This week" icon={PhoneMissed} color="bg-red-500" trend="-2%" up={false} />
        <MetricCard title="Services Completed" value={serviceDone} sub="This month" icon={CheckCircle2} color="bg-emerald-500" trend="+18%" up />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-xl border shadow-sm">
          <h3 className="text-base font-semibold mb-5">
            {range === 'weekly' ? 'Weekly Call Volume' : 'Monthly Customer Growth'}
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              {range === 'weekly' ? (
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4,4,0,0]} />
                </BarChart>
              ) : (
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="customers" name="Customers" stroke="#3b82f6" fill="url(#custGrad)" strokeWidth={2} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border shadow-sm">
          <h3 className="text-base font-semibold mb-5">Service Type Breakdown</h3>
          <div className="h-[280px] flex items-center gap-6">
            <div className="flex-1 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={serviceBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                    {serviceBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}%`, 'Share']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 min-w-[150px]">
              {serviceBreakdown.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                  <span className="text-xs font-semibold ml-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl border shadow-sm">
        <h3 className="text-base font-semibold mb-5">Daily Resolution Rate</h3>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="calls" name="Total Calls" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b"><h3 className="text-base font-semibold">Weekly Summary Table</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-left">
                {['Day','Total Calls','Resolved','Pending','Resolution Rate'].map(h => (
                  <th key={h} className="px-6 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {weeklyData.map((row, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3 font-medium">{row.day}</td>
                  <td className="px-6 py-3">{row.calls}</td>
                  <td className="px-6 py-3 text-green-600 font-medium">{row.resolved}</td>
                  <td className="px-6 py-3 text-amber-600 font-medium">{row.pending}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-muted rounded-full h-1.5 max-w-[80px]">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.round((row.resolved/row.calls)*100)}%` }} />
                      </div>
                      <span className="font-medium">{Math.round((row.resolved/row.calls)*100)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
