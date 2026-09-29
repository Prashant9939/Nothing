// Learning modules — Tourism & Hospitality Management track (category: 'tourism')
// Seed content only. videoUrl is intentionally null for every module.
module.exports = [
  {
    title: 'Foundations of Tourism & Hospitality',
    description: 'Identify the four components of tourism, classify segments from domestic travel to MICE, and explain how stakeholders, economic impact and seasonality shape destinations.',
    moduleOrder: 1,
    durationMinutes: 55,
    difficulty: 'beginner',
    topics: 'Tourism Components,Tourism Types,Stakeholders,Economic Impact,Seasonality',
    learningObjectives: JSON.stringify([
      'Identify the four main components of tourism and explain how they interlock to deliver a destination experience',
      'Classify tourism by geography and purpose, including domestic, heritage, medical, MICE and ecotourism segments',
      'Map the key stakeholders of a tourism system and describe each group of interests',
      'Analyse how economic impact and seasonality influence destination planning and business strategy'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'The Four Components of Tourism',
        content: 'Every tourism product is built from four interlocking components, often called the four As: attractions, accessibility, accommodation and amenities. Attractions are the reason people travel, whether a beach, a temple, a festival or a conference centre. Accessibility is the transport and infrastructure that makes reaching the attraction possible, including air routes, roads, last-mile transfers and visa procedures. Accommodation provides the overnight capacity that turns a day visit into a stay, ranging from five-star hotels to homestays and campsites.\n\nAmenities are the supporting services that keep a stay workable: restaurants, ATMs, Wi-Fi, medical clinics, guides and shopping. A destination audit scores each A on a one-to-five scale, and the scores explain behaviour: a four for attractions but a two for accessibility predicts empty car parks. Operators use the framework diagnostically. A resort with strong accommodation but thin amenities loses dining spend to town, while weak accessibility inflates transfer times and erodes carefully built itineraries. When all four are balanced, a destination converts interest into longer stays and higher spending per visitor.'
      },
      {
        id: 's2',
        type: 'text',
        title: 'Tourism Types and Market Segments',
        content: 'Tourism is classified along two axes: geography and purpose. Geographically, domiciliary or domestic tourism covers residents travelling within their own country and usually dominates volumes because distances are short and costs are low. Inbound tourism describes non-residents arriving, outbound describes residents leaving, and both are tracked through border statistics. Purpose-based segments include leisure, business, visiting friends and relatives, medical, heritage and religious travel. MICE, meaning meetings, incentives, conferences and exhibitions, is a high-yield business segment that books early, fills midweek hotel inventory and demands reliable connectivity and plenary space.\n\nMotivation-based segments behave differently again. Ecotourism targets natural areas with conservation and education goals and favours small groups. Adventure tourism sells risk-managed activities such as trekking, rafting and climbing, often in rural settings. Rural tourism places visitors in villages for authentic local experiences, while heritage tourism focuses on historical and cultural sites. Medical tourism pairs treatment with travel and requires accredited providers and aftercare coordination. Each segment needs distinct packaging: a heritage itinerary emphasises guided access and opening hours, whereas an adventure package leads with safety briefings, equipment lists and weather contingencies.'
      },
      {
        id: 's3',
        type: 'text',
        title: 'Stakeholders, Economic Impact and Seasonality',
        content: 'A tourism system involves five stakeholder groups: tourists seeking value and experiences; businesses from airlines and hotels to street vendors; government bodies that set policy, visas and infrastructure; host communities who absorb the social and environmental costs; and intermediaries such as travel agents, online agencies and tour operators who assemble and sell the product. Interests often conflict, because the commission model of an intermediary and the quiet street of a resident are rarely aligned, so destination management requires structured consultation rather than ad-hoc negotiation.\n\nEconomic impact arrives in three rounds: direct spending at attractions and hotels, indirect spending through suppliers, and induced spending as employees re-spend their wages. Leakages matter just as much, because if a foreign-owned hotel imports all its goods and repatriates profit, the local multiplier shrinks. Seasonality amplifies both sides, since demand varies predictably by time of year, producing peak overcrowding alongside off-peak unemployment. Managers respond by sizing capacity for the peak, keeping staff flexible for the trough, and running marketing that pulls demand into the shoulder periods.'
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'Which set lists the four main components of tourism?',
        options: ['Accommodation, airlines, airports and attractions', 'Attractions, accessibility, accommodation and amenities', 'Marketing, money, mobility and museums', 'Agents, amenities, audits and attractions'],
        correctIndex: 1,
        explanation: 'The standard framework names attractions, accessibility, accommodation and amenities; the other options mix single elements or unrelated management terms.'
      },
      {
        id: 'q2',
        question: 'A resident who takes a holiday inside their own country is participating in which form of tourism?',
        options: ['Inbound tourism', 'Outbound tourism', 'International tourism', 'Domiciliary or domestic tourism'],
        correctIndex: 3,
        explanation: 'Domiciliary is another name for domestic tourism: travel within one\'s own country, with no border crossing involved.'
      },
      {
        id: 'q3',
        question: 'What does seasonality mean in a tourism context?',
        options: ['A predictable variation in demand across the year', 'A rota system for rotating front-office shifts', 'A certification scheme awarded to hotels', 'An inflation adjustment applied to ticket fares'],
        correctIndex: 0,
        explanation: 'Seasonality describes demand for travel rising and falling with the time of year, which drives peak pricing, staffing swings and shoulder-season marketing.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'UN Tourism (UNWTO) — global data and tourism definitions', type: 'link', url: 'https://www.unwto.org/' },
      { title: 'Ministry of Tourism, Government of India', type: 'link', url: 'https://www.tourism.gov.in/' },
      { title: 'UNESCO — culture and heritage resources', type: 'link', url: 'https://www.unesco.org/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Customer Service Excellence',
    description: 'Apply service standards across the guest journey, recover from complaints with a structured process, and use satisfaction metrics to drive measurable service improvements.',
    moduleOrder: 2,
    durationMinutes: 50,
    difficulty: 'beginner',
    topics: 'Service Standards,Complaint Handling,Service Recovery,Guest Communication,Measuring Satisfaction',
    learningObjectives: JSON.stringify([
      'Apply the five service-quality dimensions to write observable standards for at least four guest touchpoints',
      'Follow a six-step complaint-handling process to resolve a service failure within a stated empowerment limit',
      'Calculate CSAT and Net Promoter Score from sample feedback data and interpret what each reveals',
      'Design a monthly feedback loop that assigns an owner and a deadline to the top three service issues'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Service Standards and the Guest Journey',
        content: 'Service quality becomes manageable when it is written as observable standards. The SERVQUAL dimensions, tangibles, reliability, responsiveness, assurance and empathy, give teams a shared vocabulary: a usable standard reads "greet arriving guests within ten seconds and make eye contact", not "be friendly". Break the guest journey into touchpoints covering search, booking, arrival, stay, departure and post-stay, then define one standard and one owner for each. Moments of truth, such as the reception queue, the noisy-room request and the bill query, deserve scripted responses that still allow natural language.\n\nStandards only work when staff are empowered to act. Define what a front-line employee may fix without approval, such as a complimentary drink, a late checkout or a room move within the same category, and state a value ceiling like one night\'s room rate. Train through role-play and side-by-side shifts, then audit with checklists and mystery shoppers. Service blueprinting exposes backstage failures guests never see: when breakfast stock-outs persist, the blueprint shows whether the fault sits in forecasting, kitchen timing or procurement, and points training at the real bottleneck.'
      },
      {
        id: 's2',
        type: 'text',
        title: 'Complaint Handling and Service Recovery',
        content: 'Most unhappy guests never complain; they simply do not return. When a complaint does arrive, use a fixed sequence. Listen without interrupting and take written notes. Empathise by naming the feeling, for example "that wait was unreasonable". Apologise for the experience regardless of who caused it. Notify the responsible department immediately rather than at the end of the shift. Resolve by offering a real option, a refund, a redo of the service or an upgrade. Follow up before the guest departs to confirm the fix landed. This turns a vague upset into a logged incident with an owner and a deadline.\n\nEmpowerment needs clear limits so staff can decide fast: a receptionist may waive a charge up to a stated value, while a manager approves beyond it. The service recovery paradox suggests a guest whose problem is fixed well can become more loyal than one who never had a problem, but only when recovery is quick and sincere, because delayed half-measures deepen the damage. Record every complaint in a log coded by type such as noise, cleanliness, billing or staff attitude, review the codes weekly, and fix the two largest sources. Recovery corrects the incident; the log prevents the pattern.'
      },
      {
        id: 's3',
        type: 'text',
        title: 'Measuring Satisfaction and Closing the Loop',
        content: 'Pick a small set of metrics and run them consistently. CSAT asks guests to rate a specific interaction, usually on a one-to-five scale, and works well at check-out or after a service call. Net Promoter Score asks one question, how likely are you to recommend us on a zero-to-ten scale, then compares the share of promoters scoring nine or ten against detractors scoring zero to six. Always track response rate beside the score, because a tiny response from delighted regulars distorts the picture. Add operational signals too: review-platform ratings, complaint frequency, repeat booking rate and staff turnover, which often predicts service drift.\n\nData earns its keep through a closed feedback loop. Hold a monthly review where the top three themes from reviews and surveys are assigned to an owner with a due date. If breakfast queues dominate the comments, test a staggered seating plan for two weeks and re-measure the queue length. Publish results on the team board so staff see their actions move the numbers. Segment results by outlet, shift and nationality to expose patterns the averages hide, because a strong overall score can easily conceal one underperforming evening shift.'
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'Which framework breaks service quality into tangibles, reliability, responsiveness, assurance and empathy?',
        options: ["Maslow's hierarchy of needs", 'The four Ps of marketing', 'The SERVQUAL dimensions', 'The HACCP principles'],
        correctIndex: 2,
        explanation: 'SERVQUAL defines those five dimensions of service quality; the other options cover motivation, marketing mix and food safety.'
      },
      {
        id: 'q2',
        question: 'What does the service recovery paradox describe?',
        options: ['A guest whose failure is fixed well may become more loyal than one who never had a problem', 'Complaints reliably increase a hotel\'s monthly revenue', 'Recovery costs always exceed the value of retaining the guest', 'Staff should escalate every complaint to a manager immediately'],
        correctIndex: 0,
        explanation: 'The paradox is that an effective recovery can raise loyalty above the baseline of an error-free experience, provided the response is fast and genuine.'
      },
      {
        id: 'q3',
        question: 'Which metric asks customers how likely they are to recommend a company on a 0-10 scale?',
        options: ['CSAT', 'RevPAR', 'ADR', 'Net Promoter Score'],
        correctIndex: 3,
        explanation: 'NPS is built on the single 0-10 recommendation question; CSAT uses a transactional rating, while RevPAR and ADR are hotel revenue measures.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'ISO — customer satisfaction and service quality standards', type: 'link', url: 'https://www.iso.org/' },
      { title: 'Zendesk — customer service guides and benchmarks', type: 'link', url: 'https://www.zendesk.com/' },
      { title: 'Better Business Bureau — consumer trust and complaint handling', type: 'link', url: 'https://www.bbb.org/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Front Office & Housekeeping Operations',
    description: 'Control reservations through check-out, apply room-status codes and night audit routines, and run housekeeping inspection standards that keep rooms sellable daily.',
    moduleOrder: 3,
    durationMinutes: 60,
    difficulty: 'intermediate',
    topics: 'Reservations,Check-in and Check-out,Room Status Control,Night Audit,Housekeeping Standards',
    learningObjectives: JSON.stringify([
      'Process a guest booking from enquiry through pre-arrival blocking, check-in and express check-out',
      'Apply standard room-status codes and complete a night audit checklist with key revenue statistics',
      'Execute a room-cleaning sequence and score a room against a standard inspection checklist',
      'Derive linen par stock levels from occupancy forecasts and laundry cycle capacity'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Reservations and the Guest Cycle',
        content: 'Reservations arrive through direct calls and websites, online travel agencies, global distribution systems used by travel agents, corporate contracts and walk-ins. Each channel carries different commission rates and cancellation terms, so the property maintains an allotment and rate-parity plan recording how many rooms each channel may sell, at what rate, until when. Overbooking is a deliberate, calculated tool: properties overbook by a percentage derived from historical no-show and cancellation data, but only with a walking policy attached, meaning an agreed upsell, a transfer to a partner hotel, compensation and a staff script that apologises once and acts fast.\n\nThe guest cycle runs pre-arrival, arrival, occupancy and departure. Pre-arrival means blocking rooms by type, noting preferences, pre-authorising a payment card and sending arrival instructions. At arrival, verify identity, register the guest, confirm rate and departure date, explain breakfast and facilities, and attempt one contextual upsell such as a higher floor. During occupancy, log requests and route them to housekeeping or maintenance against a response-time target. At departure, offer express checkout, settle the bill, request a return visit and release the room to housekeeping within minutes to protect afternoon sellable inventory.'
      },
      {
        id: 's2',
        type: 'text',
        title: 'Room Status, Billing and the Night Audit',
        content: 'Room status is the front office shared language. At minimum, distinguish occupied, vacant-clean meaning sellable now, vacant-dirty meaning awaiting service, out-of-order meaning unsellable for repair and removed from inventory, and out-of-service meaning a short hold. The property management system stores these codes and housekeeping updates them from floor tablets, so the desk must never sell a room marked dirty or out-of-order. Rate integrity matters equally: every rate change needs a reason code such as discount, comp or upgrade, so the audit can explain variance between budgeted and actual room revenue.\n\nThe night audit runs after the day\'s transactions close. Verify that all arrivals and departures were posted, balance the room ledger against front-desk cash and card settlements, review no-show and walk-in reports, check that restaurant and bar postings reached the correct guest accounts, capture statistics such as occupancy, average daily rate and revenue per available room, and print the morning management pack. A clean audit before seven a.m. is the difference between reactive firefighting and decisions made on trustworthy numbers. Close with a handover note covering VIP arrivals, maintenance issues, room moves and any guest needing personal follow-up.'
      },
      {
        id: 's3',
        type: 'text',
        title: 'Housekeeping Standards and Inspection',
        content: 'Housekeeping is a scheduled production line. Build the day from the occupancy forecast: stayover services take priority before departures, then early check-outs, then deep-clean and public-area rounds. Stock each cart to a fixed layout with linen quantities derived from par levels, which means enough clean linen for every room plus a buffer covering at least one full laundry cycle, commonly three to five pars depending on laundry capacity. Work in a fixed sequence to avoid cross-contamination: make the bed, clear and surface-clean, dust from top to bottom, vacuum, then finish the bathroom last with colour-coded cloths and correctly diluted chemicals.\n\nInspection closes the system. A supervisor scores each room on a checklist covering bed presentation, bathroom fixtures, amenities, minibar, temperature setting, odour and missing items, and rejects misses back to the attendant immediately while the context is fresh. Track defect rates by attendant and by room type, because repeated failures usually signal training gaps or trolley shortages rather than attitude. Keep lost-and-found entries logged with room number, date and handler, and maintain a live room-status board with the front desk so overselling a dirty room never happens. Audit at least ten per cent of rooms daily.'
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'Which room status means the room can be sold to a arriving guest right now?',
        options: ['Vacant and clean', 'Occupied and clean', 'Out of order', 'Vacant and dirty'],
        correctIndex: 0,
        explanation: 'Only a vacant-clean room is ready to sell; a vacant-dirty room awaits servicing, and out-of-order rooms are removed from inventory for repair.'
      },
      {
        id: 'q2',
        question: 'What is the primary purpose of the night audit?',
        options: ['To deep-clean rooms before the morning rush', 'To sell remaining rooms at a discount before midnight', 'To reconcile room charges, postings and daily revenue statistics', 'To build the marketing campaign for the next season'],
        correctIndex: 2,
        explanation: 'The night audit balances accounts, verifies postings and produces occupancy, ADR and RevPAR figures so management starts the day on accurate numbers.'
      },
      {
        id: 'q3',
        question: 'A linen "par" level is best defined as:',
        options: ['The price charged for a set of bed linen', 'Enough clean linen for all rooms plus a buffer covering laundry cycles', 'The percentage of rooms sold each night', 'The maximum soiling level accepted by inspectors'],
        correctIndex: 1,
        explanation: 'Par stock equals the full requirement plus a working buffer so clean linen is always available while other stock is still in the laundry cycle.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'Hospitality Net — hospitality industry news and analysis', type: 'link', url: 'https://www.hospitalitynet.org/' },
      { title: 'American Hotel & Lodging Association — hotel standards and training', type: 'link', url: 'https://www.ahla.com/' },
      { title: 'ISSA — the worldwide cleaning industry association', type: 'link', url: 'https://www.issa.com/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Itinerary Planning & Travel Management',
    description: 'Sequence multi-day itineraries with realistic buffers, verify traveller documents and health needs, and manage corporate travel policy, MICE logistics and trip risk.',
    moduleOrder: 4,
    durationMinutes: 65,
    difficulty: 'intermediate',
    topics: 'Itinerary Design,Travel Documents,Budgeting,Risk Management,MICE Logistics',
    learningObjectives: JSON.stringify([
      'Sequence a multi-day itinerary to minimise transit time while respecting opening hours and rest periods',
      'Compile a traveller document and health checklist covering passport validity, visas, insurance and vaccinations',
      'Draft a corporate travel policy covering booking windows, approval thresholds and preferred suppliers',
      'Build a trip risk register with likelihood, impact, response owner and disruption playbook steps'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Designing a Balanced Itinerary',
        content: 'A workable itinerary starts with constraints, not attractions. Fix the hard edges first: arrival and departure transport, booked accommodation, pre-purchased event tickets and any fixed appointments. Then place attractions in geographic clusters to avoid criss-crossing the city, respecting opening days and hours, because museums often close one weekday, temples close midday and coastal boats stop when afternoon wind rises. Apply buffer rules of roughly thirty minutes for urban transfers and a minimum of two hours before international flights, and never schedule more than three ticketed items in one day for leisure groups.\n\nCost the plan line by line: land transport, air or rail fares, admissions, meals, gratuities, taxes, insurance and a contingency of five to ten per cent for surcharges. Build the document travellers actually use, a day sheet carrying times, addresses written in the local language, contact numbers, meeting points, walking distances and a notes column. Order the sheet by day with a one-line summary per day so a quick scan reveals an overloaded Tuesday. Finally, check the season, because a monsoon-period itinerary replaces beach mornings with museum and market slots instead of hoping the weather cooperates.'
      },
      {
        id: 's2',
        type: 'text',
        title: 'Documents, Health and Traveller Requirements',
        content: 'International travel fails on paperwork more often than on money. Start a per-traveller checklist covering passport validity, since many destinations require six months beyond entry, completed entry visas or electronic authorisations, onward-ticket proof, vaccination certificates, travel insurance with medical and repatriation cover, driving permits where relevant, and a card notification to the issuing bank. Verify every requirement against official government sources rather than forum advice, because rules change with little notice. Store digital copies in an accessible cloud folder and keep paper copies separate from the originals.\n\nHealth planning covers routine vaccinations, destination advisories, altitude or heat risks, a personal medication supply with a doctor letter, and a list of accredited clinics along the route. For MICE travel, add a rooming list giving arrival and departure flights per delegate, badge names exactly as printed on passports, airport transfer manifests with driver contact, a welcome desk with extended hours on arrival day, and a speaker-ready room booked two hours before each keynote. Distribute the delegate pack at least ten days ahead and publish one emergency number staffed throughout the event.'
      },
      {
        id: 's3',
        type: 'text',
        title: 'Corporate Travel Management and Risk',
        content: 'A corporate travel policy turns scattered bookings into managed spend. Set the rules that move numbers: book at least fourteen days ahead to capture lower fares, default to economy below a stated flight length, require the approved booking tool or preferred agency, demand advance approval above a spending threshold, and negotiate preferred hotel and airline programmes for rate parity and amenities. Pair the policy with a travel management company that supplies traveller tracking, consolidated billing and after-hours support. Capture every booking including out-of-policy ones, so quarterly reporting reveals leakage, savings and traveller satisfaction.\n\nDuty of care is the other half. Maintain a live list of where travellers are, one 24/7 emergency contact, and a disruption playbook: for strikes or severe weather the order is notify travellers, rebook on protected inventory, arrange accommodation, then document costs. Before departure, complete a risk register naming hazards such as political unrest, flooding or transport strikes with likelihood, impact and a named response owner. Build sustainability into policy by defaulting short rail journeys over flights. After the trip, close the loop with expense reconciliation and a debrief noting exactly what changes next quarter.'
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'Which check should happen first when planning a trip to another country?',
        options: ['Booking airport transfers', 'Confirming hotel loyalty numbers', 'Printing boarding passes early', 'Verifying passport validity and visa requirements'],
        correctIndex: 3,
        explanation: 'Entry rules determine whether the trip is possible at all, so passport validity and visas are checked before any bookings that might become non-refundable.'
      },
      {
        id: 'q2',
        question: 'In a corporate travel policy, an advance-purchase window mainly exists to:',
        options: ['Guarantee an aisle seat for every traveller', 'Capture lower fares and bring spend under control', 'Reduce checked baggage fees', 'Avoid taxes on frequent-flyer points'],
        correctIndex: 1,
        explanation: 'Booking earlier is the single most reliable lever for lower fares, which is why policies set a minimum advance-purchase window.'
      },
      {
        id: 'q3',
        question: 'What is a rooming list used for in MICE logistics?',
        options: ['Tracking conference sponsorship revenue', 'Printing delegate name badges', 'Giving the hotel each delegate room assignment and stay dates', 'Recording dietary requirements for the gala dinner'],
        correctIndex: 2,
        explanation: 'The rooming list matches delegates to rooms and dates so the hotel pre-assigns inventory and the organiser can verify folios afterwards.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'IATA — airline industry standards and travel information', type: 'link', url: 'https://www.iata.org/' },
      { title: 'US State Department — travel advisories and entry requirements', type: 'link', url: 'https://travel.state.gov/' },
      { title: 'CDC Travelers Health — destination health advisories', type: 'link', url: 'https://www.cdc.gov/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Food & Beverage Service Management',
    description: 'Match service styles to outlets, execute a consistent sequence of service, apply HACCP temperature controls, and manage food cost with menu engineering techniques.',
    moduleOrder: 5,
    durationMinutes: 60,
    difficulty: 'intermediate',
    topics: 'Service Styles,Sequence of Service,Food Safety,Menu Engineering,Cost Control',
    learningObjectives: JSON.stringify([
      'Match service styles such as a la carte, buffet and banqueting to the correct outlet situations',
      'Execute the standard sequence of service for a multi-course table service meal',
      'Apply HACCP controls to monitor cooking, chilling and holding temperatures in a working kitchen',
      'Calculate food cost percentage and classify menu items using the menu engineering matrix'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Service Styles and the Sequence of Service',
        content: 'Match the service style to the outlet and the expected check size. A la carte offers full choice at individual pricing and needs confident order-taking; table d\'hote is a fixed multi-course menu that allows faster standardised service; buffet concentrates labour at replenishment and demands constant face-up presentation; counter service suits high-turnover cafes; room service adds trolley setup and tray collection logistics; banqueting runs off a banquet event order that fixes timings, covers, layouts and menu. Within table service, house standards define who serves from which side, how courses are cleared and the order of attention, applied consistently rather than mechanically.\n\nThe sequence of service runs in eight steps: greet and seat within a target time, present menus with a water offer, confirm drinks, take orders with one upsell suggestion, fire courses to kitchen timings, manage pacing so plates clear together, anticipate refills, then present the bill promptly and reset the table to a two-minute standard. Train each step with timed drills and side-by-side observation. The gap between a good and a poor restaurant is rarely the food alone; it is whether the team executes the same eight steps at table one and at table twelve.'
      },
      {
        id: 's2',
        type: 'text',
        title: 'Food Safety and Hygiene Controls',
        content: 'HACCP gives kitchens a preventive logic: identify hazards, define critical control points, set limits, monitor those limits, verify the system and keep records. In practice most critical control points are temperatures. Hold chilled storage at or below five degrees Celsius, cook proteins to their required core temperature, keep hot food above sixty-three degrees Celsius, and treat five to sixty degrees as the danger zone where bacteria multiply fastest. Food spending more than two combined hours in that zone must be used or discarded. Calibrate probe thermometers daily and log readings at open and close.\n\nAround those controls sit supporting programmes: first-in-first-out stock rotation with labelled dates, colour-coded cloths and boards separating raw meat from ready-to-eat food, handwashing enforced at defined moments, cleaning versus sanitising at correct chemical dilution, allergen handling with separate utensils and a documented allergen matrix, and staff illness reporting with exclusion rules. Verify through weekly internal audits and monthly manager checks, storing records for the retention period your local regulator specifies. When an audit fails, correct the root cause, because a recurring high reading usually means a failing refrigerator rather than a failing chef.'
      },
      {
        id: 's3',
        type: 'text',
        title: 'Menu Engineering and Cost Control',
        content: 'Cost control starts with measurement. Food cost percentage equals cost of food sold divided by food sales, multiplied by one hundred; a casual restaurant often targets the mid-thirties while fine dining with premium proteins may run higher. Add labour cost to reach prime cost, the figure management watches weekly. The control levers are concrete: recipe cards with fixed portion tools, scale-weighed proteins, par preparation tied to forecast covers, yield tests on deliveries so you know what a kilo of trimmed asparagus really yields, waste logs by category, and daily counts of high-value items.\n\nMenu engineering then plots each item on a matrix of contribution margin against popularity. Stars earn healthy margins and sell well, so give them prime menu position. Plowhorses are popular but carry thin margins, so re-cost or gently reprice them. Puzzles earn strong margins yet rarely sell, so prompt staff to recommend them or run them as a daily special. Dogs fail on both counts and are candidates for removal. Review sales mix, waste and complaints in a weekly menu meeting, change one variable at a time, and re-measure after fourteen days.'
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'The temperature danger zone, where food-borne bacteria multiply fastest, is roughly:',
        options: ['Below minus 18 degrees Celsius', 'Above 75 degrees Celsius', 'Between 5 and 60 degrees Celsius', 'Between 60 and 75 degrees Celsius'],
        correctIndex: 2,
        explanation: 'Roughly 5 to 60 degrees Celsius is the danger zone, which is why chilling, cooking and hot-holding limits are set on either side of it.'
      },
      {
        id: 'q2',
        question: 'On the menu engineering matrix, an item with high popularity and high contribution margin is classified as:',
        options: ['A star', 'A plowhorse', 'A puzzle', 'A dog'],
        correctIndex: 0,
        explanation: 'Stars combine strong margins with strong sales, so they are featured prominently; plowhorses, puzzles and dogs each fail on one or both measures.'
      },
      {
        id: 'q3',
        question: 'How is food cost percentage calculated?',
        options: ['Food sales divided by cost of food sold, times 100', 'Cost of food purchased divided by number of covers', 'Gross sales minus total labour cost', 'Cost of food sold divided by food sales, times 100'],
        correctIndex: 3,
        explanation: 'Food cost percentage is cost of food sold over food sales, times 100; the first option reverses the ratio and would usually exceed 100 per cent.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'US Food and Drug Administration — the Food Code', type: 'link', url: 'https://www.fda.gov/' },
      { title: 'ServSafe — food safety training and certification', type: 'link', url: 'https://www.servsafe.com/' },
      { title: 'National Restaurant Association — industry resources', type: 'link', url: 'https://www.nraonline.org/' }
    ]),
    videoUrl: null
  },
  {
    title: 'Sustainable Tourism & Destination Marketing',
    description: 'Assess destination carrying capacity, evaluate tourism certification schemes, and plan marketing campaigns that spread visitor demand across seasons and segments.',
    moduleOrder: 6,
    durationMinutes: 70,
    difficulty: 'advanced',
    topics: 'Sustainable Tourism,Ecotourism,Certification,Destination Marketing,Visitor Flows',
    learningObjectives: JSON.stringify([
      'Assess a destination economic, socio-cultural and environmental impacts using a carrying-capacity framework',
      'Evaluate tourism certification schemes against criteria for auditing, measurement and enforcement',
      'Segment destination markets and write a positioning statement grounded in a verifiable strength',
      'Plan a shoulder-season campaign with specific tactics and measurable bed-night targets'
    ]),
    contentSections: JSON.stringify([
      {
        id: 's1',
        type: 'text',
        title: 'Sustainable and Responsible Tourism Practice',
        content: 'Sustainable tourism meets present visitor needs without compromising the ability of future generations to meet theirs, and responsible tourism makes the operator accountable for those impacts. Assess impacts in three buckets: economic, covering how much spend stays local rather than leaking out through imports and repatriated profit; socio-cultural, covering noise, congestion, heritage wear and resident resentment; and environmental, covering water, energy, waste and habitat pressure. Overtourism signals include resident protests, queue-length complaints and short-term-let conversion of housing, and the response combines timed entry, dispersal to secondary sites, resident-only zones and accommodation caps.\n\nCarrying capacity provides the operating limits: physical capacity for how many people fit, ecological capacity for what the system absorbs, and social capacity for how much interaction residents tolerate. Ecotourism adds conservation funding, environmental education, small group sizes and genuine community participation; adventure operators set permit limits, guide ratios and leave-no-trace protocols; rural stays must verify their employment and local-sourcing claims. Practically, publish a visitor code, source guides and produce locally, and train staff to explain why limits exist. Destinations that manage pressure deliberately protect both the resource and the licence to operate that communities grant them.'
      },
      {
        id: 's2',
        type: 'text',
        title: 'Certification, Standards and Measurement',
        content: 'Certification converts vague green claims into audited commitments. Schemes such as Green Key and Rainforest Alliance, plus systems like ISO 14001 for environmental management, differ in rigor: strong schemes publish their criteria, require documented evidence, verify on site and renew on a schedule. Before joining any scheme, test it with three questions: who audits, what must be measured, and what happens on failure. Beware greenwashing signals such as self-declared badges with no published criteria, leaf imagery without data, and claims like eco-friendly that no standard actually defines.\n\nMeasurement keeps certification honest between audits. Track energy and water consumed per guest-night, waste kilograms per cover with a split for food waste, the percentage of purchasing done locally, and staff trained on environmental procedures, then publish a short annual summary even for a single property. Assign each metric an owner and a target, and review monthly against identical definitions so trends stay comparable. Combine internal numbers with guest surveys asking whether the efforts were noticed. What is measured, budgeted and reviewed survives a change of manager; what is merely intended does not.'
      },
      {
        id: 's3',
        type: 'text',
        title: 'Destination Marketing and Smoothing Seasonality',
        content: 'A destination marketing organisation researches demand, positions the place and coordinates partners who each control only part of the product. Begin with segmentation: rank source markets by arrivals, spend and growth, then choose a positioning line grounded in a real strength, whether heritage fabric, medical expertise, adventure access or event capacity, and pressure-test it against competing destinations. Build the offer with trade partners through familiarisation trips for agents, joint stands at major travel fairs, packages combining accommodation with timed-entry attractions, and a content library of images and fact sheets that operators may use under brand rules.\n\nSeasonality is the shared marketing problem, because demand varies predictably across the year. Smooth it with a calendar of shoulder-season events, resident pricing, rainy-day indoor products, conference space marketed to midweek corporate buyers, and heritage or medical segments that travel outside summer. Disperse visitors spatially with themed routes to secondary sites. Split the budget in favour of the shoulder period rather than reinforcing the peak, and judge campaigns on bed-nights and average spend in the target months rather than on impressions alone, reporting quarterly so the next plan adjusts from evidence.'
      }
    ]),
    quizQuestions: JSON.stringify([
      {
        id: 'q1',
        question: 'What is the strongest immediate response to overtourism at a fragile heritage site?',
        options: ['Add more cruise berths at the nearby port', 'Dispersing visitors across sites and time slots while protecting resident daily life', 'Remove entry limits to keep visitor numbers growing', 'Freeze all hotel rates for the coming year'],
        correctIndex: 1,
        explanation: 'Timed entry and dispersal reduce pressure on the single hotspot while safeguarding community life; the other options increase or entrench the pressure.'
      },
      {
        id: 'q2',
        question: 'Which is the strongest defence against greenwashing in tourism claims?',
        options: ['Using eco imagery in brochures', 'Making vague go-green statements', 'Self-declared membership of an unverified club', 'Third-party certification with published, audited criteria'],
        correctIndex: 3,
        explanation: 'Independent certification with published criteria, evidence requirements and on-site verification is what separates audited claims from marketing spin.'
      },
      {
        id: 'q3',
        question: 'A shoulder-season campaign primarily aims to:',
        options: ['Lift demand in the periods just before and after peak season', 'Cut staff rotas during the winter shutdown', 'Replace the annual destination festival', 'Raise per-room rates during the summer peak'],
        correctIndex: 0,
        explanation: 'Shoulder periods sit either side of the peak, so campaigns target them with events, packaging and pricing to flatten the demand curve.'
      }
    ]),
    resources: JSON.stringify([
      { title: 'UN Tourism (UNWTO) — sustainable tourism guidance', type: 'link', url: 'https://www.unwto.org/' },
      { title: 'Rainforest Alliance — sustainable tourism certification', type: 'link', url: 'https://www.rainforest-alliance.org/' },
      { title: 'Pacific Asia Travel Association — destination marketing network', type: 'link', url: 'https://www.pata.org/' }
    ]),
    videoUrl: null
  }
];
