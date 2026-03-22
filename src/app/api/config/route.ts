import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.agentConfig.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const config = await prisma.agentConfig.upsert({
    where: { userId: user.id },
    update: {
      agentName: body.agentName,
      brandName: body.brandName,
      businessDesc: body.businessDesc,
      qualifierPrompt: body.qualifierPrompt,
      icpDescription: body.icpDescription,
      video1Url: body.video1Url,
      video2Url: body.video2Url,
      calendlyUrl: body.calendlyUrl,
      bookingPrompt: body.bookingPrompt,
      toneStyle: body.toneStyle,
      language: body.language,
      isActive: body.isActive,
    },
    create: {
      userId: user.id,
      agentName: body.agentName || "",
      brandName: body.brandName || "",
      businessDesc: body.businessDesc || "",
      qualifierPrompt: body.qualifierPrompt || "",
      icpDescription: body.icpDescription || "",
      video1Url: body.video1Url || "",
      video2Url: body.video2Url || "",
      calendlyUrl: body.calendlyUrl || "",
      bookingPrompt: body.bookingPrompt || "",
      toneStyle: body.toneStyle || "casual",
      language: body.language || "es",
      isActive: body.isActive ?? false,
    },
  });

  return NextResponse.json(config);
}
