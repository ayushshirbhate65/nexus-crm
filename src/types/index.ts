// Types for the CRM
export type Role = 'admin' | 'employee' | 'senior_manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export type CallStatus = 'pending' | 'responded' | 'not_responded' | 'forwarded';

export interface Customer {
  id: string;
  customer_code?: string;
  name: string;
  contact_number: string;
  service_type: string;
  call_status: CallStatus;
  response_notes: string;
  service_done: boolean;
  forward_to_senior: boolean;
  assigned_employee_id: string;
  assigned_employee_name?: string;
  date_time: string;
  follow_up_date?: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
}
