import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserEndorsements,
  createEndorsement,
  deleteEndorsement,
} from "@/lib/supabase";
import {
  endorsementCreateSchema,
  endorsementDeleteSchema,
} from "@/lib/validators";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const endorsements = await getUserEndorsements(session.user.id);
    return NextResponse.json({ endorsements });
  } catch (error) {
    console.error("Error fetching endorsements:", error);
    return NextResponse.json(
      { error: "Failed to fetch endorsements" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bill_id } = endorsementCreateSchema.parse(body);

    const endorsement = await createEndorsement(session.user.id, bill_id);
    if (!endorsement) {
      return NextResponse.json(
        { error: "Failed to create endorsement" },
        { status: 500 }
      );
    }

    return NextResponse.json({ endorsement }, { status: 201 });
  } catch (error) {
    console.error("Error creating endorsement:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create endorsement" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bill_id } = endorsementDeleteSchema.parse(body);

    const success = await deleteEndorsement(session.user.id, bill_id);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete endorsement" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting endorsement:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete endorsement" },
      { status: 500 }
    );
  }
}

