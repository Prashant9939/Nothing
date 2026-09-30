// Per-track report content registry.
// A track with no dedicated file falls back to a generic builder derived
// from the internship record (title, topics, duration) so reports always
// generate, even for admin-created tracks.

function buildGenericContent(internship) {
  const topics = (internship.topics || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const label = internship.title || 'Professional';
  const days = internship.duration || 30;
  const weeks = Math.max(2, Math.round(days / 7));
  const base = topics.length ? topics : ['Core Concepts', 'Practical Application', 'Project Work'];

  const weekLog = [];
  for (let w = 0; w < weeks; w++) {
    const t1 = base[w % base.length];
    const t2 = base[(w + 1) % base.length];
    const t3 = base[(w + 2) % base.length];
    weekLog.push({ period: `Week ${w + 1} (Part 1)`, text: `Concept sessions and demonstrations for ${t1}, followed by a guided walkthrough of the reference solution. Students took structured notes, reproduced the demonstrated steps independently and submitted the first half of the weekly exercise sheet for review.` });
    weekLog.push({ period: `Week ${w + 1} (Part 2)`, text: `Applied ${t2} and ${t3} through hands-on assignments, compared alternative approaches in the peer review circle, and logged issues faced together with the solutions applied. Weekly quiz, mentor feedback and the updated project backlog closed the week.` });
  }

  return {
    trackLabel: label,
    overview: [
      `The "${label}" internship is a ${days}-day structured program designed to move a student from foundational understanding to practical, project-ready competence. The curriculum is divided into ${internship.modules || base.length} modules that combine concept lectures, supervised lab sessions, self-paced practice and continuous assessment. Emphasis is placed on doing rather than memorising: every topic is reinforced with exercises, and the final phase consolidates learning into a guided project submission evaluated through a proctored examination.`,
      `Delivery followed a repeating weekly cycle: a concept session introduced the theory and demonstrated the target workflow, a supervised lab reproduced it with scaffolding, and an independent task removed the scaffolding so the student had to plan, implement and debug without step-by-step help. Every week ended with a graded exercise set and a short mentor review that recorded strengths, gaps and the actions carried into the following week. Attendance, exercise scores, quiz results and the quality of the weekly log were tracked in the learning portal and rolled up into the final evaluation alongside the capstone project and the proctored theory examination.`,
    ],
    objectives: [
      `Build a working foundation across ${base.slice(0, 3).join(', ')} and related areas.`,
      `Apply ${base[0] || 'the core techniques'} to small, well-scoped tasks without step-by-step guidance.`,
      'Develop day-to-day professional habits: planning, documentation, estimation and review.',
      'Break a vague problem statement into milestones, acceptance criteria and a realistic schedule.',
      'Complete a guided project that applies the covered topics to a realistic problem.',
      'Verify your own work with checklists, test cases and peer review before submitting it.',
      'Improve communication skills through written reports and oral explanation of technical choices.',
      'Search official documentation efficiently and cite the sources used in your notes.',
      'Estimate effort honestly, track actual time against the estimate and adjust future estimates.',
      'Prepare for the final evaluation covering the full syllabus of the program.',
    ],
    chapters: base.map((t, i) => ({
      title: `${t}`,
      paragraphs: [
        `The ${t} module introduced the essential principles behind this area of the program. Sessions began with a short conceptual overview, followed by demonstrations and supervised practice. Students recorded observations, compared alternative approaches and completed exercises that were reviewed in the next session.`,
        `During the practice phase of this module, students worked through progressively harder tasks that required combining ${t} with earlier topics. Common pitfalls were discussed in group reviews, and each student maintained a log of issues faced and the solutions applied — a habit that proved valuable during project work.`,
        `The lab component of this module started with a reproduction task: students followed a worked reference example end-to-end to establish a working baseline, then extended it with two prescribed variations that changed the inputs, constraints and acceptance criteria. Mentors circulated during the lab, answering questions with hints rather than solutions, so that the debugging path — reading error messages, forming a hypothesis, testing it and reading the result — became second nature before any graded work was attempted.`,
        `Assessment for ${t} combined a graded exercise set with a short written reflection. The exercises mixed recall questions with applied tasks that could not be solved by copying the demonstration verbatim; the reflection asked the student to describe the two hardest obstacles faced, how they were diagnosed and what would be done differently next time. Weak areas identified here triggered a remediation task in the following week, and the revised solution was re-submitted until it met the checklist — a loop that measurably raised the quality of work delivered in the capstone phase.`,
      ],
      diagram: i === 0
        ? { type: 'flow', title: `${t} — Learning Workflow`, steps: [
            { title: 'Concept Session', sub: 'Theory and demonstrations' },
            { title: 'Guided Practice', sub: 'Supervised exercises' },
            { title: 'Independent Task', sub: 'Apply without scaffolding' },
            { title: 'Review & Feedback', sub: 'Peer and mentor critique' },
          ] }
        : null,
    })),
    weeklyLog: weekLog,
    project: {
      title: `${label} Applied Project`,
      description: `The capstone project required students to apply the full range of skills covered during the ${days}-day program to a single, well-defined problem. Teams or individuals planned the work, broke it into milestones, implemented iteratively and presented the final result with documentation of design decisions, trade-offs and testing performed. Each project passed through three checkpoints — proposal and scope agreement, mid-point demonstration with mentor feedback, and final submission with a written report and a recorded walkthrough. Grading weighed correctness against the agreed acceptance criteria, code and document quality, the honesty of the effort log, and the student's ability to defend decisions during the question-and-answer session of the final review.`,
      flow: [
        { title: 'Problem Statement', sub: 'Scope and constraints agreed with mentor' },
        { title: 'Planning', sub: 'Milestones, estimates and responsibilities' },
        { title: 'Implementation', sub: 'Iterative build with weekly check-ins' },
        { title: 'Testing', sub: 'Functional checks and peer review' },
        { title: 'Presentation', sub: 'Demo, documentation and Q&A' },
      ],
    },
    charts: {
      timeAllocation: [
        { label: 'Theory', value: 25 },
        { label: 'Practice', value: 40 },
        { label: 'Project', value: 25 },
        { label: 'Review', value: 10 },
      ],
      skills: base.slice(0, 6).map((t, i) => ({ label: t, value: 78 + ((i * 7) % 18) })),
      milestones: {
        labels: Array.from({ length: weeks }, (_, i) => `W${i + 1}`),
        values: Array.from({ length: weeks }, (_, i) => Math.min(95, Math.round(((i + 1) / weeks) * 100))),
      },
      engagement: [
        { label: 'Lab exercises', value: 40 },
        { label: 'Project work', value: 30 },
        { label: 'Lectures & readings', value: 20 },
        { label: 'Assessments', value: 10 },
      ],
    },
    tools: base.concat([
      'Version control (Git)',
      'Documentation tools',
      'Note-taking and weekly log templates',
      'Estimation and planning worksheets',
      'Reference solution walkthroughs',
      'Peer review checklist',
      'Official documentation and API references',
      'Issue tracker for the project backlog',
    ]),
    challenges: [
      'Time management: balancing the daily module load with self-study required explicit weekly planning and use of the provided schedule templates. Work was split into fixed daily blocks with a hard stop for review, and the backlog was re-estimated every Friday so that slippage in one area was visible before it affected the next week.',
      'Translating theory into practice: initial exercises were solved by imitation; structured re-practice without reference notes built genuine understanding. Each concept was re-implemented from a blank file after a 24-hour gap, and the differences against the reference were reviewed with the mentor until the gap was closed.',
      'Project integration: combining modules into one coherent deliverable surfaced interface issues that were resolved through refactoring and mentor reviews. A written integration plan listed the data and control flow between components, and each merge was accompanied by a regression pass over the earlier milestones.',
      'Diagnostic discipline: early debugging relied on random changes until something worked, which introduced regressions. Adopting a strict hypothesis-first method — reproduce, isolate, hypothesise, test one change, record the result — replaced guesswork and cut the average time to a fix substantially.',
      'Documentation habits: notes taken during sessions were unusable a week later because they recorded actions without reasons. Rewriting notes around decisions, alternatives rejected and the evidence for the chosen option made them a reliable revision resource before the final examination.',
      'Working under review: presenting work to peers exposed unstated assumptions and vague requirements. Preparing a two-minute demo script, an explicit list of known limitations and answers to anticipated questions turned each review into actionable feedback instead of a defensive discussion.',
    ],
    conclusion: [
      `Across ${days} days the program delivered consistent progress from foundational concepts to an integrated project submission. Assessment scores, attendance and module completion confirm that the objectives stated at the outset were met. The habits developed — documentation, iterative work and self-review — provide a base for independent continued learning beyond the internship.`,
      `The capstone review panel noted that the strongest gains were in planning and self-verification: work arrived with test evidence and honest effort logs rather than last-minute submissions, and the written reflections showed accurate awareness of remaining gaps. Recommended next steps are an advanced elective in the track's specialist tooling, regular contribution to a small open-source or team repository to keep the review habits alive, and a monthly skills audit against the objective list of this report.`,
    ],
    references: [
      'Official documentation and guides for the technologies covered in the program.',
      'Course handouts, slide decks and exercise sheets provided through the learning portal.',
      'Recommended textbooks and peer-reviewed articles listed at the end of each module.',
      'Project repository history, weekly logs and mentor review notes.',
      'Reference solutions and annotated walkthroughs released after each graded exercise.',
      'Style guides and quality checklists enforced during peer review sessions.',
      'Recordings of the concept sessions and the final project demonstration.',
      'Knowledge-base articles written by the cohort on recurring errors and their fixes.',
    ],
  };
}

function getReportContent(category, internship) {
  try {
    const file = require(`./${category}`);
    if (file && file.overview && Array.isArray(file.chapters)) return file;
  } catch (e) { /* no dedicated content for this track — use generic */ }
  return buildGenericContent(internship);
}

module.exports = { getReportContent };
