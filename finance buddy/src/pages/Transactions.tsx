import { useState, useMemo } from 'react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { ImportExportDialog } from '@/components/transactions/ImportExportDialog';
import { TransactionFilters, TransactionFilterValues } from '@/components/transactions/TransactionFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { Transaction } from '@/lib/types';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';
import { toast } from 'sonner';

export default function Transactions() {
  const { transactions, isLoading, deleteTransaction } = useTransactions();
  const { categories } = useCategories();

  const [filters, setFilters] = useState<TransactionFilterValues>({
    search: '',
    typeFilter: 'all',
    categoryFilter: 'all',
    dateFrom: undefined,
    dateTo: undefined,
  });

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        !filters.search ||
        t.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.category?.name.toLowerCase().includes(filters.search.toLowerCase());

      const matchesType = filters.typeFilter === 'all' || t.type === filters.typeFilter;
      const matchesCategory = filters.categoryFilter === 'all' || t.category_id === filters.categoryFilter;

      const txDate = new Date(t.date);
      const matchesDateFrom = !filters.dateFrom || !isBefore(txDate, startOfDay(filters.dateFrom));
      const matchesDateTo = !filters.dateTo || !isAfter(txDate, endOfDay(filters.dateTo));

      return matchesSearch && matchesType && matchesCategory && matchesDateFrom && matchesDateTo;
    });
  }, [transactions, filters]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach((t) => {
      const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredTransactions]);

  const handleDelete = async () => {
    if (!deletingTransaction) return;
    try {
      await deleteTransaction.mutateAsync(deletingTransaction.id);
      toast.success('Transaction deleted');
      setDeletingTransaction(null);
    } catch {
      toast.error('Failed to delete transaction');
    }
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }
    exportToCSV(filteredTransactions);
    toast.success(`Exported ${filteredTransactions.length} transactions as CSV`);
  };

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }
    exportToExcel(filteredTransactions);
    toast.success(`Exported ${filteredTransactions.length} transactions as Excel`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">Manage your income and expenses</p>
          </div>
          <div className="flex items-center gap-2">
            <ImportExportDialog />
            <AddTransactionDialog />
          </div>
        </div>

        {/* Advanced Filters */}
        <TransactionFilters
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
          resultCount={filteredTransactions.length}
        />

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : groupedTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {filters.search || filters.typeFilter !== 'all' || filters.categoryFilter !== 'all' || filters.dateFrom || filters.dateTo
                  ? 'No transactions match your filters'
                  : 'No transactions yet'}
              </div>
            ) : (
              <div className="space-y-6">
                {groupedTransactions.map(([date, txs]) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <div className="space-y-1">
                      {txs.map((transaction) => (
                        <TransactionItem
                          key={transaction.id}
                          transaction={transaction}
                          onEdit={() => setEditingTransaction(transaction)}
                          onDelete={() => setDeletingTransaction(transaction)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
