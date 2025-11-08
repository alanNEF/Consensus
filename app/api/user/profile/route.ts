import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        const session = await getSession();
        
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (!supabase) {
            return NextResponse.json(
                { error: "Database not configured" },
                { status: 500 }
            );
        }

        const { data: user, error } = await supabase
            .from("users")
            .select("id, email, name, residency, topics, race, religion, gender, age_range, party")
            .eq("id", session.user.id)
            .single();

        if (error || !user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            email: user.email,
            name: user.name,
            residency: user.residency,
            topics: user.topics || [],
            race: user.race || null,
            religion: user.religion || null,
            gender: user.gender || null,
            age_range: user.age_range || null,
            party: user.party || null,
        });
    } catch (error: any) {
        console.error("Error fetching user profile:", error);
        return NextResponse.json(
            { error: "Failed to fetch profile" },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getSession();
        
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (!supabase) {
            return NextResponse.json(
                { error: "Database not configured" },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { residency, topics, race, religion, gender, age_range, party } = body;

        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (residency !== undefined) {
            updateData.residency = residency;
        }

        if (topics !== undefined) {
            updateData.topics = topics;
        }

        if (race !== undefined) {
            updateData.race = race;
        }

        if (religion !== undefined) {
            updateData.religion = religion;
        }

        if (gender !== undefined) {
            updateData.gender = gender;
        }

        if (age_range !== undefined) {
            updateData.age_range = age_range;
        }

        if (party !== undefined) {
            updateData.party = party;
        }

        const { data: updatedUser, error } = await supabase
            .from("users")
            .update(updateData)
            .eq("id", session.user.id)
            .select("id, email, name, residency, topics, race, religion, gender, age_range, party")
            .single();

        if (error) {
            console.error("Supabase update error:", error);
            return NextResponse.json(
                { error: "Failed to update profile" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            email: updatedUser.email,
            name: updatedUser.name,
            residency: updatedUser.residency,
            topics: updatedUser.topics || [],
            race: updatedUser.race || null,
            religion: updatedUser.religion || null,
            gender: updatedUser.gender || null,
            age_range: updatedUser.age_range || null,
            party: updatedUser.party || null,
        });
    } catch (error: any) {
        console.error("Error updating user profile:", error);
        return NextResponse.json(
            { error: "Failed to update profile" },
            { status: 500 }
        );
    }
}

