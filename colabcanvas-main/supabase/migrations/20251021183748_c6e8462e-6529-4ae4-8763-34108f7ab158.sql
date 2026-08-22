-- Add reduce_motion column to profiles table
ALTER TABLE profiles 
ADD COLUMN reduce_motion BOOLEAN DEFAULT false;