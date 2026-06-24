"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid credentials. Please try again.");
      } else {
        toast.success("Welcome to Accura!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="text-[24px] font-bold text-text-primary">Welcome to Accura</h1>
          <p className="text-[13px] text-text-muted mt-1">
            India&apos;s modern accounting platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-border-subtle p-8 shadow-sm">
          <h2 className="text-[16px] font-semibold text-text-primary mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px]">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                className="h-10 text-[13px]"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-[11px] text-error">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[12px]">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-10 text-[13px] pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-error">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-primary hover:bg-primary/90 text-[13px] font-medium"
              disabled={loading}
            >
              {loading ? <><Loader2 size={15} className="animate-spin mr-2" /> Signing in...</> : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border-subtle">
            <p className="text-[12px] text-text-muted text-center">
              Demo credentials:{" "}
              <span className="font-mono text-primary">demo@accura.in</span>{" "}
              /{" "}
              <span className="font-mono text-primary">Demo@123</span>
            </p>
          </div>

          <p className="text-[12px] text-text-muted text-center mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
