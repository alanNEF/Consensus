import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getUserResidency } from "@/lib/supabase";

export async function GET() {
    const session = await getSession();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const userResidency = await getUserResidency(userId);
    if (!userResidency) {
        return NextResponse.json({ error: "User residency not found" }, { status: 404 });
    }
    try {
        const response = await fetch(`"https://api.geocod.io/v1.9/geocode?q=${userResidency}&country=USA&fields=cd&api_key=${process.env.GEOCOD_API_KEY}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        const data = await response.json();
        return NextResponse.json({ legislators: data.results }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}