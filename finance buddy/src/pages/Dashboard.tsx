import { useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Wallet, TrendingUp, TrendingDown, Target, PiggyBank } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { InteractiveSpendingChart } from '@/components/dashboard/InteractiveSpendingChart';
import { MonthlyChart } from '@/components/dashboard/MonthlyChart';
import { BudgetProgress } from '@/components/dashboard/BudgetProgress';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { SmartAlertsPanel } from '@/components/dashboard/SmartAlertsPanel';
import { FixedVsVariableChart } from '@/components/dashboard/FixedVsVariableChart';
import { SavingsTrendChart } from '@/components/dashboard/SavingsTrendChart';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { SpendingForecast } from '@/components/insights/SpendingForecast';
import { CategoryTrends } from '@/components/insights/CategoryTrends';
import { BudgetRecommendations } from '@/components/insights/BudgetRecommendations';
import { GoalMilestones } from '@/components/insights/GoalMilestones';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactions } from '@/hooks/useTransactions';
import { useProfile } from '@/hooks/useProfile';
import { useMonthlyIncome } from '@/hooks/useMonthlyIncome';
import { useLoans } from '@/hooks/useLoans';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { CategorySpending } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { transactions, isLoading } = useTransactions(currentMonth);
  const { profile } = useProfile();
  const { amount: monthlyIncome } = useMonthlyIncome(currentMonth);
  const { totalEMI, totalDebt } = useLoans();
  const { goals, totalSaved, totalTarget } = useSavingsGoals();

  // Fetch previous month transactions for trends
  const previousMonth = subMonths(currentMonth, 1);
  const { transactions: previousTransactions } = useTransactions(previousMonth);

  // Fetch savings trend for last 6 months
  const savingsTrendQuery = useQuery({
    queryKey: ['savingsTrend', user?.id],
    queryFn: async () => {
      const trends: { month: string; savings: number; income: number; expenses: number }[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = format(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), 'yyyy-MM-dd');
        const monthEnd = format(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), 'yyyy-MM-dd');
        
        const { data: txns } = await supabase
          .from('transactions')
          .select('amount, type')
          .gte('date', monthStart)
          .lte('date', monthEnd);

        const income = (txns || []).filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
        const expenses = (txns || []).filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
        
        trends.push({
          month: format(monthDate, 'MMM'),
          income,
          expenses,
          savings: income - expenses,
        });
      }
      
      return trends;
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalIncome = monthlyIncome > 0 ? monthlyIncome : income;

    return {
      income: totalIncome,
      expenses,
      balance: totalIncome - expenses,
      budget: Number(profile?.monthly_budget) || 0,
    };
  }, [transactions, profile, monthlyIncome]);

  const categorySpending = useMemo((): CategorySpending[] => {
    const expenseTransactions = transactions.filter((t) => t.type === 'expense' && t.category);
    const categoryTotals = new Map<string, { category: any; amount: number }>();

    expenseTransactions.forEach((t) => {
      const existing = categoryTotals.get(t.category_id!);
      if (existing) {
        existing.amount += Number(t.amount);
      } else {
        categoryTotals.set(t.category_id!, {
          category: t.category,
          amount: Number(t.amount),
        });
      }
    });

    const total = Array.from(categoryTotals.values()).reduce((sum, c) => sum + c.amount, 0);

    return Array.from(categoryTotals.values())
      .map((item) => ({
        category: item.category,
        amount: item.amount,
        percentage: total > 0 ? (item.amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Your financial overview at a glance</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 text-sm font-medium min-w-[120px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <AddTransactionDialog />
          </div>
        </div>

        {/* Smart Alerts Panel */}
        <SmartAlertsPanel currentMonth={currentMonth} />

        {/* Quick Actions */}
        <QuickActions />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl p-5 bg-card border border-border">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-xl" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Income"
                value={`₹${stats.income.toLocaleString()}`}
                icon={<TrendingUp className="w-5 h-5" />}
                variant="income"
                tooltip="Total income for the selected month"
              />
              <StatCard
                title="Expenses"
                value={`₹${stats.expenses.toLocaleString()}`}
                icon={<TrendingDown className="w-5 h-5" />}
                variant="expense"
                tooltip="Total expenses for the selected month"
              />
              <StatCard
                title="Savings"
                value={`₹${stats.balance.toLocaleString()}`}
                icon={<PiggyBank className="w-5 h-5" />}
                variant="balance"
                trend={stats.balance >= 0 ? 'up' : 'down'}
                trendValue={stats.balance >= 0 ? 'Positive' : 'Negative'}
                tooltip="Income minus expenses"
              />
              <StatCard
                title="Monthly EMI"
                value={`₹${totalEMI.toLocaleString()}`}
                subtitle={totalDebt > 0 ? `Total debt: ₹${totalDebt.toLocaleString()}` : 'No active loans'}
                icon={<Wallet className="w-5 h-5" />}
                tooltip="Total monthly loan EMI payments"
              />
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Income vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full rounded-xl" />
              ) : (
                <MonthlyChart transactions={transactions} month={currentMonth} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fixed vs Variable</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full rounded-xl" />
              ) : (
                <FixedVsVariableChart transactions={transactions} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Second Charts Row - Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full rounded-xl" />
              ) : (
                <InteractiveSpendingChart data={categorySpending} />
              )}
            </CardContent>
          </Card>

          <SpendingForecast 
            currentSpending={stats.expenses}
            budget={stats.budget}
            currentMonth={currentMonth}
          />

          <CategoryTrends 
            currentTransactions={transactions}
            previousTransactions={previousTransactions}
          />
        </div>

        {/* Insights Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Savings Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {savingsTrendQuery.isLoading ? (
                <Skeleton className="h-[300px] w-full rounded-xl" />
              ) : (
                <SavingsTrendChart data={savingsTrendQuery.data || []} />
              )}
            </CardContent>
          </Card>

          <BudgetRecommendations 
            transactions={transactions}
            budget={stats.budget}
            income={stats.income}
            savingsGoalProgress={totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0}
          />

          <GoalMilestones goals={goals} />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentTransactions transactions={transactions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Budget Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetProgress spent={stats.expenses} budget={stats.budget} currency="₹" />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
