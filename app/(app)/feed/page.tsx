<<<<<<< HEAD
"use client";

import { useState, useRef, useEffect } from "react";
import BillCard from "@/components/bills/BillCard";
=======
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserById, getBillsByCategory } from "@/lib/supabase";
import FeedClient from "./FeedClient";
>>>>>>> dev
import type { Bill } from "@/types";

export default async function FeedPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

<<<<<<< HEAD
export default function FeedPage() {
  const [billsByCategory, setBillsByCategory] = useState<Record<string, Bill[]>>({});
  const [loading, setLoading] = useState(true);
  // Only expand cards on hover, no default expansion
  const [expandedCardIndex, setExpandedCardIndex] = useState<Record<string, number>>({});
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [arrowStates, setArrowStates] = useState<Record<string, { left: boolean; right: boolean }>>({});
=======
  const user = await getUserById(session.user.id);
  if (!user) {
    redirect("/login");
  }
>>>>>>> dev

  const preferredCategories = user.topics || [];
  const allCategoriesList = [
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

  // Filter out preferred categories from remaining
  const remainingCategories = allCategoriesList.filter(
    (category) => !preferredCategories.includes(category)
  );

  // Fetch bills for preferred categories
  const billsByCategoryPreferred = new Map<string, Bill[]>();
  for (const category of preferredCategories) {
    const bills = await getBillsByCategory(category);
    billsByCategoryPreferred.set(category, bills);
  }

<<<<<<< HEAD
  // Fetch bills from API
  useEffect(() => {
    async function fetchBills() {
      try {
        const response = await fetch("/api/bills?pageSize=1000");
        if (!response.ok) {
          throw new Error("Failed to fetch bills");
        }
        const result = await response.json();
        const bills = result.data || [];
        
        // Group bills by category
        const byCategory: Record<string, Bill[]> = {};
        bills.forEach((bill: Bill) => {
          const category = bill.category || "Uncategorized";
          if (!byCategory[category]) {
            byCategory[category] = [];
          }
          byCategory[category].push(bill);
        });
        
        setBillsByCategory(byCategory);
      } catch (error) {
        console.error("Error fetching bills:", error);
        setBillsByCategory({});
      } finally {
        setLoading(false);
      }
    }
    
    fetchBills();
  }, []);

  // Initialize arrow states and set up scroll listeners
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];
    
    // Small delay to ensure containers are rendered
    const timeoutId = setTimeout(() => {
      categories.forEach((category) => {
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
  }, [billsByCategory]);


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
=======
  // Fetch bills for remaining categories
  const billsByCategoryRemaining = new Map<string, Bill[]>();
  for (const category of remainingCategories) {
    const bills = await getBillsByCategory(category);
    billsByCategoryRemaining.set(category, bills);
  }
>>>>>>> dev

  return (
    <FeedClient
      preferredCategories={preferredCategories}
      remainingCategories={remainingCategories}
      billsByCategoryPreferred={billsByCategoryPreferred}
      billsByCategoryRemaining={billsByCategoryRemaining}
    />
  );
}
