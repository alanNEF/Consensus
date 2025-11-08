import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashPassword } from '@/lib/password';
import { userCreateSchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, name, ...otherFields } = body;

        // Validate password separately (not in schema)
        if (!password || password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters long" },
                { status: 400 }
            );
        }

        if (!supabase) {
            return NextResponse.json(
                { error: "Supabase not initialized" },
                { status: 500 }
            );
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .single();

        if (existingUser) {
            return NextResponse.json(
                { error: "User already exists" },
                { status: 409 }
            );
        }

        // Validate other fields (excluding password)
        // We'll add hashed_password after hashing, so use a placeholder for validation
        const validated = userCreateSchema.parse({
            email,
            name,
            hashed_password: "placeholder", // Will be replaced with actual hash
            ...otherFields,
        });

        // Hash the password
        const hashedPassword = await hashPassword(password);

        // Insert user with hashed password
        // Type assertion needed because hashed_password is not in the User type
        const { data: newUser, error: insertError } = await supabase
            .from("users")
            .insert({
                email: validated.email,
                hashed_password: hashedPassword,
                name: validated.name || null,
                residency: validated.residency || null,
                topics: validated.topics || null,
                race: validated.race || null,
                religion: validated.religion || null,
                gender: validated.gender || null,
                age_range: validated.age_range || null,
                party: validated.party || null,
                income: validated.income || null,
                education: validated.education || null,
            } as any)
            .select("id, email, name, created_at")
            .single();

        if (insertError) {
            if (insertError.code === "23505") {
                return NextResponse.json(
                    { error: "User already exists" },
                    { status: 409 }
                );
            }
            console.error("Supabase insert error:", insertError);
            return NextResponse.json(
                { error: "Failed to create user" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { user: newUser },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Error registering user:", error);

        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: "Invalid input data", details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Failed to register user" },
            { status: 500 }
        );
    }
}

