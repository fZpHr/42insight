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

    server.tool(
      "get_top_students",
      "Retourne le top N des étudiants pour un campus donné, avec options de filtrage et de classement",
      {
        campus: z.string().describe("Nom du campus (ex: nice, angouleme, etc.)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(10)
          .describe("Nombre maximum d'utilisateurs à retourner"),
        poolYear: z
          .number()
          .int()
          .optional()
          .describe("Filtrer par année de piscine (ex: 2021, 2022, etc.)"),
        rankBy: z
          .enum(["level", "correction", "wallet", "work"])
          .default("level")
          .describe("Critère de classement: level (niveau), correction (points de correction), wallet (wallets), work (work)"),
      },
      async ({ campus, limit, poolYear, rankBy }) => {
        const whereClause: any = { campus };
        if (poolYear) {
          whereClause.year = poolYear;
        }

        const orderByField = rankBy === "correction" ? "correctionPoints" : rankBy;

        const students = await prisma.student.findMany({
          where: whereClause,
          orderBy: { [orderByField]: "desc" },
          take: limit,
          select: {
            name: true,
            level: true,
            year: true,
            correctionPoints: true,
            correctionTotal: true,
            correctionPercentage: true,
            wallet: true,
            work: true,
          },
        });

        if (students.length === 0) {
          const filterText = poolYear ? ` avec l'année de piscine ${poolYear}` : "";
          return {
            content: [
              {
                type: "text",
                text: `Aucun étudiant trouvé pour le campus "${campus}"${filterText}.`,
              },
            ],
          };
        }

        const payload = students.map((s, i) => {
          const baseInfo: any = {
            rank: i + 1,
            login: s.name,
            level: s.level,
            poolYear: s.year,
          };

          switch (rankBy) {
            case "correction":
              baseInfo.correctionPoints = s.correctionPoints;
              baseInfo.correctionTotal = s.correctionTotal;
              baseInfo.correctionPercentage = s.correctionPercentage;
              break;
            case "wallet":
              baseInfo.wallet = s.wallet;
              break;
            case "work":
              baseInfo.work = s.work;
              break;
            default:
              break;
          }

          return baseInfo;
        });

        const rankByText = {
          level: "niveau",
          correction: "points de correction",
          wallet: "wallets",
          work: "work",
        }[rankBy];

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                campus,
                rankBy: rankByText,
                filter: poolYear ? `Année de piscine: ${poolYear}` : "Tous les étudiants",
                students: payload,
              }, null, 2),
            },
          ],
        };
      },
    );

    server.tool(
      "get_campus_stats",
      "Retourne les statistiques globales d'un campus (niveau moyen, wallets, corrections, taux de validation, etc.)",
      {
        campus: z.string().describe("Nom du campus"),
        poolYear: z.number().int().optional().describe("Filtrer par année de piscine (optionnel)"),
      },
      async ({ campus, poolYear }) => {
        const whereClause: any = { campus };
        if (poolYear) {
          whereClause.year = poolYear;
        }

        const students = await prisma.student.findMany({
          where: whereClause,
          select: {
            level: true,
            wallet: true,
            work: true,
            correctionPoints: true,
            correctionTotal: true,
            correctionPercentage: true,
            has_validated: true,
            year: true,
          },
        });

        if (students.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Aucun étudiant trouvé pour le campus "${campus}"${poolYear ? ` (piscine ${poolYear})` : ""}.`,
              },
            ],
          };
        }

        const totalStudents = students.length;
        const validatedCount = students.filter((s) => s.has_validated).length;
        const avgLevel = students.reduce((sum, s) => sum + s.level, 0) / totalStudents;
        const avgWallet = students.reduce((sum, s) => sum + s.wallet, 0) / totalStudents;
        const avgWork = students.reduce((sum, s) => sum + s.work, 0) / totalStudents;
        const avgCorrectionPoints = students.reduce((sum, s) => sum + s.correctionPoints, 0) / totalStudents;
        const avgCorrectionTotal = students.reduce((sum, s) => sum + s.correctionTotal, 0) / totalStudents;

        // Distribution par année de piscine
        const yearDistribution: Record<number, number> = {};
        students.forEach((s) => {
          yearDistribution[s.year] = (yearDistribution[s.year] || 0) + 1;
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  campus,
                  filter: poolYear ? `Piscine ${poolYear}` : "Tous les étudiants",
                  totalStudents,
                  validationRate: `${((validatedCount / totalStudents) * 100).toFixed(2)}%`,
                  validatedCount,
                  notValidatedCount: totalStudents - validatedCount,
                  averages: {
                    level: parseFloat(avgLevel.toFixed(2)),
                    wallet: Math.round(avgWallet),
                    work: Math.round(avgWork),
                    correctionPoints: Math.round(avgCorrectionPoints),
                    correctionTotal: Math.round(avgCorrectionTotal),
                  },
                  yearDistribution: poolYear ? undefined : yearDistribution,
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
      "compare_pool_years",
      "Compare les statistiques entre différentes années de piscine pour un campus",
      {
        campus: z.string().describe("Nom du campus"),
        years: z.array(z.number().int()).describe("Liste des années à comparer (ex: [2021, 2022, 2023])"),
      },
      async ({ campus, years }) => {
        const comparisons = await Promise.all(
          years.map(async (year) => {
            const students = await prisma.student.findMany({
              where: { campus, year },
              select: {
                level: true,
                wallet: true,
                work: true,
                has_validated: true,
              },
            });

            if (students.length === 0) {
              return {
                year,
                totalStudents: 0,
                data: null,
              };
            }

            const totalStudents = students.length;
            const validatedCount = students.filter((s) => s.has_validated).length;
            const avgLevel = students.reduce((sum, s) => sum + s.level, 0) / totalStudents;
            const avgWallet = students.reduce((sum, s) => sum + s.wallet, 0) / totalStudents;
            const avgWork = students.reduce((sum, s) => sum + s.work, 0) / totalStudents;

            return {
              year,
              totalStudents,
              validationRate: parseFloat(((validatedCount / totalStudents) * 100).toFixed(2)),
              validatedCount,
              averages: {
                level: parseFloat(avgLevel.toFixed(2)),
                wallet: Math.round(avgWallet),
                work: Math.round(avgWork),
              },
            };
          }),
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  campus,
                  comparison: comparisons,
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
      "compare_users",
      "Compare les statistiques de 2 ou plusieurs utilisateurs côte à côte",
      {
        logins: z.array(z.string()).min(2).describe("Liste des logins à comparer (minimum 2)"),
      },
      async ({ logins }) => {
        const students = await prisma.student.findMany({
          where: { name: { in: logins } },
          select: {
            name: true,
            level: true,
            campus: true,
            year: true,
            wallet: true,
            work: true,
            correctionPoints: true,
            correctionTotal: true,
            correctionPercentage: true,
            has_validated: true,
            blackholeTimer: true,
          },
        });

        if (students.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "Aucun utilisateur trouvé avec les logins fournis.",
              },
            ],
          };
        }

        const notFound = logins.filter((login) => !students.find((s) => s.name === login));

        const comparison = students.map((s) => ({
          login: s.name,
          campus: s.campus,
          poolYear: s.year,
          level: s.level,
          wallet: s.wallet,
          work: s.work,
          correctionPoints: s.correctionPoints,
          correctionStats: {
            total: s.correctionTotal,
            percentage: s.correctionPercentage,
          },
          hasValidated: s.has_validated,
          blackholeTimer: s.blackholeTimer,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  comparison,
                  notFound: notFound.length > 0 ? notFound : undefined,
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
      "get_completion_rate_by_year",
      "Retourne le taux de complétion (has_validated) par année de piscine pour un campus",
      {
        campus: z.string().describe("Nom du campus"),
      },
      async ({ campus }) => {
        const students = await prisma.student.findMany({
          where: { campus },
          select: {
            year: true,
            has_validated: true,
          },
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

        // Grouper par année
        const yearStats: Record<
          number,
          { total: number; validated: number; percentage: number }
        > = {};

        students.forEach((s) => {
          if (!yearStats[s.year]) {
            yearStats[s.year] = { total: 0, validated: 0, percentage: 0 };
          }
          yearStats[s.year].total++;
          if (s.has_validated) {
            yearStats[s.year].validated++;
          }
        });

        // Calculer les pourcentages
        Object.keys(yearStats).forEach((year) => {
          const yearNum = parseInt(year);
          const stats = yearStats[yearNum];
          stats.percentage = parseFloat(((stats.validated / stats.total) * 100).toFixed(2));
        });

        // Trier par année
        const sortedYears = Object.keys(yearStats)
          .map(Number)
          .sort((a, b) => a - b);

        const results = sortedYears.map((year) => ({
          poolYear: year,
          totalStudents: yearStats[year].total,
          validatedStudents: yearStats[year].validated,
          completionRate: `${yearStats[year].percentage}%`,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  campus,
                  completionRateByYear: results,
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
    "cluster-map",
    "Donne la position d'un utilisateur sur la cluster map de l'ecole",
    {
      login: z.string().describe("Login de l'utilisateur (champ Student.name)"),

    },
    async ({ login }) => {
      const student = await prisma.student.findFirst({
        where: { name: login },
        select: { location: true },
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

      if (!student.location || student.location == "404") {
        return {
          content: [
            {
              type: "text",
              text: `L'utilisateur "${login}" n'a pas de position définie sur la cluster map.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `L'utilisateur "${login}" est situé à la position ${student.location} sur la cluster map.`,
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