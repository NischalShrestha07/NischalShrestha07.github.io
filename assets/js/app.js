/* ═══════════════════════════════════════════
   Narayan Shrestha — Portfolio
   Shared behaviour for all pages.
   Every block is guarded, so a page only pays
   for the widgets it actually renders.
   ═══════════════════════════════════════════ */

const USER = "NischalShrestha07";
const EMAIL = "nischalshrestha800@gmail.com";
const API = "https://api.github.com/users/" + USER;
const CONTRIB_API = "https://github-contributions-api.jogruber.de/v4/" + USER + "?y=last";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(pointer: fine)").matches;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ── Cached fetch ──
   Unauthenticated GitHub allows 60 requests/hour per IP. Without a cache,
   browsing a few pages would burn a visitor's whole quota, so responses are
   held in sessionStorage for the length of the visit. */
async function cachedJSON(url, ttlMinutes = 30) {
	const key = "gh:" + url;
	try {
		const hit = JSON.parse(sessionStorage.getItem(key));
		if (hit && Date.now() - hit.t < ttlMinutes * 60000) return hit.d;
	} catch { /* corrupt entry — fall through and refetch */ }

	const res = await fetch(url);
	if (!res.ok) throw new Error(url + " → " + res.status);
	const data = await res.json();

	try {
		sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data }));
	} catch { /* quota full — caching is best effort */ }

	return data;
}

/* ── Reveal on scroll ── */
const revealObserver = new IntersectionObserver((entries) => {
	entries.forEach((e) => {
		if (e.isIntersecting) {
			e.target.classList.add("in");
			revealObserver.unobserve(e.target);
		}
	});
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

function observeReveals(root = document) {
	$$(".reveal", root).forEach((el) => revealObserver.observe(el));
}

/* Auto-stagger direct children of a grid */
function stagger(selector, step = 70) {
	$$(selector).forEach((grid) => {
		[...grid.children].forEach((child, i) => {
			child.classList.add("reveal");
			child.style.setProperty("--d", Math.min(i, 8) * step + "ms");
		});
	});
}

/* ── Header ── */
function initHeader() {
	const header = $(".site-header");
	const burger = $("#burger");
	const mobileNav = $("#mobileNav");

	if (burger && mobileNav) {
		burger.addEventListener("click", () => {
			const open = mobileNav.dataset.open === "true";
			mobileNav.dataset.open = String(!open);
			burger.setAttribute("aria-expanded", String(!open));
		});
	}

	// Mark the current page in both navs
	const page = location.pathname.split("/").pop() || "index.html";
	$$(".nav a, .mobile-nav a").forEach((a) => {
		const href = a.getAttribute("href");
		if (href === page || (page === "index.html" && href === "index.html")) {
			a.classList.add("active");
		}
	});

	const progress = $("#progress");
	const toTop = $("#toTop");

	addEventListener("scroll", () => {
		const y = scrollY;
		if (header) header.classList.toggle("scrolled", y > 20);
		if (toTop) toTop.classList.toggle("show", y > 500);
		if (progress) {
			const max = document.documentElement.scrollHeight - innerHeight;
			progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
		}
	}, { passive: true });

	if (toTop) toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
}

/* ── Cursor spotlight + card glow + tilt ── */
function initPointerFx() {
	if (reduced || !fine) return;

	const spot = $("#spotlight");
	if (spot) {
		addEventListener("pointermove", (e) => {
			spot.style.setProperty("--mx", e.clientX + "px");
			spot.style.setProperty("--my", e.clientY + "px");
		}, { passive: true });
	}

	$$(".card-glow").forEach((card) => {
		card.addEventListener("pointermove", (e) => {
			const r = card.getBoundingClientRect();
			card.style.setProperty("--cx", e.clientX - r.left + "px");
			card.style.setProperty("--cy", e.clientY - r.top + "px");
		});
	});

	$$("[data-tilt]").forEach((el) => {
		el.addEventListener("pointermove", (e) => {
			const r = el.getBoundingClientRect();
			const px = (e.clientX - r.left) / r.width - 0.5;
			const py = (e.clientY - r.top) / r.height - 0.5;
			el.style.transform = `perspective(900px) rotateX(${-py * 4}deg) rotateY(${px * 4}deg) translateY(-4px)`;
		});
		el.addEventListener("pointerleave", () => { el.style.transform = ""; });
	});

	$$("[data-magnetic]").forEach((btn) => {
		btn.addEventListener("pointermove", (e) => {
			const r = btn.getBoundingClientRect();
			const x = (e.clientX - r.left - r.width / 2) * 0.22;
			const y = (e.clientY - r.top - r.height / 2) * 0.3;
			btn.style.transform = `translate(${x}px, ${y}px)`;
		});
		btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
	});
}

/* ── Typewriter ── */
function initTypewriter() {
	const el = $("#typed");
	if (!el) return;

	const roles = JSON.parse(el.dataset.roles);
	if (reduced) {
		el.textContent = roles[0];
		return;
	}

	let i = 0, c = 0, deleting = false;
	(function tick() {
		const word = roles[i];
		c += deleting ? -1 : 1;
		el.textContent = word.slice(0, c);

		let wait = deleting ? 35 : 70;
		if (!deleting && c === word.length) {
			deleting = true;
			wait = 1700;
		} else if (deleting && c === 0) {
			deleting = false;
			i = (i + 1) % roles.length;
			wait = 300;
		}
		setTimeout(tick, wait);
	})();
}

/* ── Marquee ── */
function initMarquee() {
	const track = $("#marquee");
	if (!track) return;
	const items = JSON.parse(track.dataset.items);
	track.innerHTML = [...items, ...items].map((t) => `<span>${t}</span>`).join("");
}

/* ── Count up ──
   Data can arrive before the number is on screen, so the animation is deferred
   until the element is actually visible. */
const countObserver = new IntersectionObserver((entries) => {
	entries.forEach((e) => {
		if (!e.isIntersecting) return;
		countObserver.unobserve(e.target);
		animateCount(e.target, Number(e.target.dataset.target));
	});
}, { threshold: 0.4 });

function animateCount(el, target) {
	const start = performance.now();
	(function step(now) {
		const p = Math.min((now - start) / 950, 1);
		el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
		if (p < 1) requestAnimationFrame(step);
	})(start);
}

function countUp(el, target) {
	if (!el) return;
	if (reduced || !target) {
		el.textContent = (target ?? 0).toLocaleString();
		return;
	}

	el.dataset.target = target;
	const box = el.getBoundingClientRect();
	const onScreen = box.top < innerHeight && box.bottom > 0;

	if (onScreen) animateCount(el, target);
	else countObserver.observe(el);
}

function setText(id, value) {
	const el = document.getElementById(id);
	if (el) el.textContent = value;
}

/* ── GitHub profile + repos ── */
const LANG_COLORS = {
	PHP: "#4f5d95", Blade: "#f7523f", JavaScript: "#f1e05a", TypeScript: "#3178c6",
	HTML: "#e34c26", CSS: "#563d7c", SCSS: "#c6538c", Vue: "#41b883", Python: "#3572a5",
	Java: "#b07219", C: "#555555", "C++": "#f34b7d", Shell: "#89e051", Dockerfile: "#384d54",
	Dart: "#00b4ab", Kotlin: "#a97bff", Ruby: "#701516", Go: "#00add8",
};
const langColor = (l) => LANG_COLORS[l] || "#2ee6ff";

async function loadGitHub() {
	const needsProfile = $("[data-gh]");
	if (!needsProfile) return;

	try {
		const [profile, repos] = await Promise.all([
			cachedJSON(API),
			cachedJSON(API + "/repos?per_page=100&sort=pushed"),
		]);
		const own = Array.isArray(repos) ? repos.filter((r) => !r.fork) : [];

		const stars = own.reduce((s, r) => s + r.stargazers_count, 0);
		const forks = own.reduce((s, r) => s + r.forks_count, 0);

		countUp($("#ghRepos"), profile.public_repos ?? 0);
		countUp($("#ghFollowers"), profile.followers ?? 0);
		countUp($("#ghFollowing"), profile.following ?? 0);
		countUp($("#ghStars"), stars);
		countUp($("#ghForks"), forks);
		countUp($("#ghOwn"), own.length);

		setText("ghName", profile.name || USER);
		setText("ghLogin", "@" + (profile.login || USER));
		setText("ghLocation", profile.location || "Biratnagar, Nepal");
		setText("ghJoined", new Date(profile.created_at).toLocaleDateString("en", { month: "long", year: "numeric" }));

		const latest = own[0];
		setText("ghLatest", latest
			? `${latest.name} · ${new Date(latest.pushed_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`
			: "--");

		const avatar = $("#ghAvatar");
		if (avatar && profile.avatar_url) avatar.src = profile.avatar_url;

		if ($("#langBars")) loadLanguages(own);
	} catch (err) {
		console.warn("GitHub load failed:", err);
		const bars = $("#langBars");
		if (bars) {
			bars.innerHTML = `<p style="color:var(--dim)">GitHub is rate-limiting right now —
				<a style="color:var(--cyan)" href="https://github.com/${USER}" target="_blank" rel="noreferrer">view the profile directly</a>.</p>`;
		}
	}
}

/* ── Language breakdown (top repos only, to stay under the rate limit) ── */
async function loadLanguages(own) {
	const bars = $("#langBars");
	const totals = {};

	// 8 repos = 8 requests. Any more and a single visit eats the hourly quota.
	const sample = own.slice(0, 8);
	await Promise.all(sample.map(async (repo) => {
		try {
			const langs = await cachedJSON(repo.languages_url, 120);
			Object.entries(langs).forEach(([lang, bytes]) => {
				totals[lang] = (totals[lang] || 0) + bytes;
			});
		} catch { /* one repo failing shouldn't kill the chart */ }
	}));

	const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 7);
	if (!entries.length) {
		bars.innerHTML = `<p style="color:var(--dim)">No language data available.</p>`;
		return;
	}

	const sum = entries.reduce((s, [, v]) => s + v, 0);
	bars.innerHTML = entries.map(([lang, bytes]) => {
		const pct = (bytes / sum) * 100;
		return `
			<div>
				<div class="bar-row"><span>${lang}</span><span>${pct.toFixed(1)}%</span></div>
				<div class="bar-track">
					<div class="bar-fill" data-w="${pct}" style="background:linear-gradient(90deg, ${langColor(lang)}, var(--cyan))"></div>
				</div>
			</div>`;
	}).join("");

	// Animate widths once painted
	requestAnimationFrame(() => {
		$$(".bar-fill", bars).forEach((f) => { f.style.width = f.dataset.w + "%"; });
	});
}

/* ── Contribution calendar (real GitHub data) ── */
// GitHub itself only exposes this graph as an uncached HTML fragment on
// github.com with no CORS header, so a static site has to go through a
// third-party mirror. jogruber's is the actively-maintained one as of writing.
function groupIntoWeeks(days) {
	if (!days.length) return [];
	const firstDow = new Date(days[0].date + "T00:00:00").getDay(); // 0 = Sunday, matches GitHub's grid
	const padded = Array(firstDow).fill(null).concat(days);
	while (padded.length % 7) padded.push(null);
	const weeks = [];
	for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
	return weeks;
}

async function loadCalendar() {
	const cal = $("#calendar");
	// The home page shows contribution totals without drawing the grid.
	if (!cal && !$("#calTotal")) return;

	try {
		const data = await cachedJSON(CONTRIB_API, 120);
		renderCalendar(cal, data);
	} catch (err) {
		console.warn("Calendar load failed:", err);
		if (cal) {
			cal.innerHTML = `<img src="https://ghchart.rshah.org/35f0a6/${USER}" alt="GitHub contribution graph for ${USER}" style="width:100%">`;
		}
	}
}

function renderCalendar(cal, data) {
	const days = data.contributions;             // flat, oldest first
	const weeks = groupIntoWeeks(days);
	const total = data.total?.lastYear ?? days.reduce((s, d) => s + d.count, 0);

	// Streaks — only count days up to today, not the padded future tail
	const today = new Date().toISOString().slice(0, 10);
	const past = days.filter((d) => d.date <= today);

	let longest = 0, run = 0;
	past.forEach((d) => {
		run = d.count > 0 ? run + 1 : 0;
		if (run > longest) longest = run;
	});

	let current = 0;
	for (let i = past.length - 1; i >= 0; i--) {
		if (past[i].count > 0) current++;
		else if (i < past.length - 1) break;   // today being empty doesn't break the streak yet
	}

	const active = past.filter((d) => d.count > 0).length;
	const best = past.reduce((m, d) => (d.count > m.count ? d : m), past[0]);

	// Month labels, one per week column where the month changes
	const months = weeks.map((week, i) => {
		const first = week[0];
		if (!first) return "<span></span>";
		const m = new Date(first.date).getMonth();
		const prev = i > 0 && weeks[i - 1][0] ? new Date(weeks[i - 1][0].date).getMonth() : -1;
		return `<span>${m !== prev ? new Date(first.date).toLocaleDateString("en", { month: "short" }) : ""}</span>`;
	}).join("");

	setText("calTotal", total.toLocaleString());
	countUp($("#streakCurrent"), current);
	countUp($("#streakLongest"), longest);
	countUp($("#daysActive"), active);
	countUp($("#bestDay"), best ? best.count : 0);

	if (!cal) return;

	const grid = weeks.map((week, wi) => `
		<div class="cal-week">${week.map((d, di) => {
			if (!d) return `<i class="cal-day" style="visibility:hidden"></i>`;
			const delay = reduced ? 0 : (wi * 7 + di) * 0.7;
			return `<i class="cal-day l${d.level ?? 0}"
				style="animation-delay:${delay}ms"
				data-date="${d.date}" data-count="${d.count}"></i>`;
		}).join("")}</div>`).join("");

	cal.innerHTML = `
		<div class="calendar-scroll">
			<div class="calendar">
				<div class="cal-months">${months}</div>
				<div class="cal-body">
					<div class="cal-days"><span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span></div>
					<div class="cal-weeks">${grid}</div>
				</div>
			</div>
		</div>
		<div class="cal-legend">
			<span>Less</span>
			<i style="background:var(--c0)"></i><i style="background:var(--c1)"></i>
			<i style="background:var(--c2)"></i><i style="background:var(--c3)"></i>
			<i style="background:var(--c4)"></i>
			<span>More</span>
		</div>`;

	initCalTooltip(cal);
}

function initCalTooltip(cal) {
	let tip = $("#calTip");
	if (!tip) {
		tip = document.createElement("div");
		tip.id = "calTip";
		document.body.appendChild(tip);
	}

	cal.addEventListener("pointerover", (e) => {
		const day = e.target.closest(".cal-day[data-date]");
		if (!day) return;
		const count = Number(day.dataset.count);
		const date = new Date(day.dataset.date).toLocaleDateString("en", {
			weekday: "short", month: "short", day: "numeric", year: "numeric",
		});
		tip.innerHTML = `<b>${count}</b> contribution${count === 1 ? "" : "s"} · ${date}`;
		const r = day.getBoundingClientRect();
		tip.style.left = r.left + r.width / 2 + "px";
		tip.style.top = r.top + "px";
		tip.style.opacity = "1";
	});

	cal.addEventListener("pointerout", (e) => {
		if (e.target.closest(".cal-day")) tip.style.opacity = "0";
	});
}

/* ── Project filters ── */
function initFilters() {
	const bar = $("#filters");
	if (!bar) return;

	bar.addEventListener("click", (e) => {
		const btn = e.target.closest(".filter");
		if (!btn) return;

		$$(".filter", bar).forEach((b) => b.classList.remove("active"));
		btn.classList.add("active");

		const want = btn.dataset.filter;
		$$("#projectList .project").forEach((card) => {
			const tags = card.dataset.tags || "";
			card.hidden = want !== "all" && !tags.split(" ").includes(want);
		});
	});
}

/* ── Contact form → mailto (GitHub Pages has no backend) ── */
function initContactForm() {
	const form = $("#contactForm");
	if (!form) return;

	form.addEventListener("submit", (e) => {
		e.preventDefault();
		const name = $("#fName").value.trim();
		const from = $("#fEmail").value.trim();
		const subject = $("#fSubject").value.trim() || `Portfolio enquiry from ${name}`;
		const message = $("#fMessage").value.trim();
		const body = `${message}\n\n—\n${name}\n${from}`;

		location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

		const btn = $("button[type=submit]", form);
		const label = btn.textContent;
		btn.textContent = "Opening your mail app…";
		setTimeout(() => { btn.textContent = label; }, 3000);
	});
}

/* ── Boot ── */
document.addEventListener("DOMContentLoaded", () => {
	initHeader();
	initPointerFx();
	initTypewriter();
	initMarquee();
	initFilters();
	initContactForm();

	stagger("[data-stagger]");
	observeReveals();

	loadGitHub();
	loadCalendar();
});

/* ═══════════════════════════════════════════
   Added features
   ═══════════════════════════════════════════ */

/* ── Theme ── */
function initTheme() {
	const saved = localStorage.getItem("theme");
	const prefersLight = matchMedia("(prefers-color-scheme: light)").matches;
	const theme = saved || (prefersLight ? "light" : "dark");
	document.documentElement.dataset.theme = theme;

	const btn = $("#themeBtn");
	if (!btn) return;

	const paint = () => {
		const dark = document.documentElement.dataset.theme === "dark";
		btn.innerHTML = dark
			? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>`
			: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>`;
		btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
	};
	paint();

	btn.addEventListener("click", () => {
		const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
		document.documentElement.dataset.theme = next;
		localStorage.setItem("theme", next);
		paint();
	});
}

/* ── Header tools (injected so every page gets them without markup edits) ── */
function injectHeaderTools() {
	const cta = $(".header-cta");
	if (!cta || $("#themeBtn")) return;

	const tools = document.createElement("div");
	tools.className = "header-tools";
	cta.parentNode.insertBefore(tools, cta);
	tools.append(cta);

	const search = document.createElement("button");
	search.className = "icon-btn";
	search.id = "paletteBtn";
	search.type = "button";
	search.setAttribute("aria-label", "Open command palette");
	search.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;

	const theme = document.createElement("button");
	theme.className = "icon-btn";
	theme.id = "themeBtn";
	theme.type = "button";

	tools.prepend(theme);
	tools.prepend(search);
}

/* ── Command palette (⌘K / Ctrl-K) ── */
const COMMANDS = [
	{ label: "Home", hint: "page", href: "index.html" },
	{ label: "About", hint: "page", href: "about.html" },
	{ label: "Projects", hint: "page", href: "projects.html" },
	{ label: "GitHub activity", hint: "page", href: "github.html" },
	{ label: "Contact", hint: "page", href: "contact.html" },
	{ label: "Download résumé", hint: "file", href: "CV_NarayanShrestha.pdf" },
	{ label: "GitHub profile", hint: "external", href: "https://github.com/NischalShrestha07" },
	{ label: "LinkedIn", hint: "external", href: "https://www.linkedin.com/in/narayanshrestha07/" },
	{ label: "Email me", hint: "external", href: "mailto:" + EMAIL },
	{ label: "Toggle theme", hint: "action", action: () => $("#themeBtn").click() },
];

function initPalette() {
	const wrap = document.createElement("div");
	wrap.className = "palette-backdrop";
	wrap.id = "palette";
	wrap.dataset.open = "false";
	wrap.innerHTML = `
		<div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
			<input id="paletteInput" type="text" placeholder="Jump to a page, or type to search…" autocomplete="off">
			<div class="palette-list" id="paletteList"></div>
		</div>`;
	document.body.append(wrap);

	const input = $("#paletteInput", wrap);
	const list = $("#paletteList", wrap);
	let matches = COMMANDS;
	let cursor = 0;

	const render = () => {
		if (!matches.length) {
			list.innerHTML = `<p class="palette-empty">Nothing matches that.</p>`;
			return;
		}
		list.innerHTML = matches.map((c, i) => `
			<button class="palette-item" role="option" data-i="${i}" aria-selected="${i === cursor}">
				<span>${c.label}</span><span class="badge">${c.hint}</span>
			</button>`).join("");
	};

	const run = (cmd) => {
		if (!cmd) return;
		close();
		if (cmd.action) cmd.action();
		else location.href = cmd.href;
	};

	const open = () => {
		wrap.dataset.open = "true";
		input.value = "";
		matches = COMMANDS;
		cursor = 0;
		render();
		input.focus();
	};

	const close = () => { wrap.dataset.open = "false"; };

	input.addEventListener("input", () => {
		const q = input.value.trim().toLowerCase();
		matches = COMMANDS.filter((c) => c.label.toLowerCase().includes(q));
		cursor = 0;
		render();
	});

	input.addEventListener("keydown", (e) => {
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			if (!matches.length) return;
			cursor = (cursor + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
			render();
		} else if (e.key === "Enter") {
			e.preventDefault();
			run(matches[cursor]);
		}
	});

	list.addEventListener("click", (e) => {
		const item = e.target.closest(".palette-item");
		if (item) run(matches[Number(item.dataset.i)]);
	});

	wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });

	addEventListener("keydown", (e) => {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
			e.preventDefault();
			wrap.dataset.open === "true" ? close() : open();
		} else if (e.key === "Escape") {
			close();
			closeModal();
		}
	});

	const btn = $("#paletteBtn");
	if (btn) btn.addEventListener("click", open);
}

/* ── Project detail modal ── */
const PROJECT_DETAILS = {
	"Gym Management System": {
		problem: "Gyms were tracking members, payments and attendance across three separate spreadsheets, so nobody knew who had actually paid this month.",
		built: ["Member profiles with subscription plans and renewal dates",
			"Attendance logging with per-member history",
			"Payment history and outstanding-dues reporting",
			"Staff accounts with role-based permissions (owner / trainer / desk)"],
	},
	"Social Networking System": {
		problem: "A social feed that stays fast once the follow graph gets big.",
		built: ["Profiles, friend requests and a follow graph",
			"News feed with post interactions",
			"Real-time messaging",
			"Notification system driven by model events"],
	},
	"Payment Management System": {
		problem: "One codebase had to talk to several payment gateways without leaking gateway-specific logic everywhere.",
		built: ["Gateway adapters behind a single payment interface",
			"Transaction tracking with idempotent webhook handling",
			"Invoice generation and refund flows",
			"Subscription billing and financial reporting"],
	},
	"CRM": {
		problem: "Sales leads were being lost between the enquiry form and someone actually calling back.",
		built: ["Lead capture and pipeline stages",
			"Contact management with activity history",
			"Task automation and reminders",
			"Sales analytics dashboard built with Livewire"],
	},
	"HRMS": {
		problem: "HR processes for multiple companies on one deployment, with strict data isolation between them.",
		built: ["Employee profiles, leave and attendance",
			"Payroll processing with per-tenant rules",
			"Performance reviews",
			"Tenant isolation enforced at the middleware layer"],
	},
	"Ticketing System": {
		problem: "Support requests arriving by email with no priority, no owner and no SLA.",
		built: ["Ticket creation with priority queues",
			"Assignment workflows and canned responses",
			"SLA tracking and breach alerts",
			"Customer-facing portal"],
	},
	"API &amp; Microservices": {
		problem: "Several products needed the same auth, tenancy and billing primitives.",
		built: ["RESTful services with token-based auth",
			"Multi-tenant request resolution",
			"Versioned endpoints and rate limiting",
			"Documentation other developers can build against"],
	},
	"E-commerce Platform": {
		problem: "A storefront that had to survive its own catalogue growing.",
		built: ["Product catalogue with variants",
			"Cart and order management",
			"Payment gateway integration",
			"Admin dashboard for stock and fulfilment"],
	},
	"Q-Ecommerce": {
		problem: "Quick-commerce means inventory is wrong the moment it goes stale.",
		built: ["Fast ordering flow optimised for few taps",
			"Real-time inventory sync backed by Redis",
			"Delivery routing",
			"Multi-vendor marketplace management"],
	},
	"RBAC &amp; Multi-Tenancy Engine": {
		problem: "Every project was reimplementing roles and tenancy slightly differently, and slightly wrong.",
		built: ["Reusable role and permission engine",
			"Tenant isolation with shared-database strategies",
			"Middleware that fails closed, not open",
			"Drop-in package used across the systems on this page"],
	},
	"Subidha Gas ERP": {
		problem: "An LPG distributor ran four separate Firebase HTML tools with no shared database, so plant intake, cylinder counts and vendor payments could silently drift out of sync.",
		built: ["Transaction-first ledgers — cylinder and bank balances derived from history, never stored as a column",
			"Full tanker workflow: gate entry, weighbridge, compass validation, bulk LPG intake",
			"Vendor orders, dispatch and returns with a shared cheque register spanning payments and bank reconciliation",
			"Role-gated stages so a gatekeeper can't skip to weighbridge before compass validation"],
	},
	"Pearl Makeup Studio CMS": {
		problem: "A makeup studio and academy needed one place to manage its site content plus every booking, admission and contact enquiry coming in.",
		built: ["Full CMS over services, packages, courses and gallery, with a reusable drag-order + active-toggle pattern",
			"Media library with folders, soft-delete trash and URL-based import",
			"Booking, admission and contact inquiries each with a status/comment update trail",
			"Two-tier admin roles — content admins vs. a superadmin gate for user management and site settings"],
	},
	"Orchid-CMS": {
		problem: "A salon and academy needed a public site that felt custom, plus an admin panel non-technical staff could actually run — without forcing one rendering stack to do both jobs.",
		built: ["Inertia + React public site sharing one Laravel backend with a plain Blade admin CMS",
			"Repeating active/ordered/bulk-action pattern across every content type (services, specialists, testimonials, gallery, blog, academy classes)",
			"Centralized media library — S3 + local disks, HEIC/TIFF auto-converted to WebP, SSRF-guarded remote URL import",
			"Flexible per-page content blocks so new sections don't need a migration every time"],
	},
};

function closeModal() {
	const m = $("#modal");
	if (m) m.dataset.open = "false";
}

function initProjectModal() {
	const list = $("#projectList");
	if (!list) return;

	const wrap = document.createElement("div");
	wrap.className = "modal-backdrop";
	wrap.id = "modal";
	wrap.dataset.open = "false";
	wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true"></div>`;
	document.body.append(wrap);

	const box = $(".modal", wrap);

	list.addEventListener("click", (e) => {
		const card = e.target.closest(".project");
		if (!card) return;

		const link = $("a.arrow", card);
		if (link) {
			if (!e.target.closest("a")) window.open(link.href, "_blank", "noopener,noreferrer");
			return;
		}

		const title = $("h3", card).innerHTML;
		const domain = $(".project-domain", card).textContent;
		const summaryEl = $("p", card);
		const summary = summaryEl ? summaryEl.textContent : "";
		const tags = $(".tags", card).innerHTML;
		const detail = PROJECT_DETAILS[title];

		box.innerHTML = `
			<button class="modal-close" type="button" aria-label="Close">✕</button>
			<span class="project-domain">${domain}</span>
			<h3>${title}</h3>
			${summary ? `<p class="lead">${summary}</p>` : ""}
			<div class="tags">${tags}</div>
			${detail ? `
				<h4>The problem</h4>
				<p style="color:var(--muted);margin:0">${detail.problem}</p>
				<h4>What I built</h4>
				<ul>${detail.built.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}`;

		wrap.dataset.open = "true";
	});

	wrap.addEventListener("click", (e) => {
		if (e.target === wrap || e.target.closest(".modal-close")) closeModal();
	});
}

/* ── Toast + click-to-copy ── */
function toast(message) {
	let el = $("#toast");
	if (!el) {
		el = document.createElement("div");
		el.id = "toast";
		document.body.append(el);
	}
	el.textContent = message;
	el.classList.add("show");
	clearTimeout(toast.timer);
	toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}

function initCopy() {
	document.addEventListener("click", async (e) => {
		const target = e.target.closest("[data-copy]");
		if (!target) return;
		e.preventDefault();
		try {
			await navigator.clipboard.writeText(target.dataset.copy);
			toast("Copied " + target.dataset.copy);
		} catch {
			toast("Couldn't copy — " + target.dataset.copy);
		}
	});
}

/* ── Scramble-in section titles ── */
const GLYPHS = "!<>-_\\/[]{}—=+*^?#";

function scramble(el) {
	const text = el.dataset.text;
	const start = performance.now();
	const duration = 700;

	(function frame(now) {
		const p = Math.min((now - start) / duration, 1);
		const settled = Math.floor(text.length * p);
		el.textContent = text
			.split("")
			.map((ch, i) => {
				if (i < settled || ch === " ") return ch;
				return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
			})
			.join("");
		if (p < 1) requestAnimationFrame(frame);
		else el.textContent = text;
	})(start);
}

function initScramble() {
	if (reduced) return;

	const titles = $$(".section-title");
	const io = new IntersectionObserver((entries) => {
		entries.forEach((e) => {
			if (!e.isIntersecting) return;
			scramble(e.target);
			io.unobserve(e.target);
		});
	}, { threshold: 0.6 });

	titles.forEach((t) => {
		t.dataset.text = t.textContent.trim();
		io.observe(t);
	});
}

/* ── Boot the additions ── */
document.addEventListener("DOMContentLoaded", () => {
	injectHeaderTools();
	initTheme();
	initPalette();
	initProjectModal();
	initCopy();
	initScramble();
});

/* ═══════════════════════════════════════════
   Big-motion layer
   ═══════════════════════════════════════════ */

/* ── Preloader ──
   Shown once per session so returning to a page you've already seen doesn't
   make you sit through the curtain again. */
function initPreloader() {
	if (reduced || sessionStorage.getItem("seen")) return;
	sessionStorage.setItem("seen", "1");

	const pre = document.createElement("div");
	pre.id = "preloader";
	pre.innerHTML = `
		<div class="pre-inner">
			<div class="pre-name">${[..."NARAYAN"].map((ch, i) =>
		`<span style="animation-delay:${i * 55}ms">${ch}</span>`).join("")}</div>
			<div class="pre-bar"><div class="pre-fill"></div></div>
			<div class="pre-count">0%</div>
		</div>`;
	document.body.append(pre);
	document.body.style.overflow = "hidden";

	const fill = $(".pre-fill", pre);
	const count = $(".pre-count", pre);
	const start = performance.now();
	let finished = false;

	function finish() {
		if (finished) return;
		finished = true;
		pre.classList.add("done");
		document.body.style.overflow = "";
		setTimeout(() => pre.remove(), 1000);
	}

	// rAF is paused in background tabs, so never let the curtain be the only
	// thing standing between a visitor and the page.
	setTimeout(finish, 2600);

	(function step(now) {
		const p = Math.min((now - start) / 1400, 1);
		const eased = 1 - Math.pow(1 - p, 3);
		fill.style.width = eased * 100 + "%";
		count.textContent = Math.round(eased * 100) + "%";

		if (p < 1) return requestAnimationFrame(step);
		finish();
	})(start);
}

/* ── Split hero headline into animated letters ── */
function initSplitHeadline() {
	const h = $(".hero h1");
	if (!h || reduced) return;

	const text = h.textContent.trim();
	const letters = [...text];

	// The per-letter gradient replaces the one on the h1 itself.
	h.classList.remove("gradient-text");
	h.classList.add("split");
	h.style.setProperty("--n", letters.length);

	// Letters are inline-block, so a line could otherwise break mid-word.
	// Each word gets a nowrap wrapper; the letter index stays global so the
	// gradient still runs continuously across the whole headline.
	let i = 0;
	h.innerHTML = text.split(" ").map((word) => {
		const spans = [...word].map((ch) => `<span style="--i:${i++}">${ch}</span>`).join("");
		i++; // account for the space itself in the gradient ramp
		return `<span class="word">${spans}</span>`;
	}).join(" ");

	h.setAttribute("aria-label", text);
}

/* ── Custom cursor ── */
function initCursor() {
	if (reduced || !fine) return;

	const dot = document.createElement("div");
	const ring = document.createElement("div");
	dot.id = "cursorDot";
	ring.id = "cursorRing";
	document.body.append(dot, ring);
	document.body.classList.add("has-cursor");

	let mx = innerWidth / 2, my = innerHeight / 2;
	let rx = mx, ry = my;

	addEventListener("pointermove", (e) => {
		mx = e.clientX;
		my = e.clientY;
		dot.style.transform = `translate(${mx}px, ${my}px)`;

		// The ring grows over anything you can actually click
		const hot = e.target.closest("a, button, .project, input, textarea, .cal-day");
		ring.classList.toggle("hot", Boolean(hot));
	}, { passive: true });

	// Ring lags behind the dot — the whole point of the effect
	(function follow() {
		rx += (mx - rx) * 0.16;
		ry += (my - ry) * 0.16;
		ring.style.transform = `translate(${rx}px, ${ry}px)`;
		requestAnimationFrame(follow);
	})();

	addEventListener("pointerleave", () => {
		dot.style.opacity = ring.style.opacity = "0";
	});
	addEventListener("pointerenter", () => {
		dot.style.opacity = ring.style.opacity = "1";
	});
}

/* ── Film grain ── */
function initGrain() {
	if (reduced) return;
	const g = document.createElement("div");
	g.className = "grain";
	document.body.append(g);
}

/* ── Neural field ──
   The signature animation, shared by every page: a network of nodes with
   synaptic links, and pulses that fire along those links like signals crossing
   a synapse. The pointer is treated as an extra node — it attracts nearby
   cells and fires into them on click. Scrolling excites the whole network.
   Canvas 2D, no library. */
function initNeuralField() {
	if (reduced) return;

	const canvas = document.createElement("canvas");
	canvas.id = "neural";
	document.body.prepend(canvas);

	const ctx = canvas.getContext("2d");
	const dpr = Math.min(devicePixelRatio || 1, 2);
	const LINK_DIST = 130;      // how close two nodes must be to grow a synapse
	const POINTER_DIST = 170;

	let w = 0, h = 0;
	let nodes = [];
	let pulses = [];
	let excitement = 0;         // rises with scroll velocity, decays on its own

	const pointer = { x: -999, y: -999, down: false };
	const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

	function resize() {
		w = innerWidth;
		h = innerHeight;
		canvas.width = w * dpr;
		canvas.height = h * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		// Density scales with area, capped so low-end phones stay smooth
		const count = Math.min(Math.round((w * h) / 20000), 72);
		nodes = Array.from({ length: count }, () => ({
			x: Math.random() * w,
			y: Math.random() * h,
			vx: (Math.random() - 0.5) * 0.22,
			vy: (Math.random() - 0.5) * 0.22,
			r: Math.random() * 1.6 + 0.9,
			charge: Math.random(),   // drives the idle glow flicker
		}));
	}

	/* A pulse travels from node a to node b and dies on arrival. */
	function fire(a, b, strong = false) {
		if (pulses.length > 90) return;   // hard ceiling; never let this run away
		pulses.push({ a, b, t: 0, speed: strong ? 0.035 : 0.012 + Math.random() * 0.02, strong });
	}

	/* Spontaneous firing, so the network looks alive even when untouched. */
	function idleFire() {
		if (!nodes.length) return;
		const a = nodes[Math.floor(Math.random() * nodes.length)];
		const near = nodes.filter((n) => n !== a && Math.hypot(n.x - a.x, n.y - a.y) < LINK_DIST);
		if (near.length) fire(a, near[Math.floor(Math.random() * near.length)]);
	}

	addEventListener("pointermove", (e) => {
		pointer.x = e.clientX;
		pointer.y = e.clientY;
	}, { passive: true });

	addEventListener("pointerleave", () => {
		pointer.x = pointer.y = -999;
	});

	// Click = fire into every node the pointer is currently linked to
	addEventListener("pointerdown", (e) => {
		const origin = { x: e.clientX, y: e.clientY };
		nodes
			.filter((n) => Math.hypot(n.x - origin.x, n.y - origin.y) < POINTER_DIST * 1.6)
			.forEach((n) => fire(origin, n, true));
	});

	let lastY = scrollY;
	addEventListener("scroll", () => {
		excitement = Math.min(excitement + Math.abs(scrollY - lastY) * 0.012, 1);
		lastY = scrollY;
	}, { passive: true });

	setInterval(idleFire, 550);

	function frame() {
		ctx.clearRect(0, 0, w, h);

		const accent = css("--cyan") || "#2ee6ff";
		const hot = css("--green") || "#35f0a6";
		const base = 0.14 + excitement * 0.3;
		excitement *= 0.94;

		nodes.forEach((n) => {
			n.x += n.vx;
			n.y += n.vy;

			if (n.x < 0 || n.x > w) n.vx *= -1;
			if (n.y < 0 || n.y > h) n.vy *= -1;

			// Drift toward the pointer when it's within reach
			const d = Math.hypot(pointer.x - n.x, pointer.y - n.y);
			if (d < POINTER_DIST) {
				n.x += ((pointer.x - n.x) / d) * 0.3;
				n.y += ((pointer.y - n.y) / d) * 0.3;
			}

			n.charge = (n.charge + 0.008) % 1;
			const flicker = 0.35 + Math.sin(n.charge * Math.PI * 2) * 0.25;

			ctx.beginPath();
			ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
			ctx.fillStyle = accent;
			ctx.globalAlpha = flicker + excitement * 0.3;
			ctx.fill();
		});

		// Synapses between near neighbours
		ctx.lineWidth = 1;
		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const a = nodes[i], b = nodes[j];
				const d = Math.hypot(a.x - b.x, a.y - b.y);
				if (d > LINK_DIST) continue;

				ctx.beginPath();
				ctx.moveTo(a.x, a.y);
				ctx.lineTo(b.x, b.y);
				ctx.strokeStyle = accent;
				ctx.globalAlpha = (1 - d / LINK_DIST) * base;
				ctx.stroke();
			}

			// …and from the pointer into whatever it is near
			const n = nodes[i];
			const pd = Math.hypot(pointer.x - n.x, pointer.y - n.y);
			if (pd < POINTER_DIST) {
				ctx.beginPath();
				ctx.moveTo(n.x, n.y);
				ctx.lineTo(pointer.x, pointer.y);
				ctx.strokeStyle = hot;
				ctx.globalAlpha = (1 - pd / POINTER_DIST) * 0.35;
				ctx.stroke();
			}
		}

		// Signals in flight
		pulses = pulses.filter((p) => {
			p.t += p.speed;
			if (p.t >= 1) return false;

			const x = p.a.x + (p.b.x - p.a.x) * p.t;
			const y = p.a.y + (p.b.y - p.a.y) * p.t;
			const fade = Math.sin(p.t * Math.PI);   // brightest mid-flight

			ctx.beginPath();
			ctx.arc(x, y, p.strong ? 2.6 : 1.8, 0, Math.PI * 2);
			ctx.fillStyle = hot;
			ctx.globalAlpha = fade;
			ctx.fill();

			// Comet tail
			ctx.beginPath();
			ctx.arc(x, y, p.strong ? 9 : 6, 0, Math.PI * 2);
			ctx.globalAlpha = fade * 0.16;
			ctx.fill();

			return true;
		});

		ctx.globalAlpha = 1;
		requestAnimationFrame(frame);
	}

	resize();
	addEventListener("resize", resize);
	requestAnimationFrame(frame);
	requestAnimationFrame(() => canvas.classList.add("on"));
}

/* ── Boot the motion layer ── */
document.addEventListener("DOMContentLoaded", () => {
	initPreloader();
	// Splitting into per-letter spans before the webfont swaps in makes the
	// animating (transform + background-clip:text) layer repaint mid-flight,
	// which briefly doubles the glyph. Wait for the real font first.
	document.fonts && document.fonts.ready ? document.fonts.ready.then(initSplitHeadline) : initSplitHeadline();
	initCursor();
	initGrain();
	initNeuralField();
});

/* ── Synapse dividers ──
   A thread between sections with a signal travelling along it. */
function initSynapseRules() {
	const sections = $$("main .section");
	sections.slice(0, -1).forEach((sec) => {
		const hr = document.createElement("hr");
		hr.className = "synapse-rule";
		sec.after(hr);
	});
}

/* ── Skill graph ──
   The stack drawn as an actual network: three hubs (backend / frontend /
   tooling) with their skills orbiting them. Links fire at random, hovering a
   node lights up everything it is wired to, and the layout settles with a
   tiny spring rather than being hard-coded. */
const SKILL_GRAPH = {
	Backend: ["Laravel", "PHP 8", "MySQL", "REST APIs", "RBAC", "Multi-Tenancy", "Redis"],
	Frontend: ["JavaScript", "Blade", "Tailwind", "Vue.js", "HTML/CSS"],
	Tooling: ["Git", "Docker", "Linux", "Postman", "Composer"],
};

function initSkillGraph() {
	const host = $("#skillGraph");
	if (!host) return;

	const canvas = document.createElement("canvas");
	host.append(canvas);
	const ctx = canvas.getContext("2d");
	const dpr = Math.min(devicePixelRatio || 1, 2);

	let w = 0, h = 0;
	const nodes = [];
	const links = [];
	const pulses = [];
	const pointer = { x: -999, y: -999 };
	let hovered = null;

	const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
	const HUB_COLORS = ["--cyan", "--green", "--violet"];

	Object.entries(SKILL_GRAPH).forEach(([hubName, skills], hi) => {
		const hub = {
			label: hubName, hub: true, colorVar: HUB_COLORS[hi],
			x: 0, y: 0, tx: 0, ty: 0, r: 7,
		};
		nodes.push(hub);

		skills.forEach((skill) => {
			const node = {
				label: skill, hub: false, colorVar: HUB_COLORS[hi],
				x: 0, y: 0, tx: 0, ty: 0, r: 4,
			};
			nodes.push(node);
			links.push({ a: hub, b: node });
		});
	});

	function layout() {
		const r = host.getBoundingClientRect();
		w = r.width;
		h = r.height || 340;
		canvas.width = w * dpr;
		canvas.height = h * dpr;
		canvas.style.width = w + "px";
		canvas.style.height = h + "px";
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const hubs = nodes.filter((n) => n.hub);
		hubs.forEach((hub, hi) => {
			hub.tx = (w / (hubs.length + 1)) * (hi + 1);
			hub.ty = h / 2;

			const kids = links.filter((l) => l.a === hub).map((l) => l.b);
			const radius = Math.min(w / (hubs.length + 1), h / 2) * 0.62;

			kids.forEach((kid, ki) => {
				const angle = (ki / kids.length) * Math.PI * 2 - Math.PI / 2;
				kid.tx = hub.tx + Math.cos(angle) * radius;
				kid.ty = hub.ty + Math.sin(angle) * radius;
			});
		});

		// First layout drops the nodes straight onto their marks
		nodes.forEach((n) => {
			if (!n.x) { n.x = n.tx; n.y = n.ty; }
		});
	}

	host.addEventListener("pointermove", (e) => {
		const r = host.getBoundingClientRect();
		pointer.x = e.clientX - r.left;
		pointer.y = e.clientY - r.top;
	});
	host.addEventListener("pointerleave", () => {
		pointer.x = pointer.y = -999;
	});

	setInterval(() => {
		if (!links.length || pulses.length > 14) return;
		const link = links[Math.floor(Math.random() * links.length)];
		pulses.push({ link, t: 0, dir: Math.random() > 0.5 });
	}, 260);

	function frame() {
		ctx.clearRect(0, 0, w, h);

		hovered = null;
		nodes.forEach((n) => {
			if (Math.hypot(pointer.x - n.x, pointer.y - n.y) < 22) hovered = n;
		});

		// Spring toward the target position, nudged away from the pointer
		nodes.forEach((n) => {
			const d = Math.hypot(pointer.x - n.x, pointer.y - n.y);
			let tx = n.tx, ty = n.ty;

			if (d < 90) {
				tx -= ((pointer.x - n.x) / d) * (90 - d) * 0.35;
				ty -= ((pointer.y - n.y) / d) * (90 - d) * 0.35;
			}

			n.x += (tx - n.x) * 0.08;
			n.y += (ty - n.y) * 0.08;
		});

		links.forEach((l) => {
			const lit = hovered && (hovered === l.a || hovered === l.b);
			ctx.beginPath();
			ctx.moveTo(l.a.x, l.a.y);
			ctx.lineTo(l.b.x, l.b.y);
			ctx.strokeStyle = css(l.b.colorVar);
			ctx.globalAlpha = lit ? 0.75 : 0.2;
			ctx.lineWidth = lit ? 1.6 : 1;
			ctx.stroke();
		});

		for (let i = pulses.length - 1; i >= 0; i--) {
			const p = pulses[i];
			p.t += 0.02;
			if (p.t >= 1) { pulses.splice(i, 1); continue; }

			const from = p.dir ? p.link.a : p.link.b;
			const to = p.dir ? p.link.b : p.link.a;
			const x = from.x + (to.x - from.x) * p.t;
			const y = from.y + (to.y - from.y) * p.t;

			ctx.beginPath();
			ctx.arc(x, y, 2.4, 0, Math.PI * 2);
			ctx.fillStyle = css(to.colorVar);
			ctx.globalAlpha = Math.sin(p.t * Math.PI);
			ctx.fill();
		}

		nodes.forEach((n) => {
			const lit = hovered === n ||
				(hovered && links.some((l) =>
					(l.a === hovered && l.b === n) || (l.b === hovered && l.a === n)));

			ctx.beginPath();
			ctx.arc(n.x, n.y, n.r + (lit ? 2 : 0), 0, Math.PI * 2);
			ctx.fillStyle = css(n.colorVar);
			ctx.globalAlpha = lit ? 1 : 0.85;
			ctx.fill();

			if (n.hub || lit) {
				ctx.globalAlpha = 1;
				ctx.fillStyle = css("--text");
				ctx.font = `${n.hub ? 600 : 400} ${n.hub ? 13 : 11}px Inter, sans-serif`;
				ctx.textAlign = "center";
				ctx.fillText(n.label, n.x, n.y - n.r - 7);
			}
		});

		ctx.globalAlpha = 1;
		if (!reduced) requestAnimationFrame(frame);
	}

	layout();
	addEventListener("resize", layout);
	frame();   // under reduced motion this paints one static frame and stops
}

document.addEventListener("DOMContentLoaded", () => {
	initSynapseRules();
	initSkillGraph();
});
