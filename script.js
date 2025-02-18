
const API_KEY = 'UO7PRRSR2FVNBFDZ';
const BASE_URL = 'https://www.alphavantage.co/query';

async function fetchStockData(symbol) {
    try {
        const response = await fetch(`${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching stock data:', error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const stockData = await fetchStockData('Palantir');
        console.log('Stock Data:', stockData);
        

        const timeSeriesData = stockData['Time Series (Daily)'];
        if (timeSeriesData) {
            const latestDate = Object.keys(timeSeriesData)[0];
            const latestData = timeSeriesData[latestDate];
            displayStockData(latestDate, latestData);
        }
    } catch (error) {
        console.error('Failed to load stock data:', error);
    }
});

function displayStockData(date, data) {
    const stockInfo = document.getElementById('stock-info');
    if (stockInfo && data) {
        stockInfo.innerHTML = `
            <h3>Stock Data for ${date}</h3>
            <p>Open: ${data['1. open']}</p>
            <p>High: ${data['2. high']}</p>
            <p>Low: ${data['3. low']}</p>
            <p>Close: ${data['4. close']}</p>
            <p>Volume: ${data['5. volume']}</p>
        `;
    }
}