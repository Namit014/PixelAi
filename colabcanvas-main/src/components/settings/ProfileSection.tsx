import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProfileSectionProps {
  user: any;
  profile: any;
  onProfileUpdate: () => void;
}

export const ProfileSection = ({ user, profile, onProfileUpdate }: ProfileSectionProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [reduceMotion, setReduceMotion] = useState(profile?.reduce_motion || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      onProfileUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReduceMotionToggle = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ reduce_motion: checked })
        .eq("id", user.id);

      if (error) throw error;

      setReduceMotion(checked);
      toast({
        title: "Preference updated",
        description: `Animations ${checked ? 'disabled' : 'enabled'}`,
      });
      
      // Apply the change immediately
      if (checked) {
        document.body.classList.add('reduce-motion');
      } else {
        document.body.classList.remove('reduce-motion');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update preference",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-zinc-200">
      <h2 className="text-xl font-semibold text-zinc-900 mb-6">Profile Information</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-zinc-700">Email</Label>
          <Input
            id="email"
            type="email"
            value={user?.email || ""}
            disabled
            className="bg-zinc-50 border-zinc-200 text-zinc-500"
          />
          <p className="text-sm text-zinc-500 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <Label htmlFor="fullName" className="text-zinc-700">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className="bg-white border-zinc-300 text-zinc-900 transition-all duration-200"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reduce-motion" className="text-zinc-700">Reduce Motion</Label>
              <p className="text-sm text-zinc-500">
                Disables all animations across the platform
              </p>
            </div>
            <Switch
              id="reduce-motion"
              checked={reduceMotion}
              onCheckedChange={handleReduceMotionToggle}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSaving}
          className="bg-zinc-900 hover:bg-zinc-800 text-white press-effect"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
};
