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
              <h3 className="modalSubheader">Description</h3>
              <p className="modalText">
                {bill.summary || bill.description || "No description available."}
              </p>
            </div>

            {bill.category && (
              <div>
                <h3 className="modalSubheader">Topic Tags</h3>
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
                  <h3 className="modalSubheader">Sponsors</h3>
                  <div className="sponsorKey">
                    <div className="sponsorKeyItem">
                      <div className="sponsorKeyLine republican"></div>
                      <span>Republican</span>
                    </div>
                    <div className="sponsorKeyItem">
                      <div className="sponsorKeyLine democrat"></div>
                      <span>Democrat</span>
                    </div>
                    <div className="sponsorKeyItem">
                      <div className="sponsorKeyLine thirdParty"></div>
                      <span>Third Party</span>
                    </div>
                  </div>
                </div>
                <div className="sponsorSection">
                  <div className="sponsorsList">
                    {bill.sponsorDetails.map((sponsor, index) => (
                      <span key={index}>
                        <span className={`sponsorName ${getPartyClass(sponsor.party)}`}>
                          {sponsor.name}
                        </span>
                        {index < bill.sponsorDetails!.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {bill.url && (
              <div>
                <h3 className="modalSubheader">Official Bill</h3>
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
