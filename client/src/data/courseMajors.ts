// Major/subject options per degree for the registration form. When a student
// picks a course, the "Major / Subject" dropdown lists the subjects that belong
// to that degree (B.A → arts subjects, B.Tech → branches, ...). Degrees with no
// meaningful majors (BCA, MCA, Other) are omitted — for those the field simply
// doesn't appear and isn't required.

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

// Empty array → no major dropdown for this course (BCA, MCA, Other...).
export const majorsForCourse = (course: string): string[] => courseMajors[course] || [];
