import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { campusSchema } from "@/lib/validation";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campus_name: string }> }
) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campus_name: campusName } = await params;

    // Validate campus name
    const validation = campusSchema.safeParse(campusName);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid campus name" }, { status: 400 });
    }

    // Fetch all students from this campus
    const students = await prisma.student.findMany({
      where: {
        campus: campusName,
      },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        activityData: true,
      },
    });

    // Map to extract top hosts for each student
    const hostUsage: {
      [host: string]: Array<{
        id: number;
        name: string;
        photoUrl: string;
        hours: string;
        percentage: string;
      }>;
    } = {};

    students.forEach((student) => {
      if (student.activityData && typeof student.activityData === "string") {
        try {
          const parsedActivityData = JSON.parse(student.activityData);
          let topHosts = parsedActivityData.topHosts;

          // Handle nested logtime structure
          if (!topHosts && parsedActivityData.logtime) {
            topHosts = parsedActivityData.logtime.topHosts;
          }

          if (topHosts && Array.isArray(topHosts)) {
            topHosts.forEach(
              (hostInfo: {
                host: string;
                hours: string;
                percentage: string;
              }) => {
                const host = hostInfo.host;
                if (!hostUsage[host]) {
                  hostUsage[host] = [];
                }
                hostUsage[host].push({
                  id: student.id,
                  name: student.name,
                  photoUrl: student.photoUrl,
                  hours: hostInfo.hours,
                  percentage: hostInfo.percentage,
                });
              }
            );
          }
        } catch (error) {
          console.error(`Error parsing activityData for student ${student.id}:`, error);
        }
      }
    });

    // Sort users by hours for each host
    Object.keys(hostUsage).forEach((host) => {
      hostUsage[host].sort((a, b) => {
        const hoursA = parseFloat(a.hours);
        const hoursB = parseFloat(b.hours);
        return hoursB - hoursA; // Descending order
      });
    });

    return NextResponse.json(hostUsage);
  } catch (error) {
    console.error("Error fetching cluster hosts:", error);
    return NextResponse.json(
      { error: "Failed to fetch cluster hosts data" },
      { status: 500 }
    );
  }
}
