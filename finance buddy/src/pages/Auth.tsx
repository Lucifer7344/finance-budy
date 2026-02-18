import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wallet, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

const AUTH_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password. Please try again.',
  'Email not confirmed': 'Please verify your email before signing in. Check your inbox.',
  'User already registered': 'An account with this email already exists. Try signing in.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters.',
  'Signup requires a valid password': 'Please enter a valid password.',
  'Email rate limit exceeded': 'Too many attempts. Please wait a moment and try again.',
  'For security purposes, you can only request this after': 'Too many requests. Please wait before trying again.',
};

function getReadableError(rawMessage: string): string {
  for (const [key, readable] of Object.entries(AUTH_ERROR_MAP)) {
    if (rawMessage.includes(key)) return readable;
  }
  return rawMessage || 'Something went wrong. Please try again.';
}

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { user, loading, signIn, signUp } = useAuth();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(isSignUp ? signupSchema : loginSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      if (isSignUp) {
        const { error } = await signUp(data.email, data.password, data.fullName || '');
        if (error) throw error;
        toast.success('Account created! Check your email to verify.');
      } else {
        const { error } = await signIn(data.email, data.password);
        if (error) throw error;
        toast.success('Welcome back!');
      }
    } catch (error: any) {
      const message = getReadableError(error.message || '');
      setAuthError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    setIsSignUp(!isSignUp);
    setAuthError(null);
    form.reset();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-glow">
              <Wallet className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="font-bold text-2xl">FinTrack</span>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-muted-foreground">
              {isSignUp
                ? 'Start tracking your finances today'
                : 'Sign in to continue managing your finances'}
            </p>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{authError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  autoComplete="name"
                  {...form.register('fullName')}
                />
                {form.formState.errors.fullName && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.fullName.message}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...form.register('email')}
                onChange={(e) => {
                  form.register('email').onChange(e);
                  setAuthError(null);
                }}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                {...form.register('password')}
                onChange={(e) => {
                  form.register('password').onChange(e);
                  setAuthError(null);
                }}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleToggle}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary/10 via-primary/5 to-background items-center justify-center p-12">
        <div className="max-w-lg space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight">
              Take control of your{' '}
              <span className="gradient-text">financial future</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Track expenses, set budgets, and achieve your financial goals with
              our intuitive personal finance tracker.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              { title: 'Track Expenses', desc: 'Log and categorize all your spending' },
              { title: 'Set Budgets', desc: 'Create monthly budgets and stay on track' },
              { title: 'Visual Insights', desc: 'Beautiful charts to understand your habits' },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50',
                  'animate-fade-in-up'
                )}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">{i + 1}</span>
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
