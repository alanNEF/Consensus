"use client";

import type { Representative } from "@/types";
import "./ContactCard.css";

interface ContactCardProps {
  representative: Representative;
}

export default function ContactCard({ representative }: ContactCardProps) {
  const getPartyClass = (party: string) => {
    if (party === "REPUBLICAN") return "republican";
    if (party === "DEMOCRAT") return "democrat";
    return "thirdParty";
  };

  return (
    <div className="contactCard">
      <div className="contactCardHeader">
        <div className="contactPhotoContainer">
          {representative.photo ? (
            <img
              src={representative.photo}
              alt={representative.name}
              className="contactPhoto"
            />
          ) : (
            <div className="contactPhotoPlaceholder">
              <svg
                width="60"
                height="60"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
        </div>
        <div className="contactHeaderInfo">
          <h3 className="contactName">{representative.name}</h3>
          {representative.party && (
            <span className={`contactParty ${getPartyClass(representative.party)}`}>
              {representative.party === "REPUBLICAN"
                ? "Republican"
                : representative.party === "DEMOCRAT"
                ? "Democrat"
                : "Third Party"}
            </span>
          )}
        </div>
      </div>

      <div className="contactCardBody">
        {representative.address && (
          <div className="contactInfoItem">
            <svg
              className="contactInfoIcon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="contactInfoText">{representative.address}</span>
          </div>
        )}

        {representative.phone && (
          <div className="contactInfoItem">
            <svg
              className="contactInfoIcon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <a href={`tel:${representative.phone}`} className="contactInfoLink">
              {representative.phone}
            </a>
          </div>
        )}

        {representative.website && (
          <div className="contactInfoItem">
            <svg
              className="contactInfoIcon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <a
              href={representative.website}
              target="_blank"
              rel="noopener noreferrer"
              className="contactInfoLink"
            >
              Visit Website
            </a>
          </div>
        )}

        <div className="contactFormSection">
          <a
            href={`mailto:${representative.name.toLowerCase().replace(/\s+/g, ".")}@house.gov?subject=Contact%20Regarding%20Legislation`}
            className="contactFormLink"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              className="contactFormLinkIcon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Contact Form
          </a>
        </div>
      </div>
    </div>
  );
}

