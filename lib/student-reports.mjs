/** Keep each student's completed reports separate by assessment type.
 * @template {{userId?: string, assessmentKind?: string, industryAssessmentId?: string | null}} T
 * @param {T[]} reports
 * @param {string | undefined} userId
 */
export function groupStudentReports(reports, userId) {
  const own = userId
    ? reports.filter((report) => report.userId === userId)
    : [];
  const industry = (report) =>
    report.assessmentKind === "industry" || !!report.industryAssessmentId;
  return {
    skills: own.filter((report) => !industry(report)),
    industry: own.filter(industry),
  };
}
