import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Edit3, Trash2, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useMonthlyIncome } from '@/hooks/useMonthlyIncome';
import { Category, Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function MonthlyTracker() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { transactions, deleteTransaction } = useTransactions(currentMonth);
  const { categories } = useCategories();
  const { amount: monthlyIncome, setIncome } = useMonthlyIncome(currentMonth);

  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeValue, setIncomeValue] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  // Group expenses by category with category group
  const expensesByCategory = useMemo(() => {
    const groups: Record<string, { category: Category; transactions: Transaction[]; total: number }> = {};
    
    transactions
      .filter((t) => t.type === 'expense' && t.category)
      .forEach((t) => {
        const catId = t.category_id!;
        if (!groups[catId]) {
          groups[catId] = { category: t.category!, transactions: [], total: 0 };
        }
        groups[catId].transactions.push(t);
        groups[catId].total += Number(t.amount);
      });

    return groups;
  }, [transactions]);

  // Group by category group (fixed, variable, transfers)
  const groupedExpenses = useMemo(() => {
    const fixed: typeof expensesByCategory = {};
    const variable: typeof expensesByCategory = {};
    const transfers: typeof expensesByCategory = {};

    Object.entries(expensesByCategory).forEach(([catId, data]) => {
      const group = data.category.category_group || 'variable';
      if (group === 'fixed') {
        fixed[catId] = data;
      } else if (group === 'transfers') {
        transfers[catId] = data;
      } else {
        variable[catId] = data;
      }
    });

    return { fixed, variable, transfers };
  }, [expensesByCategory]);

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
      savings: totalIncome - expenses,
    };
  }, [transactions, monthlyIncome]);

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

  const handleSaveIncome = async () => {
    const amount = Number(incomeValue);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      await setIncome.mutateAsync(amount);
      toast.success('Income updated');
      setEditingIncome(false);
    } catch (error) {
      toast.error('Failed to update income');
    }
  };

  const handleDelete = async () => {
    if (!deletingTransaction) return;
    try {
      await deleteTransaction.mutateAsync(deletingTransaction.id);
      toast.success('Transaction deleted');
      setDeletingTransaction(null);
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const renderCategoryGroup = (
    title: string,
    expenses: typeof expensesByCategory,
    colorClass: string
  ) => {
    const entries = Object.entries(expenses);
    if (entries.length === 0) return null;

    const total = entries.reduce((sum, [, data]) => sum + data.total, 0);

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{title}</CardTitle>
            <span className={cn('font-bold', colorClass)}>₹{total.toLocaleString()}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.map(([catId, data]) => {
            const IconComponent = (LucideIcons as any)[
              data.category.icon?.charAt(0).toUpperCase() + data.category.icon?.slice(1)
            ] || LucideIcons.Tag;

            return (
              <div key={catId} className="space-y-1">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: data.category.color + '20' }}
                    >
                      <IconComponent className="w-3.5 h-3.5" style={{ color: data.category.color }} />
                    </div>
                    <span className="text-sm font-medium">{data.category.name}</span>
                  </div>
                  <span className="text-sm font-semibold">₹{data.total.toLocaleString()}</span>
                </div>
                {/* Individual transactions */}
                <div className="ml-9 space-y-1">
                  {data.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-1 px-2 text-xs text-muted-foreground hover:bg-muted/30 rounded group"
                    >
                      <div className="flex items-center gap-2">
                        <span>{tx.description || 'No description'}</span>
                        {tx.is_recurring && (
                          <RefreshCw className="w-3 h-3 text-primary" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span>₹{Number(tx.amount).toLocaleString()}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <button
                            onClick={() => setEditingTransaction(tx)}
                            className="p-1 hover:bg-accent rounded"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setDeletingTransaction(tx)}
                            className="p-1 hover:bg-accent rounded text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Monthly Tracker</h1>
            <p className="text-muted-foreground">Track your income and expenses by month</p>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Income */}
          <Card className="bg-income-muted border-income/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Income</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setIncomeValue(String(monthlyIncome || ''));
                    setEditingIncome(true);
                  }}
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
              </div>
              {editingIncome ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={incomeValue}
                    onChange={(e) => setIncomeValue(e.target.value)}
                    placeholder="Enter income"
                    className="h-8"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveIncome}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingIncome(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <p className="text-2xl font-bold text-income">
                  ₹{stats.income.toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card className="bg-expense-muted border-expense/20">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Total Expenses</p>
              <p className="text-2xl font-bold text-expense">
                ₹{stats.expenses.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          {/* Savings */}
          <Card className={cn(
            'border',
            stats.savings >= 0 ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'
          )}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Savings</p>
              <p className={cn(
                'text-2xl font-bold',
                stats.savings >= 0 ? 'text-primary' : 'text-destructive'
              )}>
                ₹{stats.savings.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Expense Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {renderCategoryGroup('Fixed Expenses', groupedExpenses.fixed, 'text-expense')}
          {renderCategoryGroup('Variable Expenses', groupedExpenses.variable, 'text-warning')}
          {renderCategoryGroup('Transfers', groupedExpenses.transfers, 'text-primary')}
        </div>

        {Object.keys(expensesByCategory).length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <p className="mb-2">No expenses recorded for this month</p>
                <AddTransactionDialog />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <AddTransactionDialog
        transaction={editingTransaction || undefined}
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTransaction} onOpenChange={(open) => !open && setDeletingTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
