"use client";

import { useState, useRef, useEffect } from "react";
import { getBillsByCategory, getUserById } from "@/lib/supabase";
import BillCard from "@/components/bills/BillCard";
import { getSession } from "@/lib/auth";
import "./feed.css";
import { redirect } from "next/navigation";
import type { Bill } from "@/types";
export default async function FeedPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const user = await getUserById(session?.user?.id);
  if (!user) {
    redirect("/login");
  }
  const preferredCategories = user?.topics || [];
  const remainingCategories = ["Health", "Environment", "Armed Services", "Economy", "Education", "Technology", "Immigration", "Agriculture and Food", "Government Operations", "Taxation", "Civil Rights", "Criminal Justice"];
  remainingCategories.filter((category) => !preferredCategories.includes(category));
  const allCategories = [...preferredCategories, ...remainingCategories];
  const billsByCategoryPreferred = new Map<string, Bill[]>();
  const billsByCategoryRemaining = new Map<string, Bill[]>();

  for (const category of preferredCategories) {
    const bills = await getBillsByCategory(category);
    billsByCategoryPreferred.set(category, bills);
  }

  for (const category of remainingCategories) {
    const bills = await getBillsByCategory(category);
    billsByCategoryRemaining.set(category, bills);
  }
  const [expandedCardIndex, setExpandedCardIndex] = useState<Record<string, number>>({});
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [arrowStates, setArrowStates] = useState<Record<string, { left: boolean; right: boolean }>>({});

  // Update arrow states based on scroll position
  const updateArrowStates = (category: string) => {
    const container = scrollRefs.current[category];
    if (!container) return;

    const isAtStart = container.scrollLeft <= 0;
    const isAtEnd = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1; // -1 for rounding errors

    setArrowStates((prev) => ({
      ...prev,
      [category]: {
        left: isAtStart,
        right: isAtEnd,
      },
    }));
  };

  // Initialize arrow states and set up scroll listeners
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    // Small delay to ensure containers are rendered
    const timeoutId = setTimeout(() => {
      allCategories.forEach((category) => {
        const container = scrollRefs.current[category];
        if (container) {
          updateArrowStates(category);

          const handleScroll = () => {
            updateArrowStates(category);
          };

          container.addEventListener("scroll", handleScroll);
          cleanupFunctions.push(() => {
            container.removeEventListener("scroll", handleScroll);
          });
        }
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [allCategories]);


  const scrollLeft = (category: string) => {
    const container = scrollRefs.current[category];
    if (!container || arrowStates[category]?.left) return; // Don't scroll if disabled

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

      // Only scroll if not at the beginning
      if (newScrollLeft > 0) {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        container.scrollTo({ left: 0, behavior: "smooth" });
      }

      // Update arrow states after scroll
      setTimeout(() => updateArrowStates(category), 350);
    }, 300); // Wait for 0.3s transition to complete
  };

  const scrollRight = (category: string) => {
    const container = scrollRefs.current[category];
    if (!container || arrowStates[category]?.right) return; // Don't scroll if disabled

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
      const maxScroll = container.scrollWidth - container.clientWidth;
      const newScrollLeft = container.scrollLeft + scrollAmount;

      // Only scroll if not at the end
      if (newScrollLeft < maxScroll) {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      } else {
        container.scrollTo({ left: maxScroll, behavior: "smooth" });
      }

      // Update arrow states after scroll
      setTimeout(() => updateArrowStates(category), 350);
    }, 300); // Wait for 0.3s transition to complete
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
          <h1 className="feedTitle">Bills you're interested in</h1>
          <p className="feedSubtitle">Stay informed about legislation that matters to you.</p>
        </div>

        {preferredCategories.map((category) => {
          const bills = billsByCategoryPreferred.get(category) || [];
          const expandedIndex = expandedCardIndex[category];
          const isLeftDisabled = arrowStates[category]?.left ?? false;
          const isRightDisabled = arrowStates[category]?.right ?? false;

          return (
            <div key={category} className="categorySection">
              <h2 className="categoryTitle">{category}</h2>
              <div className="billRow" onMouseLeave={() => handleRowLeave(category)}>
                <button
                  className={`scrollArrow scrollArrowLeft ${isLeftDisabled ? "disabled" : ""}`}
                  onClick={() => scrollLeft(category)}
                  disabled={isLeftDisabled}
                  aria-label={`Scroll ${category} left`}
                >
                  ‹
                </button>
                <div
                  className="billCardsContainer"
                  ref={(el) => {
                    scrollRefs.current[category] = el;
                    if (el) {
                      // Update arrow states when container is mounted
                      setTimeout(() => updateArrowStates(category), 0);
                    }
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
                  className={`scrollArrow scrollArrowRight ${isRightDisabled ? "disabled" : ""}`}
                  onClick={() => scrollRight(category)}
                  disabled={isRightDisabled}
                  aria-label={`Scroll ${category} right`}
                >
                  ›
                </button>
              </div>
            </div>
          );
        })}

        <div className="feedHeader">
          <h1 className="feedTitle">Other categories</h1>
          <p className="feedSubtitle">Stay informed about legislation in other categories.</p>
          {remainingCategories.map((category) => {
            const bills = billsByCategoryRemaining.get(category) || [];
            const expandedIndex = expandedCardIndex[category];
            const isLeftDisabled = arrowStates[category]?.left ?? false;
            const isRightDisabled = arrowStates[category]?.right ?? false;

            return (
              <div key={category} className="categorySection">
                <h2 className="categoryTitle">{category}</h2>
                <div className="billRow" onMouseLeave={() => handleRowLeave(category)}>
                  <button
                    className={`scrollArrow scrollArrowLeft ${isLeftDisabled ? "disabled" : ""}`}
                    onClick={() => scrollLeft(category)}
                    disabled={isLeftDisabled}
                    aria-label={`Scroll ${category} left`}
                  >
                    ‹
                  </button>
                  <div
                    className="billCardsContainer"
                    ref={(el) => {
                      scrollRefs.current[category] = el;
                      if (el) {
                        // Update arrow states when container is mounted
                        setTimeout(() => updateArrowStates(category), 0);
                      }
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
                    className={`scrollArrow scrollArrowRight ${isRightDisabled ? "disabled" : ""}`}
                    onClick={() => scrollRight(category)}
                    disabled={isRightDisabled}
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
    </div>
  );
}
