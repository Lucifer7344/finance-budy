import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BudgetProgress } from '@/components/dashboard/BudgetProgress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Budgets() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { transactions } = useTransactions(currentMonth);
  const { expenseCategories } = useCategories();
  const { profile, updateProfile } = useProfile();

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [newBudget, setNewBudget] = useState('');

  const stats = useMemo(() => {
    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      expenses,
      income,
      budget: Number(profile?.monthly_budget) || 0,
    };
  }, [transactions, profile]);

  const categoryBreakdown = useMemo(() => {
    const breakdown = new Map<string, { category: any; spent: number }>();

    transactions
      .filter((t) => t.type === 'expense' && t.category)
      .forEach((t) => {
        const existing = breakdown.get(t.category_id!);
        if (existing) {
          existing.spent += Number(t.amount);
        } else {
          breakdown.set(t.category_id!, {
            category: t.category,
            spent: Number(t.amount),
          });
        }
      });

    return Array.from(breakdown.values()).sort((a, b) => b.spent - a.spent);
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

  const handleSetBudget = async () => {
    const amount = Number(newBudget);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await updateProfile.mutateAsync({ monthly_budget: amount });
      toast.success('Budget updated');
      setBudgetDialogOpen(false);
      setNewBudget('');
    } catch (error) {
      toast.error('Failed to update budget');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
            <p className="text-muted-foreground">Track your spending limits</p>
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
          </div>
        </div>

        {/* Monthly Budget Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Monthly Budget</CardTitle>
            <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Pencil className="w-4 h-4 mr-2" />
                  {stats.budget > 0 ? 'Edit Budget' : 'Set Budget'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Set Monthly Budget</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="budget"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        value={newBudget}
                        onChange={(e) => setNewBudget(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSetBudget} className="w-full">
                    Save Budget
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {stats.budget > 0 ? (
              <BudgetProgress spent={stats.expenses} budget={stats.budget} />
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>No budget set for this month</p>
                <p className="text-sm mt-1">Set a budget to start tracking your spending</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spending Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Income</p>
                <p className="text-2xl font-bold text-income">${stats.income.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-expense">${stats.expenses.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Net Savings</p>
                <p className={cn(
                  'text-2xl font-bold',
                  stats.income - stats.expenses >= 0 ? 'text-income' : 'text-expense'
                )}>
                  ${(stats.income - stats.expenses).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No expense data for this month
              </div>
            ) : (
              <div className="space-y-4">
                {categoryBreakdown.map(({ category, spent }) => {
                  const percentage = stats.expenses > 0 ? (spent / stats.expenses) * 100 : 0;
                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium text-sm">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-sm">${spent.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={percentage}
                        className="h-2"
                        style={{
                          ['--progress-background' as any]: category.color,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
