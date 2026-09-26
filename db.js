const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    college TEXT NOT NULL,
    course TEXT NOT NULL,
    year TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'student' CHECK(role IN ('student', 'admin')),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS internships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 28,
    price REAL NOT NULL,
    originalPrice REAL,
    modules INTEGER NOT NULL DEFAULT 10,
    topics TEXT NOT NULL,
    isActive INTEGER DEFAULT 1,
    examDate TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    internshipId INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'completed', 'expired')),
    enrolledAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiresAt DATETIME,
    progress INTEGER DEFAULT 0,
    completedModules TEXT DEFAULT '[]',
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (internshipId) REFERENCES internships(id) ON DELETE CASCADE,
    UNIQUE(userId, internshipId)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    enrollmentId INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT DEFAULT 'razorpay',
    transactionId TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
    receiptNumber TEXT UNIQUE,
    paidAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollmentId) REFERENCES enrollments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    internshipId INTEGER NOT NULL,
    enrollmentId INTEGER NOT NULL,
    totalQuestions INTEGER DEFAULT 50,
    passingMarks INTEGER DEFAULT 40,
    duration INTEGER DEFAULT 60,
    scheduledAt DATETIME,
    startedAt DATETIME,
    completedAt DATETIME,
    score INTEGER,
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'failed')),
    answers TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (internshipId) REFERENCES internships(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollmentId) REFERENCES enrollments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    enrollmentId INTEGER NOT NULL,
    examId INTEGER,
    certificateId TEXT UNIQUE NOT NULL,
    grade TEXT,
    score INTEGER,
    issuedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollmentId) REFERENCES enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (examId) REFERENCES exams(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expiresAt DATETIME NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track TEXT NOT NULL,
    question TEXT NOT NULL,
    optionA TEXT NOT NULL,
    optionB TEXT NOT NULL,
    optionC TEXT NOT NULL,
    optionD TEXT NOT NULL,
    correct INTEGER NOT NULL CHECK(correct IN (0, 1, 2, 3)),
    isActive INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS learning_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    internshipId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    moduleOrder INTEGER NOT NULL,
    durationMinutes INTEGER DEFAULT 30,
    difficulty TEXT DEFAULT 'beginner' CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
    topics TEXT NOT NULL,
    learningObjectives TEXT NOT NULL,
    contentSections TEXT NOT NULL,
    quizQuestions TEXT NOT NULL,
    resources TEXT NOT NULL,
    videoUrl TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (internshipId) REFERENCES internships(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS universities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    shortName TEXT DEFAULT '',
    location TEXT DEFAULT '',
    type TEXT DEFAULT 'state' CHECK(type IN ('central', 'state', 'private', 'deemed')),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS colleges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    universityId INTEGER NOT NULL,
    name TEXT NOT NULL,
    district TEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (universityId) REFERENCES universities(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitorId TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('visit', 'pageview', 'click')),
    path TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS announcement_reads (
    announcementId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    readAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (announcementId, userId),
    FOREIGN KEY (announcementId) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT DEFAULT '',
    subject TEXT DEFAULT '',
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'read')),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_internships_category ON internships(category);
  CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(userId);
  CREATE INDEX IF NOT EXISTS idx_enrollments_internship ON enrollments(internshipId);
  CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(userId);
  CREATE INDEX IF NOT EXISTS idx_payments_enrollment ON payments(enrollmentId);
  CREATE INDEX IF NOT EXISTS idx_exams_user ON exams(userId);
  CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(userId);
  CREATE INDEX IF NOT EXISTS idx_certificates_id ON certificates(certificateId);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_questions_track ON questions(track);
  CREATE INDEX IF NOT EXISTS idx_learning_modules_internship ON learning_modules(internshipId);
  CREATE INDEX IF NOT EXISTS idx_colleges_university ON colleges(universityId);
  CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(userId);
  CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(createdAt);
  CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON analytics_events(visitorId);
  CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
`);

// Analytics events older than 90 days are dropped on startup to keep the table small
db.exec("DELETE FROM analytics_events WHERE createdAt < datetime('now', '-90 days')");

// Migration: add columns if missing
const migrations = [
  'ALTER TABLE users ADD COLUMN university TEXT DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN gender TEXT DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN dob TEXT DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN rollNo TEXT DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN regNo TEXT DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN guardianName TEXT DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN guardianPhone TEXT DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN guardianRelation TEXT DEFAULT \'\'',
  'ALTER TABLE enrollments ADD COLUMN offerNo TEXT',
  'ALTER TABLE enrollments ADD COLUMN reportNo TEXT',
  'ALTER TABLE enrollments ADD COLUMN attendanceNo TEXT',
  'ALTER TABLE enrollments ADD COLUMN attendanceDateMode TEXT DEFAULT \'forward\'',
  'ALTER TABLE users ADD COLUMN createdByAdmin INTEGER DEFAULT 0',
  'ALTER TABLE payments ADD COLUMN razorpayOrderId TEXT',
  'ALTER TABLE payments ADD COLUMN razorpayPaymentId TEXT',
];
migrations.forEach(sql => {
  try { db.exec(sql); } catch (_) { /* column already exists */ }
});

// Admin settings (attendance dating, document branding, verification link)
db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
const { DEFAULTS: SETTINGS_DEFAULTS } = require('./lib/settings');
Object.entries(SETTINGS_DEFAULTS).forEach(([key, value]) => {
  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(key, value);
});


// Assign unique, non-sequential document numbers to existing records
const { DOC_COLUMNS, makeNumber, newReceiptNumber } = require('./lib/docNumbers');
Object.entries(DOC_COLUMNS).forEach(([column, prefix]) => {
  const missing = db.prepare(`SELECT id FROM enrollments WHERE ${column} IS NULL OR ${column} = ''`).all();
  missing.forEach(({ id }) => {
    const no = makeNumber(db, prefix, column, 'enrollments');
    db.prepare(`UPDATE enrollments SET ${column} = ? WHERE id = ?`).run(no, id);
  });
});
// Normalize legacy receipt numbers (timestamp-based) to the standard format
db.prepare("SELECT id FROM payments WHERE receiptNumber IS NULL OR receiptNumber NOT LIKE 'IQI-REC-____-______'")
  .all()
  .forEach(({ id }) => {
    db.prepare('UPDATE payments SET receiptNumber = ? WHERE id = ?').run(newReceiptNumber(db), id);
  });

// Seed admin user if not exists
const adminEmail = process.env.ADMIN_EMAIL || 'admin@iqintern.in';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) {
  console.warn('WARNING: ADMIN_PASSWORD is not set — the seeded admin account uses an insecure default. Set ADMIN_PASSWORD in .env and change the password after first login.');
}
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!adminExists) {
  const salt = bcrypt.genSaltSync(12);
  const hashedPassword = bcrypt.hashSync(adminPassword, salt);
  db.prepare(`
    INSERT INTO users (firstName, lastName, email, phone, college, course, year, password, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('Admin', 'IQIntern', adminEmail, '9999999999', 'IQIntern', 'admin', 'admin', hashedPassword, 'admin');
  console.log(`Admin user created: ${adminEmail}`);
}

// Seed internships if empty
const internshipCount = db.prepare('SELECT COUNT(*) as count FROM internships').get();
if (internshipCount.count === 0) {
  const internships = [
    { title: 'Web Development Pathway', description: 'Master HTML, CSS, JavaScript, React, Node.js, and build full-stack applications with database integration.', category: 'web', duration: 28, price: 2999, originalPrice: 5999, modules: 10, topics: 'HTML5,CSS3,JavaScript,React,Node.js,MongoDB' },
    { title: 'Python Software Engineering', description: 'Learn Python programming, OOP, data structures, file handling, and build backend APIs with Flask/Django.', category: 'python', duration: 28, price: 2999, originalPrice: 5999, modules: 8, topics: 'Python Basics,OOP,Data Structures,Flask,Django,APIs' },
    { title: 'Data Science & Analytics', description: 'Master data analysis, visualization, statistics, SQL, Python for data, and build predictive models.', category: 'data', duration: 35, price: 3499, originalPrice: 6999, modules: 12, topics: 'Python,Pandas,NumPy,SQL,Tableau,Statistics' },
    { title: 'AI & Machine Learning', description: 'Dive into machine learning algorithms, neural networks, NLP, computer vision, and deploy AI models.', category: 'ai', duration: 42, price: 4999, originalPrice: 9999, modules: 14, topics: 'ML Algorithms,Deep Learning,TensorFlow,NLP,Computer Vision,PyTorch' },
    { title: 'Cybersecurity Fundamentals', description: 'Learn network security, ethical hacking, penetration testing, cryptography, and security auditing.', category: 'cyber', duration: 30, price: 3999, originalPrice: 7999, modules: 11, topics: 'Network Security,Ethical Hacking,Cryptography,Pen Testing,Linux,Wireshark' },
    { title: 'Mobile App Development', description: 'Build cross-platform mobile apps using React Native, Flutter, and deploy to App Store & Play Store.', category: 'web', duration: 28, price: 3499, originalPrice: 6999, modules: 9, topics: 'React Native,Flutter,Dart,Firebase,UI/UX,App Store' },
  ];

  const insert = db.prepare('INSERT INTO internships (title, description, category, duration, price, originalPrice, modules, topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const i of internships) {
    insert.run(i.title, i.description, i.category, i.duration, i.price, i.originalPrice, i.modules, i.topics);
  }
  console.log('Seed internships created');
}

// Additional internships — inserted if missing (existing databases keep their data)
const extraInternships = [
  { title: 'Skill Development Program', description: 'Build communication, teamwork, time management, problem solving and leadership skills that every employer expects.', category: 'skill', duration: 28, price: 2499, originalPrice: 4999, modules: 8, topics: 'Communication,Time Management,Teamwork,Problem Solving,Leadership,Career Readiness' },
  { title: 'Teacher Training & Pedagogy', description: 'Learn lesson planning, classroom management, assessment design, educational psychology and modern instructional methods.', category: 'teaching', duration: 35, price: 3499, originalPrice: 6999, modules: 10, topics: 'Lesson Planning,Pedagogy,Classroom Management,Assessment,Educational Technology,Child Psychology' },
  { title: 'Human Resource Management', description: 'Master recruitment, onboarding, payroll basics, performance management, labor laws and employee engagement practices.', category: 'hr', duration: 30, price: 3499, originalPrice: 6999, modules: 9, topics: 'Recruitment,Onboarding,Payroll,Performance Management,Labor Laws,Employee Engagement' },
  { title: 'Entrepreneurship & Startup Growth', description: 'Validate ideas, build business plans, explore funding options, understand legal structures and scale a venture.', category: 'entrepreneurship', duration: 35, price: 3999, originalPrice: 7999, modules: 9, topics: 'Business Plan,Market Research,Funding,Legal Structures,Branding,Scaling' },
  { title: 'Tourism & Hospitality Management', description: 'Explore travel planning, hotel operations, front office and housekeeping, tourism marketing and customer service excellence.', category: 'tourism', duration: 28, price: 2999, originalPrice: 5999, modules: 8, topics: 'Travel Planning,Hospitality Operations,Tourism Marketing,Customer Service,Cultural Heritage,Hotel Management' },
];
const insertExtraInternship = db.prepare('INSERT INTO internships (title, description, category, duration, price, originalPrice, modules, topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
for (const i of extraInternships) {
  const exists = db.prepare('SELECT id FROM internships WHERE title = ?').get(i.title);
  if (!exists) {
    insertExtraInternship.run(i.title, i.description, i.category, i.duration, i.price, i.originalPrice, i.modules, i.topics);
    console.log(`Seeded internship: ${i.title}`);
  }
}

// Seed universities & colleges if empty
const universityCount = db.prepare('SELECT COUNT(*) as count FROM universities').get().count;
if (universityCount === 0) {
  const institutions = require('./data/institutions');
  const insertUniversity = db.prepare('INSERT INTO universities (name, shortName, location, type) VALUES (?, ?, ?, ?)');
  const insertCollege = db.prepare('INSERT INTO colleges (universityId, name, district) VALUES (?, ?, ?)');

  const seedInstitutions = db.transaction(() => {
    for (const u of institutions) {
      const existing = db.prepare('SELECT id FROM universities WHERE LOWER(name) = LOWER(?)').get(u.name);
      const universityId = existing
        ? existing.id
        : insertUniversity.run(u.name, u.shortName || '', u.location || '', u.type || 'state').lastInsertRowid;

      for (const c of u.colleges || []) {
        const dup = db.prepare('SELECT id FROM colleges WHERE universityId = ? AND LOWER(name) = LOWER(?)')
          .get(universityId, c.name);
        if (!dup) insertCollege.run(universityId, c.name, c.district || '');
      }
    }
  });
  seedInstitutions();

  const seeded = db.prepare('SELECT COUNT(*) as count FROM universities').get().count;
  const seededColleges = db.prepare('SELECT COUNT(*) as count FROM colleges').get().count;
  console.log(`Seed institutions created: ${seeded} universities, ${seededColleges} colleges`);
}

// Seed questions
const { seedQuestions } = require('./data/seedQuestions');
seedQuestions(db);

// Seed learning modules
const learningModuleCount = db.prepare('SELECT COUNT(*) as count FROM learning_modules').get();
if (learningModuleCount.count === 0) {
  // Look up each internship by title
  const webDev = db.prepare("SELECT id FROM internships WHERE title = 'Web Development Pathway'").get();
  const python = db.prepare("SELECT id FROM internships WHERE title = 'Python Software Engineering'").get();
  const dataSci = db.prepare("SELECT id FROM internships WHERE title = 'Data Science & Analytics'").get();
  const aiMl = db.prepare("SELECT id FROM internships WHERE title = 'AI & Machine Learning'").get();
  const cyber = db.prepare("SELECT id FROM internships WHERE title = 'Cybersecurity Fundamentals'").get();
  const mobile = db.prepare("SELECT id FROM internships WHERE title = 'Mobile App Development'").get();

  const learningModules = [];

  // ========== WEB DEVELOPMENT TRACK (6 modules) ==========
  if (webDev) {
    learningModules.push(
      {
        internshipId: webDev.id, title: 'HTML5 Fundamentals', description: 'Master the building blocks of web pages with semantic HTML5 elements and modern markup techniques.', moduleOrder: 1, durationMinutes: 45, difficulty: 'beginner',
        topics: 'HTML5,Document Structure,Semantic Elements,Forms,Tables',
        learningObjectives: JSON.stringify(['Understand HTML5 document structure and doctype declarations', 'Use semantic elements like header, nav, main, article, section, footer', 'Build accessible forms with validation attributes', 'Create data tables with proper markup']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'What is HTML5?', content: 'HTML5 is the fifth and latest major version of HTML, the standard markup language for creating web pages. It introduces a richer set of tags, native multimedia support, and powerful APIs that make it easier to build modern, interactive websites. Unlike its predecessors, HTML5 was designed with mobile devices and multimedia in mind, eliminating the need for third-party plugins like Flash.\n\nAt its core, HTML (HyperText Markup Language) provides the structure of a web page. Tags like <h1>, <p>, and <div> define elements such as headings, paragraphs, and containers. HTML5 expands this vocabulary with semantic tags that describe the purpose of content, not just its appearance. For example, <nav> indicates a navigation section, <article> wraps self-contained content, and <aside> represents tangentially related content.' },
          { id: 's2', type: 'code', title: 'Basic Document Structure', content: 'Every HTML5 document follows a standard skeleton. The doctype declaration tells the browser to use HTML5 mode. The <html> element is the root wrapper. The <head> section contains metadata like the character set, viewport settings for responsive design, and the page title. The <body> section holds all visible content.', codeExample: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My First Web Page</title>\n</head>\n<body>\n  <header>\n    <nav>\n      <a href="/">Home</a>\n      <a href="/about">About</a>\n    </nav>\n  </header>\n  <main>\n    <h1>Welcome to My Website</h1>\n    <p>This is my first web page built with HTML5.</p>\n  </main>\n  <footer>\n    <p>&copy; 2026 My Website</p>\n  </footer>\n</body>\n</html>', language: 'html' },
          { id: 's3', type: 'text', title: 'Semantic Elements in Detail', content: 'Semantic HTML means using elements that clearly describe their meaning to both the browser and the developer. Before HTML5, developers relied heavily on generic <div> elements with class names like "header", "nav", and "footer". HTML5 introduced dedicated semantic elements that make code more readable, improve accessibility for screen readers, and boost SEO rankings.\n\nThe key semantic elements include: <header> for introductory content or navigational aids, <nav> for major navigation blocks, <main> for the dominant content of the page, <article> for self-contained content like blog posts or news articles, <section> for thematic groupings of content, <aside> for content tangentially related to the content around it, <footer> for footer information, and <figure>/<figcaption> for images with captions.' },
          { id: 's4', type: 'text', title: 'Forms and Input Validation', content: 'HTML5 revolutionized form handling by introducing new input types and built-in validation attributes. New input types like email, url, number, date, range, and color provide specialized keyboards on mobile devices and automatic format validation. Attributes like required, pattern, min, max, minlength, and maxlength enable client-side validation without JavaScript.\n\nThe <form> element wraps input fields and defines how data is submitted. Each <input> element has a type attribute that determines its behavior. The <label> element associates text with an input, improving accessibility. The <fieldset> and <legend> elements group related form controls.' },
          { id: 's5', type: 'code', title: 'Building a Contact Form', content: 'Here is a complete contact form using HTML5 features including input types, validation attributes, and proper accessibility markup:', codeExample: '<form action="/submit" method="POST">\n  <fieldset>\n    <legend>Contact Information</legend>\n    \n    <label for="name">Full Name *</label>\n    <input type="text" id="name" name="name" required minlength="2">\n    \n    <label for="email">Email Address *</label>\n    <input type="email" id="email" name="email" required>\n    \n    <label for="phone">Phone Number</label>\n    <input type="tel" id="phone" name="phone" pattern="[0-9]{10}">\n    \n    <label for="message">Message *</label>\n    <textarea id="message" name="message" required minlength="10" rows="5"></textarea>\n    \n    <button type="submit">Send Message</button>\n  </fieldset>\n</form>', language: 'html' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'], correctIndex: 0, explanation: 'HTML stands for Hyper Text Markup Language. It is the standard markup language for creating web pages.' },
          { id: 'q2', question: 'Which tag is used for the largest heading?', options: ['<heading>', '<h6>', '<h1>', '<head>'], correctIndex: 2, explanation: 'The <h1> tag defines the largest and most important heading. HTML supports h1 through h6, with h1 being the highest level.' },
          { id: 'q3', question: 'What is the purpose of the <nav> element?', options: ['To create a navigation section', 'To create a paragraph', 'To create a table', 'To create a form'], correctIndex: 0, explanation: 'The <nav> element represents a section of navigation links. It is a semantic element introduced in HTML5.' },
          { id: 'q4', question: 'Which input type provides automatic email validation?', options: ['type="text"', 'type="email"', 'type="url"', 'type="validate"'], correctIndex: 1, explanation: 'The email input type automatically validates that the entered text follows the email format (user@domain.com).' }
        ]),
        resources: JSON.stringify([
          { title: 'MDN HTML Reference', type: 'link', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML' },
          { title: 'HTML5 Doctor - Element Flowchart', type: 'link', url: 'http://html5doctor.com/lets-talk-about-semantics/' },
          { title: 'W3C HTML Validator', type: 'link', url: 'https://validator.w3.org/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=UB1O30fR-EE'
      },
      {
        internshipId: webDev.id, title: 'CSS3 & Styling', description: 'Learn modern CSS3 techniques including Flexbox, Grid, animations, responsive design, and the box model.', moduleOrder: 2, durationMinutes: 60, difficulty: 'beginner',
        topics: 'Box Model,Flexbox,Grid,Responsive Design,Animations,Variables',
        learningObjectives: JSON.stringify(['Understand the CSS box model including margin, border, padding, and content', 'Build layouts using CSS Flexbox for one-dimensional alignment', 'Create complex layouts with CSS Grid for two-dimensional designs', 'Implement responsive designs using media queries and relative units', 'Add smooth transitions and keyframe animations']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'The CSS Box Model', content: 'Every element in CSS is a rectangular box. The box model describes how these boxes are sized and spaced. At the center is the content area, which holds text, images, or other media. Surrounding the content is padding, which adds internal spacing. The border wraps around the padding, and margin provides external spacing between elements.\n\nUnderstanding the box model is crucial because it affects how elements fit together on a page. The box-sizing property controls how width and height are calculated. By default (content-box), width and height apply only to the content area. With border-box, width and height include padding and border, making layouts more predictable.' },
          { id: 's2', type: 'code', title: 'CSS Flexbox Layout', content: 'Flexbox is a one-dimensional layout system that aligns items along a single axis (horizontal or vertical). It is perfect for navigation bars, card rows, and centering content. The parent element becomes a flex container by setting display: flex. Children become flex items that can be aligned, distributed, and reordered using flex properties.', codeExample: '.container {\n  display: flex;\n  justify-content: space-between; /* Distribute items evenly */\n  align-items: center;            /* Center items vertically */\n  gap: 1rem;                      /* Space between items */\n  flex-wrap: wrap;                /* Allow items to wrap */\n}\n\n.item {\n  flex: 1;          /* Grow to fill available space */\n  min-width: 200px; /* Minimum width before wrapping */\n  padding: 1rem;\n  border-radius: 0.5rem;\n}', language: 'css' },
          { id: 's3', type: 'code', title: 'CSS Grid Layout', content: 'CSS Grid is a two-dimensional layout system that handles both rows and columns simultaneously. It is ideal for page layouts, image galleries, and dashboards. Define a grid container and specify column/row tracks using grid-template-columns and grid-template-rows.', codeExample: '.grid-layout {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  grid-template-rows: auto 1fr auto;\n  gap: 1.5rem;\n  min-height: 100vh;\n}\n\n/* Responsive grid without media queries */\n.auto-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 1rem;\n}', language: 'css' },
          { id: 's4', type: 'text', title: 'Responsive Design', content: 'Responsive design ensures your website looks great on all devices, from mobile phones to large desktop monitors. The key principles include: using relative units (rem, em, %, vw, vh) instead of fixed pixels, setting the viewport meta tag, and using media queries to apply different styles at different screen widths.\n\nMobile-first design is the recommended approach: start with styles for small screens and add media queries for larger screens using min-width. This results in cleaner, more maintainable CSS. Breakpoints are typically set at common device widths: 480px (mobile), 768px (tablet), 1024px (laptop), and 1280px (desktop).' },
          { id: 's5', type: 'code', title: 'Animations and Transitions', content: 'CSS transitions provide smooth animations between two states when a property changes (e.g., on hover). CSS keyframe animations allow more complex, multi-step animations that can run automatically.', codeExample: '/* Transition - smooth change on hover */\n.button {\n  background: #3b82f6;\n  color: white;\n  padding: 0.75rem 1.5rem;\n  border: none;\n  border-radius: 0.5rem;\n  transition: all 0.3s ease;\n}\n.button:hover {\n  background: #1d4ed8;\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);\n}\n\n/* Keyframe Animation */\n@keyframes fadeInUp {\n  from { opacity: 0; transform: translateY(20px); }\n  to   { opacity: 1; transform: translateY(0); }\n}\n.card {\n  animation: fadeInUp 0.5s ease-out;\n}', language: 'css' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'Which CSS property creates a flex container?', options: ['display: block', 'display: flex', 'display: grid', 'display: inline'], correctIndex: 1, explanation: 'display: flex creates a flex container, making its direct children flex items that can be aligned and distributed using flexbox properties.' },
          { id: 'q2', question: 'What unit is relative to the root font size?', options: ['em', 'rem', 'px', '%'], correctIndex: 1, explanation: 'rem (root em) is relative to the font size of the root <html> element, making it predictable and ideal for consistent spacing.' },
          { id: 'q3', question: 'Which property controls how width is calculated in the box model?', options: ['box-sizing', 'display', 'position', 'overflow'], correctIndex: 0, explanation: 'The box-sizing property determines whether padding and border are included in the element total width and height. border-box is commonly used.' },
          { id: 'q4', question: 'What is the mobile-first approach in responsive design?', options: ['Design for large screens first, then adapt down', 'Design for small screens first, then scale up with min-width', 'Use only media queries for desktop', 'Avoid using breakpoints'], correctIndex: 1, explanation: 'Mobile-first design starts with base styles for small screens and uses min-width media queries to add styles for larger screens.' }
        ]),
        resources: JSON.stringify([
          { title: 'CSS-Tricks Flexbox Guide', type: 'link', url: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/' },
          { title: 'CSS-Tricks Grid Guide', type: 'link', url: 'https://css-tricks.com/snippets/css/complete-guide-grid/' },
          { title: 'Can I Use - Browser Support', type: 'link', url: 'https://caniuse.com/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=fYq5PXgSsbE'
      },
      {
        internshipId: webDev.id, title: 'JavaScript Essentials', description: 'Master JavaScript fundamentals including variables, functions, DOM manipulation, events, and ES6+ features.', moduleOrder: 3, durationMinutes: 90, difficulty: 'intermediate',
        topics: 'Variables,Data Types,Functions,DOM Manipulation,Events,ES6+',
        learningObjectives: JSON.stringify(['Declare variables using let, const, and understand scope', 'Write functions using declarations, expressions, and arrow syntax', 'Select and manipulate DOM elements with querySelector and event listeners', 'Use ES6+ features: destructuring, template literals, spread operator, modules']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Variables and Data Types', content: 'JavaScript has three ways to declare variables: var (function-scoped, avoid using), let (block-scoped, reassignable), and const (block-scoped, not reassignable). Modern JavaScript favors const by default, switching to let only when reassignment is needed.\n\nJavaScript has seven primitive data types: string (text), number (integers and decimals), boolean (true/false), null (intentional absence of value), undefined (uninitialized), symbol (unique identifiers), and bigint (arbitrary-precision integers). The object type holds collections of key-value pairs and arrays. Understanding these types is essential because JavaScript is dynamically typed, meaning variables can hold any type without explicit type declarations.' },
          { id: 's2', type: 'code', title: 'Functions', content: 'Functions are reusable blocks of code that perform specific tasks. There are three main ways to define functions in modern JavaScript. Function declarations are hoisted (available before their definition), function expressions are not hoisted, and arrow functions provide a shorter syntax and lexically bind "this".', codeExample: '// Function Declaration\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\n// Function Expression\nconst add = function(a, b) {\n  return a + b;\n};\n\n// Arrow Function (ES6+)\nconst multiply = (a, b) => a * b;\n\n// Default Parameters\nconst greetUser = (name = "Guest") => {\n  console.log(`Welcome, ${name}!`);\n};\n\ngreetUser();       // "Welcome, Guest!"\ngreetUser("Ali");  // "Welcome, Ali!"', language: 'javascript' },
          { id: 's3', type: 'text', title: 'DOM Manipulation', content: 'The Document Object Model (DOM) is a tree-structured representation of an HTML document. JavaScript can interact with the DOM to dynamically change content, styles, and structure without reloading the page. The document object is the entry point for all DOM operations.\n\nTo select elements, use document.querySelector (returns first match) or document.querySelectorAll (returns all matches). To modify content, use textContent (plain text), innerHTML (HTML markup), or innerText (visible text). To change styles, access the element.style property. To add or remove classes, use classList.add(), classList.remove(), or classList.toggle().' },
          { id: 's4', type: 'code', title: 'Event Handling', content: 'Events are actions that happen in the browser, such as clicks, key presses, form submissions, or page loads. You can listen for events using addEventListener, which accepts an event type and a callback function. Events follow a capture-target-bubble flow.', codeExample: '// Click Event\nconst button = document.querySelector("#myButton");\nbutton.addEventListener("click", (event) => {\n  event.preventDefault();\n  console.log("Button clicked!");\n  event.target.textContent = "Clicked!";\n});\n\n// Form Submission\nconst form = document.querySelector("form");\nform.addEventListener("submit", (e) => {\n  e.preventDefault();\n  const formData = new FormData(form);\n  const data = Object.fromEntries(formData);\n  console.log(data);\n});\n\n// Keyboard Events\ndocument.addEventListener("keydown", (e) => {\n  if (e.key === "Escape") closeModal();\n});', language: 'javascript' },
          { id: 's5', type: 'code', title: 'ES6+ Features', content: 'ES6 (ECMAScript 2015) and later versions introduced powerful features that make JavaScript more expressive and easier to write. Destructuring extracts values from arrays/objects into variables. Template literals enable embedded expressions. The spread operator expands arrays/objects. Async/await simplifies asynchronous code.', codeExample: '// Destructuring\nconst { name, age, email } = user;\nconst [first, second, ...rest] = [1, 2, 3, 4, 5];\n\n// Template Literals\nconst message = `Hello, ${name}! You are ${age} years old.`;\n\n// Spread Operator\nconst newArray = [...oldArray, newItem];\nconst newObject = { ...oldObject, newKey: value };\n\n// Async/Await\nasync function fetchUser(id) {\n  try {\n    const response = await fetch(`/api/users/${id}`);\n    const user = await response.json();\n    return user;\n  } catch (error) {\n    console.error("Failed to fetch user:", error);\n  }\n}', language: 'javascript' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'Which keyword declares a block-scoped, reassignable variable?', options: ['var', 'let', 'const', 'define'], correctIndex: 1, explanation: 'let declares a block-scoped variable that can be reassigned. const is also block-scoped but cannot be reassigned.' },
          { id: 'q2', question: 'What does DOM stand for?', options: ['Data Object Model', 'Document Object Model', 'Digital Output Mode', 'Document Oriented Mapping'], correctIndex: 1, explanation: 'DOM stands for Document Object Model. It is a programming interface that represents the structure of a web page as a tree of objects.' },
          { id: 'q3', question: 'Which method selects the first element matching a CSS selector?', options: ['document.getElementById()', 'document.querySelector()', 'document.getElementsByClassName()', 'document.findElement()'], correctIndex: 1, explanation: 'document.querySelector() returns the first element that matches the specified CSS selector.' },
          { id: 'q4', question: 'What is the output of: typeof null?', options: ['"null"', '"undefined"', '"object"', '"boolean"'], correctIndex: 2, explanation: 'typeof null returns "object", which is a well-known bug in JavaScript that has existed since the language was created.' }
        ]),
        resources: JSON.stringify([
          { title: 'JavaScript MDN Guide', type: 'link', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide' },
          { title: 'Eloquent JavaScript (Free Book)', type: 'link', url: 'https://eloquentjavascript.net/' },
          { title: 'JavaScript.info - Modern Tutorial', type: 'link', url: 'https://javascript.info/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=W6NZfCO5SIk'
      },
      {
        internshipId: webDev.id, title: 'React Fundamentals', description: 'Learn React component architecture, JSX syntax, props, state management with hooks, and component lifecycle.', moduleOrder: 4, durationMinutes: 90, difficulty: 'intermediate',
        topics: 'JSX,Components,Props,State,useEffect,Conditional Rendering',
        learningObjectives: JSON.stringify(['Create functional components with JSX syntax', 'Pass data between components using props', 'Manage component state with useState hook', 'Handle side effects with useEffect hook', 'Implement conditional rendering and list rendering']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Introduction to React', content: 'React is a JavaScript library developed by Meta (Facebook) for building user interfaces. It follows a component-based architecture, where complex UIs are broken into small, reusable, independent pieces called components. React uses a virtual DOM to efficiently update only the parts of the page that change, resulting in fast performance.\n\nReact components are JavaScript functions that return JSX (JavaScript XML), a syntax extension that looks like HTML but compiles to JavaScript function calls. Components accept inputs called props and return React elements describing what should appear on screen. The convention is to name component files with a capital letter (e.g., Button.tsx).' },
          { id: 's2', type: 'code', title: 'Components and Props', content: 'Components are the building blocks of a React application. They accept props (properties) as arguments and return JSX. Props are read-only data passed from parent to child components. You can destructure props in the function parameters for cleaner code.', codeExample: '// A simple component\nfunction Welcome({ name, age }) {\n  return (\n    <div>\n      <h2>Welcome, {name}!</h2>\n      <p>You are {age} years old.</p>\n    </div>\n  );\n}\n\n// Using the component\nfunction App() {\n  return (\n    <div>\n      <Welcome name="Alice" age={25} />\n      <Welcome name="Bob" age={30} />\n    </div>\n  );\n}', language: 'jsx' },
          { id: 's3', type: 'code', title: 'State with useState', content: 'State is data that changes over time within a component. The useState hook creates a state variable and a function to update it. When state changes, React re-renders the component to reflect the new data on screen.', codeExample: 'import { useState } from "react";\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(count + 1)}>\n        Increment\n      </button>\n      <button onClick={() => setCount(count - 1)}>\n        Decrement\n      </button>\n      <button onClick={() => setCount(0)}>\n        Reset\n      </button>\n    </div>\n  );\n}', language: 'jsx' },
          { id: 's4', type: 'code', title: 'Side Effects with useEffect', content: 'The useEffect hook runs code after the component renders, handling side effects like data fetching, subscriptions, or DOM manipulation. The dependency array controls when the effect re-runs. An empty array [] means it runs only once on mount.', codeExample: 'import { useState, useEffect } from "react";\n\nfunction UserProfile({ userId }) {\n  const [user, setUser] = useState(null);\n  const [loading, setLoading] = useState(true);\n\n  useEffect(() => {\n    async function fetchUser() {\n      setLoading(true);\n      const res = await fetch(`/api/users/${userId}`);\n      const data = await res.json();\n      setUser(data);\n      setLoading(false);\n    }\n    fetchUser();\n  }, [userId]); // Re-runs when userId changes\n\n  if (loading) return <p>Loading...</p>;\n  return <h1>{user?.name}</h1>;\n}', language: 'jsx' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What does JSX stand for?', options: ['JavaScript XML', 'Java Syntax Extension', 'JSON XML', 'JavaScript XHR'], correctIndex: 0, explanation: 'JSX stands for JavaScript XML. It is a syntax extension that allows you to write HTML-like code inside JavaScript.' },
          { id: 'q2', question: 'What is the correct way to pass a prop called "title" to a component?', options: ['<Card title="My Title" />', '<Card props="title" />', '<Card {title} />', '<Card prop.title="My Title" />'], correctIndex: 0, explanation: 'Props are passed as attributes on the component tag, similar to HTML attributes. The syntax is propName={value}.' },
          { id: 'q3', question: 'When does useEffect with an empty dependency array [] run?', options: ['On every render', 'Only once on component mount', 'When props change', 'Never'], correctIndex: 1, explanation: 'An empty dependency array means the effect has no dependencies to watch, so it runs only once after the initial render (mount).' }
        ]),
        resources: JSON.stringify([
          { title: 'React Official Docs', type: 'link', url: 'https://react.dev/' },
          { title: 'React Tutorial for Beginners', type: 'link', url: 'https://www.youtube.com/watch?v=Ke90Tje7VS0' },
          { title: 'React Dev Tools', type: 'link', url: 'https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=Ke90Tje7VS0'
      },
      {
        internshipId: webDev.id, title: 'Node.js & Express Backend', description: 'Build RESTful APIs with Node.js and Express, handle routing, middleware, file uploads, and error handling.', moduleOrder: 5, durationMinutes: 90, difficulty: 'intermediate',
        topics: 'Node.js,Express,Routing,Middleware,REST API,Error Handling',
        learningObjectives: JSON.stringify(['Set up an Express server with routing and middleware', 'Build RESTful APIs following standard HTTP methods and status codes', 'Implement request validation and error handling middleware', 'Handle file uploads and serve static files']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Introduction to Node.js', content: 'Node.js is a runtime environment that allows you to run JavaScript on the server side, outside the browser. Built on Chrome V8 engine, it uses an event-driven, non-blocking I/O model that makes it lightweight and efficient for building scalable network applications.\n\nNode.js uses a single-threaded event loop to handle concurrent operations without creating new threads for each request. This makes it excellent for I/O-heavy tasks like API servers, real-time applications, and streaming services. The npm (Node Package Manager) ecosystem provides access to over a million open-source packages.' },
          { id: 's2', type: 'code', title: 'Express Server Setup', content: 'Express is the most popular web framework for Node.js. It provides a thin layer of features for building web applications and APIs without obscuring Node.js functionality. An Express application is created by calling express() and adding routes and middleware.', codeExample: 'const express = require("express");\nconst app = express();\nconst PORT = process.env.PORT || 5000;\n\n// Built-in middleware\napp.use(express.json());              // Parse JSON bodies\napp.use(express.urlencoded({ extended: true }));\n\n// Custom middleware\napp.use((req, res, next) => {\n  console.log(`${req.method} ${req.url} - ${Date.now()}`);\n  next();\n});\n\n// Routes\napp.get("/", (req, res) => {\n  res.json({ message: "API is running" });\n});\n\napp.listen(PORT, () => {\n  console.log(`Server running on port ${PORT}`);\n});', language: 'javascript' },
          { id: 's3', type: 'text', title: 'RESTful API Design', content: 'REST (Representational State Transfer) is an architectural style for designing APIs. A RESTful API uses HTTP methods to perform CRUD (Create, Read, Update, Delete) operations on resources. Resources are identified by URLs (endpoints).\n\nThe standard HTTP methods map to CRUD operations: GET retrieves data, POST creates new resources, PUT replaces an entire resource, PATCH partially updates a resource, and DELETE removes a resource. Status codes communicate the result: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error.' },
          { id: 's4', type: 'code', title: 'Building REST Endpoints', content: 'Here is a complete REST API example for managing users, including CRUD operations, error handling, and input validation:', codeExample: 'const express = require("express");\nconst router = express.Router();\n\n// GET all users\nrouter.get("/users", async (req, res) => {\n  try {\n    const users = await db.query("SELECT * FROM users");\n    res.json(users);\n  } catch (err) {\n    res.status(500).json({ error: "Server error" });\n  }\n});\n\n// POST create user\nrouter.post("/users", async (req, res) => {\n  const { name, email } = req.body;\n  if (!name || !email) {\n    return res.status(400).json({ error: "Name and email required" });\n  }\n  try {\n    const user = await db.query(\n      "INSERT INTO users (name, email) VALUES (?, ?)",\n      [name, email]\n    );\n    res.status(201).json(user);\n  } catch (err) {\n    res.status(500).json({ error: "Server error" });\n  }\n});\n\nmodule.exports = router;', language: 'javascript' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What HTTP status code indicates a resource was created?', options: ['200 OK', '201 Created', '204 No Content', '301 Redirect'], correctIndex: 1, explanation: '201 Created indicates that the request was successful and a new resource was created as a result.' },
          { id: 'q2', question: 'What does middleware do in Express?', options: ['Serves static files only', 'Executes code between request and response', 'Manages database connections', 'Compiles JavaScript'], correctIndex: 1, explanation: 'Middleware functions have access to the request, response, and next function. They execute code, modify req/res objects, or end the request-response cycle.' },
          { id: 'q3', question: 'Which HTTP method is used to update an existing resource?', options: ['GET', 'POST', 'PUT', 'DELETE'], correctIndex: 2, explanation: 'PUT is used to update an existing resource. POST creates new resources, GET retrieves them, and DELETE removes them.' }
        ]),
        resources: JSON.stringify([
          { title: 'Express.js Official Guide', type: 'link', url: 'https://expressjs.com/en/guide/routing.html' },
          { title: 'Node.js Documentation', type: 'link', url: 'https://nodejs.org/en/docs/' },
          { title: 'RESTful API Design Best Practices', type: 'link', url: 'https://restfulapi.net/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=Oe421EPiBEI'
      },
      {
        internshipId: webDev.id, title: 'MongoDB & Database Integration', description: 'Learn MongoDB fundamentals, CRUD operations, Mongoose ODM, data modeling, and integrating databases with Node.js applications.', moduleOrder: 6, durationMinutes: 75, difficulty: 'advanced',
        topics: 'MongoDB,Mongoose,CRUD,Data Modeling,Indexing,Aggregation',
        learningObjectives: JSON.stringify(['Perform CRUD operations using Mongoose ODM', 'Design efficient MongoDB schemas and data models', 'Use indexing to optimize query performance', 'Build relationships between collections using references and population']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Introduction to MongoDB', content: 'MongoDB is a NoSQL document database that stores data in flexible, JSON-like documents called BSON (Binary JSON). Unlike relational databases that use tables and rows, MongoDB uses collections and documents. Each document can have a different structure, making it ideal for rapidly evolving applications.\n\nKey advantages of MongoDB include: flexible schemas that adapt to changing requirements, horizontal scaling through sharding, built-in replication for high availability, and powerful aggregation pipelines for data analysis. MongoDB stores documents in collections (similar to tables), and each document has a unique _id field.' },
          { id: 's2', type: 'code', title: 'Mongoose Schema and Model', content: 'Mongoose is an Object Document Modeling (ODM) library for MongoDB and Node.js. It provides schema-based solutions for modeling application data, including built-in validation, type casting, query building, and business logic hooks.', codeExample: 'const mongoose = require("mongoose");\n\n// Define a Schema\nconst userSchema = new mongoose.Schema({\n  firstName: { type: String, required: true, trim: true },\n  lastName: { type: String, required: true, trim: true },\n  email: { type: String, required: true, unique: true, lowercase: true },\n  password: { type: String, required: true, minlength: 6 },\n  role: { type: String, enum: ["student", "admin"], default: "student" },\n  createdAt: { type: Date, default: Date.now }\n});\n\n// Create Model\nconst User = mongoose.model("User", userSchema);\n\n// Create a document\nconst user = await User.create({\n  firstName: "John",\n  lastName: "Doe",\n  email: "john@example.com",\n  password: "hashedPassword123"\n});', language: 'javascript' },
          { id: 's3', type: 'text', title: 'Data Modeling Patterns', content: 'MongoDB supports two main patterns for relating data: embedding and referencing. Embedding places related data inside a single document, which is ideal when data is accessed together and the sub-data does not grow unbounded. Referencing stores references (ObjectIds) to documents in other collections, which is best for many-to-many relationships or when sub-data grows independently.\n\nDesign principles: prefer embedding for data that is read together, use referencing when data is shared across documents, avoid unbounded arrays, and denormalize strategically for read performance.' },
          { id: 's4', type: 'code', title: 'CRUD Operations with Mongoose', content: 'Mongoose provides a rich API for Create, Read, Update, and Delete operations. All operations return promises that can be awaited in async functions.', codeExample: '// CREATE\nconst newUser = await User.create({ firstName: "Jane", email: "jane@example.com" });\n\n// READ\nconst user = await User.findById(userId);\nconst users = await User.find({ role: "student" }).sort({ createdAt: -1 }).limit(10);\nconst userByEmail = await User.findOne({ email: "jane@example.com" });\n\n// UPDATE\nawait User.findByIdAndUpdate(userId, { firstName: "Janet" }, { new: true });\nawait User.updateMany({ role: "student" }, { $set: { active: true } });\n\n// DELETE\nawait User.findByIdAndDelete(userId);\nawait User.deleteMany({ role: "inactive" });', language: 'javascript' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What does MongoDB store data as?', options: ['Tables and rows', 'Documents in collections', 'XML nodes', 'Key-value pairs only'], correctIndex: 1, explanation: 'MongoDB stores data as JSON-like documents in collections. Each document can have a different structure.' },
          { id: 'q2', question: 'What is Mongoose?', options: ['A CSS framework', 'An ODM library for MongoDB', 'A testing tool', 'A build tool'], correctIndex: 1, explanation: 'Mongoose is an Object Document Modeling (ODM) library that provides schema-based solutions for MongoDB and Node.js.' },
          { id: 'q3', question: 'When should you use referencing over embedding?', options: ['When data is always accessed together', 'When data grows unbounded or is shared across documents', 'When you want faster reads', 'When data is small'], correctIndex: 1, explanation: 'Referencing is preferred when sub-data grows independently, is shared across documents, or when embedding would create unbounded arrays.' }
        ]),
        resources: JSON.stringify([
          { title: 'MongoDB University (Free)', type: 'link', url: 'https://university.mongodb.com/' },
          { title: 'Mongoose Documentation', type: 'link', url: 'https://mongoosejs.com/docs/' },
          { title: 'MongoDB Data Modeling Guide', type: 'link', url: 'https://www.mongodb.com/docs/manual/core/data-model-design/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=-56x56UppqQ'
      }
    );
  }

  // ========== PYTHON TRACK (6 modules) ==========
  if (python) {
    learningModules.push(
      {
        internshipId: python.id, title: 'Python Fundamentals', description: 'Learn Python syntax, variables, data types, operators, and basic I/O operations from scratch.', moduleOrder: 1, durationMinutes: 60, difficulty: 'beginner',
        topics: 'Syntax,Variables,Data Types,Operators,Input/Output',
        learningObjectives: JSON.stringify(['Write and run basic Python programs', 'Declare variables and understand dynamic typing', 'Use strings, numbers, booleans, lists, tuples, and dictionaries', 'Perform arithmetic, comparison, and logical operations']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Introduction to Python', content: 'Python is a high-level, interpreted, general-purpose programming language created by Guido van Rossum in 1991. It emphasizes code readability with its use of significant whitespace (indentation instead of braces). Python supports multiple programming paradigms including procedural, object-oriented, and functional programming.\n\nPython is one of the most popular programming languages in the world, used by companies like Google, Netflix, Instagram, and Spotify. It excels in web development, data science, artificial intelligence, automation, and scientific computing. The Python Package Index (PyPI) hosts over 400,000 packages for virtually every use case.' },
          { id: 's2', type: 'code', title: 'Variables and Data Types', content: 'Python uses dynamic typing, meaning you do not need to declare variable types explicitly. Variables are created when you assign a value. Python has several built-in data types: int (integers), float (decimals), str (strings), bool (True/False), list (ordered mutable collections), tuple (ordered immutable collections), dict (key-value pairs), and set (unordered unique values).', codeExample: '# Variables - no type declaration needed\nname = "Alice"          # str\nage = 25               # int\nheight = 5.7            # float\nis_student = True       # bool\n\n# Data Structures\nscores = [85, 92, 78, 95]          # list (mutable)\ncoordinates = (10.5, 20.3)         # tuple (immutable)\nstudent = {"name": "Bob", "age": 22}  # dict\nunique_ids = {101, 102, 103}       # set\n\n# Type checking\nprint(type(name))      # <class str>\nprint(type(scores))    # <class list>', language: 'python' },
          { id: 's3', type: 'code', title: 'String Operations', content: 'Strings in Python are immutable sequences of characters. You can use single quotes, double quotes, or triple quotes for multi-line strings. Python provides powerful string operations including slicing, formatting, and methods.', codeExample: '# String creation\nsingle = \'Hello\'\ndouble = "World"\nmulti_line = """This is\na multi-line\nstring"""\n\n# String formatting (f-strings)\nname = "Alice"\nage = 25\nprint(f"Hello, {name}! You are {age} years old.")\n\n# String methods\ntext = "  Hello, World!  "\nprint(text.strip())        # "Hello, World!"\nprint(text.lower())        # "  hello, world!  "\nprint(text.replace("World", "Python"))\nprint(text.split(","))     # ["  Hello", " World!  "]\n\n# Slicing\nword = "Python"\nprint(word[0:3])   # "Pyt"\nprint(word[::-1])  # "nohtyP" (reversed)', language: 'python' },
          { id: 's4', type: 'text', title: 'Operators', content: 'Python provides several categories of operators. Arithmetic operators perform math operations: + (add), - (subtract), * (multiply), / (true division), // (floor division), % (modulo), and ** (exponent). Comparison operators return booleans: ==, !=, >, <, >=, <=. Logical operators combine conditions: and, or, not. Membership operators check containment: in, not in. Identity operators check object identity: is, is not.\n\nOperator precedence follows mathematical conventions: parentheses first, then exponentiation, then multiplication/division, then addition/subtraction. When in doubt, use parentheses to make the order explicit.' },
          { id: 's5', type: 'code', title: 'Input and Output', content: 'Python uses the input() function to read user input and print() to display output. All input is read as a string, so you must convert it to the appropriate type for numeric operations.', codeExample: '# Output\nprint("Hello, World!")\nprint("Name:", name, "Age:", age)\nprint(f"Score: {score}/100")\n\n# Input\nname = input("Enter your name: ")  # Always returns str\nage = int(input("Enter your age: "))  # Convert to int\nheight = float(input("Enter height: "))  # Convert to float\n\n# Multiple inputs in one line\nx, y = map(int, input("Enter two numbers: ").split())\n\n# Conditional\nif age >= 18:\n    print(f"{name} is an adult")\nelse:\n    print(f"{name} is a minor")', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'Which of the following is a valid Python variable name?', options: ['2name', '_name', 'class', 'my-name'], correctIndex: 1, explanation: 'Python variable names must start with a letter or underscore. They cannot start with a number or be a reserved keyword like "class".' },
          { id: 'q2', question: 'What is the output of: type(3.14)?', options: ['<class "int">', '<class "float">', '<class "decimal">', '<class "number">'], correctIndex: 1, explanation: '3.14 is a floating-point number, so type() returns <class "float">.' },
          { id: 'q3', question: 'What does the // operator do in Python?', options: ['Returns the remainder', 'Performs floor division', 'Performs true division', 'Multiplies two numbers'], correctIndex: 1, explanation: 'The // operator performs floor division, returning the largest integer less than or equal to the result. For example, 7 // 2 = 3.' },
          { id: 'q4', question: 'Which data structure is immutable in Python?', options: ['list', 'dict', 'set', 'tuple'], correctIndex: 3, explanation: 'Tuples are immutable in Python, meaning their elements cannot be changed after creation. Lists, dicts, and sets are all mutable.' }
        ]),
        resources: JSON.stringify([
          { title: 'Python Official Tutorial', type: 'link', url: 'https://docs.python.org/3/tutorial/' },
          { title: 'Python for Beginners (YouTube)', type: 'link', url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc' },
          { title: 'Real Python - Tutorials', type: 'link', url: 'https://realpython.com/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc'
      },
      {
        internshipId: python.id, title: 'Control Flow & Functions', description: 'Master conditional statements, loops, function definitions, scope, and functional programming concepts.', moduleOrder: 2, durationMinutes: 70, difficulty: 'beginner',
        topics: 'if/elif/else,for/while,Functions,Scope,Lambda,Comprehensions',
        learningObjectives: JSON.stringify(['Use if/elif/else for conditional logic', 'Implement for and while loops with break/continue', 'Define functions with parameters, return values, and default arguments', 'Write lambda functions and use map, filter, reduce']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'code', title: 'Conditional Statements', content: 'Python uses if, elif, and else keywords for conditional execution. Conditions are evaluated top-down, and only the first matching block executes. Python uses indentation (typically 4 spaces) to define code blocks instead of braces.', codeExample: 'score = 85\n\nif score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelif score >= 70:\n    grade = "C"\nelif score >= 60:\n    grade = "D"\nelse:\n    grade = "F"\n\nprint(f"Score: {score}, Grade: {grade}")\n\n# Ternary operator\nstatus = "Pass" if score >= 50 else "Fail"\n\n# Match-case (Python 3.10+)\nmatch grade:\n    case "A": print("Excellent!")\n    case "B": print("Good job!")\n    case _: print("Keep trying!")', language: 'python' },
          { id: 's2', type: 'code', title: 'Loops', content: 'Python has two loop constructs: for (iterates over a sequence) and while (repeats while a condition is true). Both support else clauses that execute when the loop completes normally (without break).', codeExample: '# For loop with range\nfor i in range(1, 6):\n    print(i)  # 1, 2, 3, 4, 5\n\n# For loop with enumerate\nfruits = ["apple", "banana", "cherry"]\nfor index, fruit in enumerate(fruits):\n    print(f"{index}: {fruit}")\n\n# While loop\ncount = 0\nwhile count < 5:\n    print(count)\n    count += 1\n\n# List comprehension (concise loop syntax)\nsquares = [x**2 for x in range(10)]\neven_squares = [x**2 for x in range(10) if x % 2 == 0]\n\n# Dictionary comprehension\nword_lengths = {word: len(word) for word in ["hello", "world"]}', language: 'python' },
          { id: 's3', type: 'code', title: 'Functions', content: 'Functions are defined using the def keyword. They can accept parameters with default values, return multiple values as tuples, and use *args and **kwargs for variable-length arguments.', codeExample: '# Basic function\ndef greet(name, greeting="Hello"):\n    return f"{greeting}, {name}!"\n\nprint(greet("Alice"))           # "Hello, Alice!"\nprint(greet("Bob", "Hi"))       # "Hi, Bob!"\n\n# Multiple return values\ndef min_max(numbers):\n    return min(numbers), max(numbers)\n\nlo, hi = min_max([3, 1, 4, 1, 5])\n\n# *args and **kwargs\ndef total(*args, **kwargs):\n    print(f"Args: {args}")       # Tuple of positional args\n    print(f"Kwargs: {kwargs}")   # Dict of keyword args\n    return sum(args)\n\ntotal(1, 2, 3, tax=0.1, tip=0.2)\n\n# Lambda function\nsquare = lambda x: x ** 2\nadd = lambda a, b: a + b', language: 'python' },
          { id: 's4', type: 'code', title: 'Higher-Order Functions', content: 'Python supports higher-order functions that take functions as arguments or return functions. The built-in map, filter, and reduce functions are commonly used for functional programming patterns.', codeExample: 'from functools import reduce\n\n# map - apply function to every element\nnumbers = [1, 2, 3, 4, 5]\ndoubled = list(map(lambda x: x * 2, numbers))\n# [2, 4, 6, 8, 10]\n\n# filter - keep elements where function returns True\nevens = list(filter(lambda x: x % 2 == 0, numbers))\n# [2, 4]\n\n# reduce - combine elements into a single value\ntotal = reduce(lambda a, b: a + b, numbers)\n# 15\n\n# sorted with key function\nstudents = [("Alice", 85), ("Bob", 92), ("Charlie", 78)]\nby_grade = sorted(students, key=lambda s: s[1], reverse=True)\n# [("Bob", 92), ("Alice", 85), ("Charlie", 78)]', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'How many elif blocks can an if statement have?', options: ['Only one', 'Only two', 'As many as needed', 'Maximum five'], correctIndex: 2, explanation: 'An if statement can have unlimited elif blocks. Each condition is checked in order, and only the first matching block executes.' },
          { id: 'q2', question: 'What does the break statement do in a loop?', options: ['Skips the current iteration', 'Exits the loop entirely', 'Restarts the loop', 'Pauses the loop'], correctIndex: 1, explanation: 'The break statement immediately exits the innermost loop. The code after the loop continues executing.' },
          { id: 'q3', question: 'What is a lambda function?', options: ['A named function', 'An anonymous inline function', 'A class method', 'A recursive function'], correctIndex: 1, explanation: 'A lambda function is a small anonymous function defined with the lambda keyword. It can take any number of arguments but can only have one expression.' }
        ]),
        resources: JSON.stringify([
          { title: 'Python Control Flow Docs', type: 'link', url: 'https://docs.python.org/3/tutorial/controlflow.html' },
          { title: 'Python Functions Guide', type: 'link', url: 'https://docs.python.org/3/tutorial/controlflow.html#defining-functions' },
          { title: 'Python Comprehensions Tutorial', type: 'link', url: 'https://realpython.com/list-comprehension-python/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=9OeznAkyQz4'
      },
      {
        internshipId: python.id, title: 'Object-Oriented Programming', description: 'Master OOP concepts in Python including classes, inheritance, polymorphism, encapsulation, and dunder methods.', moduleOrder: 3, durationMinutes: 75, difficulty: 'intermediate',
        topics: 'Classes,Objects,Inheritance,Polymorphism,Encapsulation,Dunder Methods',
        learningObjectives: JSON.stringify(['Define classes with attributes and methods', 'Implement single and multiple inheritance', 'Apply polymorphism through method overriding', 'Use dunder methods for operator overloading and string representation']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'OOP Concepts', content: 'Object-Oriented Programming (OOP) organizes code into classes and objects. A class is a blueprint that defines attributes (data) and methods (behavior). An object is an instance of a class. OOP provides four key principles:\n\n1. Encapsulation: Bundling data and methods that operate on that data within a class, and restricting direct access to some components using access modifiers (_protected, __private).\n2. Inheritance: Creating new classes that reuse, extend, and modify behavior defined in existing classes. The child class inherits attributes and methods from the parent class.\n3. Polymorphism: Allowing objects of different classes to be treated as objects of a common superclass. The same method can behave differently depending on the object that calls it.\n4. Abstraction: Hiding complex implementation details and showing only the necessary features of an object.' },
          { id: 's2', type: 'code', title: 'Classes and Objects', content: 'Classes are defined using the class keyword. The __init__ method is the constructor that initializes new objects. The self parameter refers to the current instance of the class. Instance attributes are unique to each object, while class attributes are shared across all instances.', codeExample: 'class Student:\n    # Class attribute (shared)\n    school = "IQIntern"\n\n    def __init__(self, name, grade, gpa):\n        # Instance attributes (unique)\n        self.name = name\n        self.grade = grade\n        self.gpa = gpa\n        self._enrolled = True  # Protected attribute\n\n    def introduce(self):\n        return f"Hi, I am {self.name} from {self.grade} with GPA {self.gpa}"\n\n    def is_honor_roll(self):\n        return self.gpa >= 3.5\n\n# Create objects\nalice = Student("Alice", "12th", 3.8)\nbob = Student("Bob", "11th", 3.2)\n\nprint(alice.introduce())\nprint(alice.is_honor_roll())  # True\nprint(bob.is_honor_roll())    # False', language: 'python' },
          { id: 's3', type: 'code', title: 'Inheritance', content: 'Inheritance allows a child class to inherit attributes and methods from a parent class. The child class can override parent methods or add new ones. Python supports single, multiple, and multilevel inheritance.', codeExample: 'class Person:\n    def __init__(self, name, age):\n        self.name = name\n        self.age = age\n\n    def introduce(self):\n        return f"I am {self.name}, {self.age} years old"\n\nclass Student(Person):  # Inherits from Person\n    def __init__(self, name, age, grade, gpa):\n        super().__init__(name, age)  # Call parent constructor\n        self.grade = grade\n        self.gpa = gpa\n\n    # Method overriding\n    def introduce(self):\n        return f"I am {self.name}, a {self.grade} student with GPA {self.gpa}"\n\nclass Teacher(Person):\n    def __init__(self, name, age, subject):\n        super().__init__(name, age)\n        self.subject = subject\n\n    def introduce(self):\n        return f"I am {self.name}, and I teach {self.subject}"\n\n# Polymorphism in action\ndef print_introduction(person):\n    print(person.introduce())\n\nprint_introduction(Student("Alice", 17, "12th", 3.8))\nprint_introduction(Teacher("Mr. Smith", 40, "Math"))', language: 'python' },
          { id: 's4', type: 'code', title: 'Dunder Methods', content: 'Dunder (double underscore) methods, also called magic methods, allow you to define how objects behave with built-in operations like printing, comparison, and arithmetic. They are called implicitly by Python.', codeExample: 'class Vector:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n\n    def __repr__(self):\n        return f"Vector({self.x}, {self.y})"\n\n    def __str__(self):\n        return f"({self.x}, {self.y})"\n\n    def __add__(self, other):\n        return Vector(self.x + other.x, self.y + other.y)\n\n    def __eq__(self, other):\n        return self.x == other.x and self.y == other.y\n\n    def __len__(self):\n        return int((self.x**2 + self.y**2)**0.5)\n\nv1 = Vector(3, 4)\nv2 = Vector(1, 2)\nprint(v1)          # (3, 4)  calls __str__\nprint(repr(v1))    # Vector(3, 4) calls __repr__\nprint(v1 + v2)     # (4, 6)  calls __add__\nprint(len(v1))     # 5       calls __len__', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What does the __init__ method do?', options: ['Destroys an object', 'Initializes a new object', 'Creates a class', 'Imports modules'], correctIndex: 1, explanation: '__init__ is the constructor method that runs automatically when a new object is created. It initializes the object attributes.' },
          { id: 'q2', question: 'What does super() do in Python?', options: ['Creates a parent class', 'Calls the parent class methods', 'Deletes a class', 'Makes a class static'], correctIndex: 1, explanation: 'super() returns a proxy object that delegates method calls to the parent class. It is commonly used in __init__ to call the parent constructor.' },
          { id: 'q3', question: 'What is polymorphism in OOP?', options: ['Having one class', 'Objects of different types responding to the same method differently', 'Hiding data', 'Creating multiple instances'], correctIndex: 1, explanation: 'Polymorphism allows objects of different classes to be treated as objects of a common superclass, with each class providing its own implementation of shared methods.' }
        ]),
        resources: JSON.stringify([
          { title: 'Python OOP Tutorial', type: 'link', url: 'https://realpython.com/python3-object-oriented-programming/' },
          { title: 'Python Inheritance Guide', type: 'link', url: 'https://docs.python.org/3/tutorial/classes.html#inheritance' },
          { title: 'Magic Methods Guide', type: 'link', url: 'https://realpython.com/python-magic-methods/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=ZDa-Z5JzLx4'
      },
      {
        internshipId: python.id, title: 'Data Structures & Algorithms', description: 'Learn essential data structures and algorithms including lists, stacks, queues, trees, sorting, and searching.', moduleOrder: 4, durationMinutes: 80, difficulty: 'intermediate',
        topics: 'Lists,Stacks,Queues,Trees,Sorting,Searching,Time Complexity',
        learningObjectives: JSON.stringify(['Implement stacks and queues using Python lists and collections', 'Understand binary search trees and tree traversal', 'Apply sorting algorithms: bubble, merge, and quick sort', 'Analyze time and space complexity using Big O notation']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Time Complexity (Big O)', content: 'Big O notation describes how the runtime or space requirements of an algorithm grow as the input size increases. It provides an upper bound on the growth rate, allowing us to compare algorithm efficiency independent of hardware.\n\nCommon Big O complexities from best to worst: O(1) constant, O(log n) logarithmic, O(n) linear, O(n log n) linearithmic, O(n^2) quadratic, O(2^n) exponential, O(n!) factorial. For example, checking if an item exists in an unsorted list is O(n) because in the worst case you must check every element. Binary search on a sorted list is O(log n) because it halves the search space each step.' },
          { id: 's2', type: 'code', title: 'Stacks and Queues', content: 'A stack is a Last-In-First-Out (LIFO) data structure where elements are added and removed from the same end. A queue is a First-In-First-Out (FIFO) data structure where elements are added at one end and removed from the other.', codeExample: '# Stack implementation\nstack = []\nstack.append("A")    # Push: add to top\nstack.append("B")\nstack.append("C")\ntop = stack.pop()    # Pop: remove from top -> "C"\nprint(stack)         # ["A", "B"]\n\n# Queue implementation (using collections)\nfrom collections import deque\n\nqueue = deque()\nqueue.append("A")    # Enqueue: add to back\nqueue.append("B")\nqueue.append("C")\nfront = queue.popleft()  # Dequeue: remove from front -> "A"\nprint(queue)         # deque(["B", "C"])', language: 'python' },
          { id: 's3', type: 'code', title: 'Sorting Algorithms', content: 'Sorting algorithms arrange elements in a specific order. Understanding different sorting algorithms helps you choose the right one for different scenarios based on data size, initial order, and memory constraints.', codeExample: '# Bubble Sort - O(n^2)\ndef bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n - i - 1):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n    return arr\n\n# Merge Sort - O(n log n)\ndef merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right)\n\ndef merge(left, right):\n    result = []\n    i = j = 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            result.append(left[i])\n            i += 1\n        else:\n            result.append(right[j])\n            j += 1\n    result.extend(left[i:])\n    result.extend(right[j:])\n    return result', language: 'python' },
          { id: 's4', type: 'text', title: 'Binary Search Trees', content: 'A Binary Search Tree (BST) is a tree data structure where each node has at most two children. The left child contains values less than the parent, and the right child contains values greater than the parent. This property enables efficient searching, insertion, and deletion operations.\n\nBST operations have average time complexity of O(log n) for balanced trees. In the worst case (a skewed tree), operations degrade to O(n). Self-balancing trees like AVL trees and Red-Black trees maintain O(log n) guarantees by automatically rebalancing after modifications.' },
          { id: 's5', type: 'code', title: 'Binary Search', content: 'Binary search is an efficient algorithm for finding an item in a sorted array. It works by repeatedly dividing the search interval in half, comparing the target value to the middle element.', codeExample: 'def binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    \n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    \n    return -1  # Not found\n\n# Example\nsorted_list = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]\nresult = binary_search(sorted_list, 23)\nprint(f"Found at index: {result}")  # Found at index: 5', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is the time complexity of binary search?', options: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'], correctIndex: 1, explanation: 'Binary search halves the search space with each comparison, resulting in O(log n) time complexity.' },
          { id: 'q2', question: 'Which data structure uses LIFO ordering?', options: ['Queue', 'Stack', 'Array', 'Linked List'], correctIndex: 1, explanation: 'A stack follows Last-In-First-Out (LIFO) ordering, where the most recently added element is the first to be removed.' },
          { id: 'q3', question: 'What is the worst-case time complexity of bubble sort?', options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)'], correctIndex: 2, explanation: 'Bubble sort uses nested loops, resulting in O(n^2) time complexity in the worst and average cases.' }
        ]),
        resources: JSON.stringify([
          { title: 'Visualgo - Algorithm Visualization', type: 'link', url: 'https://visualgo.net/' },
          { title: 'Python Data Structures Docs', type: 'link', url: 'https://docs.python.org/3/tutorial/datastructures.html' },
          { title: 'Big O Cheat Sheet', type: 'link', url: 'https://www.bigocheatsheet.com/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=pEFrOB-NZy8'
      },
      {
        internshipId: python.id, title: 'File Handling & Error Handling', description: 'Learn file I/O operations, context managers, exception handling, custom exceptions, and logging.', moduleOrder: 5, durationMinutes: 60, difficulty: 'intermediate',
        topics: 'File I/O,Context Managers,try/except,Custom Exceptions,Logging',
        learningObjectives: JSON.stringify(['Read and write text and CSV files using context managers', 'Handle exceptions gracefully with try/except/finally', 'Create custom exception classes for application-specific errors', 'Use the logging module for structured application logging']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'code', title: 'File Operations', content: 'Python provides built-in functions for file I/O. The with statement (context manager) automatically handles file closing, even if errors occur. Always use with to ensure files are properly closed.', codeExample: '# Writing to a file\nwith open("data.txt", "w") as f:\n    f.write("Hello, World!\\n")\n    f.write("Second line\\n")\n\n# Reading from a file\nwith open("data.txt", "r") as f:\n    content = f.read()          # Read entire file\n    lines = f.readlines()       # Read as list of lines\n\n# Reading line by line\nwith open("data.txt", "r") as f:\n    for line in f:\n        print(line.strip())\n\n# CSV file handling\nimport csv\n\n# Write CSV\nwith open("data.csv", "w", newline="") as f:\n    writer = csv.writer(f)\n    writer.writerow(["Name", "Age", "Grade"])\n    writer.writerow(["Alice", 17, "A"])\n    writer.writerow(["Bob", 18, "B"])\n\n# Read CSV\nwith open("data.csv", "r") as f:\n    reader = csv.DictReader(f)\n    for row in reader:\n        print(row["Name"], row["Grade"])', language: 'python' },
          { id: 's2', type: 'code', title: 'Exception Handling', content: 'Exception handling allows your program to gracefully handle errors instead of crashing. The try/except block catches specific exceptions, and you can add else (runs if no exception) and finally (always runs) clauses.', codeExample: 'def safe_divide(a, b):\n    try:\n        result = a / b\n    except ZeroDivisionError:\n        print("Error: Cannot divide by zero!")\n        return None\n    except TypeError as e:\n        print(f"Error: Invalid types - {e}")\n        return None\n    else:\n        print("Division successful!")\n        return result\n    finally:\n        print("This always runs")\n\n# Custom Exceptions\nclass InsufficientFundsError(Exception):\n    def __init__(self, balance, amount):\n        self.balance = balance\n        self.amount = amount\n        super().__init__(\n            f"Cannot withdraw {amount}. Balance is {balance}"\n        )\n\ndef withdraw(balance, amount):\n    if amount > balance:\n        raise InsufficientFundsError(balance, amount)\n    return balance - amount\n\ntry:\n    new_balance = withdraw(100, 150)\nexcept InsufficientFundsError as e:\n    print(e)', language: 'python' },
          { id: 's3', type: 'text', title: 'Logging', content: 'The logging module provides a flexible framework for emitting log messages from Python programs. Unlike print statements, logging provides severity levels, timestamps, and configurable output destinations (console, files, remote servers).\n\nThe five logging levels in ascending order are: DEBUG (detailed information for diagnosing problems), INFO (confirmation that things are working as expected), WARNING (something unexpected happened but the program continues), ERROR (the program failed to perform a function), and CRITICAL (the program may not be able to continue).' },
          { id: 's4', type: 'code', title: 'Logging Setup', content: 'Configure logging with different levels, formats, and handlers to output to both console and file.', codeExample: 'import logging\n\n# Configure logging\nlogging.basicConfig(\n    level=logging.DEBUG,\n    format="%(asctime)s [%(levelname)s] %(message)s",\n    datefmt="%Y-%m-%d %H:%M:%S",\n    handlers=[\n        logging.FileHandler("app.log"),\n        logging.StreamHandler()\n    ]\n)\n\nlogger = logging.getLogger(__name__)\n\n# Usage\nlogger.debug("Debug message - detailed info")\nlogger.info("Info message - confirmation")\nlogger.warning("Warning - something unexpected")\nlogger.error("Error - operation failed")\n\ntry:\n    result = 10 / 0\nexcept ZeroDivisionError:\n    logger.exception("Division by zero occurred")', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What does the with statement do when working with files?', options: ['Creates a new file', 'Automatically closes the file after use', 'Encrypts the file', 'Compresses the file'], correctIndex: 1, explanation: 'The with statement uses context managers to ensure resources like files are properly released (closed) after the block executes, even if exceptions occur.' },
          { id: 'q2', question: 'Which clause in a try/except block always executes?', options: ['else', 'except', 'finally', 'try'], correctIndex: 2, explanation: 'The finally clause always executes regardless of whether an exception occurred. It is commonly used for cleanup operations.' },
          { id: 'q3', question: 'What is the purpose of the logging module?', options: ['To write files', 'To print colorful output', 'To record events and messages for debugging and monitoring', 'To send emails'], correctIndex: 2, explanation: 'The logging module provides a flexible way to record events with severity levels, timestamps, and configurable output destinations.' }
        ]),
        resources: JSON.stringify([
          { title: 'Python File I/O Docs', type: 'link', url: 'https://docs.python.org/3/tutorial/inputoutput.html' },
          { title: 'Python Exceptions Docs', type: 'link', url: 'https://docs.python.org/3/tutorial/errors.html' },
          { title: 'Python Logging HOWTO', type: 'link', url: 'https://docs.python.org/3/howto/logging.html' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=NIWwJbo-9_8'
      },
      {
        internshipId: python.id, title: 'APIs & Web Scraping', description: 'Build REST APIs with Flask, make HTTP requests, parse JSON, and scrape web data with BeautifulSoup and requests.', moduleOrder: 6, durationMinutes: 80, difficulty: 'advanced',
        topics: 'Flask,HTTP Requests,JSON,BeautifulSoup,Web Scraping,REST APIs',
        learningObjectives: JSON.stringify(['Build RESTful APIs using Flask framework', 'Make HTTP requests using the requests library', 'Parse JSON data from API responses', 'Scrape web pages using BeautifulSoup and requests']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Introduction to Flask', content: 'Flask is a lightweight Python web framework for building web applications and APIs. Unlike Django (which is a full-featured framework), Flask follows a minimalist philosophy, providing only the essentials: routing, request/response handling, and template rendering. This makes Flask easy to learn and highly flexible.\n\nFlask applications are created by instantiating the Flask class. Routes are defined using decorators that map URL patterns to Python functions. Flask supports all HTTP methods (GET, POST, PUT, DELETE) and can return JSON responses, HTML templates, or any other content type.' },
          { id: 's2', type: 'code', title: 'Building a Flask API', content: 'Here is a complete Flask REST API for managing a todo list with CRUD operations, JSON responses, and error handling.', codeExample: 'from flask import Flask, request, jsonify\n\napp = Flask(__name__)\n\n# In-memory storage\ntodos = []\nnext_id = 1\n\n@app.route("/todos", methods=["GET"])\ndef get_todos():\n    return jsonify(todos)\n\n@app.route("/todos", methods=["POST"])\ndef create_todo():\n    global next_id\n    data = request.get_json()\n    if not data or "title" not in data:\n        return jsonify({"error": "Title required"}), 400\n    todo = {\n        "id": next_id,\n        "title": data["title"],\n        "completed": False\n    }\n    todos.append(todo)\n    next_id += 1\n    return jsonify(todo), 201\n\n@app.route("/todos/<int:id>", methods=["PUT"])\ndef update_todo(id):\n    todo = next((t for t in todos if t["id"] == id), None)\n    if not todo:\n        return jsonify({"error": "Not found"}), 404\n    data = request.get_json()\n    todo.update(data)\n    return jsonify(todo)\n\n@app.route("/todos/<int:id>", methods=["DELETE"])\ndef delete_todo(id):\n    global todos\n    todos = [t for t in todos if t["id"] != id]\n    return jsonify({"message": "Deleted"}), 200', language: 'python' },
          { id: 's3', type: 'code', title: 'HTTP Requests with requests Library', content: 'The requests library is the standard for making HTTP requests in Python. It supports all HTTP methods, handles cookies, sessions, authentication, and file uploads.', codeExample: 'import requests\n\n# GET request\nresponse = requests.get("https://jsonplaceholder.typicode.com/posts")\nposts = response.json()  # Parse JSON response\nprint(f"Status: {response.status_code}")\nprint(f"Posts: {len(posts)}")\n\n# GET with parameters\nresponse = requests.get(\n    "https://jsonplaceholder.typicode.com/posts",\n    params={"userId": 1}\n)\n\n# POST request\nnew_post = {\n    "title": "My Post",\n    "body": "This is the content",\n    "userId": 1\n}\nresponse = requests.post(\n    "https://jsonplaceholder.typicode.com/posts",\n    json=new_post\n)\nprint(response.json())\n\n# Error handling\ntry:\n    response = requests.get("https://api.example.com/data", timeout=5)\n    response.raise_for_status()  # Raises exception for 4xx/5xx\n    data = response.json()\nexcept requests.exceptions.Timeout:\n    print("Request timed out")\nexcept requests.exceptions.HTTPError as e:\n    print(f"HTTP Error: {e}")', language: 'python' },
          { id: 's4', type: 'code', title: 'Web Scraping with BeautifulSoup', content: 'BeautifulSoup is a Python library for parsing HTML and XML documents. Combined with the requests library, it enables web scraping to extract data from websites.', codeExample: 'import requests\nfrom bs4 import BeautifulSoup\n\n# Fetch a web page\nurl = "https://quotes.toscrape.com/"\nresponse = requests.get(url)\n\n# Parse HTML\nsoup = BeautifulSoup(response.text, "html.parser")\n\n# Find elements\nquotes = soup.find_all("div", class_="quote")\nfor quote in quotes:\n    text = quote.find("span", class_="text").get_text()\n    author = quote.find("small", class_="author").get_text()\n    print(f"{text} - {author}")\n\n# CSS selectors\nlinks = soup.select("a.tag")\nfor link in links:\n    print(link.get_text())\n\n# Save data to CSV\nimport csv\n\nwith open("quotes.csv", "w", newline="", encoding="utf-8") as f:\n    writer = csv.writer(f)\n    writer.writerow(["Quote", "Author"])\n    for quote in quotes:\n        text = quote.find("span", class_="text").get_text()\n        author = quote.find("small", class_="author").get_text()\n        writer.writerow([text, author])', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is Flask?', options: ['A database', 'A lightweight Python web framework', 'A testing tool', 'A package manager'], correctIndex: 1, explanation: 'Flask is a lightweight web framework for Python that provides routing, request/response handling, and template rendering.' },
          { id: 'q2', question: 'How do you parse JSON in Python?', options: ['json.parse()', 'json.loads() or response.json()', 'json.decode()', 'json.read()'], correctIndex: 1, explanation: 'Use json.loads() to parse a JSON string, or response.json() when using the requests library.' },
          { id: 'q3', question: 'What library is commonly used for web scraping in Python?', options: ['flask', 'numpy', 'BeautifulSoup', 'pandas'], correctIndex: 2, explanation: 'BeautifulSoup is a popular Python library for parsing HTML and XML documents, commonly used for web scraping.' }
        ]),
        resources: JSON.stringify([
          { title: 'Flask Official Documentation', type: 'link', url: 'https://flask.palletsprojects.com/' },
          { title: 'Requests Library Docs', type: 'link', url: 'https://docs.python-requests.org/' },
          { title: 'BeautifulSoup Documentation', type: 'link', url: 'https://www.crummy.com/software/BeautifulSoup/bs4/doc/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=Z1RJmh_OqeA'
      }
    );
  }

  // ========== DATA SCIENCE TRACK (6 modules) ==========
  if (dataSci) {
    learningModules.push(
      {
        internshipId: dataSci.id, title: 'Python for Data Science', description: 'Learn Python libraries essential for data science including NumPy for numerical computing and Pandas for data manipulation.', moduleOrder: 1, durationMinutes: 70, difficulty: 'beginner',
        topics: 'NumPy,Pandas,DataFrames,Series,Array Operations',
        learningObjectives: JSON.stringify(['Perform numerical computations with NumPy arrays', 'Create and manipulate DataFrames with Pandas', 'Load, clean, and transform real-world datasets', 'Perform basic statistical analysis on data']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Introduction to NumPy', content: 'NumPy (Numerical Python) is the foundational library for scientific computing in Python. It provides a powerful N-dimensional array object (ndarray), functions for mathematical operations, and tools for linear algebra, Fourier transforms, and random number generation. NumPy arrays are significantly faster than Python lists because they are stored in contiguous memory and operations are implemented in C.\n\nKey advantages of NumPy include: vectorized operations that apply operations to entire arrays without loops, broadcasting for operations between arrays of different shapes, and integration with C/C++ code for performance-critical tasks. Most data science libraries (Pandas, Matplotlib, scikit-learn) are built on top of NumPy.' },
          { id: 's2', type: 'code', title: 'NumPy Arrays', content: 'NumPy arrays are created from Python lists or using dedicated functions. They support element-wise operations, slicing, and mathematical functions.', codeExample: 'import numpy as np\n\n# Create arrays\narr = np.array([1, 2, 3, 4, 5])\nmatrix = np.array([[1, 2, 3], [4, 5, 6]])\n\n# Array operations (vectorized - no loops needed)\nprint(arr * 2)        # [2, 4, 6, 8, 10]\nprint(arr ** 2)       # [1, 4, 9, 16, 25]\nprint(np.sqrt(arr))   # [1.0, 1.41, 1.73, 2.0, 2.24]\n\n# Statistical operations\nprint(np.mean(arr))   # 3.0\nprint(np.std(arr))    # 1.41\nprint(np.max(arr))    # 5\n\n# Reshape\nreshape = np.arange(12).reshape(3, 4)\nprint(reshape)', language: 'python' },
          { id: 's3', type: 'text', title: 'Introduction to Pandas', content: 'Pandas is built on top of NumPy and provides two primary data structures: Series (one-dimensional labeled array) and DataFrame (two-dimensional labeled table). Think of a DataFrame as an Excel spreadsheet in code, where each column can have a different data type.\n\nPandas excels at data wrangling: loading data from various formats (CSV, Excel, SQL, JSON), handling missing values, filtering rows, grouping data, merging datasets, and time series analysis. It is the most important tool for data scientists working with structured data.' },
          { id: 's4', type: 'code', title: 'Pandas DataFrames', content: 'DataFrames can be created from dictionaries, lists, or loaded from files. They support powerful indexing, filtering, and transformation operations.', codeExample: 'import pandas as pd\n\n# Create DataFrame from dictionary\ndata = {\n    "Name": ["Alice", "Bob", "Charlie", "Diana"],\n    "Age": [25, 30, 35, 28],\n    "Score": [85, 92, 78, 95],\n    "Department": ["CS", "Math", "CS", "Physics"]\n}\ndf = pd.DataFrame(data)\n\n# Basic operations\nprint(df.head())          # First 5 rows\nprint(df.describe())      # Statistics\nprint(df.shape)           # (4, 4)\n\n# Filtering\ncs_students = df[df["Department"] == "CS"]\nhigh_scores = df[df["Score"] > 85]\n\n# Grouping and aggregation\ndepartment_avg = df.groupby("Department")["Score"].mean()\n\n# Adding new column\ndf["Pass"] = df["Score"] >= 60\n\n# Save to CSV\ndf.to_csv("students.csv", index=False)', language: 'python' },
          { id: 's5', type: 'code', title: 'Data Cleaning', content: 'Real-world data is messy. Pandas provides comprehensive tools for handling missing values, duplicates, incorrect types, and inconsistent formatting.', codeExample: 'import pandas as pd\n\n# Load data\ndf = pd.read_csv("messy_data.csv")\n\n# Check for missing values\nprint(df.isnull().sum())\n\n# Handle missing values\ndf["age"].fillna(df["age"].median(), inplace=True)  # Fill with median\ndf.dropna(subset=["name"], inplace=True)             # Drop rows with missing name\n\n# Remove duplicates\ndf.drop_duplicates(subset=["email"], inplace=True)\n\n# Fix data types\ndf["date"] = pd.to_datetime(df["date"])\ndf["price"] = pd.to_numeric(df["price"], errors="coerce")\n\n# String operations\ndf["name"] = df["name"].str.strip().str.title()\ndf["email"] = df["email"].str.lower()\n\n# outliers using IQR\nQ1 = df["score"].quantile(0.25)\nQ3 = df["score"].quantile(0.75)\nIQR = Q3 - Q1\ndf = df[(df["score"] >= Q1 - 1.5*IQR) & (df["score"] <= Q3 + 1.5*IQR)]', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is the main advantage of NumPy arrays over Python lists?', options: ['More readable', 'Faster element-wise operations', 'Supports more data types', 'Uses less memory'], correctIndex: 1, explanation: 'NumPy arrays are stored in contiguous memory and operations are implemented in C, making them significantly faster for mathematical computations.' },
          { id: 'q2', question: 'What does a Pandas DataFrame represent?', options: ['A single column of data', 'A two-dimensional labeled table', 'A Python dictionary', 'A visualization chart'], correctIndex: 1, explanation: 'A DataFrame is a two-dimensional labeled data structure with columns of potentially different types, similar to a spreadsheet or SQL table.' },
          { id: 'q3', question: 'How do you handle missing values in Pandas?', options: ['df.fillna() or df.dropna()', 'df.remove_null()', 'df.clean()', 'df.fix_missing()'], correctIndex: 0, explanation: 'fillna() replaces missing values with a specified value, and dropna() removes rows or columns with missing values.' },
          { id: 'q4', question: 'What method groups data by a column and applies aggregation?', options: ['df.sort()', 'df.groupby().agg()', 'df.filter()', 'df.combine()'], correctIndex: 1, explanation: 'groupby() splits data into groups, and agg() applies aggregation functions like mean, sum, or count.' }
        ]),
        resources: JSON.stringify([
          { title: 'NumPy Documentation', type: 'link', url: 'https://numpy.org/doc/' },
          { title: 'Pandas Documentation', type: 'link', url: 'https://pandas.pydata.org/docs/' },
          { title: 'Kaggle Pandas Course', type: 'link', url: 'https://www.kaggle.com/learn/pandas' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=vmEHCJofslg'
      },
      {
        internshipId: dataSci.id, title: 'Data Visualization', description: 'Create compelling visualizations using Matplotlib and Seaborn to explore patterns, trends, and distributions in data.', moduleOrder: 2, durationMinutes: 65, difficulty: 'beginner',
        topics: 'Matplotlib,Seaborn,Histograms,Scatter Plots,Heatmaps,Line Charts',
        learningObjectives: JSON.stringify(['Create basic plots with Matplotlib (line, bar, scatter, histogram)', 'Build statistical visualizations with Seaborn', 'Customize plot aesthetics including colors, labels, and themes', 'Choose the right chart type for different data analysis tasks']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Why Visualization Matters', content: 'Data visualization is the graphical representation of information and data. By using visual elements like charts, graphs, and maps, visualization tools provide an accessible way to see and understand trends, outliers, and patterns in data. Humans process visual information 60,000 times faster than text, making charts essential for data communication.\n\nThe two primary Python visualization libraries are Matplotlib (low-level, highly customizable) and Seaborn (high-level, statistically oriented, built on Matplotlib). Matplotlib gives you full control over every element of a plot, while Seaborn provides beautiful default styles and simplifies complex statistical visualizations.' },
          { id: 's2', type: 'code', title: 'Matplotlib Basics', content: 'Matplotlib creates figures and axes objects. The pyplot interface provides a MATLAB-like plotting experience for quick plots.', codeExample: 'import matplotlib.pyplot as plt\nimport numpy as np\n\n# Line chart\nx = np.linspace(0, 10, 100)\nplt.figure(figsize=(10, 6))\nplt.plot(x, np.sin(x), label="sin(x)", color="blue")\nplt.plot(x, np.cos(x), label="cos(x)", color="red")\nplt.xlabel("X axis")\nplt.ylabel("Y axis")\nplt.title("Trigonometric Functions")\nplt.legend()\nplt.grid(True, alpha=0.3)\nplt.savefig("trig_functions.png", dpi=150, bbox_inches="tight")\nplt.show()\n\n# Bar chart\ncategories = ["Python", "Java", "JS", "C++", "Go"]\nvalues = [85, 65, 75, 40, 30]\nplt.figure(figsize=(8, 5))\nplt.bar(categories, values, color=["#3498db", "#e74c3c", "#f1c40f", "#2ecc71", "#9b59b6"])\nplt.title("Programming Language Popularity")\nplt.ylabel("Popularity Score")\nplt.show()', language: 'python' },
          { id: 's3', type: 'code', title: 'Seaborn Statistical Plots', content: 'Seaborn excels at statistical visualizations. It works directly with Pandas DataFrames and automatically handles aggregation and confidence intervals.', codeExample: 'import seaborn as sns\nimport pandas as pd\n\n# Load sample dataset\ntips = sns.load_dataset("tips")\n\n# Scatter plot with regression line\nsns.lmplot(data=tips, x="total_bill", y="tip", hue="sex", height=6)\nplt.title("Tips vs Total Bill by Gender")\nplt.show()\n\n# Box plot\nplt.figure(figsize=(10, 6))\nsns.boxplot(data=tips, x="day", y="total_bill", hue="time")\nplt.title("Total Bill Distribution by Day and Time")\nplt.show()\n\n# Heatmap (correlation matrix)\nplt.figure(figsize=(8, 6))\nsns.heatmap(tips.corr(numeric_only=True), annot=True, cmap="coolwarm", center=0)\nplt.title("Feature Correlation Heatmap")\nplt.show()\n\n# Histogram with KDE\nsns.histplot(data=tips, x="total_bill", kde=True, bins=20)\nplt.title("Distribution of Total Bills")\nplt.show()', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'When should you use a scatter plot?', options: ['To show trends over time', 'To show the relationship between two continuous variables', 'To compare categories', 'To show parts of a whole'], correctIndex: 1, explanation: 'Scatter plots display the relationship between two continuous variables, showing correlation, clusters, and outliers.' },
          { id: 'q2', question: 'What library is best for statistical visualizations?', options: ['Matplotlib', 'Seaborn', 'NumPy', 'Pandas'], correctIndex: 1, explanation: 'Seaborn is built on Matplotlib and provides high-level functions for statistical visualizations like box plots, violin plots, and heatmaps.' },
          { id: 'q3', question: 'What does a heatmap show?', options: ['Time series trends', 'Correlations between variables as color intensity', 'Frequency distributions', 'Geographic data'], correctIndex: 1, explanation: 'Heatmaps use color intensity to represent values in a matrix, commonly used to visualize correlation matrices.' }
        ]),
        resources: JSON.stringify([
          { title: 'Matplotlib Gallery', type: 'link', url: 'https://matplotlib.org/stable/gallery/' },
          { title: 'Seaborn Tutorial', type: 'link', url: 'https://seaborn.pydata.org/tutorial.html' },
          { title: 'From Data to Viz', type: 'link', url: 'https://www.data-to-viz.com/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=UO98lLQ-tL8'
      },
      {
        internshipId: dataSci.id, title: 'Statistics & Probability', description: 'Master descriptive and inferential statistics, probability distributions, hypothesis testing, and A/B testing.', moduleOrder: 3, durationMinutes: 80, difficulty: 'intermediate',
        topics: 'Descriptive Stats,Probability,Distributions,Hypothesis Testing,A/B Testing,Confidence Intervals',
        learningObjectives: JSON.stringify(['Calculate measures of central tendency and dispersion', 'Understand probability rules and Bayes theorem', 'Apply hypothesis testing using t-tests and chi-square tests', 'Design and analyze A/B tests with statistical significance']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Descriptive Statistics', content: 'Descriptive statistics summarize and describe the main features of a dataset. Measures of central tendency describe the center: mean (average), median (middle value), and mode (most frequent value). Measures of spread describe variability: range (max-min), variance (average squared deviation from mean), and standard deviation (square root of variance).\n\nThe choice of measure depends on data distribution. For symmetric data without outliers, the mean is appropriate. For skewed data or data with outliers, the median is more robust. For example, when reporting average salary in a company, the median is more representative than the mean because a few very high salaries can skew the mean upward.' },
          { id: 's2', type: 'code', title: 'Statistical Calculations', content: 'Python provides statistical functions through NumPy, SciPy, and Pandas. Here are practical examples of calculating and interpreting statistics.', codeExample: 'import numpy as np\nimport pandas as pd\nfrom scipy import stats\n\n# Sample data\nscores = [85, 92, 78, 95, 88, 76, 90, 82, 91, 87]\n\n# Measures of central tendency\nmean = np.mean(scores)        # 86.4\nmedian = np.median(scores)    # 87.5\nmode_result = stats.mode(scores)\n\n# Measures of spread\nvariance = np.var(scores, ddof=1)  # Sample variance\nstd_dev = np.std(scores, ddof=1)  # Sample std dev\nrange_val = np.ptp(scores)         # Range\n\n# Percentiles and quartiles\nq1 = np.percentile(scores, 25)    # 25th percentile\nq3 = np.percentile(scores, 75)    # 75th percentile\niqr = q3 - q1                      # Interquartile range\n\n# Z-scores (standardization)\nz_scores = stats.zscore(scores)\n\n# Skewness and kurtosis\nskewness = stats.skew(scores)\nkurtosis = stats.kurtosis(scores)', language: 'python' },
          { id: 's3', type: 'text', title: 'Hypothesis Testing', content: 'Hypothesis testing is a statistical method to determine whether there is enough evidence to support a claim about a population parameter. The process involves: stating null (H0) and alternative (H1) hypotheses, choosing a significance level (alpha, typically 0.05), calculating a test statistic, and comparing it to a critical value or computing a p-value.\n\nThe p-value represents the probability of observing results as extreme as the data, assuming the null hypothesis is true. If p-value < alpha, we reject the null hypothesis (statistically significant). If p-value >= alpha, we fail to reject the null hypothesis (not statistically significant).\n\nCommon tests: t-test (compares means of two groups), chi-square test (tests independence of categorical variables), ANOVA (compares means of three or more groups).' },
          { id: 's4', type: 'code', title: 'Hypothesis Testing in Python', content: 'Here are examples of common statistical tests using SciPy.', codeExample: 'from scipy import stats\nimport numpy as np\n\n# One-sample t-test\n# Is the mean of scores significantly different from 80?\nscores = [85, 92, 78, 95, 88, 76, 90, 82, 91, 87]\nt_stat, p_value = stats.ttest_1samp(scores, 80)\nprint(f"t-statistic: {t_stat:.3f}, p-value: {p_value:.3f}")\nif p_value < 0.05:\n    print("Reject H0: Mean is significantly different from 80")\n\n# Two-sample t-test\n# Do Group A and Group B have different means?\ngroup_a = [85, 92, 78, 95, 88]\ngroup_b = [76, 90, 82, 91, 87]\nt_stat, p_value = stats.ttest_ind(group_a, group_b)\nprint(f"t-statistic: {t_stat:.3f}, p-value: {p_value:.3f}")\n\n# Chi-square test\n# Is there a relationship between gender and preferred language?\nobserved = np.array([[30, 10], [20, 40]])\nchi2, p_value, dof, expected = stats.chi2_contingency(observed)\nprint(f"Chi-square: {chi2:.3f}, p-value: {p_value:.3f}")', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'When should you use the median instead of the mean?', options: ['When data is symmetric', 'When data has outliers or is skewed', 'When you want the average', 'When sample size is large'], correctIndex: 1, explanation: 'The median is more robust to outliers and skewed data. For example, a few extremely high salaries can inflate the mean, making the median a better representation of the typical value.' },
          { id: 'q2', question: 'What does a p-value of 0.03 mean?', options: ['3% chance the null hypothesis is true', '3% probability of observing the data if null hypothesis is true', 'The result is definitely significant', 'The effect size is large'], correctIndex: 1, explanation: 'A p-value of 0.03 means there is a 3% probability of observing results as extreme as the data if the null hypothesis is true. Since 0.03 < 0.05, the result is statistically significant.' },
          { id: 'q3', question: 'What test compares means of three or more groups?', options: ['t-test', 'Chi-square test', 'ANOVA', 'Z-test'], correctIndex: 2, explanation: 'ANOVA (Analysis of Variance) tests whether there are statistically significant differences between the means of three or more independent groups.' }
        ]),
        resources: JSON.stringify([
          { title: 'Kaggle Statistics Course', type: 'link', url: 'https://www.kaggle.com/learn/intro-to-statistics' },
          { title: 'StatQuest YouTube Channel', type: 'link', url: 'https://www.youtube.com/c/joshstarmer' },
          { title: 'Scipy Stats Documentation', type: 'link', url: 'https://docs.scipy.org/doc/scipy/reference/stats.html' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=xxmc-xxR2QQ'
      },
      {
        internshipId: dataSci.id, title: 'SQL for Data Analysis', description: 'Master SQL queries, joins, subqueries, window functions, and aggregations for data analysis.', moduleOrder: 4, durationMinutes: 70, difficulty: 'intermediate',
        topics: 'SELECT,JOIN,GROUP BY,Subqueries,Window Functions,CTEs',
        learningObjectives: JSON.stringify(['Write complex SELECT queries with filtering and sorting', 'Perform INNER, LEFT, RIGHT, and FULL JOINs', 'Use window functions for running totals and rankings', 'Write CTEs and subqueries for complex analyses']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'SQL Fundamentals', content: 'SQL (Structured Query Language) is the standard language for managing and querying relational databases. For data analysts, SQL is the most important tool to master because virtually every organization stores data in SQL databases.\n\nThe core SQL operations follow the order: SELECT (choose columns), FROM (choose table), WHERE (filter rows), GROUP BY (aggregate), HAVING (filter groups), ORDER BY (sort), LIMIT (restrict rows). Understanding this order is crucial for writing correct queries.' },
          { id: 's2', type: 'code', title: 'Queries and Aggregations', content: 'SQL queries retrieve and aggregate data. Here are essential query patterns for data analysis.', codeExample: '-- Basic filtering and sorting\nSELECT name, department, salary\nFROM employees\nWHERE salary > 50000\n  AND department IN (\'Engineering\', \'Data Science\')\nORDER BY salary DESC\nLIMIT 10;\n\n-- Aggregation with GROUP BY\nSELECT \n  department,\n  COUNT(*) as employee_count,\n  ROUND(AVG(salary), 2) as avg_salary,\n  MAX(salary) as max_salary\nFROM employees\nGROUP BY department\nHAVING COUNT(*) > 5\nORDER BY avg_salary DESC;\n\n-- Date analysis\nSELECT \n  DATE_FORMAT(hire_date, \'%Y-%m\') as month,\n  COUNT(*) as new_hires\nFROM employees\nWHERE hire_date >= DATE_SUB(CURRENT_DATE, INTERVAL 1 YEAR)\nGROUP BY month\nORDER BY month;', language: 'sql' },
          { id: 's3', type: 'code', title: 'JOINs', content: 'JOINs combine data from multiple tables based on related columns. Understanding different join types is essential for working with normalized databases.', codeExample: '-- INNER JOIN: Only matching rows from both tables\nSELECT e.name, d.department_name, e.salary\nFROM employees e\nINNER JOIN departments d ON e.dept_id = d.id;\n\n-- LEFT JOIN: All rows from left table + matching from right\nSELECT e.name, d.department_name\nFROM employees e\nLEFT JOIN departments d ON e.dept_id = d.id;\n\n-- Window Functions (advanced analytics)\nSELECT \n  name,\n  department,\n  salary,\n  RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dept_rank,\n  SUM(salary) OVER (PARTITION BY department) as dept_total_salary,\n  AVG(salary) OVER () as company_avg_salary\nFROM employees;\n\n-- CTE (Common Table Expression)\nWITH high_earners AS (\n  SELECT name, department, salary\n  FROM employees\n  WHERE salary > 80000\n)\nSELECT department, COUNT(*) as count\nFROM high_earners\nGROUP BY department;', language: 'sql' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is the difference between WHERE and HAVING?', options: ['No difference', 'WHERE filters rows, HAVING filters groups', 'WHERE is faster', 'HAVING is for numeric data only'], correctIndex: 1, explanation: 'WHERE filters individual rows before grouping. HAVING filters groups after GROUP BY aggregation. HAVING can use aggregate functions, WHERE cannot.' },
          { id: 'q2', question: 'Which JOIN returns all rows from both tables?', options: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'], correctIndex: 3, explanation: 'FULL OUTER JOIN returns all rows from both tables. Where there is no match, NULL values fill the missing columns.' },
          { id: 'q3', question: 'What does RANK() OVER do?', options: ['Assigns a unique number to each row', 'Ranks rows within partitions', 'Counts rows', 'Sorts the table'], correctIndex: 1, explanation: 'RANK() OVER assigns a rank to each row within a partition. Rows with the same value get the same rank, and the next rank is skipped.' }
        ]),
        resources: JSON.stringify([
          { title: 'SQLBolt Interactive Tutorial', type: 'link', url: 'https://sqlbolt.com/' },
          { title: 'LeetCode SQL Practice', type: 'link', url: 'https://leetcode.com/problemset/database/' },
          { title: 'Mode Analytics SQL Tutorial', type: 'link', url: 'https://mode.com/sql-tutorial/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=HXV3zeQKqGY'
      },
      {
        internshipId: dataSci.id, title: 'Machine Learning Basics', description: 'Introduction to machine learning concepts, supervised learning algorithms, model evaluation, and scikit-learn.', moduleOrder: 5, durationMinutes: 90, difficulty: 'advanced',
        topics: 'Regression,Classification,Train/Test Split,Cross Validation,Random Forest,Decision Trees',
        learningObjectives: JSON.stringify(['Understand the difference between supervised and unsupervised learning', 'Build regression and classification models with scikit-learn', 'Evaluate models using accuracy, precision, recall, and F1-score', 'Apply train/test split and cross-validation to prevent overfitting']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'What is Machine Learning?', content: 'Machine Learning is a subset of artificial intelligence that enables computers to learn from data and make predictions without being explicitly programmed. Instead of writing rules, you feed data to algorithms that learn patterns automatically.\n\nThe three main types of ML are: Supervised Learning (labeled data, e.g., predicting house prices), Unsupervised Learning (no labels, e.g., customer segmentation), and Reinforcement Learning (learning through trial and error, e.g., game playing). Supervised learning is the most common and is divided into Regression (predicting continuous values) and Classification (predicting categories).' },
          { id: 's2', type: 'code', title: 'Building a Classification Model', content: 'Here is a complete workflow for building a machine learning model using scikit-learn, from data loading to evaluation.', codeExample: 'from sklearn.model_selection import train_test_split\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.metrics import accuracy_score, classification_report\nfrom sklearn.preprocessing import StandardScaler\nimport pandas as pd\n\n# Load data\ndf = pd.read_csv("titanic.csv")\n\n# Feature engineering\nfeatures = ["Pclass", "Age", "SibSp", "Parch", "Fare"]\nX = df[features].fillna(df[features].median())\ny = df["Survived"]\n\n# Split data (80% train, 20% test)\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.2, random_state=42, stratify=y\n)\n\n# Scale features\nscaler = StandardScaler()\nX_train = scaler.fit_transform(X_train)\nX_test = scaler.transform(X_test)\n\n# Train model\nmodel = RandomForestClassifier(n_estimators=100, random_state=42)\nmodel.fit(X_train, y_train)\n\n# Predict and evaluate\ny_pred = model.predict(X_test)\nprint(f"Accuracy: {accuracy_score(y_test, y_pred):.3f}")\nprint(classification_report(y_test, y_pred))', language: 'python' },
          { id: 's3', type: 'text', title: 'Model Evaluation', content: 'Evaluating a model properly is crucial to ensure it generalizes to unseen data. Never evaluate on the same data used for training.\n\nKey metrics for classification: Accuracy (correct predictions / total), Precision (true positives / predicted positives), Recall (true positives / actual positives), F1-score (harmonic mean of precision and recall). For imbalanced datasets, accuracy can be misleading, so focus on precision, recall, and F1.\n\nKey metrics for regression: MAE (Mean Absolute Error), MSE (Mean Squared Error), RMSE (Root Mean Squared Error), R-squared (proportion of variance explained). Cross-validation (k-fold) provides a more robust estimate of model performance by training and evaluating on different subsets of the data.' },
          { id: 's4', type: 'code', title: 'Cross-Validation and Hyperparameter Tuning', content: 'Cross-validation splits data into k folds, training on k-1 folds and testing on the remaining fold. This gives a more reliable performance estimate.', codeExample: 'from sklearn.model_selection import cross_val_score, GridSearchCV\nfrom sklearn.ensemble import RandomForestClassifier\n\n# Cross-validation\nmodel = RandomForestClassifier(n_estimators=100, random_state=42)\nscores = cross_val_score(model, X, y, cv=5, scoring="accuracy")\nprint(f"CV Accuracy: {scores.mean():.3f} (+/- {scores.std():.3f})")\n\n# Hyperparameter tuning with GridSearchCV\nparam_grid = {\n    "n_estimators": [50, 100, 200],\n    "max_depth": [5, 10, 20, None],\n    "min_samples_split": [2, 5, 10]\n}\n\ngrid_search = GridSearchCV(\n    RandomForestClassifier(random_state=42),\n    param_grid, cv=5, scoring="accuracy", n_jobs=-1\n)\ngrid_search.fit(X_train, y_train)\nprint(f"Best params: {grid_search.best_params_}")\nprint(f"Best accuracy: {grid_search.best_score_:.3f}")', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is the difference between supervised and unsupervised learning?', options: ['Supervised uses more data', 'Supervised uses labeled data, unsupervised does not', 'Unsupervised is more accurate', 'Supervised is faster'], correctIndex: 1, explanation: 'Supervised learning uses labeled data (input-output pairs) to train models. Unsupervised learning finds patterns in data without predefined labels.' },
          { id: 'q2', question: 'Why do we split data into training and test sets?', options: ['To make training faster', 'To evaluate how well the model generalizes to unseen data', 'To reduce the dataset size', 'To balance classes'], correctIndex: 1, explanation: 'The test set simulates unseen data. Evaluating on the test set gives an unbiased estimate of how the model will perform in production.' },
          { id: 'q3', question: 'What is cross-validation?', options: ['Using multiple models at once', 'Training and testing on different data folds for robust evaluation', 'Splitting data into two sets', 'Tuning model parameters'], correctIndex: 1, explanation: 'Cross-validation splits data into k folds, trains on k-1 folds, and tests on the remaining fold, rotating through all folds for a robust performance estimate.' }
        ]),
        resources: JSON.stringify([
          { title: 'Scikit-learn Documentation', type: 'link', url: 'https://scikit-learn.org/stable/' },
          { title: 'Kaggle Intro to ML Course', type: 'link', url: 'https://www.kaggle.com/learn/intro-to-machine-learning' },
          { title: 'StatQuest ML Playlist', type: 'link', url: 'https://www.youtube.com/playlist?list=PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=GwIo3gDZCVQ'
      },
      {
        internshipId: dataSci.id, title: 'Data Storytelling & Capstone', description: 'Combine analysis and visualization to tell compelling data stories, and complete a capstone project.', moduleOrder: 6, durationMinutes: 90, difficulty: 'advanced',
        topics: 'Data Storytelling,Presentation,Report Generation,Capstone Project',
        learningObjectives: JSON.stringify(['Structure a data analysis narrative with clear insights', 'Create interactive dashboards and reports', 'Present findings to non-technical stakeholders', 'Complete an end-to-end data science project']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Data Storytelling', content: 'Data storytelling is the ability to effectively communicate insights from data analysis through a compelling narrative. It bridges the gap between technical analysis and business decision-making. A good data story has three components: the data (evidence), the visuals (charts and graphs), and the narrative (context and explanation).\n\nThe structure of a data story follows: 1) Context - what problem are we solving? 2) Discovery - what did we find? 3) Insight - why does it matter? 4) Action - what should we do next? Always start with the conclusion, then support it with evidence. Avoid jargon when presenting to non-technical audiences.' },
          { id: 's2', type: 'text', title: 'Capstone Project Guidelines', content: 'A capstone project demonstrates everything you have learned. Choose a real dataset, ask interesting questions, perform thorough analysis, build visualizations, and present actionable insights.\n\nSteps: 1) Choose a dataset (Kaggle, UCI ML Repository, or government open data). 2) Define 3-5 research questions. 3) Clean and prepare the data. 4) Perform exploratory data analysis (EDA). 5) Build visualizations for each insight. 6) If applicable, build a predictive model. 7) Write a report or create a presentation.\n\nExample projects: Analyze movie ratings to find what makes a successful film, explore COVID-19 data to identify trends and correlations, analyze customer churn data to predict which customers will leave, or explore housing prices to identify the most influential factors.' },
          { id: 's3', type: 'code', title: 'Report Generation with Python', content: 'Automate report generation using Python to create professional PDF or HTML reports from your analysis.', codeExample: 'import pandas as pd\nimport matplotlib.pyplot as plt\nfrom datetime import datetime\n\n# Create analysis summary\ndef generate_report(data_path):\n    df = pd.read_csv(data_path)\n    \n    report = []\n    report.append("# Data Analysis Report")\n    report.append(f"Generated: {datetime.now().strftime(\'%Y-%m-%d %H:%M\')}")\n    report.append(f"\\n## Dataset Overview")\n    report.append(f"- Records: {len(df)}")\n    report.append(f"- Features: {len(df.columns)}")\n    report.append(f"\\n## Key Statistics")\n    report.append(df.describe().to_markdown())\n    \n    # Save charts\n    for col in df.select_dtypes(include=\'number\').columns:\n        fig, axes = plt.subplots(1, 2, figsize=(12, 4))\n        df[col].hist(bins=30, ax=axes[0])\n        axes[0].set_title(f"{col} Distribution")\n        df.boxplot(column=col, ax=axes[1])\n        axes[1].set_title(f"{col} Box Plot")\n        plt.tight_layout()\n        plt.savefig(f"chart_{col}.png")\n        plt.close()\n    \n    return "\\n".join(report)', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What are the three components of a data story?', options: ['Code, data, model', 'Data, visuals, narrative', 'Charts, tables, text', 'Analysis, conclusion, recommendation'], correctIndex: 1, explanation: 'A data story combines data (evidence), visuals (charts/graphs), and narrative (context/explanation) to communicate insights effectively.' },
          { id: 'q2', question: 'When presenting to non-technical stakeholders, you should:', options: ['Show all your code', 'Use technical jargon to sound credible', 'Start with conclusions, then support with evidence', 'Focus on model complexity'], correctIndex: 2, explanation: 'Start with the key insight or conclusion, then support it with relevant evidence. Avoid jargon and focus on actionable insights.' }
        ]),
        resources: JSON.stringify([
          { title: 'Storytelling with Data Blog', type: 'link', url: 'https://www.storytellingwithdata.com/' },
          { title: 'Kaggle Datasets', type: 'link', url: 'https://www.kaggle.com/datasets' },
          { title: 'Streamlit for Dashboards', type: 'link', url: 'https://streamlit.io/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=9M7gPNI3CMA'
      }
    );
  }

  // ========== AI & ML TRACK (6 modules) ==========
  if (aiMl) {
    learningModules.push(
      {
        internshipId: aiMl.id, title: 'Python for AI', description: 'Master Python programming essentials for AI development including data structures, OOP, and libraries.', moduleOrder: 1, durationMinutes: 60, difficulty: 'beginner',
        topics: 'Python,OOP,Data Structures,Libraries,Virtual Environments',
        learningObjectives: JSON.stringify(['Write clean Python code with proper OOP design', 'Use list comprehensions, generators, and decorators', 'Manage Python packages with pip and virtual environments', 'Understand Python memory management and performance']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Python for AI Overview', content: 'Python is the dominant language in AI and machine learning due to its simplicity, readability, and vast ecosystem of scientific libraries. Before diving into AI-specific tools, you need strong Python fundamentals including object-oriented programming, data structures, and the standard library.\n\nKey Python concepts for AI include: decorators (modifying function behavior), context managers (resource management), generators (memory-efficient iteration), type hints (code documentation), and async programming (handling concurrent I/O). These features help write clean, maintainable, and efficient AI code.' },
          { id: 's2', type: 'code', title: 'Advanced Python Features', content: 'These Python features are commonly used in AI codebases for cleaner, more efficient code.', codeExample: '# Decorators - modify function behavior\ndef timer(func):\n    import time\n    def wrapper(*args, **kwargs):\n        start = time.time()\n        result = func(*args, **kwargs)\n        print(f"{func.__name__} took {time.time()-start:.2f}s")\n        return result\n    return wrapper\n\n@timer\ndef train_model(data):\n    # Training logic here\n    pass\n\n# Generators - memory efficient\ndef batch_generator(data, batch_size=32):\n    for i in range(0, len(data), batch_size):\n        yield data[i:i+batch_size]\n\n# Context managers\nclass ModelLoader:\n    def __enter__(self):\n        self.model = load_model("path")\n        return self.model\n    def __exit__(self, *args):\n        self.model.close()\n\nwith ModelLoader() as model:\n    predictions = model.predict(data)', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'Why is Python popular for AI?', options: ['It is the fastest language', 'Simplicity and extensive ML libraries', 'It runs in browsers', 'It requires no installation'], correctIndex: 1, explanation: 'Python combines readable syntax with a massive ecosystem of AI/ML libraries like TensorFlow, PyTorch, and scikit-learn.' },
          { id: 'q2', question: 'What is a decorator in Python?', options: ['A type of variable', 'A function that modifies another function behavior', 'A class method', 'A loop construct'], correctIndex: 1, explanation: 'Decorators are functions that wrap other functions to add functionality without modifying the original function code.' }
        ]),
        resources: JSON.stringify([
          { title: 'Python for AI - FreeCodeCamp', type: 'link', url: 'https://www.freecodecamp.org/' },
          { title: 'Google Python Style Guide', type: 'link', url: 'https://google.github.io/styleguide/pyguide.html' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=rfscVS0vtbw'
      },
      {
        internshipId: aiMl.id, title: 'Machine Learning Fundamentals', description: 'Learn core ML algorithms, model training, evaluation, and the scikit-learn ecosystem.', moduleOrder: 2, durationMinutes: 90, difficulty: 'intermediate',
        topics: 'Regression,Classification,Clustering,Model Evaluation,Feature Engineering',
        learningObjectives: JSON.stringify(['Implement linear regression, logistic regression, and decision trees', 'Apply feature scaling, encoding, and selection techniques', 'Evaluate models using confusion matrix, ROC-AUC, and cross-validation', 'Tune hyperparameters using grid search and random search']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'ML Algorithm Types', content: 'Machine learning algorithms are categorized by how they learn from data. Supervised learning uses labeled data to learn input-output mappings: Regression predicts continuous values (house prices), Classification predicts categories (spam/not spam). Unsupervised learning finds hidden patterns: Clustering groups similar data (customer segmentation), Dimensionality Reduction simplifies features (PCA). Semi-supervised learning uses a mix of labeled and unlabeled data.\n\nThe machine learning workflow: 1) Collect and clean data, 2) Explore and visualize, 3) Feature engineer and select, 4) Split into train/test sets, 5) Train multiple models, 6) Evaluate and compare, 7) Tune best model, 8) Deploy.' },
          { id: 's2', type: 'code', title: 'Complete ML Pipeline', content: 'A production-ready ML pipeline includes data preprocessing, model training, evaluation, and prediction.', codeExample: 'from sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler, LabelEncoder\nfrom sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import train_test_split, cross_val_score\nfrom sklearn.metrics import classification_report, confusion_matrix\nimport pandas as pd\n\n# Load and prepare data\ndf = pd.read_csv("customer_data.csv")\nX = df.drop("churn", axis=1)\ny = df["churn"]\n\n# Encode categorical variables\nle = LabelEncoder()\nfor col in X.select_dtypes(include="object").columns:\n    X[col] = le.fit_transform(X[col])\n\n# Split data\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.2, random_state=42, stratify=y\n)\n\n# Compare multiple models\nmodels = {\n    "Logistic Regression": LogisticRegression(max_iter=1000),\n    "Random Forest": RandomForestClassifier(n_estimators=100),\n    "Gradient Boosting": GradientBoostingClassifier(n_estimators=100)\n}\n\nfor name, model in models.items():\n    scores = cross_val_score(model, X_train, y_train, cv=5)\n    print(f"{name}: {scores.mean():.3f} (+/- {scores.std():.3f})")', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is the difference between regression and classification?', options: ['Regression is faster', 'Regression predicts continuous values, classification predicts categories', 'Classification uses more data', 'They are the same thing'], correctIndex: 1, explanation: 'Regression predicts continuous numerical values (like house prices), while classification predicts discrete categories (like spam/not spam).' },
          { id: 'q2', question: 'What does a confusion matrix show?', options: ['Model training time', 'True positives, false positives, true negatives, false negatives', 'Data distribution', 'Feature importance'], correctIndex: 1, explanation: 'A confusion matrix shows the counts of true positives, false positives, true negatives, and false negatives, providing a detailed view of classification performance.' }
        ]),
        resources: JSON.stringify([
          { title: 'Scikit-learn Tutorials', type: 'link', url: 'https://scikit-learn.org/stable/tutorial/' },
          { title: 'Kaggle ML Course', type: 'link', url: 'https://www.kaggle.com/learn/intro-to-machine-learning' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=GwIo3gDZCVQ'
      },
      {
        internshipId: aiMl.id, title: 'Deep Learning with Neural Networks', description: 'Build neural networks using TensorFlow/Keras, understand backpropagation, and train models on GPUs.', moduleOrder: 3, durationMinutes: 90, difficulty: 'advanced',
        topics: 'Neural Networks,TensorFlow,Keras,Backpropagation,Activation Functions,GPU Training',
        learningObjectives: JSON.stringify(['Build feedforward neural networks with Keras', 'Understand backpropagation and gradient descent', 'Apply regularization techniques (dropout, batch normalization)', 'Train and evaluate deep learning models on image data']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Neural Network Basics', content: 'Neural networks are computing systems inspired by biological neural networks in the brain. They consist of layers of interconnected nodes (neurons) that process information. Each connection has a weight that is adjusted during training.\n\nArchitecture: Input layer (receives features), Hidden layers (process information), Output layer (produces predictions). Each neuron applies a weighted sum of inputs, adds a bias, and passes the result through an activation function. Common activation functions: ReLU (hidden layers), Sigmoid (binary output), Softmax (multi-class output).\n\nTraining uses backpropagation: forward pass computes predictions, loss function measures error, and backward pass adjusts weights using gradient descent to minimize the loss.' },
          { id: 's2', type: 'code', title: 'Building a Neural Network', content: 'Here is a complete example of building, training, and evaluating a neural network for image classification.', codeExample: 'import tensorflow as tf\nfrom tensorflow.keras import layers, models\nfrom tensorflow.keras.datasets import mnist\n\n# Load MNIST dataset\n(X_train, y_train), (X_test, y_test) = mnist.load_data()\nX_train = X_train.reshape(-1, 28, 28, 1).astype("float32") / 255.0\nX_test = X_test.reshape(-1, 28, 28, 1).astype("float32") / 255.0\n\n# Build model\nmodel = models.Sequential([\n    layers.Conv2D(32, (3, 3), activation="relu", input_shape=(28, 28, 1)),\n    layers.MaxPooling2D((2, 2)),\n    layers.Conv2D(64, (3, 3), activation="relu"),\n    layers.MaxPooling2D((2, 2)),\n    layers.Flatten(),\n    layers.Dropout(0.5),\n    layers.Dense(128, activation="relu"),\n    layers.Dense(10, activation="softmax")\n])\n\n# Compile\nmodel.compile(\n    optimizer="adam",\n    loss="sparse_categorical_crossentropy",\n    metrics=["accuracy"]\n)\n\n# Train\nhistory = model.fit(\n    X_train, y_train,\n    epochs=10,\n    batch_size=32,\n    validation_split=0.2\n)\n\n# Evaluate\ntest_loss, test_acc = model.evaluate(X_test, y_test)\nprint(f"Test accuracy: {test_acc:.4f}")', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is the purpose of an activation function?', options: ['To speed up training', 'To introduce non-linearity into the network', 'To reduce overfitting', 'To normalize data'], correctIndex: 1, explanation: 'Activation functions introduce non-linearity, allowing neural networks to learn complex patterns. Without them, a neural network would be equivalent to a linear model.' },
          { id: 'q2', question: 'What is dropout in neural networks?', options: ['Removing data', 'Randomly deactivating neurons during training to prevent overfitting', 'A type of layer', 'A loss function'], correctIndex: 1, explanation: 'Dropout randomly sets a fraction of neurons to zero during training, preventing the network from relying too heavily on any single neuron and reducing overfitting.' }
        ]),
        resources: JSON.stringify([
          { title: 'TensorFlow Tutorials', type: 'link', url: 'https://www.tensorflow.org/tutorials' },
          { title: 'Deep Learning Book (Free)', type: 'link', url: 'https://www.deeplearningbook.org/' },
          { title: 'fast.ai Course', type: 'link', url: 'https://course.fast.ai/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=aircAruvnKk'
      },
      {
        internshipId: aiMl.id, title: 'Natural Language Processing', description: 'Process and analyze text data using NLP techniques, transformers, and pre-trained language models.', moduleOrder: 4, durationMinutes: 85, difficulty: 'advanced',
        topics: 'Text Processing,Tokenization,Word Embeddings,Transformers,BERT,GPT',
        learningObjectives: JSON.stringify(['Preprocess text data with tokenization and stemming/lemmatization', 'Build text classification models', 'Use pre-trained transformers for NLP tasks', 'Implement sentiment analysis and named entity recognition']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'NLP Fundamentals', content: 'Natural Language Processing (NLP) enables computers to understand, interpret, and generate human language. NLP tasks include text classification, sentiment analysis, named entity recognition, machine translation, and text generation.\n\nText preprocessing steps: 1) Lowercasing, 2) Removing punctuation and special characters, 3) Tokenization (splitting text into words/tokens), 4) Stop word removal (removing common words like "the", "is"), 5) Stemming/Lemmatization (reducing words to root form).\n\nModern NLP uses transformer models (BERT, GPT) that understand context through self-attention mechanisms, dramatically outperforming older approaches based on word frequency or simple embeddings.' },
          { id: 's2', type: 'code', title: 'Text Classification with Transformers', content: 'Use Hugging Face transformers library to build NLP models with state-of-the-art pre-trained models.', codeExample: 'from transformers import pipeline\nfrom transformers import AutoTokenizer, AutoModelForSequenceClassification\nfrom transformers import Trainer, TrainingArguments\n\n# Quick sentiment analysis with pipeline\nsentiment_analyzer = pipeline("sentiment-analysis")\nresult = sentiment_analyzer("I love this product! It is amazing.")\nprint(result)  # [{\'label\': \'POSITIVE\', \'score\': 0.9998}]\n\n# Named Entity Recognition\nner = pipeline("ner", aggregation_strategy="simple")\nentities = ner("Elon Musk founded Tesla in Palo Alto.")\nfor ent in entities:\n    print(f"{ent[\'word\']}: {ent[\'entity_group\']}")\n\n# Text generation\ngenerator = pipeline("text-generation", model="gpt2")\noutput = generator("The future of AI is", max_length=50, num_return_sequences=1)\nprint(output[0]["generated_text"])', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What are transformers in NLP?', options: ['A type of neural network architecture using self-attention', 'Data preprocessing tools', 'Visualization libraries', 'Database systems'], correctIndex: 0, explanation: 'Transformers use self-attention mechanisms to process all tokens in parallel, capturing long-range dependencies and context more effectively than older architectures like RNNs.' },
          { id: 'q2', question: 'What is tokenization?', options: ['Removing stop words', 'Splitting text into individual tokens (words/subwords)', 'Converting numbers to text', 'Translating between languages'], correctIndex: 1, explanation: 'Tokenization splits text into smaller units called tokens, which can be words, subwords, or characters, for processing by NLP models.' }
        ]),
        resources: JSON.stringify([
          { title: 'Hugging Face Course', type: 'link', url: 'https://huggingface.co/course/chapter1' },
          { title: 'NLP with Python', type: 'link', url: 'https://www.nltk.org/book/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=SZorAJ1niag'
      },
      {
        internshipId: aiMl.id, title: 'Computer Vision', description: 'Process images and video using CNNs, object detection, image segmentation, and OpenCV.', moduleOrder: 5, durationMinutes: 85, difficulty: 'advanced',
        topics: 'CNNs,Object Detection,Image Segmentation,OpenCV,Data Augmentation',
        learningObjectives: JSON.stringify(['Build image classification models with CNNs', 'Apply data augmentation to improve model robustness', 'Use pre-trained models for transfer learning', 'Process images with OpenCV for preprocessing']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Computer Vision Overview', content: 'Computer Vision is a field of AI that enables computers to interpret and understand visual information from images and videos. Key tasks include: Image Classification (what is in the image?), Object Detection (where are objects?), Semantic Segmentation (which pixels belong to which class?), and Image Generation (creating new images).\n\nConvolutional Neural Networks (CNNs) are the foundation of modern computer vision. They use convolutional layers to automatically learn spatial features (edges, textures, shapes) from images. Pooling layers reduce spatial dimensions, and fully connected layers make final predictions. Pre-trained models (ResNet, VGG, EfficientNet) trained on millions of images can be fine-tuned for specific tasks with relatively little data (transfer learning).' },
          { id: 's2', type: 'code', title: 'Image Classification with CNN', content: 'Build a CNN for image classification with data augmentation and transfer learning.', codeExample: 'import tensorflow as tf\nfrom tensorflow.keras import layers, models\nfrom tensorflow.keras.applications import ResNet50\n\n# Data augmentation\ndata_augmentation = tf.keras.Sequential([\n    layers.RandomFlip("horizontal"),\n    layers.RandomRotation(0.2),\n    layers.RandomZoom(0.2),\n    layers.RandomContrast(0.2)\n])\n\n# Transfer learning with ResNet50\nbase_model = ResNet50(weights="imagenet", include_top=False, input_shape=(224, 224, 3))\nbase_model.trainable = False  # Freeze base model\n\nmodel = models.Sequential([\n    data_augmentation,\n    layers.Rescaling(1./255),\n    base_model,\n    layers.GlobalAveragePooling2D(),\n    layers.Dropout(0.3),\n    layers.Dense(256, activation="relu"),\n    layers.Dense(num_classes, activation="softmax")\n])\n\nmodel.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])\nmodel.fit(train_data, epochs=10, validation_data=val_data)', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What does a CNN learn automatically?', options: ['Database queries', 'Visual features like edges, textures, and shapes', 'Text patterns', 'Audio frequencies'], correctIndex: 1, explanation: 'CNNs automatically learn hierarchical visual features: early layers detect edges and textures, middle layers detect parts, and deeper layers detect whole objects.' },
          { id: 'q2', question: 'What is transfer learning?', options: ['Moving data between databases', 'Using a pre-trained model as a starting point for a new task', 'Transferring files between computers', 'Learning multiple languages'], correctIndex: 1, explanation: 'Transfer learning uses a model pre-trained on a large dataset as a starting point, then fine-tunes it for a specific task with less data.' }
        ]),
        resources: JSON.stringify([
          { title: 'CS231n (Stanford CV Course)', type: 'link', url: 'https://cs231n.stanford.edu/' },
          { title: 'OpenCV Documentation', type: 'link', url: 'https://docs.opencv.org/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=aircAruvnKk'
      },
      {
        internshipId: aiMl.id, title: 'Model Deployment & MLOps', description: 'Deploy ML models to production, build APIs, monitor performance, and manage ML pipelines.', moduleOrder: 6, durationMinutes: 80, difficulty: 'advanced',
        topics: 'Model Serving,Flask API,Docker,Model Monitoring,A/B Testing,MLflow',
        learningObjectives: JSON.stringify(['Package ML models as REST APIs using Flask/FastAPI', 'Containerize applications with Docker', 'Monitor model performance and detect drift', 'Track experiments and model versions with MLflow']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Why Deployment Matters', content: 'A machine learning model is only valuable when it produces predictions in production. Model deployment is the process of integrating a trained model into a production environment where it can receive input data and return predictions in real-time.\n\nKey challenges: Latency (predictions must be fast), Scalability (handling many concurrent requests), Monitoring (detecting when model performance degrades), and Reproducibility (recreating the exact environment). MLOps combines machine learning with DevOps practices to address these challenges systematically.\n\nDeployment options: REST API (Flask/FastAPI), serverless functions (AWS Lambda), batch prediction (scheduled jobs), edge deployment (running on mobile/IoT devices).' },
          { id: 's2', type: 'code', title: 'Deploying with Flask', content: 'Here is a complete example of serving an ML model as a REST API.', codeExample: 'from flask import Flask, request, jsonify\nimport joblib\nimport numpy as np\n\napp = Flask(__name__)\n\n# Load trained model\nmodel = joblib.load("model.pkl")\nscaler = joblib.load("scaler.pkl")\n\n@app.route("/predict", methods=["POST"])\ndef predict():\n    data = request.get_json()\n    features = np.array(data["features"]).reshape(1, -1)\n    features_scaled = scaler.transform(features)\n    prediction = model.predict(features_scaled)\n    probability = model.predict_proba(features_scaled)\n    \n    return jsonify({\n        "prediction": int(prediction[0]),\n        "confidence": float(max(probability[0])),\n        "probabilities": probability[0].tolist()\n    })\n\n@app.route("/health")\ndef health():\n    return jsonify({"status": "healthy", "model_loaded": True})\n\nif __name__ == "__main__":\n    app.run(host="0.0.0.0", port=5000)', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is MLOps?', options: ['A type of ML algorithm', 'Combining ML with DevOps practices for production deployment', 'A Python library', 'A data cleaning tool'], correctIndex: 1, explanation: 'MLOps applies DevOps principles to machine learning, covering model deployment, monitoring, versioning, and lifecycle management.' },
          { id: 'q2', question: 'Why is model monitoring important?', options: ['To make models faster', 'To detect when model performance degrades over time (model drift)', 'To train new models', 'To store data'], correctIndex: 1, explanation: 'Model monitoring tracks prediction quality over time, detecting data drift (input distribution changes) and concept drift (relationship changes) that degrade performance.' }
        ]),
        resources: JSON.stringify([
          { title: 'MLflow Documentation', type: 'link', url: 'https://mlflow.org/docs/latest/' },
          { title: 'FastAPI for ML', type: 'link', url: 'https://fastapi.tiangolo.com/' },
          { title: 'Docker for Data Science', type: 'link', url: 'https://docker-curriculum.com/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=hmkF76FbYI0'
      }
    );
  }

  // ========== CYBERSECURITY TRACK (6 modules) ==========
  if (cyber) {
    learningModules.push(
      {
        internshipId: cyber.id, title: 'Networking Fundamentals', description: 'Learn TCP/IP, DNS, HTTP/S, network protocols, and how data flows across the internet.', moduleOrder: 1, durationMinutes: 65, difficulty: 'beginner',
        topics: 'TCP/IP,DNS,HTTP/S,OSI Model,Ports,Firewalls',
        learningObjectives: JSON.stringify(['Understand the OSI model and TCP/IP stack', 'Explain how DNS resolution and HTTP requests work', 'Identify common network ports and their services', 'Configure basic firewall rules']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'The OSI Model', content: 'The OSI (Open Systems Interconnection) model is a conceptual framework that describes how data moves from one application to another over a network. It has 7 layers, each with specific functions:\n\n7. Application Layer - User-facing protocols (HTTP, FTP, SMTP, DNS)\n6. Presentation Layer - Data formatting and encryption (SSL/TLS)\n5. Session Layer - Managing connections between applications\n4. Transport Layer - End-to-end communication (TCP, UDP)\n3. Network Layer - Routing and IP addressing (IP, ICMP)\n2. Data Link Layer - Physical addressing (MAC addresses, Ethernet)\n1. Physical Layer - Hardware transmission (cables, radio waves)\n\nThe TCP/IP model is a practical simplification with 4 layers: Network Interface, Internet (IP), Transport (TCP/UDP), and Application (HTTP, DNS).' },
          { id: 's2', type: 'text', title: 'TCP vs UDP', content: 'TCP (Transmission Control Protocol) and UDP (User Datagram Protocol) are the two main transport layer protocols. TCP is connection-oriented, reliable, and ordered: it establishes a connection with a three-way handshake, ensures all packets arrive, and reorders out-of-sequence packets. TCP is used for HTTP, SSH, FTP, and email.\n\nUDP is connectionless, faster, and unreliable: it sends packets without establishing a connection and does not guarantee delivery or ordering. UDP is used for DNS lookups, video streaming, online gaming, and VoIP where speed matters more than reliability.' },
          { id: 's3', type: 'text', title: 'DNS and HTTP', content: 'DNS (Domain Name System) translates domain names (google.com) to IP addresses (142.250.80.46). When you type a URL, your browser: 1) checks local DNS cache, 2) queries the recursive resolver, 3) the resolver queries root servers, then TLD servers (.com), then authoritative servers, 4) returns the IP address.\n\nHTTP (HyperText Transfer Protocol) is the foundation of web communication. HTTPS adds TLS encryption. HTTP uses methods: GET (retrieve), POST (create), PUT (update), DELETE (remove). Each request includes headers (metadata), and responses include status codes: 200 (OK), 301 (redirect), 404 (not found), 500 (server error).' },
          { id: 's4', type: 'code', title: 'Network Scanning with Python', content: 'Use Python for basic network reconnaissance and port scanning.', codeExample: 'import socket\n\ndef scan_ports(target, ports):\n    """Simple port scanner"""\n    open_ports = []\n    for port in ports:\n        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\n        sock.settimeout(1)\n        result = sock.connect_ex((target, port))\n        if result == 0:\n            open_ports.append(port)\n            print(f"Port {port}: OPEN")\n        sock.close()\n    return open_ports\n\n# Scan common ports\ncommon_ports = [21, 22, 25, 53, 80, 443, 8080, 8443]\nscan_ports("127.0.0.1", common_ports)\n\n# DNS lookup\ndef dns_lookup(domain):\n    try:\n        ip = socket.gethostbyname(domain)\n        print(f"{domain} -> {ip}")\n        return ip\n    except socket.gaierror:\n        print(f"Could not resolve {domain}")\n\ndns_lookup("google.com")', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'Which layer of the OSI model handles IP addressing?', options: ['Transport', 'Network', 'Data Link', 'Application'], correctIndex: 1, explanation: 'The Network layer (Layer 3) handles IP addressing and routing, determining the best path for data to travel across networks.' },
          { id: 'q2', question: 'What is the three-way handshake in TCP?', options: ['SYN, SYN-ACK, ACK', 'GET, POST, PUT', 'Request, Response, Confirm', 'Connect, Transfer, Disconnect'], correctIndex: 0, explanation: 'The TCP three-way handshake: client sends SYN, server responds with SYN-ACK, client confirms with ACK, establishing a reliable connection.' },
          { id: 'q3', question: 'What port does HTTPS typically use?', options: ['80', '443', '8080', '22'], correctIndex: 1, explanation: 'HTTPS uses port 443 by default. HTTP uses port 80, SSH uses port 22, and 8080 is commonly used for development servers.' }
        ]),
        resources: JSON.stringify([
          { title: 'Cisco Networking Basics', type: 'link', url: 'https://www.netacad.com/courses/packet-tracer' },
          { title: 'Cybrary Free Courses', type: 'link', url: 'https://www.cybrary.it/' },
          { title: 'Wireshark Documentation', type: 'link', url: 'https://www.wireshark.org/docs/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=qiQR5rdaGmY'
      },
      {
        internshipId: cyber.id, title: 'Linux & Command Line', description: 'Master Linux commands, file system navigation, user management, permissions, and shell scripting.', moduleOrder: 2, durationMinutes: 60, difficulty: 'beginner',
        topics: 'Linux Commands,File System,Permissions,Users,Shell Scripting',
        learningObjectives: JSON.stringify(['Navigate the Linux file system and manage files with commands', 'Manage users and groups with proper permissions', 'Write basic shell scripts for automation', 'Use text processing tools like grep, sed, and awk']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Why Linux for Security', content: 'Linux is the dominant operating system in cybersecurity because of its open-source nature, security features, and prevalence in servers and networking equipment. Most security tools (Nmap, Metasploit, Wireshark, Kali Linux) run on Linux.\n\nLinux security features include: file permissions (read/write/execute for owner/group/others), process isolation, SELinux (mandatory access control), iptables/nftables (firewall), and audit logging. Understanding Linux is essential for penetration testing, incident response, and security operations.' },
          { id: 's2', type: 'code', title: 'Essential Linux Commands', content: 'Master these fundamental Linux commands for navigation, file management, and system administration.', codeExample: '# File navigation\nls -la          # List all files with details\ncd /path        # Change directory\npwd             # Print working directory\ntree -L 2       # Directory tree (2 levels)\n\n# File operations\ncp file1 file2  # Copy\nmv old new      # Move/rename\nrm -rf dir      # Remove recursively\nchmod 755 file  # Change permissions\nchown user:group file  # Change ownership\n\n# Text processing\ngrep -r "error" /var/log/    # Search in files\nsed \'s/old/new/g\' file        # Find and replace\nawk \'{print $1, $3}\' file    # Column extraction\ncat file | sort | uniq -c     # Sort and count\n\n# Process management\nps aux                 # List all processes\ntop                    # Real-time process monitor\nkill -9 PID            # Force kill process\nnohup command &        # Run in background', language: 'bash' },
          { id: 's3', type: 'code', title: 'Shell Scripting', content: 'Shell scripts automate repetitive tasks. Learn variables, conditionals, loops, and functions.', codeExample: '#!/bin/bash\n# System security audit script\n\nREPORT="audit_report_$(date +%Y%m%d).txt"\n\necho "=== Security Audit Report ===" > $REPORT\necho "Date: $(date)" >> $REPORT\necho "" >> $REPORT\n\n# Check listening ports\necho "Open Ports:" >> $REPORT\nnetstat -tlnp 2>/dev/null | grep LISTEN >> $REPORT\necho "" >> $REPORT\n\n# Check logged in users\necho "Logged In Users:" >> $REPORT\nwho >> $REPORT\necho "" >> $REPORT\n\n# Check failed login attempts\necho "Failed Logins (last 24h):" >> $REPORTngrep -i "failed" /var/log/auth.log | tail -20 >> $REPORT 2>/dev/null\necho "" >> $REPORT\n\n# Check disk usage\necho "Disk Usage:" >> $REPORT\ndf -h | awk \'$5 > 80 {print $0}\' >> $REPORT\necho "" >> $REPORT\necho "Audit complete. Report saved to $REPORT"', language: 'bash' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What does chmod 755 mean?', options: ['Read only for owner', 'Owner: rwx, Group: r-x, Others: r-x', 'Full access for everyone', 'Write only for owner'], correctIndex: 1, explanation: 'chmod 755: owner gets read+write+execute (7), group gets read+execute (5), others get read+execute (5).' },
          { id: 'q2', question: 'Which command searches for text patterns in files?', options: ['find', 'grep', 'locate', 'search'], correctIndex: 1, explanation: 'grep (Global Regular Expression Print) searches for patterns in file contents. find searches for files by name or attributes.' },
          { id: 'q3', question: 'What does the shebang (#!/bin/bash) do in a script?', options: ['Comments out code', 'Tells the system which interpreter to use', 'Imports libraries', 'Starts a loop'], correctIndex: 1, explanation: 'The shebang line specifies the interpreter that should be used to execute the script. #!/bin/bash tells the system to use the Bash shell.' }
        ]),
        resources: JSON.stringify([
          { title: 'Linux Journey (Interactive)', type: 'link', url: 'https://linuxjourney.com/' },
          { title: 'OverTheWire Bandit (Wargame)', type: 'link', url: 'https://overthewire.org/wargames/bandit/' },
          { title: 'Linux Command Library', type: 'link', url: 'https://www.linuxcommand.org/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=5tq0E2bT1n0'
      },
      {
        internshipId: cyber.id, title: 'Ethical Hacking Fundamentals', description: 'Learn penetration testing methodology, reconnaissance, scanning, vulnerability assessment, and exploitation.', moduleOrder: 3, durationMinutes: 80, difficulty: 'intermediate',
        topics: 'Reconnaissance,Scanning,Vulnerability Assessment,Exploitation,Metasploit',
        learningObjectives: JSON.stringify(['Perform passive and active reconnaissance techniques', 'Use Nmap for network scanning and service enumeration', 'Identify vulnerabilities using vulnerability scanners', 'Execute basic exploitation techniques with Metasploit']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Penetration Testing Methodology', content: 'Penetration testing follows a structured methodology to systematically find and exploit security vulnerabilities. The standard phases are:\n\n1. Reconnaissance (Information Gathering): Collecting target information using passive (OSINT, WHOIS, DNS) and active (scanning, enumeration) techniques.\n2. Scanning: Identifying live hosts, open ports, running services, and operating systems using tools like Nmap.\n3. Vulnerability Assessment: Identifying known vulnerabilities in discovered services using vulnerability scanners (Nessus, OpenVAS).\n4. Exploitation: Attempting to exploit vulnerabilities to gain access using tools like Metasploit, SQLMap, or custom scripts.\n5. Post-Exploitation: Maintaining access, escalating privileges, pivoting to other systems, and covering tracks.\n6. Reporting: Documenting findings, evidence, risk ratings, and remediation recommendations.' },
          { id: 's2', type: 'code', title: 'Nmap Scanning Techniques', content: 'Nmap is the most widely used network scanner. Learn essential scanning techniques for penetration testing.', codeExample: '# Quick scan - top 100 common ports\nnmap 192.168.1.1\n\n# Full port scan\nnmap -p- 192.168.1.1\n\n# Service version detection\nnmap -sV -sC 192.168.1.1\n\n# OS detection\nnmap -O 192.168.1.1\n\n# Aggressive scan (all info)\nnmap -A -T4 192.168.1.1\n\n# UDP scan (slower)\nnmap -sU 192.168.1.1\n\n# Script scanning\nnmap --script vuln 192.168.1.1\n\n# Scan specific service\nnmap --script=http-enum 192.168.1.1\n\n# Output to file\nnmap -oA scan_results 192.168.1.1\n\n# Example output interpretation:\n# PORT     STATE SERVICE VERSION\n# 22/tcp   open  ssh     OpenSSH 8.2\n# 80/tcp   open  http    Apache/2.4.41\n# 443/tcp  open  https   nginx/1.18.0\n# 3306/tcp open  mysql   MySQL 8.0.25', language: 'bash' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is the first phase of a penetration test?', options: ['Exploitation', 'Reconnaissance', 'Reporting', 'Scanning'], correctIndex: 1, explanation: 'Reconnaissance is the first phase, involving information gathering about the target before any active scanning or exploitation.' },
          { id: 'q2', question: 'What does Nmap -sV do?', options: ['Scans for vulnerabilities', 'Detects service versions on open ports', 'Performs a stealth scan', 'Scans UDP ports'], correctIndex: 1, explanation: 'Nmap -sV probes open ports to determine service and version information, helping identify potentially vulnerable software versions.' },
          { id: 'q3', question: 'What is passive reconnaissance?', options: ['Scanning ports directly', 'Gathering information without touching the target system', 'Using Metasploit', 'Exploiting vulnerabilities'], correctIndex: 1, explanation: 'Passive reconnaissance gathers information from public sources (OSINT) without directly interacting with the target, making it harder to detect.' }
        ]),
        resources: JSON.stringify([
          { title: 'Nmap Official Guide', type: 'link', url: 'https://nmap.org/book/' },
          { title: 'TryHackMe (Free Labs)', type: 'link', url: 'https://tryhackme.com/' },
          { title: 'HackTheBox Academy', type: 'link', url: 'https://academy.hackthebox.com/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=3KQsNtFPQPc'
      },
      {
        internshipId: cyber.id, title: 'Cryptography & Encryption', description: 'Understand encryption algorithms, hashing, digital signatures, SSL/TLS, and certificate management.', moduleOrder: 4, durationMinutes: 70, difficulty: 'intermediate',
        topics: 'Symmetric Encryption,Asymmetric Encryption,Hashing,Digital Signatures,SSL/TLS,PKI',
        learningObjectives: JSON.stringify(['Explain the difference between symmetric and asymmetric encryption', 'Implement common hash functions and verify data integrity', 'Describe the SSL/TLS handshake process', 'Understand public key infrastructure and certificate management']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Cryptography Fundamentals', content: 'Cryptography is the practice of securing communication from adversaries. It provides three security pillars: Confidentiality (only authorized parties can read data), Integrity (data has not been tampered with), and Authentication (verifying identity).\n\nSymmetric encryption uses one shared key for both encryption and decryption (AES, DES, 3DES). It is fast but key distribution is challenging. Asymmetric encryption uses a key pair: public key (encrypt) and private key (decrypt) (RSA, ECC). It solves key distribution but is slower.\n\nHashing converts data to a fixed-size fingerprint (SHA-256, bcrypt). It is one-way (cannot be reversed) and even a small input change produces a completely different hash. Digital signatures combine hashing with asymmetric encryption to prove authenticity and integrity.' },
          { id: 's2', type: 'code', title: 'Python Cryptography', content: 'Use Python to implement common cryptographic operations.', codeExample: 'from cryptography.fernet import Fernet\nimport hashlib\nimport hmac\n\n# Symmetric encryption (AES via Fernet)\nkey = Fernet.generate_key()\ncipher = Fernet(key)\n\nmessage = "Secret message"\nencrypted = cipher.encrypt(message.encode())\ndecrypted = cipher.decrypt(encrypted).decode()\nprint(f"Encrypted: {encrypted}")\nprint(f"Decrypted: {decrypted}")\n\n# Hashing\nmessage = "password123"\nsha256_hash = hashlib.sha256(message.encode()).hexdigest()\nprint(f"SHA-256: {sha256_hash}")\n\n# HMAC for message authentication\nsecret = b"my-secret-key"\nmessage = b"Important data"\nsignature = hmac.new(secret, message, hashlib.sha256).hexdigest()\nprint(f"HMAC Signature: {signature}")', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is the main advantage of asymmetric over symmetric encryption?', options: ['Faster performance', 'No need to share a secret key', 'Smaller key sizes', 'Simpler implementation'], correctIndex: 1, explanation: 'Asymmetric encryption uses a public/private key pair, eliminating the need to securely share a secret key between parties.' },
          { id: 'q2', question: 'What is a hash function used for in security?', options: ['Encrypting data for transmission', 'Creating a fixed-size fingerprint to verify data integrity', 'Compressing files', 'Generating random numbers'], correctIndex: 1, explanation: 'Hash functions produce a fixed-size output (hash) from input data. They are used to verify data integrity because any change to the input produces a completely different hash.' },
          { id: 'q3', question: 'What happens during an SSL/TLS handshake?', options: ['Data is compressed', 'Client and server negotiate encryption methods and exchange keys', 'Files are transferred', 'DNS is resolved'], correctIndex: 1, explanation: 'The TLS handshake involves: agreeing on cipher suites, exchanging certificates, verifying identity, and establishing shared session keys for encrypted communication.' }
        ]),
        resources: JSON.stringify([
          { title: 'Cryptography I (Coursera)', type: 'link', url: 'https://www.coursera.org/learn/crypto' },
          { title: 'Crypto101 (Free Book)', type: 'link', url: 'https://www.crypto101.io/' },
          { title: 'Let\'s Encrypt (Free SSL)', type: 'link', url: 'https://letsencrypt.org/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=GSds_lVGbGk'
      },
      {
        internshipId: cyber.id, title: 'Web Application Security', description: 'Learn OWASP Top 10 vulnerabilities including SQL injection, XSS, CSRF, and secure coding practices.', moduleOrder: 5, durationMinutes: 80, difficulty: 'advanced',
        topics: 'OWASP Top 10,SQL Injection,XSS,CSRF,Authentication Security,Secure Coding',
        learningObjectives: JSON.stringify(['Identify and prevent OWASP Top 10 vulnerabilities', 'Test for SQL injection and XSS using manual and automated tools', 'Implement secure authentication and session management', 'Apply secure coding best practices in web applications']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'OWASP Top 10', content: 'The OWASP (Open Web Application Security Project) Top 10 is a standard awareness document for web application security. It represents the most critical security risks:\n\n1. Broken Access Control - Users accessing unauthorized functionality\n2. Cryptographic Failures - Weak encryption or exposed sensitive data\n3. Injection - SQL, NoSQL, OS command injection\n4. Insecure Design - Missing security architecture\n5. Security Misconfiguration - Default credentials, unnecessary features\n6. Vulnerable Components - Using libraries with known flaws\n7. Authentication Failures - Weak passwords, session issues\n8. Data Integrity Failures - Unsigned updates, insecure deserialization\n9. Logging Failures - Insufficient monitoring and alerting\n10. SSRF - Server-Side Request Forgery\n\nUnderstanding these risks is essential for building secure applications and conducting effective penetration tests.' },
          { id: 's2', type: 'code', title: 'SQL Injection & Prevention', content: 'SQL injection is one of the most dangerous web vulnerabilities. Learn how it works and how to prevent it.', codeExample: '# VULNERABLE CODE - Never do this!\ndef login_vulnerable(username, password):\n    query = f"SELECT * FROM users WHERE username=\'{username}\' AND password=\'{password}\'"\n    # Attack: username = \' OR 1=1 --\n    # Result: Returns all users, bypassing authentication!\n    return db.execute(query)\n\n# SECURE CODE - Use parameterized queries\ndef login_secure(username, password):\n    query = "SELECT * FROM users WHERE username = ? AND password = ?"\n    # The ? placeholders prevent SQL injection\n    return db.execute(query, (username, password))\n\n# SECURE CODE - Use ORM\ndef login_orm(username, password):\n    user = User.query.filter_by(username=username).first()\n    if user and bcrypt.checkpw(password.encode(), user.password):\n        return user\n    return None', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is SQL injection?', options: ['Adding SQL to a database', 'Inserting malicious SQL code through user input to manipulate queries', 'A type of firewall', 'A database backup method'], correctIndex: 1, explanation: 'SQL injection occurs when user input is included in SQL queries without proper sanitization, allowing attackers to manipulate the query logic.' },
          { id: 'q2', question: 'How do you prevent SQL injection?', options: ['Use longer passwords', 'Use parameterized queries/prepared statements', 'Disable the database', 'Use HTTP instead of HTTPS'], correctIndex: 1, explanation: 'Parameterized queries separate SQL code from data, preventing user input from being interpreted as SQL commands.' },
          { id: 'q3', question: 'What does XSS stand for?', options: ['Cross-Site Scripting', 'Cross-Server Security', 'XML Security Standard', 'Extended Security System'], correctIndex: 0, explanation: 'Cross-Site Scripting (XSS) allows attackers to inject malicious scripts into web pages viewed by other users.' }
        ]),
        resources: JSON.stringify([
          { title: 'OWASP Top 10', type: 'link', url: 'https://owasp.org/www-project-top-ten/' },
          { title: 'PortSwigger Web Security Academy', type: 'link', url: 'https://portswigger.net/web-security' },
          { title: 'OWASP Juice Shop (Practice)', type: 'link', url: 'https://owasp.org/www-project-juice-shop/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=c6yYjZh5hdY'
      },
      {
        internshipId: cyber.id, title: 'Security Operations & Incident Response', description: 'Learn SIEM, log analysis, incident response procedures, threat hunting, and security monitoring.', moduleOrder: 6, durationMinutes: 75, difficulty: 'advanced',
        topics: 'SIEM,Log Analysis,Incident Response,Threat Hunting,Security Monitoring,Forensics',
        learningObjectives: JSON.stringify(['Configure and use SIEM tools for security monitoring', 'Analyze logs to detect suspicious activity', 'Follow incident response procedures from detection to recovery', 'Perform basic threat hunting using indicators of compromise']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Security Operations Center (SOC)', content: 'A Security Operations Center (SOC) is a centralized team and facility that monitors and responds to security incidents. SOC analysts use SIEM (Security Information and Event Management) tools to aggregate and analyze logs from across the network.\n\nThe three SOC tiers: Tier 1 (Alert Monitoring) - triages alerts, filters false positives. Tier 2 (Investigation) - deep-dive analysis, correlation, escalation. Tier 3 (Threat Hunting) - proactive search for advanced threats, malware analysis, forensics.\n\nKey SIEM capabilities: Log aggregation from multiple sources (firewalls, IDS/IPS, endpoints), correlation rules to detect attack patterns, real-time alerting, dashboards for visualization, and forensic investigation capabilities.' },
          { id: 's2', type: 'text', title: 'Incident Response Process', content: 'Incident response follows the NIST framework with 4 phases:\n\n1. Preparation: Establishing IR plans, playbooks, tools, and communication channels before incidents occur.\n2. Detection & Analysis: Identifying incidents through alerts, logs, and user reports. Determining the scope, impact, and severity.\n3. Containment, Eradication, Recovery: Containing the threat (isolating affected systems), removing the root cause, and restoring normal operations.\n4. Post-Incident Activity: Conducting lessons learned meetings, updating documentation, and improving defenses.\n\nKey indicators of compromise (IoCs): unusual network traffic, unexpected file changes, unauthorized access attempts, anomalous process behavior, and threat intelligence matches.' },
          { id: 's3', type: 'code', title: 'Log Analysis with Python', content: 'Use Python to parse and analyze security logs for suspicious activity.', codeExample: 'import re\nfrom collections import Counter\nfrom datetime import datetime\n\ndef analyze_auth_logs(log_file):\n    """Analyze authentication logs for brute force attempts"""\n    failed_attempts = Counter()\n    successful_logins = []\n    \n    with open(log_file, "r") as f:\n        for line in f:\n            # Detect failed login attempts\n            if "Failed password" in line:\n                ip = re.search(r"from (\\d+\\.\\d+\\.\\d+\\.\\d+)", line)\n                if ip:\n                    failed_attempts[ip.group(1)] += 1\n            \n            # Detect successful logins\n            if "Accepted password" in line:\n                ip = re.search(r"from (\\d+\\.\\d+\\.\\d+\\.\\d+)", line)\n                user = re.search(r"for (\\w+)", line)\n                if ip and user:\n                    successful_logins.append({\n                        "ip": ip.group(1),\n                        "user": user.group(1)\n                    })\n    \n    # Report suspicious IPs\n    print("=== Potential Brute Force Attacks ===")\n    for ip, count in failed_attempts.most_common(10):\n        if count > 5:\n            print(f"ALERT: {ip} - {count} failed attempts")\n    \n    return failed_attempts, successful_logins\n\nanalyze_auth_logs("/var/log/auth.log")', language: 'python' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What does SIEM stand for?', options: ['Security Information and Event Management', 'System Internal Error Monitoring', 'Secure Internet Encryption Module', 'Server Identity and Access Management'], correctIndex: 0, explanation: 'SIEM (Security Information and Event Management) aggregates and analyzes log data from across the network to detect security threats.' },
          { id: 'q2', question: 'What is the first step in incident response?', options: ['Recovery', 'Eradication', 'Preparation', 'Detection'], correctIndex: 2, explanation: 'Preparation is the first step, involving establishing IR plans, tools, and procedures before any incident occurs.' },
          { id: 'q3', question: 'What are indicators of compromise (IoCs)?', options: ['Firewall rules', 'Artifacts that indicate a security breach has occurred', 'Software licenses', 'Network diagrams'], correctIndex: 1, explanation: 'IoCs are forensic artifacts or signs that indicate a system has been compromised, such as unusual traffic, modified files, or unauthorized access.' }
        ]),
        resources: JSON.stringify([
          { title: 'Splunk Free Training', type: 'link', url: 'https://www.splunk.com/en_us/training/free-courses.html' },
          { title: 'NIST Incident Response Guide', type: 'link', url: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf' },
          { title: 'LetsDefend (SOC Platform)', type: 'link', url: 'https://letsdefend.io/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=bmN6bJGNN5Q'
      }
    );
  }

  // ========== MOBILE APP DEVELOPMENT TRACK (6 modules) ==========
  if (mobile) {
    learningModules.push(
      {
        internshipId: mobile.id, title: 'React Native Fundamentals', description: 'Build cross-platform mobile apps using React Native with JavaScript and JSX syntax.', moduleOrder: 1, durationMinutes: 70, difficulty: 'beginner',
        topics: 'React Native,Expo,JSX,Components,Mobile Navigation,Styling',
        learningObjectives: JSON.stringify(['Set up a React Native project with Expo', 'Create mobile components using JSX and React hooks', 'Implement navigation between screens', 'Style mobile apps with StyleSheet and Flexbox']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'React Native Overview', content: 'React Native is a framework developed by Meta for building native mobile applications using JavaScript and React. Instead of targeting browsers (like React Web), React Native renders native UI components on iOS and Android, providing near-native performance and a truly native look and feel.\n\nKey advantages: Cross-platform development (one codebase for iOS and Android), hot reloading (instant code changes), large ecosystem of libraries, and the ability to use native code when needed. Expo is a platform and toolchain that simplifies React Native development with managed workflows, easy builds, and over-the-air updates.\n\nReact Native components map to native views: <View> maps to div, <Text> to Text, <Image> to Image, <ScrollView> to scrollable container, and <TextInput> to input fields.' },
          { id: 's2', type: 'code', title: 'First React Native App', content: 'Create a basic React Native app with Expo, including navigation and state management.', codeExample: 'import React, { useState } from "react";\nimport { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";\n\nexport default function App() {\n  const [tasks, setTasks] = useState([\n    { id: "1", text: "Learn React Native", done: false },\n    { id: "2", text: "Build first app", done: false },\n  ]);\n\n  const toggleTask = (id) => {\n    setTasks(tasks.map(t => \n      t.id === id ? { ...t, done: !t.done } : t\n    ));\n  };\n\n  return (\n    <View style={styles.container}>\n      <Text style={styles.title}>My Tasks</Text>\n      <FlatList\n        data={tasks}\n        keyExtractor={(item) => item.id}\n        renderItem={({ item }) => (\n          <TouchableOpacity onPress={() => toggleTask(item.id)}>\n            <Text style={[styles.task, item.done && styles.done]}>\n              {item.done ? "✓ " : ""}{item.text}\n            </Text>\n          </TouchableOpacity>\n        )}\n      />\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  container: { flex: 1, padding: 20, paddingTop: 50 },\n  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },\n  task: { fontSize: 16, padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },\n  done: { textDecorationLine: "line-through", color: "#999" }\n});', language: 'jsx' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is the difference between React Native and React?', options: ['No difference', 'React Native renders native mobile components instead of DOM elements', 'React Native is only for iOS', 'React is faster'], correctIndex: 1, explanation: 'React targets web browsers and renders DOM elements. React Native renders native mobile UI components on iOS and Android.' },
          { id: 'q2', question: 'What is Expo in React Native?', options: ['A testing library', 'A platform and toolchain that simplifies React Native development', 'A navigation library', 'A state management tool'], correctIndex: 1, explanation: 'Expo provides managed workflows, easy builds, over-the-air updates, and native APIs without needing Xcode or Android Studio.' },
          { id: 'q3', question: 'What component replaces <div> in React Native?', options: ['<Container>', '<Box>', '<View>', '<Section>'], correctIndex: 2, explanation: '<View> is the fundamental building block in React Native, similar to <div> in web React, used for layout and container purposes.' }
        ]),
        resources: JSON.stringify([
          { title: 'React Native Docs', type: 'link', url: 'https://reactnative.dev/' },
          { title: 'Expo Documentation', type: 'link', url: 'https://docs.expo.dev/' },
          { title: 'React Native Tutorial', type: 'link', url: 'https://www.youtube.com/watch?v=0-S5aYeGo2M' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=0-S5aYeGo2M'
      },
      {
        internshipId: mobile.id, title: 'Mobile Navigation & State', description: 'Implement navigation stacks, tab bars, drawers, and global state management in React Native apps.', moduleOrder: 2, durationMinutes: 75, difficulty: 'intermediate',
        topics: 'React Navigation,Stack Navigator,Tab Navigator,Drawer,Context API,State Management',
        learningObjectives: JSON.stringify(['Set up React Navigation with stack, tab, and drawer navigators', 'Pass parameters between screens', 'Manage global state with Context API', 'Implement deep linking for mobile apps']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Mobile Navigation', content: 'Mobile apps use different navigation patterns than websites. Instead of URL-based routing, mobile apps use screen-based navigation with animated transitions.\n\nReact Navigation is the standard library for React Native navigation. Key concepts: Stack Navigator provides screen transitions (push/pop), Tab Navigator displays bottom or top tab bars, Drawer Navigator provides a slide-out menu. You can nest navigators to create complex navigation hierarchies.\n\nDeep linking allows users to navigate directly to specific screens from URLs or notifications (e.g., myapp://profile/123). This is essential for push notifications and sharing content.' },
          { id: 's2', type: 'code', title: 'Setting Up Navigation', content: 'Configure React Navigation with multiple navigators and screen parameter passing.', codeExample: 'import { NavigationContainer } from "@react-navigation/native";\nimport { createNativeStackNavigator } from "@react-navigation/native-stack";\nimport { createBottomTabNavigator } from "@react-navigation/bottom-tabs";\n\nconst Stack = createNativeStackNavigator();\nconst Tab = createBottomTabNavigator();\n\nfunction HomeScreen({ navigation }) {\n  return (\n    <View>\n      <Text>Welcome Home!</Text>\n      <Button \n        title="Go to Profile" \n        onPress={() => navigation.navigate("Profile", { userId: 123 })}\n      />\n    </View>\n  );\n}\n\nfunction ProfileScreen({ route }) {\n  const { userId } = route.params;\n  return <Text>User ID: {userId}</Text>;\n}\n\nfunction HomeTabs() {\n  return (\n    <Tab.Navigator>\n      <Tab.Screen name="Home" component={HomeScreen} />\n      <Tab.Screen name="Settings" component={SettingsScreen} />\n    </Tab.Navigator>\n  );\n}\n\nexport default function App() {\n  return (\n    <NavigationContainer>\n      <Stack.Navigator>\n        <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }}/>\n        <Stack.Screen name="Profile" component={ProfileScreen} />\n      </Stack.Navigator>\n    </NavigationContainer>\n  );\n}', language: 'jsx' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is a Stack Navigator?', options: ['A data structure', 'Provides push/pop screen transitions', 'A state management tool', 'A styling system'], correctIndex: 1, explanation: 'Stack Navigator manages a stack of screens, allowing users to push new screens onto the stack and pop back to previous screens with animated transitions.' },
          { id: 'q2', question: 'How do you pass data between screens?', options: ['Using global variables', 'Route parameters (route.params)', 'LocalStorage', 'URL query strings'], correctIndex: 1, explanation: 'React Navigation passes data between screens using route parameters, which are passed when navigating and received via route.params.' }
        ]),
        resources: JSON.stringify([
          { title: 'React Navigation Docs', type: 'link', url: 'https://reactnavigation.org/' },
          { title: 'Expo Router', type: 'link', url: 'https://docs.expo.dev/router/introduction/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=nQVCfEChwQg'
      },
      {
        internshipId: mobile.id, title: 'React Native UI Components', description: 'Build beautiful mobile interfaces with custom components, gestures, animations, and responsive design.', moduleOrder: 3, durationMinutes: 75, difficulty: 'intermediate',
        topics: 'Custom Components,Gestures,Animations,Responsive Design,Modals,Lists',
        learningObjectives: JSON.stringify(['Create reusable custom components for mobile', 'Implement touch gestures and haptic feedback', 'Build smooth animations with Reanimated and LayoutAnimation', 'Design responsive layouts that work on different screen sizes']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Building Mobile UI Components', content: 'Mobile UI requires different considerations than web: touch targets should be at least 44x44 points, content should be scrollable, and gestures should feel natural. React Native provides components optimized for mobile interaction.\n\nKey UI components: FlatList (virtualized list for performance), ScrollView (scrollable container), Pressable (touch feedback), Modal (overlay dialogs), Alert (system alerts), and StatusBar (control status bar appearance). For animations, React Native Reanimated provides smooth 60fps animations that run on the native thread.' },
          { id: 's2', type: 'code', title: 'Custom Card Component', content: 'Build a reusable, animated card component with touch interactions.', codeExample: 'import React from "react";\nimport { View, Text, Image, StyleSheet, Pressable } from "react-native";\nimport Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";\n\nfunction Card({ title, description, image, onPress }) {\n  const scale = useSharedValue(1);\n  \n  const animatedStyle = useAnimatedStyle(() => ({\n    transform: [{ scale: scale.value }]\n  }));\n\n  const handlePressIn = () => { scale.value = withSpring(0.95); };\n  const handlePressOut = () => { scale.value = withSpring(1); };\n\n  return (\n    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>\n      <Animated.View style={[styles.card, animatedStyle]}>\n        {image && <Image source={{ uri: image }} style={styles.image} />}\n        <View style={styles.content}>\n          <Text style={styles.title}>{title}</Text>\n          <Text style={styles.description}>{description}</Text>\n        </View>\n      </Animated.View>\n    </Pressable>\n  );\n}\n\nconst styles = StyleSheet.create({\n  card: { borderRadius: 12, overflow: "hidden", backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, margin: 10 },\n  image: { width: "100%", height: 200 },\n  content: { padding: 15 },\n  title: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },\n  description: { fontSize: 14, color: "#666" }\n});', language: 'jsx' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is FlatList used for?', options: ['Displaying a single item', 'Rendering large lists efficiently with virtualization', 'Creating scrollable forms', 'Building navigation'], correctIndex: 1, explanation: 'FlatList renders items lazily as they scroll into view, making it efficient for large datasets without loading everything into memory.' },
          { id: 'q2', question: 'What is the minimum recommended touch target size for mobile?', options: ['20x20 points', '44x44 points', '10x10 points', '60x60 points'], correctIndex: 1, explanation: 'Apple and Google recommend touch targets of at least 44x44 points to ensure easy tap accuracy and accessibility.' }
        ]),
        resources: JSON.stringify([
          { title: 'React Native Reanimated', type: 'link', url: 'https://docs.swmansion.com/react-native-reanimated/' },
          { title: 'React Native Gesture Handler', type: 'link', url: 'https://docs.swmansion.com/react-native-gesture-handler/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=6F2z8zAb7d0'
      },
      {
        internshipId: mobile.id, title: 'Networking & APIs in Mobile', description: 'Connect mobile apps to backend APIs, handle authentication, cache data, and work with offline mode.', moduleOrder: 4, durationMinutes: 70, difficulty: 'intermediate',
        topics: 'Fetch/Axios,Authentication,Token Storage,Offline Mode,Data Caching,Push Notifications',
        learningObjectives: JSON.stringify(['Make API calls using fetch and axios in React Native', 'Implement secure token-based authentication', 'Handle offline mode with data caching', 'Set up push notifications for mobile apps']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Mobile API Integration', content: 'Mobile apps communicate with backends through REST or GraphQL APIs. Unlike web apps, mobile apps face unique challenges: unreliable network connectivity, limited bandwidth, battery consumption, and background execution constraints.\n\nBest practices: Use async/await for clean async code, implement retry logic for failed requests, cache responses locally, compress payloads, and handle offline scenarios gracefully. For authentication, use JWT tokens stored securely in AsyncStorage (or Keychain for iOS/EncryptedSharedPreferences for Android).\n\nPush notifications require platform-specific setup: APNs for iOS and FCM for Android. Expo provides a unified API for push notifications across platforms.' },
          { id: 's2', type: 'code', title: 'API Integration with Authentication', content: 'Build a complete API layer with token management, refresh tokens, and offline handling.', codeExample: 'import AsyncStorage from "@react-native-async-storage/async-storage";\n\nconst API_BASE = "https://api.myapp.com";\n\n// Token management\nconst getTokens = async () => {\n  const access = await AsyncStorage.getItem("accessToken");\n  const refresh = await AsyncStorage.getItem("refreshToken");\n  return { access, refresh };\n};\n\nconst apiCall = async (endpoint, options = {}) => {\n  const { access } = await getTokens();\n  \n  const response = await fetch(`${API_BASE}${endpoint}`, {\n    ...options,\n    headers: {\n      "Content-Type": "application/json",\n      "Authorization": `Bearer ${access}`,\n      ...options.headers\n    }\n  });\n\n  // Token expired - try refresh\n  if (response.status === 401) {\n    const { refresh } = await getTokens();\n    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {\n      method: "POST",\n      body: JSON.stringify({ refreshToken: refresh })\n    });\n    if (refreshRes.ok) {\n      const { accessToken } = await refreshRes.json();\n      await AsyncStorage.setItem("accessToken", accessToken);\n      return apiCall(endpoint, options);  // Retry\n    }\n  }\n  return response.json();\n};', language: 'javascript' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'Why is offline handling important for mobile apps?', options: ['Mobile apps are always offline', 'Users may lose connectivity and need cached data', 'Offline mode is faster', 'It saves server costs'], correctIndex: 1, explanation: 'Mobile users frequently lose connectivity (subways, flights, rural areas). Apps should cache important data and gracefully handle offline scenarios.' },
          { id: 'q2', question: 'What is a JWT refresh token used for?', options: ['Logging in', 'Obtaining a new access token without re-authenticating', 'Encrypting data', 'Storing user preferences'], correctIndex: 1, explanation: 'A refresh token allows the app to obtain a new access token when the current one expires, without requiring the user to log in again.' }
        ]),
        resources: JSON.stringify([
          { title: 'React Native AsyncStorage', type: 'link', url: 'https://react-native-async-storage.github.io/async-storage/' },
          { title: 'Expo Push Notifications', type: 'link', url: 'https://docs.expo.dev/push-notifications/overview/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=bMqRkzAKX0k'
      },
      {
        internshipId: mobile.id, title: 'Testing & Debugging', description: 'Write unit tests, integration tests, and debug React Native apps using modern testing tools.', moduleOrder: 5, durationMinutes: 65, difficulty: 'intermediate',
        topics: 'Jest,React Native Testing Library,Debugging,Performance Profiling,Flipper',
        learningObjectives: JSON.stringify(['Write unit tests for components and utilities using Jest', 'Test component behavior with React Native Testing Library', 'Debug apps using Flipper and React DevTools', 'Profile and optimize app performance']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Testing Strategy', content: 'A comprehensive testing strategy for mobile apps includes multiple levels: Unit tests verify individual functions and components in isolation (fast, many tests). Integration tests verify component interactions (moderate speed). End-to-end tests simulate real user workflows (slow, fewer tests).\n\nJest is the standard testing framework for React Native. React Native Testing Library (RRTL) provides a higher-level API for testing components from the user perspective. Detox is the leading end-to-end testing framework for React Native.\n\nDebugging tools: Flipper (Facebook\'s mobile debugging platform), React DevTools (inspect component hierarchy), Chrome DevTools (debug JavaScript), and console.log for quick checks.' },
          { id: 's2', type: 'code', title: 'Testing Components', content: 'Write unit and integration tests for React Native components.', codeExample: 'import React from "react";\nimport { render, fireEvent, waitFor } from "@testing-library/react-native";\nimport Counter from "./Counter";\n\ndescribe("Counter Component", () => {\n  it("renders initial count correctly", () => {\n    const { getByText } = render(<Counter initial={0} />);\n    expect(getByText("Count: 0")).toBeTruthy();\n  });\n\n  it("increments count on button press", () => {\n    const { getByText } = render(<Counter initial={0} />);\n    fireEvent.press(getByText("Increment"));\n    expect(getByText("Count: 1")).toBeTruthy();\n  });\n\n  it("decrements count on button press", () => {\n    const { getByText } = render(<Counter initial={5} />);\n    fireEvent.press(getByText("Decrement"));\n    expect(getByText("Count: 4")).toBeTruthy();\n  });\n\n  it("disables decrement at zero", () => {\n    const { getByText, getByTestId } = render(<Counter initial={0} />);\n    const btn = getByTestId("decrement-btn");\n    expect(btn).toBeDisabled();\n  });\n});', language: 'javascript' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is the difference between unit and integration tests?', options: ['No difference', 'Unit tests check individual pieces, integration tests check how pieces work together', 'Integration tests are faster', 'Unit tests require real devices'], correctIndex: 1, explanation: 'Unit tests verify individual functions/components in isolation. Integration tests verify that multiple components work together correctly.' },
          { id: 'q2', question: 'What is Flipper used for?', options: ['Building UIs', 'Debugging and inspecting React Native apps', 'Running tests', 'Managing state'], correctIndex: 1, explanation: 'Flipper is Facebook\'s mobile debugging platform with tools for inspecting layouts, network requests, databases, and performance.' }
        ]),
        resources: JSON.stringify([
          { title: 'Jest Documentation', type: 'link', url: 'https://jestjs.io/docs/getting-started' },
          { title: 'React Native Testing Library', type: 'link', url: 'https://callstack.github.io/react-native-testing-library/' },
          { title: 'Flipper Debugging', type: 'link', url: 'https://fbflipper.com/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=GSh1bbsyM6E'
      },
      {
        internshipId: mobile.id, title: 'App Publishing & Deployment', description: 'Prepare, build, and publish mobile apps to Google Play Store and Apple App Store.', moduleOrder: 6, durationMinutes: 65, difficulty: 'advanced',
        topics: 'App Store,Google Play,EAS Build,Code Signing,Beta Testing,App Store Optimization',
        learningObjectives: JSON.stringify(['Configure app builds for production with EAS Build', 'Set up code signing for iOS and Android', 'Submit apps to App Store and Play Store', 'Optimize app store listings for discoverability']),
        contentSections: JSON.stringify([
          { id: 's1', type: 'text', title: 'Publishing Process', content: 'Publishing a mobile app involves several steps that differ between iOS and Android. Android publishing to Google Play is generally faster and less restrictive, while Apple has a review process that can take days.\n\nPre-publishing checklist: 1) Set app icon and splash screen, 2) Configure app permissions, 3) Set version numbers and build codes, 4) Create privacy policy and terms of service, 5) Prepare screenshots and descriptions for store listings, 6) Set up code signing certificates, 7) Test on physical devices.\n\nExpo Application Services (EAS) provides cloud build services that compile your app without requiring local Xcode or Android Studio setup. EAS Submit can automatically submit your builds to app stores.' },
          { id: 's2', type: 'text', title: 'App Store Optimization (ASO)', content: 'App Store Optimization is the mobile equivalent of SEO. It helps your app rank higher in store search results and attract more downloads.\n\nKey ASO factors: App name (include primary keyword), subtitle/short description (compelling description with keywords), keywords (relevant search terms), screenshots (show key features), video preview (demonstrate the app in action), ratings and reviews (encourage positive reviews), category selection (relevant category), and localization (translate for different markets).\n\nPost-launch: Monitor analytics (downloads, retention, crash rates), respond to user reviews, update regularly with new features and bug fixes, and A/B test store listings.' },
          { id: 's3', type: 'code', title: 'EAS Build Configuration', content: 'Configure your app for production builds using Expo Application Services.', codeExample: '// eas.json\n{\n  "cli": { "version": ">= 5.0.0" },\n  "build": {\n    "development": {\n      "developmentClient": true,\n      "distribution": "internal"\n    },\n    "preview": {\n      "distribution": "internal"\n    },\n    "production": {\n      "autoIncrement": true\n    }\n  },\n  "submit": {\n    "production": {\n      "ios": {\n        "appleId": "your@apple-id.com",\n        "ascAppId": "your-app-store-connect-id"\n      },\n      "android": {\n        "serviceAccountKeyPath": "./google-service-account.json"\n      }\n    }\n  }\n}\n\n# Build commands\n# eas build --platform ios --profile production\neas build --platform android --profile production\neas submit --platform ios\neas submit --platform android', language: 'json' }
        ]),
        quizQuestions: JSON.stringify([
          { id: 'q1', question: 'What is App Store Optimization (ASO)?', options: ['Optimizing app code', 'Optimizing store listing to improve search visibility and downloads', 'Optimizing server performance', 'Optimizing image sizes'], correctIndex: 1, explanation: 'ASO involves optimizing your app store listing (title, keywords, screenshots, description) to improve visibility and increase downloads.' },
          { id: 'q2', question: 'What does EAS Build provide?', options: ['A testing framework', 'Cloud build services for compiling React Native apps', 'A design tool', 'A database service'], correctIndex: 1, explanation: 'EAS Build compiles your React Native app in the cloud, eliminating the need for local Xcode or Android Studio setup.' },
          { id: 'q3', question: 'Why is code signing important?', options: ['It encrypts the app', 'It verifies the app publisher identity and ensures integrity', 'It speeds up the build', 'It compresses the app'], correctIndex: 1, explanation: 'Code signing certificates prove the app comes from a verified publisher and has not been tampered with, which is required by both app stores.' }
        ]),
        resources: JSON.stringify([
          { title: 'Expo EAS Documentation', type: 'link', url: 'https://docs.expo.dev/eas/' },
          { title: 'Google Play Console', type: 'link', url: 'https://play.google.com/console/' },
          { title: 'App Store Connect', type: 'link', url: 'https://appstoreconnect.apple.com/' }
        ]),
        videoUrl: 'https://www.youtube.com/watch?v=0aGDe1Q1aJA'
      }
    );
  }

  if (learningModules.length > 0) {
    const insertModule = db.prepare(`
      INSERT INTO learning_modules (internshipId, title, description, moduleOrder, durationMinutes, difficulty, topics, learningObjectives, contentSections, quizQuestions, resources, videoUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const mod of learningModules) {
      insertModule.run(
        mod.internshipId, mod.title, mod.description, mod.moduleOrder, mod.durationMinutes,
        mod.difficulty, mod.topics, mod.learningObjectives, mod.contentSections,
        mod.quizQuestions, mod.resources, mod.videoUrl
      );
    }
    console.log(`Seed learning modules created: ${learningModules.length} modules`);
  }
}

// One-time normalization: the old checkout created enrollments at 100% progress
// for tracks that had no published learning modules, which rendered them as
// completed tracks with an unlocked exam. Reset those to 0% — progress is
// derived from completed modules only.
db.prepare(`
  UPDATE enrollments SET progress = 0
  WHERE progress = 100
    AND internshipId NOT IN (SELECT DISTINCT internshipId FROM learning_modules)
`).run();

console.log('Database initialized successfully');

module.exports = db;
