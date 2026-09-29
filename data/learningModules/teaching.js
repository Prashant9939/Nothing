module.exports = [
  {
    title: 'Foundations of Pedagogy & Learning Theories',
    description: 'Explain how behaviourist, cognitivist and constructivist theories shape classroom decisions and apply cognitive load and alignment principles when planning a lesson.',
    moduleOrder: 1,
    durationMinutes: 60,
    difficulty: 'beginner',
    topics: 'Constructivism,Behaviourism,Cognitive Load,Constructive Alignment',
    learningObjectives: JSON.stringify([
      'Compare behaviourist, cognitivist and constructivist explanations of how learning occurs',
      'Identify the three types of cognitive load and reduce extraneous load in a lesson segment',
      'Apply constructive alignment to match objectives, learning activities and assessment evidence',
      'Analyse a classroom vignette using Piaget, Vygotsky and Skinner concepts'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Three Families of Learning Theory',
        content: "Behaviourism treats learning as a change in observable behaviour, shaped by stimuli, reinforcement and practice. Skinner's account of operant conditioning explains why a token economy, a well-timed specific compliment or a short drill after modelling can cement factual recall. When a teacher demonstrates a method, checks it with the whole class and then gives immediate corrective feedback on the next three questions, the lesson is leaning on behaviourist principles: behaviour, consequence, repetition.\n\nCognitivism moves the spotlight inside the mind, where information enters working memory, is organised into schemas and stored in long-term memory. Constructivism, associated with Piaget and Vygotsky, argues that learners build understanding actively by testing new experience against what they already believe. In practice this means posing a genuine problem first, letting pupils argue possible solutions, and only then supplying the formal vocabulary once their thinking has somewhere to attach itself."
      },
      {
        id: 's2',
        type: 'text',
        title: 'Working Memory and Cognitive Load',
        content: "Cognitive load theory starts from a hard constraint: working memory can hold only a handful of new elements at once, and it drops them within seconds unless they are rehearsed or linked to what is already known. Sweller distinguishes three kinds of load. Intrinsic load comes from the difficulty of the material itself, such as balancing chemical equations. Extraneous load is waste created by the way material is presented. Germane load is the productive effort of building and refining schemas.\n\nTeachers manage load rather than eliminate it. Cut extraneous load by stripping decorative clutter, integrating labels into a diagram instead of keeping a separate key, and reading only what the slide does not already say. Manage intrinsic load by chunking the task, pre-teaching vocabulary and sequencing easy cases before complex ones. Then use worked examples and gradually fade them into completion problems, so novices can practise the steps without drowning in unfamiliar elements."
      },
      {
        id: 's3',
        type: 'text',
        title: 'From Theory to Aligned Practice',
        content: "Constructive alignment, the principle associated with John Biggs, requires three elements to point in the same direction. First write the outcome as an observable verb at the correct cognitive level: list, explain, apply, evaluate. Next, design activities in which students repeatedly perform that verb. Finally, collect evidence through an assessment that demands the same verb. An outcome that asks learners to evaluate two drainage plans should not be assessed by a recall quiz on drainage vocabulary.\n\nAlignment also clarifies what to do when a lesson disappoints. After class, reflective teachers note which objective stalled, form a hypothesis about why, and adjust one variable: the worked example, the grouping, the amount of scaffolding. Repeating this small cycle of plan, teach, observe and revise is action research in its everyday form. Theory therefore does not sit above practice as abstract knowledge; it supplies the hypotheses that classroom evidence then tests."
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'A student completes a difficult problem successfully only after the teacher offers hints and prompts. Which concept best explains why the hints matter?',
        options: ['Operant conditioning', 'Zone of proximal development', 'Classical conditioning', 'Assimilation into an existing schema'],
        correctIndex: 1,
        explanation: "Vygotsky's zone of proximal development is the gap between what a learner can do alone and what they can do with guidance. The hints are the temporary scaffolding that lets the student succeed inside that zone."
      },
      {
        id: 'q2',
        question: 'A slide shows a labelled diagram while the teacher reads a separate paragraph describing the same labels. Students copy both but fail the transfer question. What is the main problem?',
        options: ['The intrinsic load of the topic is too high', 'The students lack motivation to rehearse', 'Germane load has been squeezed out by over-practice', 'Extraneous load caused by split attention'],
        correctIndex: 3,
        explanation: 'Learners must search back and forth between the diagram and the text, which is processing that serves no learning goal. Integrating labels into the diagram removes the split attention and frees working memory for the concept itself.'
      },
      {
        id: 'q3',
        question: 'Which combination demonstrates constructive alignment?',
        options: [
          'Objective: evaluate two proposals; task: rank them with a published rubric; evidence: scored written critique',
          'Objective: remember key dates; task: group debate; evidence: attendance record',
          'Objective: understand fractions; task: silent copying; evidence: neat handwriting',
          'Objective: create a model; task: watch a demonstration; evidence: behaviour points'
        ],
        correctIndex: 0,
        explanation: 'The objective, the activity and the evidence all demand the same verb, evaluate, through the same kind of thinking. The other pairings assess something different from what the objective claims.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'Simply Psychology - Learning Theories', type: 'link', url: 'https://www.simplypsychology.org/theories/learning-theories' },
      { title: 'American Psychological Association', type: 'link', url: 'https://www.apa.org/' },
      { title: 'Edutopia - What Works in Education', type: 'link', url: 'https://www.edutopia.org/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Lesson Planning & Curriculum Design',
    description: "Design standards-aligned lessons using backward design, Bloom's taxonomy and a deliberate lesson arc, then set homework and activities that genuinely serve each objective.",
    moduleOrder: 2,
    durationMinutes: 55,
    difficulty: 'beginner',
    topics: "Backward Design,Bloom's Taxonomy,Scope and Sequence,Learning Outcomes,Formative Checks",
    learningObjectives: JSON.stringify([
      'Apply the three stages of backward design to a single lesson or unit',
      'Write measurable learning outcomes using observable Bloom verbs',
      'Sequence a lesson arc from hook to closure with embedded checks for understanding',
      'Justify homework and resource choices by the objective they reinforce'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Begin With the Destination: Backward Design',
        content: "Backward design inverts the familiar habit of opening the textbook and teaching page by page. Grant Wiggins and Jay McTighe describe three stages: identify the desired results, determine acceptable evidence of learning, and only then plan the learning experiences that will get students there. Starting with evidence forces an important question before any activity is chosen: what would convince me that these students actually understand this?\n\nWrite outcomes so that another teacher could observe and score them. A measurable outcome reads, students will compare two poems using three criteria and justify a preference with textual evidence, rather than students will appreciate poetry. Attach each outcome to a syllabus point or standard, decide how many lessons it needs, and place the checks that will tell you whether the class is ready to move on."
      },
      {
        id: 's2',
        type: 'text',
        title: 'Sequencing the Lesson Arc',
        content: "A complete lesson follows a deliberate arc. Open with a hook: a question, a puzzling image or a short case that activates prior knowledge and creates a need to know. Follow with focused input and modelling, where the teacher thinks aloud while demonstrating the skill. Move quickly into guided practice with heavy questioning, then release students to independent practice while you circulate and confer with individuals.\n\nClose deliberately. Ask students to summarise the key idea in one sentence, answer a final hinge question on exit tickets, or state what they still find confusing, then plan tomorrow's start from those responses. Across a unit, scope and sequence prevents repetition and makes sure prerequisites arrive before the tasks that need them. Bloom's verbs keep objectives honest: if the objective says analyse, students must analyse during the lesson, not only during the examination."
      },
      {
        id: 's3',
        type: 'text',
        title: 'Activities, Homework and Resources That Serve the Objective',
        content: "Every resource should earn its place by advancing an outcome. Before photocopying a worksheet, ask which objective it serves, which learners it fits, and what you will do with the responses. A broad bank of entry points, worked examples, manipulatives, short clips and past student work lets you swap the activity while keeping the objective fixed, which is the practical heart of planning a unit for mixed ability.\n\nHomework exists to reinforce and extend classroom learning, not to occupy evenings. Assign practice that has already been modelled in class, keep it short and purposeful, and vary it: retrieval practice for the class that forgot, a stretch problem for those ready, a corrective set for those who stumbled. Attach success criteria so students can self-check, and review answers at the start of the next lesson, because unreviewed homework teaches learners that their effort is ignored."
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'What comes first in the backward design process?',
        options: ['Identifying the desired results and learning outcomes', 'Choosing the textbook chapters', 'Designing the photocopied worksheet', 'Booking the examination hall'],
        correctIndex: 0,
        explanation: 'Backward design fixes the destination first, because the outcomes determine what evidence will count and which activities are worth planning. Textbook and activity choices come last.'
      },
      {
        id: 'q2',
        question: 'Which learning objective is most measurable?',
        options: ['Students will understand quadratic equations', 'Students will be familiar with the causes of the war', 'Students will compare two causes of the war using three stated criteria', 'Students will know the key vocabulary'],
        correctIndex: 2,
        explanation: 'Compare using three stated criteria names an observable action and a standard, so another teacher could collect the same evidence and reach a similar judgement. Understand, familiar and know leave the standard undefined.'
      },
      {
        id: 'q3',
        question: 'A teacher opens a probability lesson by asking students to predict how many people are needed for a 50 percent chance of a shared birthday. What is this opener doing?',
        options: ['Filling time before the register is taken', 'Testing recall of last term', 'Establishing silence so written work can begin', 'Creating a need to know that activates prior knowledge'],
        correctIndex: 3,
        explanation: 'An engaging question or real-life example creates cognitive conflict, so students discover that their existing ideas are insufficient. That gap motivates the explanation that follows.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'ASCD - Curriculum Design and Lesson Planning', type: 'link', url: 'https://www.ascd.org/' },
      { title: 'Edutopia - Teaching Strategies', type: 'link', url: 'https://www.edutopia.org/' },
      { title: 'UNESCO - Education Programmes', type: 'link', url: 'https://www.unesco.org/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Classroom Management Strategies',
    description: 'Establish a calm, purposeful classroom by preventing disruption through routines, responding to behaviour proportionately and building motivation through cooperative structures.',
    moduleOrder: 3,
    durationMinutes: 50,
    difficulty: 'intermediate',
    topics: 'Routines and Expectations,Preventive Management,Positive Reinforcement,Conflict Resolution,Cooperative Learning',
    learningObjectives: JSON.stringify([
      'Draft positively stated rules and teach the routines that make them visible',
      'Select the lightest effective response to a range of classroom disruptions',
      'Balance positive reinforcement with clear, consistently applied consequences',
      'Structure a cooperative learning task with roles and individual accountability'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Prevention: Rules, Routines and the First Weeks',
        content: "Most disruption is a planning problem before it is a discipline problem. Post three to five positively stated rules, such as enter quietly and begin the warm-up, then teach each routine explicitly the way you would teach a skill: explain it, model it, rehearse it, and re-teach until the transition happens without your voice. The first weeks effectively decide the year, because routines practised under calm conditions survive busy ones.\n\nDesign the physical space to support the plan: clear sightlines, materials within reach, and defined places for handing in work. Prepare a consistent opening task so early arrivals have immediate purpose. Time your transitions and choose a signal, decide in advance how questions are asked during instruction, and anticipate predictable flashpoints such as group changes or device distribution. Preventive management is largely the removal of ambiguity, and ambiguity is exactly what students test."
      },
      {
        id: 's2',
        type: 'text',
        title: 'Responding: Reinforce, Redirect, Repair',
        content: "When behaviour does appear, respond with the lightest step that works. Notice and name the behaviour you want, because specific praise for process, you showed every step of your reasoning, reinforces far more than a vague good job. Then redirect quietly and non-confrontationally: a gesture, proximity, a private word at the desk. Keep your contacts with any one student running at roughly four or five positives for every correction, so the relationship can absorb the correction.\n\nNever compete for control in front of the class. State the logical consequence that follows from the behaviour, apply it evenly, and move on with the lesson. If the incident was serious, repair it later through a restorative conversation: what happened, who was affected, what needs to change. Keep a simple tally sheet of incidents, because a cluster of off-task behaviour at ten forty usually points to task design, pace or an unmet need rather than defiance."
      },
      {
        id: 's3',
        type: 'text',
        title: 'Climate, Motivation and Cooperative Structures',
        content: "Management works best when the classroom is a place students want to be. Intrinsic motivation, driven by interest and mastery, outlasts stickers and points, so protect it by offering meaningful choice, appropriate challenge and work that connects to students' lives. Extrinsic systems have a role early on while routines are forming, but they should fade, and public ranking usually damages the very motivation you hoped to build.\n\nCooperative learning converts management from control into shared purpose when five conditions are present: positive interdependence, individual accountability, face-to-face interaction, explicit social skills, and group processing. Assign roles such as recorder, timekeeper and checker, grade part of the task individually, and finish with a one-minute review of how the group worked. Structures like these give restless students a job, keep every learner visible, and turn the teacher from traffic controller into coach."
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'Which classroom management approach is most effective over a full school year?',
        options: ['Punishing minor errors publicly to make an example', 'Consistent routines paired with positive reinforcement', 'Ignoring low-level disruption until it escalates', 'Showing visible favouritism toward high achievers'],
        correctIndex: 1,
        explanation: 'Predictable routines plus reinforcement of desired behaviour prevent most problems and preserve the teacher-student relationship. Punishment, neglect and favouritism all escalate conflict or damage trust.'
      },
      {
        id: 'q2',
        question: "During your explanation a student calls out an answer without raising a hand. What is the best first response?",
        options: ['Stop the lesson and reprimand the class loudly', 'Ignore it completely with no acknowledgment at all', 'Signal the rule non-verbally, continue teaching, then speak to the student afterwards', 'Send the student out of the classroom immediately'],
        correctIndex: 2,
        explanation: 'A non-verbal cue keeps the instructional flow intact and avoids a public power struggle, while the private follow-up makes sure the expectation is understood. Ignoring teaches the rule is optional; sending the student out is a grossly disproportionate first step.'
      },
      {
        id: 'q3',
        question: 'A student keeps reading a novel during independent work even though no reward or grade is attached. Which statement is best supported?',
        options: ['The behaviour is driven by intrinsic motivation', 'The behaviour is being reinforced by grades', 'The behaviour is a sign of learned helplessness', 'The behaviour results from excessive praise'],
        correctIndex: 0,
        explanation: 'Intrinsic motivation comes from internal interest and satisfaction. With no external reward present, the activity itself is sustaining the behaviour, which is exactly what teachers should try to cultivate.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'Center on PBIS - Classroom Practices', type: 'link', url: 'https://www.pbis.org/' },
      { title: 'National Association of School Psychologists', type: 'link', url: 'https://www.nasponline.org/' },
      { title: 'Edutopia - Classroom Management', type: 'link', url: 'https://www.edutopia.org/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Assessment, Feedback & Evaluation',
    description: 'Choose and build valid formative and summative assessments, write rubrics and measurement-sound items, and deliver feedback that measurably narrows the gap in student learning.',
    moduleOrder: 4,
    durationMinutes: 65,
    difficulty: 'intermediate',
    topics: 'Formative Assessment,Summative Assessment,Rubrics,Validity and Reliability,Feedback',
    learningObjectives: JSON.stringify([
      'Differentiate formative and summative purposes and select appropriate techniques',
      'Construct an analytic rubric with criteria, levels and observable descriptors',
      'Distinguish validity from reliability when judging an assessment task',
      'Write feedback that names the gap and the next action for the learner'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Assessment For, As and Of Learning',
        content: "Formative assessment happens while learning is still moving, and its purpose is diagnostic: it tells teacher and student what to do next. Low-cost techniques carry most of the value, such as an entry ticket recalling last lesson, a hinge question at the midpoint of a topic, an exit ticket naming the big idea, or cold-calling with wait time so everyone must formulate an answer rather than only the confident volunteers responding.\n\nSummative assessment closes the unit and certifies attainment through examinations, projects or portfolios. The two are not rivals: good formative practice regularly rehearses the demands of the summative task, so the final assessment holds no surprises. A workable routine is to collect five minutes of evidence daily, scan it that evening against two or three success criteria, group students for the next lesson, and reteach the concept that the majority misinterpreted rather than pressing on regardless."
      },
      {
        id: 's2',
        type: 'text',
        title: 'Designing Sound Tools: Rubrics, Items and Measurement',
        content: "A rubric turns a vague judgement into a transparent one by naming the criteria, the performance levels and what each level looks like; its primary purpose is to provide clear scoring criteria, ideally shared with students before they begin. Analytic rubrics score each criterion separately and give diagnostic detail, while holistic rubrics produce one overall judgement and are faster for long responses. Draft the descriptors with samples of real student work to hand, so the language matches what learners actually produce.\n\nTwo technical properties protect your grades. Reliability means the score would be consistent if the work were marked again or by another marker, improved by blind marking, moderation with a colleague and marker training. Validity means the task measures what it claims to measure, so a reading test must not be blocked by difficult vocabulary in its instructions. When writing multiple-choice items, keep one defensible key, make distractors plausible, and avoid trick questions that reward test-wiseness."
      },
      {
        id: 's3',
        type: 'text',
        title: 'Feedback That Moves Learning Forward',
        content: "Feedback is information about the gap between current and desired performance, not a reward or a verdict. Effective feedback is timely, while the work and criteria are still fresh, and specific, pointing to one or two priorities rather than a general comment. Hattie and Timperley's three questions give a workable structure: where am I going, how am I going, where to next. Your claim is clear but the second paragraph only retells the story, add one piece of evidence and explain it, beats a bare score every time.\n\nSeparate marks from comments where possible, because students often stop reading once the grade appears; return annotated drafts first and grade after revision. Include a required student action, such as rewriting the introduction with a counter-argument, and give lesson time to act on it. Peer and self assessment build the internalised criteria that make learners independent, provided exemplars come first. Track which comments actually change the next piece of work; that evidence is action research in your own classroom."
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'What is the primary purpose of a rubric?',
        options: ['To reduce marking time at any cost', 'To rank students publicly', 'To replace the need for feedback entirely', 'To provide clear scoring criteria before students begin'],
        correctIndex: 3,
        explanation: 'A rubric makes the standards explicit in advance so students know what success looks like and markers apply consistent criteria. Speed and ranking are incidental at best.'
      },
      {
        id: 'q2',
        question: 'A teacher marks the same essays twice, a fortnight apart, and obtains almost identical scores. Which property of assessment is demonstrated?',
        options: ['Reliability', 'Validity', 'Generalisability', 'Sensitivity'],
        correctIndex: 0,
        explanation: 'Reliability is consistency of results across occasions or markers. Validity is a different question: whether the task measures what it claims to measure.'
      },
      {
        id: 'q3',
        question: 'Which comment is most likely to improve the student’s next piece of work?',
        options: ['Well done, 7 out of 10.', 'See me.', 'Your claim is clear, but the second paragraph only retells the story; add one piece of evidence and explain how it supports the claim.', 'Careless work.'],
        correctIndex: 2,
        explanation: 'The comment is specific, timely and names an action the student can take, which is what moves learning forward. A mark, a summons or a label gives the learner nothing to do.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'ASCD - Assessment and Grading', type: 'link', url: 'https://www.ascd.org/' },
      { title: 'ETS - Assessment Research and Measurement', type: 'link', url: 'https://www.ets.org/' },
      { title: 'OECD - Education and Skills', type: 'link', url: 'https://www.oecd.org/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Differentiated & Inclusive Instruction',
    description: 'Differentiate content, process and product while designing universally accessible, inclusive lessons that scaffold every learner toward the same rigorous outcomes.',
    moduleOrder: 5,
    durationMinutes: 60,
    difficulty: 'advanced',
    topics: 'Differentiated Instruction,Universal Design for Learning,Inclusive Education,Scaffolding,Zone of Proximal Development',
    learningObjectives: JSON.stringify([
      'Use pre-assessment data to differentiate content, process, product and environment',
      'Redesign a lesson using the three principles of universal design for learning',
      'Distinguish accommodations from modifications in an inclusive classroom',
      'Apply the gradual release model to fade scaffolds within the zone of proximal development'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Differentiating Content, Process, Product and Environment',
        content: "Differentiation means tailoring instruction to the varied needs of learners rather than teaching everyone identically, and it starts with data. A short pre-test, an entry task or a vocabulary sort reveals who already knows the material and who is missing prerequisites. With that picture you differentiate four variables: content, the complexity of the texts and models students receive; process, the thinking paths and grouping used; product, the ways students demonstrate learning; and environment, the seating, tools and noise level.\n\nKeep the outcome constant and vary the route. In a lesson on fractions, one group works with fraction strips at a teacher table, another tackles equivalent-fraction puzzles, and a third explains their reasoning to a peer, all reaching the same objective. Tier texts into two or three levels rather than fixed tracks, use flexible grouping that changes with the topic, and offer choice boards for the final product. Plan this deliberately, because improvising differentiation for every individual request collapses into chaos."
      },
      {
        id: 's2',
        type: 'text',
        title: 'Inclusion and Universal Design for Learning',
        content: "An inclusive classroom teaches diverse learners together with the support they need, instead of segregating anyone by attainment or diagnosis. Universal Design for Learning supplies the design logic: offer multiple means of engagement to motivate, multiple means of representation to present information, and multiple means of action and expression for students to show what they know. One lesson might include an audio version of the article, a visual summary, and the option to answer in writing, speech or diagram.\n\nInclusion also means honouring individual plans such as an IEP or its local equivalent, and coordinating accommodations with colleagues. Accommodations change how a student accesses or demonstrates learning, such as extended time or a reader; modifications change what is expected. Check materials for accessibility before the lesson: captions, readable fonts, alt text and printable formats. Expect some resistance to the idea that support for a few benefits everyone, and answer it with evidence, because ramps, captions and clear instructions improved the experience of every user."
      },
      {
        id: 's3',
        type: 'text',
        title: 'Scaffolding Within the Zone of Proximal Development',
        content: "Vygotsky's zone of proximal development names the distance between what a learner can do alone and what they can achieve with guidance. Effective scaffolding sits precisely in that gap: the support is temporary, matched to the task, and removed as competence grows. The construction metaphor is deliberate, which is why the term scaffolding comes from temporary support structures used during building work rather than from books, shelves or sports equipment.\n\nWork the scaffold in three moves. Model the task aloud with think-aloud reasoning, then practise together with prompts and cues, and finally release to independent work while you check. Useful scaffolds include annotated exemplars, graphic organisers, sentence stems, step checklists and strategic questioning. Fade them deliberately: remove the sentence stems in the second task and the checklist in the third. Feedback during the scaffold should name the strategy rather than only the error, so students eventually perform the self-monitoring you are modelling for them."
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'A teacher models a paragraph, co-writes the next one with the class, then sets students to write independently while she conferences with individuals. What is she doing?',
        options: ['Setting three unrelated tasks', 'Applying summative assessment', 'Scaffolding within the zone of proximal development', 'Modifying the curriculum expectations'],
        correctIndex: 2,
        explanation: 'The sequence of model, shared practice, independent practice is gradual release: temporary support matched to the learner’s current capacity and then withdrawn, which is exactly what scaffolding in the ZPD means.'
      },
      {
        id: 'q2',
        question: 'Which lesson design best reflects universal design for learning?',
        options: ['All students read the same printed article and answer identical questions', 'The article is offered as text and audio, and students may respond in writing, speech or diagram', 'Students who need support are given extra homework', 'The teacher repeats the same explanation more slowly'],
        correctIndex: 1,
        explanation: 'UDL builds multiple means of representation and of action and expression into the design from the start, so access is not an afterthought patched in for a few learners.'
      },
      {
        id: 'q3',
        question: 'A teacher varies methods, materials, seating arrangements and pacing so that a mixed-ability class can all reach the same objective. What is this practice called?',
        options: ['Ability streaming', 'Rote learning', 'Uniform instruction', 'Differentiated instruction'],
        correctIndex: 3,
        explanation: 'Differentiated instruction means tailoring teaching to varied learner needs while holding the objective steady. Streaming groups students permanently by attainment, and uniform instruction is the opposite of what is described.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'CAST - Universal Design for Learning Guidelines', type: 'link', url: 'https://udlguidelines.cast.org/' },
      { title: 'Understood - Educator Resources', type: 'link', url: 'https://www.understood.org/' },
      { title: 'U.S. Department of Education - IDEA', type: 'link', url: 'https://sites.ed.gov/idea/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Technology-Enhanced Teaching (ICT in Education)',
    description: 'Evaluate and integrate digital tools, smart-classroom resources and a learning management system so technology deepens learning rather than distracting students from it.',
    moduleOrder: 6,
    durationMinutes: 45,
    difficulty: 'intermediate',
    topics: 'ICT Integration,Smart Classrooms,Learning Management Systems,Digital Assessment,TPACK',
    learningObjectives: JSON.stringify([
      'Judge whether a digital tool adds real pedagogical value using SAMR and TPACK',
      'Set up an LMS workflow for distributing, submitting and feeding back on work',
      'Establish device routines and digital citizenship norms before a ICT lesson',
      'Evaluate the impact of a technology intervention with classroom evidence'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Why and When Technology Adds Value',
        content: "Technology earns its place in a lesson only when it makes something easier, quicker or possible that was not before. The substitution, augmentation, modification, redefinition model offers a quick test: does the tool simply digitise the worksheet, or does it let students create, collaborate and publish for a real audience? A smart class, meaning an ICT-enabled room with an interactive display, visualiser and shared digital content, raises possibilities but raises no learning on its own.\n\nThe TPACK frame adds pedagogical judgement to the mix: meaningful integration blends technological knowledge with content knowledge and teaching knowledge, and collapses if any one leg is missing. Plan from the objective backwards, then ask what the technology uniquely affords. A physics teacher who replaces a static diagram with an interactive simulation of forces, lets pairs predict outcomes and then discusses the discrepancies, is using technology to do something chalk could not. If the honest answer is that the file merely looks nicer, keep the chalk."
      },
      {
        id: 's2',
        type: 'text',
        title: 'Tools in Practice: Platforms, Simulations and Collaboration',
        content: "A learning management system such as Moodle gives the course a stable home: materials in one place, assignments distributed with due dates, submissions collected automatically, quizzes that mark themselves and forums that extend discussion beyond the bell. Start small by moving one existing unit into the platform, then add a single new feature per term, such as a weekly discussion prompt or a self-marked retrieval quiz that returns feedback immediately.\n\nSimulations and open resources add depth that textbooks cannot. Interactive science simulations let students vary a variable and watch the consequences, which supports hypothesis testing rather than passive reading, while open educational resources and museum archives supply authentic primary material. Collaborative documents allow simultaneous drafting, comment threads and version history, so group work becomes visible to the teacher instead of hidden behind one loud voice. Each tool should answer a pedagogical question you already have, not the other way round."
      },
      {
        id: 's3',
        type: 'text',
        title: 'Managing ICT Lessons and Evaluating Impact',
        content: "Device-rich lessons fail on logistics more often than on technology. Set non-negotiable routines: screens tilted down when the teacher speaks, a named technologist in each group, a visible countdown for transitions, and a paper fallback ready for outages. Establish expectations for digital citizenship too, covering respectful communication, checking sources, citing work and protecting personal data, because online spaces need the same norms as the classroom itself.\n\nFinally, evaluate impact honestly. Compare performance on the objective before and after the tool was introduced, ask students what actually helped, and watch for displacement effects where time spent on setup eats into thinking time. Evidence gathered this way feeds action research cycles and keeps enthusiasm anchored in outcomes. Protect equity throughout: provide alternatives for students without home devices, check accessibility features, and remember that the standard for success is deeper learning rather than a room full of glowing screens."
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'Which of these is best described as a smart class?',
        options: ['An ICT-enabled classroom with an interactive display and digital resources', 'A classroom with a single wall clock', 'A reading corner at the back of the room', 'A class taught entirely without learning materials'],
        correctIndex: 0,
        explanation: 'A smart class is an example of ICT-enabled teaching: the room is equipped with interactive digital tools that the teacher and students use as part of instruction.'
      },
      {
        id: 'q2',
        question: 'A teacher wants students to submit drafts, receive comments, revise, and track deadlines in one place. Which tool is most appropriate?',
        options: ['A spreadsheet of marks', 'A printed newsletter', 'A classroom seating plan', 'A learning management system such as Moodle'],
        correctIndex: 3,
        explanation: 'An LMS handles distribution, submission, feedback, deadlines and forums in one system. Moodle is a widely used example of exactly this category of tool.'
      },
      {
        id: 'q3',
        question: 'In the SAMR model, replacing a paper worksheet with an identical digital PDF that students complete on screen is an example of which level?',
        options: ['Redefinition', 'Substitution', 'Modification', 'Augmentation'],
        correctIndex: 1,
        explanation: 'Substitution is a direct swap with no functional change to the task. Only at modification and redefinition does technology change the task itself, for example through collaboration or authentic audiences.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'ISTE - Technology Standards for Educators', type: 'link', url: 'https://iste.org/' },
      { title: 'PhET Interactive Simulations', type: 'link', url: 'https://phet.colorado.edu/' },
      { title: 'UNESCO - ICT in Education', type: 'link', url: 'https://www.unesco.org/' }
    ]),
    videoUrl: null
  }
];
