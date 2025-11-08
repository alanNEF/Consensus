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
            .select("id, email, name, residency, topics, race, religion, gender, age_range, party, income, education")
            .eq("id", session.user.id)
            .single();

        if (error || !user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Type assertion to help TypeScript know user keys (fix "never" error)
        const typedUser = user as {
            email?: string | null;
            name?: string | null;
            residency?: string | null;
            topics?: string[] | null;
            race?: string | null;
            religion?: string | null;
            gender?: string | null;
            age_range?: string | null;
            party?: string | null;
            income?: string | null;
            education?: string | null;
        };

        return NextResponse.json({
            email: typedUser.email,
            name: typedUser.name,
            residency: typedUser.residency,
            topics: typedUser.topics || [],
            race: typedUser.race || null,
            religion: typedUser.religion || null,
            gender: typedUser.gender || null,
            age_range: typedUser.age_range || null,
            party: typedUser.party || null,
            income: typedUser.income || null,
            education: typedUser.education || null,
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
        const { residency, topics, race, religion, gender, age_range, party, income, education } = body;

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

        if (income !== undefined) {
            updateData.income = income;
        }

        if (education !== undefined) {
            updateData.education = education;
        }

        // Define a type for the user profile fields we expect
        type UserProfile = {
            id: string;
            email: string;
            name: string | null;
            residency: string | null;
            topics: string[] | null;
            race: string | null;
            religion: string | null;
            gender: string | null;
            age_range: string | null;
            party: string | null;
            income: string | null;
            education: string | null;
        };

        const { data, error } = await supabase
            .from("users")
            .update(updateData as never)
            .eq("id", session.user.id)
            .select("id, email, name, residency, topics, race, religion, gender, age_range, party, income, education")
            .single();

        const updatedUser = data as UserProfile | null;

        if (error || !updatedUser) {
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
            income: updatedUser.income || null,
            education: updatedUser.education || null,
        });
    } catch (error: any) {
        console.error("Error updating user profile:", error);
        return NextResponse.json(
            { error: "Failed to update profile" },
            { status: 500 }
        );
    }
}

