-- Add category_group to categories for Fixed/Variable/Transfers grouping
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS category_group text DEFAULT 'variable';

-- Add reminder fields to transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS reminder_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_days_before integer DEFAULT 3;

-- Create loans table for loan/card tracking
CREATE TABLE public.loans (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    total_amount numeric NOT NULL DEFAULT 0,
    monthly_emi numeric NOT NULL DEFAULT 0,
    remaining_balance numeric NOT NULL DEFAULT 0,
    loan_type text NOT NULL DEFAULT 'loan', -- 'loan', 'credit_card'
    is_active boolean NOT NULL DEFAULT true,
    start_date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on loans
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for loans
CREATE POLICY "Users can view own loans" 
ON public.loans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loans" 
ON public.loans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loans" 
ON public.loans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loans" 
ON public.loans 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at on loans
CREATE TRIGGER update_loans_updated_at
BEFORE UPDATE ON public.loans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add theme settings to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'light',
ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#10b981';

-- Create monthly_income table for storing monthly income separately
CREATE TABLE public.monthly_income (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    amount numeric NOT NULL DEFAULT 0,
    month integer NOT NULL,
    year integer NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(user_id, month, year)
);

-- Enable RLS on monthly_income
ALTER TABLE public.monthly_income ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for monthly_income
CREATE POLICY "Users can view own monthly income" 
ON public.monthly_income 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly income" 
ON public.monthly_income 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly income" 
ON public.monthly_income 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own monthly income" 
ON public.monthly_income 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at on monthly_income
CREATE TRIGGER update_monthly_income_updated_at
BEFORE UPDATE ON public.monthly_income
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();