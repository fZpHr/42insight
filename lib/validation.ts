import { z } from "zod";

/**
 * Validation schemas for API inputs
 */


/**
 * A campus name.
 *
 * This was an enum of 47 hardcoded names, which was both a restriction and a
 * list going quietly out of date -- 42 has 54 campuses, and opens new ones.
 * The authority on which names exist is the 42 API, so routes resolve a name
 * through the live directory in lib/forty-two/live-campus.ts and answer 404
 * when it is not one. All this needs to do is reject something that could not
 * be a campus name at all.
 */
export const campusSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[\p{L}\p{N} .'-]+$/u, "Not a campus name");

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
