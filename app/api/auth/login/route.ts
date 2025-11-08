import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyPassword } from '@/lib/password';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;
        
        if (!supabase) {
            return NextResponse.json(
                { error: "Supabase not initialized" },
                { status: 500 }
            );
        }
        
        // Get user with hashed_password
        const { data: existingUser, error: queryError } = await supabase
            .from("users")
            .select("id, email, name, hashed_password")
            .eq("email", email)
            .single() as { data: { id: string; email: string; name: string | null; hashed_password: string } | null; error: any };

        if (queryError || !existingUser) {
            return NextResponse.json(
                { error: "No such user exists" },
                { status: 404 }
            );
        }
        
        const isValid = await verifyPassword(password, existingUser.hashed_password);
        
        if (!isValid) {
            return NextResponse.json(
                { error: "Invalid password" },
                { status: 401 }
            );
        }
        
        // Redirect to feed page on successful login
        return NextResponse.redirect(new URL('/feed', request.url));
        
    } catch (error: any) {
        console.error("Error logging in:", error);
        return NextResponse.json(
            { error: "Failed to login" },
            { status: 500 }
        );
    }
}