"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import "./account.css";

const topics = [
    { id: "Healthcare", label: "Healthcare", class: "health" },
    { id: "Environmentalism", label: "Environment", class: "environment" },
    { id: "Armed Forces", label: "Defense", class: "armedServices" },
    { id: "Economy", label: "Economy", class: "economy" },
    { id: "Education", label: "Education", class: "education" },
    { id: "Technology", label: "Technology", class: "technology" },
    { id: "Immigration", label: "Immigration", class: "immigration" },
    { id: "Agriculture + Food", label: "Agriculture", class: "agriculture" },
    { id: "Government Operations", label: "Gov. Operations", class: "government" },
    { id: "Taxation", label: "Taxation", class: "taxation" },
    { id: "Civil Rights", label: "Civil Rights", class: "civilRights" },
    { id: "Criminal Justice", label: "Criminal Justice", class: "criminalJustice" },
    { id: "Foreign Policy", label: "Foreign Policy", class: "foreignPolicy" },
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
    const [income, setIncome] = useState("");
    const [education, setEducation] = useState("");
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

            // Normalize topics: map database values (which might be lowercase/wrong case) 
            // to the correct topic IDs defined in our topics array
            const normalizeTopics = (dbTopics: string[]): string[] => {
                return dbTopics
                    .map(dbTopic => {
                        // First try exact match
                        const exactMatch = topics.find(t => t.id === dbTopic);
                        if (exactMatch) return exactMatch.id;

                        // Then try case-insensitive match
                        const caseInsensitiveMatch = topics.find(
                            t => t.id.toLowerCase() === dbTopic.toLowerCase()
                        );
                        if (caseInsensitiveMatch) return caseInsensitiveMatch.id;

                        // Handle special case variations (like "Armed Forces" vs "Armed Services")
                        if (dbTopic.toLowerCase().includes("armed")) {
                            const armedMatch = topics.find(
                                t => t.id.toLowerCase().includes("armed")
                            );
                            if (armedMatch) return armedMatch.id;
                        }

                        // If no match found, return original (shouldn't happen, but safe fallback)
                        return dbTopic;
                    })
                    .filter((topic, index, self) => self.indexOf(topic) === index); // Remove duplicates
            };

            setSelectedTopics(normalizeTopics(data.topics || []));

            setRace(data.race || "");
            setReligion(data.religion || "");
            setGender(data.gender || "");
            setAgeRange(data.age_range || "");
            setParty(data.party || "");
            setIncome(data.income || "");
            setEducation(data.education || "");
        } catch (err: any) {
            setError("Failed to load user data");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTopic = (topicId: string) => {
        console.log("toggleTopic called with:", topicId);
        console.log("Current selectedTopics before toggle:", selectedTopics);
        setSelectedTopics((prev) => {
            // Normalize the previous array first to handle any inconsistencies
            const normalizedPrev = prev.map(dbTopic => {
                const match = topics.find(
                    t => t.id.toLowerCase() === dbTopic.toLowerCase()
                );
                return match ? match.id : dbTopic;
            });

            // Remove duplicates
            const uniquePrev = Array.from(new Set(normalizedPrev));

            // Now check if the topic is already selected (case-insensitive)
            const isAlreadySelected = uniquePrev.some(
                id => id.toLowerCase() === topicId.toLowerCase()
            );

            const newTopics = isAlreadySelected
                ? uniquePrev.filter((id) => id.toLowerCase() !== topicId.toLowerCase())
                : [...uniquePrev, topicId];

            console.log("New selectedTopics after toggle:", newTopics);
            return newTopics;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError("");
        setSuccess("");

        // DEBUG: Log what we're about to send
        console.log("Topics being sent:", selectedTopics);
        console.log("Selected topics array:", JSON.stringify(selectedTopics));

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
                    income: income || null,
                    education: education || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update profile');
            }

            const responseData = await response.json();
            // DEBUG: Log what we got back
            console.log("Topics received from server:", responseData.topics);
            console.log("Response data:", JSON.stringify(responseData.topics));

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
                                        onClick={() => {
                                            toggleTopic(topic.id);
                                            console.log("toggleTopic called with:", topic.id);
                                        }}
                                        className={`topicTag ${topic.class} ${isSelected ? "selected" : ""}`}
                                    >
                                        <span>{topic.label}</span>
                                        {isSelected && (
                                            <span className="topicCheckmark">
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </span>
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
                                <select
                                    id="race"
                                    value={race}
                                    onChange={(e) => setRace(e.target.value)}
                                    className="fieldSelect"
                                >
                                    <option value="">Select race</option>
                                    <option value="american-indian-alaska-native">American Indian or Alaska Native</option>
                                    <option value="asian">Asian</option>
                                    <option value="black-african-american">Black or African American</option>
                                    <option value="hispanic-latino">Hispanic or Latino</option>
                                    <option value="native-hawaiian-pacific-islander">Native Hawaiian or Other Pacific Islander</option>
                                    <option value="white">White</option>
                                    <option value="two-or-more-races">Two or More Races</option>
                                    <option value="other">Other</option>
                                    <option value="prefer-not-to-say">Prefer not to say</option>
                                </select>
                            </div>

                            <div className="formField">
                                <label htmlFor="religion" className="fieldLabel">Religion</label>
                                <select
                                    id="religion"
                                    value={religion}
                                    onChange={(e) => setReligion(e.target.value)}
                                    className="fieldSelect"
                                >
                                    <option value="">Select religion</option>
                                    <option value="christianity">Christianity</option>
                                    <option value="islam">Islam</option>
                                    <option value="judaism">Judaism</option>
                                    <option value="hinduism">Hinduism</option>
                                    <option value="buddhism">Buddhism</option>
                                    <option value="sikhism">Sikhism</option>
                                    <option value="bahai">Bahá'í</option>
                                    <option value="jainism">Jainism</option>
                                    <option value="shinto">Shinto</option>
                                    <option value="taoism">Taoism</option>
                                    <option value="agnostic">Agnostic</option>
                                    <option value="atheist">Atheist</option>
                                    <option value="other">Other</option>
                                    <option value="prefer-not-to-say">Prefer not to say</option>
                                </select>
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

                            <div className="formField">
                                <label htmlFor="income" className="fieldLabel">Income</label>
                                <select
                                    id="income"
                                    value={income}
                                    onChange={(e) => setIncome(e.target.value)}
                                    className="fieldSelect"
                                >
                                    <option value="">Select income range</option>
                                    <option value="under-25000">Under $25,000</option>
                                    <option value="25000-50000">$25,000 - $50,000</option>
                                    <option value="50000-75000">$50,000 - $75,000</option>
                                    <option value="75000-100000">$75,000 - $100,000</option>
                                    <option value="100000-150000">$100,000 - $150,000</option>
                                    <option value="150000-200000">$150,000 - $200,000</option>
                                    <option value="over-200000">Over $200,000</option>
                                    <option value="prefer-not-to-say">Prefer not to say</option>
                                </select>
                            </div>

                            <div className="formField">
                                <label htmlFor="education" className="fieldLabel">Education</label>
                                <select
                                    id="education"
                                    value={education}
                                    onChange={(e) => setEducation(e.target.value)}
                                    className="fieldSelect"
                                >
                                    <option value="">Select education level</option>
                                    <option value="high-school">High School</option>
                                    <option value="some-college">Some College</option>
                                    <option value="associates">Associate's Degree</option>
                                    <option value="bachelors">Bachelor's Degree</option>
                                    <option value="masters">Master's Degree</option>
                                    <option value="doctoral">Doctoral Degree</option>
                                    <option value="professional">Professional Degree</option>
                                    <option value="prefer-not-to-say">Prefer not to say</option>
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
