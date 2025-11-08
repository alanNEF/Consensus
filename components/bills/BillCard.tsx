"use client";

import { useState } from "react";
import type { Bill } from "@/types";
import PrimaryButton from "@/components/ui/PrimaryButton";
import "./BillCard.css";

interface BillCardProps {
  bill: Bill;
  isExpanded?: boolean;
  onCardClick?: (bill: Bill) => void;
}

const categoryColors: Record<string, string> = {
  Health: "health",
  Environment: "environment",
  "Armed Services": "armedServices",
  Economy: "economy",
  Education: "education",
  Technology: "technology",
  Immigration: "immigration",
  "Agriculture and Food": "agriculture",
  "Government Operations": "government",
  Taxation: "taxation",
  "Civil Rights": "civilRights",
  "Criminal Justice": "criminalJustice",
};

export default function BillCard({ bill, isExpanded = false, onCardClick }: BillCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (onCardClick) {
      onCardClick(bill);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(false);
  };

  const getCategoryClass = (category: string | undefined) => {
    if (!category) return "";
    return categoryColors[category] || "";
  };

  const getPartyClass = (party: string) => {
    if (party === "REPUBLICAN") return "republican";
    if (party === "DEMOCRAT") return "democrat";
    return "thirdParty";
  };

  return (
    <>
      <div
        className={`billCard ${isExpanded ? "expanded" : ""}`}
        onClick={handleClick}
      >
        <h3 className="billTitle">{bill.title}</h3>
        {bill.description && (
          <p className="billDescription">{bill.description}</p>
        )}
        {bill.category && (
          <div className="billTags">
            <span className={`categoryTag ${getCategoryClass(bill.category)}`}>
              {bill.category}
            </span>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modalOverlay" onClick={handleCloseModal}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
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
                Description
              </h3>
              <p className="modalText">
                {bill.summary || bill.description || "No description available."}
              </p>
            </div>

            {bill.category && (
              <div>
                <h3 className="modalSubheader">
                  <svg className="modalSubheaderIcon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Topic Tags
                </h3>
                <div className="modalTags">
                  <span className={`categoryTag ${getCategoryClass(bill.category)}`}>
                    {bill.category}
                  </span>
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

            {bill.url && (
              <div>
                <h3 className="modalSubheader">
                  <svg className="modalSubheaderIcon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Official Bill
                </h3>
                <div className="officialBillSection">
                  <a
                    href={bill.url}
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
              <PrimaryButton variant="primary" className="flex-1">
                Endorse Bill
              </PrimaryButton>
              <PrimaryButton variant="secondary" className="flex-1">
                Contact Representative
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
