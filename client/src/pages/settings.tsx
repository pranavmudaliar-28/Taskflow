import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  User, Bell, Palette, Shield, LogOut,
  Edit2, Save, X, Key, CreditCard, ExternalLink,
  AlertTriangle, Check,
} from "lucide-react";

/* ── nav tab config ──────────────────────────────────────── */
const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "billing", label: "Billing", icon: CreditCard },
] as const;

type TabId = typeof TABS[number]["id"];

/* ── form field ──────────────────────────────────────────── */
function Field({
  id, label, type = "text", value, onChange, disabled,
  placeholder, hint,
}: {
  id: string; label: string; type?: string;
  value: string; onChange: (v: string) => void;
  disabled?: boolean; placeholder?: string; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-semibold text-slate-700">{label}</Label>
      <Input
        id={id} type={type} value={value} placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-400"
      />
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/* ── notification row ────────────────────────────────────── */
function NotifyRow({ label, desc, id }: { label: string; desc: string; id: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
      <Switch defaultChecked data-testid={`switch-${id}`} className="mt-0.5" />
    </div>
  );
}

/* ── main component ──────────────────────────────────────── */
export default function Settings() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>("profile");

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");

  const [passwordData, setPasswordData] = useState({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : (user?.email?.[0]?.toUpperCase() || "U");

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}` : user?.email || "User";

  /* organizations */
  const { data: organizations = [] } = useQuery<any[]>({ queryKey: ["/api/organizations"] });
  const isOrgAdmin = organizations.some(o => o.role === "admin");

  /* mutations */
  const updateProfile = useMutation({
    mutationFn: async (data: { firstName?: string; lastName?: string; email?: string }) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: (u) => {
      queryClient.setQueryData(["/api/auth/user"], u);
      toast({ title: "Profile saved" });
      setIsEditing(false);
    },
    onError: (e: any) => toast({ title: "Failed to save", description: e?.message, variant: "destructive" }),
  });

  const changePassword = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/user/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed" });
      setPasswordDialogOpen(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (e: any) => toast({ title: "Failed to change password", description: e?.message, variant: "destructive" }),
  });

  const handleSaveProfile = () => {
    const updates: any = {};
    if (firstName !== user?.firstName) updates.firstName = firstName;
    if (lastName !== user?.lastName) updates.lastName = lastName;
    if (email !== user?.email) updates.email = email;
    if (Object.keys(updates).length > 0) updateProfile.mutate(updates);
    else setIsEditing(false);
  };

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" }); return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return;
    }
    changePassword.mutate({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
  };

  /* panel renderer */
  const renderPanel = () => {
    switch (tab) {

      /* ── Profile ── */
      case "profile": return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Profile</h2>
            <p className="text-sm text-slate-400 mt-0.5">Update your personal information</p>
          </div>

          {/* Avatar row */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg font-bold bg-violet-600 text-white">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-slate-900" data-testid="text-user-name">{displayName}</p>
              <p className="text-sm text-slate-400" data-testid="text-user-email">{user?.email}</p>
              <Badge variant="secondary" className="mt-1.5 capitalize text-xs">{user?.plan || "Free"} plan</Badge>
            </div>
            {!isEditing && (
              <Button variant="outline" size="sm" className="ml-auto gap-2"
                onClick={() => setIsEditing(true)} data-testid="button-edit-profile">
                <Edit2 className="h-4 w-4" /> Edit
              </Button>
            )}
          </div>

          {/* Form */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="firstName" label="First name" value={firstName}
              onChange={setFirstName} disabled={!isEditing} placeholder="John"
              data-testid="input-first-name" />
            <Field id="lastName" label="Last name" value={lastName}
              onChange={setLastName} disabled={!isEditing} placeholder="Doe"
              data-testid="input-last-name" />
            <div className="sm:col-span-2">
              <Field id="email" label="Email address" type="email" value={email}
                onChange={setEmail} disabled={!isEditing} placeholder="john@company.com"
                data-testid="input-email" />
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center gap-2 pt-2">
              <Button size="sm" onClick={handleSaveProfile}
                disabled={updateProfile.isPending}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
                data-testid="button-save-profile">
                <Save className="h-4 w-4" />
                {updateProfile.isPending ? "Saving…" : "Save changes"}
              </Button>
              <Button variant="outline" size="sm" gap-2
                onClick={() => { setFirstName(user?.firstName || ""); setLastName(user?.lastName || ""); setEmail(user?.email || ""); setIsEditing(false); }}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          )}
        </div>
      );

      /* ── Security ── */
      case "security": return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Security</h2>
            <p className="text-sm text-slate-400 mt-0.5">Keep your account safe</p>
          </div>

          {/* Change password row */}
          <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-800">Password</p>
              <p className="text-xs text-slate-400 mt-0.5">Last updated over 30 days ago</p>
            </div>
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-change-password">
                  <Key className="h-4 w-4" /> Change password
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <Field id="cur-pw" label="Current password" type="password"
                    value={passwordData.currentPassword}
                    onChange={(v) => setPasswordData(p => ({ ...p, currentPassword: v }))}
                    data-testid="input-current-password" />
                  <Field id="new-pw" label="New password" type="password"
                    value={passwordData.newPassword}
                    onChange={(v) => setPasswordData(p => ({ ...p, newPassword: v }))}
                    hint="Min. 6 characters"
                    data-testid="input-new-password" />
                  <Field id="conf-pw" label="Confirm new password" type="password"
                    value={passwordData.confirmPassword}
                    onChange={(v) => setPasswordData(p => ({ ...p, confirmPassword: v }))}
                    data-testid="input-confirm-password" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleChangePassword}
                    disabled={changePassword.isPending}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                    data-testid="button-save-password">
                    {changePassword.isPending ? "Saving…" : "Change password"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Sign out */}
          <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-800">Sign out</p>
              <p className="text-xs text-slate-400 mt-0.5">Sign out of TaskFlow on this device</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => logout()}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-2"
              data-testid="button-logout">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border-2 border-red-100 bg-red-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-sm font-bold text-red-700">Danger Zone</p>
            </div>
            <p className="text-xs text-red-600 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button variant="outline" size="sm"
              className="text-red-700 border-red-300 hover:bg-red-100 hover:text-red-800">
              Delete my account
            </Button>
          </div>
        </div>
      );

      /* ── Notifications ── */
      case "notifications": return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
            <p className="text-sm text-slate-400 mt-0.5">Choose what you get notified about</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 px-5 divide-y divide-slate-100">
            <NotifyRow id="assignments" label="Task assignments"
              desc="When you're assigned to a task" />
            <NotifyRow id="status" label="Status changes"
              desc="When a task's status is updated" />
            <NotifyRow id="mentions" label="Comments & @mentions"
              desc="When someone mentions you in a comment" />
            <NotifyRow id="due" label="Due date reminders"
              desc="24 hours before a task is due" />
            <NotifyRow id="projects" label="Project invitations"
              desc="When you're added to a project" />
          </div>
        </div>
      );

      /* ── Appearance ── */
      case "appearance": return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Appearance</h2>
            <p className="text-sm text-slate-400 mt-0.5">Customize how TaskFlow looks</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Theme</p>
                <p className="text-xs text-slate-400 mt-0.5">Switch between light and dark mode</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 capitalize">{theme}</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      );

      /* ── Billing ── */
      case "billing": return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Billing & Subscription</h2>
            <p className="text-sm text-slate-400 mt-0.5">Manage your plan and payment details</p>
          </div>
          {!isOrgAdmin && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">Only organization admins can manage billing. Contact your admin for changes.</p>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">Current Plan</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="capitalize bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100">
                  {user?.plan || "Free"}
                </Badge>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-400">Renews monthly</span>
              </div>
            </div>
            {isOrgAdmin && (
              <Button variant="outline" size="sm" className="gap-2 shrink-0"
                onClick={async () => {
                  try {
                    const res = await apiRequest("POST", "/api/stripe/create-portal-session");
                    const d = await res.json();
                    if (d.url) window.location.href = d.url;
                  } catch (e: any) {
                    toast({ title: "Failed to open billing portal", variant: "destructive" });
                  }
                }}>
                <ExternalLink className="h-4 w-4" /> Manage plan
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-400 px-1">
            Billing is handled securely through Stripe. Invoices and payment history are available in the billing portal.
          </p>
        </div>
      );

      default: return null;
    }
  };

  /* ── render ── */
  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage your account and preferences</p>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6">
          {/* Left nav */}
          <nav className="w-52 shrink-0">
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm p-1.5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${tab === id
                      ? "bg-violet-50 text-violet-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${tab === id ? "text-violet-600" : "text-slate-400"}`} />
                  {label}
                  {tab === id && <Check className="h-3.5 w-3.5 text-violet-600 ml-auto" />}
                </button>
              ))}
            </div>
          </nav>

          {/* Right panel */}
          <div className="flex-1 bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
            {renderPanel()}
          </div>
        </div>
      </div>
    </div>
  );
}
