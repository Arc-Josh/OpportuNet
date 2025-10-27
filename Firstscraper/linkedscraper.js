const fs = require('fs');
const path = require('path');
const { parse } = require('json2csv');
const puppeteer = require('puppeteer');
const querystring = require('querystring');

const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

const jobsDir = './jobs';

function cleanJobsFolder() {
    if (fs.existsSync(jobsDir)) {
        const files = fs.readdirSync(jobsDir);

        for (const file of files) {
            const filePath = path.join(jobsDir, file);
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

async function crawlPage(browser, url) {
    const page = await browser.newPage();
    await page.goto(url);

    const jobListings = await page.$$('[data-testid="slider_item"]');
    const jobs = [];

    for (const job of jobListings) {
        const jobTitle = await job.$eval('h2', el => el.innerText.trim());
        const company = await job.$eval('[data-testid="company-name"]', el => el.innerText.trim());
        const jobLocation = await job.$eval('[data-testid="text-location"]', el => el.innerText.trim());

        const jobAnchor = await job.$('a');
        const href = await page.evaluate(anchor => anchor?.getAttribute('href') || '', jobAnchor);

        const urlObj = new URL(href, 'https://www.indeed.com');
        const jobKey = urlObj.searchParams.get('jk');

        let jobUrl = '';
        if (jobKey) {
            jobUrl = `https://www.indeed.com/viewjob?jk=${jobKey}`;
            console.log(`Found job listing at: ${jobUrl}`);
            const proxyJobUrl = getScrapeOpsUrl(jobUrl);
            const details = await scrapeJobDetails(browser, proxyJobUrl, jobTitle);

            if (details.benefits !== 'n/a' && details.expectations !== 'n/a' && details.preferences !== 'n/a') {
                jobs.push({
                    jobTitle,
                    company,
                    jobLocation,
                    jobUrl,
                    salary: details.salary,
                    benefits: details.benefits,
                    qualifications: details.qualifications,
                    description: details.description,
                    preferences: details.preferences,
                    expectations: details.expectations
                });
            } else {
                console.log(`Skipping job ${jobTitle} due to "n/a" in benefits, expectations, or preferences.`);
            }
        }
    }

    await page.close();
    return jobs;
}

async function retryPageGoto(page, url, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Attempt ${attempt} to navigate to: ${url}`);
            await page.goto(url, { timeout: 10000 });
            return true;  
        } catch (error) {
            if (error.name === 'TimeoutError') {
                console.error(`Timeout error during navigation (Attempt ${attempt}): ${error.message}`);
            } else {
                console.error(`Error navigating to ${url} (Attempt ${attempt}): ${error.message}`);
            }

            if (attempt === retries) {
                console.log(`Failed to navigate to ${url} after ${retries} attempts. Skipping...`);
                return false;  
            }
        }
    }
}

function extractJobOnlyDescription(fullText) {
    const lines = fullText.split('\n').map(line => line.trim()).filter(Boolean);
    const jobLines = [];

    let foundJobSection = false;

    const jobStartKeywords = [
        'responsibilities',
        'what you will do',
        'duties',
        'tasks',
        'role',
        'position summary',
        'you will be responsible',
        'job description',
        'we are looking for',
        'you will',
        'as a',
        'your role includes'
    ];

    for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();

        if (!foundJobSection && jobStartKeywords.some(keyword => lower.includes(keyword))) {
            foundJobSection = true; 
        }

        if (foundJobSection) {
            jobLines.push(lines[i]);
        }
    }

    const finalLines = jobLines.length > 0 ? jobLines.slice(0, 10) : lines.slice(-10);

    return finalLines.join('\n');
}


function extractQualificationsAndPreferences(description) {
    const lines = description.split('\n').map(l => l.trim());
    let qualifications = [];
    let preferences = [];
    let expectations = [];
    let currentSection = null;

    for (const line of lines) {
        const lower = line.toLowerCase();

        if (lower.includes('qualification') || lower.includes('requirement') || lower.includes('must-have') || lower.includes('we are looking for') || lower.includes('skills')) {
            currentSection = 'qualifications';
            continue;
        }

        if (lower.includes('nice-to-have') || lower.includes('preferred') || lower.includes('desirable')) {
            currentSection = 'preferences';
            continue;
        }

        if (lower.includes('expectation') || lower.includes('responsibilities') || lower.includes('duties') || lower.includes('tasks') || lower.includes('you will be expected to')) {
            currentSection = 'expectations';
            continue;
        }

        if (lower.includes('benefit') || lower.includes('salary') || lower.includes('location') || lower.includes('about us')) {
            currentSection = null;
            continue;
        }

        const formattedLine = line.length > 0 ? formatBulletPoint(line) : null;
        if (formattedLine) {
            if (currentSection === 'qualifications') qualifications.push(formattedLine);
            if (currentSection === 'preferences') preferences.push(formattedLine);
            if (currentSection === 'expectations') expectations.push(formattedLine);
        }
    }

    return {
        qualifications: qualifications.length > 0 ? qualifications.join('\n') : 'Not specified',
        preferences: preferences.length > 0 ? preferences.join('\n') : 'Not specified',
        expectations: expectations.length > 0 ? expectations.join('\n') : 'Not specified'
    };
}
function formatBulletPoint(text) {
    if (text.length < 10) return null; 


    text = text.charAt(0).toUpperCase() + text.slice(1);

    if (!/[.?!]$/.test(text)) {
        text += '.';
    }

    return `• ${text}`;
}

async function scrapeJobDetails(browser, jobUrl, jobTitle) {
    const page = await browser.newPage();
    const success = await retryPageGoto(page, jobUrl);

    if (!success) {
        await page.close();
        return {
            jobTitle,
            qualifications: 'n/a',
            preferences: 'n/a',
            salary: 'n/a',
            description: 'n/a',
            benefits: 'n/a',
            expectations: 'n/a' 
        };
    }

    const rawDescription = await page.$eval("div[id='jobDescriptionText']", el => el?.innerText.trim() || '').catch(() => '');
    const salary = await page.$eval("div[id='salaryInfoAndJobType']", el => el?.innerText.trim() || '').catch(() => '');
    const benefits = await page.$eval("div[id='benefits']", el => el?.innerText.trim() || '').catch(() => '');
    const preferencesDiv = await page.$eval("div[id='preferences']", el => el?.innerText.trim() || '').catch(() => '');

    const jobOnlyDescription = extractJobOnlyDescription(rawDescription);
    const lines = jobOnlyDescription.split('\n').map(l => l.trim()).filter(Boolean);
    const condensedDescription = lines.slice(0, 5).join(' ') + (lines.length > 5 ? '...' : '');

    const parsed = extractQualificationsAndPreferences(jobOnlyDescription);


    await page.close();

    return {
        jobTitle,
        qualifications: parsed.qualifications,
        preferences: preferencesDiv || parsed.preferences,
        salary: salary || 'n/a',
        description: condensedDescription,
        benefits: benefits || 'Not specified',
        expectations: parsed.expectations 
    };
}


const axios = require('axios');

async function sendJobsToBackend() {
    const jobsData = JSON.parse(fs.readFileSync('indeed_jobs.json', 'utf-8'));
    const backendUrl = config.backend_url || 'http://localhost:8000/jobs-create';

    const headers = {
        'Content-Type': 'application/json',
    };

    for (const job of jobsData) {
        const payload = {
            job_name: job.jobTitle || 'Unknown',
            location: job.jobLocation || 'Unknown',
            salary: job.salary || 'Not specified',
            description: job.description || 'No description provided',
            company_name: job.company || 'Unknown',
            application_link: job.jobUrl || 'N/A',
            qualifications: job.qualifications || 'Not specified',
            preferences: job.preferences || 'Not specified',
            benefits: job.benefits || 'Not specified',
            expectations: job.expectations || 'Not specified' 
        };

        try {
            console.log("Sending job:", payload);
            const response = await axios.post(backendUrl, payload, { headers });
            console.log(` Successfully sent job to backend: ${payload.job_name}`);
        } catch (error) {
            console.error(` Failed to send job: ${payload.job_name}`, error.response?.data || error.message);
        }
    }
}

    async function mainScraper() {
    const browser = await puppeteer.launch({ headless: true });
    const keywords = ['Data Scientist', 'Data Analyst', 'Computer Scientist', 'Software Engineer', 'AI Manager', 'IT'];
    const locations = ['Dallas, TX'];
    const totalPages = 1;
    const results = [];

    console.log(`Crawl starting...`);

    cleanJobsFolder();

    const pagePromises = [];
    
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(locations)}&start=${pageNum * 10}`;
        const proxyUrl = getScrapeOpsUrl(url);
        
        console.log(`Navigating to page ${pageNum + 1}: ${url}`);

        pagePromises.push(crawlPage(browser, proxyUrl));
    }

    const allResults = await Promise.all(pagePromises);

    allResults.forEach(jobList => results.push(...jobList));

    fs.writeFileSync('indeed_jobs.json', JSON.stringify(results, null, 2));
    console.log('Crawling complete.');
    console.log('Saving results to indeed_jobs.json');
    await sendJobsToBackend();
    
    await browser.close();
};


const scrapeintervalmin = 1; 
async function runScraper() {
    await mainScraper();
    console.log(`Waiting for ${scrapeintervalmin} minutes before next scrape...`);
}

(async () => {
    await runScraper(); 
    setInterval(runScraper, scrapeintervalmin * 60 * 1000); 
})();
