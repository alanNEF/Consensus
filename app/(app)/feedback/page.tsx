"use client";

import { useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import "./feedback.css";

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      setMessage("Please enter your feedback before submitting.");
      setMessageType("error");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: feedback.trim(),
        }),
      });

      if (response.ok) {
        setMessage("Thank you for your feedback! We appreciate your input.");
        setMessageType("success");
        setFeedback("");
      } else {
        throw new Error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setMessage("Sorry, there was an error submitting your feedback. Please try again.");
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedbackContainer">
      <div className="feedbackContent">
        <div className="feedbackHeader">
          <h1 className="feedbackTitle">Feedback</h1>
          <p className="feedbackSubtitle">
            Help us improve Consensi by sharing your thoughts and suggestions
          </p>
        </div>

        <div className="feedbackSection">
          <div className="sectionHeader">
            <h2 className="sectionTitle">Share Your Feedback</h2>
          </div>

          <form onSubmit={handleSubmit} className="feedbackForm">
            {message && (
              <div className={`feedbackMessage ${messageType}`}>
                {message}
              </div>
            )}

            <div className="formField">
              <textarea
                id="feedback"
                className="feedbackTextarea"
                placeholder="Tell us what you think about the app, report bugs, suggest features, or share any other thoughts..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={8}
                maxLength={2000}
                disabled={isSubmitting}
              />
              <div className="fieldHelper">
                {feedback.length}/2000 characters
              </div>
            </div>

            <div className="feedbackActions">
              <PrimaryButton
                type="submit"
                variant="primary"
                disabled={isSubmitting || !feedback.trim()}
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </PrimaryButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
