-- Add image_url column to admin_notifications for image attachments
ALTER TABLE admin_notifications 
ADD COLUMN image_url TEXT;