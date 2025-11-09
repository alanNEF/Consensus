import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { userEndorseBill } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        const { billId } = await request.json();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await userEndorseBill(session.user.id, billId);
        return NextResponse.json({ message: "Endorsement created" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}