
// This file is for environment variable configuration.
// It serves as a runtime fallback if the build tool (Vite/Coolify) hasn't injected variables.

window.process = window.process || {};
window.process.env = {
  ...window.process.env,

  // --- Configuration Instructions for Coolify/Docker ---
  // 1. Create Environment Variables in Coolify: VITE_API_KEY, VITE_SUPABASE_URL, etc.
  // 2. Add this to your "Post-Deployment Command" in Coolify:
  //    sed -i "s|__VITE_API_KEY__|$VITE_API_KEY|g" env.js && \
  //    sed -i "s|__VITE_SUPABASE_URL__|$VITE_SUPABASE_URL|g" env.js && \
  //    sed -i "s|__VITE_SUPABASE_ANON_KEY__|$VITE_SUPABASE_ANON_KEY|g" env.js

  // --- Google Gemini ---
  // Primary API Key for Chat, Research, Analysis
  VITE_API_KEY: '__VITE_API_KEY__', 

  // --- OpenAI ---
  // Optional: For DALL-E Image Generation
  VITE_OPENAI_API_KEY: '__VITE_OPENAI_API_KEY__',

  // --- Supabase ---
  // Required for Authentication & Database
  SUPABASE_URL: '__VITE_SUPABASE_URL__',
  SUPABASE_ANON_KEY: '__VITE_SUPABASE_ANON_KEY__', 
};
