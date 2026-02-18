-- Update the handle_new_user function to include the correct categories with groups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, currency)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'INR');
    
    -- Create default categories for new user with proper groups
    INSERT INTO public.categories (user_id, name, icon, color, type, category_group, is_default) VALUES
        -- Income categories
        (NEW.id, 'Salary', 'briefcase', '#10b981', 'income', 'variable', true),
        (NEW.id, 'Freelance', 'laptop', '#06b6d4', 'income', 'variable', true),
        (NEW.id, 'Investments', 'trending-up', '#8b5cf6', 'income', 'variable', true),
        -- Fixed expense categories
        (NEW.id, 'Rent', 'home', '#ef4444', 'expense', 'fixed', true),
        (NEW.id, 'Personal Loan EMI', 'landmark', '#f97316', 'expense', 'fixed', true),
        (NEW.id, 'Credit Card Loan EMI', 'credit-card', '#eab308', 'expense', 'fixed', true),
        (NEW.id, 'SBI Card', 'credit-card', '#3b82f6', 'expense', 'fixed', true),
        (NEW.id, 'Slice Card', 'credit-card', '#8b5cf6', 'expense', 'fixed', true),
        (NEW.id, 'Gym', 'dumbbell', '#ec4899', 'expense', 'fixed', true),
        -- Variable expense categories
        (NEW.id, 'Food', 'utensils', '#f97316', 'expense', 'variable', true),
        (NEW.id, 'Travel', 'car', '#3b82f6', 'expense', 'variable', true),
        (NEW.id, 'Miscellaneous', 'tag', '#6366f1', 'expense', 'variable', true),
        (NEW.id, 'Credit Card Spend', 'credit-card', '#a855f7', 'expense', 'variable', true),
        (NEW.id, 'Entertainment', 'film', '#ec4899', 'expense', 'variable', true),
        (NEW.id, 'Shopping', 'shopping-bag', '#14b8a6', 'expense', 'variable', true),
        (NEW.id, 'Health', 'heart', '#ef4444', 'expense', 'variable', true),
        -- Transfer categories
        (NEW.id, 'Family', 'users', '#10b981', 'expense', 'transfers', true),
        (NEW.id, 'Mousa Ji', 'user', '#06b6d4', 'expense', 'transfers', true);
    
    RETURN NEW;
END;
$function$;