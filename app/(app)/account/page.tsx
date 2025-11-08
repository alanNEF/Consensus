"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import "./account.css";

const topics = [
    { id: "healthcare", label: "Healthcare", class: "health", category: "Health" },
    { id: "environmentalism", label: "Environment", class: "environment", category: "Environment" },
    { id: "armedForces", label: "Defense", class: "armedServices", category: "Armed Services" },
    { id: "economy", label: "Economy", class: "economy", category: "Economy" },
    { id: "education", label: "Education", class: "education", category: "Education" },
    { id: "technology", label: "Technology", class: "technology", category: "Technology" },
    { id: "immigration", label: "Immigration", class: "immigration", category: "Immigration" },
    { id: "agriculturalAndFood", label: "Agriculture", class: "agriculture", category: "Agriculture and Food" },
    { id: "governmentOperations", label: "Government Operations", class: "government", category: "Government Operations" },
    { id: "taxation", label: "Taxation", class: "taxation", category: "Taxation" },
    { id: "civilRights", label: "Civil Rights", class: "civilRights", category: "Civil Rights" },
    { id: "criminalJustice", label: "Criminal Justice", class: "criminalJustice", category: "Criminal Justice" },
];

export default function AccountPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [zipcode, setZipcode] = useState("");
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [race, setRace] = useState("");
    const [religion, setReligion] = useState("");
    const [gender, setGender] = useState("");
    const [ageRange, setAgeRange] = useState("");
    const [party, setParty] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }

        if (status === "authenticated" && session?.user) {
            fetchUserData();
        }
    }, [status, session, router]);

    const fetchUserData = async () => {
        try {
            const response = await fetch('/api/user/profile');
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            const data = await response.json();
            setEmail(data.email || "");
            setZipcode(data.residency || "");
            setSelectedTopics(data.topics || []);
            setRace(data.race || "");
            setReligion(data.religion || "");
            setGender(data.gender || "");
            setAgeRange(data.age_range || "");
            setParty(data.party || "");
        } catch (err: any) {
            setError("Failed to load user data");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTopic = (topicId: string) => {
        setSelectedTopics((prev) =>
            prev.includes(topicId)
                ? prev.filter((id) => id !== topicId)
                : [...prev, topicId]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    residency: zipcode,
                    topics: selectedTopics,
                    race: race || null,
                    religion: religion || null,
                    gender: gender || null,
                    age_range: ageRange || null,
                    party: party || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update profile');
            }

            setSuccess("Profile updated successfully!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    if (status === "loading" || isLoading) {
        return (
            <div className="accountContainer">
                <div className="accountContent">
                    <p className="loadingText">Loading...</p>
                </div>
            </div>
        );
    }

    if (!session?.user) {
        return null;
    }

    return (
        <div className="accountContainer">
            <div className="accountContent">
                <div className="accountHeader">
                    <h1 className="accountTitle">Profile Settings</h1>
                    <p className="accountSubtitle">Manage your preferences and topics</p>
                </div>

                {/* Account Information Section */}
                <div className="accountSection">
                    <div className="sectionHeader">
                        <h2 className="sectionTitle">Account Information</h2>
                        <p className="sectionSubtitle">Update your account details</p>
                    </div>
                    <div className="sectionContent">
                        <div className="formField">
                            <label htmlFor="email" className="fieldLabel">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                readOnly
                                className="fieldInput"
                            />
                        </div>
                        <div className="formField">
                            <label htmlFor="zipcode" className="fieldLabel">Zip Code</label>
                            <input
                                id="zipcode"
                                type="text"
                                value={zipcode}
                                onChange={(e) => setZipcode(e.target.value)}
                                className="fieldInput"
                                placeholder="Enter your zip code"
                                maxLength={10}
                            />
                            <p className="fieldHelper">Used to identify your congressional representative.</p>
                        </div>
                    </div>
                </div>

                {/* Topics of Interest Section */}
                <div className="accountSection">
                    <div className="sectionHeader">
                        <h2 className="sectionTitle">Topics of Interest</h2>
                        <p className="sectionSubtitle">Select the topics you want to see in your feed</p>
                    </div>
                    <div className="sectionContent">
                        <div className="topicsGrid">
                            {topics.map((topic) => {
                                const isSelected = selectedTopics.includes(topic.id);
                                return (
                                    <button
                                        key={topic.id}
                                        type="button"
                                        onClick={() => toggleTopic(topic.id)}
                                        className={`topicTag ${topic.class} ${isSelected ? "selected" : ""}`}
                                    >
                                        <span>{topic.label}</span>
                                        {isSelected && (
                                            <span className="topicCheckmark">✓</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Demographic Information Section */}
                <div className="accountSection">
                    <div className="sectionHeader">
                        <h2 className="sectionTitle">Demographic Information</h2>
                        <p className="sectionSubtitle">Update your demographic details</p>
                    </div>
                    <div className="sectionContent">
                        <div className="demographicFieldsContainer">
                            <div className="formField">
                                <label htmlFor="race" className="fieldLabel">Race</label>
                                <input
                                    id="race"
                                    type="text"
                                    value={race}
                                    onChange={(e) => setRace(e.target.value)}
                                    className="fieldInput"
                                    placeholder="Enter your race"
                                />
                            </div>

                            <div className="formField">
                                <label htmlFor="religion" className="fieldLabel">Religion</label>
                                <input
                                    id="religion"
                                    type="text"
                                    value={religion}
                                    onChange={(e) => setReligion(e.target.value)}
                                    className="fieldInput"
                                    placeholder="Enter your religion"
                                />
                            </div>

                            <div className="formField">
                                <label htmlFor="gender" className="fieldLabel">Gender</label>
                                <select
                                    id="gender"
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="fieldSelect"
                                >
                                    <option value="">Select gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="non-binary">Non-binary</option>
                                    <option value="prefer-not-to-say">Prefer not to say</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="formField">
                                <label htmlFor="ageRange" className="fieldLabel">Age Range</label>
                                <select
                                    id="ageRange"
                                    value={ageRange}
                                    onChange={(e) => setAgeRange(e.target.value)}
                                    className="fieldSelect"
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

                            <div className="formField" style={{ gridColumn: "1 / -1" }}>
                                <label htmlFor="party" className="fieldLabel">Party</label>
                                <select
                                    id="party"
                                    value={party}
                                    onChange={(e) => setParty(e.target.value)}
                                    className="fieldSelect"
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
                    </div>
                </div>

                {/* Error and Success Messages */}
                {error && <div className="accountErrorMessage">{error}</div>}
                {success && <div className="accountSuccessMessage">{success}</div>}

                {/* Save Button */}
                <div className="accountActions">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="saveButton"
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
