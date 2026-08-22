import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Copy, Trash2, RefreshCw, Percent, IndianRupee, Eye } from "lucide-react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_purchase_amount: number;
  max_uses: number | null;
  current_uses: number;
  max_uses_per_user: number;
  applicable_plan_ids: string[] | null;
  applicable_billing_periods: string[] | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface DiscountUsage {
  id: string;
  user_id: string;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  used_at: string;
  profiles?: { email: string; full_name: string | null };
}

interface Plan {
  id: string;
  name: string;
}

export function DiscountCodesTab() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [selectedCodeUsage, setSelectedCodeUsage] = useState<DiscountUsage[]>([]);
  const [selectedCodeName, setSelectedCodeName] = useState("");
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: 10,
    min_purchase_amount: 0,
    max_uses: "",
    max_uses_per_user: 1,
    applicable_plan_ids: [] as string[],
    applicable_billing_periods: [] as string[],
    expires_at: "",
  });

  useEffect(() => {
    loadCodes();
    loadPlans();
  }, []);

  useRealtimeSubscription(["discount_codes", "discount_code_usage", "subscription_plans"], () => {
    loadCodes();
    loadPlans();
  });

  const loadCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCodes((data as DiscountCode[]) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load discount codes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, name")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Failed to load plans:", error);
    }
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, code }));
  };

  const handleCreate = async () => {
    try {
      if (!formData.code || !formData.discount_value) {
        toast({
          title: "Validation Error",
          description: "Code and discount value are required",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const insertData: any = {
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        min_purchase_amount: formData.min_purchase_amount || 0,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        max_uses_per_user: formData.max_uses_per_user || 1,
        applicable_plan_ids:
          formData.applicable_plan_ids.length > 0
            ? formData.applicable_plan_ids
            : null,
        applicable_billing_periods:
          formData.applicable_billing_periods.length > 0
            ? formData.applicable_billing_periods
            : null,
        expires_at: formData.expires_at || null,
        created_by: user?.id,
      };

      const { error } = await supabase.from("discount_codes").insert(insertData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Discount code created successfully",
      });

      setCreateDialogOpen(false);
      resetForm();
      loadCodes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create discount code",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: 10,
      min_purchase_amount: 0,
      max_uses: "",
      max_uses_per_user: 1,
      applicable_plan_ids: [],
      applicable_billing_periods: [],
      expires_at: "",
    });
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("discount_codes")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      loadCodes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update code status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("discount_codes").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Discount code deleted",
      });
      loadCodes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete code",
        variant: "destructive",
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Code copied to clipboard",
    });
  };

  const viewUsage = async (codeId: string, codeName: string) => {
    try {
      setSelectedCodeName(codeName);
      const { data, error } = await supabase
        .from("discount_code_usage")
        .select("*")
        .eq("code_id", codeId)
        .order("used_at", { ascending: false });

      if (error) throw error;
      setSelectedCodeUsage((data as DiscountUsage[]) || []);
      setUsageDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load usage data",
        variant: "destructive",
      });
    }
  };

  const togglePlanSelection = (planId: string) => {
    setFormData((prev) => ({
      ...prev,
      applicable_plan_ids: prev.applicable_plan_ids.includes(planId)
        ? prev.applicable_plan_ids.filter((id) => id !== planId)
        : [...prev.applicable_plan_ids, planId],
    }));
  };

  const toggleBillingPeriod = (period: string) => {
    setFormData((prev) => ({
      ...prev,
      applicable_billing_periods: prev.applicable_billing_periods.includes(period)
        ? prev.applicable_billing_periods.filter((p) => p !== period)
        : [...prev.applicable_billing_periods, period],
    }));
  };

  const totalDiscountsGiven = codes.reduce((sum, code) => {
    return sum + code.current_uses;
  }, 0);

  const getPlanName = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    return plan?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <p className="text-sm text-zinc-400">Total Codes</p>
          <p className="text-2xl font-bold text-zinc-100">{codes.length}</p>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <p className="text-sm text-zinc-400">Active Codes</p>
          <p className="text-2xl font-bold text-green-400">
            {codes.filter((c) => c.is_active).length}
          </p>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <p className="text-sm text-zinc-400">Total Redemptions</p>
          <p className="text-2xl font-bold text-zinc-100">{totalDiscountsGiven}</p>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <p className="text-sm text-zinc-400">Expired Codes</p>
          <p className="text-2xl font-bold text-zinc-500">
            {
              codes.filter(
                (c) => c.expires_at && new Date(c.expires_at) < new Date()
              ).length
            }
          </p>
        </Card>
      </div>

      {/* Create Button and Table */}
      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">Discount Codes</h2>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                <Plus className="w-4 h-4 mr-2" />
                Create Code
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">
                  Create Discount Code
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-zinc-300">Code</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={formData.code}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            code: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="SAVE20"
                        className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={generateCode}
                        className="bg-zinc-800 border-zinc-700"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-zinc-300">Description (optional)</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Summer sale discount"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-300">Discount Type</Label>
                      <Select
                        value={formData.discount_type}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, discount_type: value }))
                        }
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-zinc-300">
                        Discount Value{" "}
                        {formData.discount_type === "percentage" ? "(%)" : "(₹)"}
                      </Label>
                      <Input
                        type="number"
                        value={formData.discount_value}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            discount_value: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-300">Max Uses (blank = unlimited)</Label>
                      <Input
                        type="number"
                        value={formData.max_uses}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, max_uses: e.target.value }))
                        }
                        placeholder="100"
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Max Uses Per User</Label>
                      <Input
                        type="number"
                        value={formData.max_uses_per_user}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            max_uses_per_user: parseInt(e.target.value) || 1,
                          }))
                        }
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-zinc-300">Min Purchase Amount (₹)</Label>
                    <Input
                      type="number"
                      value={formData.min_purchase_amount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          min_purchase_amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                    />
                  </div>

                  {/* Applicable Plans */}
                  <div>
                    <Label className="text-zinc-300">
                      Applicable Plans{" "}
                      <span className="text-zinc-500 text-xs">(leave empty for all)</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-2 mt-2 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      {plans.map((plan) => (
                        <label
                          key={plan.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700/50 p-2 rounded"
                        >
                          <Checkbox
                            checked={formData.applicable_plan_ids.includes(plan.id)}
                            onCheckedChange={() => togglePlanSelection(plan.id)}
                            className="border-zinc-600"
                          />
                          <span className="text-zinc-300 text-sm">{plan.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Applicable Billing Periods */}
                  <div>
                    <Label className="text-zinc-300">
                      Applicable Billing Periods{" "}
                      <span className="text-zinc-500 text-xs">(leave empty for all)</span>
                    </Label>
                    <div className="flex gap-4 mt-2 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      {["monthly", "yearly"].map((period) => (
                        <label
                          key={period}
                          className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700/50 p-2 rounded"
                        >
                          <Checkbox
                            checked={formData.applicable_billing_periods.includes(period)}
                            onCheckedChange={() => toggleBillingPeriod(period)}
                            className="border-zinc-600"
                          />
                          <span className="text-zinc-300 text-sm capitalize">{period}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-zinc-300">Expires At (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={formData.expires_at}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, expires_at: e.target.value }))
                      }
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                    />
                  </div>

                  <Button onClick={handleCreate} className="w-full">
                    Create Discount Code
                  </Button>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-zinc-400">Loading...</p>
        ) : codes.length === 0 ? (
          <p className="text-zinc-500">No discount codes created yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Code</TableHead>
                <TableHead className="text-zinc-400">Discount</TableHead>
                <TableHead className="text-zinc-400">Restrictions</TableHead>
                <TableHead className="text-zinc-400">Usage</TableHead>
                <TableHead className="text-zinc-400">Expires</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => {
                const isExpired =
                  code.expires_at && new Date(code.expires_at) < new Date();
                const isMaxed =
                  code.max_uses !== null && code.current_uses >= code.max_uses;

                return (
                  <TableRow key={code.id} className="border-zinc-800">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-100">{code.code}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(code.code)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      {code.description && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {code.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {code.discount_type === "percentage" ? (
                          <Percent className="w-3 h-3 text-zinc-400" />
                        ) : (
                          <IndianRupee className="w-3 h-3 text-zinc-400" />
                        )}
                        <span className="text-zinc-100">
                          {code.discount_value}
                          {code.discount_type === "percentage" ? "%" : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 max-w-[180px]">
                        {code.applicable_plan_ids && code.applicable_plan_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {code.applicable_plan_ids.map((planId) => (
                              <Badge
                                key={planId}
                                variant="outline"
                                className="text-xs border-blue-500/30 text-blue-400 bg-blue-500/10"
                              >
                                {getPlanName(planId)}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        {code.applicable_billing_periods && code.applicable_billing_periods.length > 0 ? (
                          <div className="flex gap-1">
                            {code.applicable_billing_periods.map((period) => (
                              <Badge
                                key={period}
                                variant="secondary"
                                className="text-xs capitalize bg-purple-500/10 text-purple-400 border-purple-500/30"
                              >
                                {period}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        {!code.applicable_plan_ids && !code.applicable_billing_periods && (
                          <span className="text-xs text-zinc-500">All plans & periods</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-zinc-100">{code.current_uses}</span>
                      <span className="text-zinc-500">
                        /{code.max_uses || "∞"}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {code.expires_at
                        ? new Date(code.expires_at).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      {!code.is_active ? (
                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
                          Inactive
                        </Badge>
                      ) : isExpired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : isMaxed ? (
                        <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                          Maxed Out
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => viewUsage(code.id, code.code)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(code.id, code.is_active)}
                          className="text-xs"
                        >
                          {code.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleDelete(code.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Usage Dialog */}
      <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              Usage History: {selectedCodeName}
            </DialogTitle>
          </DialogHeader>
          {selectedCodeUsage.length === 0 ? (
            <p className="text-zinc-500 py-4">No usage records for this code.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Date</TableHead>
                  <TableHead className="text-zinc-400">Original</TableHead>
                  <TableHead className="text-zinc-400">Discount</TableHead>
                  <TableHead className="text-zinc-400">Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCodeUsage.map((usage) => (
                  <TableRow key={usage.id} className="border-zinc-800">
                    <TableCell className="text-zinc-300">
                      {new Date(usage.used_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      ₹{usage.original_amount}
                    </TableCell>
                    <TableCell className="text-green-400">
                      -₹{usage.discount_amount}
                    </TableCell>
                    <TableCell className="text-zinc-100 font-medium">
                      ₹{usage.final_amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
