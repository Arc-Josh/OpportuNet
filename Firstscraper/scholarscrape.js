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

    await page.evaluate(() => {
        document.querySelectorAll('.modal, footer, #chatbot-container, .adsbygoogle, #nav-spacer, [role="log"], #fb-root, iframe').forEach(el => el.remove());
    });
 
    const html = await page.content();
    console.log('PAGE HTML:', html);

    const data = await page.evaluate(() => {
        const main = document.querySelector('#top-display');
        if (!main) return {};
        // Title
        let scholarship_title = main.querySelector('h1')?.innerText.trim() || 'Not specified';
        // Amount
        let amount = 'Not specified';
        const amountSpan = Array.from(main.querySelectorAll('span')).find(el => el.textContent.trim().toLowerCase().includes('amount:'));
        if (amountSpan) {
            const amtH5 = amountSpan.parentElement.querySelector('h5');
            if (amtH5) amount = amtH5.innerText.trim();
        }
        if (amount === 'Not specified') {
            const h5s = Array.from(main.querySelectorAll('h5'));
            const amtH5 = h5s.find(el => el.innerText.trim().startsWith('$') || el.previousElementSibling?.textContent.toLowerCase().includes('amount:'));
            if (amtH5) amount = amtH5.innerText.trim();
        }
        // Deadline
        let deadline = 'Not specified';
        const deadlineSpan = Array.from(main.querySelectorAll('span')).find(el => el.textContent.trim().toLowerCase().includes('deadline:'));
        if (deadlineSpan) {
            const deadlineH5 = deadlineSpan.parentElement.querySelector('h5');
            if (deadlineH5) deadline = deadlineH5.innerText.trim();
        }
        if (deadline === 'Not specified') {
            const h5s = Array.from(main.querySelectorAll('h5'));
            const deadlineH5 = h5s.find(el => /\d{4}/.test(el.innerText) || el.previousElementSibling?.textContent.toLowerCase().includes('deadline:'));
            if (deadlineH5) deadline = deadlineH5.innerText.trim();
        }
        // Description
        let description = 'Not specified';
        const descHeader = Array.from(main.querySelectorAll('h2')).find(el => el.innerText.trim().toLowerCase().includes('scholarship description'));
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
        const detailsHeader = Array.from(main.querySelectorAll('h2')).find(el => el.innerText.trim().toLowerCase().includes('scholarship details'));
        if (detailsHeader) {
            let detailsElem = detailsHeader.nextElementSibling;
            if (detailsElem && detailsElem.tagName === 'UL') {
                details = Array.from(detailsElem.querySelectorAll('li')).map(li => li.innerText.trim()).join('; ');
            }
        }
        // Eligibility
        let eligibility = 'Not specified';
        const eligibilityHeader = Array.from(main.querySelectorAll('h2')).find(el => el.innerText.trim().toLowerCase().includes('eligibility criteria'));
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

 
    await page.waitForSelector('a[href^="/scholarships/"]', { timeout: 15000 }).catch(() => {});


    const scholarshipLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href^="/scholarships/"]'))
            .map(a => `https://www.scholarships.com${a.getAttribute('href')}`);
    });

    if (!scholarshipLinks || scholarshipLinks.length === 0) {
        console.warn('No scholarship links found on this page.');
    }

    console.log(`Found ${scholarshipLinks.length} scholarships on this page.`);

    const scholarships = [];
    const backendUrl = config.backend_url || 'http://localhost:8000/scholarships-create';

    const failedPosts = [];
    async function postWithRetry(payload, retries = 3, delayMs = 2000) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`Posting to ${backendUrl} (attempt ${attempt}): ${payload.scholarship_title}`);
                const resp = await axios.post(backendUrl, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
                console.log(`Backend response status: ${resp.status}`);
                return { success: true, response: resp };
            } catch (err) {
 
                let errMsg = err.message;
                let respData = null;
                let status = null;
                if (err.response) {
                    status = err.response.status;
                    respData = err.response.data;
                    errMsg = `Status ${status} - ${JSON.stringify(respData)}`;
                }
                console.warn(`POST attempt ${attempt} failed for ${payload.scholarship_title}: ${errMsg}`);
                if (attempt < retries) await new Promise(r => setTimeout(r, delayMs));
                else {

                    failedPosts.push({ payload, error: errMsg });
                    try {
                        fs.writeFileSync('failed_scholarships.json', JSON.stringify(failedPosts, null, 2));
                    } catch (writeErr) {
                        console.error('Failed to write failed_scholarships.json:', writeErr.message);
                    }
                    return { success: false, error: errMsg };
                }
            }
        }
    }

    for (const link of scholarshipLinks) {
        try {
            const details = await scrapeScholarshipDetails(browser, link);
            if (!details || Object.keys(details).length === 0) {
                console.warn(`No details found for ${link}, skipping.`);
                continue;
            }

            // Always set url to the actual scholarship page link
            details.url = link;
            scholarships.push(details);

            const payload = {
                scholarship_title: details.scholarship_title || 'Unknown',
                amount: details.amount || 'Not specified',
                deadline: details.deadline || 'Not specified',
                description: details.description || 'No description provided',
                details: details.details || 'Not specified',
                eligibility: details.eligibility || 'Not specified',
                url: link,
                name: details.scholarship_title || 'Unknown',
                provider: details.provider || 'Scholarships.com',
                field: details.field || null,
                gpa: details.gpa || null,
                location: details.location || null,
                residency: details.residency || null,
            };

            const res = await postWithRetry(payload, 3, 2000);
            if (res.success) console.log(`Posted scholarship to backend: ${payload.scholarship_title}`);
            else console.error(`Failed to post scholarship after retries: ${payload.scholarship_title}`, res.error?.message || res.error);

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
