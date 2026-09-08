import type { Session } from "next-auth";

/**
 * Which campus a request is about.
 *
 * Every route that reads a campus roster needs exactly one, and the answer is
 * nearly always the visitor's own. When the site covered two campuses, a route
 * given none could walk both and let the caller sort it out; there are 54, so
 * the same loop is now most of an hour's quota spent to answer a question
 * nobody asked.
 *
 * The order is: what the caller asked for, then who they are. Nothing walks
 * every campus, and a route that cannot work out either says so.
 */
export const campusForRequest = (
  request: Request,
  session: Session | null,
): string | null => {
  const requested = new URL(request.url).searchParams.get("campus");
  if (requested) return requested;

  const own = session?.user?.campus;
  return own && own !== "no-campus" ? own : null;
};

export const campusRequiredResponse = () =>
  Response.json(
    {
      error: "campus_required",
      message:
        "Name a campus with ?campus=. There are 54 of them, so this is not something to guess at.",
    },
    { status: 400 },
  );
