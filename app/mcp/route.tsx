import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import prisma from "@/lib/prisma";

const handler = createMcpHandler(
  async (server) => {

    server.tool(
      "get_user_profile",
      "Retourne les infos principales d'un utilisateur 42 (niveau, campus, cursus, coalition, année de piscine, etc.)",
      {
        login: z.string().describe("Login de l'utilisateur (champ Student.name)"),
      },
      async ({ login }) => {
        const student = await prisma.student.findFirst({
          where: { name: login },
          select: {
            name: true,
            level: true,
            campus: true,
            year: true,
            photoUrl: true,
            wallet: true,
            location: true,
            blackholeTimer: true,
            correctionPoints: true,
            correctionTotal: true,
            correctionPositive: true,
            correctionNegative: true,
            correctionPercentage: true,
            has_validated: true,
          },
        });

        if (!student) {
          return {
            content: [
              {
                type: "text",
                text: `Aucun utilisateur trouvé avec le login "${login}".`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  login: student.name,
                  level: student.level,
                  campus: student.campus,
                  poolYear: student.year,
                  photoUrl: student.photoUrl,
                  location: student.location,
                  wallet: student.wallet,
                  blackholeTimer: student.blackholeTimer,
                  correctionPoints: student.correctionPoints,
                  correctionStats: {
                    total: student.correctionTotal,
                    positive: student.correctionPositive,
                    negative: student.correctionNegative,
                    percentage: student.correctionPercentage,
                  },
                  hasValidated: student.has_validated,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "get_user_rank",
      "Retourne le rang d'un utilisateur dans son campus en fonction de son niveau",
      {
      login: z.string().describe("Login de l'utilisateur (champ Student.name)"),
      byPoolYear: z.boolean().optional().describe("Si true, calcule le rang uniquement parmi les étudiants de la même année de piscine"),
      },
      async ({ login, byPoolYear }) => {
      const me = await prisma.student.findFirst({
        where: { name: login },
        select: { id: true, level: true, campus: true, year: true },
      });

      if (!me) {
        return {
        content: [
          {
          type: "text",
          text: `Aucun utilisateur trouvé avec le login "${login}".`,
          },
        ],
        };
      }

      const whereClause: any = {
        campus: me.campus,
        level: { gt: me.level },
      };

      const totalWhereClause: any = {
        campus: me.campus,
      };

      if (byPoolYear && me.year) {
        whereClause.year = me.year;
        totalWhereClause.year = me.year;
      }

      const betterCount = await prisma.student.count({
        where: whereClause,
      });

      const totalInCampus = await prisma.student.count({
        where: totalWhereClause,
      });

      const rank = betterCount + 1;

      const scopeText = byPoolYear && me.year 
        ? `parmi les étudiants de l'année ${me.year}` 
        : `au campus`;

      return {
        content: [
        {
          type: "text",
          text: `Utilisateur "${login}" est rang ${rank}/${totalInCampus} ${scopeText} ${me.campus} (niveau ${me.level}).`,
        },
        ],
      };
      },
    );

    // 4) Top N étudiants d'un campus
    server.tool(
      "get_top_students",
      "Retourne le top N des étudiants par niveau pour un campus donné",
      {
        campus: z.string().describe("Nom du campus (ex: nice, angouleme, etc.)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(10)
          .describe("Nombre maximum d'utilisateurs à retourner"),
      },
      async ({ campus, limit }) => {
        const students = await prisma.student.findMany({
          where: { campus },
          orderBy: { level: "desc" },
          take: limit,
          select: { name: true, level: true },
        });

        if (students.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Aucun étudiant trouvé pour le campus "${campus}".`,
              },
            ],
          };
        }

        const payload = students.map((s, i) => ({
          rank: i + 1,
          login: s.name,
          level: s.level,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(payload, null, 2),
            },
          ],
        };
      },
    );

    server.tool(
      "search_users",
      "Cherche des utilisateurs dont le login correspond partiellement à une chaîne",
      {
        query: z
          .string()
          .min(2)
          .describe("Préfixe ou partie du login (ex: 'bpas', 'jdoe')"),
        limit: z.number().int().min(1).max(50).default(10),
      },
      async ({ query, limit }) => {
        const users = await prisma.student.findMany({
          where: { name: { contains: query, mode: "insensitive" } },
          select: { name: true, campus: true, level: true },
          take: limit,
        });

        if (users.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Aucun utilisateur ne correspond à "${query}".`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(users, null, 2),
            },
          ],
        };
      },
    );
  },
  {
    capabilities: {
      tools: {
        get_user_profile: {
          description:
            "Retourne un profil détaillé (niveau, campus, cursus, coalition, etc.) pour un login.",
        },
        get_user_rank: {
          description:
            "Retourne le rang d'un utilisateur dans son campus en fonction de son niveau.",
        },
        get_top_students: {
          description:
            "Retourne le top N des étudiants d'un campus donné, triés par niveau.",
        },
        search_users: {
          description:
            "Cherche des utilisateurs dont le login matche partiellement une chaîne.",
        },
        set_user_level: {
          description:
            "Met à jour le niveau d'un utilisateur (tool d'administration).",
        },
      },
    },
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
    disableSse: true,
  },
);

export { handler as GET, handler as POST, handler as DELETE };