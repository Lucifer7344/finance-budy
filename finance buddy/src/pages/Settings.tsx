import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Shield, Bell, Palette, Plus, Trash2, Moon, Sun, Monitor, Upload, Download } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCategories } from '@/hooks/useCategories';
import { useTheme } from '@/hooks/useTheme';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
 
import { Category, TransactionType, CategoryGroup } from '@/lib/types';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  currency: z.string(),
  low_fund_threshold: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    'Must be a positive number'
  ),
});

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  icon: z.string(),
  color: z.string(),
  type: z.enum(['income', 'expense']),
  category_group: z.enum(['fixed', 'variable', 'transfers']),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type CategoryFormData = z.infer<typeof categorySchema>;

const ICON_OPTIONS = ['tag', 'home', 'car', 'utensils', 'shopping-bag', 'film', 'heart', 'zap', 'briefcase', 'laptop', 'trending-up', 'gift', 'book', 'music', 'plane', 'coffee', 'credit-card', 'users', 'phone', 'wifi'];
const COLOR_OPTIONS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899'];

export default function Settings() {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { theme, setTheme } = useTheme();

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: profile?.full_name || '',
      currency: profile?.currency || 'INR',
      low_fund_threshold: profile?.low_fund_threshold?.toString() || '2000',
    },
  });

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      icon: 'tag',
      color: '#6366f1',
      type: 'expense',
      category_group: 'variable',
    },
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile.mutateAsync({
        full_name: data.full_name,
        currency: data.currency,
        low_fund_threshold: Number(data.low_fund_threshold),
      });
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const onCategorySubmit = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          name: data.name,
          icon: data.icon,
          color: data.color,
          type: data.type,
          category_group: data.category_group,
        });
        toast.success('Category updated');
      } else {
        await addCategory.mutateAsync({
          name: data.name,
          icon: data.icon,
          color: data.color,
          type: data.type,
          category_group: data.category_group,
        } as any);
        toast.success('Category added');
      }
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      await deleteCategory.mutateAsync(deletingCategory.id);
      toast.success('Category deleted');
      setDeletingCategory(null);
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type,
      category_group: category.category_group || 'variable',
    });
    setCategoryDialogOpen(true);
  };

  const openAddCategory = () => {
    setEditingCategory(null);
    categoryForm.reset({
      name: '',
      icon: 'tag',
      color: '#6366f1',
      type: 'expense',
      category_group: 'variable',
    });
    setCategoryDialogOpen(true);
  };

  // Group categories
  const fixedCategories = categories.filter(c => c.category_group === 'fixed');
  const variableCategories = categories.filter(c => c.category_group === 'variable' || !c.category_group);
  const transferCategories = categories.filter(c => c.category_group === 'transfers');
  const incomeCategories = categories.filter(c => c.type === 'income');

  const renderCategoryList = (cats: Category[], title: string) => {
    if (cats.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h4>
        {cats.map((category) => {
          const IconComponent = (LucideIcons as any)[
            category.icon.charAt(0).toUpperCase() + category.icon.slice(1).replace(/-([a-z])/g, (g: string) => g[1].toUpperCase())
          ] || LucideIcons.Tag;

          return (
            <div
              key={category.id}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: category.color + '20' }}
                >
                  <IconComponent className="w-4 h-4" style={{ color: category.color }} />
                </div>
                <div>
                  <p className="font-medium text-sm">{category.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{category.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEditCategory(category)}
                >
                  <LucideIcons.Pencil className="w-4 h-4" />
                </Button>
                {!category.is_default && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeletingCategory(category)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="flex gap-2">
                {[
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant={theme === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme(value as any)}
                    className="flex-1"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  placeholder="John Doe"
                  {...profileForm.register('full_name')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={profileForm.watch('currency')}
                    onValueChange={(value) => profileForm.setValue('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="low_fund_threshold">Low Fund Alert (₹)</Label>
                  <Input
                    id="low_fund_threshold"
                    type="number"
                    {...profileForm.register('low_fund_threshold')}
                  />
                </div>
              </div>

              <Button type="submit" disabled={updateProfile.isPending}>
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Manage your transaction categories</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={openAddCategory}>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderCategoryList(fixedCategories, 'Fixed Expenses')}
            {renderCategoryList(variableCategories, 'Variable Expenses')}
            {renderCategoryList(transferCategories, 'Transfers')}
            {renderCategoryList(incomeCategories, 'Income')}
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <NotificationSettings />
 
      </div>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Category name" {...categoryForm.register('name')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={categoryForm.watch('type')}
                  onValueChange={(value) => categoryForm.setValue('type', value as TransactionType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Group</Label>
                <Select
                  value={categoryForm.watch('category_group')}
                  onValueChange={(value) => categoryForm.setValue('category_group', value as CategoryGroup)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="variable">Variable</SelectItem>
                    <SelectItem value="transfers">Transfers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-10 gap-2">
                {ICON_OPTIONS.map((iconName) => {
                  const pascalCase = iconName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                  const Icon = (LucideIcons as any)[pascalCase];
                  if (!Icon) return null;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => categoryForm.setValue('icon', iconName)}
                      className={cn(
                        'p-2 rounded-lg border transition-colors',
                        categoryForm.watch('icon') === iconName
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => categoryForm.setValue('color', color)}
                    className={cn(
                      'w-8 h-8 rounded-lg transition-transform',
                      categoryForm.watch('color') === color ? 'scale-110 ring-2 ring-primary ring-offset-2' : ''
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">
              {editingCategory ? 'Update Category' : 'Add Category'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? Transactions using this category will become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
