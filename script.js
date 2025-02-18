const API_KEY = 'UO7PRRSR2FVNBFDZ';
const BASE_URL = 'https://www.alphavantage.co/query';

// Cache management
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const getStockCacheKey = (symbol) => `stockData_${symbol}`;
const getTimestampCacheKey = (symbol) => `timestamp_${symbol}`;

async function fetchStockData(symbol) {
    try {
        const cacheKey = getStockCacheKey(symbol);
        const timestampKey = getTimestampCacheKey(symbol);
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTimestamp = localStorage.getItem(timestampKey);

        if (cachedData && cachedTimestamp) {
            const age = Date.now() - parseInt(cachedTimestamp);
            if (age < CACHE_DURATION) {
                return JSON.parse(cachedData);
            }
        }

        const response = await fetch(`${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }

        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(timestampKey, Date.now().toString());
        
        return data;
    } catch (error) {
        console.error('Error fetching stock data:', error);
        throw error;
    }
}

function displayStockData(date, data, symbol) {
    const stockInfo = document.getElementById('stock-info');
    stockInfo.innerHTML = `
        <h3>Stock Data for ${symbol.toUpperCase()} - ${date}</h3>
        <div class="stock-details">
            <p>Open: $${parseFloat(data['1. open']).toFixed(2)}</p>
            <p>High: $${parseFloat(data['2. high']).toFixed(2)}</p>
            <p>Low: $${parseFloat(data['3. low']).toFixed(2)}</p>
            <p>Close: $${parseFloat(data['4. close']).toFixed(2)}</p>
            <p>Volume: ${parseInt(data['5. volume']).toLocaleString()}</p>
        </div>
        <p class="last-updated">Last updated: ${new Date().toLocaleString()}</p>
    `;

    // Add hover effect to show percentage change
    const closePrice = parseFloat(data['4. close']);
    const openPrice = parseFloat(data['1. open']);
    const percentChange = ((closePrice - openPrice) / openPrice * 100).toFixed(2);
    
    stockInfo.addEventListener('mousemove', (e) => {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.innerHTML = `Change: ${percentChange}%`;
        tooltip.style.left = `${e.pageX + 10}px`;
        tooltip.style.top = `${e.pageY + 10}px`;
        document.querySelectorAll('.tooltip').forEach(t => t.remove());
        document.body.appendChild(tooltip);
    });

    stockInfo.addEventListener('mouseleave', () => {
        document.querySelectorAll('.tooltip').forEach(t => t.remove());
    });
}

function displayError(message) {
    const stockInfo = document.getElementById('stock-info');
    stockInfo.innerHTML = `
        <div class="error-message">
            <p> ${message}</p>
            <p>Please try another stock symbol.</p>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('search-button');
    const stockInput = document.getElementById('stock-input');
    searchButton.addEventListener('click', async () => {
        const symbol = stockInput.value.trim();
        if (!symbol) {
            displayError('Please enter a stock symbol');
            return;
        }

        try {
            const stockData = await fetchStockData(symbol);
            const timeSeriesData = stockData['Time Series (Daily)'];
            
            if (timeSeriesData) {
                const latestDate = Object.keys(timeSeriesData)[0];
                const latestData = timeSeriesData[latestDate];
                displayStockData(latestDate, latestData, symbol);
            } else {
                displayError('No data found for this stock symbol');
            }
        } catch (error) {
            displayError('Failed to fetch stock data');
        }
    });

    stockInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchButton.click();
        }
    });
});