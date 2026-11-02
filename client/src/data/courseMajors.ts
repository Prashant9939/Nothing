// Major/subject options per degree for the registration form. The dropdown is
// always visible on the Academic step but disabled until a course is picked;
// with a course that has no dedicated list (BCA/MCA/Other) it shows every
// subject grouped by degree, and with a known list it narrows to that degree's
// subjects (B.A → arts subjects, B.Tech → branches, ...).

const artsSubjects = [
  'Hindi', 'English', 'Sanskrit', 'Maithili', 'Urdu',
  'History', 'Political Science', 'Geography', 'Economics',
  'Sociology', 'Psychology', 'Philosophy', 'Mathematics',
  'Home Science', 'Music', 'Fine Arts', 'Physical Education',
];

const scienceSubjects = [
  'Physics', 'Chemistry', 'Mathematics', 'Biology',
  'Zoology', 'Botany', 'Computer Science', 'Electronics',
  'Statistics', 'Environmental Science', 'Biochemistry',
];

const commerceSubjects = ['Accountancy', 'Business Economics', 'Banking & Insurance'];

const engineeringBranches = [
  'Computer Science & Engineering', 'Information Technology',
  'Electronics & Communication Engineering', 'Electrical Engineering',
  'Mechanical Engineering', 'Civil Engineering',
  'Artificial Intelligence & Machine Learning', 'Data Science',
];

const managementSubjects = [
  'Finance', 'Marketing', 'Human Resource Management',
  'Information Technology', 'Operations Management',
  'International Business', 'Banking & Financial Services',
];

export const courseMajors: Record<string, string[]> = {
  ba: artsSubjects,
  ma: artsSubjects,
  bsc: scienceSubjects,
  msc: scienceSubjects,
  bcom: commerceSubjects,
  mcom: commerceSubjects,
  btech: engineeringBranches,
  be: engineeringBranches,
  mtech: engineeringBranches,
  mba: managementSubjects,
};

// Empty array → no dedicated list for this course (BCA, MCA, Other...).
export const majorsForCourse = (course: string): string[] => courseMajors[course] || [];

// Full list for courses without a dedicated list (BCA/MCA/Other), grouped by
// degree so a long list stays navigable. Before a course is picked the dropdown
// is disabled, so this list only ever renders for a chosen course.
export const subjectGroups = [
  { label: 'B.A / M.A — Arts', subjects: artsSubjects },
  { label: 'B.Sc / M.Sc — Science', subjects: scienceSubjects },
  { label: 'B.Com / M.Com — Commerce', subjects: commerceSubjects },
  { label: 'B.Tech / B.E / M.Tech — Engineering', subjects: engineeringBranches },
  { label: 'MBA — Management', subjects: managementSubjects },
];
