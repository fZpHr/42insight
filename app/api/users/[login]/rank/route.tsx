import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Student } from "@/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  _request: Request,
  context: { params: { login: string } },
) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }
  try {
    const params = await context.params;
    const login = params.login;

    let targetUser: any = await prisma.student.findFirst({
      where: { name: login },
    });

    let isPoolUser = false;

    if (!targetUser) {
      targetUser = await prisma.poolUser.findFirst({
        where: { name: login },
      });
      isPoolUser = true;
    }

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let allUsers;
    if (isPoolUser) {
      allUsers = await prisma.poolUser.findMany();
    } else {
      allUsers = await prisma.student.findMany({
        where: { campus: targetUser.campus },
      });
    }

    const sortedUsers = allUsers.sort((a, b) => b.level - a.level);
    const currentUserIndex = sortedUsers.findIndex(
      (user) => user.name === login,
    );
    const currentUserRank =
      currentUserIndex !== -1 ? currentUserIndex + 1 : null;
    return NextResponse.json({ rank: currentUserRank });
  } catch (error) {
    console.error("Error fetching rank", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 },
    );
  }
}
