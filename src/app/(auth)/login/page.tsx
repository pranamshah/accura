"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCompanyStore } from "@/store/companyStore";
import type { Company } from "@/types";

interface LoginResponse {
  user?: { id: string; name: string; email: string };
  error?: string;
}

interface CompaniesResponse {
  companies: Company[];
}

export default function LoginPage() {
  const router = useRouter();
  const { setCompanies, setActiveCompany } = useCompanyStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
    if (!password) errors.password = "Password is required";
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = (await res.json()) as LoginResponse;

      if (!res.ok) {
        toast.error(data.error ?? "Invalid email or password. Please try again.");
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
      }

      toast.success("Welcome back! Redirecting…");
      router.push("/dashboard");
    } catch {
      toast.error("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">
          Sign in to your account
        </h2>
        <p className="mt-1.5 text-sm text-text-muted">
          Enter your credentials to access your dashboard
        </p>
      </div>

      {/* Demo credentials card */}
      <div className="mb-6 p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
        <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
            <path
              d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 110 1.5A.75.75 0 018 4zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 7z"
              fill="#2563eb"
            />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-blue-700 mb-0.5">Demo credentials</p>
          <p className="text-xs text-blue-600 font-mono">
            demo@accura.in&nbsp; / &nbsp;Demo@123
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-text-primary">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            className={
              fieldErrors.email
                ? "border-red-400 focus:border-red-500 h-10 text-sm px-3"
                : "h-10 text-sm px-3"
            }
            disabled={loading}
          />
          {fieldErrors.email && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold text-text-primary">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password)
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              className={
                fieldErrors.password
                  ? "border-red-400 focus:border-red-500 h-10 text-sm px-3 pr-10"
                  : "h-10 text-sm px-3 pr-10"
              }
              disabled={loading}
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
          {fieldErrors.password && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
          )}
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2.5">
          <Checkbox
            id="rememberMe"
            checked={rememberMe}
            onCheckedChange={(val) => setRememberMe(val === true)}
            disabled={loading}
          />
          <Label
            htmlFor="rememberMe"
            className="text-sm text-text-muted cursor-pointer select-none"
          >
            Remember me for 30 days
          </Label>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-10 text-sm font-semibold gap-2 mt-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Sign in
            </>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-border-subtle" />
        <span className="text-xs text-text-muted">New to Accura?</span>
        <div className="flex-1 h-px bg-border-subtle" />
      </div>

      {/* Register link */}
      <Link href="/register" className="block">
        <Button
          variant="outline"
          className="w-full h-10 text-sm font-medium text-text-primary border-border-subtle hover:bg-gray-50 hover:border-primary/40 transition-all"
        >
          Create a free account
        </Button>
      </Link>

      <p className="mt-6 text-center text-xs text-text-muted">
        By signing in you agree to our{" "}
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
