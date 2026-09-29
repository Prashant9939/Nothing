// Learning modules — Entrepreneurship & Startup Growth track (category: 'entrepreneurship')
// Seed content: 6 modules, moduleOrder 1..6. videoUrl is intentionally null for every module.

module.exports = [
  {
    category: 'entrepreneurship',
    title: 'Entrepreneurial Mindset & Opportunity Recognition',
    description: 'Recognise and evaluate real business opportunities, then test them with lean validation experiments before committing time or money.',
    moduleOrder: 1,
    durationMinutes: 55,
    difficulty: 'beginner',
    topics: 'Opportunity Recognition,Lean Startup,Validation,Effectuation,Risk Taking',
    learningObjectives: JSON.stringify([
      'Apply entrepreneurial reasoning techniques such as effectuation and affordable loss to uncertain situations',
      'Identify opportunity patterns by observing workarounds, inefficiencies, and shifting customer needs',
      'Design a lean validation experiment that tests the riskiest assumption behind a proposed venture',
      'Compare opportunity ideas against feasibility, market size, timing, and founder fit using a scoring grid'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Thinking Like an Entrepreneur',
        content: 'Entrepreneurship is a way of working under uncertainty, not a personality type. A manager optimises a system whose behaviour is already known, while an entrepreneur runs small tests to discover which system is worth optimising at all. That shift changes daily habits: you talk to customers before writing specifications, you prefer reversible decisions over perfect ones, and you count validated learning rather than finished features as progress.\n\nBuild the habit with a simple idea journal containing three columns: observation, pain point, and possible buyer. Record friction you personally meet, such as clinic staff re-entering the same patient details into four separate systems. Over a few weeks the journal turns problems into an inventory instead of waiting for a single flash of inspiration. Pair it with an affordable loss rule: decide in advance how many evenings and how much money you will risk on any single test, so fear of failure never blocks the next experiment.'
      },
      {
        id: 's2',
        type: 'text',
        title: 'Where Opportunities Come From',
        content: 'Opportunities rarely arrive as lightning bolts; they appear as repeatable friction. Three reliable sources are everyday workarounds, regulatory or technology shifts, and segments that established providers ignore. Watch how people cope: a spreadsheet emailed around a team signals missing software, and a plumber who books jobs on paper during a phone call signals a scheduling tool. Track cost drops too, because a service only becomes viable once the underlying technology is cheap enough.\n\nScreen the list with a scoring grid before falling in love with any idea. Rate each opportunity from one to five on problem frequency, problem severity, reachability of the buyers, and your own unfair advantage. A daily, painful, cheaply reachable problem beats a rare dramatic one every time. Then narrow to a beachhead: one segment small enough to dominate, such as independent physiotherapy clinics in a single city, rather than all of healthcare.'
      },
      {
        id: 's3',
        type: 'text',
        title: 'Validating Before You Build',
        content: 'Every venture rests on assumptions, and only some can be tested cheaply. List them, then rank by risk: will customers with the problem exist, will they switch behaviour, will they pay. Take the riskiest one first and design the smallest experiment that produces behavioural evidence. A landing page with a price and a pre-order button beats a survey, because compliments are free and card details are not.\n\nChoose an MVP form that matches the assumption: a smoke-test page for demand, a concierge service where you deliver the outcome manually, or a wizard-of-oz build where software hides behind a human. A course creator might sell a live cohort before recording a single lesson. Run the test for two weeks, set a pass threshold in advance, such as thirty sign-ups or five pre-payments, and decide honestly whether to persevere, pivot, or stop.'
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'A friend tells you your idea for a meal-planning app is brilliant. What is the most useful next step?',
        options: [
          'Start building the full application immediately',
          'Ask for a concrete commitment such as a pre-order or a pilot signup',
          'Write a detailed five-year financial forecast',
          'File a trademark for the app name'
        ],
        correctIndex: 1,
        explanation: 'Compliments are free, but a commitment costs the friend something. Behavioural evidence such as a pre-order tests willingness to pay, which is the assumption that actually matters.'
      },
      {
        id: 'q2',
        question: 'Which statement best describes the effectuation principle of affordable loss?',
        options: [
          'Invest everything once an opportunity looks certain',
          'Avoid opportunities that carry any risk of failure',
          'Raise the largest funding round possible to buffer mistakes',
          'Decide the maximum you can afford to lose before starting a test'
        ],
        correctIndex: 3,
        explanation: 'Affordable loss means capping the downside in advance, so a failed test is survivable and the founder can keep experimenting instead of betting the company.'
      },
      {
        id: 'q3',
        question: 'A landing page test draws 400 sign-ups but no card details. What does this most likely indicate?',
        options: [
          'Interest is not the same as willingness to pay',
          'The concept is validated and ready to build',
          'The page simply needs more traffic to be meaningful',
          'Pricing should be raised immediately'
        ],
        correctIndex: 0,
        explanation: 'Email addresses signal curiosity. Only money, orders, or signed commitments are strong evidence that a real purchasing problem exists.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'The Lean Startup (official site by Eric Ries)', type: 'link', url: 'https://theleanstartup.com/' },
      { title: 'Ewing Marion Kauffman Foundation — entrepreneurship research', type: 'link', url: 'https://www.kauffman.org/' },
      { title: 'Y Combinator — startup resources and library', type: 'link', url: 'https://www.ycombinator.com/' }
    ]),
    videoUrl: null
  },
  {
    category: 'entrepreneurship',
    title: 'Business Models & Value Proposition',
    description: 'Design a coherent business model on the Business Model Canvas and craft a value proposition tied to real customer jobs, pains, and gains for a specific target segment.',
    moduleOrder: 2,
    durationMinutes: 60,
    difficulty: 'beginner',
    topics: 'Business Model Canvas,Value Proposition,Customer Segments,Revenue Streams,Competitive Analysis',
    learningObjectives: JSON.stringify([
      'Map a venture onto the nine blocks of the Business Model Canvas and explain how the blocks reinforce one another',
      'Segment the market and select a beachhead segment with measurable needs and reachable channels',
      'Write a value proposition that names a specific job-to-be-done, pain, and gain for that segment',
      'Identify revenue streams, cost drivers, and pricing logic that make the chosen model viable'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'The Nine Blocks of the Business Model Canvas',
        content: 'The Business Model Canvas compresses a plan onto one page with nine blocks: customer segments, value propositions, channels, customer relationships, revenue streams, key resources, key activities, key partnerships, and cost structure. Read them in two halves. The right side describes who you serve and how value reaches them, while the left side describes what you must do and pay to deliver it. A model works only when the two halves agree.\n\nTake a subscription meal-kit venture as an example. Customer segments are busy dual-income households; the value proposition is dinner in thirty minutes without shopping; channels are a direct website and a mobile app; relationships are self-service with flexible subscriptions; revenue is a weekly recurring fee. On the left, key resources are recipes, supplier contracts, and cold-chain logistics; key activities are sourcing and fulfilment; partnerships are farms and couriers; and the cost structure is dominated by food and delivery. Print the canvas and complete it in pencil, because every block you change forces you to re-check its neighbours.'
      },
      {
        id: 's2',
        type: 'text',
        title: 'Choosing a Customer Segment and Channel',
        content: 'Most failed startups serve nobody in particular. Avoid that by segmenting on a variable you can actually reach: industry, company size, life stage, or workflow, rather than vague demographics like young people who care about quality. Score each segment on size, urgency, willingness to pay, and cost to reach, then commit to one beachhead you can dominate before expanding. An accounting tool that wins freelance designers first has references and case studies before it ever approaches larger firms.\n\nChannels and relationships are different decisions. A channel delivers the value proposition, such as direct online sales or resellers through retail, while the relationship defines how you keep customers, such as self-service, dedicated accounts, or community. Enterprise software usually pairs inside sales with account management, whereas consumer apps pair paid acquisition with automated self-service. Match the channel to the buying habit of the segment: procurement teams respond to demos and security reviews, while solo buyers respond to free trials and credit-card sign-ups.'
      },
      {
        id: 's3',
        type: 'text',
        title: 'Value Propositions That Map to Jobs, Pains, and Gains',
        content: 'A value proposition is a specific promise to a specific buyer, not a list of features. Describe the job the customer is trying to get done, the pains that block it, and the gains they hope for. A feature list says unlimited projects and dashboards; a value proposition says consultants can invoice clients two days sooner without chasing spreadsheets. The second version lets a buyer recognise themselves in seconds.\n\nDraft the statement with a simple formula: for (segment) who (job), our product (category) that (key benefit), unlike (alternative), (main differentiator). Then validate it with five buyers. Ask them to repeat the promise back in their own words and note where they hesitate. Teams that cannot get a customer to restate the value proposition rarely fix that with more advertising; they refine the offer until the sentence becomes obvious.'
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'On the Business Model Canvas, which block describes how a venture delivers its value proposition to customers?',
        options: ['Cost Structure', 'Key Activities', 'Channels', 'Key Partners'],
        correctIndex: 2,
        explanation: 'Channels describe how the company reaches customer segments to deliver the value proposition. Key Activities describe what the firm must do internally, not how it reaches buyers.'
      },
      {
        id: 'q2',
        question: 'A SaaS company charges a monthly subscription, sells usage add-ons, and signs annual enterprise contracts. What do these represent?',
        options: ['Revenue streams', 'Customer relationships', 'Channels', 'Key resources'],
        correctIndex: 0,
        explanation: 'Different ways of earning money from customers are separate revenue streams, each with its own pricing logic and margins.'
      },
      {
        id: 'q3',
        question: 'Which of the following is the strongest value proposition?',
        options: [
          'We build fast, scalable, cloud-native platforms',
          'Our app has forty features and a modern design',
          'Trusted by thousands of happy customers worldwide',
          'For independent physiotherapists who lose hours to admin, our software books and bills patients on one screen, unlike generic schedulers, and it is built for single-practitioner clinics'
        ],
        correctIndex: 3,
        explanation: 'It names a specific segment, a painful job, a clear benefit, and the realistic alternative it beats, so the buyer can immediately recognise themselves in it.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'Strategyzer — Business Model Canvas and Value Proposition Canvas', type: 'link', url: 'https://www.strategyzer.com/' },
      { title: 'U.S. Small Business Administration', type: 'link', url: 'https://www.sba.gov/' },
      { title: 'SCORE — free business mentoring and templates', type: 'link', url: 'https://www.score.org/' }
    ]),
    videoUrl: null
  },
  {
    category: 'entrepreneurship',
    title: 'Business Planning & Financial Fundamentals',
    description: 'Build a lean business plan and quantify unit economics, cash flow forecasts, and break-even points that show whether the venture can sustain itself.',
    moduleOrder: 3,
    durationMinutes: 70,
    difficulty: 'intermediate',
    topics: 'Business Plan,Unit Economics,Cash Flow,Forecasting,Break-even Analysis',
    learningObjectives: JSON.stringify([
      'Structure a lean business plan that states the problem, solution, metrics, and next milestones on one page',
      'Calculate unit economics including gross margin, customer acquisition cost, lifetime value, and payback period',
      'Build a twelve-month cash flow forecast that exposes the month the cash balance turns negative',
      'Derive break-even volume from fixed costs, variable costs, and price, and explain how each input moves it'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'From Long Plans to Lean Planning',
        content: 'A business plan is a decision tool, not a document built to impress anyone. Modern practice favours a lean plan of a few pages that states the problem, the solution, the target segment, the revenue model, the top costs, and the milestones you will hit in the next two quarters. It is short enough to revise monthly, which matters because the first version is always wrong in at least one important way.\n\nWrite the plan around three questions investors and lenders actually ask: is there a real problem, can you reach those customers profitably, and will the money last until revenue arrives. Support each answer with one page of evidence, such as interview quotes, a pilot result, or a competitor price list. Set milestones that are binary and dated, like signing three paying pilots by March rather than growing awareness. A plan whose milestones can be marked done or not done converts discussion into accountability, and it becomes the backbone of any pitch deck you build later.'
      },
      {
        id: 's2',
        type: 'text',
        title: 'Unit Economics: The Arithmetic of One Customer',
        content: 'Unit economics answer a single question: does each customer make the business money or lose it? Start with contribution margin, which is price minus variable cost per unit. A subscription priced at thirty dollars a month with six dollars of hosting and support earns twenty-four dollars of contribution each month. Then add acquisition: if a marketing campaign spends six hundred dollars and lands twenty customers, customer acquisition cost is thirty dollars.\n\nLifetime value estimates the total contribution a customer generates before churning. With monthly contribution of twenty-four dollars and an average lifespan of eighteen months, lifetime value is four hundred and thirty-two dollars, comfortably above the thirty-dollar acquisition cost. Still compare payback time: twenty customers from a six hundred dollar campaign repay the spend in one month of contribution. Healthy early-stage benchmarks are a lifetime value at least three times acquisition cost and payback under twelve months, because slow payback consumes cash you do not yet have.'
      },
      {
        id: 's3',
        type: 'text',
        title: 'Cash Flow, Forecasting, and Break-even',
        content: 'Profit is an opinion; cash is a fact. A business can report a profit while failing to pay salaries because customers pay in ninety days and suppliers demand payment in thirty. Forecast cash by listing opening balance, expected receipts, and committed payments for each of the next twelve months, then subtract to find the closing balance each month. The month the balance goes negative is the date you must raise money or change terms, and you discover it on paper rather than in a panic.\n\nBreak-even is the volume where total contribution covers fixed costs. If monthly fixed costs are nine thousand dollars and each customer contributes twenty-four dollars, you need three hundred and seventy-five customers to break even. Sensitivity matters more than the single number: raising price by ten percent or trimming hosting cost moves the target, so model best, worst, and realistic cases. Present all three in the plan to show you understand the range rather than one optimistic point.'
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'Monthly fixed costs are 9,000 dollars and each customer contributes 24 dollars. How many customers are needed to break even?',
        options: ['375', '3,750', '125', '900'],
        correctIndex: 0,
        explanation: 'Break-even equals fixed costs divided by contribution per unit: 9,000 / 24 = 375 customers.'
      },
      {
        id: 'q2',
        question: 'Which finding in a twelve-month cash flow forecast demands the most urgent action?',
        options: [
          'Revenue grows each month while margins hold',
          'Marketing spend runs slightly under budget',
          'The closing cash balance turns negative in month seven',
          'Customer count exceeds the original target'
        ],
        correctIndex: 2,
        explanation: 'A negative closing balance is the month the business runs out of cash, so funding or cost changes must be arranged well before month seven.'
      },
      {
        id: 'q3',
        question: 'Why is a lifetime value of 432 dollars against a 30 dollar acquisition cost not automatically a green light?',
        options: [
          'It means the company should raise venture capital immediately',
          'It ignores how long the cash takes to come back, so payback timing still matters',
          'It proves the pricing is set too low',
          'It only counts the first month of revenue'
        ],
        correctIndex: 1,
        explanation: 'A healthy ratio can still hide slow cash returns. Payback period determines whether the business can fund each new customer before the previous ones repay it.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'U.S. Small Business Administration — business plan guidance', type: 'link', url: 'https://www.sba.gov/' },
      { title: 'SCORE — business planning and financial statement templates', type: 'link', url: 'https://www.score.org/' },
      { title: 'Bplans — business plan samples and financial calculators', type: 'link', url: 'https://www.bplans.com/' }
    ]),
    videoUrl: null
  },
  {
    category: 'entrepreneurship',
    title: 'Startup Funding & Pitching',
    description: 'Choose the right funding for your stage, size a raise from burn rate and milestones, and structure a pitch deck that survives hard investor questioning.',
    moduleOrder: 4,
    durationMinutes: 65,
    difficulty: 'intermediate',
    topics: 'Bootstrapping,Angel Investors,Venture Capital,Term Sheets,Pitch Deck',
    learningObjectives: JSON.stringify([
      'Compare bootstrapping, grants, bank debt, angel investment, and venture capital on cost, control, and stage fit',
      'Calculate a raise amount from monthly burn rate, target runway, and a milestone plan with a buffer',
      'Assemble a ten-slide pitch deck that follows problem, solution, market, traction, team, and ask',
      'Compute founder dilution from a priced round and explain what a term sheet commits you to'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Matching Capital to Stage and Goals',
        content: 'Funding is not one thing; it is a ladder with different costs. Bootstrapping from revenue keeps full control but caps speed. Grants are non-dilutive but slow and competitive. Bank debt and government-backed loans require collateral and steady cash flow. Angels write personal cheques at pre-revenue stage in exchange for equity. Venture capital is built for businesses that need large sums to win a market quickly and are happy to sell a share of the upside for it.\n\nChoose by asking what the money must achieve. A cafe needs a fit-out loan, not dilution. A software product with early revenue might take an angel round of fifty thousand dollars to fund six months of full-time work. A logistics platform that must cover cities before competitors do may justify venture capital even at heavy dilution. Research government-backed small business loans and grants first, because their cost is lower than equity and the application process doubles as financial discipline.'
      },
      {
        id: 's2',
        type: 'text',
        title: 'Sizing the Round and Protecting Runway',
        content: 'Raise enough to reach a milestone that makes the next round or profitability easier, plus a buffer. Compute monthly burn as cash out minus cash in. If the team spends forty thousand dollars a month and earns ten thousand, burn is thirty thousand. A six-month runway needs one hundred and eighty thousand, and adding twenty percent for delay means raising roughly two hundred and twenty thousand dollars.\n\nThen map the money to milestones: release version one, sign fifty paying customers, and cut acquisition cost by a third. If those targets are not reachable inside the runway, either shrink the scope or raise more, because a round that ends before any proof point leaves you negotiating from weakness. Watch dilution while you size it. Selling twenty percent in a seed round and twenty percent again in the next one leaves founders with roughly sixty-four percent before option pools, which still works, but early percentages compound quickly.'
      },
      {
        id: 's3',
        type: 'text',
        title: 'Structuring the Pitch',
        content: 'Investors see hundreds of decks, so follow a narrative they can scan: problem, solution, market size, product, traction, business model, competition, team, financials, and the ask. Each slide carries one claim and one piece of evidence. Traction slides do the heaviest lifting: signed pilots, retention curves, month-on-month revenue, or a waitlist converting at a known rate. Replace adjectives such as huge and growing with numbers and dates.\n\nThe ask closes the story: how much you are raising, over what period, and which milestones it buys. Practise the first two minutes until they sound conversational, because listeners decide whether to lean in during that window. Prepare for the three standard challenges: why now, why you, and what happens if a competitor copies you. Record a rehearsal and listen for hedging words. A pitch is not a performance of certainty; it is a demonstration that you know exactly which assumptions still need proving.'
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'A founder wants money to open a second bakery location and is willing to give up no ownership. Which source fits best?',
        options: [
          'Venture capital',
          'Angel investment',
          'A convertible note priced at a discount',
          'A small business bank loan'
        ],
        correctIndex: 3,
        explanation: 'Debt is repaid with interest and transfers no ownership, so it suits a profitable location expansion whose cash flow can service the repayments.'
      },
      {
        id: 'q2',
        question: 'Monthly burn is 30,000 dollars. How much cash is needed for a six-month runway plus a 20 percent buffer?',
        options: ['180,000 dollars', '216,000 dollars', '252,000 dollars', '360,000 dollars'],
        correctIndex: 1,
        explanation: 'Six months of burn is 30,000 x 6 = 180,000, and a 20 percent buffer adds 36,000, giving 216,000 dollars.'
      },
      {
        id: 'q3',
        question: 'After a seed round that sells 20 percent and an option pool of 10 percent, what matters most about the next raise?',
        options: [
          'The colour scheme of the new deck',
          'The valuation cap recorded on the previous round only',
          'That successive dilution still leaves founders with enough equity to stay motivated',
          'That no existing investor participates'
        ],
        correctIndex: 2,
        explanation: 'Equity compounds across rounds, so founders must model the full dilution path and keep enough ownership to stay motivated and in control of key votes.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'Y Combinator — startup library and pitch advice', type: 'link', url: 'https://www.ycombinator.com/' },
      { title: 'Startup India — government schemes and funding support', type: 'link', url: 'https://www.startupindia.gov.in/' },
      { title: 'Grants.gov — federal grant opportunities', type: 'link', url: 'https://www.grants.gov/' }
    ]),
    videoUrl: null
  },
  {
    category: 'entrepreneurship',
    title: 'Marketing, Branding & Customer Acquisition',
    description: 'Position your brand, design a full-funnel acquisition plan, and measure channel costs against lifetime value to grow customers profitably.',
    moduleOrder: 5,
    durationMinutes: 60,
    difficulty: 'intermediate',
    topics: 'Positioning,Brand Identity,Content Marketing,Conversion Funnels,Customer Acquisition Cost',
    learningObjectives: JSON.stringify([
      'Write a positioning statement naming the target segment, competitive alternative, and differentiating benefit',
      'Design an acquisition funnel that moves prospects from awareness through conversion and retention',
      'Calculate customer acquisition cost per channel and compare it against lifetime value and payback targets',
      'Produce a consistent brand kit and messaging hierarchy that holds across website, email, and sales conversations'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Positioning and Brand Before Tactics',
        content: 'Tactics fail when positioning is vague. Positioning decides which segment you compete for, which alternative customers would choose instead, and the benefit that makes you the better answer. A working statement reads: for busy parents who currently order take-away twice a week, our service delivers kit meals in ten minutes for less than restaurant delivery, because the menu has four choices instead of forty. Specificity is the point; if everyone is the target, nobody is.\n\nBrand is the promise that positioning makes, repeated until it is recognisable. Build a small kit early: a logo with one primary and one secondary version, two typefaces, three colours with defined roles, and a voice guide with two do and two do-not examples. Consistency compounds, so the same headline logic should appear on the landing page, the email footer, and the founder LinkedIn posts. Treat brand as a filter for decisions rather than decoration, because when channels multiply, only a written standard keeps the experience coherent.'
      },
      {
        id: 's2',
        type: 'text',
        title: 'Building the Acquisition Funnel',
        content: 'Map the journey in three layers. At the top, strangers learn you exist through search results, short-form video, or a partner newsletter. In the middle, prospects who recognise the problem compare options, so long-form content, demos, and case studies do the work. At the bottom, ready buyers need a clear price, proof, and a low-friction next step such as a free trial or a booking link. Each layer needs its own message: educate first, differentiate second, remove doubt last.\n\nEarly on, resist the urge to be everywhere. Pick one channel where your segment already gathers, run it for eight weeks with a fixed budget, and measure cost per qualified sign-up before adding a second channel. A niche newsletter sponsorship that produces twelve trials beats scattered posts that produce none, because depth beats coverage when the budget is small. Write the funnel down as numbers: visitors, sign-ups, trials, paying customers. Conversion between each pair tells you exactly which stage to fix next.'
      },
      {
        id: 's3',
        type: 'text',
        title: 'Measuring CAC, Conversion, and Retention',
        content: 'Customer acquisition cost is total sales and marketing spend divided by new customers in the same period, including salaries and tools, not just ad spend. If the team spends three thousand dollars a month and adds thirty customers, CAC is one hundred dollars. Track it per channel, because a blended average hides the channel quietly losing money while another one pays for itself.\n\nThen connect CAC to value and conversion. If contribution per customer is forty dollars per month and average life is fourteen months, lifetime value is five hundred and sixty dollars, a healthy ratio, but only if cash returns inside the payback window you can afford. Multiply funnel stages to find leverage: doubling landing-page conversion from two to four percent halves the cost of every click that follows. Review the funnel weekly, fix the weakest stage first, and change one variable at a time so results stay attributable.'
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'A campaign spends 3,000 dollars including salaries and tools and acquires 30 customers. What is the customer acquisition cost?',
        options: ['100 dollars', '30 dollars', '300 dollars', '10 dollars'],
        correctIndex: 0,
        explanation: 'CAC equals total spend divided by customers acquired: 3,000 / 30 = 100 dollars per customer, and it must include labour, not only media spend.'
      },
      {
        id: 'q2',
        question: 'Which funnel change has the widest downstream effect?',
        options: [
          'Changing the button colour in the footer',
          'Adding a third social network',
          'Doubling the conversion rate of the landing page from two to four percent',
          'Rewriting the privacy policy'
        ],
        correctIndex: 2,
        explanation: 'Every later stage inherits the gain from an early-stage conversion improvement, so doubling landing conversion halves the effective cost of all traffic behind it.'
      },
      {
        id: 'q3',
        question: 'What does a strong positioning statement require?',
        options: [
          'A list of every feature the product includes',
          'An award or press mention used as proof',
          'A tagline of five words or fewer',
          'A specific segment, the realistic alternative, and the benefit that differentiates you'
        ],
        correctIndex: 3,
        explanation: 'Positioning only works when it names who the offer is for, what buyers would use instead, and why the offer wins on a benefit they care about.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'U.S. Federal Trade Commission — advertising and endorsement rules', type: 'link', url: 'https://www.ftc.gov/' },
      { title: 'HubSpot — inbound marketing and funnel resources', type: 'link', url: 'https://www.hubspot.com/' },
      { title: 'Mailchimp — email marketing guides and benchmarks', type: 'link', url: 'https://www.mailchimp.com/' }
    ]),
    videoUrl: null
  },
  {
    category: 'entrepreneurship',
    title: 'Scaling, Operations & Sustainable Growth',
    description: 'Diagnose growth bottlenecks, standardise and automate core processes, and balance hiring and cash so scaling stays profitable and sustainable.',
    moduleOrder: 6,
    durationMinutes: 80,
    difficulty: 'advanced',
    topics: 'Scaling Operations,Process Automation,Hiring Plan,Supply Chain,Cash Conversion',
    learningObjectives: JSON.stringify([
      'Diagnose whether a growth stall is caused by demand, capacity, or process bottlenecks using cycle data',
      'Document a core process as a checklist and SOP, then automate only the stable steps',
      'Sequence hiring against measurable workload triggers rather than reactive panic',
      'Apply sustainability checks including unit economics, cash conversion cycle, and compliance duties'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'What Breaks When You Scale',
        content: 'Growth rarely fails for one reason. Use three lenses to locate the constraint. Demand is the problem if leads arrive slower than the sales team can handle while close rates hold. Capacity is the problem when orders arrive but delivery times stretch, quality drifts, or refunds rise. Process is the problem when output depends on a few heroic individuals whose calendars, not market appetite, set the ceiling. Instrument the funnel and the fulfilment line before arguing about causes.\n\nWork a concrete case: a direct-to-consumer skincare brand grows forty percent in a year while satisfaction falls. Weekly numbers show healthy lead flow, so demand is fine; average dispatch slips from one day to five, so capacity is strained; and the root cause is a stock-out pattern traced to order forecasts kept in a spreadsheet only one person understands, which is a process failure. Naming the real constraint prevents the classic mistake of buying more advertising while the warehouse is already drowning, and it tells you which single fix buys the next quarter of growth.'
      },
      {
        id: 's2',
        type: 'text',
        title: 'Standardise, Then Automate',
        content: 'Document before you automate, otherwise you automate chaos. Pick the process that runs most often, such as onboarding a new client, and write it as a checklist with inputs, steps, owners, and the definition of done. Time a handful of runs to find the longest step and the error rate. Only when the sequence stops changing should you reach for tools: templates, integrations, or scripts that remove the repetitive keystrokes.\n\nAutomation pays back where volume is high and rules are stable: invoicing, appointment reminders, inventory reorder points, and report generation. It misfires where judgement matters, such as exception refunds or hiring decisions, so keep a human checkpoint and a rollback path for anything automated. Measure the result with cycle time and defect rate before and after, not with enthusiasm. In the worked example, turning the client onboarding checklist into a shared workflow cut the time from first call to kickoff from nine days to three, and eliminated the forgotten security review that had caused two failed audits.'
      },
      {
        id: 's3',
        type: 'text',
        title: 'Hiring, Cash Discipline, and Durable Growth',
        content: 'Hire against triggers, not moods. Define the workload signal that justifies each role: forty support tickets a day justifies a second agent, and three concurrent implementations justify a second delivery lead. Prefer generalists with strong feedback loops early, because early processes still change monthly, and document the role before posting it so the interview tests outcomes rather than vibes. One mis-hire at ten people costs more than three at forty.\n\nPair the hiring plan with cash discipline. The cash conversion cycle, the days between paying suppliers and collecting from customers, decides how much working capital growth swallows; shortening payment terms or negotiating supplier dates can add months of runway without new funding. Re-check unit economics every quarter, since acquisition costs usually rise as easy channels saturate, and keep compliance duties in the plan: payroll registration, statutory leave, data protection, and safety rules arrive with headcount and punish the unprepared. Grow at the rate your cash and unit economics allow, and growth stays a choice rather than a crisis.'
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'Delivery times are stretching and refund rates are rising while lead volume is stable. Where is the constraint?',
        options: [
          'Demand generation',
          'Capacity or process, not demand',
          'Pricing',
          'Brand positioning'
        ],
        correctIndex: 1,
        explanation: 'Stable lead flow with deteriorating delivery points at fulfilment capacity or the processes behind it, so buying more traffic would only deepen the backlog.'
      },
      {
        id: 'q2',
        question: 'Which sequence is safest when introducing automation into an operation?',
        options: [
          'Automate every step first, then document what happened',
          'Buy the most expensive platform to signal seriousness',
          'Automate the judgement-heavy exceptions to save review time',
          'Document and stabilise the process, then automate the stable steps'
        ],
        correctIndex: 3,
        explanation: 'Automating a changing or poorly understood process locks in waste. Stabilise the sequence first, then automate the repetitive, rules-based steps and keep humans on exceptions.'
      },
      {
        id: 'q3',
        question: 'What does a lengthening cash conversion cycle typically mean for a growing company?',
        options: [
          'More working capital is absorbed, so growth can outrun cash even while revenue rises',
          'Revenue is being recognised more accurately',
          'Gross margin automatically improves',
          'The company needs no further financing'
        ],
        correctIndex: 0,
        explanation: 'Paying suppliers earlier than customers pay you ties up cash in growth, which is why sales can rise while the bank balance falls.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'U.S. Department of Labor — employment and compliance guidance', type: 'link', url: 'https://www.dol.gov/' },
      { title: 'U.S. Bureau of Labor Statistics — wage and industry data', type: 'link', url: 'https://www.bls.gov/' },
      { title: 'SCORE — manage and grow your business', type: 'link', url: 'https://www.score.org/' }
    ]),
    videoUrl: null
  }
];
