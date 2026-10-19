"use client";

import Link from "next/link";
import { Pill } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

/** Map Supabase error codes/messages to user-friendly messages without leaking internals */
function getUserFriendlyError(error: { message: string; status?: number }): string {
  const msg = error.message.toLowerCase();
  if (
    msg.includes("already registered") ||
    msg.includes("already been registered") ||
    msg.includes("user already registered") ||
    msg.includes("duplicate") ||
    msg.includes("unique constraint")
  ) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (msg.includes("password") && (msg.includes("short") || msg.includes("weak") || msg.includes("at least"))) {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (msg.includes("valid email") || msg.includes("invalid email")) {
    return "Please enter a valid email address.";
  }
  if (msg.includes("too many requests") || msg.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  // Generic fallback — don't leak backend details
  return "Unable to create account. Please try again later.";
}

export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      // Role is NEVER accepted from client input.
      // We rely solely on the database trigger handle_new_user() which sets role = 'customer'.
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            phone: formData.phone,
          },
        },
      });

      if (error) {
        toast.error(getUserFriendlyError(error));
        return;
      }

      // Check if user already exists (Supabase email confirmation security behavior)
      if (data?.user?.identities && data.user.identities.length === 0) {
        toast.error("An account with this email already exists. Try signing in instead.");
        return;
      }

      if (data?.session) {
        toast.success("Account created successfully!");
        router.push("/profile");
        router.refresh();
      } else {
        toast.success("Account created successfully! Please sign in.");
        router.push("/login");
        router.refresh();
      }
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Pill className="w-6 h-6 text-primary" />
          </div>
        </div>
        
        <h2 className="text-center text-2xl font-bold text-slate-900 mb-2">Create an Account</h2>
        <p className="text-center text-sm text-slate-500 mb-6">Join MediGo for a healthier tomorrow</p>
        
        <div className="mb-6">
          <GoogleSignInButton
            text="Sign up with Google"
            redirectTo="/profile"
            mode="register"
            className="w-full"
          />

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-slate-500">Or sign up with email</span>
            </div>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleRegister}>
          <div>
            <label htmlFor="register-name" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input 
              id="register-name"
              name="name"
              type="text" 
              required
              value={formData.name}
              onChange={handleChange}
              className="appearance-none relative block w-full px-4 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 bg-white rounded-xl focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-colors" 
              placeholder="John Doe" 
            />
          </div>
          <div>
            <label htmlFor="register-phone" className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input 
              id="register-phone"
              name="phone"
              type="tel" 
              required
              value={formData.phone}
              onChange={handleChange}
              className="appearance-none relative block w-full px-4 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 bg-white rounded-xl focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-colors" 
              placeholder="+91 98765 43210" 
            />
          </div>
          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              id="register-email"
              name="email"
              type="email" 
              required
              value={formData.email}
              onChange={handleChange}
              className="appearance-none relative block w-full px-4 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 bg-white rounded-xl focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-colors" 
              placeholder="john@example.com" 
            />
          </div>
          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              id="register-password"
              name="password"
              type="password" 
              required
              value={formData.password}
              onChange={handleChange}
              className="appearance-none relative block w-full px-4 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 bg-white rounded-xl focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-colors" 
              placeholder="••••••••" 
            />
          </div>
          <div>
            <label htmlFor="register-confirm-password" className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <input 
              id="register-confirm-password"
              name="confirmPassword"
              type="password" 
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="appearance-none relative block w-full px-4 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 bg-white rounded-xl focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-colors" 
              placeholder="••••••••" 
            />
          </div>

          <div className="flex items-start mt-4">
            <div className="flex items-center h-5">
              <input id="terms" name="terms" type="checkbox" required defaultChecked className="focus:ring-primary h-4 w-4 text-primary border-slate-300 rounded cursor-pointer" />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="font-medium text-slate-700 cursor-pointer">
                I agree to the <Link href="#" className="text-primary hover:underline">Terms & Conditions</Link> and <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>
              </label>
            </div>
          </div>
          
          <button 
            id="register-submit-btn"
            type="submit" 
            disabled={isSubmitting}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors shadow-md active:scale-[0.98] mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
