/**
 * Who is on an internship or an apprenticeship.
 *
 * The rankings page has always had "En stage" and "En alternance" sorts, keyed
 * on a `work` field the retired cron jobs filled. They have been hidden since,
 * for want of the data -- but it turns out to be cheap: these are ordinary
 * projects a student registers for, so one filtered projects_users call answers
 * it for a whole campus. 345 rows at Nice, four pages, about two seconds.
 *
 * The ids were read off the campus rather than guessed. What is on Nice today:
 *
 *   1638  Work Experience I                      32 students
 *   1643  Work Experience I - Peer Video          2
 *   2564  FR - Alternance - RNCP7 - 2 ans         4
 *   2573  Évaluation entreprise intermédiaire 1  17
 *   2574  Évaluation entreprise intermédiaire 2
 *   2575  Évaluation entreprise intermédiaire 3
 *   2576  Évaluation entreprise finale
 *
 * The company evaluations accompany an apprenticeship: 13 of those 17 students
 * have them without the specifically named "FR - Alternance" project, and none
 * of them overlap with the internship projects. So counting them as
 * apprenticeship matches what the campus actually looks like.
 */

/** What the rankings page's `work` field means. */
export const WORK_NONE = 0;
export const WORK_INTERNSHIP = 1;
export const WORK_APPRENTICESHIP = 2;

/** Asked for by id, because that is what filter[project_id] takes. */
export const WORK_PROJECT_IDS = [
  1638, 1639, 1640, 1641, 1642, 1643, 2564, 2573, 2574, 2575, 2576,
];

/**
 * Classified by name rather than by id, so a project renamed or added next
 * year still lands in the right column instead of silently disappearing.
 */
export const classifyWorkProject = (projectName: string): number => {
  if (/alternance|apprentissage|évaluation entreprise|evaluation entreprise/i.test(projectName)) {
    return WORK_APPRENTICESHIP;
  }
  if (/work experience|internship|stage/i.test(projectName)) {
    return WORK_INTERNSHIP;
  }
  return WORK_NONE;
};
