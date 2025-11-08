"use client";

import type { Bill } from "@/types";
import BillCard from "./BillCard";

interface BillListProps {
  bills: Bill[];
  endorsedBillIds?: Set<string>;
  onEndorse?: (billId: string) => void;
  onUnendorse?: (billId: string) => void;
}

export default function BillList({
  bills,
  endorsedBillIds = new Set(),
  onEndorse,
  onUnendorse,
}: BillListProps) {
  if (bills.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No bills found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bills.map((bill) => (
        <BillCard
          key={bill.id}
          bill={bill}
          isEndorsed={endorsedBillIds.has(bill.id)}
          onEndorse={onEndorse}
          onUnendorse={onUnendorse}
        />
      ))}
    </div>
  );
}

