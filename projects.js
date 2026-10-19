// All project content lives here. The grid cards and the full-screen project pages are both
// built from this list, so adding a project means adding one entry.
//
// Fields:
//   slug          used in the URL (#/slug)
//   featured      shown as a large card at the top
//   summary       short text for the card
//   metrics       headline numbers, shown on the project page (and featured cards)
//   sections      the write-up on the project page; body is HTML
//   media         images, first one is the card thumbnail. fit: "contain" shows the whole
//                 image (for charts) on a background colour instead of cropping it
//   cover         text tile used instead of an image
//   architecture  pipeline diagram: a list of stages, each a list of nodes
//   repo          "owner/name" on GitHub, used for the live repo panel
//   links         extra buttons on the project page

const PROJECTS = [
  {
    slug: "lob",
    title: "LOB Research Platform",
    label: "C++ · Quant research",
    featured: true,
    summary:
      "A C++20 limit order book engine that replays real NASDAQ market data at 28M messages a second, with Python bindings, a backtester and a machine-learning order-flow signal.",
    metrics: [
      { value: "28M/s", label: "messages replayed, one core" },
      { value: "160 ns", label: "p99 add-order latency, from 311 ns" },
      { value: "175M", label: "messages rebuilt, zero errors" },
      { value: "134", label: "tests in CI, incl. sanitizers" },
    ],
    sections: [
      {
        heading: "The question",
        body:
          "<p>Can the order book predict where the price goes in the next few seconds, and can that prediction be traded at a profit once you pay the spread and fees? Answering that honestly needs an exact rebuild of the exchange's order book from raw messages, fast enough to replay whole trading days.</p>",
      },
      {
        heading: "What I built",
        body:
          "<p>A C++20 engine that parses NASDAQ TotalView-ITCH 5.0, rebuilds every stock's order book and includes a matching engine. Zero-copy pybind11 bindings expose it to Python, where an event-driven backtester and the research pipeline live.</p>" +
          "<p>I optimised it one measured step at a time. Cache-friendly data structures and a preallocated order pool cut p99 add-order latency from 311 ns to 160 ns and made replay 2.5× faster than the first version. 134 tests (91 C++, 43 Python) run in CI, including under AddressSanitizer and UndefinedBehaviorSanitizer.</p>",
      },
      {
        heading: "What I found",
        body:
          "<p>A LightGBM model, validated walk-forward on four days and tested once on an untouched fifth, beats every baseline at predicting the next price move. But it is most confident exactly when the spread is widest, and even when restricted to tight spreads its edge is smaller than the cost of trading: <strong>+$874 before costs becomes −$10,806 after</strong>.</p>",
      },
    ],
    architecture: [
      [{ name: "ITCH file", note: "raw NASDAQ feed" }],
      [{ name: "Parser", kind: "cpp" }],
      [{ name: "Order books", kind: "cpp" }, { name: "Matching engine", kind: "cpp" }],
      [{ name: "Replayer", kind: "cpp" }],
      [{ name: "lobpy", note: "pybind11, zero-copy", kind: "py" }],
      [{ name: "Backtester", kind: "py" }, { name: "ML research", kind: "py" }],
    ],
    tags: ["C++20", "Python", "pybind11", "LightGBM", "CMake", "GitHub Actions"],
    media: [
      {
        src: "images/LobOrderBook.png",
        alt: "SPY best bid and ask over ten minutes, rebuilt from raw NASDAQ messages, with trades marked",
        caption: "SPY's best bid and ask over ten minutes, rebuilt from raw exchange messages, with every trade marked.",
        fit: "contain",
        bg: "#fcfcfb",
      },
      {
        src: "images/LobLatency.png",
        alt: "Histogram of book update latency before and after optimisation",
        caption: "Every book update of a real trading day, timed individually. The optimised engine is about twice as fast across the whole distribution.",
        fit: "contain",
        bg: "#fcfcfb",
      },
      {
        src: "images/LobAccuracy.png",
        alt: "Balanced accuracy of three models at 1, 5 and 30 second horizons",
        caption: "On a day never used in development, LightGBM beats guessing at every horizon and is best at 5 seconds.",
        fit: "contain",
        bg: "#fcfcfb",
      },
      {
        src: "images/LobPnl.png",
        alt: "Cumulative PnL before and after trading costs over the holdout day",
        caption: "The predictions make money before costs, but crossing the spread costs far more.",
        fit: "contain",
        bg: "#fcfcfb",
      },
    ],
    repo: "MaxS140M/lob-research-platform",
    links: [
      {
        text: "Research report",
        href: "https://github.com/MaxS140M/lob-research-platform/blob/main/docs/research-report.md",
      },
    ],
  },

  {
    slug: "uk-renting-rag",
    title: "UK Renting Guidance Assistant",
    label: "AI · RAG",
    featured: true,
    summary:
      "A question-answering assistant for renting in England that answers only from official GOV.UK guidance, cites its sources, and says so when the guidance doesn't cover a question.",
    metrics: [
      { value: "83%", label: "Recall@5 on held-out questions" },
      { value: "94%", label: "faithfulness on held-out questions" },
      { value: "100%", label: "refusal accuracy" },
      { value: "47", label: "GOV.UK pages indexed" },
    ],
    sections: [
      {
        heading: "The problem",
        body:
          "<p>Renting guidance in England is spread across dozens of GOV.UK pages, and a general chatbot will confidently make up an answer. I wanted an assistant that answers only from the official guidance, cites it, and refuses when the guidance doesn't cover the question.</p>",
      },
      {
        heading: "What I built",
        body:
          "<p>Hybrid retrieval: dense BGE embeddings in FAISS find passages with the same meaning, while BM25 catches exact terms like “section 21” or “Form 4A”. Reciprocal Rank Fusion merges the two lists by rank, a cross-encoder reranks the top 20, and Claude Haiku 4.5 answers only from the top 5 numbered passages.</p>" +
          "<p>The user's question is kept in its own tagged block as a defence against prompt injection. It's served by FastAPI with a Gradio demo, a per-IP rate limit and a daily cap on LLM calls.</p>",
      },
      {
        heading: "What I found",
        body:
          "<p>Evaluated on 110 development questions and, once, on 20 held-out ones. The final setup improves on a dense-only baseline by about 4 points on Recall@5 and correctness, though neither 95% interval excludes zero. It never answers a question it should refuse; its main weakness is declining about 15% of questions the guidance does answer.</p>",
      },
    ],
    architecture: [
      [{ name: "Question" }],
      [{ name: "Dense search", note: "BGE + FAISS" }, { name: "BM25 search" }],
      [{ name: "Rank fusion", note: "RRF" }],
      [{ name: "Reranker", note: "cross-encoder" }],
      [{ name: "Claude Haiku 4.5", note: "top 5 passages" }],
      [{ name: "Cited answer", note: "or refusal" }],
    ],
    tags: ["Python", "FAISS", "rank-bm25", "Claude API", "FastAPI", "pytest"],
    media: [
      {
        src: "images/demo.gif",
        alt: "Demo of the UK Renting Guidance Assistant answering a question",
        caption: "Asking the assistant about deposits.",
      },
    ],
    repo: "MaxS140M/UK-renting-rag",
  },

  {
    slug: "nuh-tickets",
    title: "AI Ticket Tokenisation",
    label: "AI · Group project",
    featured: true,
    summary:
      "Automates routine service desk requests for an NHS trust while flagging higher-priority issues for human support. I built the backend chatbot.",
    metrics: [
      { value: "~150k", label: "service desk tickets a year" },
      { value: "NHS", label: "client, with an industry supervisor" },
    ],
    sections: [
      {
        heading: "The problem",
        body:
          "<p>A group project for Nottingham University Hospitals NHS Trust, whose IT service desk handles around 150,000 tickets a year. The aim was to find which requests could be automated or handled through self-service, and build a tool that does it.</p>",
      },
      {
        heading: "What I built",
        body:
          "<p>I built the backend: a Rasa chatbot that processes user requests and handles ticket creation and prioritisation, automating routine requests while flagging higher-priority issues for human support.</p>",
      },
      {
        heading: "The rest of the system",
        body:
          "<p>The team built a React and TypeScript front end and an analytics dashboard, with a Flask API connecting them to a SQLite ticket database.</p>",
      },
    ],
    tags: ["Python", "scikit-learn", "NLP", "Rasa", "Flask"],
    media: [
      {
        src: "images/NUH1.png",
        alt: "Rasa chatbot classifying a service desk ticket",
        caption: "The chatbot classifying a service desk request.",
        fit: "contain",
        bg: "#ffffff",
      },
      {
        src: "images/Nuh2.png",
        alt: "NUH ticket analysis dashboard with resolution methods, categories and priorities",
        caption: "The team's ticket analysis dashboard.",
        fit: "contain",
        bg: "#e6e6e6",
      },
    ],
    repo: "MaxS140M/NUH-Ticket-Awakens",
  },

  {
    slug: "wine-quality",
    title: "Wine Quality Prediction",
    label: "Machine learning",
    summary:
      "Regression model predicting wine quality, with feature-importance analysis comparing MSE, MAE and R² before and after removing features.",
    sections: [
      {
        heading: "Overview",
        body:
          "<p>A regression model that predicts wine quality. I used feature-importance analysis to decide which features to drop, then compared MSE, MAE and R² before and after removing them.</p>",
      },
    ],
    tags: ["Python", "scikit-learn", "Jupyter"],
    media: [
      {
        src: "images/WinePredict.png",
        alt: "Regression metrics for the wine quality model",
        fit: "contain",
        bg: "#ffffff",
      },
    ],
  },

  {
    slug: "tower-defence",
    title: "Tower Defence Game",
    label: "Game · C++",
    summary:
      "Enemy pathing and a wave system with spawners, scaling difficulty and win/lose states, built on clean state management.",
    sections: [
      {
        heading: "Overview",
        body:
          "<p>A tower defence game written in C++ with SDL2. Enemies follow a path while a wave system with spawners scales the difficulty, and the game moves between win and lose states through a clean state-management layer.</p>" +
          "<p>A Windows build is in the repo: download it and run <code>Towerdefence.exe</code>.</p>",
      },
    ],
    tags: ["C++", "SDL2"],
    media: [
      {
        src: "images/TowerDefence.png",
        alt: "Tower Defence game showing towers along an enemy path",
      },
    ],
    repo: "MaxS140M/Tower_Defence",
  },

  {
    slug: "cyborg-platformer",
    title: "Cyborg Platform Game",
    label: "Game · Java",
    summary:
      "Refactored the UI layer from Swing to JavaFX with MVC separation, then added unit tests and documentation to improve maintainability.",
    sections: [
      {
        heading: "Overview",
        body:
          "<p>A platform game whose UI layer I refactored. I moved it from Swing to JavaFX and separated it into model, view and controller, then added JUnit tests and documentation so it was easier to maintain and extend.</p>",
      },
    ],
    tags: ["Java", "JavaFX", "MVC", "JUnit"],
    media: [
      {
        src: "images/CyborgPlatfrom.png",
        alt: "Cyborg platform game level",
      },
    ],
  },

  {
    slug: "gym-social",
    title: "Gym Social Web UI",
    label: "Web",
    summary:
      "A working, responsive front end for a social media platform for gym-goers, with interactive features.",
    sections: [
      {
        heading: "Overview",
        body:
          "<p>A minimal social fitness web app inspired by Instagram and Twitter: a gym-focused network where users post workouts, progress photos, routines and tips. It's a working, responsive front end with interactive features.</p>",
      },
    ],
    tags: ["HTML", "CSS", "JavaScript"],
    media: [
      {
        src: "images/GymSocail.png",
        alt: "Gym Social web interface",
      },
    ],
  },

  {
    slug: "car-retailer",
    title: "Car Retailer Web App",
    label: "Web",
    summary:
      "Responsive web app backed by Supabase for browsing and filtering cars, with cross-browser testing using Lighthouse and Playwright.",
    sections: [
      {
        heading: "Overview",
        body:
          "<p>A responsive web app for browsing and filtering cars, backed by a Supabase database. I tested it across browsers using Lighthouse and Playwright.</p>",
      },
    ],
    tags: ["JavaScript", "Supabase", "Playwright"],
    cover: "<car-retailer />",
  },

  {
    slug: "os-simulator",
    title: "Operating System Simulator",
    label: "Systems · C",
    summary:
      "Simulates an operating system's scheduler, managing processes and threads with round-robin scheduling and priority boosting.",
    sections: [
      {
        heading: "Overview",
        body:
          "<p>A simulated operating system that manages processes and threads, scheduling them with round-robin and priority boosting.</p>",
      },
      {
        heading: "What's in it",
        body:
          "<ul><li>A logger, plus non-blocking, blocking and priority queues</li><li>Threads, process ID management, and running processes until they finish</li><li>Handling processes and jobs that block</li><li>Priority boosting so low-priority work isn't starved</li></ul>",
      },
    ],
    tags: ["C", "Concurrency"],
    cover: "$ ./os-sim --round-robin",
    repo: "MaxS140M/Operating-System-Simulator",
  },
];
