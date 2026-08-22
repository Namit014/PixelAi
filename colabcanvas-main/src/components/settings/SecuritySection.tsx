import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock } from "lucide-react";
import { z } from "zod";

// Password validation schema - same as Auth.tsx
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const SecuritySection = () => {
  const { toast } = useToast();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    // Validate password using the same schema as signup
    const passwordValidation = passwordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      toast({
        title: "Error",
        description: passwordValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Password update error:', error);
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-zinc-200">
      <div className="flex items-center gap-3 mb-6">
        <Lock className="w-6 h-6 text-zinc-600" />
        <h2 className="text-xl font-semibold text-zinc-900">Security</h2>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        <div>
          <Label htmlFor="newPassword" className="text-zinc-700">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 8 chars, uppercase, lowercase, number"
            className="bg-white border-zinc-300 text-zinc-900"
            minLength={8}
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="text-zinc-700">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="bg-white border-zinc-300 text-zinc-900"
          />
        </div>

        <Button
          type="submit"
          disabled={isChangingPassword || !newPassword || !confirmPassword}
          className="bg-zinc-900 hover:bg-zinc-800 text-white"
        >
          {isChangingPassword ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  );
};
