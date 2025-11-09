"use client";

import { useState, useEffect, useRef } from "react";
import type { Representative } from "@/types";
import ContactCard from "./ContactCard";
import "./ContactCardGallery.css";

interface ContactCardGalleryProps {
  representatives: Representative[];
  isVisible: boolean;
  onClose?: () => void;
}

export default function ContactCardGallery({
  representatives,
  isVisible,
  onClose,
}: ContactCardGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardWrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Match the height of the bill card modal with animation
  useEffect(() => {
    if (isVisible && containerRef.current) {
      // Start with height 0 for animation
      containerRef.current.style.height = '0px';

      const updateHeight = () => {
        const billModalContent = document.querySelector('.modalContent') as HTMLElement;
        if (billModalContent && containerRef.current) {
          const billModalHeight = billModalContent.offsetHeight;
          // Use requestAnimationFrame to ensure the 0px height is applied first
          requestAnimationFrame(() => {
            if (containerRef.current) {
              containerRef.current.style.height = `${billModalHeight}px`;
            }
          });
        }
      };

      // Small delay to ensure bill modal has rendered and 0px height is applied
      const timeoutId = setTimeout(updateHeight, 1);

      // Update on window resize
      const handleResize = () => {
        const billModalContent = document.querySelector('.modalContent') as HTMLElement;
        if (billModalContent && containerRef.current) {
          const billModalHeight = billModalContent.offsetHeight;
          containerRef.current.style.height = `${billModalHeight}px`;
        }
      };

      // Watch for changes in modal content size
      const billModalContent = document.querySelector('.modalContent') as HTMLElement;
      let resizeObserver: ResizeObserver | null = null;

      if (billModalContent && window.ResizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          if (billModalContent && containerRef.current) {
            const billModalHeight = billModalContent.offsetHeight;
            containerRef.current.style.height = `${billModalHeight}px`;
          }
        });
        resizeObserver.observe(billModalContent);
      }

      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', handleResize);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    } else if (!isVisible && containerRef.current) {
      // Reset height when gallery is closed
      containerRef.current.style.height = '';
    }
  }, [isVisible]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < representatives.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Fade/slide effect when index changes
  useEffect(() => {
    if (cardWrapperRef.current) {
      cardWrapperRef.current.style.opacity = '0';
      cardWrapperRef.current.style.transform = 'translateX(20px)';
      setTimeout(() => {
        if (cardWrapperRef.current) {
          cardWrapperRef.current.style.opacity = '1';
          cardWrapperRef.current.style.transform = 'translateX(0)';
        }
      }, 50);
    }
  }, [currentIndex]);

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < representatives.length - 1;

  const handleClose = () => {
    if (containerRef.current) {
      // Shrink to 0 height with animation
      containerRef.current.style.height = '0px';
      // Wait for animation to complete (0.4s) then close
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 400);
    } else {
      // If no container ref, close immediately
      if (onClose) {
        onClose();
      }
    }
  };

  if (!isVisible || representatives.length === 0) {
    return null;
  }

  return (
    <div
      className={`contactGalleryOverlay ${isVisible ? "visible" : ""}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        ref={containerRef}
        className="contactGalleryContainer"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="contactGalleryClose" onClick={handleClose}>
          ×
        </button>
        <div className="contactGalleryHeader">
          <h3 className="contactGalleryTitle">Contact Representatives</h3>
        </div>
        <div className="contactGalleryContent">
          <button
            className={`contactGalleryArrow contactGalleryArrowLeft ${!canGoPrevious ? "disabled" : ""
              }`}
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            aria-label="Previous representative"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="contactGalleryCardWrapper" ref={cardWrapperRef}>
            <ContactCard representative={representatives[currentIndex]} />
          </div>
          <button
            className={`contactGalleryArrow contactGalleryArrowRight ${!canGoNext ? "disabled" : ""
              }`}
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label="Next representative"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
        <div className="contactGalleryCounter">
          {currentIndex + 1} of {representatives.length}
        </div>
      </div>
    </div>
  );
}

