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
        const jobSalary = await job.$eval('[data-testid="salary"]', el => el.innerText.trim()).catch(() => 'n/a');
        const jobSalaryText = jobSalary.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters


        const jobAnchor = await job.$('a');
        const href = await page.evaluate(anchor => anchor?.getAttribute('href') || '', jobAnchor);

        const urlObj = new URL(href, 'https://www.indeed.com');
        const jobKey = urlObj.searchParams.get('jk');
        
        let jobUrl = '';
        if (jobKey) {
            jobUrl = `https://www.indeed.com/viewjob?jk=${jobKey}`;
            console.log(`Found job listing at: ${jobUrl}`);
            jobs.push({ jobTitle, company, jobLocation, jobSalary, jobUrl });

            const proxyJobUrl = getScrapeOpsUrl(jobUrl);
            await scrapeJobDetails(browser, proxyJobUrl, jobTitle);
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
    const success = await retryPageGoto(page, jobUrl);

    if (!success) {
        console.log(`Failed to load job details for: ${jobTitle}. Skipping.`);
        await page.close();
        return;
    }

    const salary = await page.$eval("div[id='salaryInfoAndJobContainer']", el => el?.innerText.trim() || 'n/a').catch(() => 'n/a');
    const description = await page.$eval("div[id='jobDescriptionText']", el => el?.innerText.trim() || 'n/a').catch(() => 'n/a');
    const benefits = await page.$eval("div[id='benefits']", el => el?.innerText.trim() || 'n/a').catch(() => 'n/a');
   
    const jobData = { jobTitle, salary, description, benefits };
    const csv = parse([jobData]);

    const sanitizedTitle = jobTitle.replace(/[<>:"\/\\|?*]+/g, '');

    const filePath = path.join(jobsDir, `${sanitizedTitle}.csv`);
    fs.writeFileSync(filePath, csv);

    console.log(`Saved job details to ${filePath}`);

    await page.close();
}


(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const keyword = 'Data';
    const location = 'Dallas, TX';
    const totalPages = 2;
    const results = [];

    console.log(`Crawl starting...`);

    cleanJobsFolder();

    const pagePromises = [];
    
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(location)}&start=${pageNum * 10}`;
        const proxyUrl = getScrapeOpsUrl(url);
        
        console.log(`Navigating to page ${pageNum + 1}: ${url}`);

        pagePromises.push(crawlPage(browser, proxyUrl));
    }

    const allResults = await Promise.all(pagePromises);

    allResults.forEach(jobList => results.push(...jobList));

    fs.writeFileSync('indeed_jobs.json', JSON.stringify(results, null, 2));
    console.log('Crawling complete.');
    console.log('Saving results to indeed_jobs.json');
    
    await browser.close();
})();