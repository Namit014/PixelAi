-- Enable realtime for canvas_objects table
ALTER TABLE canvas_objects REPLICA IDENTITY FULL;

-- Enable realtime for credits table (for live balance updates)
ALTER TABLE credits REPLICA IDENTITY FULL;