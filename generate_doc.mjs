import {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    Table, TableRow, TableCell, WidthType, BorderStyle,
    AlignmentType, ShadingType, convertInchesToTwip,
    TableLayoutType, PageBreak,
} from 'docx';
import fs from 'fs';

// ─────────────────────────────────────────────────────────────
//  COLOUR PALETTE
// ─────────────────────────────────────────────────────────────
const C = {
    navy:      '1E3A5F',
    teal:      '0D7377',
    tealDark:  '0A5C60',
    tealLight: '134E4A',
    amber:     'B45309',
    amberLight:'FEF3C7',
    green:     '166534',
    greenLight:'F0FDF4',
    red:       'B91C1C',
    redLight:  'FEF2F2',
    white:     'FFFFFF',
    slate50:   'F8FAFC',
    slate100:  'F1F5F9',
    slate200:  'E2E8F0',
    slate400:  '94A3B8',
    slate600:  '475569',
    slate700:  '334155',
    slate900:  '0F172A',
    headerBg:  '1E293B',
    rowEven:   'EFF6FF',
    rowOdd:    'FFFFFF',
    codeBack:  'F1F5F9',
    noteBack:  'FFFBEB',
};

// ─────────────────────────────────────────────────────────────
//  BASE HELPERS
// ─────────────────────────────────────────────────────────────
const run  = (text, opts = {}) => new TextRun({ text, font: 'Calibri', size: 20, color: C.slate900, ...opts });
const brun = (text, opts = {}) => run(text, { bold: true, ...opts });
const mrun = (text, opts = {}) => new TextRun({ text, font: 'Courier New', size: 18, color: C.tealDark, bold: true, ...opts });
const gap  = (before = 0, after = 120) => ({ spacing: { before, after } });

// ─────────────────────────────────────────────────────────────
//  HEADINGS
// ─────────────────────────────────────────────────────────────
const h1 = text => new Paragraph({
    ...gap(560, 200),
    children: [new TextRun({ text, font: 'Calibri', bold: true, size: 56, color: C.navy })],
});
const h2 = text => new Paragraph({
    ...gap(400, 160),
    children: [new TextRun({ text, font: 'Calibri', bold: true, size: 40, color: C.teal })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.teal } },
});
const h3 = text => new Paragraph({
    ...gap(300, 120),
    children: [new TextRun({ text, font: 'Calibri', bold: true, size: 30, color: C.navy })],
});
const h4 = text => new Paragraph({
    ...gap(200, 80),
    children: [new TextRun({ text, font: 'Calibri', bold: true, size: 24, color: C.tealDark })],
});
const h5 = text => new Paragraph({
    ...gap(160, 60),
    children: [new TextRun({ text, font: 'Calibri', bold: true, size: 22, color: C.slate700 })],
});

// ─────────────────────────────────────────────────────────────
//  PARAGRAPHS & TEXT BLOCKS
// ─────────────────────────────────────────────────────────────
const para = (children, opts = {}) => new Paragraph({
    ...gap(40, 120),
    children: Array.isArray(children) ? children : [run(children)],
    ...opts,
});

const bullet = (text, level = 0) => new Paragraph({
    bullet: { level },
    ...gap(30, 60),
    children: [run(text, { color: C.slate700 })],
});

const numbered = (text, opts = {}) => new Paragraph({
    numbering: { reference: 'default-numbering', level: 0 },
    ...gap(30, 60),
    children: [run(text, { color: C.slate700 })],
    ...opts,
});

// ─────────────────────────────────────────────────────────────
//  CODE BLOCKS
// ─────────────────────────────────────────────────────────────
const code = text => new Paragraph({
    indent: { left: convertInchesToTwip(0.35) },
    ...gap(20, 20),
    shading: { type: ShadingType.SOLID, color: C.codeBack },
    border: {
        left:  { style: BorderStyle.SINGLE, size: 12, color: C.tealLight },
        top:    { style: BorderStyle.NONE   },
        bottom: { style: BorderStyle.NONE   },
        right:  { style: BorderStyle.NONE   },
    },
    children: [mrun(text)],
});

const codeBlock = lines => lines.map(code);

// ─────────────────────────────────────────────────────────────
//  CALL-OUT BOXES (note / tip / warn / important)
// ─────────────────────────────────────────────────────────────
const callout = (emoji, text, borderColor, textColor) => new Paragraph({
    indent: { left: convertInchesToTwip(0.3) },
    ...gap(100, 140),
    shading: { type: ShadingType.SOLID, color: C.noteBack },
    border: { left: { style: BorderStyle.THICK, size: 16, color: borderColor } },
    children: [new TextRun({ text: emoji + '  ' + text, size: 19, color: textColor, italics: true, font: 'Calibri' })],
});

const note      = text => callout('📌', text, C.amber,   C.amber);
const tip       = text => callout('💡', text, C.teal,    C.tealDark);
const important = text => callout('⚠️', text, C.red,     C.red);
const info      = text => callout('ℹ️', text, C.navy,    C.navy);

// ─────────────────────────────────────────────────────────────
//  DIVIDER
// ─────────────────────────────────────────────────────────────
const divider = () => new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.slate200 } },
    ...gap(200, 200),
    children: [],
});

const pgBreak = () => new Paragraph({ children: [new PageBreak()] });

// ─────────────────────────────────────────────────────────────
//  TABLES
// ─────────────────────────────────────────────────────────────
const tCell = (text, opts = {}) => new TableCell({
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    ...opts,
    children: [new Paragraph({
        children: [new TextRun({
            text: String(text),
            font: 'Calibri',
            size: opts.header ? 19 : 18,
            bold: opts.header ? true : false,
            color: opts.header ? C.white : C.slate700,
        })],
    })],
});

const tHeaderRow = cells => new TableRow({
    tableHeader: true,
    children: cells.map(t => new TableCell({
        shading: { type: ShadingType.SOLID, color: C.headerBg },
        margins: { top: 90, bottom: 90, left: 110, right: 110 },
        children: [new Paragraph({
            children: [new TextRun({ text: String(t), font: 'Calibri', size: 19, bold: true, color: C.white })],
        })],
    })),
});

const tBodyRow = (cells, isAlt) => new TableRow({
    children: cells.map(t => new TableCell({
        shading: isAlt ? { type: ShadingType.SOLID, color: C.rowEven } : undefined,
        margins: { top: 70, bottom: 70, left: 110, right: 110 },
        children: [new Paragraph({
            children: [new TextRun({ text: String(t), font: 'Calibri', size: 18, color: C.slate700 })],
        })],
    })),
});

const table = (headers, rows) => new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
        tHeaderRow(headers),
        ...rows.map((r, i) => tBodyRow(r, i % 2 === 1)),
    ],
});

const spacer = (n = 1) => new Paragraph({ ...gap(0, n * 60), children: [] });

// ═════════════════════════════════════════════════════════════
//  DOCUMENT CONTENT — build an array of all block elements
// ═════════════════════════════════════════════════════════════
const blocks = [];

// ─────────────────────────────────────────────────────────────
//  COVER PAGE
// ─────────────────────────────────────────────────────────────
blocks.push(
    new Paragraph({ ...gap(1400, 120), alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SpreadCharts', font: 'Calibri', bold: true, size: 96, color: C.navy })] }),
    new Paragraph({ ...gap(0, 80),    alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Technical Documentation', font: 'Calibri', size: 52, color: C.teal })] }),
    new Paragraph({ ...gap(0, 320),   alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Internal Full-Stack Trading Analytics Platform', font: 'Calibri', size: 28, color: C.slate400, italics: true })] }),
    new Paragraph({ ...gap(0, 60),    alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Author:  Ajit Yadav', font: 'Calibri', size: 24, color: C.slate700 })] }),
    new Paragraph({ ...gap(0, 60),    alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Date:    ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}`, font: 'Calibri', size: 24, color: C.slate700 })] }),
    new Paragraph({ ...gap(0, 60),    alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Version: 1.0', font: 'Calibri', size: 24, color: C.slate700 })] }),
    pgBreak(),
);

// ─────────────────────────────────────────────────────────────
//  SECTION 1 — PROJECT OVERVIEW
// ─────────────────────────────────────────────────────────────
blocks.push(
    h1('Section 1 — Project Overview'),
    h2('1.1  What is SpreadCharts?'),
    para([
        brun('SpreadCharts'), run(' is a private, internal full-stack web application built exclusively for commodity traders at the firm. It is an always-on, dark-mode analytics dashboard that aggregates data from multiple market data sources — US government CFTC reports, ICE Europe exchange reports, proprietary internal market data APIs, and Cocoa warehouse stock Excel files — into a single unified interface that refreshes automatically and keeps historical records in a persistent PostgreSQL database.'),
    ]),
    para('The application is accessible to authorised users anywhere via a secure Cloudflare tunnel, requires JWT-based login, and runs entirely on a local Windows machine managed by PM2 process manager. It is not a cloud-deployed SaaS product — it is a bespoke internal tool.'),
    spacer(),

    h2('1.2  Business Problems Solved'),
    para('Before this system existed, commodity traders had to perform a number of manual, repetitive, and error-prone tasks every week:'),
    bullet('Download the CFTC Disaggregated COT report from cftc.gov every Friday, open it in Excel, and manually update their tracking spreadsheets.'),
    bullet('Download the ICE Europe COT report from ice.com and repeat the same manual update process for London Cocoa, White Sugar, and Robusta Coffee data.'),
    bullet('Manually check Cocoa warehouse stock Excel files on a network share and copy figures into their own dashboards.'),
    bullet('Manually compute week-over-week changes, percentages, and net positions by writing formulas in Excel.'),
    bullet('Monitor rolling correlations between outright futures contracts and their calendar spreads with no alerting system — a correlation breakdown could go unnoticed for days.'),
    bullet('Track All-Time High / All-Time Low positioning events by manually comparing weekly values — no automated detection existed.'),
    para('SpreadCharts replaces all of these manual workflows with fully automated pipelines that:'),
    bullet('Run on a schedule (daily at 08:00 AM for CFTC/ICE, 08:30 AM for warehouse data, 22:00 for historic OI)'),
    bullet('Store all ingested data immutably in PostgreSQL using safe upsert patterns'),
    bullet('Present the data through a clean, interactive dashboard with charts, tables, and drill-down modals'),
    bullet('Send proactive alerts to Microsoft Teams when significant market events occur'),
    spacer(),

    h2('1.3  User Roles & Access'),
    table(
        ['Role', 'Access Level', 'How Created'],
        [
            ['Admin (e.g., Ajit)', 'Full access to all dashboard sections, can see all data, manually trigger syncs', 'Script: server/create_admin_ajit.js — bcrypt hashes password, inserts into users table'],
            ['Trader User (e.g., Sanju)', 'Full read access to all dashboard sections', 'Script: server/add_user_sanju.js — same hash + insert pattern'],
            ['Unauthenticated', 'No access — redirected to /login for any route', 'JWT middleware returns HTTP 401 for all /api/* requests without a valid token'],
        ]
    ),
    spacer(2),
    divider(),
);

// ─────────────────────────────────────────────────────────────
//  SECTION 2 — TECH STACK
// ─────────────────────────────────────────────────────────────
blocks.push(
    h1('Section 2 — Complete Technology Stack'),
    h2('2.1  Frontend Technologies'),
    table(
        ['Technology', 'Version', 'Exact Role in This Project'],
        [
            ['React', '19.2', 'Core UI library. All components are function components using hooks (useState, useEffect, useCallback, useMemo, useRef). No class components used anywhere.'],
            ['Redux Toolkit (RTK)', '2.11', 'Global state manager. Four slices: auth (JWT token + user), ui (active section, sidebar), chartData (OHLC arrays, instrument), ws (WebSocket status). RTK uses Immer internally so reducers can "mutate" state directly.'],
            ['React Router DOM', '7.13', 'Client-side routing. Two routes: "/" protected by ProtectedRoute HOC that checks auth.token in Redux; "/login" is public. All non-API server routes return index.html enabling React Router to take over.'],
            ['Recharts', '3.8', 'Used exclusively for the dual-axis ComposedChart in CFTC and ICE chart modals — amber monotone line for absolute OI values (left Y-axis) + coloured bar chart for weekly change (right Y-axis). Custom tooltip implemented.'],
            ['Lightweight Charts', '5.1', 'TradingView\'s charting library. Used for OHLC candlestick charts in the CFTC and ICE Charting sections. Supports high-performance rendering of large time series without degradation.'],
            ['Vite', '7.3', 'Build tool and dev server. Configured with @vitejs/plugin-react. Production build output goes to dist/ — a single index.html + hashed JS/CSS assets. build takes ~2s.'],
            ['Vanilla CSS', '—', 'All styling is hand-written CSS. No Tailwind, no Bootstrap. Dark-mode (#0f172a background) design system with custom CSS animations (pulse, spin). Scrollbars styled with ::-webkit-scrollbar.'],
            ['Inter / Calibri', '—', 'Inter loaded from Google Fonts for dashboard UI. Courier New used for code/monospace elements. Calibri used in the Word documentation.'],
        ]
    ),
    spacer(2),

    h2('2.2  Backend Technologies'),
    table(
        ['Technology', 'Version', 'Exact Role in This Project'],
        [
            ['Node.js', 'LTS (22.x)', 'JavaScript runtime for the server. Runs Express, all cron jobs, file watchers, and service functions within the same process. Uses ES Modules ("type": "module" in package.json).'],
            ['Express.js', '5.2', 'HTTP server. Handles REST API routes under /api/*, serves React static files from dist/, and applies JWT middleware to all protected endpoints. Uses the new Express 5 wildcard syntax app.get("/{*splat}").'],
            ['node-cron', '4.2', 'Cron-style task scheduler that runs inside the Node.js process. Uses standard 5-field cron syntax. Four scheduled tasks registered at server startup. Timezone is local machine time.'],
            ['Axios', '1.13', 'Promise-based HTTP client. Used by cftcUpdater, iceUpdater, rhoAlertService, historicOiUpdater, and openingVariationService to fetch external data. Configured with 30-second timeout and retry logic for 429 rate limits.'],
            ['csv-parse', '6.1', 'Robust CSV parser. Used in synchronous mode (parse/sync) for CFTC and ICE files. Configured with relax_column_count: true to handle rows that may have fewer columns than expected.'],
            ['xlsx', '0.18 (devDependency)', 'Excel file reader/writer. Used by all four Cocoa warehouse sync services to open .xlsx files from the OneDrive network share and convert sheets to JavaScript arrays using sheet_to_json().'],
            ['Chokidar', '5.0', 'Cross-platform file system watcher. Watches the OneDrive-mapped directory for changes to Excel files. Fires the corresponding sync service when a watched file is modified. Has a stabilityThreshold setting to wait for file writes to complete before firing.'],
            ['dotenv', '17.3', 'Loads environment variables from server/.env into process.env at startup. Called as dotenv.config({ path: \'./server/.env\' }) in both index.js and db.js.'],
            ['Tesseract.js', '7.0', 'WebAssembly-based OCR engine. Used in cocoaRatiosOcrSync.js to extract numeric product ratio values from screenshot images when no structured data feed is available.'],
            ['docx', '(devDependency)', 'Word document generator library. Used to create this documentation file programmatically with full formatting, tables, and styles.'],
        ]
    ),
    spacer(2),

    h2('2.3  Authentication & Security Libraries'),
    table(
        ['Library', 'Version', 'How Used'],
        [
            ['jsonwebtoken', '9.0', 'jwt.sign() creates tokens on login with HS256 algorithm and 24h expiry. jwt.verify() validates tokens in the authenticateToken middleware on every protected request. Secret key from JWT_SECRET env variable.'],
            ['bcryptjs', '3.0', 'bcrypt.hash(password, 10) hashes new passwords with 10 salt rounds (~100ms cost). bcrypt.compare(submitted, stored_hash) safely validates login attempts. Runs asynchronously to avoid blocking the event loop.'],
        ]
    ),
    spacer(2),

    h2('2.4  Database'),
    table(
        ['Component', 'Detail'],
        [
            ['Database Engine', 'PostgreSQL — industry-standard open-source relational database'],
            ['Hosting', 'Neon Serverless PostgreSQL — cloud-hosted, connects via a standard connection string over TLS'],
            ['Node.js Driver', 'pg (node-postgres) v8.18 — the official PostgreSQL client for Node.js'],
            ['Connection Management', 'pg.Pool singleton in server/db.js — pools up to 10 simultaneous connections, auto-reconnects on idle client errors'],
            ['Query Style', 'Parameterised queries throughout ($1, $2...) — prevents SQL injection completely'],
            ['Type Override', 'types.setTypeParser(1082, val => val) — returns DATE as string not JS Date to prevent timezone shift bugs'],
        ]
    ),
    spacer(2),

    h2('2.5  Infrastructure & DevOps'),
    table(
        ['Tool', 'Version / Type', 'Role'],
        [
            ['PM2', 'Process Manager v5', 'Manages all Node.js processes. Auto-restarts crashed processes. pm2 save persists process list. pm2 resurrect restores all processes after machine reboot. pm2 logs streams live logs per process.'],
            ['Cloudflare Tunnel (cloudflared)', 'v2026.5.0', 'Creates an outbound-only encrypted tunnel from localhost:3002 to Cloudflare\'s edge network. No inbound firewall rules or port-forwarding needed. Generates a temporary *.trycloudflare.com URL (or a fixed domain for named tunnels).'],
            ['Microsoft OneDrive', 'Windows client', 'Acts as the data transport for Cocoa warehouse Excel files. Files are edited on users\' machines and synced to the network share, which is watched by Chokidar.'],
            ['Windows Task Scheduler', '—', 'A StartPM2.bat script in the Windows Startup folder calls pm2 resurrect on user login, restoring all processes automatically after reboots.'],
            ['ESLint', '9.39', 'Lints JavaScript and JSX files. Configured with eslint-plugin-react-hooks to catch hooks rule violations. Run with npm run lint.'],
        ]
    ),
    spacer(2),

    h2('2.6  External APIs & Data Sources'),
    table(
        ['Source', 'URL / Endpoint', 'Data Provided', 'Frequency'],
        [
            ['CFTC Disaggregated COT', 'cftc.gov/dea/newcot/f_disagg.txt', '188-column raw CSV covering all reported commodity markets. Positions for Prod Merc, Swap Dealers, Managed Money, Other Rept, Non-Rept groups. All/Old/Other splits.', 'Published weekly (Fridays). Fetched daily at 08:00.'],
            ['ICE COT Historical', 'ice.com/publicdocs/futures/COTHist{YEAR}.csv', 'ICE Europe COT report with header row. London Cocoa, White Sugar, Robusta Coffee. Includes OI, long/short/spread positions, % of OI, number of traders.', 'Published weekly (Fridays). Fetched daily at 08:00.'],
            ['Internal QH OHLC API', 'qh-api.corp.hertshtengroup.com/api/v2/ohlc/', 'Daily OHLC (open, high, low, close) and volume for any listed instrument by code. Used for correlations, historic OI, and opening variation.', 'Real-time. Queried on demand by scheduled services.'],
            ['Microsoft Teams Webhook', 'Incoming webhook URL from .env', 'Receives POST requests with JSON Adaptive Card payloads. Displays formatted alert cards in the designated Teams channel.', 'Triggered after alert conditions detected.'],
        ]
    ),
    spacer(2),
    divider(),
);

// ─────────────────────────────────────────────────────────────
//  SECTION 3 — ARCHITECTURE
// ─────────────────────────────────────────────────────────────
blocks.push(
    h1('Section 3 — System Architecture'),
    h2('3.1  High-Level Architecture'),
    para('SpreadCharts follows a monolithic architecture — all server-side concerns (API, static file serving, background jobs, file watching) run in a single Node.js process managed by PM2. This is appropriate for an internal tool used by a small team, where operational simplicity outweighs the scaling benefits of microservices.'),
    spacer(),

    h3('Request Flow'),
    ...codeBlock([
        'Browser (React SPA)',
        '   │',
        '   │  HTTPS request',
        '   ▼',
        'Cloudflare Edge (*.trycloudflare.com)',
        '   │',
        '   │  Encrypted tunnel (QUIC protocol)',
        '   ▼',
        'localhost:3002 — Express.js Server',
        '   │',
        '   ├─ /api/auth/*   ── No middleware ──► authRoutes.js',
        '   │                                      (login, register)',
        '   │',
        '   ├─ /api/*        ── authenticateToken ──► routes.js',
        '   │                   (JWT verify)           (data handlers)',
        '   │                                          │',
        '   │                                          ▼',
        '   │                                     PostgreSQL (Neon)',
        '   │',
        '   └─ /* (catch-all) ─────────────────► dist/index.html',
        '                                         (React SPA)',
    ]),
    spacer(2),

    h2('3.2  Backend Process Architecture'),
    para('The single backend process contains three concurrent execution contexts:'),
    h4('A) HTTP Request Handler (Express)'),
    para('Express handles incoming HTTP requests synchronously within Node.js\'s event loop. Route handlers are async functions that await database queries and return JSON responses. The server binds to 0.0.0.0 (all interfaces) so the Cloudflare tunnel can reach it.'),
    h4('B) Scheduled Background Jobs (node-cron)'),
    table(
        ['Cron Expression', 'Time (Local)', 'What Runs'],
        [
            ['0 8 * * *',   '08:00 AM daily',      '① Download & insert CFTC CSV  ② If new records found → CFTC alert check  ③ Download & insert ICE CSV'],
            ['30 8 * * *',  '08:30 AM daily',      'Cocoa warehouse sync fallback: London bags + US bags + Ivory Coast arrivals + London stock by origin'],
            ['5 19 * * 1-5','19:05 Mon–Fri',        'Opening Variation update — fetches settlement and intraday candle data from QH API'],
            ['0 22 * * *',  '22:00 PM daily',      'Historic OI snapshot — fetches contract-level OI from QH API and stores daily snapshot'],
        ]
    ),
    h4('C) File System Watcher (Chokidar)'),
    para('startCocoaFileWatcher() is called once at server startup. It registers persistent watchers on the OneDrive-mapped Excel file paths. When a watched file is modified and stabilises (stabilityThreshold: 2000ms), the corresponding sync service is invoked. This provides immediate reactive updates when a trader saves a warehouse spreadsheet.'),
    spacer(),

    h2('3.3  Data Architecture'),
    ...codeBlock([
        'External Data Sources          Service Layer             Database (PostgreSQL)',
        '══════════════════             ═════════════             ═══════════════════',
        'CFTC.gov ─────────────────►  cftcUpdater.js      ───► cocoa, coffee_c,',
        '                                                         cotton_no_2, sugar_no_11,',
        '                                                         rough_rice, butter_*, milk_*, etc.',
        '',
        'ICE.com ──────────────────►  iceUpdater.js       ───► ice_london_cocoa,',
        '                                                         ice_white_sugar,',
        '                                                         ice_robusta_coffee',
        '',
        'QH API ───────────────────►  historicOiUpdater   ───► historic_oi',
        '           ───────────────►  rhoAlertService      ───► rho_alert_log',
        '           ───────────────►  openingVariationSvc  ───► opening_variation_days,',
        '                                                         ov_settlements, ov_candles',
        '',
        'OneDrive Excel ───────────►  cocoaLondonSync     ───► cocoa_london_bags',
        '              ───────────►  cocoaBagsSync        ───► cocoa_us_bags',
        '              ───────────►  cocoaArrivalsSync    ───► cocoa_ivory_arrivals',
        '              ───────────►  cocoaLondonOriginSync───► cocoa_london_origin_stock',
        '',
        'Teams Webhook ◄─────────── cftcAlertService ◄──────── CFTC tables',
        'Teams Webhook ◄─────────── rhoAlertService  ◄──────── rho_alert_log',
    ]),
    spacer(2),
    divider(),
);

// ─────────────────────────────────────────────────────────────
//  SECTION 4 — AUTHENTICATION
// ─────────────────────────────────────────────────────────────
blocks.push(
    h1('Section 4 — Authentication System (JWT + bcrypt)'),
    h2('4.1  Why Stateless JWT?'),
    para('The authentication system uses JSON Web Tokens (JWT) for stateless authentication. In a session-based system, the server stores session data (usually in Redis or a database) and the client holds only a session ID cookie. In a JWT-based system, the server stores nothing — the token itself contains the identity data and a cryptographic signature that proves it was issued by this server. This means:'),
    bullet('No session store infrastructure required'),
    bullet('Any server instance can independently verify a token without a database lookup'),
    bullet('Tokens work naturally across different domains (useful for the Cloudflare tunnel setup)'),
    bullet('Token expiry is self-contained — no need to clean up expired sessions from a store'),
    spacer(),

    h2('4.2  JWT Structure — Deep Dive'),
    para('A JWT consists of three Base64URL-encoded parts separated by dots. Example:'),
    code('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhaml0IiwiaWF0IjoxNzE5MzA4NDAwLCJleHAiOjE3MTkzOTQ4MDB9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'),
    spacer(),
    h4('Part 1 — Header (Algorithm + Type)'),
    code('{ "alg": "HS256", "typ": "JWT" }'),
    para('HS256 = HMAC with SHA-256. The algorithm used to sign the token. HMAC uses a shared secret key (symmetric) — only our server knows it.'),
    h4('Part 2 — Payload (Claims)'),
    code('{ "id": 1, "username": "ajit", "iat": 1719308400, "exp": 1719394800 }'),
    bullet('id, username — custom claims we add at login time'),
    bullet('iat — "issued at" — Unix timestamp of when the token was created'),
    bullet('exp — "expiry" — Unix timestamp 24 hours after iat. After this, jwt.verify() automatically rejects the token.'),
    h4('Part 3 — Signature'),
    code('HMAC-SHA256( base64url(header) + "." + base64url(payload), JWT_SECRET )'),
    para('If anyone modifies even a single character of the header or payload, the signature check fails and the request is rejected. The payload is NOT encrypted — it is only Base64-encoded and anyone can decode it. Never put sensitive data (passwords, card numbers) in a JWT payload.'),
    important('The JWT payload is readable by the client. It is only tamper-proof, not secret. Do not include sensitive fields in the payload.'),
    spacer(),

    h2('4.3  Complete Login Flow'),
    table(
        ['Step', 'Location', 'What Happens'],
        [
            ['1 — Form submit', 'src/pages/Login.jsx', 'User enters username and password. React state holds the form values.'],
            ['2 — API call', 'src/services/api.js', 'POST /api/auth/login with { username, password } in request body as JSON.'],
            ['3 — User lookup', 'server/authRoutes.js:30', 'SELECT * FROM users WHERE username = $1 — parameterised query prevents SQL injection. If no row found → 401.'],
            ['4 — Password check', 'server/authRoutes.js:38', 'bcrypt.compare(req.body.password, user.password_hash). bcrypt internally extracts the salt from the stored hash and re-hashes the submitted password to compare. If no match → 401.'],
            ['5 — Token creation', 'server/authRoutes.js:44', 'jwt.sign({ id, username }, SECRET_KEY, { expiresIn: "24h" }). Returns a signed JWT string.'],
            ['6 — Response', 'server/authRoutes.js:46', '{ success: true, token: "eyJ...", user: { id, username } } returned as JSON.'],
            ['7 — Token storage', 'src/features/auth/authSlice.js', 'Redux dispatch(setCredentials({ token, user })). Token also written to localStorage for persistence across page refreshes.'],
            ['8 — Route redirect', 'src/pages/Login.jsx', 'React Router navigates to "/" — the ProtectedRoute renders AppShell (dashboard).'],
            ['9 — Subsequent requests', 'src/services/api.js', 'Every fetch call includes Authorization: Bearer <token> header from localStorage.'],
            ['10 — Token verification', 'server/authRoutes.js:59–69', 'authenticateToken middleware: reads Authorization header → splits Bearer prefix → calls jwt.verify(token, SECRET_KEY). If valid: attaches decoded user to req.user and calls next(). If invalid/expired: returns 403.'],
            ['11 — Auto logout on error', 'src/services/api.js:13', 'handleAuthError() fires on 401/403: removes token from localStorage, dispatches Redux logout action, window.location.href = "/" (redirect to login).'],
        ]
    ),
    spacer(2),

    h2('4.4  Password Hashing — bcrypt Deep Dive'),
    para('When a new user is created (via register endpoint or admin script):'),
    code('const hashedPassword = await bcrypt.hash(password, 10);'),
    code('// Store hashedPassword in users.password_hash column'),
    para('The resulting hash looks like: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LQ/ExEU43IG'),
    para('Breaking down the hash format:'),
    bullet('$2b$ — bcrypt version identifier'),
    bullet('$10$ — cost factor (2^10 = 1024 rounds of the Blowfish cipher)'),
    bullet('Next 22 chars — the random salt'),
    bullet('Remaining chars — the hash of salt + password'),
    para('Why 10 rounds? At 10 rounds, a single bcrypt hash takes approximately 100ms on a modern CPU. This is imperceptible to users logging in, but means an attacker can only attempt ~10 passwords per second per CPU thread — making a brute-force attack against even a weak password take years.'),
    tip('bcrypt automatically handles salt generation and storage. The salt is embedded in the hash string itself, so you never need to store or manage it separately.'),
    spacer(2),
    divider(),
);

// ─────────────────────────────────────────────────────────────
//  SECTION 5 — DATABASE DESIGN
// ─────────────────────────────────────────────────────────────
blocks.push(
    h1('Section 5 — Database Design (PostgreSQL)'),
    h2('5.1  Connection & Pool Configuration'),
    ...codeBlock([
        '// server/db.js',
        'import pg from "pg";',
        'const { Pool, types } = pg;',
        '',
        '// CRITICAL: Force DATE columns to return as strings, not JS Date objects',
        '// OID 1082 = PostgreSQL DATE type',
        'types.setTypeParser(1082, (val) => val);',
        '',
        'const pool = new Pool({',
        '    connectionString: process.env.DATABASE_URL,',
        '    // Default pool settings:',
        '    // max: 10 connections',
        '    // idleTimeoutMillis: 10000',
        '    // connectionTimeoutMillis: 0',
        '});',
        '',
        'pool.on("error", (err) => {',
        '    console.error("Unexpected error on idle client", err);',
        '    process.exit(-1);',
        '});',
        '',
        'export default pool;',
    ]),
    para('The pool is a singleton — imported by every service and route file. It maintains up to 10 open database connections and reuses them across requests, avoiding the overhead of establishing a new TCP connection for every query.'),
    spacer(),

    h2('5.2  Why the DATE Type Override Matters'),
    para('PostgreSQL DATE columns store dates without time or timezone. When the pg driver reads a DATE value, it normally creates a JavaScript Date object set to midnight UTC. When this Date is serialised to JSON (e.g., in an API response), it becomes "2026-03-03T00:00:00.000Z". If the server\'s local timezone is UTC+1 (London), the browser receives this and when displayed it shows March 2nd — one day earlier than the actual stored date.'),
    para('The fix: types.setTypeParser(1082, (val) => val) tells the pg driver to return the raw string "2026-03-03" directly — no conversion to a Date object, no timezone shift.'),
    spacer(),

    h2('5.3  CFTC Tables — Column Structure'),
    para('Each of the 11 CFTC tables contains 188 columns. The column structure is identical across all markets and matches the CFTC f_disagg.txt file layout exactly. Key column groups:'),
    table(
        ['Column Group', 'Columns', 'Data Type', 'Example Columns'],
        [
            ['Identifiers', '7', 'TEXT', 'market_and_exchange_names, report_date_as_mm_dd_yyyy, cftc_contract_market_code, futonly_or_combined'],
            ['Open Interest', '3', 'INTEGER', 'open_interest_all, open_interest_old, open_interest_other'],
            ['Positions — All', '12', 'INTEGER', 'prod_merc_positions_long_all, m_money_positions_long_all, swap_positions_spread_all, nonrept_positions_short_all'],
            ['Positions — Old', '12', 'INTEGER', 'Same set but with _old suffix — Old crop season positions'],
            ['Positions — Other', '12', 'INTEGER', 'Same set but with _other suffix — Other crop season positions'],
            ['Change in Positions', '16', 'INTEGER', 'change_in_m_money_long_all, change_in_swap_short_all, etc.'],
            ['Percent of OI', '48', 'NUMERIC(8,2)', 'pct_of_oi_m_money_long_all, pct_of_oi_prod_merc_short_old, etc.'],
            ['Number of Traders', '24', 'INTEGER', 'traders_m_money_long_all, traders_swap_spread_all, etc.'],
            ['Concentration Ratios', '24', 'NUMERIC(8,2)', 'conc_gross_le_4_tdr_long_all, conc_net_le_8_tdr_short_other, etc.'],
        ]
    ),
    spacer(2),

    h2('5.4  All Database Tables'),
    table(
        ['Table Name', 'Category', 'Key Purpose', 'Rows (approx)'],
        [
            ['cocoa',                        'CFTC', 'NY Cocoa weekly COT data from ICE Futures US',         '20+ years × 1 row/week'],
            ['coffee_c',                     'CFTC', 'Arabica Coffee C weekly COT data',                     '20+ years × 1 row/week'],
            ['cotton_no_2',                  'CFTC', 'Cotton No. 2 weekly COT data',                         '20+ years × 1 row/week'],
            ['sugar_no_11',                  'CFTC', 'Raw Sugar No. 11 weekly COT data',                     '20+ years × 1 row/week'],
            ['rough_rice',                   'CFTC', 'Rough Rice CBOT weekly COT data',                      '20+ years × 1 row/week'],
            ['butter_cash_settled',          'CFTC', 'Butter CME weekly COT data',                           '20+ years × 1 row/week'],
            ['milk_class_3',                 'CFTC', 'Class III Milk CME weekly COT data',                   '20+ years × 1 row/week'],
            ['cheese_cash_settled',          'CFTC', 'Cheese CME weekly COT data',                           '20+ years × 1 row/week'],
            ['non_fat_dry_milk',             'CFTC', 'Non-Fat Dry Milk CME weekly COT data',                 '20+ years × 1 row/week'],
            ['cme_milk_4',                   'CFTC', 'CME Milk IV weekly COT data',                          '20+ years × 1 row/week'],
            ['frzn_concentrated_orange_juice','CFTC', 'FCOJ ICE Futures weekly COT data',                    '20+ years × 1 row/week'],
            ['ice_london_cocoa',             'ICE',  'London Cocoa ICE Europe weekly COT',                   '2011–present'],
            ['ice_white_sugar',              'ICE',  'White Sugar ICE Europe weekly COT',                    '2011–present'],
            ['ice_robusta_coffee',           'ICE',  'Robusta Coffee ICE Europe weekly COT',                 '2011–present'],
            ['cocoa_london_bags',            'Cocoa','London exchange cocoa stocks in bags',                  'Daily rows since ~2020'],
            ['cocoa_us_bags',               'Cocoa','US exchange cocoa stocks in bags',                      'Daily rows since ~2020'],
            ['cocoa_us_daily_changes',       'Cocoa','Day-on-day changes in US bag counts',                  'Daily rows'],
            ['cocoa_ivory_arrivals',         'Cocoa','Ivory Coast port arrivals in tonnes',                   'Weekly rows'],
            ['cocoa_london_origin_stock',    'Cocoa','London valid stock by bean origin country',             'Monthly snapshots'],
            ['historic_oi',                 'OI',   'Daily contract-level Open Interest snapshots',          '1 row per contract per day'],
            ['users',                        'Auth', 'Login credentials (username + bcrypt hash)',            '2–10 rows'],
            ['rho_alert_log',               'Alert','Dedup log for Rho Monitor alerts',                      'Growing over time'],
            ['cftc_alert_log',              'Alert','Dedup log for CFTC ATH/ATL alerts',                     'Growing over time'],
            ['opening_variation_days',       'OV',   'Settlement-to-open gap analysis data',                 'Daily rows Mon–Fri'],
            ['ov_settlements',              'OV',   'Settlement prices for OV analysis',                     'Daily rows Mon–Fri'],
            ['ov_candles',                  'OV',   'Intraday OHLC candles for OV analysis',                 'Many rows per day'],
        ]
    ),
    spacer(2),

    h2('5.5  Idempotent Insert Pattern'),
    para('Every data ingestion service — without exception — uses an idempotent insert pattern. This is the most important design principle of the entire data pipeline:'),
    code('INSERT INTO table_name (col1, col2, col3, ...)'),
    code('VALUES ($1, $2, $3, ...)'),
    code('ON CONFLICT (report_date_as_mm_dd_yyyy) DO NOTHING;'),
    para('This SQL clause means: if a row with the same date already exists, the INSERT is silently skipped — no error, no update, no duplicate. Benefits:'),
    bullet('Cron jobs can run multiple times per day safely — only genuinely new rows are inserted'),
    bullet('Manual sync triggers (POST /api/sync-cocoa-bags etc.) can be run at any time without fear'),
    bullet('If the server crashes mid-ingestion and restarts, rerunning the sync picks up where it left off without duplicating rows already processed'),
    bullet('Historical data is never accidentally overwritten or corrupted'),
    important('This "add-only, never overwrite" policy was explicitly required by the user. The database is treated as an append-only log of market history.'),
    spacer(2),
    divider(),
);

// ─────────────────────────────────────────────────────────────
//  SECTION 6 — DATA PIPELINES
// ─────────────────────────────────────────────────────────────
blocks.push(
    h1('Section 6 — Automated Data Pipelines'),
    h2('6.1  CFTC Data Pipeline — Complete Walkthrough'),
    h3('Step 1: HTTP Fetch'),
    code('const response = await axios.get('),
    code('    "https://www.cftc.gov/dea/newcot/f_disagg.txt",'),
    code('    { timeout: 30000 }'),
    code(');'),
    para('The file is fetched with a 30-second timeout. It is a large text file (~15MB) containing every commodity market tracked by the CFTC, with one row per market per week going back years.'),
    h3('Step 2: CSV Parse'),
    code('const records = parse(csvData, {'),
    code('    columns: false,        // no header row — arrays not objects'),
    code('    skip_empty_lines: true,'),
    code('    relax_column_count: true,  // allow rows with fewer columns'),
    code('    trim: true,'),
    code('});'),
    para('relax_column_count is important because the CFTC file occasionally has rows with slightly different column counts due to data entry variations.'),
    h3('Step 3: Market Routing'),
    code('const tableName = MARKET_TO_TABLE[marketName.trim()];'),
    para('The first column of each row contains the full market name string (e.g., "COCOA - ICE FUTURES U.S."). The MARKET_TO_TABLE object maps these strings to table names. Markets not in this map are silently skipped.'),
    h3('Step 4: Row Parsing — parseRow()'),
    para('The parseRow() function iterates through all 188 column positions and type-coerces each value:'),
    bullet('DATE columns: normalizeDate() converts YYMMDD or YYYY-MM-DD formats consistently'),
    bullet('TEXT columns: String trimming, null if empty'),
    bullet('FLOAT columns: Remove commas, parse as float — used for percentage and concentration ratio columns'),
    bullet('INTEGER columns: Remove commas, parse as int — used for position counts'),
    h3('Step 5: Deduplication'),
    code('// Load last 200 existing dates per table into a Set before starting'),
    code('existingDates[table] = new Set(res.rows.map(r => r.report_date_as_mm_dd_yyyy));'),
    code(''),
    code('// Skip if already present'),
    code('if (existingDates[tableName].has(data.report_date_as_mm_dd_yyyy)) { skipped++; continue; }'),
    h3('Step 6: Insert'),
    code('const cols = Object.keys(data);          // up to 188 column names'),
    code('const vals = Object.values(data);         // corresponding values'),
    code('const ph   = cols.map((_,i) => `$${i+1}`).join(", ");  // $1,$2,...,$188'),
    code('await pool.query(`INSERT INTO ${tableName} (${cols.join(",")}) VALUES (${ph})`, vals);'),
    spacer(2),

    h2('6.2  ICE Data Pipeline — Key Differences from CFTC'),
    table(
        ['Aspect', 'CFTC Pipeline', 'ICE Pipeline'],
        [
            ['File format',         'No header row — positional column mapping', 'Has header row — map by column name (toLowerCase)'],
            ['File size',           '~15 MB for all markets',                    'Smaller — only ICE Europe products'],
            ['Row filter',          'Filter by market name string',              'Filter by futonly_or_combined = "FutOnly" AND market name'],
            ['Date column',         'Column index 2',                            'report_date_as_mm_dd_yyyy header column'],
            ['Year handling',       'Single file — all years',                   'Separate file per year (COTHist2026.csv, COTHist2025.csv, etc.)'],
            ['Markets',             '11 US commodity markets',                   '3 ICE Europe products'],
            ['Database tables',     'cocoa, coffee_c, cotton_no_2, etc.',        'ice_london_cocoa, ice_white_sugar, ice_robusta_coffee'],
        ]
    ),
    spacer(2),

    h2('6.3  Cocoa Warehouse Pipeline — Detailed Design'),
    h3('The OneDrive Problem'),
    para('Windows OneDrive uses a complex file synchronisation mechanism. When a user saves a spreadsheet, OneDrive may:'),
    bullet('Create a temporary .tmp file in the same directory before writing the final file'),
    bullet('Trigger multiple filesystem events (add, change, unlink) during a single save'),
    bullet('Delay the final stable write event by several seconds on a slow network connection'),
    bullet('On network-mapped drives, sometimes suppress the change event entirely'),
    para('A naive Chokidar watcher that triggers immediately on any event would read a partially-written or temporary file. We handle this with two mitigations:'),
    bullet('stabilityThreshold: 2000 — Chokidar waits 2 seconds after the last file event before firing, ensuring the file write is complete'),
    bullet('Daily 08:30 AM cron fallback — even if the watcher missed an update, all four warehouse syncs run unconditionally every morning'),
    h3('File Reading — xlsx Library'),
    code('const workbook = xlsx.readFile(filePath);'),
    code('const sheet = workbook.Sheets[sheetName]'),
    code('            || workbook.Sheets[workbook.SheetNames[0]];'),
    code('const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });'),
    code('// header: 1 returns arrays of values, not objects'),
    code('// [["Date","Bags","Origin"], ["2026-06-20", 12400, "Ivory Coast"], ...]'),
    para('Each sync service then iterates rawData, maps columns by their known positions, validates values, and upserts into the corresponding PostgreSQL table.'),
    spacer(2),

    h2('6.4  Rho Monitor — Pearson Rolling Correlation'),
    h3('What is Pearson Correlation?'),
    para('The Pearson correlation coefficient measures the strength and direction of the linear relationship between two variables X and Y:'),
    code('          Σ((x_i - x̄)(y_i - ȳ))'),
    code('r = ──────────────────────────────────'),
    code('     √(Σ(x_i - x̄)²) × √(Σ(y_i - ȳ)²)'),
    para('The result is between -1 and +1. We multiply by 100 to express as a percentage score (-100 to +100). A value of +80 means strong positive correlation — the two series move together closely.'),
    h3('What Are Daily % Returns?'),
    para('We do not correlate price levels directly (which would be co-integrated). We correlate daily percentage returns:'),
    code('return[i] = ((close[i] - close[i-1]) / close[i-1]) × 100'),
    para('This removes the trend component and focuses on day-to-day directional behaviour.'),
    h3('Rolling Window'),
    para('Instead of computing one static correlation over all available history, we compute it on a sliding window of W=15 trading days. For each trading day, we take the 15 most recent returns for both the outright and the spread, compute Pearson correlation, and store it as the rho value for that day. This gives us a time series of correlation — we can see how it evolves.'),
    h3('Alert Logic'),
    table(
        ['Parameter', 'Value', 'Rationale'],
        [
            ['Window W',         '15 days',    '3 trading weeks — long enough to be statistically meaningful, short enough to be sensitive to recent changes'],
            ['Lookback',         '14 days',    'Check if rho was ever >= 80 within the last 14 days (2.5 weeks)'],
            ['Peak threshold',   '>= 80',      'The correlation needs to have been strongly positive for the alert to be meaningful'],
            ['Break threshold',  '<= 50',      'A drop from 80+ to 50 or below is a significant breakdown of the relationship'],
            ['Silence window',   '7 days',     'Prevents re-alerting on the same pair every day if the correlation stays broken'],
            ['API rate limit',   '1.1s sleep', 'The QH API returns 429 (Too Many Requests) if called too rapidly. A 1.1s sleep between calls prevents this.'],
        ]
    ),
    h3('Adaptive Card Chunking'),
    para('Microsoft Teams has a maximum payload size per webhook POST. If 10+ rho breaks are detected simultaneously, a single card may exceed this limit. The service chunks alerts into groups of 25 maximum per card:'),
    code('const maxItemsPerCard = 25;'),
    code('const chunks = [];'),
    code('for (let i = 0; i < masterAlerts.length; i += maxItemsPerCard) {'),
    code('    chunks.push(masterAlerts.slice(i, i + maxItemsPerCard));'),
    code('}'),
    code('// Each chunk becomes one Teams card: "Part 1/3", "Part 2/3", etc.'),
    spacer(2),

    h2('6.5  Historic OI — Expired Contract Fix'),
    h3('The Bug'),
    para('Before the fix, the daily OI change was computed as:'),
    code('daily_change = SUM(all_oi_today) - SUM(all_oi_yesterday)'),
    para('When a contract (e.g., CCK26) expired on May 13th, its OI went from ~50,000 to 0. This 50,000 contract reduction appeared as a massive artificial negative change in the chart even though no actual market selling had occurred — the contract simply matured.'),
    h3('The Fix'),
    para('The route handler now reconciles OI at the contract level:'),
    code('// Build a Map of contract → OI for today and yesterday'),
    code('const todayMap    = new Map(todayRows.map(r => [r.contract, r.oi]));'),
    code('const yesterdayMap = new Map(yesterdayRows.map(r => [r.contract, r.oi]));'),
    code(''),
    code('let delta = 0;'),
    code('for (const [contract, todayOi] of todayMap) {'),
    code('    if (yesterdayMap.has(contract)) {'),
    code('        // Only include contracts present on BOTH days'),
    code('        delta += todayOi - yesterdayMap.get(contract);'),
    code('    }'),
    code('    // New contracts (not in yesterday) are excluded from delta'),
    code('}'),
    code('// Expired contracts (in yesterday but not today) are excluded from delta'),
    spacer(2),
    divider(),
);

// ─────────────────────────────────────────────────────────────
//  SECTION 7 — FRONTEND ARCHITECTURE
// ─────────────────────────────────────────────────────────────
blocks.push(
    h1('Section 7 — Frontend Architecture'),
    h2('7.1  Application Structure'),
    para('The React application is a Single Page Application (SPA). Vite bundles all source files into a single dist/index.html with hashed JS and CSS files. The browser downloads these once and React Router handles all subsequent page transitions client-side without full page reloads.'),
    spacer(),

    h2('7.2  Redux Store — All Four Slices'),
    h3('auth Slice'),
    table(
        ['State Field', 'Type', 'Purpose'],
        [
            ['token', 'string | null', 'The JWT string. Null when logged out. Persisted in localStorage across refreshes.'],
            ['user', '{ id, username } | null', 'Decoded user info stored at login time.'],
            ['isAuthenticated', 'boolean', 'Derived: token !== null. Used by ProtectedRoute.'],
        ]
    ),
    h3('ui Slice'),
    table(
        ['State Field', 'Type', 'Purpose'],
        [
            ['activeSection', 'string', 'ID of the currently visible dashboard section (e.g., "cftc", "ice", "change_in_ice", "cocoa"). Drives AppShell rendering.'],
            ['sidebarCollapsed', 'boolean', 'Whether the left navigation sidebar is minimised.'],
            ['activeTab', 'string | null', 'Active chart tab ID within the CFTC or ICE tab workspaces.'],
        ]
    ),
    h3('chartData Slice'),
    table(
        ['State Field', 'Type', 'Purpose'],
        [
            ['candles', 'Array<{ time, open, high, low, close, volume }>', 'OHLC data arrays for Lightweight Charts rendering.'],
            ['instrument', 'string', 'Active instrument code (e.g., "LCCK26", "CCK26").'],
            ['interval', 'string', '"1D" or "1W" — chart time interval.'],
            ['isLoading', 'boolean', 'Shows loading state while fetching OHLC data.'],
        ]
    ),
    h3('ws Slice'),
    table(
        ['State Field', 'Type', 'Purpose'],
        [
            ['connected', 'boolean', 'Whether the WebSocket connection to the server is active.'],
            ['lastMessage', 'object | null', 'Most recent WebSocket message received.'],
        ]
    ),
    spacer(2),

    h2('7.3  Column Hierarchy System'),
    para('The columnHierarchy.js file is the data model that defines every metric visible in the Change in CFTC and Change in ICE table views. It is a nested 3-level tree:'),
    ...codeBlock([
        'Section (e.g., "Open Interest")',
        '  └─ items[]  — flat list of metric items',
        '       └─ { id, label, isComputed }',
        '',
        'Section (e.g., "Positions")',
        '  └─ subsections[]',
        '       └─ Subsection (e.g., "Positions All")',
        '            └─ groups[]',
        '                 └─ Group (e.g., "Managed Money")',
        '                      └─ items[]',
        '                           └─ { id, label, isComputed }',
    ]),
    h4('Three types of metric items:'),
    table(
        ['Item Type', 'Definition', 'Example', 'How Rendered'],
        [
            ['dbItem', 'Direct database column read', 'open_interest_all → row["open_interest_all"]', 'Reads the column value directly from the API response row'],
            ['computedItem', 'Formula applied to one row', 'Net = Long − Short; OI Old% = (old/all) × 100', 'formula(row) called at render time. No extra API call needed.'],
            ['seriesComputedItem', 'Delta across two consecutive rows', 'WoW Δ of prod_merc_positions_long_old', 'Subtracts previous week\'s value from current week\'s value using baseCol'],
        ]
    ),
    para('The ITEM_MAP is a flat O(1) lookup object built from this hierarchy by flattening all nested items. Every metric row\'s itemId maps to its definition including fullLabel, isComputed, isSeriesComputed, baseCol (for series computed), and formula (for computed).'),
    spacer(2),

    h2('7.4  Chart Modal Architecture — IceChartModal + IceComboChart'),
    h3('Why Two Separate Modals?'),
    para('The original implementation used CftcChartModal for both the CFTC and ICE sections. CftcChartModal internally calls fetchCftcData() which hits /api/cftc-data. When opened from the ICE section with product="LONDON COCOA", the CFTC endpoint was queried but had no row with that market name — causing "Failed to fetch" errors.'),
    para('The fix was to create dedicated IceChartModal and IceComboChart components that call fetchIceData() → /api/ice-data instead. This makes the data source explicit and prevents any ambiguity.'),
    h3('Data Flow Inside the Modal'),
    table(
        ['Stage', 'Component', 'Action'],
        [
            ['Open trigger', 'IceDashboard.jsx', 'User clicks 📊 → setChartModal({ isOpen: true, metricId, label })'],
            ['Fetch', 'IceChartModal.jsx', 'fetchIceData({ market: "LONDON COCOA", limit: 20000 }) called on mount'],
            ['Filter', 'IceChartModal.jsx', 'Filter rows where date >= "2026-01-01"'],
            ['Pass to chart', 'IceChartModal.jsx', 'rawData and metricId passed as props to IceComboChart'],
            ['Compute absolute', 'IceComboChart.jsx', 'For each row: if isSeriesComputed → read baseCol; else → computeMetricValue(metricId, row)'],
            ['Compute weekly Δ', 'IceComboChart.jsx', 'weeklyChange = absoluteVal[i] − absoluteVal[i-1] (first row has null change)'],
            ['Render', 'IceComboChart.jsx', 'Recharts ComposedChart with amber Line (left axis) + coloured Bar (right axis)'],
        ]
    ),
    spacer(2),

    h2('7.5  API Service Layer Details'),
    para('All API calls go through src/services/api.js. This centralisation provides:'),
    bullet('Consistent auth header injection — one place to update if token storage mechanism changes'),
    bullet('Consistent error handling — handleAuthError() called once for any 401/403 in any service function'),
    bullet('Clean separation — components never call fetch() directly'),
    table(
        ['Function', 'Endpoint', 'Parameters', 'Returns'],
        [
            ['fetchCftcData()', '/api/cftc-data', 'market, limit, start_date, end_date, exchange', 'Array of CFTC rows'],
            ['fetchIceData()', '/api/ice-data', 'market, limit, start_date, end_date', 'Array of ICE COT rows'],
            ['fetchIceProducts()', '/api/ice-products', 'none', 'Array of product name strings'],
            ['fetchCocoaBagsData()', '/api/cocoa-bags', 'series, from, to, table', 'Array of bag count rows'],
            ['fetchLondonOriginData()', '/api/cocoa-london-origin', 'ageCategory, metric', 'Array of origin stock rows'],
            ['fetchIvoryArrivalsData()', '/api/cocoa-arrivals/ivory', 'none', 'Array of arrival rows'],
            ['fetchOHLC()', '/api/v2/ohlc', 'instruments[], interval, count, start, end', 'OHLC array or multi-instrument object'],
            ['fetchProducts()', '/api/products', 'none', 'Array of CFTC product names'],
            ['fetchColumns()', '/api/columns', 'none', 'Array of CFTC column names'],
            ['fetchOIScreener()', '/api/oi-screener', 'none', 'OI screener data object'],
        ]
    ),
    spacer(2),
    divider(),
);

// ─────────────────────────────────────────────────────────────
//  SECTION 8 — DASHBOARD SECTIONS
// ─────────────────────────────────────────────────────────────
blocks.push(
    h1('Section 8 — All Dashboard Sections in Detail'),
    table(
        ['Section ID', 'Section Name', 'Component File', 'Data Source'],
        [
            ['cftc',           'CFTC',              'TabBar + TabPanel',               '/api/v2/ohlc (QH API)'],
            ['ice_charts',     'ICE',               'IceTabBar + IceTabPanel',         '/api/v2/ohlc (QH API)'],
            ['ice',            'Change in ICE',     'IceDashboard.jsx',               '/api/ice-data, /api/ice-products'],
            ['cftcweekly',     'Change in CFTC',    'CftcWeeklyDashboard.jsx',        '/api/cftc-data, /api/products'],
            ['sod',            'Seasonal CFTC',     'SodDashboard.jsx',               '/api/cftc-data'],
            ['cocoa',          'Cocoa',             'CocoaDashboard.jsx',             '/api/cocoa-bags, /api/cocoa-arrivals/ivory, /api/cocoa-london-origin'],
            ['oi',             'Daily OI',          'OIDashboard.jsx',                '/api/oi-screener'],
            ['historic_oi',    'Historic OI',       'HistoricOIDashboard.jsx',        '/api/historic-oi'],
            ['rolling_corr',   'Rolling Corr.',     'RollingCorrelationDashboard.jsx','/api/v2/ohlc (QH API)'],
            ['vol_seasonality','Vol. Seasonality',  'VolSeasonalityDashboard.jsx',    '/api/cftc-data'],
        ]
    ),
    spacer(2),

    h2('8.1  Change in CFTC / Change in ICE — Deep Dive'),
    para('These two sections are the most feature-rich views in the application. They share the same visual design and column hierarchy but read from different data sources.'),
    h3('Table View'),
    para('For each metric in the hierarchy (up to ~200 rows when all sections expanded), the dashboard shows:'),
    bullet('COLUMN — metric name with optional "calculated" label for computed items, and a 📊 chart button for plottable series'),
    bullet('LAST WEEK — the value from the penultimate row in the sorted dataset (the previous week\'s report)'),
    bullet('CURRENT WEEK — the value from the most recent row (this week\'s report)'),
    bullet('CHANGE — Current minus Last, displayed as a coloured badge: green (+) or red (−)'),
    h3('Row Types in Rendered Table'),
    table(
        ['Row Type', 'Visual', 'Example'],
        [
            ['Section Header', 'Collapsible teal header bar with ▶/▼ arrow', '▼ OPEN INTEREST'],
            ['Subsection Header', 'Slightly dimmed collapsible bar, indented', '▶ Positions All'],
            ['Group Header', 'Non-collapsible label, indented further', 'MANAGED MONEY'],
            ['Metric Row', 'Data row with Last / Current / Change cells', 'Open Interest All | 231.1k | 212.1k | -9.0k'],
        ]
    ),
    h3('Chart Modal Features'),
    table(
        ['Feature', 'Implementation'],
        [
            ['KPI Card — Latest Value', 'chartData[last].absolute formatted as 194.4k, 2.1M, etc.'],
            ['KPI Card — Weekly Change', 'chartData[last].weeklyChange with + prefix if positive. Green or red colour.'],
            ['KPI Card — Data Points', 'chartData.length + " weeks" — e.g., "19 weeks"'],
            ['Amber Line', 'Recharts Line on yAxisId="left" — absolute value. connectNulls for gapless lines.'],
            ['Green/Red Bars', 'Recharts Bar on yAxisId="right" — weekly change. Each bar coloured individually via Cell component.'],
            ['Reference Line', 'Horizontal dashed line at y=0 on the right axis — visual anchor for direction.'],
            ['Custom Tooltip', 'Shows "Week of YYYY-MM-DD", Weekly Δ with ±, Absolute value.'],
            ['Date Filtering', 'Only rows with date >= "2026-01-01" shown — current calendar year focus.'],
            ['ESC to close', 'keydown event listener added when modal opens, removed when closed.'],
        ]
    ),
    spacer(2),
    divider(),
);

// ─────────────────────────────────────────────────────────────
//  SECTION 9 — DEPLOYMENT
// ─────────────────────────────────────────────────────────────
blocks.push(
    h1('Section 9 — Deployment & Operations'),
    h2('9.1  PM2 Process Management'),
    para('PM2 (Process Manager 2) is an industry-standard Node.js process manager that provides:'),
    bullet('Automatic restart on crash — if the backend crashes due to an unhandled error, PM2 restarts it within seconds'),
    bullet('Process persistence — pm2 save writes the current process list to ~/.pm2/dump.pm2. pm2 resurrect reads this file and restores all processes.'),
    bullet('Log management — pm2 logs [name] streams live stdout/stderr. Logs also written to ~/.pm2/logs/*.log files.'),
    bullet('Zero-downtime reload — pm2 reload backend reloads the process gracefully for hot updates'),
    table(
        ['Command', 'What It Does'],
        [
            ['pm2 status',                    'Show all processes with ID, name, uptime, CPU, memory, restart count, status'],
            ['pm2 restart backend',           'Restart the backend process (picks up new dist/ build)'],
            ['pm2 restart all',               'Restart every registered process'],
            ['pm2 resurrect',                 'Restore all saved processes after machine reboot'],
            ['pm2 logs backend',              'Stream live logs from the backend process'],
            ['pm2 logs backend --lines 200',  'Show last 200 lines of backend logs'],
            ['pm2 save',                      'Persist current process list to dump.pm2'],
            ['pm2 stop backend',              'Stop process without removing from list'],
            ['pm2 delete backend',            'Remove process from PM2 completely'],
        ]
    ),
    spacer(2),

    h2('9.2  Build & Deploy Sequence'),
    ...codeBlock([
        '# Step 1: Make code changes in src/  or  server/',
        '',
        '# Step 2: If frontend changed — build new bundle',
        'npm run build',
        '# → Output: dist/index.html  +  dist/assets/index-[hash].js  +  dist/assets/index-[hash].css',
        '',
        '# Step 3: Restart backend to serve new dist/ files',
        'pm2 restart backend --update-env',
        '# --update-env also picks up any .env changes',
        '',
        '# Step 4: Hard refresh browser',
        '# Ctrl + Shift + R  (Chrome/Edge/Firefox)',
        '# This bypasses the browser cache and loads the new assets',
        '',
        '# If only server/  changed (no frontend changes):',
        'pm2 restart backend  # Skips the npm run build step',
    ]),
    spacer(2),

    h2('9.3  Cloudflare Tunnel'),
    h3('What it Does'),
    para('Cloudflare Tunnel (formerly Argo Tunnel) creates an outbound-only encrypted connection from the local machine to Cloudflare\'s global network. The traffic flow is:'),
    ...codeBlock([
        'User Browser → internet → Cloudflare Edge → encrypted tunnel → cloudflared process → localhost:3002',
    ]),
    para('Because the connection is outbound-only from the machine, no inbound firewall ports need to be opened and no router configuration is required. This is how SpreadCharts is accessible from outside the office network without VPN or port-forwarding.'),
    h3('Temporary vs Named Tunnels'),
    table(
        ['Type', 'URL', 'Pros', 'Cons'],
        [
            ['Quick (temporary)', '*.trycloudflare.com — random, changes every restart', 'Zero configuration, instant', 'URL changes after every restart/crash. Must reshare new URL.'],
            ['Named (permanent)', 'Custom subdomain, e.g., spreadcharts.yourdomain.com', 'Fixed URL, never changes, SSL included', 'Requires Cloudflare account, domain registration, and one-time config.'],
        ]
    ),
    h3('Recovery After PC Restart'),
    ...codeBlock([
        '# 1. Restore all PM2 processes (backend, frontend, teams-macro-card)',
        'pm2 resurrect',
        '',
        '# 2. Start new Cloudflare tunnel (generates new URL)',
        'cloudflared tunnel --url http://localhost:3002',
        '',
        '# 3. Share new URL with team',
        '# New URL shown in tunnel output: https://xxx-yyy-zzz.trycloudflare.com',
    ]),
    spacer(2),

    h2('9.4  Environment Variables Reference'),
    table(
        ['Variable', 'Example Value', 'Used In', 'Purpose'],
        [
            ['DATABASE_URL', 'postgresql://user:pass@ep-xxx.neon.tech/neondb', 'server/db.js', 'Full PostgreSQL connection string for Neon serverless database'],
            ['JWT_SECRET', 'random-256-bit-string', 'server/authRoutes.js', 'Signs and verifies JWT tokens. Must be kept secret. Never commit to git.'],
            ['QH_API_TOKEN', 'Bearer eyJ...', 'server/services/rhoAlertService.js etc.', 'Authentication token for the internal Hertshten Group QH OHLC API'],
            ['CFTC_TEAMS_WEBHOOK_URL', 'https://company.webhook.office.com/webhookb2/...', 'server/services/cftcAlertService.js, rhoAlertService.js', 'Microsoft Teams incoming webhook URL for sending alert cards'],
            ['PORT', '3002', 'server/index.js', 'The port Express binds to. Default 3002 if not set.'],
        ]
    ),
    important('Never commit the .env file to version control (git). It contains secrets that would compromise the database and API access. Ensure server/.env is in .gitignore.'),
    spacer(2),
    divider(),
);

// ─────────────────────────────────────────────────────────────
//  SECTION 10 — DESIGN DECISIONS
// ─────────────────────────────────────────────────────────────
blocks.push(
    h1('Section 10 — Key Design Decisions & Rationale'),
    table(
        ['Decision', 'Alternatives Considered', 'Why This Choice Was Made'],
        [
            [
                'Monolithic architecture — backend serves frontend as static files',
                'Separate frontend (Vercel/Netlify) + backend (separate server)',
                'Both on same origin eliminates CORS entirely. Simpler deployment — one pm2 process to manage. No cross-origin cookie issues. Appropriate for an internal single-server tool.'
            ],
            [
                'Stateless JWT authentication',
                'Express sessions + express-session + connect-pg-simple',
                'No session store infrastructure needed. Token contains all identity info. Works across Cloudflare tunnel without sticky sessions. Standard approach for React SPAs with REST APIs.'
            ],
            [
                'ON CONFLICT DO NOTHING for all inserts',
                'DELETE + INSERT, or UPDATE if exists',
                'User requirement: historical data must never be modified or deleted. Idempotent inserts allow safe re-running of any sync job at any time. No corruption risk from duplicate cron fires.'
            ],
            [
                'Dual-trigger warehouse sync (Chokidar + daily cron)',
                'Chokidar only, or polling-only, or manual-only',
                'OneDrive on Windows suppresses filesystem events intermittently. Neither approach alone is reliable. The combination gives immediate reactive updates AND a guaranteed daily fallback.'
            ],
            [
                'Positional column mapping for CFTC (ALL_DB_COLS array)',
                'Dynamic header detection, or using CFTC header file',
                'The CFTC f_disagg.txt file has no header row. The column positions are stable and version-controlled in our codebase. Explicit mapping makes the schema transparent and debuggable.'
            ],
            [
                'types.setTypeParser(1082) for DATE columns',
                'Convert dates in every route handler manually',
                'One-time fix in db.js that affects all queries globally. Prevents the timezone shift bug everywhere automatically without any per-query logic.'
            ],
            [
                'Contract-level OI delta reconciliation',
                'Simple daily total OI subtraction',
                'Naive subtraction creates false negative spikes when contracts expire. Contract-level reconciliation is mathematically correct and produces a clean, interpretable chart.'
            ],
            [
                'Chart data filtered to 2026-01-01+',
                'Show all historical data (20+ years)',
                'The CFTC tables contain 20+ years of weekly data. Rendering all of it in a Recharts chart would be slow and unreadable. Current year gives traders the most relevant recent trend context.'
            ],
            [
                'Separate IceChartModal + IceComboChart components',
                'Pass apiEndpoint prop to CftcChartModal to make it generic',
                'A prop-driven generic modal works but obscures which endpoint is called. Separate components make data sources explicit, improve readability, allow ICE-specific branding, and prevent accidental breakage of CFTC charts.'
            ],
            [
                'node-cron inside the Express process (not a separate worker)',
                'Separate cron worker process, or AWS Lambda scheduled functions',
                'Operational simplicity — one process to manage, one log stream to check, no inter-process communication needed. For this scale of usage, a shared process is entirely appropriate.'
            ],
        ]
    ),
    spacer(2),
    divider(),
);

// ─────────────────────────────────────────────────────────────
//  SECTION 11 — INTERVIEW Q&A (VERY DETAILED)
// ─────────────────────────────────────────────────────────────
blocks.push(
    h1('Section 11 — Comprehensive Interview Q&A'),
    info('This section contains 20+ detailed questions and answers covering architecture, security, databases, frontend, algorithms, and operational topics. Use these to prepare for both standard questions and cross-questions.'),
    spacer(),

    h2('11.1  Architecture & Design'),

    h3('Q1: Explain the overall architecture of SpreadCharts from request to response.'),
    para('SpreadCharts is a full-stack monolithic web application. When a user opens the dashboard URL, their browser sends an HTTPS request to a *.trycloudflare.com domain. Cloudflare\'s edge network receives this and forwards it through an encrypted outbound tunnel (QUIC protocol) to the cloudflared process running on the local Windows machine, which passes it to Express.js listening on port 3002.'),
    para('Express handles the request based on the URL path. For /api/auth/* routes (login, register), no authentication check is performed. For all /api/* routes, the authenticateToken JWT middleware runs first — it reads the Authorization header, extracts the Bearer token, and calls jwt.verify(). If valid, req.user is populated with the decoded payload and next() is called. The route handler then runs its async function, queries PostgreSQL via the pg Pool, and returns a JSON response. For any non-/api URL, Express returns the dist/index.html file, allowing React Router to handle client-side navigation.'),

    h3('Q2: Why did you choose a monolithic architecture instead of microservices?'),
    para('For an internal tool serving a small team (5–10 users), the operational overhead of microservices — separate deployments, inter-service networking, distributed tracing, service discovery — would far outweigh the benefits. A monolith means one process to manage, one log stream to monitor, no CORS configuration needed between services, and a simple pm2 restart to deploy any change. The scaling constraints of a monolith are irrelevant at this scale. Microservices become valuable when teams are large enough that independent deployment of separate services provides organisational benefits — that is not the case here.'),

    h3('Q3: How does the Cloudflare Tunnel work and why is it used?'),
    para('Cloudflare Tunnel works by running a cloudflared daemon on the local machine that initiates outbound TCP/QUIC connections to Cloudflare\'s edge. This creates a persistent tunnel. When an external user visits the *.trycloudflare.com URL, Cloudflare routes the request through this tunnel to the local Express server — all without requiring any inbound port to be open. This is used because the Windows machine running the server is on a corporate network with a firewall that blocks all inbound connections. Cloudflare Tunnel bypasses this cleanly and adds TLS termination at the edge.'),

    h3('Q4: What are the limitations of the current architecture and what would you change?'),
    para('Current limitations and proposed improvements:'),
    bullet('Cloudflare tunnel URL changes on every restart — fix with a named tunnel and fixed custom domain'),
    bullet('PM2 relies on a logged-in Windows user session — fix with a proper Windows Service via pm2-windows-startup'),
    bullet('All background jobs share the same Node.js event loop as the HTTP server — if a long-running sync operation blocks the loop, API response times suffer. Fix with worker_threads or separate worker processes for CPU-intensive operations.'),
    bullet('No health check endpoint — add GET /api/health returning { status: "ok", uptime: process.uptime() } for monitoring'),
    bullet('No rate limiting on API endpoints — add express-rate-limit middleware to prevent abuse'),
    bullet('No test coverage — add Jest unit tests for parseRow(), pearson(), and computeMetricValue()'),
    spacer(),

    h2('11.2  Authentication & Security'),

    h3('Q5: What is a JWT and how does it work?'),
    para('JWT stands for JSON Web Token. It is an open standard (RFC 7519) for transmitting claims between parties as a JSON object. The token has three parts separated by dots: a Base64URL-encoded header specifying the algorithm (HS256 in our case), a Base64URL-encoded payload containing the claims (user id, username, issued-at time, expiry time), and a cryptographic signature. The signature is computed by running HMAC-SHA256 over the concatenated header and payload using a secret key. Anyone with the secret key can verify the signature — if the token was tampered with in any way, the signature check fails. The payload is not encrypted — it is only Base64-encoded and can be decoded by anyone. Therefore, sensitive data should never be placed in the payload.'),

    h3('Q6: What happens when a JWT token expires?'),
    para('When the token expires (24 hours after creation in our case), jwt.verify() throws a TokenExpiredError. Our middleware catches this and returns HTTP 403 with { error: "Invalid token" }. On the frontend, handleAuthError() in api.js detects the 403 response, removes the token from localStorage and Redux, and calls window.location.href = "/" to redirect to the login page. The user must log in again to get a fresh 24-hour token. There is no "refresh token" mechanism implemented — the user simply logs in again.'),

    h3('Q7: How does bcrypt protect passwords and why is it better than SHA256?'),
    para('bcrypt is specifically designed for password hashing. SHA256 is a general-purpose hash function built to be as fast as possible — a modern GPU can compute billions of SHA256 hashes per second, making brute-force attacks against even moderately complex passwords feasible within hours. bcrypt deliberately incorporates a tunable cost factor (work factor) — at 10 rounds, each hash computation takes approximately 100ms on a modern CPU. An attacker who steals the database can only attempt ~10 passwords per second per thread. Additionally, bcrypt automatically generates a unique random salt for each password and embeds it in the hash string, so two users with the same password will have different hashes. This prevents rainbow table attacks completely.'),

    h3('Q8: What SQL injection prevention do you use?'),
    para('All database queries use parameterised queries via the pg library. Instead of string concatenation like WHERE username = \'" + userInput + "\'", we write WHERE username = $1 and pass the value as a separate parameter array. The pg driver handles escaping the parameter values before they reach the database engine. This means even if a user submits a malicious string like \' OR 1=1 --, it is treated as a literal string value — not as SQL syntax. No string concatenation is used anywhere in the query construction code.'),
    spacer(),

    h2('11.3  Database & Data Pipelines'),

    h3('Q9: Why PostgreSQL over MongoDB for this project?'),
    para('The data being stored is highly structured and relational. CFTC data has a fixed 188-column schema that never changes. All rows for a given market table have exactly the same columns. There are no nested documents, dynamic schemas, or variable structures. PostgreSQL is well-suited to this: strong typing, excellent query optimiser for analytical queries (like GROUP BY, ORDER BY, date range filters), native support for connection pooling, and ACID transactions. MongoDB\'s document model would add unnecessary complexity with no benefit for this use case.'),

    h3('Q10: Explain the UPSERT strategy and why it matters.'),
    para('UPSERT stands for "Update or Insert" — a single SQL statement that inserts a row if it does not exist, or handles a conflict if it does. We use ON CONFLICT (report_date_as_mm_dd_yyyy) DO NOTHING. The ON CONFLICT clause specifies which column to check for uniqueness (the date column, which is the primary key or has a unique constraint). DO NOTHING means: if a row with that date already exists, silently skip this insert — do not error, do not update. This is the "idempotent insert" pattern. Running the same insert 10 times produces the same result as running it once. This is critical for scheduled jobs that may fire multiple times and for recovery scenarios where the server restarts mid-ingestion.'),

    h3('Q11: How does the CFTC CSV parsing work for 188 columns with no header?'),
    para('The CFTC f_disagg.txt file is a raw CSV with no header row. Each row represents one market on one reporting date. Columns are identified purely by their position (index 0 to 187). We maintain a hardcoded array called ALL_DB_COLS with 188 entries, where ALL_DB_COLS[i] gives the database column name for position i. For each parsed row (which csv-parse gives us as an array), we iterate through all 188 positions, look up the corresponding column name, and type-coerce the value. Text columns are trimmed strings. Float columns (percentages, concentration ratios) have commas stripped before parseFloat(). Integer columns have commas stripped before parseInt(). If the date field is invalid or missing, the entire row is discarded.'),

    h3('Q12: What was the timezone bug with PostgreSQL DATE columns and how did you fix it?'),
    para('The pg (node-postgres) driver by default converts PostgreSQL DATE values to JavaScript Date objects. A Date object always represents an absolute point in time — when set to midnight UTC. When this Date is then serialised to JSON for the API response, it becomes "2026-03-03T00:00:00.000Z". If a browser in the UTC+1 timezone (e.g., London during BST) interprets this string, it gets midnight UTC which is 11pm the previous night in local time — causing the displayed date to be March 2nd instead of March 3rd. The fix is types.setTypeParser(1082, val => val) in db.js, where 1082 is the PostgreSQL OID (object identifier) for the DATE type. This tells the driver to skip conversion and return the raw string "2026-03-03" directly.'),
    spacer(),

    h2('11.4  Frontend & React'),

    h3('Q13: Why Redux Toolkit instead of React Context or Zustand?'),
    para('Redux Toolkit was chosen because the state management requirements are complex and cross-cutting. The auth token affects every API call made anywhere in the app. The active section state affects the entire layout rendering. Chart data needs to be sharable between the TabBar and TabPanel components which are siblings, not parent-child. While Context API could handle this, it has a known performance issue: any change to a Context value re-renders all consumers even if they only care about a subset of the context value. Redux\'s useSelector hooks only re-render when the specific slice of state they subscribe to changes. For a dashboard with potentially many components rendered simultaneously, this performance characteristic matters. Zustand would also be a valid choice — it is lighter than RTK — but RTK was already in use from earlier development.'),

    h3('Q14: How does the column hierarchy system work and why was it designed this way?'),
    para('The column hierarchy (columnHierarchy.js) is a nested tree data structure that defines every metric visible in the Change in CFTC and Change in ICE tables. It was designed this way because the same structure serves multiple purposes: it drives the visual rendering of the table (sections, subsections, groups, rows), it defines how each metric value is computed (direct DB column read, formula computation, or time-series delta), and it provides the itemId used to identify which metric to plot when a chart button is clicked. Having a single source of truth for all of this prevents inconsistencies. The ITEM_MAP flat lookup is derived from this tree at module load time, providing O(1) access to any metric\'s definition without traversing the tree on every render.'),

    h3('Q15: How does routing work and how are protected routes implemented?'),
    para('React Router DOM v7 provides client-side routing. The router wraps the entire app. Two routes are defined: "/" renders the ProtectedRoute component wrapping AppShell, and "/login" renders the Login page. ProtectedRoute reads the token from Redux state (or localStorage on first load). If no token exists, it renders <Navigate to="/login" replace /> — immediately redirecting to the login page. If a token exists, it renders the <AppShell> dashboard. Since the React SPA is served by Express with a catch-all route returning index.html for any non-API URL, directly visiting any URL (e.g., /dashboard) serves index.html, React boots, Redux hydrates the token from localStorage, and the correct route renders.'),
    spacer(),

    h2('11.5  Algorithms & Calculations'),

    h3('Q16: Explain the Pearson correlation formula used in the Rho Monitor.'),
    para('Pearson correlation measures the linear relationship between two numerical series X and Y. Given n paired observations (x₁,y₁), (x₂,y₂), ..., (xₙ,yₙ):'),
    ...codeBlock([
        '         Σᵢ(xᵢ - x̄)(yᵢ - ȳ)',
        'r = ─────────────────────────────────────',
        '    √[Σᵢ(xᵢ - x̄)²] × √[Σᵢ(yᵢ - ȳ)²]',
        '',
        'Where: x̄ = mean(X), ȳ = mean(Y)',
        'Result: r ∈ [-1, +1]',
        'We multiply by 100: rho ∈ [-100, +100]',
    ]),
    para('In code, null values (weekends, holidays with no data) are filtered out — only pairs where both xᵢ and yᵢ are non-null are included in the calculation. If fewer than 2 valid pairs exist, NaN is returned. The implementation also handles the edge case where variance is zero (dx2 === 0 or dy2 === 0) by returning 0 instead of dividing by zero.'),

    h3('Q17: Why do you correlate percentage returns instead of price levels?'),
    para('Two time series that both trend upward over time (e.g., an outright contract and a spread that both increase over months) will show artificially high correlation simply because they both go up — even if their day-to-day movements are unrelated. This is called spurious correlation from co-integration. By converting to daily percentage returns (change% = (today - yesterday) / yesterday × 100), we remove the trend component and focus purely on the directional relationship of movements. A high correlation in returns means: when the outright goes up 2% on a given day, the spread also tends to go up; and vice versa. This is the meaningful signal for a hedging relationship.'),

    h3('Q18: How does the weekly change bar chart handle the first data point?'),
    para('The first row in the filtered dataset (the earliest week from 2026-01-01) has no previous row to compute a weekly change from. For this data point, weeklyChange is set to null. In the Recharts chart, a null value for a Bar chart series simply renders as an empty bar (no bar drawn for that data point). The amber Line chart uses connectNulls: true so the line is drawn continuously even if some points have null absolute values (though in practice all points should have values). The first KPI card (Latest Value) always shows the most recent week\'s value, not the first.'),
    spacer(),

    h2('11.6  Operations & Reliability'),

    h3('Q19: What happens if the CFTC website is down when the cron job fires?'),
    para('The Axios GET request in cftcUpdater.js has a 30-second timeout. If the request fails (network error, timeout, or non-200 status), the try/catch block catches the error, logs it with console.error, and the function returns { success: false, error: err.message }. Back in the cron callback in index.js, the result.success check evaluates to false, so the CFTC alert check is skipped. The ICE update still runs afterwards. No data is written to the database on a failed fetch. The cron job will run again the next day and will successfully fetch the new week\'s data (which the CFTC will have published by then).'),

    h3('Q20: How do you ensure the warehouse data is always up to date despite OneDrive issues?'),
    para('We use a two-layer strategy. The primary layer is Chokidar watching the OneDrive-mapped file paths. When a file stabilises after a write event, the corresponding sync service immediately runs and inserts any new rows into PostgreSQL using ON CONFLICT DO NOTHING. The secondary layer is a dedicated cron job at 08:30 AM every weekday morning that runs all four warehouse syncs unconditionally — regardless of whether the Chokidar watcher fired or not. Since all inserts are idempotent (ON CONFLICT DO NOTHING), running the sync when data already exists is harmless. This guarantees that even if OneDrive suppressed all filesystem events overnight, the database will be current by 08:30 AM — 30 minutes before London market open.'),

    h3('Q21: How do you prevent the Teams channel from being spammed with duplicate alerts?'),
    para('Two separate deduplication mechanisms are in place. For CFTC ATH/ATL alerts, a cftc_alert_log table records every alert sent with the market name, metric name, alert type (ATH/ATL), and the date it was sent. Before sending any alert, the service checks if the same market+metric+type combination was alerted within a configurable window. For Rho Monitor alerts, the rho_alert_log table records every alert with the product+spread combination and the date. Before firing an alert, isDuplicateRhoAlert() queries this table and returns true if the same pair was alerted within the last 7 days. If a correlation stays broken for a week, the alert fires once on day 1 and then is suppressed for 6 more days. On day 8, if it is still broken, it fires again. This provides meaningful re-alerting for persistent issues without daily noise.'),

    h3('Q22: How do you handle API rate limiting from the QH API?'),
    para('The QH API returns HTTP 429 (Too Many Requests) if called more than approximately once per second. The rhoAlertService.js handles this in two ways. First, there is a sleep(1100) call between every API request — a 1.1 second pause that keeps the request rate below the limit. Second, the fetchOHLCWithRetry() function wraps each API call in a retry loop with up to 3 attempts. If a 429 response is received, a longer sleep(10000) — 10 second pause — is applied before retrying. Other errors trigger a 1 second sleep before the next attempt. If all 3 attempts fail, the error is thrown and that spread pair is skipped (logged with console.error) but the overall scan continues for the remaining pairs.'),
    spacer(),

    h2('11.7  Potential Cross Questions'),

    h3('Q: Could you have used WebSockets instead of REST API for real-time data?'),
    para('WebSockets maintain a persistent bidirectional connection and are appropriate when the server needs to push data to clients in real-time (e.g., live price ticks). In SpreadCharts, all data is batch-processed (CFTC is weekly, ICE is weekly, warehouse data changes once or twice a day). Real-time push is not needed — the data does not change between users\' dashboard sessions. REST with on-demand fetching is the right choice here. The wsSlice in Redux suggests WebSocket support was considered or partially implemented for live price data from the QH API, but is not currently the primary data transport.'),

    h3('Q: How would you scale this system if 1,000 users needed to use it simultaneously?'),
    para('The current architecture would need several changes. First, move from a single Node.js process to a cluster (using Node.js cluster module or PM2 cluster mode) to utilise all CPU cores for handling concurrent HTTP requests. Second, move the background cron jobs and file watchers to separate worker processes so they don\'t compete for event loop time with HTTP handling. Third, add a Redis cache layer for frequently-read, rarely-changing data (like CFTC data which only changes weekly) to avoid repeated database queries. Fourth, move from Neon serverless (with connection limits) to a dedicated PostgreSQL instance with a PgBouncer connection pooler. Fifth, consider a CDN for serving the React static assets. That said, 1,000 simultaneous users is far beyond the intended use case for an internal trading tool.'),

    h3('Q: Why is the frontend a SPA (Single Page Application) rather than server-side rendered?'),
    para('A trading dashboard has highly interactive UI requirements — users expand/collapse sections, click chart buttons, switch between tabs, and the UI must respond instantly. Server-side rendering (SSR) requires a round-trip to the server for each page navigation, adding latency. A SPA loads once and all subsequent interactions happen client-side with no page refresh needed. The data-fetching is handled via API calls which are asynchronous and non-blocking. Additionally, SSR frameworks like Next.js add complexity that is unnecessary for an internal tool that does not require SEO optimisation or initial page load performance for public users.'),

    h3('Q: What is the difference between the CFTC Disaggregated report and the Legacy report?'),
    para('The CFTC publishes several COT report formats. The Legacy report divides traders into only two categories: Commercial and Non-Commercial. The Disaggregated report (which SpreadCharts uses — f_disagg.txt) provides more granular categorisation into four groups: Producer/Merchant/Processor/User (Prod Merc), Swap Dealers, Managed Money, and Other Reportables — plus Non-Reportables. This more detailed breakdown is more useful for understanding who is building or reducing positions. For example, Managed Money positions represent hedge funds and CTAs, while Producer/Merchant represents physical commodity traders. The Disaggregated report is available for all physical commodity markets.'),
    spacer(2),
    divider(),
);

// ─────────────────────────────────────────────────────────────
//  SECTION 12 — GLOSSARY
// ─────────────────────────────────────────────────────────────
blocks.push(
    h1('Section 12 — Glossary of Key Terms'),
    table(
        ['Term', 'Definition'],
        [
            ['CFTC',          'Commodity Futures Trading Commission — the US regulatory body that publishes weekly Commitments of Traders (COT) reports.'],
            ['COT Report',    'Commitments of Traders — weekly regulatory report showing the net positions held by different categories of market participants in US futures markets.'],
            ['ICE',           'Intercontinental Exchange — operates futures exchanges globally including ICE Futures Europe (London), which lists London Cocoa, White Sugar, and Robusta Coffee futures.'],
            ['Disaggregated', 'The CFTC\'s detailed COT report format that breaks positions into 4 trader categories: Prod Merc, Swap Dealers, Managed Money, Other Rept.'],
            ['Open Interest', 'The total number of outstanding derivative contracts (futures positions) that have not been settled. Represents market activity and liquidity.'],
            ['Managed Money', 'CFTC trader category covering registered investment advisers, commodity pool operators, commodity trading advisers — effectively hedge funds and CTAs.'],
            ['Prod Merc',     'Producer / Merchant / Processor / User — CFTC trader category covering entities that produce, process, or merchandise the physical commodity.'],
            ['Swap Dealers',  'CFTC trader category covering entities dealing in swaps and using futures to hedge their swap portfolios.'],
            ['JWT',           'JSON Web Token — a compact, URL-safe token format for transmitting claims between parties. Used for stateless authentication.'],
            ['bcrypt',        'An adaptive password hashing algorithm based on the Blowfish cipher. Designed to be computationally expensive to resist brute-force attacks.'],
            ['UPSERT',        'A database operation combining Insert + Update — inserts a new row if it does not exist, or handles a conflict if it does.'],
            ['Idempotent',    'An operation that produces the same result whether it is executed once or many times. Our syncs are idempotent via ON CONFLICT DO NOTHING.'],
            ['Pearson r',     'A statistical measure of the linear correlation between two variables, ranging from -1 to +1.'],
            ['Rolling Window', 'A fixed-size window of data points that moves forward in time. Used to compute statistics (like correlation) on the most recent N observations.'],
            ['PM2',           'Process Manager 2 — a production process manager for Node.js applications providing auto-restart, monitoring, and log management.'],
            ['Cloudflare Tunnel','A service that creates an outbound-only encrypted connection from a local server to Cloudflare\'s edge, enabling internet access without opening firewall ports.'],
            ['Adaptive Card', 'A Microsoft-developed JSON schema for rich interactive cards displayed in Teams, Outlook, and other Microsoft 365 products.'],
            ['Chokidar',      'A Node.js library for cross-platform file system watching. Wraps the native fs.watch/inotify with reliability improvements for network drives.'],
            ['SPA',           'Single Page Application — a web app that loads a single HTML page and dynamically updates content without full page reloads, using client-side JavaScript routing.'],
            ['Pool',          'A database connection pool — a cache of established database connections that are reused across queries to avoid the overhead of creating new connections.'],
            ['OID',           'Object Identifier — PostgreSQL\'s internal numeric identifier for data types. DATE = OID 1082, INTEGER = OID 23, TEXT = OID 25, etc.'],
            ['QUIC',          'A transport layer network protocol used by Cloudflare Tunnel. Provides lower latency than TCP for tunnelled connections.'],
            ['ATH / ATL',     'All-Time High / All-Time Low — the maximum or minimum value ever recorded for a metric in the historical dataset.'],
        ]
    ),
    spacer(2),
    divider(),
    new Paragraph({
        alignment: AlignmentType.CENTER,
        ...gap(400, 100),
        children: [new TextRun({ text: '— End of Document —', font: 'Calibri', size: 22, color: C.slate400, italics: true })],
    }),
);

// ═════════════════════════════════════════════════════════════
//  ASSEMBLE & WRITE
// ═════════════════════════════════════════════════════════════
const doc = new Document({
    creator: 'Ajit Yadav',
    title: 'SpreadCharts Technical Documentation',
    description: 'Detailed technical documentation of the SpreadCharts internal trading analytics platform',
    styles: {
        default: {
            document: {
                run: { font: 'Calibri', size: 20, color: C.slate900 },
            },
        },
    },
    numbering: {
        config: [{
            reference: 'default-numbering',
            levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
        }],
    },
    sections: [{
        properties: {
            page: {
                margin: {
                    top:    convertInchesToTwip(1.0),
                    right:  convertInchesToTwip(1.0),
                    bottom: convertInchesToTwip(1.0),
                    left:   convertInchesToTwip(1.2),
                },
            },
        },
        children: blocks,
    }],
});

const buffer = await Packer.toBuffer(doc);
const outFile = 'SpreadCharts_Documentation_Detailed.docx';
fs.writeFileSync(outFile, buffer);
const sizeKb = (fs.statSync(outFile).size / 1024).toFixed(1);
console.log(`✅  Generated: ${outFile}  (${sizeKb} KB)`);
