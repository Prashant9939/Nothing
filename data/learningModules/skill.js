// Seed learning modules - Skill Development Program (category: 'skill')
module.exports = [
  {
    title: 'Effective Communication Skills',
    description: `Structure clear spoken and written messages, listen for real meaning before responding, and give feedback colleagues can act on the first time they hear it.`,
    moduleOrder: 1,
    durationMinutes: 55,
    difficulty: 'beginner',
    topics: 'Verbal Communication,Non-verbal Cues,Active Listening,Written Communication,Feedback',
    learningObjectives: JSON.stringify([
      'Structure a spoken message with a one-sentence opening, three supporting points, and a close that names the owner and deadline',
      'Use the four-step listening cycle to paraphrase a colleague accurately before offering advice',
      'Rewrite a workplace email so the required action appears in the subject line and first sentence',
      'Deliver behaviour-focused feedback using the Situation-Behaviour-Impact model in a two-minute conversation'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Structuring and Delivering Spoken Messages',
        content: `Workplace speech is judged on clarity, not eloquence. Begin with the point: say in one sentence what you need, what changed, or what you recommend, then offer at most three supporting facts, then close with the owner and the deadline. This is the inverted pyramid journalists use, and it survives interruption because the core message still lands if a manager stops you halfway through. Signpost while you speak with markers such as first, second, and finally, so the listener always knows where they are in your structure and what is coming next.\n\nDelivery carries the rest of the message. Nervous speakers raise their pitch and race ahead, which makes listeners doubt otherwise sound words, so slow down, pause for a beat after each key sentence, and let silence do the emphasising for you. Non-verbal signals must agree with the words: uncrossed arms, steady eye contact held for three or four seconds at a time, and a level tone signal confidence. When the verbal and non-verbal messages conflict, listeners trust the body, so rehearse the delivery out loud instead of only rereading your notes.`
      },
      {
        id: 's2',
        type: 'text',
        title: 'Active Listening and Useful Feedback',
        content: `Most workplace miscommunication is a listening failure rather than a speaking failure. Use a four-step cycle: attend by closing the laptop and facing the speaker, receive without rehearsing your reply, paraphrase what you heard in your own words, and confirm by asking whether you captured it correctly. Hold advice until the paraphrase has been accepted, because people who feel misunderstood stop listening and start defending. Replace assumptions with clarifying questions: instead of concluding that the deadline is Friday, ask what finished looks like and by when, then check the answer back before either of you moves on.\n\nFeedback lands when it describes behaviour and its effect rather than judging a person. The Situation-Behaviour-Impact model keeps you factual: name the situation, describe the specific behaviour you observed, then state the impact on the work. Telling a colleague that their update came after the group had gone quiet, costing five minutes of guessing, is usable; calling them unprepared invites an argument. Deliver feedback close to the event, check how the other person reads the situation, and agree one concrete change to try before the next cycle of work begins.`
      },
      {
        id: 's3',
        type: 'text',
        title: 'Writing Emails and Updates People Act On',
        content: `Assume the reader will never scroll. Put the action in the subject line, such as a decision needed by Thursday on the vendor renewal, and repeat it in the first line, so a manager who reads only the preview knows exactly what is being asked. Follow with two or three sentences of context, then the supporting detail or numbers, and finish with owner, deadline, and next step. This structure respects the reader's time and prevents the most common workplace complaint of all: a request buried in paragraph four of a long thread that nobody answers.\n\nEdit as though every word costs money. Cut throat-clearing openers when the request is urgent, swap passive constructions for a named actor, and prefer one concrete number to three adjectives. Match the channel to the task: chat for quick coordination, email for decisions and anything that must be recorded, and a live conversation for anything emotional or easily misread. Then read the message aloud once, because any sentence you stumble over is a sentence the reader will misread, and proofread names, dates, and amounts before you press send.`
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: `You have sixty seconds with a busy manager to explain a project delay. Which structure gives the message the best chance of landing?`,
        options: [
          'A chronological account from project kickoff to today',
          'The point first, then three supporting facts, then owner and deadline',
          'A full risk analysis so that nothing is left out',
          'An apology, then context, then the news'
        ],
        correctIndex: 1,
        explanation: `Point-first structure survives interruption: even if the manager stops you after twenty seconds, they already have the headline, the support, and the commitment attached to it.`
      },
      {
        id: 'q2',
        question: `Which opener best follows the Situation-Behaviour-Impact model?`,
        options: [
          'You are always unprepared for standups',
          'Your attitude in meetings needs work',
          'In this morning standup your update came after the group went quiet, so we lost five minutes guessing status',
          'Everyone on the team finds you difficult to work with'
        ],
        correctIndex: 2,
        explanation: `SBI names the situation, the observed behaviour, and its impact without judging character, which keeps the conversation about the work rather than about personality.`
      },
      {
        id: 'q3',
        question: `Which subject line follows the writing guidance in this module?`,
        options: [
          'Decision needed by Thursday: vendor renewal',
          'Quick question',
          'Update',
          'Following up on things'
        ],
        correctIndex: 0,
        explanation: `The subject line carries the action and the deadline, so a reader who sees only the preview still knows what is being asked and by when it is needed.`
      }
    ]),
    resources: JSON.stringify([
      { title: 'MindTools Communication Skills Collection', type: 'link', url: 'https://www.mindtools.com/' },
      { title: 'Purdue Online Writing Lab', type: 'link', url: 'https://owl.purdue.edu/' },
      { title: 'Harvard Business Review', type: 'link', url: 'https://hbr.org/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Teamwork & Workplace Collaboration',
    description: `Define who owns what, run meetings that end in decisions, and resolve disagreements on shared interests instead of positions, so the team keeps moving.`,
    moduleOrder: 2,
    durationMinutes: 60,
    difficulty: 'beginner',
    topics: 'Roles,Accountability,Meeting Discipline,Conflict Resolution,Peer Feedback',
    learningObjectives: JSON.stringify([
      'Map a project deliverable onto a RACI grid with exactly one accountable owner',
      'Write a standup update that covers completed work, next steps, and blockers in under one minute',
      'Resolve a workplace disagreement by listing shared interests before generating options',
      'Give peer feedback on one observed behaviour and its effect on the work'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Roles, Goals and the Team Charter',
        content: `Teams fail quietly when ownership is fuzzy, so write it down instead. For each deliverable, mark one person responsible for doing the work, exactly one person accountable for the outcome, the experts consulted before a decision, and everyone informed after it. This RACI grid takes ten minutes to draw and ends the classic standoff in which two people each assumed the other was chasing the client. Pair it with a single shared goal stated in measurable terms, so that local choices can be tested against the same target rather than against personal preference.\n\nA short team charter makes the agreements explicit before pressure arrives. Record how the team communicates, which channel carries which message, how decisions get made when the lead is absent, and what counts as done. Teams that agree on meeting norms, response-time expectations, and escalation paths spend far less energy renegotiating them during a crisis. Revisit the charter whenever the team changes or a project crosses a milestone, because a charter that is never reread decays into assumption, and assumption is where most collaboration friction quietly begins.`
      },
      {
        id: 's2',
        type: 'text',
        title: 'Keeping the Team Informed',
        content: `Status communication is a service to everyone waiting on you. In a standup or written update, state what you completed, what you are doing next, and any blocker, in that order, then stop; detail belongs in the linked ticket rather than in the meeting. Blockers must surface the day they appear, not at the deadline, because a risk raised early usually has three possible fixes while the same risk raised late has one. If you are waiting on someone else, name them, name the date, and say what you will do if that date slips, so the dependency is visible rather than silent.\n\nMeetings need the same discipline. Send an agenda that names the decision to be made, keep a visible list of owners and due dates, and close by reading back who committed to what by when. Decisions that are never written down evaporate within a day, so publish a two-line summary to the team channel immediately afterwards. When nothing actually requires discussion, default to a written update instead of a meeting. Assume colleagues work across time zones and tools, and make your progress legible to them without you being present to explain it.`
      },
      {
        id: 's3',
        type: 'text',
        title: 'Conflict Resolution and Peer Feedback',
        content: `Disagreement about the work is normal; making it personal is optional. Start by separating the people from the problem: describe the situation in observable facts, then explore interests rather than positions. The position might be that the deadline must move, while the interests underneath are a quality review the team cannot skip and a designer who is already booked. Once both sides have listed their interests, generate options that satisfy them and judge those options against the shared goal rather than against who argued hardest. Put the agreed change in writing with a date on which it will be revisited.\n\nPeer feedback runs on the same habits. Deliver it close to the event, describe the behaviour rather than the motive, state what effect it had on the work, and then ask for the other person's view before proposing anything. Criticism that begins with always or never will be contested on the counterexample instead of being discussed, so stay specific to one instance. Receive feedback the same way: thank the person, ask for an example, and reflect before responding. Trust grows when a team can raise small problems while they are still small.`
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: `In a RACI grid for a single deliverable, how many people should be accountable?`,
        options: [
          'Everyone who touches the work',
          'One for each task in the project',
          'As many as the team votes for',
          'Exactly one'
        ],
        correctIndex: 3,
        explanation: `Accountability is deliberately singular. Shared accountability usually means nobody confirms the outcome, even though responsibility for doing the work may still be split across several people.`
      },
      {
        id: 'q2',
        question: `A teammate missed a deadline and you need to raise it today. What does the module recommend starting with?`,
        options: [
          'The observable facts, the impact, and the specific change you need',
          'An honest judgement of their work ethic',
          'A message to the manager before speaking to them',
          'Waiting to see whether the next deadline slips too'
        ],
        correctIndex: 0,
        explanation: `Behaviour-focused conversations open with facts and impact, which keeps the exchange about the work and leaves room for the other person to explain constraints you may not know about yet.`
      },
      {
        id: 'q3',
        question: `Which standup update follows the section guidance?`,
        options: [
          'I am working on the login page, it is going fine',
          'Yesterday I talked to three people about the API',
          'Yesterday I finished the login validation; today I start the password reset flow; I am blocked on staging credentials from Riya',
          'Here is everything I did this week, in full detail'
        ],
        correctIndex: 2,
        explanation: `Completed work, next step, and a blocker with a named owner. Detail belongs in the ticket, so the update informs everyone who is waiting without turning the meeting into a status dump.`
      }
    ]),
    resources: JSON.stringify([
      { title: 'Atlassian Teamwork and Collaboration Resources', type: 'link', url: 'https://www.atlassian.com/' },
      { title: 'MindTools Team Management Tools', type: 'link', url: 'https://www.mindtools.com/' },
      { title: 'Harvard Business Review Managing Teams', type: 'link', url: 'https://hbr.org/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Time Management & Personal Productivity',
    description: `Sort work by urgency and importance, estimate tasks against real past data, and defend focused time blocks so important non-urgent work actually gets done.`,
    moduleOrder: 3,
    durationMinutes: 50,
    difficulty: 'beginner',
    topics: 'Prioritisation,Eisenhower Matrix,Estimation,Time Blocking,Time Audits',
    learningObjectives: JSON.stringify([
      'Sort a mixed backlog into the four Eisenhower quadrants and justify each placement',
      'Apply a personal planning factor derived from two weeks of estimate-versus-actual data',
      'Build a weekly plan that blocks at least two hours for important non-urgent work',
      'Complete a three-day time audit and name the three largest sources of lost focus'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Prioritising With the Eisenhower Matrix',
        content: `Urgency is a property of the calendar; importance is a property of your goals, and the two rarely agree. Sort the backlog into four quadrants: do urgent and important work now, schedule important but not urgent work in a fixed slot, delegate urgent but unimportant work to the right owner, and delete work that is neither. Most people spend the day reacting inside the urgent quadrants and then wonder why portfolio work, repairing a broken process, and relationship building never happen. The matrix makes that gap visible in the week it happens rather than in the review months later.\n\nRun the sort as a weekly ritual rather than a daily reflex. Empty every commitment into one list, classify each item against the role you are actually trying to perform, and pull at least two blocks of important-but-not-urgent work into the calendar before the week fills with other people requests. If everything is marked urgent, the label is being used as a habit rather than a judgement, so ask what specifically breaks if this waits a week. Items with no honest answer can be scheduled, delegated, or deleted without guilt.`
      },
      {
        id: 's2',
        type: 'text',
        title: 'Estimating Honestly and Planning the Week',
        content: `Forecasts fail because they describe how the task would go on a perfect day. Estimate by comparing each task with the last similar task you actually finished, including the meetings, clarifications, and rework that real work always contains. Track your estimates against actuals for two weeks and compute a personal planning factor: if your estimates land forty percent short, multiply the next forecast by one point four and treat the result as honest rather than pessimistic. A plan built on measured data survives contact with a working week; a plan built on optimism does not survive the first unexpected meeting.\n\nThen fit the plan into the week you actually have. Break the work down until every task fits inside one focused session, because a task that needs three hours will be postponed indefinitely while a task sized at fifty minutes can start today. Block those sessions in the calendar as though they were meetings with your most important client, leave a buffer for the unknown, and protect one weekly review slot to rebalance the plan against reality. Tasks without a slot on a calendar are wishes, and wishes do not survive an inbox.`
      },
      {
        id: 's3',
        type: 'text',
        title: 'Protecting Focus With a Time Audit',
        content: `You cannot manage time you have never measured. For three working days, log what you actually do in thirty-minute slices, tagging each block as focused work, meetings, messaging, or administrative churn. At the end, total the columns instead of judging the entries. Most people discover that the tasks they consider their real job occupy less of the week than they assumed, and that context switching rather than laziness is the largest hidden cost, because each interruption forces a rebuild of the mental model the task required. The audit turns a vague sense of busyness into numbers you can argue with.\n\nOnce the numbers exist, defend the block that matters. Batch shallow tasks such as approvals and messages into one or two windows, silence notifications during the deep work block, and give meetings a written agenda or decline them with a proposed alternative. If an interruption is genuinely urgent, note where you stopped and resume within minutes rather than letting the thread derail the whole session. Rerun the audit at the end of the month to confirm the changes held, because focus is not a personality trait but a condition you create deliberately and then maintain.`
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: `Planning, skill-building, and relationship work belong to which quadrant of the Eisenhower matrix?`,
        options: [
          'Important but not urgent',
          'Urgent and important',
          'Urgent but not important',
          'Neither urgent nor important'
        ],
        correctIndex: 0,
        explanation: `These tasks protect future performance but never demand attention today, which is exactly why they must be scheduled before the urgent work fills the entire calendar.`
      },
      {
        id: 'q2',
        question: `Your last ten estimates came in about forty percent short of the actual time. What should you do?`,
        options: [
          'Keep estimating optimistically and work longer hours when you slip',
          'Stop estimating and start only when the deadline is close',
          'Estimate only tasks you have completed before',
          'Apply your measured planning factor and split the work into session-sized tasks'
        ],
        correctIndex: 3,
        explanation: `A planning factor turns a personal bias into a usable number, and splitting the work into session-sized tasks makes each forecast easier to verify and far easier to start.`
      },
      {
        id: 'q3',
        question: `A three-day time audit shows ninety minutes a day lost to context switching. What first change follows the module?`,
        options: [
          'Add two hours to the end of each day',
          'Batch shallow tasks into fixed windows and defend one uninterrupted block each morning',
          'Move all focused work to the weekend',
          'Delegate the entire task list'
        ],
        correctIndex: 1,
        explanation: `Batching approvals and messages removes the repeated switching cost, and one defended block gives the focused work a guaranteed place on the calendar instead of a hope.`
      }
    ]),
    resources: JSON.stringify([
      { title: 'Asana Work Management Resources', type: 'link', url: 'https://asana.com/resources' },
      { title: 'MindTools Time Management Tools', type: 'link', url: 'https://www.mindtools.com/' },
      { title: 'Harvard Business Review Time Management Articles', type: 'link', url: 'https://hbr.org/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Critical Thinking & Problem Solving',
    description: `Frame a problem in observable facts, trace symptoms to root causes with structured questioning, and choose between options using explicit criteria and written trade-offs.`,
    moduleOrder: 4,
    durationMinutes: 65,
    difficulty: 'intermediate',
    topics: 'Problem Definition,Root Cause Analysis,5 Whys,Assumption Testing,Decision Making,Evidence Evaluation',
    learningObjectives: JSON.stringify([
      'Write a problem statement that separates observable facts from assumptions',
      'Trace a recurring symptom to a controllable root cause using the 5 Whys',
      'Generate five distinct options before evaluating any of them',
      'Compare options with weighted criteria and record the trade-offs in a decision log'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Defining the Real Problem',
        content: `Teams jump to solutions because a solution feels like progress. Before any options appear, write a problem statement in three parts: the observable condition, the gap between current and expected performance, and the business impact of leaving it alone. Facts belong in the statement; opinions and diagnoses do not. Sales are falling twenty percent since the pricing change is a defensible starting point, while the team is not trying hard enough is a guess wearing the clothes of a fact. Test each line by asking what evidence would prove it wrong, and rewrite anything that cannot survive the question.\n\nFraming decides which solutions become thinkable, so check what the original request silently assumed. When a department announces that the company needs a new CRM, the actual complaint may be duplicated customer records, slow handoffs, or reports nobody trusts. Restating the problem around the symptom rather than the tool opens options that cost a tenth of the purchase. List the assumptions embedded in the request, mark each as known, guessed, or unknown, and send the unknowns back for a quick check. A well-framed problem also tells you when you are finished solving it.`
      },
      {
        id: 's2',
        type: 'text',
        title: 'Finding Root Causes',
        content: `Symptoms repeat; causes do not. The 5 Whys works by asking why until the chain reaches a process or condition the team can actually change, stopping well before the trail ends at a person name. If a shipment was late, the answers might run from a missed pick list to an unassigned morning check to an onboarding checklist that never covered the role. Write each answer as a statement you could verify against a record, because a why answered with a guess simply steers the next question in the wrong direction. Keep the chain focused on one symptom at a time.\n\nWhen the causes branch, widen the lens with a cause-and-effect map that sorts potential contributors into people, process, tools, materials, and environment. The categories stop the group from blaming the most visible person and reveal where a single fix would quietly fail. Verify each candidate cause against data before acting: check whether the problem still appears when the suspected cause is absent, and look for the counterexample that would disprove your favourite explanation. The root cause worth fixing is the one that prevents the symptom from recurring rather than merely soothing it until the next review.`
      },
      {
        id: 's3',
        type: 'text',
        title: 'Generating Options and Deciding Well',
        content: `Generation and evaluation are different modes, and mixing them kills both. List at least five genuinely distinct options before judging any of them, including the option of doing nothing and the option of running a smaller experiment first. Ban critique during the listing so quieter members contribute, and steal from adjacent teams or other industries where a similar constraint has already been solved. Confirmation bias will quietly filter anything that contradicts the favoured approach, so assign one person to argue the case against the leading option. The goal is not consensus on the first workable idea but a real comparison across alternatives that could each plausibly win.\n\nThen decide with explicit criteria. Weight the factors that matter, such as cost, time, risk, and reversibility, score each option against them, and write down the trade-offs that the score hides. A pre-mortem, in which the team imagines the chosen option has failed six months from now and lists the reasons, surfaces risks that optimism would smooth over. Record the decision, the evidence behind it, and the date you will review the outcome, because a decision log turns future disagreements into data instead of arguments.`
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: `A department announces that the company needs a new CRM. What should happen first?`,
        options: [
          'Shortlist three vendors',
          'Compare license pricing',
          'Define the problem the CRM is meant to solve, in observable terms',
          'Ask the director to choose'
        ],
        correctIndex: 2,
        explanation: `The tool is a solution in search of a problem statement; defining the observable gap first may reveal a cheaper fix and tells you what evidence will prove the problem solved.`
      },
      {
        id: 'q2',
        question: `When should a 5 Whys chain stop?`,
        options: [
          'After exactly five questions, whatever the last answer is',
          'When it reaches a process or condition the team can actually change',
          'When the answer names a person who could have prevented it',
          'As soon as a plausible explanation appears'
        ],
        correctIndex: 1,
        explanation: `Five is a guide, not a quota: stop at a controllable cause and keep answers factual, because ending on a person converts analysis into blame and guarantees the symptom returns.`
      },
      {
        id: 'q3',
        question: `What does the module say about generating options?`,
        options: [
          'Evaluate each idea the moment it is suggested',
          'Choose the first workable idea to keep the meeting short',
          'Limit the list to approaches the team has already tried',
          'List at least five distinct options before judging any of them'
        ],
        correctIndex: 3,
        explanation: `Separating generation from evaluation prevents early critique from killing weak-looking but useful ideas and forces genuine comparison instead of anchoring on the first workable answer.`
      }
    ]),
    resources: JSON.stringify([
      { title: 'Foundation for Critical Thinking Library', type: 'link', url: 'https://www.criticalthinking.org/' },
      { title: 'Coursera Critical Thinking Courses', type: 'link', url: 'https://www.coursera.org/' },
      { title: 'Harvard Business Review Decision-Making Articles', type: 'link', url: 'https://hbr.org/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Resume Building & Personal Branding',
    description: `Read a job posting like a recruiter, rewrite duties as quantified achievements, and align your resume, LinkedIn profile and portfolio around one target role.`,
    moduleOrder: 5,
    durationMinutes: 70,
    difficulty: 'intermediate',
    topics: 'Job Description Analysis,Achievement Statements,ATS Formatting,LinkedIn Profile,Personal Branding',
    learningObjectives: JSON.stringify([
      'Extract the five most repeated requirements from a job posting and map each to evidence',
      'Rewrite five responsibility bullets into quantified achievement statements',
      'Format a resume with standard headings and real text that an applicant tracking system can parse',
      'Align headline, summary, and portfolio so resume and LinkedIn tell one consistent story'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Reverse-Engineering the Resume From the Job Ad',
        content: `A job posting is a specification, so read it like one. Extract the five requirements that repeat across this posting and similar ads, separating must-haves from nice-to-haves, then map each to evidence you can actually show: a project, a metric, a certificate, a shipped feature. The mapping doubles as a skills inventory and exposes honest gaps early enough to fix them or to answer them truthfully at interview. Keep the vocabulary of the posting in your own bullets where it is truthful, because both recruiters and screening software match on the same phrases the employer wrote.\n\nFormatting follows the same principle of legibility. Use standard section headings such as Experience, Education, and Skills, keep the file as real selectable text in a single column, and avoid tables, text boxes, and icons that parsing tools read as decoration. One page suits candidates with under ten years of experience, and two is defensible beyond that, but every line should earn its place by carrying evidence. Save as PDF unless the application requests otherwise, name the file predictably, and keep a master resume from which tailored versions are cut rather than rewritten each time.`
      },
      {
        id: 's2',
        type: 'text',
        title: 'Achievement Statements That Quantify Impact',
        content: `Responsibility bullets describe a duty; achievement bullets describe a result, and only the second survives a six-second scan. Build each line as an action verb, then the scope of the work, then the measurable outcome: cut first-response time from twenty-four hours to six by scripting five canned replies for the support desk. Numbers do not have to be revenue figures; counts, percentages, time saved, and error rates all work, and honest estimates are acceptable when you can support them with a story. Start each bullet with a different verb, keep the tense consistent with whether the role has ended, and delete duties the job advertisement already lists.\n\nQuantify without a spreadsheet at hand by triangulating: how many users, tickets, students, or spreadsheets were involved; how long the task took before and after; what error or complaint rate changed. If you cannot defend a claim with an example at interview, cut it, because unsupported numbers lose credibility fastest in the room. Read the finished page aloud for repeated verbs and vague adjectives, then ask someone unfamiliar with the work to summarise what you actually did. If they cannot, a recruiter will not either.`
      },
      {
        id: 's3',
        type: 'text',
        title: 'One Story Across Every Profile',
        content: `Personal branding is consistency rather than self-promotion. Choose a target role, then make the resume headline, LinkedIn headline, summary, and portfolio introduction tell the same story: who you help, how, and with what proof. A profile that advertises three different directions confuses recruiters who search by title, while a single clear positioning makes every post, comment, and project reinforce the same signal. Audit your digital footprint the way an employer would, removing or restricting anything that contradicts the professional story, and check that photographs, names, and contact details match across platforms.\n\nMake the brand evidence-backed rather than adjective-backed. Pin the two or three pieces of work that best represent your target role, ask a few colleagues or managers for recommendations that speak to the exact strengths you claim, and keep activity modest but steady, because thoughtful comments on work in your field beat frequent low-value posting. Update the profile when you gain a skill rather than six months later, and make sure the resume and the profile cannot contradict each other on dates, titles, or scope. Every claim a recruiter can verify in public should survive that verification.`
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: `Which resume bullet best follows the achievement guidance in this module?`,
        options: [
          'Responsible for customer emails',
          'Handled a large number of support tickets',
          'Worked on the support team',
          'Cut first-response time from 24 hours to 6 hours by scripting five canned replies'
        ],
        correctIndex: 3,
        explanation: `It starts with an action verb, names the scope of the change, and quantifies the result, which is the pattern a recruiter can score during a six-second scan.`
      },
      {
        id: 'q2',
        question: `What does applicant tracking system friendly formatting mean in practice?`,
        options: [
          'Two columns and graphic icons for a designed look',
          'Text placed inside images so nothing can be altered',
          'Standard section headings, selectable text, and a single column',
          'Creative fonts that make the document memorable'
        ],
        correctIndex: 2,
        explanation: `Parsers read linear text and familiar headings; tables, text boxes, and images are frequently dropped or scrambled, so a clever layout costs you the screening stage.`
      },
      {
        id: 'q3',
        question: `How should you tailor a resume to one specific posting?`,
        options: [
          'Send one identical resume everywhere to save time',
          'Mirror the keywords the posting repeats wherever you hold genuine evidence',
          'List every task from every role you have ever held',
          'Lead with hobbies to appear personable'
        ],
        correctIndex: 1,
        explanation: `Keyword matching only works when the claim is true, so map repeated requirements to evidence you can defend at interview rather than padding the page with unrelated detail.`
      }
    ]),
    resources: JSON.stringify([
      { title: 'Indeed Career Guide Resume Advice', type: 'link', url: 'https://www.indeed.com/career-advice' },
      { title: 'Purdue OWL Resume and Writing Guides', type: 'link', url: 'https://owl.purdue.edu/' },
      { title: 'LinkedIn Profile and Networking', type: 'link', url: 'https://www.linkedin.com/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Interview Skills & Job Readiness',
    description: `Build a bank of evidence-backed STAR stories, answer behavioural questions with structure, and close every interview with sharp questions and a timely follow-up.`,
    moduleOrder: 6,
    durationMinutes: 60,
    difficulty: 'intermediate',
    topics: 'STAR Method,Behavioural Questions,Mock Interviews,Questions For Interviewers,Salary Negotiation',
    learningObjectives: JSON.stringify([
      'Build six STAR stories covering conflict, failure, deadlines, initiative, teamwork, and fast learning',
      'Deliver a ninety-second introduction using a present, past, future structure',
      'Ask three questions about success measures, team bottlenecks, and feedback norms',
      'Send a follow-up note within twenty-four hours that references a specific interview moment'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Building Your Story Bank With STAR',
        content: `Interviewers score evidence, not adjectives, so prepare stories rather than slogans. Build a bank of at least six experiences drawn from internships, coursework, part-time work, and team projects, each written in four lines: the situation in one sentence of context, the task you personally owned, the actions you took, and the result with a number or a clear before-and-after. Six well-chosen stories cover most behavioural questions because the themes repeat: conflict, failure, deadline pressure, initiative, teamwork, and learning something quickly. Practise telling each one in under two minutes, and keep a longer version ready for follow-up questions.\n\nResearch converts those stories from generic to targeted. Read the posting line by line, mark what the role measures, and rehearse which story you will reach for when that theme appears. Learn the company product, recent news, and the shape of the team you would join, so your closing questions show real interest rather than a scramble to find the website. Prepare a ninety-second introduction using present, past, future: what you do now, the experiences that shaped it, and why this role is the logical next step. Record one run aloud; the gaps you hear are the ones an interviewer would hear too.`
      },
      {
        id: 's2',
        type: 'text',
        title: 'Answering Behavioural and Tricky Questions',
        content: `Most behavioural questions share the same shape, tell me about a time when, so answer with structure rather than a memory dump. Ask one clarifying question if the prompt is vague, keep the situation to a single sentence, spend most of the answer on your actions, and always land on the result and what you learned. For strength questions, choose a strength the posting values and support it from the same story bank instead of asserting it bare. For the weakness question, name a real but survivable gap, describe the concrete steps you are taking, and show the trend rather than reciting a rehearsed disguise.\n\nWhen a question genuinely stumps you, demonstrate thinking instead of bluffing: restate the question, state what you do know, reason aloud in steps, and finish with how you would verify it quickly. Interviewers often evaluate the method rather than the fact. Handle salary discussions by getting range and expectations on the table once you understand the scope of the role, quoting a researched band rather than a single number, and staying open to the whole package. Keep answers to about two minutes, watch the interviewer for cues, and leave room for the conversation to continue.`
      },
      {
        id: 's3',
        type: 'text',
        title: 'Closing the Interview and Following Up',
        content: `The final questions you ask are scored like your answers. Prepare at least three that reveal how the team works and what success looks like: how performance is measured in the first ninety days, what the team current bottleneck is, and how people on the team give each other feedback. Ask the interviewer what convinced them to hire someone for the role last time, then use their answer to make one closing statement that connects your evidence to that need. Take notes during the conversation so the summary you give at the end is specific rather than merely polite.\n\nFollow through within twenty-four hours. Send a short note that references one specific moment from the conversation, restates your interest, and adds any answer you wanted to improve, keeping it to a few lines so that it gets read. Then run your own debrief: list the questions that stalled you, rewrite those answers, and file them back into the story bank, because interviews compound over time. Rehearse the logistics as seriously as the content, including the route or the video test and a printed copy of the resume within reach. Readiness removes avoidable noise so the substance can show.`
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: `Which STAR element do candidates most often omit, and what does it cost them?`,
        options: [
          'Situation, so the interviewer lacks context',
          'Result, so the story never proves impact',
          'Task, so personal ownership is unclear',
          'Action, so the steps are missing'
        ],
        correctIndex: 1,
        explanation: `Candidates frequently stop after describing what they did; the result is the evidence interviewers score, because it shows what changed because of your work.`
      },
      {
        id: 'q2',
        question: `An interviewer opens with "tell me about yourself". Which structure does the module recommend?`,
        options: [
          'Present role and strengths, relevant past, then why this role fits your future',
          'Your full history from school onward',
          'Salary expectations, to get it out of the way',
          'A recitation of the job advertisement'
        ],
        correctIndex: 0,
        explanation: `Present, past, future keeps the answer targeted and finishes on the role, which hands the interviewer a natural thread to pull instead of delivering a chronological lecture.`
      },
      {
        id: 'q3',
        question: `You are asked a technical question you cannot answer. What does the module recommend?`,
        options: [
          'Guess confidently and commit to the answer',
          'Redirect to a strength you prepared',
          'State what you know, reason aloud through the gap, then say how you would verify it quickly',
          'Apologise and skip the question'
        ],
        correctIndex: 2,
        explanation: `Interviewers often score the method rather than the fact; transparent reasoning shows how you would work, while bluffing removes any chance of recovering credibility.`
      }
    ]),
    resources: JSON.stringify([
      { title: 'Indeed Career Guide Interview Advice', type: 'link', url: 'https://www.indeed.com/career-advice' },
      { title: 'Glassdoor Interview Reviews', type: 'link', url: 'https://www.glassdoor.com/' },
      { title: 'MindTools Interview Skills Resources', type: 'link', url: 'https://www.mindtools.com/' }
    ]),
    videoUrl: null
  }
];
