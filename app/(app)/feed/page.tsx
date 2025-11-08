"use client";

import { useState, useRef } from "react";
import { getBillsByCategory } from "@/lib/mocks";
import BillCard from "@/components/bills/BillCard";
import type { Bill } from "@/types";
import "./feed.css";

const categories = [
  "Health",
  "Environment",
  "Armed Services",
  "Economy",
  "Education",
  "Technology",
  "Immigration",
  "Agriculture and Food",
  "Government Operations",
  "Taxation",
  "Civil Rights",
  "Criminal Justice",
];

export default function FeedPage() {
  const billsByCategory = getBillsByCategory();
  // Only expand cards on hover, no default expansion
  const [expandedCardIndex, setExpandedCardIndex] = useState<Record<string, number>>({});
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});


  const scrollLeft = (category: string) => {
    const container = scrollRefs.current[category];
    if (container) {
      // Clear expanded state first to de-hover cards and return to normal width
      setExpandedCardIndex((prev) => {
        const newState = { ...prev };
        delete newState[category];
        return newState;
      });
      
      // Wait for width transition (0.3s) before scrolling for accurate calculations
      setTimeout(() => {
        const cardWidth = 280; // Card width in pixels
        const scrollAmount = cardWidth * 4 + 64; // Scroll by exactly 4 cards (4 cards + 3 gaps between them)
        const newScrollLeft = container.scrollLeft - scrollAmount;
        
        // If we're at the beginning, wrap to the end
        if (newScrollLeft <= 0) {
          container.scrollTo({ left: container.scrollWidth, behavior: "smooth" });
        } else {
          container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        }
      }, 300); // Wait for 0.3s transition to complete
    }
  };

  const scrollRight = (category: string) => {
    const container = scrollRefs.current[category];
    if (container) {
      // Clear expanded state first to de-hover cards and return to normal width
      setExpandedCardIndex((prev) => {
        const newState = { ...prev };
        delete newState[category];
        return newState;
      });
      
      // Wait for width transition (0.3s) before scrolling for accurate calculations
      setTimeout(() => {
        const cardWidth = 280; // Card width in pixels
        const scrollAmount = cardWidth * 4 + 64; // Scroll by exactly 4 cards (4 cards + 3 gaps between them)
        const newScrollLeft = container.scrollLeft + scrollAmount;
        
        // If we're at the end, wrap to the beginning
        if (newScrollLeft >= container.scrollWidth - container.clientWidth) {
          container.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          container.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
      }, 300); // Wait for 0.3s transition to complete
    }
  };

  const handleCardHover = (category: string, index: number) => {
    setExpandedCardIndex((prev) => ({
      ...prev,
      [category]: index,
    }));
  };

  const handleRowLeave = (category: string) => {
    // Clear expanded state when leaving the row
    setExpandedCardIndex((prev) => {
      const newState = { ...prev };
      delete newState[category];
      return newState;
    });
  };

  return (
    <div className="feedContainer">
      <div className="feedContent">
        <div className="feedHeader">
          <h1 className="feedTitle">Current Bills in Congress</h1>
          <p className="feedSubtitle">Stay informed about legislation that matters to you.</p>
        </div>

        {categories.map((category) => {
          const bills = billsByCategory[category] || [];
          const expandedIndex = expandedCardIndex[category];

          return (
            <div key={category} className="categorySection">
              <h2 className="categoryTitle">{category}</h2>
              <div className="billRow" onMouseLeave={() => handleRowLeave(category)}>
                <button
                  className="scrollArrow scrollArrowLeft"
                  onClick={() => scrollLeft(category)}
                  aria-label={`Scroll ${category} left`}
                >
                  ‹
                </button>
                <div
                  className="billCardsContainer"
                  ref={(el) => {
                    scrollRefs.current[category] = el;
                  }}
                >
                  {bills.map((bill, index) => (
                    <div
                      key={bill.id}
                      onMouseEnter={() => handleCardHover(category, index)}
                    >
                      <BillCard
                        bill={bill}
                        isExpanded={expandedIndex === index}
                      />
                    </div>
                  ))}
                </div>
                <button
                  className="scrollArrow scrollArrowRight"
                  onClick={() => scrollRight(category)}
                  aria-label={`Scroll ${category} right`}
                >
                  ›
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
