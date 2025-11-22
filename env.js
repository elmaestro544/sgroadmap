// This file is for environment variable configuration.
// In a real deployment, these values would be set by the server or build environment.

window.process = window.process || {};
window.process.env = {
  ...window.process.env,

  // --- Google Gemini ---
  // Get your key from: https://aistudio.google.com/app/apikey
  // You can provide multiple keys separated by a comma (e.g., 'KEY1,KEY2') to distribute usage.
  API_KEY: 'AIzaSyDHP7oZKcq-pr3MMQwwAE8gvsPsJUro5n4',

  // --- OpenAI ---
  // Get your key from: https://platform.openai.com/api-keys
  OPENAI_API_KEY: 'YOUR_OPENAI_API_KEY_HERE',

  // --- Perplexity ---
  // Get your key from: https://www.perplexity.ai/settings/api
  PERPLEXITY_API_KEY: 'YOUR_PERPLEXITY_API_KEY_HERE',

  // --- Supabase ---
  // Get these from your Supabase project settings -> API
  SUPABASE_URL: 'https://zqyifyqplzjmkqhlxcax.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxeWlmeXFwbHpqbWtxaGx4Y2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTYwNzksImV4cCI6MjA3ODE5MjA3OX0.7OXCAshdOOwu0tE9XAxAef3DHUNYNgAwea_wnB5_vcI',
  
};