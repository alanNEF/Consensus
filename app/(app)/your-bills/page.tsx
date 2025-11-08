import { redirect } from "next/navigation";
import { getSession, requireAuth } from "@/lib/auth";
import { getUserEndorsements, getBills } from "@/lib/supabase";
import BillList from "@/components/bills/BillList";
import { getMockBills } from "@/lib/mocks";

export default async function YourBillsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch user's endorsed bills
  const endorsements = await getUserEndorsements(session.user.id);
  const endorsedBillIds = new Set(endorsements.map((e) => e.bill_id));

  // Fetch all bills (in production, filter to only endorsed ones)
  let bills;
  try {
    const result = await getBills(1, 100);
    bills = result.data.length > 0 ? result.data : getMockBills();
  } catch (error) {
    console.error("Error fetching bills:", error);
    bills = getMockBills();
  }

  // Filter to only endorsed bills
  const endorsedBills = bills.filter((bill) =>
    endorsedBillIds.has(bill.id)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Bills</h1>
        <p className="mt-2 text-gray-600">
          Bills you've endorsed and saved
        </p>
      </div>
      {endorsedBills.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            You haven't endorsed any bills yet.
          </p>
          <a
            href="/feed"
            className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
          >
            Browse bills →
          </a>
        </div>
      ) : (
        <BillList bills={endorsedBills} endorsedBillIds={endorsedBillIds} />
      )}
    </div>
  );
}

