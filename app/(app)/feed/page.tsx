import { getBills } from "@/lib/supabase";
import BillList from "@/components/bills/BillList";
import { getMockBills } from "@/lib/mocks";

export default async function FeedPage() {
  // Try to fetch from database, fallback to mock data
  let bills;
  try {
    const result = await getBills(1, 20);
    bills = result.data.length > 0 ? result.data : getMockBills();
  } catch (error) {
    console.error("Error fetching bills:", error);
    bills = getMockBills();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bill Feed</h1>
        <p className="mt-2 text-gray-600">
          Browse current U.S. congressional bills
        </p>
      </div>
      <BillList bills={bills} />
    </div>
  );
}

