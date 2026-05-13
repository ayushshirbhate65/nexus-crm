-- ============================================================
-- Run this ONCE as MySQL root to set up the CRM database user
-- Command: mysql -u root -p < setup_mysql_user.sql
-- ============================================================

-- Create MySQL user 'Ayush' if not exists
CREATE USER IF NOT EXISTS 'Ayush'@'localhost' IDENTIFIED BY 'Ayush121';

-- Create database
CREATE DATABASE IF NOT EXISTS Ayush;

-- Grant all privileges on the database to the user
GRANT ALL PRIVILEGES ON Ayush.* TO 'Ayush'@'localhost';

FLUSH PRIVILEGES;

-- Now switch to the database and create tables
USE Ayush;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_code VARCHAR(20) UNIQUE,
  name VARCHAR(150) NOT NULL,
  contact_number VARCHAR(20),
  service_type VARCHAR(100),
  call_status ENUM('pending', 'responded', 'not_responded', 'forwarded') DEFAULT 'pending',
  response_notes TEXT,
  service_done TINYINT(1) DEFAULT 0,
  forward_to_senior TINYINT(1) DEFAULT 0,
  assigned_employee_id INT,
  follow_up_date DATETIME,
  date_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_employee_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  details TEXT,
  entity_type VARCHAR(50),
  entity_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- System Settings table for storing integrations config
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default accounts
-- admin@crm.com    => Admin@123
-- employee@crm.com => Emp@123
INSERT IGNORE INTO users (name, email, password, role, avatar) VALUES
('Admin User',   'admin@crm.com',    '$2a$10$HBVgXXORXLgNokk/C0ytyO/tdP4saBA3tCJbfaEqmsSYOhWt4Ceue', 'admin',    'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'),
('John Employee','employee@crm.com', '$2a$10$V7PXDxXvxmWwnqbSI1yZO.tui4sgsG9SOJ/A0As.tqgvAlbR3VLLq', 'employee', 'https://api.dicebear.com/7.x/avataaars/svg?seed=John');

-- Default settings
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
('google_sheet_id', ''),
('google_client_email', ''),
('google_private_key', '');

INSERT IGNORE INTO customers (customer_code, name, contact_number, service_type, call_status, response_notes, service_done, forward_to_senior, assigned_employee_id, date_time) VALUES
('CUST-001','Alice Johnson', '+1 234-567-8901','Technical Support','responded',    'Resolved issue with login.',                           1,0,2,'2024-10-24 10:30:00'),
('CUST-002','Bob Smith',     '+1 234-567-8902','Billing Inquiry',  'pending',      '',                                                     0,0,2,'2024-10-24 11:15:00'),
('CUST-003','Charlie Brown', '+1 234-567-8903','Product Demo',     'forwarded',    'Customer needs complex enterprise integration details.',0,1,2,'2024-10-24 09:00:00'),
('CUST-004','Diana Prince',  '+1 234-567-8904','Warranty Claim',   'not_responded','Tried calling 3 times, no answer.',                    0,0,2,'2024-10-23 14:20:00'),
('CUST-005','Ethan Hunt',    '+1 234-567-8905','General Inquiry',  'responded',    'Information provided about new features.',              1,0,2,'2024-10-23 16:45:00');

INSERT IGNORE INTO activity_logs (user_id, user_name, action, details, entity_type) VALUES
(1,'Admin User',   'Login',           'Admin logged into the system',                       'auth'),
(2,'John Employee','Customer Update', 'Updated status for Alice Johnson to responded',      'customer'),
(2,'John Employee','Case Forwarded',  'Forwarded Charlie Brown case to senior management', 'customer'),
(1,'Admin User',   'User Created',    'New employee account created: John Employee',        'user');

SELECT 'Database setup complete!' AS status;
