const axios = require('axios');
const cheerio = require('cheerio');
 
const url = 'https://www.turmerry.com/collections/organic-cotton-sheet-sets/products/percale-natural-color-organic-sheet-sets';
 
axios(url).then(response => {
    const html = response.data;
    const $ = cheerio.load(html);
 
    const salePrice = $('.hulkbaseprice .new-price').text();
 
    console.log(salePrice);
}).catch(console.error);