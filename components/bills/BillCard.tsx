"use client";

import Link from "next/link";
import type { Bill } from "@/types";
import { formatDate, truncateText } from "@/lib/utils";

interface BillCardProps {
  bill: Bill;
  isEndorsed?: boolean;
  onEndorse?: (billId: string) => void;
  onUnendorse?: (billId: string) => void;
}

export default function BillCard({
  bill,
  isEndorsed = false,
  onEndorse,
  onUnendorse,
}: BillCardProps) {
  const handleEndorse = () => {
    if (isEndorsed && onUnendorse) {
      onUnendorse(bill.id);
    } else if (!isEndorsed && onEndorse) {
      onEndorse(bill.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <Link
            href={`/feed/${bill.id}`}
            className="text-xl font-semibold text-gray-900 hover:text-blue-600"
          >
            {bill.title}
          </Link>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500">
            {bill.date && (
              <span className="bg-gray-100 px-2 py-1 rounded">
                {formatDate(bill.date)}
              </span>
            )}
            {bill.status && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {bill.status}
              </span>
            )}
            {bill.origin && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                {bill.origin}
              </span>
            )}
          </div>
        </div>
      </div>

      {bill.sponsors && bill.sponsors.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Sponsors:</span>{" "}
            {bill.sponsors.join(", ")}
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        {bill.url && (
          <a
            href={bill.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View on Congress.gov →
          </a>
        )}
        {(onEndorse || onUnendorse) && (
          <button
            onClick={handleEndorse}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isEndorsed
                ? "bg-green-100 text-green-800 hover:bg-green-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {isEndorsed ? "✓ Endorsed" : "Endorse"}
          </button>
        )}
      </div>
    </div>
  );
}

