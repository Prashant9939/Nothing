const questions = {
  web: [
    { id: 1, question: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'], correct: 0 },
    { id: 2, question: 'Which CSS property is used to change text color?', options: ['font-color', 'text-color', 'color', 'foreground'], correct: 2 },
    { id: 3, question: 'Which tag is used to create an unordered list in HTML?', options: ['<ol>', '<ul>', '<li>', '<list>'], correct: 1 },
    { id: 4, question: 'What is the correct way to reference an external script in HTML?', options: ['<script src="app.js">', '<script href="app.js">', '<script ref="app.js">', '<script link="app.js">'], correct: 0 },
    { id: 5, question: 'Which CSS display value makes an element a flex container?', options: ['display: flexbox', 'display: flex', 'display: float', 'display: inline-flex'], correct: 1 },
    { id: 6, question: 'What does the "this" keyword refer to in a regular JavaScript function?', options: ['The function itself', 'The object that called the function', 'The global object', 'undefined'], correct: 1 },
    { id: 7, question: 'Which method adds an element to the end of an array?', options: ['array.add()', 'array.push()', 'array.append()', 'array.insert()'], correct: 1 },
    { id: 8, question: 'What is the box model in CSS?', options: ['A 3D modeling technique', 'Content, padding, border, margin layout model', 'A JavaScript framework', 'A responsive design method'], correct: 1 },
    { id: 9, question: 'Which HTTP method is used to update existing data?', options: ['GET', 'POST', 'PUT', 'DELETE'], correct: 2 },
    { id: 10, question: 'What is the purpose of npm?', options: ['Node Package Manager for installing dependencies', 'A JavaScript framework', 'A database tool', 'A testing library'], correct: 0 },
    { id: 11, question: 'What is a closure in JavaScript?', options: ['A way to close browser windows', 'A function with access to its outer scope variables', 'A loop construct', 'A method to end a program'], correct: 1 },
    { id: 12, question: 'Which CSS property creates space between elements?', options: ['spacing', 'gap', 'margin', 'indent'], correct: 2 },
    { id: 13, question: 'What does REST stand for in web APIs?', options: ['Remote Execution State Transfer', 'Representational State Transfer', 'Resource Entity State Transfer', 'Real-time Event State Transfer'], correct: 1 },
    { id: 14, question: 'Which event fires when a user clicks on an element?', options: ['onmouseclick', 'onclick', 'onpress', 'ontap'], correct: 1 },
    { id: 15, question: 'What is responsive web design?', options: ['Designing fast websites', 'Designing that adapts to different screen sizes', 'Designing with animations', 'Designing single-page apps'], correct: 1 },
    { id: 16, question: 'What is the virtual DOM?', options: ['A copy of the real DOM in memory', 'A browser API', 'A CSS technique', 'A database'], correct: 0 },
    { id: 17, question: 'Which protocol is used for secure web communication?', options: ['HTTP', 'FTP', 'HTTPS', 'SMTP'], correct: 2 },
    { id: 18, question: 'What is localStorage in browsers?', options: ['A server-side storage', 'Client-side key-value storage', 'A database', 'A caching method'], correct: 1 },
    { id: 19, question: 'Which CSS unit is relative to the parent element font size?', options: ['px', 'em', 'vh', 'cm'], correct: 1 },
    { id: 20, question: 'What is a Promise in JavaScript?', options: ['A guarantee of payment', 'An object representing eventual completion of an async operation', 'A type of variable', 'A function decorator'], correct: 1 },
  ],
  python: [
    { id: 1, question: 'What is the output of print(type(5))?', options: ['<class "int">', '<class "float">', '<class "number">', '<class "long">'], correct: 0 },
    { id: 2, question: 'Which keyword is used to define a function in Python?', options: ['function', 'func', 'def', 'define'], correct: 2 },
    { id: 3, question: 'What is the correct file extension for Python files?', options: ['.python', '.py', '.pt', '.pyt'], correct: 1 },
    { id: 4, question: 'How do you create a list in Python?', options: ['list = (1, 2, 3)', 'list = [1, 2, 3]', 'list = {1, 2, 3}', 'list = <1, 2, 3>'], correct: 1 },
    { id: 5, question: 'What does "pip" stand for?', options: ['Python Installation Program', 'Pip Installs Packages', 'Python Interface Protocol', 'Package Index Protocol'], correct: 1 },
    { id: 6, question: 'Which of these is a mutable data type in Python?', options: ['tuple', 'string', 'list', 'frozenset'], correct: 2 },
    { id: 7, question: 'What is the output of print(2 ** 3)?', options: ['6', '8', '5', '23'], correct: 1 },
    { id: 8, question: 'Which method removes the last element from a list?', options: ['list.remove()', 'list.pop()', 'list.delete()', 'list.cut()'], correct: 1 },
    { id: 9, question: 'What is a class in Python?', options: ['A data type', 'A blueprint for creating objects', 'A function', 'A variable'], correct: 1 },
    { id: 10, question: 'What is the correct way to import a module?', options: ['include module', 'import module', 'require module', 'use module'], correct: 1 },
    { id: 11, question: 'What is a dictionary in Python?', options: ['An ordered collection', 'A key-value pair collection', 'A numbered list', 'A type of string'], correct: 1 },
    { id: 12, question: 'What is the output of print("Hello"[0])?', options: ['H', 'h', 'Hello', '0'], correct: 0 },
    { id: 13, question: 'Which keyword is used for exception handling?', options: ['catch', 'except', 'handle', 'error'], correct: 1 },
    { id: 14, question: 'What is PEP 8?', options: ['A Python compiler', 'A style guide for Python code', 'A testing framework', 'A package manager'], correct: 1 },
    { id: 15, question: 'How do you start a comment in Python?', options: ['//', '#', '/*', '--'], correct: 1 },
    { id: 16, question: 'What is list comprehension?', options: ['Understanding lists', 'A concise way to create lists', 'A sorting algorithm', 'A list method'], correct: 1 },
    { id: 17, question: 'What does "self" represent in a class?', options: ['The class itself', 'The current instance of the class', 'A parent class', 'A global variable'], correct: 1 },
    { id: 18, question: 'Which module is used for regular expressions?', options: ['regex', 're', 'regexp', 'pattern'], correct: 1 },
    { id: 19, question: 'What is a virtual environment?', options: ['A browser environment', 'An isolated Python environment', 'A Docker container', 'A VM'], correct: 1 },
    { id: 20, question: 'What is the output of print(bool(""))?', options: ['True', 'False', 'None', 'Error'], correct: 1 },
  ],
  data: [
    { id: 1, question: 'What is NumPy primarily used for?', options: ['Web development', 'Numerical computing', 'Game development', 'Mobile apps'], correct: 1 },
    { id: 2, question: 'What does SQL stand for?', options: ['Structured Query Language', 'Simple Query Language', 'Standard Query Logic', 'System Query Language'], correct: 0 },
    { id: 3, question: 'Which library is used for data manipulation in Python?', options: ['Matplotlib', 'Pandas', 'Flask', 'Django'], correct: 1 },
    { id: 4, question: 'What is a CSV file?', options: ['A database', 'Comma-Separated Values text file', 'A compiled file', 'An image format'], correct: 1 },
    { id: 5, question: 'What is exploratory data analysis (EDA)?', options: ['Building ML models', 'Analyzing datasets to summarize main characteristics', 'Writing production code', 'Deploying applications'], correct: 1 },
    { id: 6, question: 'What is the purpose of matplotlib?', options: ['Data manipulation', 'Data visualization', 'Database management', 'API development'], correct: 1 },
    { id: 7, question: 'What is a DataFrame?', options: ['A web component', 'A 2D labeled data structure', 'A type of chart', 'A database'], correct: 1 },
    { id: 8, question: 'Which SQL command is used to retrieve data?', options: ['GET', 'FETCH', 'SELECT', 'RETRIEVE'], correct: 2 },
    { id: 9, question: 'What is a primary key?', options: ['A password', 'A unique identifier for a record', 'A foreign reference', 'An index'], correct: 1 },
    { id: 10, question: 'What is data cleaning?', options: ['Deleting all data', 'Detecting and correcting corrupt records', 'Encrypting data', 'Compressing data'], correct: 1 },
    { id: 11, question: 'What is the mean?', options: ['Most frequent value', 'Average of all values', 'Middle value', 'Maximum value'], correct: 1 },
    { id: 12, question: 'What is correlation?', options: ['Data deletion', 'Statistical relationship between two variables', 'Data type', 'A database command'], correct: 1 },
    { id: 13, question: 'What is a scatter plot used for?', options: ['Showing trends over time', 'Showing relationship between two variables', 'Showing parts of a whole', 'Showing distribution'], correct: 1 },
    { id: 14, question: 'What is data normalization?', options: ['Deleting outliers', 'Scaling data to a standard range', 'Adding more data', 'Sorting data'], correct: 1 },
    { id: 15, question: 'What is an outlier?', options: ['A common data point', 'A data point significantly different from others', 'A missing value', 'A duplicate value'], correct: 1 },
    { id: 16, question: 'What is a JOIN in SQL?', options: ['Combining rows from two or more tables', 'Creating a new table', 'Deleting data', 'Updating records'], correct: 0 },
    { id: 17, question: 'What is time series data?', options: ['Data sorted alphabetically', 'Data indexed in time order', 'Random data', 'Spatial data'], correct: 1 },
    { id: 18, question: 'What does GROUP BY do in SQL?', options: ['Sorts data', 'Groups rows with same values for aggregation', 'Filters data', 'Joins tables'], correct: 1 },
    { id: 19, question: 'What is a histogram?', options: ['A type of table', 'A graphical representation of data distribution', 'A database query', 'A Python function'], correct: 1 },
    { id: 20, question: 'What is Big Data?', options: ['Large files', 'Extremely large datasets that may be analyzed computationally', 'Heavy databases', 'Compressed data'], correct: 1 },
  ],
  ai: [
    { id: 1, question: 'What does AI stand for?', options: ['Automated Intelligence', 'Artificial Intelligence', 'Advanced Integration', 'Auto Interface'], correct: 1 },
    { id: 2, question: 'What is machine learning?', options: ['A type of hardware', 'Systems that learn from data', 'A programming language', 'A database'], correct: 1 },
    { id: 3, question: 'What is a neural network?', options: ['A computer network', 'A computing system inspired by biological neural networks', 'A type of database', 'A social network'], correct: 1 },
    { id: 4, question: 'What is supervised learning?', options: ['Learning without data', 'Learning with labeled training data', 'Learning from rewards', 'Unsupervised learning'], correct: 1 },
    { id: 5, question: 'What is overfitting?', options: ['Model performs well on all data', 'Model learns noise in training data', 'Model is too simple', 'Model is too slow'], correct: 1 },
    { id: 6, question: 'What is TensorFlow?', options: ['A web framework', 'An open-source machine learning framework', 'A database', 'A testing tool'], correct: 1 },
    { id: 7, question: 'What is a dataset?', options: ['A single data point', 'A collection of data for analysis', 'A type of algorithm', 'A programming language'], correct: 1 },
    { id: 8, question: 'What is classification in ML?', options: ['Grouping similar items', 'Predicting a category label', 'Clustering data', 'Reducing dimensions'], correct: 1 },
    { id: 9, question: 'What is NLP?', options: ['Network Processing Language', 'Natural Language Processing', 'New Programming Language', 'Neural Language Protocol'], correct: 1 },
    { id: 10, question: 'What is a decision tree?', options: ['A file system structure', 'A flowchart-like model for decisions', 'A type of neural network', 'A data structure'], correct: 1 },
    { id: 11, question: 'What is deep learning?', options: ['Learning in-depth about a topic', 'ML with multiple layers of neural networks', 'Surface-level analysis', 'Basic programming'], correct: 1 },
    { id: 12, question: 'What is the purpose of a loss function?', options: ['To increase model size', 'To measure how far predictions are from actual values', 'To speed up training', 'To display results'], correct: 1 },
    { id: 13, question: 'What is an epoch in training?', options: ['A time period', 'One complete pass through the training data', 'A type of algorithm', 'A hyperparameter'], correct: 1 },
    { id: 14, question: 'What is reinforcement learning?', options: ['Learning from labeled data', 'Learning through trial and error with rewards', 'Learning without feedback', 'Clustering data'], correct: 1 },
    { id: 15, question: 'What is a CNN?', options: ['Cable News Network', 'Convolutional Neural Network', 'Computer Network Node', 'Central Neural Circuit'], correct: 1 },
    { id: 16, question: 'What is transfer learning?', options: ['Moving data between servers', 'Using a pre-trained model on a new task', 'Learning to transfer files', 'Network transfer'], correct: 1 },
    { id: 17, question: 'What is a gradient?', options: ['A type of color', 'A vector of partial derivatives', 'A data structure', 'A visualization type'], correct: 1 },
    { id: 18, question: 'What is the purpose of regularization?', options: ['Making models larger', 'Preventing overfitting by adding constraints', 'Speeding up training', 'Increasing accuracy only'], correct: 1 },
    { id: 19, question: 'What is computer vision?', options: ['Eye testing software', 'Field of AI that interprets visual information', 'Display technology', 'Video editing'], correct: 1 },
    { id: 20, question: 'What is a hyperparameter?', options: ['A model weight', 'A configuration set before training', 'An output variable', 'A training sample'], correct: 1 },
  ],
  cyber: [
    { id: 1, question: 'What does CIA stand for in security?', options: ['Central Intelligence Agency', 'Confidentiality, Integrity, Availability', 'Computer Information Assurance', 'Cyber Intelligence Analysis'], correct: 1 },
    { id: 2, question: 'What is a firewall?', options: ['A physical barrier', 'A network security device that monitors traffic', 'An antivirus', 'A type of malware'], correct: 1 },
    { id: 3, question: 'What is phishing?', options: ['A fishing technique', 'Fraudulent attempt to obtain sensitive information', 'A type of encryption', 'A network protocol'], correct: 1 },
    { id: 4, question: 'What is encryption?', options: ['Deleting data', 'Converting data into a coded format', 'Compressing data', 'Backing up data'], correct: 1 },
    { id: 5, question: 'What is a brute force attack?', options: ['Physical force attack', 'Trying all possible combinations to crack a password', 'Social engineering', 'A DDoS attack'], correct: 1 },
    { id: 6, question: 'What is two-factor authentication?', options: ['Using two passwords', 'Verification using two different methods', 'Two login attempts', 'Double encryption'], correct: 1 },
    { id: 7, question: 'What is a vulnerability?', options: ['A strength', 'A weakness that can be exploited', 'A type of malware', 'A security tool'], correct: 1 },
    { id: 8, question: 'What is DDoS?', options: ['Distributed Denial of Service', 'Direct Data on Server', 'Database Denial of System', 'Dynamic Data Operating System'], correct: 0 },
    { id: 9, question: 'What is a penetration test?', options: ['Physical break-in', 'Authorized simulated attack to test security', 'Software testing', 'Network speed test'], correct: 1 },
    { id: 10, question: 'What is malware?', options: ['Good software', 'Malicious software designed to harm', 'A type of hardware', 'A network tool'], correct: 1 },
    { id: 11, question: 'What is a zero-day exploit?', options: ['An exploit that takes zero days', 'An exploit targeting a previously unknown vulnerability', 'A slow exploit', 'A basic exploit'], correct: 1 },
    { id: 12, question: 'What is social engineering?', options: ['Engineering social media', 'Manipulating people into divulging information', 'Building social networks', 'A type of coding'], correct: 1 },
    { id: 13, question: 'What is a VPN?', options: ['Virtual Private Network', 'Very Private Network', 'Virtual Public Node', 'Verified Private Network'], correct: 0 },
    { id: 14, question: 'What is a SQL injection?', options: ['Adding SQL to databases', 'Inserting malicious SQL code through input fields', 'A database backup method', 'SQL optimization'], correct: 1 },
    { id: 15, question: 'What is the purpose of hashing?', options: ['Speed up queries', 'Create a fixed-size string from input data', 'Encrypt data for transmission', 'Compress files'], correct: 1 },
    { id: 16, question: 'What is XSS?', options: ['Cross-Site Scripting', 'Extra Secure System', 'Extended SSL Service', 'External Security Standard'], correct: 0 },
    { id: 17, question: 'What is an IDS?', options: ['Internet Download System', 'Intrusion Detection System', 'Identity Document System', 'Internal Data Server'], correct: 1 },
    { id: 18, question: 'What is port scanning?', options: ['Scanning documents', 'Probing a computer for open ports', 'Network speed testing', 'Checking printer status'], correct: 1 },
    { id: 19, question: 'What is the principle of least privilege?', options: ['Giving full access', 'Giving minimum necessary permissions', 'No access at all', 'Admin access for all'], correct: 1 },
    { id: 20, question: 'What is a security patch?', options: ['A physical patch', 'An update to fix security vulnerabilities', 'A type of firewall', 'An encryption method'], correct: 1 },
  ],
};

function getQuestionsByCategory(category, count = 10) {
  const pool = questions[category] || questions.web;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, pool.length));
}

function calculateScore(answers, category) {
  const pool = questions[category] || questions.web;
  let correct = 0;
  for (const answer of answers) {
    const q = pool.find(q => q.id === answer.questionId);
    if (q && q.correct === answer.selectedOption) {
      correct++;
    }
  }
  return Math.round((correct / pool.length) * 100);
}

module.exports = { questions, getQuestionsByCategory, calculateScore };
