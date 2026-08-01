-- Add video_url to products for the Shoppable Video Feed feature
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;
