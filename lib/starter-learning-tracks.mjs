/** Built-in practice courses. These are study guides, not publisher-issued credentials. */
const definitions = [
  [
    "digital-marketing",
    "Digital Marketing",
    "Marketing",
    "Plan campaigns around audiences, channels, budgets, and measurable outcomes.",
    [
      [
        "Audience & positioning",
        "Define a specific customer group and the problem your offer solves. A useful positioning statement explains the audience, benefit, and reason to believe.",
      ],
      [
        "Search & campaign planning",
        "Map each channel to a customer journey stage. Use relevant search intent and a clear landing-page action rather than measuring success only through clicks.",
      ],
      [
        "Campaign measurement",
        "Conversion rate is conversions divided by eligible visits. Compare acquisition cost with the value of a conversion, and keep attribution assumptions explicit.",
      ],
      [
        "Experiment design",
        "Change one major variable at a time and choose the success metric before launching. Account for sample size and seasonality before declaring a campaign winner.",
      ],
    ],
  ],
  [
    "content-creation",
    "Content Creation",
    "Creative",
    "Develop useful stories, production plans, and content for a defined audience.",
    [
      [
        "Audience & content purpose",
        "Choose whom the content serves and what they should understand or do afterwards. A narrow purpose makes examples and format easier to select.",
      ],
      [
        "Story structure & scripting",
        "Build a clear opening, a connected middle, and an ending that resolves the promise. Use a script or storyboard to remove repetition before production.",
      ],
      [
        "Production & accessibility",
        "Plan framing, readable text, and intelligible audio before recording. Captions, alt text, and licensed assets make content more accessible and reusable.",
      ],
      [
        "Publishing & evaluation",
        "Match your publishing schedule to realistic production capacity. Evaluate retention and meaningful audience responses alongside reach, then revise the next piece.",
      ],
    ],
  ],
  [
    "copywriting",
    "Copywriting & Brand Storytelling",
    "Creative",
    "Write clear messages, useful headlines, and persuasive brand stories.",
    [
      [
        "Message & audience",
        "Start with a reader need and one concrete benefit. Replace vague claims with specific information the reader can assess.",
      ],
      [
        "Headlines & calls to action",
        "A headline should accurately promise what follows. A call to action names the next step and sets expectations about what happens after it.",
      ],
      [
        "Voice & editing",
        "Choose a consistent tone and vocabulary for the brand. Edit for clarity, remove unnecessary words, and verify claims before publication.",
      ],
      [
        "Testing & ethical persuasion",
        "Compare versions against the same intended outcome. Avoid invented urgency, misleading testimonials, and benefits that the product cannot substantiate.",
      ],
    ],
  ],
  [
    "social-media",
    "Social Media Strategy",
    "Marketing",
    "Organize social content, community responses, and campaign measurement.",
    [
      [
        "Channel & audience fit",
        "Choose channels based on audience behavior and content format. Define a purpose for each channel instead of posting identical material everywhere.",
      ],
      [
        "Content calendar",
        "Balance recurring themes, campaigns, and audience questions. Include ownership, review dates, and the assets required for each scheduled post.",
      ],
      [
        "Community management",
        "Respond with relevant information and a consistent tone. Establish a process for complaints and sensitive issues rather than improvising public commitments.",
      ],
      [
        "Performance analysis",
        "Separate reach, engagement, and conversion metrics. Compare similar formats and time windows, and document paid distribution when interpreting results.",
      ],
    ],
  ],
  [
    "graphic-design",
    "Graphic Design",
    "Design",
    "Practice layout, visual hierarchy, typography, and brand consistency.",
    [
      [
        "Composition & hierarchy",
        "Make the most important information visually prominent through scale, spacing, and contrast. Align elements to a consistent grid to clarify relationships.",
      ],
      [
        "Typography & color",
        "Use a small type scale and adequate line spacing for readable text. Color should support hierarchy while keeping text contrast and color-blind accessibility in mind.",
      ],
      [
        "Identity & design systems",
        "Define reusable rules for typography, spacing, colors, and imagery. Consistency makes separate assets recognizable without making every layout identical.",
      ],
      [
        "Production & critique",
        "Check dimensions, image resolution, and export format for the destination. Evaluate design against the communication goal and revise using specific feedback.",
      ],
    ],
  ],
  [
    "video-editing",
    "Video Editing & Production",
    "Creative",
    "Plan edits, assemble sequences, and deliver clear audiovisual stories.",
    [
      [
        "Shots & continuity",
        "Select shots that communicate the action clearly. Maintain consistent screen direction and use establishing shots when the location matters.",
      ],
      [
        "Timeline & pacing",
        "Organize footage before building a rough cut. Use cut timing to support comprehension and emotion rather than adding transitions without a purpose.",
      ],
      [
        "Audio & color",
        "Balance dialogue, music, and ambient sound so speech stays intelligible. Match exposure and white balance across shots before applying a creative look.",
      ],
      [
        "Delivery & review",
        "Choose resolution, aspect ratio, and captions for the intended platform. Review the export from beginning to end for missing media, clipping, and spelling errors.",
      ],
    ],
  ],
  [
    "business-analytics",
    "Business Analytics",
    "Business",
    "Turn business questions into measurable analysis and clear decisions.",
    [
      [
        "Problem framing",
        "State the decision the analysis will support and the relevant time period. Define metrics before collecting data to avoid answering a convenient but irrelevant question.",
      ],
      [
        "Data quality & exploration",
        "Check missing values, duplicates, and inconsistent definitions. Summaries and distributions help reveal whether the data can support the intended comparison.",
      ],
      [
        "Dashboards & communication",
        "Choose a chart that matches the comparison and label units clearly. Show context such as targets or prior periods without implying causation from correlation.",
      ],
      [
        "Decision evaluation",
        "Compare alternatives using explicit assumptions, costs, and uncertainty. Track outcomes after a decision to learn whether the original reasoning held up.",
      ],
    ],
  ],
  [
    "accounting",
    "Accounting & Financial Literacy",
    "Business",
    "Understand business records, financial statements, and budgeting concepts.",
    [
      [
        "Transactions & records",
        "The accounting equation relates assets, liabilities, and equity. Recording both sides of a transaction keeps business records internally consistent.",
      ],
      [
        "Financial statements",
        "The income statement describes performance over a period, while the balance sheet describes a point in time. Cash flow explains why profit and available cash can differ.",
      ],
      [
        "Budgets & variance",
        "A budget expresses planned revenue and spending using explicit assumptions. A variance compares actual results with the plan and needs context before it becomes actionable.",
      ],
      [
        "Ratios & interpretation",
        "Ratios summarize relationships but do not replace an understanding of the business. Compare consistent periods and definitions, and consider one-time events.",
      ],
    ],
  ],
  [
    "entrepreneurship",
    "Entrepreneurship",
    "Business",
    "Explore customer needs, business models, and early-stage experiments.",
    [
      [
        "Customer discovery",
        "Ask about actual customer behavior and past problems before presenting a solution. Separate observations from assumptions about what people will buy.",
      ],
      [
        "Value proposition & model",
        "Describe the customer, the problem, the solution, and how value is exchanged. Identify which assumptions about costs, distribution, and revenue remain untested.",
      ],
      [
        "Prototypes & validation",
        "Build the smallest experiment that tests a specific risky assumption. Define the evidence needed to continue, change direction, or stop before running it.",
      ],
      [
        "Unit economics & growth",
        "Estimate revenue and variable cost per customer or sale. Growth is sustainable only when delivery capacity, retention, and cash needs are understood.",
      ],
    ],
  ],
  [
    "project-management",
    "Project Management",
    "Management",
    "Define scope, coordinate work, and communicate project progress.",
    [
      [
        "Scope & outcomes",
        "Define deliverables and acceptance criteria with the people who will use them. Record exclusions so that a shared project name does not hide different expectations.",
      ],
      [
        "Planning & dependencies",
        "Break work into manageable tasks and identify dependencies. Estimate with uncertainty and assign clear ownership instead of treating every date as equally certain.",
      ],
      [
        "Risk & stakeholder communication",
        "Describe risks using likelihood, impact, and a response owner. Tailor progress updates to decisions stakeholders need to make.",
      ],
      [
        "Delivery & retrospective",
        "Check deliverables against acceptance criteria and document handover responsibilities. Use a retrospective to turn observed problems into specific process improvements.",
      ],
    ],
  ],
  [
    "sales",
    "Sales & Customer Success",
    "Business",
    "Practice customer discovery, solution fit, and ongoing account support.",
    [
      [
        "Customer needs",
        "Use open questions to understand the customer’s current process and constraints. Confirm your understanding before describing a solution.",
      ],
      [
        "Value-based proposals",
        "Connect each proposed feature or service to a stated customer need. Make pricing, limitations, and next steps clear.",
      ],
      [
        "Objections & negotiation",
        "Explore the reason behind an objection instead of immediately discounting. Seek trade-offs that address both parties’ constraints and document agreed terms.",
      ],
      [
        "Onboarding & retention",
        "Agree on success measures and help the customer reach an initial useful outcome. Review adoption and unresolved issues before renewal becomes urgent.",
      ],
    ],
  ],
  [
    "human-resources",
    "Human Resource Management",
    "Management",
    "Understand role design, structured hiring, onboarding, and feedback.",
    [
      [
        "Role design",
        "Describe responsibilities and required capabilities in observable terms. Separate essential requirements from skills that can be learned after joining.",
      ],
      [
        "Structured hiring",
        "Use consistent questions and criteria relevant to the role. Record evidence from answers and work samples rather than relying on impressions.",
      ],
      [
        "Onboarding & development",
        "Set clear early expectations and provide access to people, tools, and learning materials. Use regular check-ins to identify gaps in support.",
      ],
      [
        "Performance & feedback",
        "Discuss specific behavior and its impact using concrete examples. Agree on achievable next steps and follow up consistently.",
      ],
    ],
  ],
  [
    "ux-design",
    "User Experience Design",
    "Design",
    "Research user needs and prototype accessible interactions.",
    [
      [
        "User research",
        "Choose a research method that fits the question. Observe tasks and ask neutral questions to distinguish user needs from your own design preferences.",
      ],
      [
        "Information architecture",
        "Group information using concepts familiar to the audience. Use labels and navigation that help users predict where an action will lead.",
      ],
      [
        "Prototyping & accessibility",
        "Prototype the main task flow before polishing visual details. Consider keyboard navigation, visible focus, readable text, and useful error messages.",
      ],
      [
        "Usability evaluation",
        "Ask participants to perform realistic tasks without coaching them through the interface. Prioritize findings by impact and verify whether revisions solve the observed problem.",
      ],
    ],
  ],
  [
    "mechanical-engineering",
    "Mechanical Engineering Fundamentals",
    "Engineering",
    "Explore forces, materials, thermal systems, and manufacturing concepts.",
    [
      [
        "Forces & equilibrium",
        "A free-body diagram identifies the forces acting on an isolated object. Equilibrium requires balanced forces and moments under the chosen assumptions.",
      ],
      [
        "Materials & stress",
        "Stress relates load to area, while strain describes relative deformation. Material choice depends on load conditions, environment, manufacturing, and failure modes.",
      ],
      [
        "Energy & thermal systems",
        "Track energy crossing a defined system boundary as heat or work. State assumptions clearly when using conservation of energy to compare processes.",
      ],
      [
        "Manufacturing & tolerances",
        "Choose manufacturing processes that suit material, geometry, and production volume. Tolerances describe acceptable variation and influence fit, cost, and inspection.",
      ],
    ],
  ],
  [
    "civil-engineering",
    "Civil Engineering Fundamentals",
    "Engineering",
    "Study structural concepts, construction planning, and infrastructure systems.",
    [
      [
        "Loads & structures",
        "Identify permanent and variable loads before discussing load paths. A load path explains how forces travel through structural elements to the ground.",
      ],
      [
        "Materials & construction",
        "Concrete, steel, and masonry have different strengths, limitations, and quality controls. Material properties and construction sequencing both affect performance.",
      ],
      [
        "Surveying & estimation",
        "Use consistent reference points and units when measuring sites. Estimates should distinguish measured quantities, assumptions, and allowances.",
      ],
      [
        "Infrastructure & sustainability",
        "Evaluate infrastructure across construction, use, maintenance, and end-of-life stages. Consider drainage, resource use, and impacts on the surrounding community.",
      ],
    ],
  ],
  [
    "electrical-engineering",
    "Electrical Engineering Fundamentals",
    "Engineering",
    "Practice circuit analysis, power concepts, and control fundamentals.",
    [
      [
        "Voltage, current & resistance",
        "Voltage is potential difference and current is charge flow. Ohm’s law describes their relationship for an ideal resistor within its operating conditions.",
      ],
      [
        "Circuit analysis",
        "Kirchhoff’s laws express conservation of charge and energy in a circuit. Use consistent sign conventions and verify units when solving a network.",
      ],
      [
        "AC power & machines",
        "Alternating signals are described by magnitude, frequency, and phase. Distinguish real power from apparent power when comparing loads.",
      ],
      [
        "Control & measurement",
        "Feedback compares measured output with a reference and changes an input. Sensor accuracy, noise, and response time limit practical control performance.",
      ],
    ],
  ],
  [
    "electronics",
    "Electronics & Embedded Systems",
    "Engineering",
    "Connect digital logic, sensors, microcontrollers, and embedded software.",
    [
      [
        "Analog & digital signals",
        "Analog signals vary continuously while digital systems use discrete representations. Sampling rate and resolution affect what a digital measurement can preserve.",
      ],
      [
        "Logic & microcontrollers",
        "Logic gates combine binary inputs into outputs. A microcontroller executes instructions while peripherals handle timing, communication, and input/output.",
      ],
      [
        "Sensors & communication",
        "Match sensor output ranges to the input circuitry and conversion method. Communication interfaces require agreement on timing, voltage levels, and message format.",
      ],
      [
        "Embedded design & debugging",
        "Break embedded behavior into states and transitions. Test boundary conditions, power interruptions, and timing assumptions using observable diagnostic signals.",
      ],
    ],
  ],
  [
    "sustainability",
    "Sustainability & Environmental Management",
    "Environment",
    "Explore resource use, waste, and environmental measurement.",
    [
      [
        "Systems & life cycles",
        "Consider impacts across the full life of a product or service. Improving one stage can shift burdens elsewhere, so define the system boundary explicitly.",
      ],
      [
        "Resource efficiency",
        "Measure energy, water, and material use per relevant unit of output. Distinguish absolute reductions from improvements caused only by changing production volume.",
      ],
      [
        "Waste & circular design",
        "Preventing waste can be more effective than treating it after creation. Evaluate repair, reuse, and recovery in terms of practical collection and processing systems.",
      ],
      [
        "Measurement & reporting",
        "Document data sources, boundaries, and uncertainty for environmental indicators. Compare like-for-like periods and avoid broad claims unsupported by measured evidence.",
      ],
    ],
  ],
  [
    "data-analysis",
    "Data Analysis & Spreadsheets",
    "Data",
    "Clean datasets, use formulas, and communicate results with charts.",
    [
      [
        "Tables & data types",
        "Store one observation per row and one variable per column. Consistent dates, numbers, and identifiers make filtering and calculations reliable.",
      ],
      [
        "Formulas & summaries",
        "Understand relative and absolute references before copying formulas. Use conditional summaries and lookups with explicit handling for missing matches.",
      ],
      [
        "Cleaning & visualization",
        "Check duplicates, blanks, and outliers before charting. Choose axes and units that accurately represent the comparison.",
      ],
      [
        "Reproducible analysis",
        "Keep source data separate from transformed data and document each step. Validate totals and test boundary cases before sharing conclusions.",
      ],
    ],
  ],
  [
    "web-foundations",
    "Web Development Foundations",
    "Technology",
    "Build accessible page structures, layouts, and interactive interfaces.",
    [
      [
        "Semantic HTML",
        "Use elements that describe the meaning of content. Labels, headings, and sensible document order help people and assistive technologies navigate a page.",
      ],
      [
        "Responsive CSS",
        "Use layout systems such as Flexbox and Grid to manage alignment. Test long text, narrow screens, and content growth rather than relying on one fixed size.",
      ],
      [
        "JavaScript & events",
        "Represent interface state explicitly and update the rendered output when it changes. Event handlers should validate input and handle failed asynchronous work.",
      ],
      [
        "Testing & delivery",
        "Test the main user tasks, keyboard use, and error states. Check network and asset behavior in a production build as well as during development.",
      ],
    ],
  ],
];
const levels = ["very-beginner", "beginner", "intermediate", "advanced"];
const levelNames = ["Very Beginner", "Beginner", "Intermediate", "Advanced"];
/** @type {import("./learning-tracks").LearningTrack[]} */
export const starterLearningTracks = definitions.map(
  ([slug, title, category, description, modules]) => ({
    id: "starter-" + slug,
    owner_id: "",
    publisher_name: "Origin Point practice catalog",
    title,
    category,
    description,
    status: "Published",
    totalModules: modules.length,
    modules: modules.map(([title, studyNotes], index) => ({
      id: "m" + (index + 1),
      moduleNumber: index + 1,
      title,
      description: studyNotes,
      level: levels[index],
      levelName: levelNames[index],
      subTopics: [{ id: "st" + (index + 1), title, duration: "15–20 min" }],
    })),
    resources: [],
  }),
);
export function getStarterLearningTrack(id) {
  return starterLearningTracks.find((course) => course.id === id) ?? null;
}
