"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  User,
  Building2,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanyStore } from "@/store/companyStore";
import type { Company } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Step1Data {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface Step2Data {
  companyName: string;
  gstin: string;
  pan: string;
  state: string;
  financialYearStart: "4" | "1";
}

type Step1Errors = Partial<Record<keyof Step1Data, string>>;
type Step2Errors = Partial<Record<keyof Step2Data, string>>;

interface RegisterResponse {
  user?: { id: string; name: string; email: string };
  company?: Company;
  error?: string;
}

interface CompaniesResponse {
  companies: Company[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman & Nicobar Islands",
  "Chandigarh",
  "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi",
];

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const { setCompanies, setActiveCompany } = useCompanyStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [step1, setStep1] = useState<Step1Data>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [step2, setStep2] = useState<Step2Data>({
    companyName: "",
    gstin: "",
    pan: "",
    state: "",
    financialYearStart: "4",
  });

  const [errors1, setErrors1] = useState<Step1Errors>({});
  const [errors2, setErrors2] = useState<Step2Errors>({});

  // ── Validation ──────────────────────────────────────────────────────────────

  function validateStep1(): Step1Errors {
    const e: Step1Errors = {};
    if (!step1.name.trim()) e.name = "Full name is required";
    if (!step1.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step1.email)) e.email = "Enter a valid email";
    if (!step1.password) e.password = "Password is required";
    else if (step1.password.length < 8) e.password = "Password must be at least 8 characters";
    else if (!/[A-Z]/.test(step1.password)) e.password = "Include at least one uppercase letter";
    else if (!/\d/.test(step1.password)) e.password = "Include at least one number";
    if (!step1.confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (step1.password !== step1.confirmPassword) e.confirmPassword = "Passwords do not match";
    return e;
  }

  function validateStep2(): Step2Errors {
    const e: Step2Errors = {};
    if (!step2.companyName.trim()) e.companyName = "Company name is required";
    if (step2.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(step2.gstin))
      e.gstin = "Enter a valid 15-digit GSTIN";
    if (step2.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(step2.pan))
      e.pan = "Enter a valid 10-character PAN";
    if (!step2.state) e.state = "Please select your state";
    return e;
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleNext() {
    const errs = validateStep1();
    if (Object.keys(errs).length) {
      setErrors1(errs);
      return;
    }
    setErrors1({});
    setStep(2);
  }

  function updateStep1<K extends keyof Step1Data>(key: K, value: Step1Data[K]) {
    setStep1((prev) => ({ ...prev, [key]: value }));
    if (errors1[key]) setErrors1((prev) => ({ ...prev, [key]: undefined }));
  }

  function updateStep2<K extends keyof Step2Data>(key: K, value: Step2Data[K]) {
    setStep2((prev) => ({ ...prev, [key]: value }));
    if (errors2[key]) setErrors2((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateStep2();
    if (Object.keys(errs).length) {
      setErrors2(errs);
      return;
    }
    setErrors2({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: step1.name,
          email: step1.email,
          password: step1.password,
          companyName: step2.companyName,
          gstin: step2.gstin || undefined,
          pan: step2.pan || undefined,
          state: step2.state,
          financialYearStart: Number(step2.financialYearStart),
        }),
      });

      const data = (await res.json()) as RegisterResponse;

      if (!res.ok) {
        toast.error(data.error ?? "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // Fetch companies
      const companiesRes = await fetch("/api/companies");
      if (companiesRes.ok) {
        const companiesData = (await companiesRes.json()) as CompaniesResponse;
        const companies = companiesData.companies ?? [];
        setCompanies(companies);
        if (companies.length > 0) {
          setActiveCompany(companies[0]);
        }
      } else if (data.company) {
        setCompanies([data.company]);
        setActiveCompany(data.company);
      }

      toast.success("Account created! Welcome to Accura 🎉");
      router.push("/dashboard");
    } catch {
      toast.error("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">
          Create your account
        </h2>
        <p className="mt-1.5 text-sm text-text-muted">
          Set up Accura for your business in under 2 minutes
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { num: 1, label: "Account", icon: <User className="w-3.5 h-3.5" /> },
          { num: 2, label: "Company", icon: <Building2 className="w-3.5 h-3.5" /> },
        ].map(({ num, label, icon }, i) => {
          const isActive = step === num;
          const isDone = step > num;
          return (
            <div key={num} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px flex-1 w-12 transition-colors duration-300 ${
                    isDone ? "bg-primary" : "bg-border-subtle"
                  }`}
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isDone
                      ? "bg-primary text-white"
                      : isActive
                      ? "bg-primary text-white ring-4 ring-blue-100"
                      : "bg-gray-100 text-text-muted"
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : icon}
                </div>
                <span
                  className={`text-xs font-semibold transition-colors ${
                    isActive ? "text-primary" : isDone ? "text-text-primary" : "text-text-muted"
                  }`}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-text-primary">
              Full name
            </Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Rajesh Kumar"
              value={step1.name}
              onChange={(e) => updateStep1("name", e.target.value)}
              className={
                errors1.name
                  ? "border-red-400 focus:border-red-500 h-10 text-sm px-3"
                  : "h-10 text-sm px-3"
              }
            />
            {errors1.name && <p className="text-xs text-red-500">{errors1.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-email" className="text-xs font-semibold text-text-primary">
              Work email
            </Label>
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={step1.email}
              onChange={(e) => updateStep1("email", e.target.value)}
              className={
                errors1.email
                  ? "border-red-400 focus:border-red-500 h-10 text-sm px-3"
                  : "h-10 text-sm px-3"
              }
            />
            {errors1.email && <p className="text-xs text-red-500">{errors1.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-password" className="text-xs font-semibold text-text-primary">
              Password
            </Label>
            <div className="relative">
              <Input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Create a strong password"
                value={step1.password}
                onChange={(e) => updateStep1("password", e.target.value)}
                className={
                  errors1.password
                    ? "border-red-400 focus:border-red-500 h-10 text-sm px-3 pr-10"
                    : "h-10 text-sm px-3 pr-10"
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors1.password && <p className="text-xs text-red-500">{errors1.password}</p>}

            {/* Password strength indicators */}
            {step1.password.length > 0 && (
              <div className="flex gap-3 mt-2">
                {PASSWORD_RULES.map(({ label, test }) => {
                  const pass = test(step1.password);
                  return (
                    <div key={label} className="flex items-center gap-1">
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                          pass ? "bg-green-100" : "bg-gray-100"
                        }`}
                      >
                        <Check
                          className={`w-2 h-2 transition-colors ${
                            pass ? "text-green-600" : "text-gray-300"
                          }`}
                        />
                      </div>
                      <span
                        className={`text-[10px] transition-colors ${
                          pass ? "text-green-600" : "text-text-muted"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="confirm-password"
              className="text-xs font-semibold text-text-primary"
            >
              Confirm password
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={step1.confirmPassword}
                onChange={(e) => updateStep1("confirmPassword", e.target.value)}
                className={
                  errors1.confirmPassword
                    ? "border-red-400 focus:border-red-500 h-10 text-sm px-3 pr-10"
                    : "h-10 text-sm px-3 pr-10"
                }
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors1.confirmPassword && (
              <p className="text-xs text-red-500">{errors1.confirmPassword}</p>
            )}
          </div>

          <Button
            type="button"
            className="w-full h-10 text-sm font-semibold gap-2 mt-2"
            onClick={handleNext}
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Company name */}
          <div className="space-y-1.5">
            <Label htmlFor="companyName" className="text-xs font-semibold text-text-primary">
              Company / Business name
            </Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Acme Pvt. Ltd."
              value={step2.companyName}
              onChange={(e) => updateStep2("companyName", e.target.value)}
              className={
                errors2.companyName
                  ? "border-red-400 focus:border-red-500 h-10 text-sm px-3"
                  : "h-10 text-sm px-3"
              }
            />
            {errors2.companyName && (
              <p className="text-xs text-red-500">{errors2.companyName}</p>
            )}
          </div>

          {/* GSTIN */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="gstin" className="text-xs font-semibold text-text-primary">
                GSTIN
              </Label>
              <span className="text-xs text-text-muted">Optional</span>
            </div>
            <Input
              id="gstin"
              type="text"
              placeholder="27AAPFU0939F1ZV"
              maxLength={15}
              value={step2.gstin}
              onChange={(e) => updateStep2("gstin", e.target.value.toUpperCase())}
              className={
                errors2.gstin
                  ? "border-red-400 focus:border-red-500 h-10 text-sm px-3 font-mono tracking-wider"
                  : "h-10 text-sm px-3 font-mono tracking-wider"
              }
            />
            {errors2.gstin && <p className="text-xs text-red-500">{errors2.gstin}</p>}
          </div>

          {/* PAN */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="pan" className="text-xs font-semibold text-text-primary">
                PAN
              </Label>
              <span className="text-xs text-text-muted">Optional</span>
            </div>
            <Input
              id="pan"
              type="text"
              placeholder="AAPFU0939F"
              maxLength={10}
              value={step2.pan}
              onChange={(e) => updateStep2("pan", e.target.value.toUpperCase())}
              className={
                errors2.pan
                  ? "border-red-400 focus:border-red-500 h-10 text-sm px-3 font-mono tracking-wider"
                  : "h-10 text-sm px-3 font-mono tracking-wider"
              }
            />
            {errors2.pan && <p className="text-xs text-red-500">{errors2.pan}</p>}
          </div>

          {/* State */}
          <div className="space-y-1.5">
            <Label htmlFor="state" className="text-xs font-semibold text-text-primary">
              State / UT
            </Label>
            <select
              id="state"
              value={step2.state}
              onChange={(e) => updateStep2("state", e.target.value)}
              className={`flex h-10 w-full border bg-white px-3 py-1 text-sm font-medium transition-colors focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 rounded-none ${
                errors2.state
                  ? "border-red-400 focus:border-red-500"
                  : "border-border-subtle"
              } ${!step2.state ? "text-text-muted" : "text-text-primary"}`}
            >
              <option value="" disabled>
                Select your state
              </option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors2.state && <p className="text-xs text-red-500">{errors2.state}</p>}
          </div>

          {/* Financial year start */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-text-primary">
              Financial year start
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "4", label: "April", sub: "Apr–Mar (Standard)" },
                { value: "1", label: "January", sub: "Jan–Dec" },
              ].map(({ value, label, sub }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateStep2("financialYearStart", value as "4" | "1")}
                  className={`relative p-3 border rounded-xl text-left transition-all duration-150 ${
                    step2.financialYearStart === value
                      ? "border-primary bg-blue-50 ring-1 ring-primary"
                      : "border-border-subtle bg-white hover:border-primary/40 hover:bg-gray-50"
                  }`}
                >
                  {step2.financialYearStart === value && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <p
                    className={`text-sm font-semibold ${
                      step2.financialYearStart === value ? "text-primary" : "text-text-primary"
                    }`}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 text-sm font-medium border-border-subtle"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 h-10 text-sm font-semibold gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  Create account
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Divider + login link */}
      <div className="mt-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-border-subtle" />
        <span className="text-xs text-text-muted">Already have an account?</span>
        <div className="flex-1 h-px bg-border-subtle" />
      </div>

      <Link href="/login" className="block mt-4">
        <Button
          variant="outline"
          className="w-full h-10 text-sm font-medium text-text-primary border-border-subtle hover:bg-gray-50 hover:border-primary/40 transition-all"
        >
          Sign in instead
        </Button>
      </Link>

      <p className="mt-6 text-center text-xs text-text-muted">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="text-primary hover:underline">
          Terms
        </Link>{" "}
        &{" "}
        <Link href="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
