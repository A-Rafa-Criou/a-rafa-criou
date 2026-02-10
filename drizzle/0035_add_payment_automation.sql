-- Migration: Add Payment Automation for Affiliates
-- Date: 2026-01-30
-- Purpose: Enable automatic payouts via Stripe Connect and Mercado Pago Split

-- ============================================
-- AFFILIATES TABLE - Payment Automation Fields
-- ============================================

-- Preferred payment method
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS preferred_payment_method varchar(20) DEFAULT 'manual_pix';
COMMENT ON COLUMN affiliates.preferred_payment_method IS 'Payment method: stripe_connect, mercadopago_split, or manual_pix';

-- Stripe Connect fields
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_account_id varchar(255);
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_onboarding_status varchar(20) DEFAULT 'not_started';
COMMENT ON COLUMN affiliates.stripe_onboarding_status IS 'Status: not_started, pending, completed, failed';

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean DEFAULT false;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean DEFAULT false;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean DEFAULT false;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_onboarded_at timestamp;

-- Mercado Pago Split fields
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS mercadopago_account_id varchar(255);
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS mercadopago_split_status varchar(20) DEFAULT 'not_started';
COMMENT ON COLUMN affiliates.mercadopago_split_status IS 'Status: not_started, pending, completed, failed';

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS mercadopago_access_token text;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS mercadopago_public_key text;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS mercadopago_payouts_enabled boolean DEFAULT false;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS mercadopago_onboarded_at timestamp;

-- General automation fields
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS payment_automation_enabled boolean DEFAULT false;
COMMENT ON COLUMN affiliates.payment_automation_enabled IS 'Whether automatic payouts are active for this affiliate';

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS last_payout_at timestamp;
COMMENT ON COLUMN affiliates.last_payout_at IS 'Last successful automatic payout date';

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS total_paid_out decimal(10, 2) DEFAULT 0;
COMMENT ON COLUMN affiliates.total_paid_out IS 'Total amount paid out automatically (lifetime)';

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS minimum_payout_amount decimal(10, 2) DEFAULT 50.00;
COMMENT ON COLUMN affiliates.minimum_payout_amount IS 'Minimum balance to trigger automatic payout';

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_affiliates_stripe_account ON affiliates(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_affiliates_mp_account ON affiliates(mercadopago_account_id) WHERE mercadopago_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_affiliates_payment_method ON affiliates(preferred_payment_method);
CREATE INDEX IF NOT EXISTS idx_affiliates_automation_enabled ON affiliates(payment_automation_enabled) WHERE payment_automation_enabled = true;

-- ============================================
-- AFFILIATE_COMMISSIONS TABLE - Transfer Tracking
-- ============================================

-- Transfer tracking fields
ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS transfer_id varchar(255);
COMMENT ON COLUMN affiliate_commissions.transfer_id IS 'Stripe Transfer ID or Mercado Pago Split ID';

ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS transfer_status varchar(20);
COMMENT ON COLUMN affiliate_commissions.transfer_status IS 'Status: pending, processing, succeeded, failed, cancelled';

ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS transfer_error text;
COMMENT ON COLUMN affiliate_commissions.transfer_error IS 'Error message if transfer failed';

ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS transfer_attempt_count integer DEFAULT 0;
COMMENT ON COLUMN affiliate_commissions.transfer_attempt_count IS 'Number of transfer attempts (max 3)';

ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS last_transfer_attempt timestamp;
COMMENT ON COLUMN affiliate_commissions.last_transfer_attempt IS 'Timestamp of last transfer attempt';

ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS transfer_completed_at timestamp;
COMMENT ON COLUMN affiliate_commissions.transfer_completed_at IS 'Timestamp when transfer succeeded';

-- ============================================
-- TRANSFER INDEXES FOR CRON JOB
-- ============================================

CREATE INDEX IF NOT EXISTS idx_commissions_transfer_id ON affiliate_commissions(transfer_id) WHERE transfer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commissions_transfer_status ON affiliate_commissions(transfer_status) WHERE transfer_status IS NOT NULL;

-- Critical index for cron job to find commissions ready for payout
CREATE INDEX IF NOT EXISTS idx_commissions_for_payout ON affiliate_commissions(status, transfer_status, transfer_attempt_count) 
WHERE status = 'approved' AND (transfer_status IS NULL OR transfer_status = 'failed') AND transfer_attempt_count < 3;

-- ============================================
-- SITE_SETTINGS - Add Payment Automation Config
-- ============================================

-- Add default payout settings (if site_settings table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_settings') THEN
    -- Check and add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'payout_frequency') THEN
      ALTER TABLE site_settings ADD COLUMN payout_frequency varchar(20) DEFAULT 'daily';
      COMMENT ON COLUMN site_settings.payout_frequency IS 'How often to run payouts: hourly, daily, weekly';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'payout_minimum_amount') THEN
      ALTER TABLE site_settings ADD COLUMN payout_minimum_amount decimal(10, 2) DEFAULT 50.00;
      COMMENT ON COLUMN site_settings.payout_minimum_amount IS 'Global minimum amount for payouts';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'payout_service_fee_percent') THEN
      ALTER TABLE site_settings ADD COLUMN payout_service_fee_percent decimal(5, 2) DEFAULT 2.00;
      COMMENT ON COLUMN site_settings.payout_service_fee_percent IS 'Service fee percentage deducted before payout';
    END IF;
  END IF;
END $$;

-- ============================================
-- DATA VALIDATION
-- ============================================

-- Ensure existing affiliates have default values
UPDATE affiliates 
SET preferred_payment_method = 'manual_pix'
WHERE preferred_payment_method IS NULL;

UPDATE affiliates 
SET payment_automation_enabled = false
WHERE payment_automation_enabled IS NULL;

UPDATE affiliates 
SET minimum_payout_amount = 50.00
WHERE minimum_payout_amount IS NULL;

UPDATE affiliate_commissions 
SET transfer_attempt_count = 0
WHERE transfer_attempt_count IS NULL;

-- ============================================
-- CONSTRAINTS
-- ============================================

-- Add check constraints for valid enum values
ALTER TABLE affiliates 
ADD CONSTRAINT check_preferred_payment_method 
CHECK (preferred_payment_method IN ('stripe_connect', 'mercadopago_split', 'manual_pix'));

ALTER TABLE affiliates 
ADD CONSTRAINT check_stripe_onboarding_status 
CHECK (stripe_onboarding_status IN ('not_started', 'pending', 'completed', 'failed'));

ALTER TABLE affiliates 
ADD CONSTRAINT check_mercadopago_split_status 
CHECK (mercadopago_split_status IN ('not_started', 'pending', 'completed', 'failed'));

ALTER TABLE affiliate_commissions 
ADD CONSTRAINT check_transfer_status 
CHECK (transfer_status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled'));

ALTER TABLE affiliate_commissions 
ADD CONSTRAINT check_transfer_attempt_count 
CHECK (transfer_attempt_count >= 0 AND transfer_attempt_count <= 3);

-- ============================================
-- AUDIT LOG
-- ============================================

-- Optional: Create audit log for payment automation changes
CREATE TABLE IF NOT EXISTS affiliate_payout_logs (
  id serial PRIMARY KEY,
  affiliate_id integer NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  commission_ids integer[] NOT NULL,
  total_amount decimal(10, 2) NOT NULL,
  service_fee decimal(10, 2) NOT NULL,
  net_amount decimal(10, 2) NOT NULL,
  payment_method varchar(20) NOT NULL,
  transfer_id varchar(255),
  status varchar(20) NOT NULL,
  error_message text,
  created_at timestamp DEFAULT NOW(),
  completed_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_payout_logs_affiliate ON affiliate_payout_logs(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payout_logs_status ON affiliate_payout_logs(status);
CREATE INDEX IF NOT EXISTS idx_payout_logs_created ON affiliate_payout_logs(created_at);

COMMENT ON TABLE affiliate_payout_logs IS 'Audit log for all automatic payout attempts';
