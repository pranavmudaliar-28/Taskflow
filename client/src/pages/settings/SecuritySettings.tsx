import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
    ShieldCheck,
    Key,
    Smartphone,
    History,
    LogOut,
    AlertTriangle,
    Fingerprint
} from "lucide-react";

export default function SecuritySettings() {
    const { logout } = useAuth();
    const { toast } = useToast();
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const changePassword = useMutation({
        mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
            const res = await apiRequest("POST", "/api/user/change-password", data);
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Password changed successfully" });
            setPasswordDialogOpen(false);
            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        },
        onError: (e: any) => toast({ title: "Failed to change password", description: e?.message, variant: "destructive" }),
    });

    const handleChangePassword = () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast({ title: "Passwords match error", description: "New passwords do not match", variant: "destructive" });
            return;
        }
        if (passwordData.newPassword.length < 6) {
            toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
            return;
        }
        changePassword.mutate({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Security & Permissions</h2>
                <p className="text-muted-foreground mt-1">Manage your password, 2FA, and account security settings.</p>
            </div>

            <div className="grid gap-6">
                {/* Password Section */}
                <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="p-6 flex items-center justify-between gap-4">
                        <div className="flex gap-4">
                            <div className="h-12 w-12 rounded-xl bg-violet-600/10 flex items-center justify-center shrink-0">
                                <Key className="h-6 w-6 text-violet-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Password</h3>
                                <p className="text-sm text-muted-foreground mt-1">Update your account password regularly to stay secure.</p>
                            </div>
                        </div>
                        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="border-violet-600/20 hover:bg-violet-600/5 hover:text-violet-600">
                                    Update Password
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Update Password</DialogTitle>
                                    <DialogDescription>
                                        Choose a strong password with at least 6 characters.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Current Password</Label>
                                        <Input
                                            type="password"
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData(d => ({ ...d, currentPassword: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>New Password</Label>
                                        <Input
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData(d => ({ ...d, newPassword: e.target.value }))}
                                            placeholder="Min 6 characters"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Confirm New Password</Label>
                                        <Input
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData(d => ({ ...d, confirmPassword: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="ghost" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
                                    <Button
                                        className="bg-violet-600 hover:bg-violet-700 text-white"
                                        onClick={handleChangePassword}
                                        disabled={changePassword.isPending}
                                    >
                                        {changePassword.isPending ? "Updating..." : "Update Password"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </section>

                {/* 2FA Section (Placeholder) */}
                <section className="bg-card rounded-2xl border border-border shadow-sm p-6 flex items-center justify-between opacity-70 grayscale-[0.5]">
                    <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                            <Smartphone className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Two-Factor Authentication</h3>
                            <p className="text-sm text-muted-foreground mt-1 text-amber-600 font-medium flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" /> Coming Soon: Secure your account with mobile app or SMS.
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" disabled>Enable 2FA</Button>
                </section>

                {/* Sessions Section (Placeholder) */}
                <section className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
                    <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-xl bg-violet-600/10 flex items-center justify-center shrink-0">
                            <History className="h-6 w-6 text-violet-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-foreground">Login History</h3>
                                <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 hover:bg-violet-600/5">
                                    Sign out from all devices
                                </Button>
                            </div>
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center justify-between text-sm py-2 px-3 bg-accent/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                        <div>
                                            <p className="font-semibold">Chrome on Windows (Current Session)</p>
                                            <p className="text-xs text-muted-foreground">San Francisco, USA · Last active 1 min ago</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">ACTIVE</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="rounded-2xl border-2 border-red-500/20 bg-red-500/5 p-6 space-y-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-600">Danger Zone</h3>
                            <p className="text-xs text-red-600/80">Permanent and irreversible actions for your account.</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-foreground">Delete Account</p>
                            <p className="text-xs text-muted-foreground">All data will be permanently removed.</p>
                        </div>
                        <Button variant="outline" className="text-red-600 border-red-500/30 hover:bg-red-500/10 hover:text-red-700">
                            Delete My Account
                        </Button>
                    </div>
                </section>
            </div>
        </div>
    );
}
