
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = window.process.env.SUPABASE_URL;
const supabaseKey = window.process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL_HERE') {
    supabase = createClient(supabaseUrl, supabaseKey);
}

export const isSupabaseConfigured = () => !!supabase;

export const signUp = async (email, password, fullName) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
        },
    });
    return { data, error };
};

export const signIn = async (email, password) => {
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
};

export const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    return { error };
};

export const getUser = async () => {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

export const getSession = async () => {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

export const onAuthStateChange = (callback) => {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
};

export const submitContactMessage = async ({ fullName, email, company, message }) => {
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data, error } = await supabase
        .from('contact_messages')
        .insert([
            {
                full_name: fullName,
                email: email,
                company: company,
                message: message
            }
        ]);

    return { data, error };
};
