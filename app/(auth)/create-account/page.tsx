"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./create-account.css";

const topics = [
    { id: "healthcare", label: "Healthcare", class: "health" },
    { id: "environmentalism", label: "Environmentalism", class: "environment" },
    { id: "armedForces", label: "Armed Forces", class: "armedServices" },
    { id: "economy", label: "Economy", class: "economy" },
    { id: "education", label: "Education", class: "education" },
    { id: "technology", label: "Technology", class: "technology" },
    { id: "immigration", label: "Immigration", class: "immigration" },
    { id: "agriculturalAndFood", label: "Agricultural and Food", class: "agriculture" },
    { id: "governmentOperations", label: "Government Operations", class: "government" },
    { id: "taxation", label: "Taxation", class: "taxation" },
    { id: "civilRights", label: "Civil Rights", class: "civilRights" },
    { id: "criminalJustice", label: "Criminal Justice", class: "criminalJustice" },
    { id: "foreignPolicy", label: "Foreign Policy", class: "foreignPolicy" },
];

export default function CreateAccountPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1 fields
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [organisation, setOrganisation] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Step 2 fields
    const [zipcode, setZipcode] = useState("");

    // Step 3 fields
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [race, setRace] = useState("");
    const [religion, setReligion] = useState("");
    const [gender, setGender] = useState("");
    const [ageRange, setAgeRange] = useState("");
    const [party, setParty] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const toggleTopic = (topicId: string) => {
        setSelectedTopics((prev) =>
            prev.includes(topicId)
                ? prev.filter((id) => id !== topicId)
                : [...prev, topicId]
        );
    };

    const handleStep1Submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Basic validation
        if (!firstName || !lastName || !email || !password) {
            setError("Please fill in all required fields.");
            setIsLoading(false);
            return;
        }

        // Validate password length
        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            setIsLoading(false);
            return;
        }

        try {
            // Move to step 2
            setCurrentStep(2);
            setIsLoading(false);
        } catch (err) {
            setError("An error occurred. Please try again.");
            setIsLoading(false);
        }
    };

    const handleStep2Submit = async (e: React.FormEvent) => {
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
            // Move to step 3
            setCurrentStep(3);
            setIsLoading(false);
        } catch (err) {
            setError("An error occurred. Please try again.");
            setIsLoading(false);
        }
    };

    const handleStep3Submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // Register the user
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    name: `${firstName} ${lastName}`,
                    residency: zipcode,
                    topics: selectedTopics,
                    race: race || null,
                    religion: religion || null,
                    gender: gender || null,
                    age_range: ageRange || null,
                    party: party || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create account');
            }

            // Sign in the user after successful registration
            const signInResult = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (signInResult?.ok) {
                router.push('/feed');
            } else {
                // Account created but sign-in failed - redirect to login
                router.push('/login?registered=true');
            }
        } catch (err: any) {
            setError(err.message || "An error occurred. Please try again.");
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            setError("");
        }
    };

    const getProgressIndicator = () => {
        return (
            <div className="progressIndicator">
                {/* Step 1 */}
                <div className={
                    currentStep === 1
                        ? "progressStep progressStepActive"
                        : currentStep > 1
                            ? "progressStep progressStepCompleted"
                            : "progressStep progressStepInactive"
                }>
                    1
                </div>
                <div className={
                    currentStep > 1
                        ? "progressLine progressLineCompleted"
                        : currentStep === 1
                            ? "progressLine progressLineActive"
                            : "progressLine progressLineInactive"
                } />
                {/* Step 2 */}
                <div className={
                    currentStep === 2
                        ? "progressStep progressStepActive"
                        : currentStep > 2
                            ? "progressStep progressStepCompleted"
                            : "progressStep progressStepInactive"
                }>
                    2
                </div>
                <div className={
                    currentStep > 2
                        ? "progressLine progressLineCompleted"
                        : currentStep === 2
                            ? "progressLine progressLineActive"
                            : "progressLine progressLineInactive"
                } />
                {/* Step 3 */}
                <div className={
                    currentStep === 3
                        ? "progressStep progressStepActive"
                        : "progressStep progressStepInactive"
                }>
                    3
                </div>
            </div>
        );
    };

    return (
        <div className="createAccountContainer">
            <div className="createAccountContent">
                {/* Back button */}
                <div className="backButtonContainer">
                    {currentStep === 1 ? (
                        <Link href="/login" className="backButton">
                            <span>←</span>
                            <span>Back to Login</span>
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={handleBack}
                            className="backButton"
                        >
                            <span>←</span>
                            <span>Back</span>
                        </button>
                    )}
                </div>

                {/* Progress Indicator */}
                {getProgressIndicator()}

                {/* Main Form Card */}
                <div className="formCard">
                    {/* Step 1: Name and Email */}
                    {currentStep === 1 && (
                        <>
                            <div className="formHeader">
                                <h1 className="formTitle">
                                    Create your account
                                </h1>
                                <p className="formSubtitle">
                                    Begin by providing your name and email address.
                                </p>
                            </div>

                            <form onSubmit={handleStep1Submit}>
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

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="submitButton"
                                >
                                    <span>Personalize my experience</span>
                                </button>
                            </form>
                        </>
                    )}

                    {/* Step 2: Zipcode */}
                    {currentStep === 2 && (
                        <>
                            <div className="formHeader">
                                <h1 className="formTitle">
                                    Create your account
                                </h1>
                                <p className="formSubtitle">
                                    Next, let's connect you with your local representatives.
                                </p>
                            </div>

                            <form onSubmit={handleStep2Submit}>
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
                        </>
                    )}

                    {/* Step 3: Topics and Demographics */}
                    {currentStep === 3 && (
                        <>
                            <div className="formHeader">
                                <h1 className="formTitle">
                                    Create your account
                                </h1>
                                <p className="formSubtitle">
                                    Finally, tell us about your interests and background.
                                </p>
                            </div>

                            <form onSubmit={handleStep3Submit}>
                                {/* Topics of Interest */}
                                <div className="topicsContainer">
                                    <label className="topicsLabel">
                                        Topics of interest
                                    </label>
                                    <div className="topicsTags">
                                        {topics.map((topic) => (
                                            <button
                                                key={topic.id}
                                                type="button"
                                                onClick={() => toggleTopic(topic.id)}
                                                className={`interestTag ${topic.class} ${selectedTopics.includes(topic.id) ? "selected" : ""
                                                    }`}
                                            >
                                                {topic.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Selected Topics Summary */}
                                {selectedTopics.length > 0 && (
                                    <div className="selectedTopicsSummary">
                                        <div className="selectedTopicsSummaryTitle">
                                            Selected Topics:
                                            <span className="selectedTopicsCount">
                                                {selectedTopics.length} {selectedTopics.length === 1 ? "topic" : "topics"}
                                            </span>
                                        </div>
                                        <div className="selectedTopicsList">
                                            {selectedTopics.map((topicId) => {
                                                const topic = topics.find((t) => t.id === topicId);
                                                if (!topic) return null;
                                                return (
                                                    <div
                                                        key={topicId}
                                                        className="selectedTopicChip"
                                                        onClick={() => toggleTopic(topicId)}
                                                    >
                                                        <span>{topic.label}</span>
                                                        <button
                                                            type="button"
                                                            className="selectedTopicChipRemove"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleTopic(topicId);
                                                            }}
                                                            aria-label={`Remove ${topic.label}`}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Optional Fields */}
                                <div className="optionalFieldsContainer">
                                    <div className="formGroup">
                                        <label htmlFor="race" className="formLabelOptional">
                                            Race
                                        </label>
                                        <input
                                            id="race"
                                            name="race"
                                            type="text"
                                            value={race}
                                            onChange={(e) => setRace(e.target.value)}
                                            className="formInput"
                                            placeholder="Enter your race"
                                        />
                                    </div>

                                    <div className="formGroup">
                                        <label htmlFor="religion" className="formLabelOptional">
                                            Religion
                                        </label>
                                        <input
                                            id="religion"
                                            name="religion"
                                            type="text"
                                            value={religion}
                                            onChange={(e) => setReligion(e.target.value)}
                                            className="formInput"
                                            placeholder="Enter your religion"
                                        />
                                    </div>

                                    <div className="formGroup">
                                        <label htmlFor="gender" className="formLabelOptional">
                                            Gender
                                        </label>
                                        <select
                                            id="gender"
                                            name="gender"
                                            value={gender}
                                            onChange={(e) => setGender(e.target.value)}
                                            className="formSelect"
                                        >
                                            <option value="">Select gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="non-binary">Non-binary</option>
                                            <option value="prefer-not-to-say">Prefer not to say</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    <div className="formGroup">
                                        <label htmlFor="ageRange" className="formLabelOptional">
                                            Age Range
                                        </label>
                                        <select
                                            id="ageRange"
                                            name="ageRange"
                                            value={ageRange}
                                            onChange={(e) => setAgeRange(e.target.value)}
                                            className="formSelect"
                                        >
                                            <option value="">Select age range</option>
                                            <option value="18-24">18-24</option>
                                            <option value="25-34">25-34</option>
                                            <option value="35-44">35-44</option>
                                            <option value="45-54">45-54</option>
                                            <option value="55-64">55-64</option>
                                            <option value="65+">65+</option>
                                        </select>
                                    </div>

                                    <div className="formGroup" style={{ gridColumn: "1 / -1" }}>
                                        <label htmlFor="party" className="formLabelOptional">
                                            Party
                                        </label>
                                        <select
                                            id="party"
                                            name="party"
                                            value={party}
                                            onChange={(e) => setParty(e.target.value)}
                                            className="formSelect"
                                        >
                                            <option value="">Select party</option>
                                            <option value="democrat">Democrat</option>
                                            <option value="republican">Republican</option>
                                            <option value="independent">Independent</option>
                                            <option value="libertarian">Libertarian</option>
                                            <option value="green">Green</option>
                                            <option value="other">Other</option>
                                            <option value="prefer-not-to-say">Prefer not to say</option>
                                        </select>
                                    </div>
                                </div>
                                {/* Error Message */}
                                {error && <div className="errorMessage">{error}</div>}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="submitButton"
                                >
                                    <span>Complete Account Setup</span>
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

