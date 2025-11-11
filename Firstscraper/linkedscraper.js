const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const CFG_PATH = path.join(__dirname, "config.json");
const CFG = fs.existsSync(CFG_PATH) ? JSON.parse(fs.readFileSync(CFG_PATH, "utf8")) : {};

function getScrapeOpsUrl(url, apiKey, country = "us") {
    if (!apiKey) return url;
    const params = new URLSearchParams({
        api_key: apiKey,
        url,
        country,
        residential: true
    });
    return `https://proxy.scrapeops.io/v1/?${params.toString()}`;
}

function ensureAbsoluteUrl(u) {
    if (!u) return u;
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    return "https://www.linkedin.com" + (u.startsWith("/") ? "" : "/") + u;
}

async function retryPageGoto(page, url, tries = 3, timeout = 15000) {
    for (let i = 1; i <= tries; i++) {
        try {
            await page.goto(url, { timeout, waitUntil: "networkidle2" });
            return true;
        } catch (err) {
            if (i === tries) return false;
            await new Promise(r => setTimeout(r, 1000 * i));
        }
    }
    return false;
}

async function scrapeSearchResults(browser, keyword, pageNum, locality, options) {
    const results = [];
    const page = await browser.newPage();
    try {
        const formattedKeyword = encodeURIComponent(keyword);
        const formattedLocality = encodeURIComponent(locality);
        const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${formattedKeyword}&location=${formattedLocality}&original_referer=&start=${pageNum * 10}`;
        const target = options.useProxy ? getScrapeOpsUrl(url, options.apiKey, options.country) : url;

        const ok = await retryPageGoto(page, target, options.retries || 3, options.timeout || 20000);
        if (!ok) throw new Error("navigation_failed");

        const html = await page.content();
        // detect clear proxy error JSON (do not treat normal LinkedIn HTML as error)
        const lower = html.toLowerCase();
        if (html.trim().startsWith("{") && (lower.includes("error") || lower.includes("scrapeops") || lower.includes("credits"))) {
            throw new Error("proxy_error_or_block");
        }

        // primary selector
        const cards = await page.$$("div.base-search-card__info");
        if (!cards || cards.length === 0) {
            // fallback: anchors that look like jobs
            const fallback = await page.evaluate(() => {
                const out = [];
                document.querySelectorAll("a[href]").forEach(a => {
                    const href = a.getAttribute("href") || "";
                    if (href.includes("/jobs/") || href.includes("/company/")) {
                        out.push({
                            name: (a.querySelector("h4") && a.querySelector("h4").innerText) || "",
                            job_title: (a.querySelector("h3") && a.querySelector("h3").innerText) || a.innerText || "",
                            url: href,
                            location: (a.querySelector("span") && a.querySelector("span").innerText) || ""
                        });
                    }
                });
                return out;
            });
            return fallback;
        }

        for (const card of cards) {
            const name = await card.$eval("h4.base-search-card__subtitle", el => el.innerText).catch(() => "");
            const title = await card.$eval("h3.base-search-card__title", el => el.innerText).catch(() => "");
            const loc = await card.$eval("span.job-search-card__location", el => el.innerText).catch(() => "");
            const parentHandle = await page.evaluateHandle(el => el.parentElement, card);
            const aTag = await parentHandle.$("a");
            const href = aTag ? await page.evaluate(el => el.getAttribute("href"), aTag).catch(() => "") : "";
            if (!href) continue;
            results.push({
                name: (name || "").trim(),
                job_title: (title || "").trim(),
                url: (href || "").trim(),
                location: (loc || "").trim()
            });
        }
        return results;
    } finally {
        try { await page.close(); } catch (e) {}
    }
}

async function fetchJobDetail(browser, job, options) {
    const page = await browser.newPage();
    const fullUrl = ensureAbsoluteUrl(job.url);
    try {
        const target = options.useProxy ? getScrapeOpsUrl(fullUrl, options.apiKey, options.country) : fullUrl;
        const ok = await retryPageGoto(page, target, options.retries || 3, options.timeout || 20000);
        if (!ok) throw new Error("detail_nav_failed");

        const html = await page.content();
        // detect clear proxy errors only
        const lower = html.toLowerCase();
        if (html.trim().startsWith("{") && (lower.includes("error") || lower.includes("scrapeops") || lower.includes("credits"))) {
            throw new Error("proxy_error_or_block");
        }

        // Try JSON-LD first for description & salary
        let rawDesc = "";
        let salary = null;
        try {
            const jsonLd = await page.$$eval('script[type="application/ld+json"]', nodes => nodes.map(n => n.textContent).join('\n'));
            if (jsonLd) {
                for (const chunk of jsonLd.split('\n')) {
                    try {
                        const parsed = JSON.parse(chunk);
                        if (parsed) {
                            if (!rawDesc && parsed.description) {
                                rawDesc = String(parsed.description).replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, '');
                            }
                            // JSON-LD salary/baseSalary handling
                            if (!salary) {
                                // common schema.org patterns
                                const bs = parsed.baseSalary || parsed.salary || parsed.compensation || parsed.baseWage;
                                if (bs) {
                                    if (typeof bs === 'string') {
                                        salary = bs;
                                    } else if (typeof bs === 'object') {
                                        // baseSalary could be a value object or a nested structure
                                        if (bs.value && typeof bs.value === 'object') {
                                            const v = bs.value;
                                            if (v.minValue || v.maxValue) {
                                                const min = v.minValue ? String(v.minValue) : null;
                                                const max = v.maxValue ? String(v.maxValue) : null;
                                                salary = (min && max) ? `${min} - ${max} ${v.currency || ''}` : (min || max || null);
                                            } else if (v.value) {
                                                salary = String(v.value);
                                            }
                                        } else if (bs.minValue || bs.maxValue) {
                                            const min = bs.minValue ? String(bs.minValue) : null;
                                            const max = bs.maxValue ? String(bs.maxValue) : null;
                                            salary = (min && max) ? `${min} - ${max} ${bs.currency || ''}` : (min || max || null);
                                        } else if (bs.value) {
                                            salary = String(bs.value);
                                        }
                                    }
                                }
                            }
                        }
                        if (rawDesc && salary) break;
                    } catch (e) { /* ignore parse errors */ }
                }
            }
        } catch (e) {}

        // description fallbacks
        if (!rawDesc || rawDesc.length < 20) {
            const selectors = [
                "div.show-more-less-html__markup",
                "section.show-more-less-html",
                "div#jobDescriptionText",
                "div[class*='description']"
            ];
            for (const sel of selectors) {
                try {
                    const txt = await page.$eval(sel, el => el.innerText.trim()).catch(() => "");
                    if (txt && txt.length > 20) { rawDesc = txt; break; }
                } catch (e) {}
            }
        }

        if (!rawDesc || rawDesc.length < 20) {
            const bodyText = html.replace(/\s+/g, " ").trim();
            rawDesc = bodyText.slice(0, 2000);
        }

        // salary fallbacks: DOM selectors then regex on html text
        if (!salary) {
            const salarySelectors = [
                "[data-test-job-salary]",
                "span.salary",
                "div.salary",
                "[class*='salary']",
                "li[class*='salary']",
                "p[class*='salary']"
            ];
            for (const sel of salarySelectors) {
                try {
                    const s = await page.$eval(sel, el => el.innerText.trim()).catch(() => "");
                    if (s && s.length > 2) { salary = s; break; }
                } catch (e) {}
            }
        }

        if (!salary) {
            // regex fallback: find common dollar amounts with optional period (/yr, per year, /mo, /hr)
            const text = html.replace(/\u00A0/g, ' ');
            const re = /(\$\s?\d{1,3}(?:[,\d{3}]*)(?:\.\d+)?(?:\s*(?:per|\/)?\s*(?:year|yr|month|mo|hour|hr|annum))?)/ig;
            const m = text.match(re);
            if (m && m.length) salary = m[0].trim();
        }

        // try to capture some job criteria if present
        const criteria = {};
        try {
            const items = await page.$$eval("li.description__job-criteria-item", nodes => nodes.map(n => n.innerText));
            if (items && items.length >= 1) {
                criteria.seniority = items[0].replace(/Seniority level/i, "").trim();
                if (items[1]) criteria.position_type = items[1].replace(/Employment type/i, "").trim();
                if (items[2]) criteria.job_function = items[2].replace(/Job function/i, "").trim();
                if (items[3]) criteria.industry = items[3].replace(/Industries/i, "").trim();
            }
        } catch (e) {}

        return {
            name: job.name || null,
            job_title: job.job_title || null,
            url: fullUrl,
            location: job.location || null,
            description: rawDesc || null,
            salary: salary || null,
            criteria
        };
    } finally {
        try { await page.close(); } catch (e) {}
    }
}

/**
 * Public runner function that backend can call.
 * options:
 *  - keywords: array of strings
 *  - locations: array of strings
 *  - pagesPerQuery: number
 *  - concurrency: number
 *  - retries: number
 *  - apiKey: string (optional) - overrides config.json api_key
 *  - useProxy: boolean (default true)
 *  - timeout: navigation timeout ms
 */
async function runLinkedScraper(opts = {}) {
    const options = {
        keywords: opts.keywords || ["software engineer"],
        locations: opts.locations || ["Dallas, Texas, United States"],
        pagesPerQuery: opts.pagesPerQuery || 1,
        concurrency: opts.concurrency || 3,
        retries: typeof opts.retries === "number" ? opts.retries : 3,
        apiKey: opts.apiKey || CFG.api_key || "",
        useProxy: typeof opts.useProxy === "boolean" ? opts.useProxy : true,
        country: opts.country || "us",
        timeout: opts.timeout || 20000
    };

    const browser = await puppeteer.launch({ headless: true });
    const searchResults = [];
    for (const keyword of options.keywords) {
        for (const loc of options.locations) {
            for (let p = 0; p < options.pagesPerQuery; p++) {
                const pageItems = await scrapeSearchResults(browser, keyword, p, loc, options);
                if (pageItems && pageItems.length) {
                    searchResults.push(...pageItems);
                }
            }
        }
    }

    const detailed = [];
    for (let i = 0; i < searchResults.length; i += options.concurrency) {
        const batch = searchResults.slice(i, i + options.concurrency);
        const proms = batch.map(j => fetchJobDetail(browser, j, options).catch(e => { return { error: String(e), url: j.url }; }));
        const res = await Promise.all(proms);
        for (const r of res) if (r) detailed.push(r);
    }

    await browser.close();

    return {
        generated_at: new Date().toISOString(),
        search_count: searchResults.length,
        detail_count: detailed.length,
        searches: searchResults,
        details: detailed
    };
}

async function postJobsToBackend(jobs, backendUrl) {
    const axios = require('axios');
    backendUrl = backendUrl || (CFG.backend_url || 'http://localhost:8000/jobs-create');

    const asBlock = (arrOrStr) => {
        if (!arrOrStr) return null;
        if (Array.isArray(arrOrStr)) {
            const cleaned = arrOrStr.map(s => (s || '').toString().trim()).filter(Boolean);
            if (!cleaned.length) return null;
            return cleaned.map(s => `• ${s}`).join('\n');
        }
        return arrOrStr.toString();
    };

    for (const j of jobs) {
        // j may be the detailed object returned by fetchJobDetail
        const payload = {
            job_name: j.job_title || j.jobTitle || 'Unknown',
            company_name: j.name || j.company || 'Unknown',
            location: j.location || 'Unknown',
            salary: j.salary || null,
            description: (j.description && j.description.trim()) ? j.description.trim() : null,
            responsibilities: asBlock(j.responsibilities || j.responsibility || null),
            qualifications: asBlock(j.qualifications || j.qualify || null),
            preferences: asBlock(j.preferences || null),
            benefits: asBlock(j.benefits || null),
            // include raw criteria for frontend filters (seniority, position_type, job_function, industry)
            criteria: j.criteria || null,
            application_link: j.url || j.application_link || null,
            source: 'linkedin'  // helpful for backend/front-end filtering
        };
        try {
            const res = await axios.post(backendUrl, payload, { timeout: 15000 });
            console.log(`Posted: ${payload.job_name} -> ${res.status}`);
        } catch (err) {
            console.error(`Failed to post ${payload.job_name}:`, err.message || err);
        }
    }
}

// CLI usage: when run directly, save results to JSON file
if (require.main === module) {
    (async () => {
        try {
            const out = await runLinkedScraper({
                keywords: CFG.keywords || ["software engineer"],
                locations: CFG.locations || ["Dallas, Texas, United States"],
                pagesPerQuery: CFG.pagesPerQuery || 1,
                concurrency: CFG.concurrency || 3,
                retries: CFG.retries || 3,
                apiKey: CFG.api_key || "",
                useProxy: typeof CFG.useProxy === "boolean" ? CFG.useProxy : true,
                country: CFG.country || "us"
            });
            const outPath = path.join(__dirname, "linkedin_all_jobs.json");
            fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
            console.log("Saved results to", outPath);

            // send to backend (uncomment to enable)
            await postJobsToBackend(out.details || out.searches || [], CFG.backend_url);
        } catch (e) {
            console.error("Run failed:", e);
            process.exit(1);
        }
    })();
}

// export for backend integration
module.exports = { runLinkedScraper };