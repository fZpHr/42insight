import { z } from "zod";

/**
 * Validation schemas for API inputs
 */


export const campusSchema = z.enum([
  "Angouleme",
  "Nice",
  "Amsterdam",
  "Paris",
  "Lyon",
  "Brussels",
  "Helsinki",
  "Khouribga",
  "Sao-Paulo",
  "Benguerir",
  "Madrid",
  "Kazan",
  "Quebec",
  "Tokyo",
  "Rio-de-Janeiro",
  "Seoul",
  "Rome",
  "Yerevan",
  "Bangkok",
  "Kuala-Lumpur",
  "Adelaide",
  "Malaga",
  "Lisboa",
  "Heilbronn",
  "Urduliz",
  "42network",
  "Abu-Dhabi",
  "Wolfsburg",
  "Alicante",
  "Barcelona",
  "Lausanne",
  "Mulhouse",
  "Istanbul",
  "Kocaeli",
  "Berlin",
  "Florence",
  "Vienna",
  "Tetouan",
  "Prague",
  "London",
  "Porto",
  "Le-Havre",
  "Singapore",
  "Antananarivo",
  "Warsaw",
  "Luanda",
  "Gyeongsan"
]);

export type Campus = z.infer<typeof campusSchema>;


export const loginSchema = z
  .string()
  .min(2, "Login must be at least 2 characters")
  .max(20, "Login must be at most 20 characters")
  .regex(/^[a-z][a-z0-9-]*$/, "Login must start with a letter and contain only lowercase letters, numbers, and hyphens");


export const apiQuerySchema = z
  .string()
  .min(1, "Query cannot be empty")
  .max(500, "Query is too long")
  .regex(
    /^[a-zA-Z0-9\/_\-?&=.,%]+$/,
    "Query contains invalid characters"
  );


export const eventIdSchema = z
  .string()
  .regex(/^\d+$/, "Event ID must be numeric")
  .transform(Number)
  .pipe(z.number().int().positive());


export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform(Number)
    .pipe(z.number().int().positive().max(1000)),
  limit: z
    .string()
    .optional()
    .default("100")
    .transform(Number)
    .pipe(z.number().int().positive().max(100)),
});


export const roleSchema = z.enum(["admin", "staff", "student", "pisciner"]);


export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>\"']/g, "") 
    .substring(0, 1000); 
}


export function validationError(errors: z.ZodError) {
  return {
    error: "Validation failed",
    details: errors.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    })),
  };
}
