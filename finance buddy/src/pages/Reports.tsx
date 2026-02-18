import { useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { FileText, Download, TrendingUp, TrendingDown, PieChart, BarChart3, ArrowUpDown, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, AreaChart, Area, Legend, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Reports() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Fetch transactions for the selected period
  const reportsQuery = useQuery({
    queryKey: ['reports', user?.id, period, selectedYear, selectedMonth],
    queryFn: async () => {
      let startDate: Date;
      let endDate: Date;

      if (period === 'monthly') {
        startDate = startOfMonth(new Date(selectedYear, selectedMonth));
        endDate = endOfMonth(new Date(selectedYear, selectedMonth));
      } else {
        startDate = startOfYear(new Date(selectedYear, 0));
        endDate = endOfYear(new Date(selectedYear, 0));
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch comparison data (previous period)
  const comparisonQuery = useQuery({
    queryKey: ['comparison', user?.id, period, selectedYear, selectedMonth],
    queryFn: async () => {
      let startDate: Date;
      let endDate: Date;

      if (period === 'monthly') {
        const prevMonth = subMonths(new Date(selectedYear, selectedMonth), 1);
        startDate = startOfMonth(prevMonth);
        endDate = endOfMonth(prevMonth);
      } else {
        startDate = startOfYear(new Date(selectedYear - 1, 0));
        endDate = endOfYear(new Date(selectedYear - 1, 0));
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const transactions = reportsQuery.data || [];
    const prevTransactions = comparisonQuery.data || [];

    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const prevIncome = prevTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const prevExpenses = prevTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

    // Category breakdown
    const categoryMap = new Map<string, { name: string; amount: number; color: string }>();
    transactions.filter(t => t.type === 'expense' && t.category).forEach(t => {
      const existing = categoryMap.get(t.category_id!);
      if (existing) {
        existing.amount += Number(t.amount);
      } else {
        categoryMap.set(t.category_id!, {
          name: t.category?.name || 'Other',
          amount: Number(t.amount),
          color: t.category?.color || '#6b7280',
        });
      }
    });

    // Monthly trend (for yearly view)
    const monthlyTrend: { month: string; income: number; expenses: number }[] = [];
    if (period === 'yearly') {
      for (let i = 0; i < 12; i++) {
        const monthStart = format(new Date(selectedYear, i, 1), 'yyyy-MM');
        const monthTxns = transactions.filter(t => t.date.startsWith(monthStart));
        monthlyTrend.push({
          month: format(new Date(selectedYear, i), 'MMM'),
          income: monthTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
          expenses: monthTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
        });
      }
    }

    return {
      income,
      expenses,
      savings: income - expenses,
      prevIncome,
      prevExpenses,
      incomeChange: prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0,
      expenseChange: prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0,
      categoryBreakdown: Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount),
      monthlyTrend,
      transactionCount: transactions.length,
    };
  }, [reportsQuery.data, comparisonQuery.data, period, selectedYear]);

  // Month-over-month comparison data
  const budgetComparisonData = useMemo(() => {
    if (!reportsQuery.data || !comparisonQuery.data) return [];
    
    const currentTransactions = reportsQuery.data || [];
    const prevTransactions = comparisonQuery.data || [];
    
    const categoryMap = new Map<string, { name: string; current: number; previous: number; color: string }>();
    
    currentTransactions.filter(t => t.type === 'expense' && t.category).forEach(t => {
      const existing = categoryMap.get(t.category_id!);
      if (existing) {
        existing.current += Number(t.amount);
      } else {
        categoryMap.set(t.category_id!, {
          name: t.category?.name || 'Other',
          current: Number(t.amount),
          previous: 0,
          color: t.category?.color || '#6b7280',
        });
      }
    });
    
    prevTransactions.filter(t => t.type === 'expense' && t.category).forEach(t => {
      const existing = categoryMap.get(t.category_id!);
      if (existing) {
        existing.previous += Number(t.amount);
      } else {
        categoryMap.set(t.category_id!, {
          name: t.category?.name || 'Other',
          current: 0,
          previous: Number(t.amount),
          color: t.category?.color || '#6b7280',
        });
      }
    });
    
    return Array.from(categoryMap.values())
      .map(item => ({
        ...item,
        change: item.previous > 0 ? ((item.current - item.previous) / item.previous) * 100 : 0,
      }))
      .sort((a, b) => b.current - a.current)
      .slice(0, 8);
  }, [reportsQuery.data, comparisonQuery.data]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.text('FinSight Financial Report', pageWidth / 2, 20, { align: 'center' });
    
    // Period
    doc.setFontSize(12);
    const periodText = period === 'monthly' 
      ? format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')
      : selectedYear.toString();
    doc.text(`Period: ${periodText}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, pageWidth / 2, 38, { align: 'center' });

    // Summary
    doc.setFontSize(14);
    doc.text('Summary', 14, 55);
    
    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Amount', 'Change']],
      body: [
        ['Total Income', `₹${stats.income.toLocaleString()}`, `${stats.incomeChange >= 0 ? '+' : ''}${stats.incomeChange.toFixed(1)}%`],
        ['Total Expenses', `₹${stats.expenses.toLocaleString()}`, `${stats.expenseChange >= 0 ? '+' : ''}${stats.expenseChange.toFixed(1)}%`],
        ['Net Savings', `₹${stats.savings.toLocaleString()}`, ''],
        ['Transactions', stats.transactionCount.toString(), ''],
      ],
      theme: 'striped',
    });

    // Category breakdown
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.text('Category Breakdown', 14, finalY + 15);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Category', 'Amount', 'Percentage']],
      body: stats.categoryBreakdown.map(c => [
        c.name,
        `₹${c.amount.toLocaleString()}`,
        `${((c.amount / stats.expenses) * 100).toFixed(1)}%`,
      ]),
      theme: 'striped',
    });

    // Transaction details
    const finalY2 = (doc as any).lastAutoTable.finalY || 160;
    if (finalY2 < 250) {
      doc.text('Recent Transactions', 14, finalY2 + 15);
      
      const transactions = (reportsQuery.data || []).slice(0, 20);
      autoTable(doc, {
        startY: finalY2 + 20,
        head: [['Date', 'Description', 'Category', 'Amount']],
        body: transactions.map(t => [
          format(new Date(t.date), 'MMM d'),
          t.description || '-',
          t.category?.name || '-',
          `${t.type === 'income' ? '+' : '-'}₹${Number(t.amount).toLocaleString()}`,
        ]),
        theme: 'striped',
      });
    }

    doc.save(`FinSight-Report-${periodText.replace(' ', '-')}.pdf`);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2024, i), 'MMMM'),
  }));

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">Analyze your spending patterns and trends</p>
          </div>
          <Button onClick={exportPDF} className="gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>

        {/* Period Selection */}
        <div className="flex flex-wrap items-center gap-4">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as 'monthly' | 'yearly')}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {period === 'monthly' && (
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-income/10">
                  <TrendingUp className="w-5 h-5 text-income" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Income</p>
                  <p className="text-xl font-bold">₹{stats.income.toLocaleString()}</p>
                  <p className={`text-xs ${stats.incomeChange >= 0 ? 'text-income' : 'text-expense'}`}>
                    {stats.incomeChange >= 0 ? '+' : ''}{stats.incomeChange.toFixed(1)}% vs last
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-expense/10">
                  <TrendingDown className="w-5 h-5 text-expense" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expenses</p>
                  <p className="text-xl font-bold">₹{stats.expenses.toLocaleString()}</p>
                  <p className={`text-xs ${stats.expenseChange <= 0 ? 'text-income' : 'text-expense'}`}>
                    {stats.expenseChange >= 0 ? '+' : ''}{stats.expenseChange.toFixed(1)}% vs last
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Savings</p>
                  <p className={`text-xl font-bold ${stats.savings >= 0 ? 'text-income' : 'text-expense'}`}>
                    ₹{stats.savings.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-muted">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-xl font-bold">{stats.transactionCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Spending by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.categoryBreakdown.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={stats.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="amount"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {stats.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No expense data for this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Trend (Yearly view) or Income vs Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {period === 'yearly' ? 'Monthly Trend' : 'Income vs Expenses'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {period === 'yearly' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <RechartsTooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                      <Legend />
                      <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: 'Current', income: stats.income, expenses: stats.expenses }, { name: 'Previous', income: stats.prevIncome, expenses: stats.prevExpenses }]}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <RechartsTooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Spending Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.categoryBreakdown.length > 0 ? (
              <div className="space-y-3">
                {stats.categoryBreakdown.slice(0, 10).map((cat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="flex-1 font-medium">{cat.name}</span>
                    <span className="text-muted-foreground">
                      {((cat.amount / stats.expenses) * 100).toFixed(1)}%
                    </span>
                    <span className="font-medium">₹{cat.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No expense data for this period
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
