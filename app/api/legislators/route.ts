import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getSession();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    try {
        fetch(`"https://api.geocod.io/v1.9/geocode?q=${userResidency}&country=USA&fields=cd&api_key=${process.env.GEOCOD_API_KEY}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        return NextResponse.json({ legislators }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}