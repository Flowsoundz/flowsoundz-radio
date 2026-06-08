import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { readArtistSubmissionsByEmail } from "@/lib/artistSubmissionStore";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const submissions = await readArtistSubmissionsByEmail(session.user.email);
    return NextResponse.json({ submissions });
  } catch {
    return NextResponse.json(
      { error: "Failed to load submissions." },
      { status: 500 },
    );
  }
}
