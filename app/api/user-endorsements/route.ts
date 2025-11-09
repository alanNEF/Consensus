import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserEndorsements } from "@/lib/supabase";

export async function GET() {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const endorsements = await getUserEndorsements(session.user.id);
        return NextResponse.json({ endorsements }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}