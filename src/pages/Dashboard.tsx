import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  PhoneCall, 
  PhoneMissed, 
  Forward, 
  CheckCircle2, 
  Clock,
  TrendingUp
} from 'lucide-react';
import api from '../utils/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { mockCustomers } from '../utils/mockData';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <div className="bg-card p-6 rounded-xl border shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs font-medium text-green-600">
          <TrendingUp size={14} />
          {trend}
        </div>
      )}
    </div>
    <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
    <p className="text-2xl font-bold mt-1">{value}</p>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [dbStats, setDbStats] = useState<any>(null);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => setDbStats(res.data))
      .catch(() => setDbStats(null));
  }, []);

  const s = dbStats || {
    total: mockCustomers.length,
    responded: mockCustomers.filter(c => c.call_status === 'responded').length,
    missed: mockCustomers.filter(c => c.call_status === 'not_responded').length,
    forwarded: mockCustomers.filter(c => c.forward_to_senior).length,
    completed: mockCustomers.filter(c => c.service_done).length,
    pending: mockCustomers.filter(c => !c.service_done).length,
  };

  const stats = [
    { title: 'Total Customers',    value: s.total,     icon: Users,        color: 'bg-blue-500',    trend: '+12%' },
    { title: 'Calls Responded',    value: s.responded,  icon: PhoneCall,    color: 'bg-green-500',   trend: '+5%'  },
    { title: 'Calls Missed',       value: s.missed,     icon: PhoneMissed,  color: 'bg-red-500',     trend: '-2%'  },
    { title: 'Forwarded to Senior',value: s.forwarded,  icon: Forward,      color: 'bg-purple-500',  trend: '+8%'  },
    { title: 'Completed Services', value: s.completed,  icon: CheckCircle2, color: 'bg-emerald-500', trend: '+15%' },
    { title: 'Pending Services',   value: s.pending,    icon: Clock,        color: 'bg-amber-500',   trend: '-10%' },
  ];

  const pieData = [
    { name: 'Responded', value: 45 },
    { name: 'Missed', value: 15 },
    { name: 'Pending', value: 25 },
    { name: 'Forwarded', value: 15 },
  ];

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];

  const performanceData = [
    { name: 'Mon', completed: 12, pending: 4 },
    { name: 'Tue', completed: 19, pending: 2 },
    { name: 'Wed', completed: 15, pending: 8 },
    { name: 'Thu', completed: 22, pending: 5 },
    { name: 'Fri', completed: 30, pending: 3 },
    { name: 'Sat', completed: 10, pending: 1 },
    { name: 'Sun', completed: 5, pending: 2 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Call Response Status</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                <span className="text-sm text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Employee Performance (Weekly)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl border shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Recent Customer Activity</h3>
          <button onClick={() => navigate('/customers')} className="text-sm text-primary font-medium hover:underline">View all →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-4 font-semibold text-sm">Customer</th>
                <th className="pb-4 font-semibold text-sm">Status</th>
                <th className="pb-4 font-semibold text-sm">Assigned To</th>
                <th className="pb-4 font-semibold text-sm">Service</th>
                <th className="pb-4 font-semibold text-sm">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockCustomers.slice(0, 5).map((customer) => (
                <tr key={customer.id} className="group hover:bg-muted/50 transition-colors">
                  <td className="py-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{customer.name}</span>
                      <span className="text-xs text-muted-foreground">{customer.id}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-medium",
                      customer.call_status === 'responded' && "bg-green-100 text-green-700",
                      customer.call_status === 'pending' && "bg-amber-100 text-amber-700",
                      customer.call_status === 'forwarded' && "bg-purple-100 text-purple-700",
                      customer.call_status === 'not_responded' && "bg-red-100 text-red-700",
                    )}>
                      {customer.call_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 text-sm">{customer.assigned_employee_name}</td>
                  <td className="py-4 text-sm">{customer.service_type}</td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {new Date(customer.date_time).toLocaleDateString()}
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

export default Dashboard;
