import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Copy, Trash2, RefreshCw, Tag, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type DiscountType = "percent" | "flat";
type Scope = "talent" | "ai" | "plan" | "all";

interface Coupon {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  scope: Scope;
  description?: string | null;
  created_at: string;
}

const empty = {
  code: "",
  discount_type: "percent" as DiscountType,
  discount_value: 10,
  max_uses: "",
  expires_at: "",
  description: "",
};

interface FieldErrors {
  code?: string;
  discount_value?: string;
  max_uses?: string;
  expires_at?: string;
}

const validate = (form: typeof empty): FieldErrors => {
  const errors: FieldErrors = {};
  const code = form.code.trim();
  if (!code) errors.code = "Code is required";
  else if (!/^[A-Z0-9_-]{3,32}$/.test(code.toUpperCase()))
    errors.code = "3–32 chars, letters/numbers/_- only";

  const value = Number(form.discount_value);
  if (!form.discount_value && form.discount_value !== 0) errors.discount_value = "Value is required";
  else if (Number.isNaN(value) || value <= 0) errors.discount_value = "Must be greater than 0";
  else if (form.discount_type === "percent" && value > 100) errors.discount_value = "Percent cannot exceed 100";
  else if (form.discount_type === "flat" && value > 1_000_000) errors.discount_value = "Flat amount too large";

  if (form.max_uses) {
    const m = Number(form.max_uses);
    if (Number.isNaN(m) || m < 1) errors.max_uses = "Must be at least 1";
  }

  if (form.expires_at) {
    const exp = new Date(form.expires_at);
    if (Number.isNaN(exp.getTime())) errors.expires_at = "Invalid date";
    else if (exp.getTime() < Date.now() - 24 * 60 * 60 * 1000) errors.expires_at = "Date is in the past";
  }

  return errors;
};

export const TalentCouponsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [rows, setRows] = useState<Coupon[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [errors, setErrors] = useState<FieldErrors>({});

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("scope", "talent")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data as any) ?? []);
    } catch (e: any) {
      toast({
        title: "Could not load coupons",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      toast({ title: "Fix the highlighted fields", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const code = form.code.trim().toUpperCase();
      // Pre-flight: check duplicate code
      const { data: existing, error: existErr } = await supabase
        .from("promo_codes")
        .select("id, code")
        .eq("code", code)
        .maybeSingle();
      if (existErr && existErr.code !== "PGRST116") throw existErr;
      if (existing) {
        setErrors({ code: "This code already exists" });
        toast({ title: "Code already exists", description: code, variant: "destructive" });
        return;
      }

      const payload: any = {
        code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        scope: "talent",
        active: true,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        description: form.description?.trim() || null,
      };
      const { error } = await supabase.from("promo_codes").insert(payload);
      if (error) throw error;
      toast({ title: "Coupon created", description: code });
      setForm({ ...empty });
      setErrors({});
      await load();
    } catch (e: any) {
      const msg = e?.message ?? "Unknown error";
      toast({
        title: "Could not create coupon",
        description: msg.includes("permission") || msg.includes("RLS")
          ? "You need admin access to create coupons."
          : msg,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    const { error } = await supabase.from("promo_codes").update({ active: !c.active }).eq("id", c.id);
    if (error) toast({ title: "Could not update", description: error.message, variant: "destructive" });
    else { toast({ title: c.active ? "Coupon disabled" : "Coupon enabled" }); load(); }
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return;
    const { error } = await supabase.from("promo_codes").delete().eq("id", c.id);
    if (error) toast({ title: "Could not delete", description: error.message, variant: "destructive" });
    else { toast({ title: "Coupon deleted", description: c.code }); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Tag className="w-5 h-5" /> Talent coupons</h2>
          <p className="text-sm text-zinc-500">Discount codes that apply to Talent project payments only.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">New coupon</div>
        <div className="grid md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs">Code</Label>
            <Input
              placeholder="LAUNCH20"
              value={form.code}
              onChange={e => { setForm(f => ({ ...f, code: e.target.value.toUpperCase() })); if (errors.code) setErrors(p => ({ ...p, code: undefined })); }}
              className={errors.code ? "border-destructive focus-visible:ring-destructive" : ""}
              maxLength={32}
            />
            {errors.code && <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.code}</p>}
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select
              value={form.discount_type}
              onValueChange={v => { setForm(f => ({ ...f, discount_type: v as DiscountType })); setErrors(p => ({ ...p, discount_value: undefined })); }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentage (%)</SelectItem>
                <SelectItem value="flat">Flat amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <Input
              type="number"
              min={1}
              max={form.discount_type === "percent" ? 100 : undefined}
              value={form.discount_value}
              onChange={e => { setForm(f => ({ ...f, discount_value: Number(e.target.value) })); if (errors.discount_value) setErrors(p => ({ ...p, discount_value: undefined })); }}
              className={errors.discount_value ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.discount_value && <p className="text-[11px] text-destructive mt-1">{errors.discount_value}</p>}
          </div>
          <div>
            <Label className="text-xs">Max uses</Label>
            <Input
              type="number"
              min={1}
              placeholder="∞"
              value={form.max_uses}
              onChange={e => { setForm(f => ({ ...f, max_uses: e.target.value })); if (errors.max_uses) setErrors(p => ({ ...p, max_uses: undefined })); }}
              className={errors.max_uses ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.max_uses && <p className="text-[11px] text-destructive mt-1">{errors.max_uses}</p>}
          </div>
          <div>
            <Label className="text-xs">Expires</Label>
            <Input
              type="date"
              value={form.expires_at}
              onChange={e => { setForm(f => ({ ...f, expires_at: e.target.value })); if (errors.expires_at) setErrors(p => ({ ...p, expires_at: undefined })); }}
              className={errors.expires_at ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.expires_at && <p className="text-[11px] text-destructive mt-1">{errors.expires_at}</p>}
          </div>
          <div className="md:col-span-5">
            <Label className="text-xs">Description (optional)</Label>
            <Input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Internal note"
              maxLength={200}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={create} disabled={creating} className="w-full">
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-4 h-4 animate-spin inline" /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-zinc-500">No talent coupons yet</TableCell></TableRow>
            ) : rows.map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-mono font-semibold">{c.code}</div>
                  {c.description && <div className="text-xs text-zinc-500">{c.description}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {c.discount_type === "percent" ? `${c.discount_value}%` : `$${c.discount_value}`}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{c.used_count ?? 0}{c.max_uses ? ` / ${c.max_uses}` : ""}</TableCell>
                <TableCell className="text-sm text-zinc-600">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell><Switch checked={c.active} onCheckedChange={() => toggleActive(c)} /></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(c.code); toast({ title: "Copied", description: c.code }); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(c)}>
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
