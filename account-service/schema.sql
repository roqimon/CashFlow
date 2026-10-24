CREATE TABLE IF NOT EXISTS cashflow_accounts (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cashflow_accounts_email_lowercase CHECK (email = lower(email))
);
CREATE UNIQUE INDEX IF NOT EXISTS cashflow_accounts_email_uq ON cashflow_accounts (lower(email));

CREATE TABLE IF NOT EXISTS cashflow_sessions (
  token_hash char(64) PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES cashflow_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS cashflow_sessions_account_idx ON cashflow_sessions (account_id, expires_at);

CREATE TABLE IF NOT EXISTS cashflow_auth_tokens (
  token_hash char(64) PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES cashflow_accounts(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cashflow_auth_attempts (
  subject_hash char(64) NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cashflow_auth_attempts_time_idx ON cashflow_auth_attempts (attempted_at);
CREATE INDEX IF NOT EXISTS cashflow_auth_attempts_subject_time_idx ON cashflow_auth_attempts (subject_hash, attempted_at);

CREATE TABLE IF NOT EXISTS cashflow_transactions (
  account_id uuid NOT NULL REFERENCES cashflow_accounts(id) ON DELETE CASCADE,
  transaction_id text NOT NULL,
  payload jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  client_updated_at timestamptz,
  server_updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1,
  PRIMARY KEY (account_id, transaction_id)
);
CREATE INDEX IF NOT EXISTS cashflow_transactions_account_updated_idx ON cashflow_transactions (account_id, server_updated_at);

CREATE TABLE IF NOT EXISTS cashflow_documents (
  account_id uuid NOT NULL REFERENCES cashflow_accounts(id) ON DELETE CASCADE,
  document_key text NOT NULL,
  payload jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  client_updated_at timestamptz,
  server_updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1,
  PRIMARY KEY (account_id, document_key)
);
