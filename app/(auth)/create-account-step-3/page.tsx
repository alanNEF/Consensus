"use client";

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

export default function CreateAccountStep3Page() {
    const router = useRouter();
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // TODO: Implement actual data submission
            // For now, redirect to feed
            setTimeout(() => {
                router.push("/feed");
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
                    <Link href="/create-account-step-2" className="backButton">
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
                    {/* Step 2 - Completed */}
                    <div className="progressStep progressStepCompleted">
                        2
                    </div>
                    <div className="progressLine progressLineCompleted" />
                    {/* Step 3 - Active */}
                    <div className="progressStep progressStepActive">
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
                            Finally, tell us about your interests and background.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
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
                </div>
            </div>
        </div>
    );
}

