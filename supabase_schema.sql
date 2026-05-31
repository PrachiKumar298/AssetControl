-- Supabase Database Schema
-- Run this in the Supabase SQL Editor to initialize your database tables.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES Table
-- Stores user-defined profiles (e.g. "Self", "Spouse", "Retirement")
-- and holds values for Bank, PPF, and NPS investments.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bank_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    ppf_invested NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    ppf_current NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    nps_invested NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    nps_current NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profiles" 
ON public.profiles 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 2. COMPANIES Table
-- Stores individual stock holdings under each profile.
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL, -- e.g. "AAPL", "GOOGL"
    company_name TEXT NOT NULL,
    nominee TEXT NOT NULL DEFAULT '',
    bank TEXT NOT NULL DEFAULT '',
    avg_price NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    quantity NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    current_price NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage companies under their profiles" 
ON public.companies 
FOR ALL 
TO authenticated 
USING (
    profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
);


-- 3. REAL ESTATE Table
-- Stores real estate holdings for each profile.
CREATE TABLE IF NOT EXISTS public.real_estate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Property name
    invested NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_val NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for real_estate
ALTER TABLE public.real_estate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage real estate under their profiles" 
ON public.real_estate 
FOR ALL 
TO authenticated 
USING (
    profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
);


-- 4. TRANSACTIONS Table
-- Logs stock buy and sell events for audit and historical tracking.
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
    quantity NUMERIC(15, 4) NOT NULL,
    price NUMERIC(15, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage transactions under their profiles" 
ON public.transactions 
FOR ALL 
TO authenticated 
USING (
    profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
);
