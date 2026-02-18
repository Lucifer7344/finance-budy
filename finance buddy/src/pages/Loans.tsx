import { useState, useMemo } from 'react';
import { CreditCard, Landmark, AlertTriangle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoanCard } from '@/components/loans/LoanCard';
import { AddLoanDialog } from '@/components/loans/AddLoanDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useLoans } from '@/hooks/useLoans';
import { Loan } from '@/lib/types';
import { toast } from 'sonner';

export default function Loans() {
  const { loans, activeLoans, totalEMI, totalDebt, deleteLoan, makePayment, isLoading } = useLoans();

  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [deletingLoan, setDeletingLoan] = useState<Loan | null>(null);
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const loansList = loans.filter(l => l.loan_type === 'loan');
  const cardsList = loans.filter(l => l.loan_type === 'credit_card');

  const handleDelete = async () => {
    if (!deletingLoan) return;
    try {
      await deleteLoan.mutateAsync(deletingLoan.id);
      toast.success('Loan deleted');
      setDeletingLoan(null);
    } catch (error) {
      toast.error('Failed to delete loan');
    }
  };

  const handlePayment = async () => {
    if (!paymentLoan) return;
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      await makePayment.mutateAsync({ id: paymentLoan.id, amount });
      toast.success('Payment recorded');
      setPaymentLoan(null);
      setPaymentAmount('');
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Loans & Cards</h1>
            <p className="text-muted-foreground">Track your loans, EMIs, and credit cards</p>
          </div>
          <AddLoanDialog />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-expense/10">
                  <CreditCard className="w-5 h-5 text-expense" />
                </div>
                <p className="text-sm text-muted-foreground">Monthly EMI</p>
              </div>
              <p className="text-2xl font-bold text-expense">₹{totalEMI.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Landmark className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Total Debt</p>
              </div>
              <p className="text-2xl font-bold">₹{totalDebt.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-warning/10">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <p className="text-sm text-muted-foreground">Active Loans</p>
              </div>
              <p className="text-2xl font-bold">{activeLoans.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Loans Section */}
        {loansList.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Landmark className="w-5 h-5" />
              Loans
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loansList.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onEdit={() => setEditingLoan(loan)}
                  onDelete={() => setDeletingLoan(loan)}
                  onPayment={() => {
                    setPaymentLoan(loan);
                    setPaymentAmount(String(loan.monthly_emi));
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Credit Cards Section */}
        {cardsList.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Credit Cards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cardsList.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onEdit={() => setEditingLoan(loan)}
                  onDelete={() => setDeletingLoan(loan)}
                  onPayment={() => {
                    setPaymentLoan(loan);
                    setPaymentAmount(String(loan.monthly_emi));
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {loans.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <p className="mb-4">No loans or credit cards added yet</p>
                <AddLoanDialog />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <AddLoanDialog
        loan={editingLoan || undefined}
        open={!!editingLoan}
        onOpenChange={(open) => !open && setEditingLoan(null)}
      />

      {/* Payment Dialog */}
      <Dialog open={!!paymentLoan} onOpenChange={(open) => !open && setPaymentLoan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment - {paymentLoan?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment">Payment Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="payment"
                  type="number"
                  className="pl-7"
                  placeholder="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              {paymentLoan && (
                <p className="text-xs text-muted-foreground">
                  Remaining balance: ₹{Number(paymentLoan.remaining_balance).toLocaleString()}
                </p>
              )}
            </div>
            <Button onClick={handlePayment} className="w-full" disabled={makePayment.isPending}>
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingLoan} onOpenChange={(open) => !open && setDeletingLoan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingLoan?.name}"? This action cannot be undone.
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
