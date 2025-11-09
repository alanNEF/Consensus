import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserSavedBills, getBillById } from "@/lib/supabase";

export async function GET() {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const savedBills = await getUserSavedBills(session.user.id);

        // Fetch full bill details for each saved bill and preserve the endorsed status
        const billsWithStatus = await Promise.all(
            savedBills.map(async (savedBill) => {
                const bill = await getBillById(savedBill.bill_id);
                if (!bill) return null;
                // Preserve the endorsed status from saved_bills
                return {
                    ...bill,
                    endorsed: (savedBill as any).endorsed ?? false
                };
            })
        );

        // Filter out any null values
        const validBills = billsWithStatus.filter((bill) => bill !== null) as any[];

        // Now we can properly filter by endorsed status
        const endorsedBills = validBills.filter((bill) => bill.endorsed === true);
        const unendorsedBills = validBills.filter((bill) => bill.endorsed === false || bill.endorsed === null || bill.endorsed === undefined);

        return NextResponse.json({ endorsedBills: endorsedBills, unendorsedBills: unendorsedBills }, { status: 200 });
    } catch (error) {
        console.error("Error fetching user bills:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await getUserSavedBills(session.user.id);
        return NextResponse.json({ message: "Endorsement created" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}