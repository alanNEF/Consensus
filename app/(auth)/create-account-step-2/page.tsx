"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./create-account.css";

export default function CreateAccountStep2Page() {
    const router = useRouter();
    const [zipcode, setZipcode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Validate zipcode (US zipcode format: 5 digits or 5+4 format)
        const zipcodeRegex = /^\d{5}(-\d{4})?$/;
        if (!zipcodeRegex.test(zipcode)) {
            setError("Please enter a valid zipcode (e.g., 12345 or 12345-6789)");
            setIsLoading(false);
            return;
        }

        try {
            // TODO: Implement actual zipcode submission
            // For now, redirect to step 3
            setTimeout(() => {
                router.push("/create-account-step-3");
            }, 300);
        } catch (err) {
            setError("An error occurred. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <div className="createAccountContainer">
            <div className="createAccountContent">
                {/* Back button */}
                <div className="backButtonContainer">
                    <Link href="/create-account-step-1" className="backButton">
                        <span>←</span>
                        <span>Back</span>
                    </Link>
                </div>

                {/* Progress Indicator */}
                <div className="progressIndicator">
                    {/* Step 1 - Completed */}
                    <div className="progressStep progressStepCompleted">
                        1
                    </div>
                    <div className="progressLine progressLineCompleted" />
                    {/* Step 2 - Active */}
                    <div className="progressStep progressStepActive">
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
                            Next, let's connect you with your local representatives.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Zipcode */}
                        <div className="formGroup">
                            <label htmlFor="zipcode" className="formLabel">
                                Zipcode
                            </label>
                            <input
                                id="zipcode"
                                name="zipcode"
                                type="text"
                                autoComplete="postal-code"
                                required
                                value={zipcode}
                                onChange={(e) => setZipcode(e.target.value)}
                                className="formInput"
                                placeholder="12345"
                                maxLength={10}
                            />
                        </div>

                        {/* Info Message */}
                        <div className="infoMessage">
                            This information helps us connect you with your local representatives.
                        </div>

                        {/* Error Message */}
                        {error && <div className="errorMessage">{error}</div>}

                        {/* Continue Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="submitButton"
                        >
                            <span>Continue</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

