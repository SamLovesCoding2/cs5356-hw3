const API_KEY = 'UO7PRRSR2FVNBFDZ';
const BASE_URL = 'https://www.alphavantage.co/query';
const CACHE_DURATION = 5 * 60 * 1000;
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

function createStockChart(timeSeriesData, symbol) {
    d3.select("#stock-chart").html("");

    const data = Object.entries(timeSeriesData).map(([date, values]) => ({
        date: new Date(date),
        price: parseFloat(values['4. close'])
    })).sort((a, b) => a.date - b.date);

    const margin = {top: 50, right: 30, bottom: 50, left: 60};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#stock-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(data, d => d.price) * 0.95,
            d3.max(data, d => d.price) * 1.05
        ])
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y));

    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.price));

    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#2196F3")
        .attr("stroke-width", 2)
        .attr("d", line);

    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "chart-tooltip")
        .style("opacity", 0);

    const bisect = d3.bisector(d => d.date).left;

    const verticalLine = svg.append("line")
        .attr("y1", 0)
        .attr("y2", height)
        .style("stroke", "#999")
        .style("stroke-width", 1)
        .style("opacity", 0);

    const point = svg.append("circle")
        .attr("r", 5)
        .style("fill", "#2196F3")
        .style("opacity", 0);

    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mousemove", function(event) {
            const x0 = x.invert(d3.pointer(event, this)[0]);
            const i = bisect(data, x0, 1);
            const d0 = data[i - 1];
            const d1 = data[i];
            const d = x0 - d0.date > d1.date - x0 ? d1 : d0;

            tooltip.transition()
                .duration(50)
                .style("opacity", .9);
            tooltip.html(`Date: ${d.date.toLocaleDateString()}<br/>Price: $${d.price.toFixed(2)}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");

            verticalLine
                .attr("x1", x(d.date))
                .attr("x2", x(d.date))
                .style("opacity", 1);

            point
                .attr("cx", x(d.date))
                .attr("cy", y(d.price))
                .style("opacity", 1);
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
            verticalLine.style("opacity", 0);
            point.style("opacity", 0);
        });

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(`${symbol.toUpperCase()} Stock Price History`);
}

async function displayStockData(date, data, symbol) {
    const stockInfo = document.getElementById('stock-info');
    const stockChart = document.getElementById('stock-chart');
    
    stockInfo.style.display = 'block';
    stockChart.style.display = 'block';
    
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

    const stockData = await fetchStockData(symbol);
    createStockChart(stockData['Time Series (Daily)'], symbol);
}

function displayError(message) {
    const stockInfo = document.getElementById('stock-info');
    const stockChart = document.getElementById('stock-chart');
    
    stockInfo.style.display = 'block';
    stockChart.style.display = 'none';
    
    stockInfo.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <p>Please try another stock symbol.</p>
        </div>
    `;
}

function clearPreviousResults() {
    const stockInfo = document.getElementById('stock-info');
    const stockChart = document.getElementById('stock-chart');
    
    stockInfo.style.display = 'none';
    stockChart.style.display = 'none';
    stockInfo.innerHTML = '';
    stockChart.innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('search-button');
    const stockInput = document.getElementById('stock-input');
    
    clearPreviousResults();

    searchButton.addEventListener('click', async () => {
        const symbol = stockInput.value.trim();
        if (!symbol) {
            displayError('Please enter a stock symbol');
            return;
        }

        clearPreviousResults();

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