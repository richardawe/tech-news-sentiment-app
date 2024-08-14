import React, { useState, useEffect } from 'react';

const NEWS_API_URL = 'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=technology&sort=LATEST&limit=50';
const QUOTE_API_URL = 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE';
const API_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY;
const MAX_API_CALLS_PER_DAY = 25;

const formatPublishedDate = (dateString) => {
  const year = dateString.slice(0, 4);
  const month = dateString.slice(4, 6);
  const day = dateString.slice(6, 8);
  const hour = dateString.slice(9, 11);
  const minute = dateString.slice(11, 13);
  const second = dateString.slice(13, 15);

  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  return date.toLocaleString();
};

const TickerModal = ({ ticker, onClose }) => {
  const [tickerData, setTickerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        const response = await fetch(`${QUOTE_API_URL}&symbol=${ticker}&apikey=${API_KEY}`);
        const data = await response.json();
        if (data['Error Message']) {
          throw new Error(data['Error Message']);
        }
        if (data['Note']) {
          throw new Error(data['Note']);
        }
        setTickerData(data['Global Quote']);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to fetch ticker data');
        setLoading(false);
      }
    };

    fetchTickerData();
  }, [ticker]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>{ticker} Details</h2>
        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}
        {tickerData && (
          <div>
            <p>Price: ${parseFloat(tickerData['05. price']).toFixed(2)}</p>
            <p>Change: {tickerData['09. change']} ({tickerData['10. change percent']})</p>
            <p>Volume: {tickerData['06. volume']}</p>
            <p>Last Updated: {tickerData['07. latest trading day']}</p>
          </div>
        )}
        <button onClick={onClose}>Close</button>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
        }
        .error {
          color: red;
        }
        button {
          margin-top: 10px;
          padding: 5px 10px;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

const App = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const canMakeApiCall = () => {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('lastApiCallDate');
    const apiCallCount = parseInt(localStorage.getItem('apiCallCount') || '0');

    if (storedDate !== today) {
      localStorage.setItem('lastApiCallDate', today);
      localStorage.setItem('apiCallCount', '0');
      return true;
    }

    return apiCallCount < MAX_API_CALLS_PER_DAY;
  };

  const incrementApiCallCount = () => {
    const count = parseInt(localStorage.getItem('apiCallCount') || '0');
    localStorage.setItem('apiCallCount', (count + 1).toString());
  };


  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      let result;
      if (canMakeApiCall()) {
        const response = await fetch(`${NEWS_API_URL}&apikey=${API_KEY}`);
        result = await response.json();
        
        if (result['Error Message']) {
          throw new Error(result['Error Message']);
        }
        
        if (result['Note']) {
          throw new Error(result['Note']);
        }

        localStorage.setItem('cachedNewsData', JSON.stringify(result));
        localStorage.setItem('lastFetchTime', new Date().getTime());
        incrementApiCallCount();
      } else {
        const cachedData = localStorage.getItem('cachedNewsData');
        if (cachedData) {
          result = JSON.parse(cachedData);
          setError("API call limit reached. Showing cached data.");
        } else {
          throw new Error("API call limit reached and no cached data available.");
        }
      }
      
      setData(result);
    } catch (err) {
      console.error('Error details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const formatNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 'N/A' : num.toFixed(2);
  };

  const getSentimentColor = (score) => {
    const num = parseFloat(score);
    if (isNaN(num)) return '#888';
    if (num < -0.35) return '#ff4136';
    if (num < -0.15) return '#ff851b';
    if (num < 0.15) return '#ffdc00';
    if (num < 0.35) return '#2ecc40';
    return '#3d9970';
  };

  const TechNewsSentimentDashboard = () => {
    if (error) {
      return (
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      );
    }

    if (!data || !data.feed) {
      return null;
    }

    return (
      <div className="dashboard">
        <h2>Technology News Sentiment</h2>
        
        <div className="news-container">
          {data.feed.map((item, index) => (
            <div key={index} className="news-item">
              <h3>{item.title}</h3>
              <div className="news-meta">
                <span className="source">{item.source}</span>
                <span className="date">{formatPublishedDate(item.time_published)}</span>
              </div>
              <div className="sentiment-score" style={{backgroundColor: getSentimentColor(item.overall_sentiment_score)}}>
                <span>Sentiment: {formatNumber(item.overall_sentiment_score)}</span>
                <span className="sentiment-label">{item.overall_sentiment_label}</span>
              </div>
              {item.ticker_sentiment && item.ticker_sentiment.length > 0 && (
                <div className="ticker-sentiment">
                  <h4>Related Tickers:</h4>
                  <div className="ticker-list">
                    {item.ticker_sentiment.map((ticker, tickerIndex) => (
                      <div key={tickerIndex} className="ticker" onClick={() => setSelectedTicker(ticker.ticker)}>
                        <span className="ticker-symbol">{ticker.ticker}</span>
                        <span className="ticker-relevance">Relevance: {formatNumber(ticker.relevance_score)}</span>
                        <span className="ticker-sentiment" style={{backgroundColor: getSentimentColor(ticker.ticker_sentiment_score)}}>
                          Sentiment: {formatNumber(ticker.ticker_sentiment_score)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="read-more">Read More</a>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <header>
        <h1>Tech Sentiment Pulse</h1>
      </header>
      {loading && <div className="loading">Loading data...</div>}
      <TechNewsSentimentDashboard />
      {selectedTicker && (
        <TickerModal 
          ticker={selectedTicker} 
          onClose={() => setSelectedTicker(null)} 
        />
      )}

      <style jsx>{`
        :root {
          --primary-color: #3498db;
          --background-color: #f4f4f4;
          --card-background: #ffffff;
          --text-color: #333333;
          --meta-color: #888888;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: var(--text-color);
          background-color: var(--background-color);
          margin: 0;
          padding: 0;
        }

        .app {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        header {
          background-color: var(--primary-color);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        h1 {
          margin: 0;
        }

        .dashboard h2 {
          color: var(--primary-color);
          border-bottom: 2px solid var(--primary-color);
          padding-bottom: 10px;
          margin-bottom: 20px;
        }

        .news-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .news-item {
          background-color: var(--card-background);
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 20px;
          transition: transform 0.3s ease;
        }

        .news-item:hover {
          transform: translateY(-5px);
        }

        .news-item h3 {
          margin-top: 0;
          color: var(--primary-color);
        }

        .news-meta {
          display: flex;
          justify-content: space-between;
          color: var(--meta-color);
          margin-bottom: 10px;
          font-size: 0.9em;
        }

        .sentiment-score {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border-radius: 4px;
          color: white;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .ticker-sentiment h4 {
          margin-bottom: 10px;
          color: var(--primary-color);
        }

        .ticker-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .ticker {
          background-color: #ecf0f1;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 0.9em;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }

        .ticker:hover {
          background-color: #d5dbdb;
        }

        .ticker-symbol {
          font-weight: bold;
          margin-right: 5px;
        }

        .ticker-sentiment {
          color: white;
          padding: 2px 5px;
          border-radius: 3px;
          margin-left: 5px;
        }

        .read-more {
          display: inline-block;
          margin-top: 10px;
          color: var(--primary-color);
          text-decoration: none;
          font-weight: bold;
        }

        .read-more:hover {
          text-decoration: underline;
        }

        .loading {
          text-align: center;
          font-size: 1.2em;
          margin: 20px 0;
        }

        .error {
          background-color: #ff4136;
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

export default App;