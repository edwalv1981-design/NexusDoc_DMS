-- NexusDoc DMS Initial Database Setup

-- 1. Usuarios Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    nationality VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'client', -- 'admin', 'client'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'authorized', 'revoked'
    initial_form VARCHAR(255),
    security_code VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Templates Table
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    prefix VARCHAR(50),
    file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Form Data Table (Specific for document flows)
CREATE TABLE IF NOT EXISTS form_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    form_type VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Initial Master Admin
-- Note: Password 'Master123*' should be hashed in a real scenario, 
-- but for initial setup we will use the plain password if handled by the backend logic 
-- or a pre-hashed version. For now, we insert it and the backend will handle the verification.
INSERT INTO users (name, email, password, role, status)
VALUES ('Admin Master', 'Admin', 'Master123*', 'admin', 'authorized')
ON CONFLICT (email) DO NOTHING;

-- Example entries for the bitácora
INSERT INTO audit_logs (action, description)
VALUES ('SYSTEM_INIT', 'Base de datos inicializada correctamente');
