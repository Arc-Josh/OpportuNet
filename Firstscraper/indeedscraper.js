const axios = require('axios');
const fs = require('fs');
const path = require('path');
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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    console.log(`Navigating to job listing page: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Try multiple modern Indeed selectors
    let jobListings = await page.$$('div[data-testid="jobCard"]');
    if (jobListings.length === 0) {
        jobListings = await page.$$('div.cardOutline');
    }
    if (jobListings.length === 0) {
        jobListings = await page.$$('div.slider_item');
    }

    console.log(`Found ${jobListings.length} job listings on this page.`);

    const jobs = [];

    for (const job of jobListings) {
        try {
            const jobTitle = await job.$eval('h2', el => el.innerText.trim()).catch(() => 'Unknown Job');

            // ✅ New company and location selectors
            const company = await job.$eval('[data-testid="company-name"]', el => el.innerText.trim()).catch(() =>
                job.$eval('.companyName', el => el.innerText.trim()).catch(() => 'Unknown Company')
            );

            const jobLocation = await job.$eval('[data-testid="text-location"]', el => el.innerText.trim()).catch(() =>
                job.$eval('.companyLocation', el => el.innerText.trim()).catch(() => 'Unknown Location')
            );

            // ✅ Get correct job key
            const jobKey = await job.$eval('a', el => el.getAttribute('data-jk')).catch(() => null);
            if (!jobKey) continue;

            const jobUrl = `https://www.indeed.com/viewjob?jk=${jobKey}`;
            console.log(`Found job listing: ${jobTitle} at ${jobUrl}`);

            const proxyJobUrl = getScrapeOpsUrl(jobUrl);
            const details = await scrapeJobDetails(browser, proxyJobUrl, jobTitle);

            jobs.push({
                jobTitle,
                company,
                jobLocation,
                jobUrl,
                salary: details.salary || null,
                benefits: details.benefits || null,
                qualifications: details.qualifications || null,
                description: details.description || null,
                preferences: details.preferences || null,
                responsibilities: details.responsibilities || null,
              });
            

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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
  
    const success = await retryPageGoto(page, jobUrl);
    if (!success) {
      await page.close();
      return {
        salary: "Not specified",
        description: "No description provided",
        responsibilities: [],
        qualifications: [],
        preferences: [],
        benefits: []
      };
    }
  
    try {
      await page.waitForSelector('#jobDescriptionText, .jobsearch-jobDescriptionText', { timeout: 8000 });
    } catch (_) {
      await new Promise(res => setTimeout(res, 1500));
    }
  
    const jobText = await page.evaluate(() => {
      const root = document.querySelector('#jobDescriptionText, .jobsearch-jobDescriptionText');
      if (!root) return '';
      const parts = [];
      root.querySelectorAll('h1,h2,h3,h4,p,li,div').forEach(n => {
        const t = (n.innerText || '').trim();
        if (t) parts.push(t);
      });
      return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    });
  
    const salary = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="salary"], #salaryInfoAndJobType');
      return el ? el.innerText.trim() : '';
    });
  
    await page.close();
  
    try {
      const { data: aiData } = await axios.post(
        "http://127.0.0.1:8000/parse-job-description",
        { text: jobText },
        { headers: { "Content-Type": "application/json" }, timeout: 20000 }
      );
  
      return {
        salary: salary || "Not specified",
        description: aiData.description || "No description provided",
        responsibilities: aiData.responsibilities || [],
        qualifications: aiData.qualifications || [],
        preferences: aiData.preferences || [],
        benefits: aiData.benefits || []
      };
    } catch (err) {
      console.error(`AI parse failed for ${jobTitle}: ${err.message}`);
      return {
        salary: salary || "Not specified",
        description: jobText || "No description provided",
        responsibilities: [],
        qualifications: [],
        preferences: [],
        benefits: []
      };
    }
}

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
  
    const asBlock = (arrOrStr) => {
      if (!arrOrStr) return null;
      if (Array.isArray(arrOrStr)) {
        const cleaned = arrOrStr
          .map(s => (s || '').toString().trim())
          .filter(Boolean);
        if (!cleaned.length) return null;
        // Store as nice bullet block so your frontend renders cleanly
        return cleaned.map(s => `• ${s}`).join('\n');
      }
      return arrOrStr.toString();
    };
  
    for (const job of jobsData) {
      const payload = {
        job_name: job.jobTitle || 'Unknown',
        company_name: job.company || 'Unknown',
        location: job.jobLocation || 'Unknown',
        salary: job.salary || null,
        description: (job.description && job.description.trim()) ? job.description.trim() : null,
        responsibilities: asBlock(job.responsibilities),
        qualifications: asBlock(job.qualifications),
        preferences: asBlock(job.preferences),
        benefits: asBlock(job.benefits),
        application_link: job.jobUrl || 'N/A',
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
    const keywords = ['Data Scientist'];
    const locations = ['Dallas, TX'];  
    const totalPages = 1;
    const results = [];

    console.log(`\n========== Job Scraping Started ==========`);

    cleanJobsFolder();

    for (const kw of keywords) {
        for (const loc of locations) {
            console.log(`\nSearching for "${kw}" in ${loc}`);

            for (let pageNum = 0; pageNum < totalPages; pageNum++) {
                const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(kw)}&l=${encodeURIComponent(loc)}&start=${pageNum * 10}`;
                
                const proxyUrl = getScrapeOpsUrl(url);

                console.log(`Page ${pageNum + 1}: ${url}`);

                const pageResults = await crawlPage(browser, proxyUrl);
                results.push(...pageResults);
            }
        }
    }

    // ✅ Save results
    fs.writeFileSync('indeed_jobs.json', JSON.stringify(results, null, 2));
    console.log(`\n✓ Saved ${results.length} jobs to indeed_jobs.json`);

    // ✅ Send results to backend
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



