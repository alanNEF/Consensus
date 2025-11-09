import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assembleLink, getBillById } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        const { billId } = await request.json();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const bill = await getBillById(billId);
        if (!bill) {
            return NextResponse.json({ error: "Bill not found" }, { status: 404 });
        }
        const url = await assembleLink(bill);
        if (!url) {
            return NextResponse.json({ error: "Failed to assemble link" }, { status: 500 });
        }
        return NextResponse.json({ url: url }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}