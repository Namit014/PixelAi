-- Add missing subscription tier enum values
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'starter';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'business';

-- Add billing_period column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS billing_period text;