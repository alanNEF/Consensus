"use client";

import { useState, useRef, useEffect } from "react";
import BillCard from "@/components/bills/BillCard";
import type { Bill, BillSummary } from "@/types";
import "./feed.css";

interface FeedClientProps {
    preferredCategories: string[];
    remainingCategories: string[];
    billsByCategoryPreferred: Map<string, Bill[]>;
    billsByCategoryRemaining: Map<string, Bill[]>;
    billSummaries: Map<string, BillSummary>;
    billUrls: Map<string, string>;
}

export default function FeedClient({
    preferredCategories,
    remainingCategories,
    billsByCategoryPreferred,
    billsByCategoryRemaining,
    billSummaries,
    billUrls
}: FeedClientProps) {
    const allCategories = [...preferredCategories, ...remainingCategories];
    const [expandedCardIndex, setExpandedCardIndex] = useState<Record<string, number>>({});
    const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [arrowStates, setArrowStates] = useState<Record<string, { left: boolean; right: boolean }>>({});

    // Update arrow states based on scroll position
    const updateArrowStates = (category: string) => {
        const container = scrollRefs.current[category];
        if (!container) return;

        const isAtStart = container.scrollLeft <= 0;
        const isAtEnd = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;

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
        if (!container || arrowStates[category]?.left) return;

        setExpandedCardIndex((prev) => {
            const newState = { ...prev };
            delete newState[category];
            return newState;
        });

        setTimeout(() => {
            const cardWidth = 280;
            const scrollAmount = cardWidth * 4 + 64;
            const newScrollLeft = container.scrollLeft - scrollAmount;

            if (newScrollLeft > 0) {
                container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
            } else {
                container.scrollTo({ left: 0, behavior: "smooth" });
            }

            setTimeout(() => updateArrowStates(category), 350);
        }, 300);
    };

    const scrollRight = (category: string) => {
        const container = scrollRefs.current[category];
        if (!container || arrowStates[category]?.right) return;

        setExpandedCardIndex((prev) => {
            const newState = { ...prev };
            delete newState[category];
            return newState;
        });

        setTimeout(() => {
            const cardWidth = 280;
            const scrollAmount = cardWidth * 4 + 64;
            const maxScroll = container.scrollWidth - container.clientWidth;
            const newScrollLeft = container.scrollLeft + scrollAmount;

            if (newScrollLeft < maxScroll) {
                container.scrollBy({ left: scrollAmount, behavior: "smooth" });
            } else {
                container.scrollTo({ left: maxScroll, behavior: "smooth" });
            }

            setTimeout(() => updateArrowStates(category), 350);
        }, 300);
    };

    const handleCardHover = (category: string, index: number) => {
        setExpandedCardIndex((prev) => ({
            ...prev,
            [category]: index,
        }));
    };

    const handleRowLeave = (category: string) => {
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
                                                billSummary={billSummaries.get(bill.id) as BillSummary}
                                                billUrl={billUrls.get(bill.id) as string}
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
                </div>

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
                                                billSummary={billSummaries.get(bill.id) as BillSummary}
                                                billUrl={billUrls.get(bill.id) as string}
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
    );
}
