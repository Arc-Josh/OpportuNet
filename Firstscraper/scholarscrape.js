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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    console.log(`Navigating to scholarship: ${scholarshipUrl}`);
    await page.goto(scholarshipUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(res => setTimeout(res, 3000));

    // Log the actual HTML for debugging
    const html = await page.content();
    console.log('PAGE HTML:', html);

    const data = await page.evaluate(() => {
        // Title
        let scholarship_title = 'Not specified';
        const h1s = Array.from(document.querySelectorAll('h1'));
        if (h1s.length) {
            scholarship_title = h1s[0].innerText.trim();
        }

        // Amount
        let amount = 'Not specified';
        const amountSpan = Array.from(document.querySelectorAll('span')).find(el => el.textContent.trim().toLowerCase().includes('amount:'));
        if (amountSpan) {
            const amtH5 = amountSpan.parentElement.querySelector('h5');
            if (amtH5) amount = amtH5.innerText.trim();
        }

        // Deadline
        let deadline = 'Not specified';
        const deadlineSpan = Array.from(document.querySelectorAll('span')).find(el => el.textContent.trim().toLowerCase().includes('deadline:'));
        if (deadlineSpan) {
            const deadlineH5 = deadlineSpan.parentElement.querySelector('h5');
            if (deadlineH5) deadline = deadlineH5.innerText.trim();
        }

        // Awards Available
        let awards_available = 'Not specified';
        const awardsSpan = Array.from(document.querySelectorAll('span')).find(el => el.textContent.trim().toLowerCase().includes('awards available:'));
        if (awardsSpan) {
            const awardsH5 = awardsSpan.parentElement.querySelector('h5');
            if (awardsH5) awards_available = awardsH5.innerText.trim();
        }

        // Description
        let description = 'Not specified';
        const descHeader = Array.from(document.querySelectorAll('h2')).find(el => el.innerText.trim().toLowerCase().includes('scholarship description'));
        if (descHeader) {
            const descP = descHeader.nextElementSibling;
            if (descP && descP.tagName === 'DIV') {
                const p = descP.querySelector('p');
                if (p) description = p.innerText.trim();
            } else if (descP && descP.tagName === 'P') {
                description = descP.innerText.trim();
            }
        }

        // Details
        let details = 'Not specified';
        const detailsHeader = Array.from(document.querySelectorAll('h2')).find(el => el.innerText.trim().toLowerCase().includes('scholarship details'));
        if (detailsHeader) {
            let detailsElem = detailsHeader.nextElementSibling;
            if (detailsElem && detailsElem.tagName === 'UL') {
                details = Array.from(detailsElem.querySelectorAll('li')).map(li => li.innerText.trim()).join('; ');
            }
        }

        // Eligibility
        let eligibility = 'Not specified';
        const eligibilityHeader = Array.from(document.querySelectorAll('h2')).find(el => el.innerText.trim().toLowerCase().includes('eligibility criteria'));
        if (eligibilityHeader) {
            let eligElem = eligibilityHeader.nextElementSibling;
            if (eligElem && eligElem.tagName === 'UL') {
                eligibility = Array.from(eligElem.querySelectorAll('li')).map(li => li.innerText.trim()).join('; ');
            }
        }

        return {
            scholarship_title,
            amount,
            deadline,
            awards_available,
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
