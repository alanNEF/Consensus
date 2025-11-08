"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./create-account.css";

export default function CreateAccountPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // TODO: Implement actual account creation
      // For now, just sign in with email
      const result = await signIn("email", {
        email,
        redirect: false,
      });

      if (result?.error) {
        setError("Failed to create account. Please try again.");
      } else {
        alert(
          "Check your email for a magic link to complete sign up. (Note: This is a stub - configure SMTP for actual email delivery)"
        );
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="createAccountContainer">
      <div className="createAccountContent">
        {/* Back to Home screen button */}
        <div className="backButtonContainer">
          <Link href="/" className="backButton">
            <span>←</span>
            <span>Back to Home screen</span>
          </Link>
        </div>

        {/* Progress Indicator */}
        <div className="progressIndicator">
          {/* Step 1 - Active */}
          <div className="progressStep progressStepActive">
            1
          </div>
          <div className="progressLine progressLineActive" />
          {/* Step 2 - Inactive */}
          <div className="progressStep progressStepInactive">
            2
          </div>
          <div className="progressLine progressLineInactive" />
          {/* Step 3 - Inactive */}
          <div className="progressStep progressStepInactive">
            3
          </div>
        </div>

        {/* Main Form Card */}
        <div className="formCard">
          {/* Title and Subtitle */}
          <div className="formHeader">
            <h1 className="formTitle">
              Create your account
            </h1>
            <p className="formSubtitle">
              Begin by providing your name and email address.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* First Name and Last Name - Side by Side */}
            <div className="nameFieldsContainer">
              <div>
                <label htmlFor="firstName" className="formLabel">
                  Your first name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="formInput"
                  placeholder="Nathan"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="formLabel">
                  Your last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="formInput"
                  placeholder="Gelfand"
                />
              </div>
            </div>
            {/* Email */}
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
                placeholder="nathangelfand@consensus.com"
              />
            </div>

            {/* Password */}
            <div className="formGroup">
              <label htmlFor="password" className="formLabel">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="formInput"
                placeholder="Enter your password"
              />
            </div>

            {/* Error Message */}
            {error && <div className="errorMessage">{error}</div>}

            {/* Send me verification Code Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="submitButton"
            >
              <span>Personalize my experience</span>
            </button>


          </form>
        </div>
      </div>
    </div>
  );
}

