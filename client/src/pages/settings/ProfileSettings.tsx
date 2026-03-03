import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit2, Save, X } from "lucide-react";

export default function ProfileSettings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [firstName, setFirstName] = useState(user?.firstName || "");
    const [lastName, setLastName] = useState(user?.lastName || "");
    const [email, setEmail] = useState(user?.email || "");

    const initials = user?.firstName && user?.lastName
        ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
        : (user?.email?.[0]?.toUpperCase() || "U");

    const displayName = user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}` : user?.email || "User";

    const updateProfile = useMutation({
        mutationFn: async (data: { firstName?: string; lastName?: string; email?: string }) => {
            const res = await apiRequest("PATCH", "/api/user/profile", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            toast({ title: "Profile saved", variant: "success" });
            setIsEditing(false);
        },
        onError: (e: any) => toast({ title: "Failed to save", description: e?.message, variant: "destructive" }),
    });

    const handleSaveProfile = () => {
        const updates: any = {};
        if (firstName !== user?.firstName) updates.firstName = firstName;
        if (lastName !== user?.lastName) updates.lastName = lastName;
        if (email !== user?.email) updates.email = email;
        if (Object.keys(updates).length > 0) updateProfile.mutate(updates);
        else setIsEditing(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-2xl font-bold text-foreground">My Profile</h2>
                <p className="text-muted-foreground mt-1">Manage your personal information and how others see you.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-accent/20 rounded-2xl border border-border">
                <div className="relative group">
                    <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl">
                        <AvatarImage src={user?.profileImageUrl || undefined} />
                        <AvatarFallback className="text-2xl font-bold bg-violet-600 text-white">{initials}</AvatarFallback>
                    </Avatar>
                    <button className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 className="h-5 w-5" />
                    </button>
                </div>
                <div className="text-center sm:text-left">
                    <p className="text-xl font-bold text-foreground">{displayName}</p>
                    <p className="text-muted-foreground">{user?.email}</p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                        <Badge variant="secondary" className="bg-violet-600/10 text-violet-600 border-violet-600/20 capitalize px-3 py-0.5">
                            {user?.plan || "Free"} Plan
                        </Badge>
                        <Badge variant="outline" className="capitalize px-3 py-0.5">
                            {(user as any)?.role || "Member"}
                        </Badge>
                    </div>
                </div>
                {!isEditing && (
                    <Button
                        variant="outline"
                        className="sm:ml-auto gap-2 border-violet-600/20 hover:bg-violet-600/5 hover:text-violet-600"
                        onClick={() => setIsEditing(true)}
                    >
                        <Edit2 className="h-4 w-4" /> Edit Profile
                    </Button>
                )}
            </div>

            <div className="grid gap-6">
                <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-semibold">First Name</Label>
                        <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={!isEditing}
                            className="bg-background border-border focus:ring-2 focus:ring-violet-600/20"
                            placeholder="Enter your first name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-semibold">Last Name</Label>
                        <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={!isEditing}
                            className="bg-background border-border focus:ring-2 focus:ring-violet-600/20"
                            placeholder="Enter your last name"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={!isEditing}
                        className="bg-background border-border focus:ring-2 focus:ring-violet-600/20"
                        placeholder="your.email@example.com"
                    />
                    <p className="text-xs text-muted-foreground italic">Important: Changing your email will require re-verification.</p>
                </div>
            </div>

            {isEditing && (
                <div className="flex items-center gap-3 pt-4 border-t border-border mt-4">
                    <Button
                        onClick={handleSaveProfile}
                        disabled={updateProfile.isPending}
                        className="bg-violet-600 hover:bg-violet-700 text-white min-w-[120px] shadow-lg shadow-violet-600/20"
                    >
                        {updateProfile.isPending ? (
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Save className="h-4 w-4" /> Save Changes
                            </span>
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setFirstName(user?.firstName || "");
                            setLastName(user?.lastName || "");
                            setEmail(user?.email || "");
                            setIsEditing(false);
                        }}
                        className="hover:bg-accent"
                    >
                        <X className="h-4 w-4 mr-2" /> Cancel
                    </Button>
                </div>
            )}
        </div>
    );
}
