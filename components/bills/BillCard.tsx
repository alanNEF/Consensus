"use client";

import { useState, useEffect } from "react";
import type { Bill, BillSummary, SavedBill, Representative } from "@/types";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ContactCardGallery from "@/components/contact/ContactCardGallery";
import "./BillCard.css";

interface BillCardProps {
  bill: Bill;
  billSummary: BillSummary;
  billUrl: string;
  isExpanded?: boolean;
  onCardClick?: (bill: Bill) => void;
  representatives?: Representative[];
}

const categoryColors: Record<string, string> = {
  Healthcare: "health",
  Health: "health", // Keep for backwards compatibility
  Environment: "environment",
  Environmentalism: "environment", // Match account page
  "Armed Services": "armedServices",
  "Armed Forces": "armedServices", // Match account page
  Economy: "economy",
  Education: "education",
  Technology: "technology",
  Immigration: "immigration",
  "Agriculture and Food": "agriculture",
  "Agriculture + Food": "agriculture", // Match account page
  "Government Operations": "government",
  Taxation: "taxation",
  "Civil Rights": "civilRights",
  "Criminal Justice": "criminalJustice",
  "Foreign Policy": "foreignPolicy", // Add this
};

export default function BillCard({ bill, billSummary, billUrl, isExpanded = false, onCardClick, representatives }: BillCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContactGalleryOpen, setIsContactGalleryOpen] = useState(false);
  const [isEndorsed, setIsEndorsed] = useState(false);
  const [isOpposed, setIsOpposed] = useState(false);

  useEffect(() => {
    checkEndorsementStatus();
  }, [bill.id]);

  const checkEndorsementStatus = async () => {
    try {
      const [endorsementsResponse, oppositionsResponse] = await Promise.all([
        fetch("/api/user-endorsements"),
        fetch("/api/user-oppositions"),
      ]);

      const endorsementsData = await endorsementsResponse.json();
      const oppositionsData = await oppositionsResponse.json();

      setIsEndorsed(
        endorsementsData.endorsements?.some(
          (endorsement: SavedBill) => endorsement.bill_id === bill.id
        ) || false
      );
      setIsOpposed(
        oppositionsData.oppositions?.some(
          (opposition: SavedBill) => opposition.bill_id === bill.id
        ) || false
      );
    } catch (error) {
      console.error("Error checking endorsement status:", error);
    }
  };

  const handleClick = () => {
    if (onCardClick) {
      onCardClick(bill);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = (e: React.MouseEvent) => {
    // Only close if clicking directly on the overlay, not on modal content or gallery
    const target = e.target as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;

    // Check if clicking directly on the overlay background
    if (target === currentTarget) {
      setIsModalOpen(false);
      setIsContactGalleryOpen(false);
      return;
    }

    // Also check if clicking on the gallery overlay (but not the container)
    if (target.classList.contains('contactGalleryOverlay')) {
      setIsModalOpen(false);
      setIsContactGalleryOpen(false);
    }
  };

  const handleContactRepresentatives = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsContactGalleryOpen(true);
  };

  const handleCloseContactGallery = () => {
    setIsContactGalleryOpen(false);
  };

  const getCategoryClass = (category: string | undefined) => {
    if (!category) return "";
    // Try exact match first
    if (categoryColors[category]) return categoryColors[category];
    // Try case-insensitive match
    const normalizedCategory = Object.keys(categoryColors).find(
      key => key.toLowerCase() === category.toLowerCase()
    );
    return normalizedCategory ? categoryColors[normalizedCategory] : "";
  };

  const getPartyClass = (party: string) => {
    if (party === "REPUBLICAN") return "republican";
    if (party === "DEMOCRAT") return "democrat";
    return "thirdParty";
  };

  const handleEndorseBill = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEndorsed) {
      try {
        const response = await fetch("/api/remove-endorsement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ billId: bill.id }),
        });
        if (response.ok) {
          await checkEndorsementStatus();
        }
      } catch (error) {
        console.error("Error removing endorsement:", error);
      }
    } else {
      try {
        const response = await fetch("/api/endorsemenets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ billId: bill.id }),
        });
        if (response.ok) {
          await checkEndorsementStatus();
        }
      } catch (error) {
        console.error("Error endorsing bill:", error);
      }
    }
  };

  const handleOpposeBill = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpposed) {
      try {
        const response = await fetch("/api/remove-endorsement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ billId: bill.id }),
        });
        if (response.ok) {
          await checkEndorsementStatus();
        }
      } catch (error) {
        console.error("Error removing opposition:", error);
      }
    } else {
      try {
        const response = await fetch("/api/opposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ billId: bill.id }),
        });
        if (response.ok) {
          // Refresh status to ensure we have the latest state
          await checkEndorsementStatus();
        }
      } catch (error) {
        console.error("Error opposing bill:", error);
      }
    }

  };

  return (
    <>
      <div
        className={`billCard ${isExpanded ? "expanded" : ""}`}
        onClick={handleClick}
      >
        <h3 className="billTitle">{bill.title}</h3>
        {billSummary.one_liner && (
          <p className="billDescription">{billSummary.one_liner}</p>
        )}
        {bill.categories && bill.categories.length > 0 && (
          <div className="billTags">
            {bill.categories.map((category, index) => (
              <span
                key={index}
                className={`categoryTag ${getCategoryClass(category)}`}
              >
                {category}
              </span>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          className={`modalOverlay ${isContactGalleryOpen ? 'hasGallery' : ''}`}
          onClick={handleCloseModal}
        >
          <div
            className="modalContent"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button className="modalClose" onClick={handleCloseModal}>
              ×
            </button>
            <div className="modalHeader">
              <h2 className="modalTitle">{bill.title}</h2>
              <div className="modalHeaderDivider"></div>
            </div>

            <div>
              <h3 className="modalSubheader">
                <svg className="modalSubheaderIcon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Summary
              </h3>
              <p className="modalText">
                {billSummary.summary_text || "No summary available."}
              </p>
            </div>

            {bill.categories && bill.categories.length > 0 && (
              <div>
                <h3 className="modalSubheader">
                  <svg className="modalSubheaderIcon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Topic Tags
                </h3>
                <div className="modalTags">
                  {bill.categories.map((category, index) => (
                    <span
                      key={index}
                      className={`categoryTag ${getCategoryClass(category)}`}
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {bill.sponsorDetails && bill.sponsorDetails.length > 0 && (
              <div>
                <div className="sponsorHeader">
                  <h3 className="modalSubheader">
                    <svg className="modalSubheaderIcon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Sponsors
                  </h3>
                  <div className="sponsorKey">
                    <div className="sponsorKeyItem">
                      <div className="sponsorKeyBox republican"></div>
                      <span>Republican</span>
                    </div>
                    <div className="sponsorKeyItem">
                      <div className="sponsorKeyBox democrat"></div>
                      <span>Democrat</span>
                    </div>
                    <div className="sponsorKeyItem">
                      <div className="sponsorKeyBox thirdParty"></div>
                      <span>Third Party</span>
                    </div>
                  </div>
                </div>
                <div className="sponsorSection">
                  <div className="sponsorsList">
                    {bill.sponsorDetails.map((sponsor, index) => (
                      <span key={index} className={`sponsorName ${getPartyClass(sponsor.party)}`}>
                        {sponsor.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {billUrl && (
              <div>
                <h3 className="modalSubheader">
                  <svg className="modalSubheaderIcon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Official Bill
                </h3>
                <div className="officialBillSection">
                  <a
                    href={billUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="officialLink"
                  >
                    View on Congress.gov →
                  </a>
                </div>
              </div>
            )}

            <div className="modalActions">
              <PrimaryButton
                variant={isEndorsed ? "primary" : "secondary"}
                className="flex-1"
                onClick={handleEndorseBill}
              >
                {isEndorsed ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M16.6667 5L7.50004 14.1667L3.33337 10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Endorsed
                  </span>
                ) : (
                  "Endorse Bill"
                )}
              </PrimaryButton>
              <PrimaryButton
                variant={isOpposed ? "primary" : "secondary"}
                className="flex-1"
                onClick={handleOpposeBill}
              >
                {isOpposed ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M15 5L5 15M5 5L15 15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Opposed
                  </span>
                ) : (
                  "Oppose Bill"
                )}
              </PrimaryButton>
              <PrimaryButton
                variant="secondary"
                className="flex-1"
                onClick={handleContactRepresentatives}
              >
                Contact Representatives
              </PrimaryButton>
            </div>
          </div>

          {isContactGalleryOpen && (
            <ContactCardGallery
              representatives={representatives || []}
              isVisible={isContactGalleryOpen}
              onClose={handleCloseContactGallery}
            />
          )}
        </div>
      )}
    </>
  );
}
