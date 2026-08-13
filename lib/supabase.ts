import { createClient } from '@supabase/supabase-js';

// Temporarily paste your actual URL and Key inside the single quotes
const supabaseUrl = 'https://ytdljswikekwwoketlfh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0ZGxqc3dpa2Vrd3dva2V0bGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyNjI5ODEsImV4cCI6MjEwMTgzODk4MX0.1TV1Vk73R6WN4jUoi7s6_TO5_iKGkJfbiczqAznbGkc';

export const supabase = createClient(supabaseUrl, supabaseKey);