const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const querystring = require('querystring');
const axios = require('axios');

const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

const scholarshipsDir = './scholarships';
/*
function cleanScholarshipsFolder() {
    if (fs.existsSync(scholarshipsDir)) {
        const files = fs.readdirSync(scholarshipsDir);
        for (const file of files) {
            const filePath = path.join(scholarshipsDir, file);
            fs.rmSync(filePath, { recursive: true, force: true });
        }
    }
}
*/
/*
function getScrapeOpsUrl(url, location = "us") {
    const payload = {
        api_key: config.api_key,
        url: url,
        country: location,
        residential: true
    };
    return "https://proxy.scrapeops.io/v1/?" + querystring.stringify(payload);
}
*/

async function scrapeScholarshipDetails(browser, scholarshipUrl) {
    const page = await browser.newPage();
    console.log(`Navigating to scholarship: ${scholarshipUrl}`);
    await page.goto(scholarshipUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    const data = await page.evaluate(() => {
        const getText = (selector) => document.querySelector(selector)?.innerText.trim() || 'Not specified';

        const scholarship_title = getText('h1.scholarship-header-title');
        const amount = getText('.scholarship-header-award-amount');
        const deadline = getText('.scholarship-header-deadline');
        const description = getText('.scholarship-description');

        const detailElements = document.querySelectorAll('.scholarship-details li');
        const details = Array.from(detailElements).map(li => li.innerText.trim()).join('; ') || 'Not specified';

        const eligibility = getText('.scholarship-eligibility');

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

    await page.close();
    return data;
}
/*test*/

async function crawlScholarshipList(browser, url) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    
    const scholarshipLinks = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('.scholarship-listing a[href*="/scholarships/"]'));
        return [...new Set(anchors.map(a => a.href))];
    });

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

/*
const scrapeIntervalMin = 10080; 
async function runScraper() {
    await mainScraper();
    console.log(`Waiting for ${scrapeIntervalMin} minutes before next scrape...`);
}

(async () => {
    await runScraper(); 
    setInterval(runScraper, scrapeIntervalMin * 60 * 1000);
})();
*/