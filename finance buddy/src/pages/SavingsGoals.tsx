import { Target, TrendingUp, CheckCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { SavingsGoalCard } from '@/components/savings/SavingsGoalCard';
import { AddSavingsGoalDialog } from '@/components/savings/AddSavingsGoalDialog';
import { StatCard } from '@/components/dashboard/StatCard';

export default function SavingsGoals() {
  const { goals, isLoading, totalSaved, totalTarget, completedGoals } = useSavingsGoals();

  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const activeGoals = goals.filter(g => !g.is_completed);
  const completedGoalsList = goals.filter(g => g.is_completed);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Savings Goals</h1>
            <p className="text-muted-foreground">Track your progress towards financial goals</p>
          </div>
          <AddSavingsGoalDialog />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Saved"
            value={`₹${totalSaved.toLocaleString()}`}
            icon={<TrendingUp className="w-5 h-5" />}
            variant="income"
          />
          <StatCard
            title="Total Target"
            value={`₹${totalTarget.toLocaleString()}`}
            icon={<Target className="w-5 h-5" />}
          />
          <StatCard
            title="Goals Completed"
            value={completedGoals.toString()}
            subtitle={`of ${goals.length} total goals`}
            icon={<CheckCircle className="w-5 h-5" />}
            variant="balance"
          />
        </div>

        {/* Overall Progress */}
        {goals.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={overallProgress} className="h-4 mb-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{overallProgress.toFixed(0)}% complete</span>
                <span>₹{(totalTarget - totalSaved).toLocaleString()} remaining</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Active Goals ({activeGoals.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeGoals.map((goal) => (
                <SavingsGoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </div>
        )}

        {/* Completed Goals */}
        {completedGoalsList.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-income" />
              Completed Goals ({completedGoalsList.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedGoalsList.map((goal) => (
                <SavingsGoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {goals.length === 0 && !isLoading && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No savings goals yet</h3>
              <p className="text-muted-foreground text-center max-w-sm mb-4">
                Start by creating your first savings goal. Whether it's an emergency fund, 
                vacation, or a new purchase – track your progress here.
              </p>
              <AddSavingsGoalDialog />
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
