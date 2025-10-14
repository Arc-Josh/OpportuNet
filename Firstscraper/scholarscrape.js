const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const querystring = require('querystring');
const axios = require('axios');

const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

const scholarshipsDir = './scholarships';

function cleanScholarshipsFolder() {
    if (fs.existsSync(scholarshipsDir)) {
        const files = fs.readdirSync(scholarshipsDir);
        for (const file of files) {
            const filePath = path.join(scholarshipsDir, file);
            fs.rmSync(filePath, { recursive: true, force: true });
        }
    }
}


function getScrapeOpsUrl(url, location = "us") {
    const payload = {
        api_key: config.api_key,
        url: url,
        country: location,
        residential: true
    };
    return "https://proxy.scrapeops.io/v1/?" + querystring.stringify(payload);
}


async function scrapeScholarshipDetails(browser, scholarshipUrl) {
    const page = await browser.newPage();
    console.log(`Navigating to scholarship: ${scholarshipUrl}`);
    await page.goto(scholarshipUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    const data = await page.evaluate(() => {
        // Title
        const scholarship_title = document.querySelector('h1')?.innerText.trim() || 'Not specified';

        // Amount (look for the first h5/h6 or element after "Amount:")
        let amount = 'Not specified';
        const amountLabel = Array.from(document.querySelectorAll('span, div, p')).find(el => el.textContent.trim().toLowerCase().includes('amount:'));
        if (amountLabel) {
            const next = amountLabel.nextElementSibling;
            if (next && next.tagName.match(/^H/i)) {
                amount = next.innerText.trim();
            } else {
                // fallback: look for the first ##### $xxxx
                const amtHeader = Array.from(document.querySelectorAll('h5, h6')).find(el => el.innerText.trim().startsWith('$'));
                if (amtHeader) amount = amtHeader.innerText.trim();
            }
        }

        // Deadline (look for the first h5/h6 or element after "Deadline:")
        let deadline = 'Not specified';
        const deadlineLabel = Array.from(document.querySelectorAll('span, div, p')).find(el => el.textContent.trim().toLowerCase().includes('deadline:'));
        if (deadlineLabel) {
            const next = deadlineLabel.nextElementSibling;
            if (next && next.tagName.match(/^H/i)) {
                deadline = next.innerText.trim();
            } else {
                // fallback: look for the first h5/h6 with a date
                const dateHeader = Array.from(document.querySelectorAll('h5, h6')).find(el => /\d{4}/.test(el.innerText));
                if (dateHeader) deadline = dateHeader.innerText.trim();
            }
        }

        // Description (look for ## Scholarship Description)
        let description = 'Not specified';
        const descHeader = Array.from(document.querySelectorAll('h2, h3')).find(el => el.innerText.trim().toLowerCase().includes('scholarship description'));
        if (descHeader) {
            let descElem = descHeader.nextElementSibling;
            if (descElem && descElem.tagName === 'P') {
                description = descElem.innerText.trim();
            } else {
                // fallback: get all paragraphs after header
                let descText = '';
                while (descElem && descElem.tagName === 'P') {
                    descText += descElem.innerText.trim() + ' ';
                    descElem = descElem.nextElementSibling;
                }
                if (descText) description = descText.trim();
            }
        }

        // Details (look for ## Scholarship Details)
        let details = 'Not specified';
        const detailsHeader = Array.from(document.querySelectorAll('h2, h3')).find(el => el.innerText.trim().toLowerCase().includes('scholarship details'));
        if (detailsHeader) {
            let detailsElem = detailsHeader.nextElementSibling;
            let detailsArr = [];
            while (detailsElem && (detailsElem.tagName === 'UL' || detailsElem.tagName === 'LI' || detailsElem.tagName === 'P')) {
                if (detailsElem.tagName === 'UL') {
                    detailsArr.push(...Array.from(detailsElem.querySelectorAll('li')).map(li => li.innerText.trim()));
                } else if (detailsElem.tagName === 'LI') {
                    detailsArr.push(detailsElem.innerText.trim());
                } else if (detailsElem.tagName === 'P') {
                    detailsArr.push(detailsElem.innerText.trim());
                }
                detailsElem = detailsElem.nextElementSibling;
            }
            if (detailsArr.length) details = detailsArr.join('; ');
        }

        // Eligibility (look for ## Eligibility Criteria)
        let eligibility = 'Not specified';
        const eligibilityHeader = Array.from(document.querySelectorAll('h2, h3')).find(el => el.innerText.trim().toLowerCase().includes('eligibility criteria'));
        if (eligibilityHeader) {
            let eligElem = eligibilityHeader.nextElementSibling;
            let eligArr = [];
            while (eligElem && (eligElem.tagName === 'UL' || eligElem.tagName === 'LI' || eligElem.tagName === 'P')) {
                if (eligElem.tagName === 'UL') {
                    eligArr.push(...Array.from(eligElem.querySelectorAll('li')).map(li => li.innerText.trim()));
                } else if (eligElem.tagName === 'LI') {
                    eligArr.push(eligElem.innerText.trim());
                } else if (eligElem.tagName === 'P') {
                    eligArr.push(eligElem.innerText.trim());
                }
                eligElem = eligElem.nextElementSibling;
            }
            if (eligArr.length) eligibility = eligArr.join('; ');
        }

        return {
            scholarship_title,
            amount,
            deadline,
            description,
            details,
            eligibility,
            url: window.location.href
        };
    });

    console.log('Scraped data:', data);
    await page.close();
    return data;
}
/*test*/

async function crawlScholarshipList(browser, url) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for scholarship links to appear
    await page.waitForSelector('a[href^="/scholarships/"]', { timeout: 15000 }).catch(() => {});

    // When collecting links, use the real scholarships.com URLs for detail pages
    const scholarshipLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href^="/scholarships/"]'))
            .map(a => `https://www.scholarships.com${a.getAttribute('href')}`);
    });

    if (!scholarshipLinks || scholarshipLinks.length === 0) {
        console.warn('No scholarship links found on this page.');
    }

    console.log(`Found ${scholarshipLinks.length} scholarships on this page.`);

    const scholarships = [];
    for (const link of scholarshipLinks) {
        try {
            const details = await scrapeScholarshipDetails(browser, link);
            scholarships.push(details);
        } catch (err) {
            console.error(`Failed to scrape ${link}: ${err.message}`);
        }
    }

    await page.close();
    return scholarships;
}

async function sendScholarshipsToBackend() {
    const data = JSON.parse(fs.readFileSync('scholarships.json', 'utf-8'));
    const backendUrl = config.backend_url || 'http://localhost:8000/scholarships-create';

    for (const item of data) {
        const payload = {
            scholarship_title: item.scholarship_title || 'Unknown',
            amount: item.amount || 'Not specified',
            description: item.description || 'No description provided',
            deadline: item.deadline || 'Not specified',
            details: item.details || 'Not specified',
            eligibility: item.eligibility || 'Not specified',
            url: item.url || 'N/A'
        };

        try {
            console.log("Sending scholarship:", payload.scholarship_title);
            await axios.post(backendUrl, payload, { headers: { 'Content-Type': 'application/json' } });
            console.log(`Sent to backend: ${payload.scholarship_title}`);
        } catch (error) {
            console.error(`Failed to send scholarship: ${payload.scholarship_title}`, error.response?.data || error.message);
        }
    }
}


async function mainScraper() {
    const browser = await puppeteer.launch({ headless: true });
    const baseListUrl = "https://www.scholarships.com/financial-aid/college-scholarships/scholarships-by-major/computer-science-scholarships/";
    const results = [];

    console.log("Scholarship scraping started...");
    cleanScholarshipsFolder();

   
    const proxyUrl = getScrapeOpsUrl(baseListUrl);
    const pageResults = await crawlScholarshipList(browser, proxyUrl);
    results.push(...pageResults);

    fs.writeFileSync('scholarships.json', JSON.stringify(results, null, 2));
    console.log('Saved results to scholarships.json');

    await sendScholarshipsToBackend();

    await browser.close();
    console.log("Scraping completed successfully.");
}


const scrapeIntervalMin = 10080; 
async function runScraper() {
    await mainScraper();
    console.log(`Waiting for ${scrapeIntervalMin} minutes before next scrape...`);
}

(async () => {
    await runScraper(); 
    setInterval(runScraper, scrapeIntervalMin * 60 * 1000);
})();
