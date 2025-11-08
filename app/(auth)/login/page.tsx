"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import PrimaryButton from "@/components/ui/PrimaryButton";
import "./login.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simple validation: email must contain @, password can be any string
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    if (!password) {
      setError("Please enter a password");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        router.push('/feed');
      }
    } catch (err: any) {
      console.error("Error logging in:", err);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
};

  return (
    <div className="loginContainer">
      <div className="loginCard">
        <h1 className="loginTitle">Bill Tracker</h1>
        <p className="loginSlogan">Understand Congress. Make Your Voice Heard.</p>
        <form className="loginForm" onSubmit={handleSubmit}>
          <div className="formGroup">
            <label htmlFor="email" className="formLabel">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="formInput"
              placeholder="Enter your email"
            />
          </div>
          <div className="formGroup">
            <label htmlFor="password" className="formLabel">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="formInput"
              placeholder="Enter your password"
            />
          </div>

          {error && <div className="errorMessage">{error}</div>}

          <PrimaryButton
            type="submit"
            variant="primary"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </PrimaryButton>
        </form>
        <div className="signUpLink">
          Don&apos;t have an account? <Link href="/create-account">Sign up</Link>
        </div>
      </div>
    </div>
  );
}

