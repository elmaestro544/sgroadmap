
// This file is for environment variable configuration.
// It serves as a runtime fallback if the build tool (Vite/Coolify) hasn't injected variables.

window.process = window.process || {};
window.process.env = {
  ...window.process.env,

  // --- Configuration Instructions ---
  // 1. DO NOT commit actual API keys to this file or GitHub.
  // 2. Use Environment Variables in your hosting provider (e.g., Coolify).
  //    - Set VITE_API_KEY for Google Gemini
  //    - Set VITE_OPENAI_API_KEY for OpenAI
  // 3. This file will automatically read those variables if injected during build.

  // --- Google Gemini ---
  // Expected Env Var: VITE_API_KEY
  API_KEY: '', 

  // --- OpenAI ---
  // Expected Env Var: VITE_OPENAI_API_KEY
  OPENAI_API_KEY: '',

  // --- Perplexity ---
  // Expected Env Var: VITE_PERPLEXITY_API_KEY
  PERPLEXITY_API_KEY: '',

  // --- Supabase ---
  // Expected Env Var: VITE_SUPABASE_URL
  SUPABASE_URL: '',
  
  // Expected Env Var: VITE_SUPABASE_ANON_KEY
  SUPABASE_ANON_KEY: '', 
  
};
