export type TransactionType = 'income' | 'expense';
export type CategoryGroup = 'fixed' | 'variable' | 'transfers';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  currency: string;
  monthly_budget: number;
  low_fund_threshold: number;
  theme: string;
  accent_color: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  category_group: CategoryGroup;
  is_default: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  type: TransactionType;
  description: string | null;
  date: string;
  is_recurring: boolean;
  recurring_frequency: string | null;
  next_occurrence: string | null;
  reminder_enabled: boolean;
  reminder_days_before: number;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  month: number;
  year: number;
  created_at: string;
  category?: Category;
}

export interface Alert {
  id: string;
  user_id: string;
  type: 'low_fund' | 'budget_exceeded' | 'reminder';
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Loan {
  id: string;
  user_id: string;
  name: string;
  total_amount: number;
  monthly_emi: number;
  remaining_balance: number;
  loan_type: 'loan' | 'credit_card';
  is_active: boolean;
  start_date: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlyIncome {
  id: string;
  user_id: string;
  amount: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
  color: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  budgetUsed: number;
  budgetTotal: number;
}

export interface CategorySpending {
  category: Category;
  amount: number;
  percentage: number;
}
