import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  CircleDollarSign,
  Link2,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WalletCards,
  Zap
} from 'lucide-react';
import './styles.css';

const COINS_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=80&page=1&sparkline=true&price_change_percentage=1h,24h,7d';

const FALLBACK_COINS = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', current_price: 69240, price_change_percentage_24h: 1.8, market_cap_rank: 1, total_volume: 31500000000, image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'eth', current_price: 3820, price_change_percentage_24h: -0.7, market_cap_rank: 2, total_volume: 14200000000, image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
  { id: 'solana', name: 'Solana', symbol: 'sol', current_price: 168.4, price_change_percentage_24h: 4.2, market_cap_rank: 5, total_volume: 4200000000, image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
  { id: 'chainlink', name: 'Chainlink', symbol: 'link', current_price: 18.32, price_change_percentage_24h: 2.4, market_cap_rank: 15, total_volume: 720000000, image: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png' },
  { id: 'near', name: 'NEAR Protocol', symbol: 'near', current_price: 7.05, price_change_percentage_24h: -1.1, market_cap_rank: 20, total_volume: 540000000, image: 'https://assets.coingecko.com/coins/images/10365/large/near.jpg' }
];

const exchanges = [
  { name: 'Binance', state: 'Ready', pairs: '1,240+' },
  { name: 'Coinbase', state: 'Ready', pairs: '410+' },
  { name: 'Kraken', state: 'Ready', pairs: '680+' },
  { name: 'OKX', state: 'Ready', pairs: '760+' }
];

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value > 100 ? 0 : value > 1 ? 2 : 6
  }).format(value);
}

function formatCompact(value) {
  if (!Number.isFinite(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

function SparkLine({ points = [], positive }) {
  const path = useMemo(() => {
    const source = points.length ? points : [1, 1.2, 0.95, 1.35, 1.18, 1.5];
    const min = Math.min(...source);
    const max = Math.max(...source);
    const spread = max - min || 1;

    return source
      .slice(-28)
      .map((point, index, arr) => {
        const x = (index / Math.max(arr.length - 1, 1)) * 116;
        const y = 36 - ((point - min) / spread) * 30;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [points]);

  return (
    <svg className="sparkline" viewBox="0 0 116 42" role="img" aria-label="price movement">
      <path className={positive ? 'sparklineUp' : 'sparklineDown'} d={path} />
    </svg>
  );
}

function App() {
  const [coins, setCoins] = useState(FALLBACK_COINS);
  const [query, setQuery] = useState('');
  const [aiGuided, setAiGuided] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [error, setError] = useState('');

  async function loadMarkets() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(COINS_URL, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error('Market feed unavailable');
      const data = await response.json();
      setCoins(data);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setError('Live feed is warming up. Showing cached market view.');
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMarkets();
    const timer = setInterval(loadMarkets, 60000);
    return () => clearInterval(timer);
  }, []);

  const filteredCoins = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return coins;
    return coins.filter((coin) => {
      return coin.name.toLowerCase().includes(needle) || coin.symbol.toLowerCase().includes(needle);
    });
  }, [coins, query]);

  const topMovers = useMemo(() => {
    return [...coins]
      .filter((coin) => Number.isFinite(coin.price_change_percentage_24h))
      .sort((a, b) => Math.abs(b.price_change_percentage_24h) - Math.abs(a.price_change_percentage_24h))
      .slice(0, 4);
  }, [coins]);

  const marketPulse = useMemo(() => {
    const visible = coins.slice(0, 30);
    const gainers = visible.filter((coin) => coin.price_change_percentage_24h > 0).length;
    return Math.round((gainers / Math.max(visible.length, 1)) * 100);
  }, [coins]);

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark"><Bot size={22} /></div>
          <div>
            <strong>TradePilot</strong>
            <span>Crypto command desk</span>
          </div>
        </div>

        <nav className="navStack" aria-label="Main navigation">
          <a className="active" href="#markets"><Activity size={18} /> Markets</a>
          <a href="#guided"><Sparkles size={18} /> AI Guided</a>
          <a href="#exchanges"><Link2 size={18} /> Exchanges</a>
          <a href="#risk"><ShieldCheck size={18} /> Risk Controls</a>
        </nav>

        <section className="exchangePanel" id="exchanges">
          <div className="panelTitle">
            <span>Exchange Links</span>
            <WalletCards size={18} />
          </div>
          {exchanges.map((exchange) => (
            <div className="exchangeRow" key={exchange.name}>
              <div>
                <strong>{exchange.name}</strong>
                <span>{exchange.pairs} pairs</span>
              </div>
              <span className="readyDot"><Check size={13} /> {exchange.state}</span>
            </div>
          ))}
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Live market pricing</p>
            <h1>Crypto trading bot dashboard</h1>
          </div>
          <button className="refreshButton" type="button" onClick={loadMarkets} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </header>

        <section className="controlBand" id="guided">
          <div className="aiCard">
            <div className="aiIcon"><Sparkles size={24} /></div>
            <div>
              <span>AI guided trading</span>
              <strong>{aiGuided ? 'Active strategy guidance' : 'Manual market view'}</strong>
            </div>
            <button
              type="button"
              className={`switch ${aiGuided ? 'on' : ''}`}
              aria-pressed={aiGuided}
              onClick={() => setAiGuided((value) => !value)}
            >
              <span />
            </button>
          </div>

          <div className="metricStrip">
            <div>
              <span>Market pulse</span>
              <strong>{marketPulse}%</strong>
            </div>
            <div>
              <span>Tracked assets</span>
              <strong>{coins.length}</strong>
            </div>
            <div>
              <span>Updated</span>
              <strong>{lastUpdated || 'Now'}</strong>
            </div>
          </div>
        </section>

        <section className="insightsGrid">
          <div className="signalPanel">
            <div className="panelTitle">
              <span>Bot Signal</span>
              <Zap size={18} />
            </div>
            <h2>{aiGuided ? 'Scanning momentum, volume, and trend strength' : 'Guidance paused'}</h2>
            <p>
              {aiGuided
                ? 'The assistant is watching high-volume assets and highlighting clean trend shifts.'
                : 'Turn on guidance when you want the bot to surface trade ideas from the live feed.'}
            </p>
            <div className="signalStats">
              <span><CircleDollarSign size={16} /> USD market view</span>
              <span><ShieldCheck size={16} /> Risk aware</span>
            </div>
          </div>

          <div className="moversPanel">
            <div className="panelTitle">
              <span>Fast Movers</span>
              <SlidersHorizontal size={18} />
            </div>
            {topMovers.map((coin) => {
              const positive = coin.price_change_percentage_24h >= 0;
              return (
                <div className="moverRow" key={coin.id}>
                  <img src={coin.image} alt="" />
                  <div>
                    <strong>{coin.symbol.toUpperCase()}</strong>
                    <span>{coin.name}</span>
                  </div>
                  <b className={positive ? 'positive' : 'negative'}>
                    {positive ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2)}%
                  </b>
                </div>
              );
            })}
          </div>
        </section>

        <section className="marketSection" id="markets">
          <div className="marketHeader">
            <div>
              <h2>Token Prices</h2>
              <p>{error || 'Current prices from a free public crypto market API.'}</p>
            </div>
            <label className="searchBox">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search token"
                aria-label="Search token"
              />
            </label>
          </div>

          <div className="tableShell">
            <div className="tableHead">
              <span>Asset</span>
              <span>Price</span>
              <span>24h</span>
              <span>Volume</span>
              <span>Trend</span>
            </div>
            <div className="tokenList">
              {filteredCoins.slice(0, 24).map((coin) => {
                const positive = coin.price_change_percentage_24h >= 0;
                return (
                  <article className="tokenRow" key={coin.id}>
                    <div className="assetCell">
                      <img src={coin.image} alt="" />
                      <div>
                        <strong>{coin.name}</strong>
                        <span>#{coin.market_cap_rank || '-'} {coin.symbol.toUpperCase()}</span>
                      </div>
                    </div>
                    <strong>{formatCurrency(coin.current_price)}</strong>
                    <span className={positive ? 'positive changePill' : 'negative changePill'}>
                      {positive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                      {positive ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2) || '0.00'}%
                    </span>
                    <span>${formatCompact(coin.total_volume)}</span>
                    <SparkLine points={coin.sparkline_in_7d?.price} positive={positive} />
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
