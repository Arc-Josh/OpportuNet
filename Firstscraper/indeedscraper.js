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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log(`Navigating to job listing page: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for job listings to load
    await page.waitForSelector('[data-testid="slider_item"]', { timeout: 15000 }).catch(() => {
        console.warn('Job listings selector not found, continuing anyway...');
    });

    const jobListings = await page.$$('[data-testid="slider_item"]');
    const jobs = [];

    console.log(`Found ${jobListings.length} job listings on this page.`);

    for (const job of jobListings) {
        try {
            const jobTitle = await job.$eval('h2', el => el.innerText.trim()).catch(() => 'Unknown Job');
            const company = await job.$eval('[data-testid="company-name"]', el => el.innerText.trim()).catch(() => 'Unknown Company');
            const jobLocation = await job.$eval('[data-testid="text-location"]', el => el.innerText.trim()).catch(() => 'Unknown Location');

            const jobAnchor = await job.$('a');
            const href = await page.evaluate(anchor => anchor?.getAttribute('href') || '', jobAnchor);

            const urlObj = new URL(href, 'https://www.indeed.com');
            const jobKey = urlObj.searchParams.get('jk');
            
            let jobUrl = '';
            if (jobKey) {
                jobUrl = `https://www.indeed.com/viewjob?jk=${jobKey}`;
                console.log(`Found job listing: ${jobTitle} at ${jobUrl}`);
                const proxyJobUrl = getScrapeOpsUrl(jobUrl);
                const details = await scrapeJobDetails(browser, proxyJobUrl, jobTitle);

                jobs.push({
                    jobTitle,
                    company,
                    jobLocation,
                    jobUrl,
                    salary: details.salary,
                    benefits: details.benefits,
                    qualifications: details.qualifications,
                    description: details.description,
                    preferences: details.preferences
                });
            } else {
                console.warn(`No job key found for ${jobTitle}, skipping.`);
            }
        } catch (err) {
            console.error(`Failed to process job listing: ${err.message}`);
        }
    }

    await page.close();
    return jobs;
}

async function retryPageGoto(page, url, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Attempt ${attempt} to navigate to: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            return true;  // Return true if successful
        } catch (error) {
            if (error.name === 'TimeoutError') {
                console.error(`Timeout error during navigation (Attempt ${attempt}): ${error.message}`);
            } else {
                console.error(`Error navigating to ${url} (Attempt ${attempt}): ${error.message}`);
            }

            if (attempt === retries) {
                console.log(`Failed to navigate to ${url} after ${retries} attempts. Skipping...`);
                return false;  // Return false after final failure
            }
        }
    }
}



async function scrapeJobDetails(browser, jobUrl, jobTitle) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    
    const success = await retryPageGoto(page, jobUrl);

    if (!success) {
        await page.close();
        return { 
            jobTitle, 
            qualifications: 'Not specified', 
            preferences: 'Not specified', 
            salary: 'Not specified', 
            description: 'No description provided', 
            benefits: 'Not specified', 
        };
    }

    // Wait a moment for page to settle
    await new Promise(res => setTimeout(res, 2000));

    // Remove ads and popups
    await page.evaluate(() => {
        document.querySelectorAll('.modal, footer, .adsbygoogle, iframe, [role="dialog"]').forEach(el => el.remove());
    });

    // Extract job details using page.evaluate for better control
    const jobData = await page.evaluate(() => {
        const result = {
            description: 'No description provided',
            salary: 'Not specified',
            benefits: 'Not specified',
            qualifications: 'Not specified',
            preferences: 'Not specified'
        };

        // Get the main job description container
        const jobDescContainer = document.querySelector("div[id='jobDescriptionText']");
        
        if (jobDescContainer) {
            // Get the full text content
            const fullText = jobDescContainer.innerText.trim();
            
            // Just store the entire description as-is without trying to split it
            result.description = fullText || 'No description provided';
        }

        // Extract salary information
        const salaryDiv = document.querySelector("div[id='salaryInfoAndJobType']");
        if (salaryDiv) {
            result.salary = salaryDiv.innerText.trim();
        }

        // Extract benefits - try multiple selectors
        const benefitsDiv = document.querySelector("div[id='benefits']") || 
                           document.querySelector("[class*='benefit']") ||
                           document.querySelector("[data-testid*='benefit']");
        if (benefitsDiv) {
            const benefitsText = benefitsDiv.innerText.trim();
            if (benefitsText && benefitsText.length > 0) {
                result.benefits = benefitsText;
            }
        }

        // For qualifications and preferences, only extract if they exist as separate elements
        // Don't try to parse them from the description
        const qualDiv = document.querySelector("div[id='qualifications']");
        if (qualDiv) {
            result.qualifications = qualDiv.innerText.trim();
        }

        const prefDiv = document.querySelector("div[id='preferences']");
        if (prefDiv) {
            result.preferences = prefDiv.innerText.trim();
        }

        return result;
    });

    console.log(`Scraped job details for: ${jobTitle}`);
    await page.close();

    return {
        jobTitle,
        qualifications: jobData.qualifications,
        preferences: jobData.preferences,
        salary: jobData.salary,
        description: jobData.description,
        benefits: jobData.benefits,
    };
}


const axios = require('axios');

const failedJobs = [];

async function postJobWithRetry(payload, backendUrl, retries = 3, delayMs = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Posting to ${backendUrl} (attempt ${attempt}): ${payload.job_name}`);
            const resp = await axios.post(backendUrl, payload, { 
                headers: { 'Content-Type': 'application/json' }, 
                timeout: 15000 
            });
            console.log(`Backend response status: ${resp.status} for ${payload.job_name}`);
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
            console.warn(`POST attempt ${attempt} failed for ${payload.job_name}: ${errMsg}`);
            
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, delayMs));
            } else {
                // Final failure - log to failed jobs
                failedJobs.push({ payload, error: errMsg });
                try {
                    fs.writeFileSync('failed_jobs.json', JSON.stringify(failedJobs, null, 2));
                } catch (writeErr) {
                    console.error('Failed to write failed_jobs.json:', writeErr.message);
                }
                return { success: false, error: errMsg };
            }
        }
    }
}

async function sendJobsToBackend() {
    const jobsData = JSON.parse(fs.readFileSync('indeed_jobs.json', 'utf-8'));
    const backendUrl = config.backend_url || 'http://localhost:8000/jobs-create';

    for (const job of jobsData) {
        const payload = {
            job_name: job.jobTitle || 'Unknown',
            location: job.location || 'Unknown',
            salary: job.salary || 'Not specified',
            description: job.description || 'No description provided',
            company_name: job.company_name || 'Unknown',
            application_link: job.jobUrl || 'N/A',
            qualifications: job.qualifications || 'Not specified',
            preferences: job.preferences || 'Not specified',
            benefits: job.benefits || 'Not specified',
        };

        const res = await postJobWithRetry(payload, backendUrl, 3, 2000);
        if (res.success) {
            console.log(`✓ Posted job to backend: ${payload.job_name}`);
        } else {
            console.error(`✗ Failed to post job after retries: ${payload.job_name}`, res.error);
        }
    }
}

async function mainScraper() {
    const browser = await puppeteer.launch({ headless: true });
    const keywords = ['Data Scientist', 'Data Analyst', 'Computer Scientist', 'Software Engineer', 'AI Manager', 'IT'];
    const locations = ['Dallas, TX'];
    const totalPages = 1;
    const results = [];

    console.log(`\n========== Job Scraping Started ==========`);
    console.log(`Keyword: ${keyword}`);
    console.log(`Location: ${location}`);
    console.log(`Pages to scrape: ${totalPages}`);

    cleanJobsFolder();

    const pagePromises = [];
    
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(locations)}&start=${pageNum * 10}`;
        const proxyUrl = getScrapeOpsUrl(url);
        
        console.log(`\n--- Page ${pageNum + 1} ---`);
        console.log(`URL: ${url}`);

        pagePromises.push(crawlPage(browser, proxyUrl));
    }

    const allResults = await Promise.all(pagePromises);

    allResults.forEach(jobList => results.push(...jobList));

    fs.writeFileSync('indeed_jobs.json', JSON.stringify(results, null, 2));
    console.log(`\n✓ Crawling complete.`);
    console.log(`✓ Saved ${results.length} jobs to indeed_jobs.json`);
    
    console.log(`\n========== Sending Jobs to Backend ==========`);
    await sendJobsToBackend();
    
    await browser.close();
    console.log(`\n========== Scraping Completed Successfully ==========\n`);
}


const scrapeintervalmin = 1; 
async function runScraper() {
    await mainScraper();
    console.log(`Waiting for ${scrapeintervalmin} minutes before next scrape...`);
}

(async () => {
    await runScraper(); 
    setInterval(runScraper, scrapeintervalmin * 60 * 1000); 
})();
