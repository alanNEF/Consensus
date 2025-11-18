"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import BillCard from "@/components/bills/BillCard";
import type { Bill, BillSummary, Representative } from "@/types";
import "./feed.css";

interface FeedClientProps {
    preferredCategories: string[];
    remainingCategories: string[];
    billsByCategoryPreferred: Map<string, Bill[]>;
    billsByCategoryRemaining: Map<string, Bill[]>;
    billSummaries: Map<string, BillSummary>;
    representatives: Representative[];
    billUrls: Map<string, string>;
}

export default function FeedClient({
    preferredCategories,
    remainingCategories,
    billsByCategoryPreferred,
    billsByCategoryRemaining,
    billSummaries,
    representatives,
    billUrls
}: FeedClientProps) {
    const allCategories = useMemo(() => [...preferredCategories, ...remainingCategories], [preferredCategories, remainingCategories]);
    const [expandedCardIndex, setExpandedCardIndex] = useState<Record<string, number>>({});
    const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [arrowStates, setArrowStates] = useState<Record<string, { left: boolean; right: boolean }>>({});
    const scrollIntervals = useRef<Record<string, NodeJS.Timeout | null>>({});
    const lastActivityTime = useRef<number>(Date.now());
    const [showSwipeHint, setShowSwipeHint] = useState(false);
    const swipeHintTimeout = useRef<NodeJS.Timeout | null>(null);
    const wasHolding = useRef<Record<string, boolean>>({});

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

    const updateActivity = () => {
        lastActivityTime.current = Date.now();
        setShowSwipeHint(false);
        if (swipeHintTimeout.current) {
            clearTimeout(swipeHintTimeout.current);
            swipeHintTimeout.current = null;
        }
    };

    const startContinuousScroll = (category: string, direction: 'left' | 'right') => {
        const container = scrollRefs.current[category];
        if (!container) return;

        // Mark that we're holding the button
        wasHolding.current[category] = true;

        // Clear any existing interval for this category
        if (scrollIntervals.current[category]) {
            clearInterval(scrollIntervals.current[category]!);
        }

        setExpandedCardIndex((prev) => {
            const newState = { ...prev };
            delete newState[category];
            return newState;
        });

        const scrollAmount = 500; // Small increment for smooth continuous scrolling
        const scrollInterval = setInterval(() => {
            const currentContainer = scrollRefs.current[category];
            if (!currentContainer) {
                clearInterval(scrollInterval);
                return;
            }

            if (direction === 'left') {
                if (currentContainer.scrollLeft > 0) {
                    currentContainer.scrollBy({ left: -scrollAmount, behavior: 'auto' });
                    updateArrowStates(category);
                } else {
                    clearInterval(scrollInterval);
                    scrollIntervals.current[category] = null;
                }
            } else {
                const maxScroll = currentContainer.scrollWidth - currentContainer.clientWidth;
                if (currentContainer.scrollLeft < maxScroll) {
                    currentContainer.scrollBy({ left: scrollAmount, behavior: 'auto' });
                    updateArrowStates(category);
                } else {
                    clearInterval(scrollInterval);
                    scrollIntervals.current[category] = null;
                }
            }
        }, 0); // ~60fps

        scrollIntervals.current[category] = scrollInterval;
    };

    const stopContinuousScroll = (category: string) => {
        if (scrollIntervals.current[category]) {
            clearInterval(scrollIntervals.current[category]!);
            scrollIntervals.current[category] = null;
        }
        // Reset the holding flag after a short delay to allow onClick to check it
        setTimeout(() => {
            wasHolding.current[category] = false;
        }, 100);
    };

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
        updateActivity();
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


    // Inactivity popup effect
    useEffect(() => {
        const checkInactivity = () => {
            const timeSinceActivity = Date.now() - lastActivityTime.current;
            if (timeSinceActivity >= 5000 && !showSwipeHint) {
                setShowSwipeHint(true);
            }
        };

        const activityInterval = setInterval(() => {
            checkInactivity();
        }, 1000);

        // Track various user activities
        const handleActivity = () => {
            updateActivity();
        };

        window.addEventListener('mousedown', handleActivity);
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('touchstart', handleActivity);
        window.addEventListener('scroll', handleActivity);
        window.addEventListener('keydown', handleActivity);

        return () => {
            clearInterval(activityInterval);
            window.removeEventListener('mousedown', handleActivity);
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            window.removeEventListener('keydown', handleActivity);
        };
    }, [showSwipeHint]);

    // Cleanup intervals on unmount
    useEffect(() => {
        return () => {
            Object.values(scrollIntervals.current).forEach((interval) => {
                if (interval) clearInterval(interval);
            });
        };
    }, []);



    return (
        <div className="feedContainer">
            <div className="feedContent">
                <div className="feedHeader">
                    <h1 className="feedTitle">Bills you&apos;re interested in</h1>
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
                                    onClick={(e) => {
                                        updateActivity();
                                        // Only do single scroll if we weren't holding the button
                                        if (!wasHolding.current[category]) {
                                            scrollLeft(category);
                                        }
                                        wasHolding.current[category] = false;
                                    }}
                                    onMouseDown={() => {
                                        updateActivity();
                                        if (!isLeftDisabled) {
                                            startContinuousScroll(category, 'left');
                                        }
                                    }}
                                    onMouseUp={() => {
                                        updateActivity();
                                        stopContinuousScroll(category);
                                    }}
                                    onMouseLeave={() => {
                                        updateActivity();
                                        stopContinuousScroll(category);
                                    }}
                                    onTouchStart={(e) => {
                                        updateActivity();
                                        e.preventDefault();
                                        if (!isLeftDisabled) {
                                            startContinuousScroll(category, 'left');
                                        }
                                    }}
                                    onTouchEnd={() => {
                                        updateActivity();
                                        stopContinuousScroll(category);
                                    }}
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
                                    onScroll={() => {
                                        updateActivity();
                                        updateArrowStates(category);
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
                                                representatives={representatives}
                                                billUrl={billUrls.get(bill.id) as string}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className={`scrollArrow scrollArrowRight ${isRightDisabled ? "disabled" : ""}`}
                                    onClick={(e) => {
                                        updateActivity();
                                        // Only do single scroll if we weren't holding the button
                                        if (!wasHolding.current[category]) {
                                            scrollRight(category);
                                        }
                                        wasHolding.current[category] = false;
                                    }}
                                    onMouseDown={() => {
                                        updateActivity();
                                        if (!isRightDisabled) {
                                            startContinuousScroll(category, 'right');
                                        }
                                    }}
                                    onMouseUp={() => {
                                        updateActivity();
                                        stopContinuousScroll(category);
                                    }}
                                    onMouseLeave={() => {
                                        updateActivity();
                                        stopContinuousScroll(category);
                                    }}
                                    onTouchStart={(e) => {
                                        updateActivity();
                                        e.preventDefault();
                                        if (!isRightDisabled) {
                                            startContinuousScroll(category, 'right');
                                        }
                                    }}
                                    onTouchEnd={() => {
                                        updateActivity();
                                        stopContinuousScroll(category);
                                    }}
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
                                    onClick={(e) => {
                                        updateActivity();
                                        // Only do single scroll if we weren't holding the button
                                        if (!wasHolding.current[category]) {
                                            scrollLeft(category);
                                        }
                                        wasHolding.current[category] = false;
                                    }}
                                    onMouseDown={() => {
                                        updateActivity();
                                        if (!isLeftDisabled) {
                                            startContinuousScroll(category, 'left');
                                        }
                                    }}
                                    onMouseUp={() => {
                                        updateActivity();
                                        stopContinuousScroll(category);
                                    }}
                                    onMouseLeave={() => {
                                        updateActivity();
                                        stopContinuousScroll(category);
                                    }}
                                    onTouchStart={(e) => {
                                        updateActivity();
                                        e.preventDefault();
                                        if (!isLeftDisabled) {
                                            startContinuousScroll(category, 'left');
                                        }
                                    }}
                                    onTouchEnd={() => {
                                        updateActivity();
                                        stopContinuousScroll(category);
                                    }}
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
                                    onScroll={() => {
                                        updateActivity();
                                        updateArrowStates(category);
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
                                    onClick={(e) => {
                                        updateActivity();
                                        // Only do single scroll if we weren't holding the button
                                        if (!wasHolding.current[category]) {
                                            scrollRight(category);
                                        }
                                        wasHolding.current[category] = false;
                                    }}
                                    onMouseDown={() => {
                                        updateActivity();
                                        if (!isRightDisabled) {
                                            startContinuousScroll(category, 'right');
                                        }
                                    }}
                                    onMouseUp={() => {
                                        updateActivity();
                                        stopContinuousScroll(category);
                                    }}
                                    onMouseLeave={() => {
                                        updateActivity();
                                        stopContinuousScroll(category);
                                    }}
                                    onTouchStart={(e) => {
                                        updateActivity();
                                        e.preventDefault();
                                        if (!isRightDisabled) {
                                            startContinuousScroll(category, 'right');
                                        }
                                    }}
                                    onTouchEnd={() => {
                                        updateActivity();
                                        stopContinuousScroll(category);
                                    }}
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
            {showSwipeHint && (
                <div className="swipeHint">
                    <p>Swipe left or right on your phone or keypad to cycle through bills</p>
                </div>
            )}
        </div>
    );
}
