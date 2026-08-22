ALTER TABLE presentation_chats 
ADD CONSTRAINT presentation_chats_pres_user_unique 
UNIQUE (presentation_id, user_id);