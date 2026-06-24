"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { INDIAN_STATES } from "@/lib/utils";
import { signIn } from "next-auth/react";

const step1Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const step2Schema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  businessType: z.enum(["SOLE_PROPRIETORSHIP", "PARTNERSHIP", "LLP", "PRIVATE_LIMITED", "PUBLIC_LIMITED", "OPC", "TRUST", "NGO"]).default("PRIVATE_LIMITED"),
  financialYearStart: z.number().default(4),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [step1Data, setStep1Data] = useState<Step1 | null>(null);

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema) as unknown as Resolver<Step2>,
    defaultValues: { businessType: "PRIVATE_LIMITED", financialYearStart: 4 },
  });

  const handleStep1 = (data: Step1) => {
    setStep1Data(data);
    setStep(2);
  };

  const handleStep2 = async (data: Step2) => {
    if (!step1Data) return;
    setLoading(true);

    try {
      // Create user
      const userRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: step1Data.name,
          email: step1Data.email,
          password: step1Data.password,
        }),
      });

      if (!userRes.ok) {
        const err = await userRes.json() as { error?: string };
        throw new Error(err.error || "Failed to create account");
      }

      // Sign in
      await signIn("credentials", {
        email: step1Data.email,
        password: step1Data.password,
        redirect: false,
      });

      // Create company
      const coRes = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.companyName,
          gstin: data.gstin,
          pan: data.pan,
          address: data.address,
          city: data.city,
          state: data.state,
          stateCode: data.stateCode,
          pincode: data.pincode,
          phone: data.phone,
          email: data.email,
          businessType: data.businessType,
          financialYearStart: data.financialYearStart,
        }),
      });

      if (!coRes.ok) throw new Error("Failed to create company");

      toast.success("Account created! Welcome to Accura.");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="text-[22px] font-bold text-text-primary">Create your Accura account</h1>
          <p className="text-[12px] text-text-muted mt-1">Step {step} of 2</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-6">
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-border-subtle"}`} />
        </div>

        <div className="bg-white rounded-xl border border-border-subtle p-8 shadow-sm">
          {step === 1 ? (
            <>
              <h2 className="text-[15px] font-semibold mb-5">Your Account Details</h2>
              <form onSubmit={form1.handleSubmit(handleStep1)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Full Name</Label>
                  <Input className="h-10 text-[13px]" placeholder="Rajesh Kumar" {...form1.register("name")} />
                  {form1.formState.errors.name && <p className="text-[11px] text-error">{form1.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Email Address</Label>
                  <Input className="h-10 text-[13px]" type="email" placeholder="rajesh@company.com" {...form1.register("email")} />
                  {form1.formState.errors.email && <p className="text-[11px] text-error">{form1.formState.errors.email.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">Password</Label>
                    <Input className="h-10 text-[13px]" type="password" placeholder="••••••••" {...form1.register("password")} />
                    {form1.formState.errors.password && <p className="text-[11px] text-error">{form1.formState.errors.password.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">Confirm Password</Label>
                    <Input className="h-10 text-[13px]" type="password" placeholder="••••••••" {...form1.register("confirmPassword")} />
                    {form1.formState.errors.confirmPassword && <p className="text-[11px] text-error">{form1.formState.errors.confirmPassword.message}</p>}
                  </div>
                </div>
                <Button type="submit" className="w-full h-10 bg-primary gap-2">
                  Next: Company Details <ArrowRight size={14} />
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-5">
                <button onClick={() => setStep(1)} className="p-1 hover:bg-row-alt rounded">
                  <ArrowLeft size={16} />
                </button>
                <h2 className="text-[15px] font-semibold">Company Details</h2>
              </div>
              <form onSubmit={form2.handleSubmit(handleStep2)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Company Name *</Label>
                  <Input className="h-10 text-[13px]" placeholder="Acme Pvt Ltd" {...form2.register("companyName")} />
                  {form2.formState.errors.companyName && <p className="text-[11px] text-error">{form2.formState.errors.companyName.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">GSTIN</Label>
                    <Input className="h-10 text-[13px] font-mono" placeholder="33AABCA1234F1Z5" {...form2.register("gstin")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">PAN</Label>
                    <Input className="h-10 text-[13px] font-mono" placeholder="AABCA1234F" {...form2.register("pan")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Business Type</Label>
                  <Select defaultValue="PRIVATE_LIMITED" onValueChange={(v) => form2.setValue("businessType", v as "PRIVATE_LIMITED")}>
                    <SelectTrigger className="h-10 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOLE_PROPRIETORSHIP">Sole Proprietorship</SelectItem>
                      <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                      <SelectItem value="LLP">LLP</SelectItem>
                      <SelectItem value="PRIVATE_LIMITED">Private Limited</SelectItem>
                      <SelectItem value="PUBLIC_LIMITED">Public Limited</SelectItem>
                      <SelectItem value="OPC">OPC</SelectItem>
                      <SelectItem value="TRUST">Trust</SelectItem>
                      <SelectItem value="NGO">NGO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">City</Label>
                    <Input className="h-10 text-[13px]" placeholder="Chennai" {...form2.register("city")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">State</Label>
                    <Select onValueChange={(v) => {
                      const st = INDIAN_STATES.find(s => s.code === v);
                      form2.setValue("state", st?.name || "");
                      form2.setValue("stateCode", v);
                    }}>
                      <SelectTrigger className="h-10 text-[13px]">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((s) => (
                          <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">Phone</Label>
                    <Input className="h-10 text-[13px]" placeholder="+91 98765 43210" {...form2.register("phone")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">Financial Year Start</Label>
                    <Select defaultValue="4" onValueChange={(v) => form2.setValue("financialYearStart", parseInt(v))}>
                      <SelectTrigger className="h-10 text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">April (Standard)</SelectItem>
                        <SelectItem value="1">January</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full h-10 bg-primary" disabled={loading}>
                  {loading ? <><Loader2 size={15} className="animate-spin mr-2" /> Creating Account...</> : "Create Account & Get Started"}
                </Button>
              </form>
            </>
          )}

          <p className="text-[12px] text-text-muted text-center mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
