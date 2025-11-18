"use client";

import { useEffect, useRef, useState } from "react";
import ChatPage from "./chatbot";
import "./ChatModal.css";

interface ChatModalProps {
  billId: string;
  isVisible: boolean;
  isSmallScreenOverlay?: boolean;
}

export default function ChatModal({
  billId,
  isVisible,
  isSmallScreenOverlay = false,
}: ChatModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 1200);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

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
      // Reset height when modal is closed
      containerRef.current.style.height = '';
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`chatModalOverlay ${isVisible ? "visible" : ""}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        ref={containerRef}
        className="chatModalContainer"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {!isSmallScreen && !isSmallScreenOverlay && (
          <div className="chatModalHeader">
            <h3 className="chatModalTitle">Ask Questions</h3>
          </div>
        )}
        <div className="chatModalContent">
          <ChatPage billId={billId} />
        </div>
      </div>
    </div>
  );
}

