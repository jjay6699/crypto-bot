import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  Link2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
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

const quotes = ['USDT', 'USDC', 'USD', 'BTC', 'ETH'];

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
  const [selectedCoinId, setSelectedCoinId] = useState('bitcoin');
  const [selectedQuote, setSelectedQuote] = useState('USDT');
  const [selectedExchange, setSelectedExchange] = useState('Binance');
  const [stopLoss, setStopLoss] = useState('3.5');
  const [takeProfit, setTakeProfit] = useState('8');
  const [allocation, setAllocation] = useState('15');
  const [tradeSide, setTradeSide] = useState('buy');
  const [tradeAmount, setTradeAmount] = useState('0.10');
  const [activeTradingCoinId, setActiveTradingCoinId] = useState('bitcoin');
  const [activePairs, setActivePairs] = useState([
    { id: 'btc-usdt', base: 'BTC', quote: 'USDT', exchange: 'Binance', stopLoss: '3.5', takeProfit: '8', allocation: '15' },
    { id: 'eth-usdc', base: 'ETH', quote: 'USDC', exchange: 'Coinbase', stopLoss: '4', takeProfit: '9.5', allocation: '12' }
  ]);

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

  const selectedCoin = useMemo(() => {
    return coins.find((coin) => coin.id === selectedCoinId) || coins[0] || FALLBACK_COINS[0];
  }, [coins, selectedCoinId]);

  const activeTradingCoin = useMemo(() => {
    return coins.find((coin) => coin.id === activeTradingCoinId) || coins[0] || FALLBACK_COINS[0];
  }, [coins, activeTradingCoinId]);

  const chartCandles = useMemo(() => {
    const prices = activeTradingCoin?.sparkline_in_7d?.price || [];
    const source = prices.length > 20 ? prices.slice(-56) : Array.from({ length: 56 }, (_, index) => {
      const base = activeTradingCoin?.current_price || 100;
      return base + Math.sin(index / 3) * base * 0.015 + Math.cos(index / 5) * base * 0.01;
    });
    const min = Math.min(...source);
    const max = Math.max(...source);
    const spread = max - min || 1;

    return source.slice(-44).map((price, index, arr) => {
      const previous = arr[index - 1] || price * 0.997;
      const open = previous;
      const close = price;
      const high = Math.max(open, close) * (1 + ((index % 5) + 1) / 1200);
      const low = Math.min(open, close) * (1 - ((index % 4) + 1) / 1300);
      return {
        id: `${index}-${price}`,
        positive: close >= open,
        top: ((max - high) / spread) * 100,
        wick: Math.max(((high - low) / spread) * 100, 7),
        bodyTop: ((max - Math.max(open, close)) / spread) * 100,
        body: Math.max((Math.abs(close - open) / spread) * 100, 4)
      };
    });
  }, [activeTradingCoin]);

  const orderBook = useMemo(() => {
    const price = activeTradingCoin?.current_price || 1;
    const asks = Array.from({ length: 8 }, (_, index) => ({
      price: price * (1 + (index + 1) * 0.0018),
      amount: (0.18 + index * 0.047).toFixed(4),
      depth: 92 - index * 8
    }));
    const bids = Array.from({ length: 8 }, (_, index) => ({
      price: price * (1 - (index + 1) * 0.0016),
      amount: (0.22 + index * 0.052).toFixed(4),
      depth: 88 - index * 7
    }));
    return { asks, bids };
  }, [activeTradingCoin]);

  function addPair() {
    if (!selectedCoin) return;
    const nextPair = {
      id: `${selectedCoin.symbol}-${selectedQuote}-${selectedExchange}-${Date.now()}`,
      base: selectedCoin.symbol.toUpperCase(),
      quote: selectedQuote,
      exchange: selectedExchange,
      stopLoss,
      takeProfit,
      allocation
    };
    setActivePairs((pairs) => [nextPair, ...pairs].slice(0, 6));
  }

  function removePair(pairId) {
    setActivePairs((pairs) => pairs.filter((pair) => pair.id !== pairId));
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand">
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
            <h1>Crypto trading bot</h1>
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

        <section className="strategyGrid" id="risk">
          <div className="builderPanel">
            <div className="panelTitle">
              <span>Pair Builder</span>
              <Plus size={18} />
            </div>

            <div className="builderForm">
              <label>
                <span>Base asset</span>
                <div className="selectWrap">
                  <select value={selectedCoinId} onChange={(event) => setSelectedCoinId(event.target.value)}>
                    {coins.slice(0, 40).map((coin) => (
                      <option value={coin.id} key={coin.id}>
                        {coin.symbol.toUpperCase()} - {coin.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label>
                <span>Quote</span>
                <div className="selectWrap">
                  <select value={selectedQuote} onChange={(event) => setSelectedQuote(event.target.value)}>
                    {quotes.map((quote) => <option value={quote} key={quote}>{quote}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label>
                <span>Exchange</span>
                <div className="selectWrap">
                  <select value={selectedExchange} onChange={(event) => setSelectedExchange(event.target.value)}>
                    {exchanges.map((exchange) => <option value={exchange.name} key={exchange.name}>{exchange.name}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label>
                <span>Stop loss %</span>
                <input value={stopLoss} onChange={(event) => setStopLoss(event.target.value)} inputMode="decimal" />
              </label>

              <label>
                <span>Take profit %</span>
                <input value={takeProfit} onChange={(event) => setTakeProfit(event.target.value)} inputMode="decimal" />
              </label>

              <label>
                <span>Allocation %</span>
                <input value={allocation} onChange={(event) => setAllocation(event.target.value)} inputMode="decimal" />
              </label>
            </div>

            <button className="addPairButton" type="button" onClick={addPair}>
              <Plus size={17} />
              Add Pair
            </button>
          </div>

          <div className="pairsPanel">
            <div className="panelTitle">
              <span>Active Pairs</span>
              <ShieldCheck size={18} />
            </div>

            <div className="pairList">
              {activePairs.map((pair) => (
                <article className="pairRow" key={pair.id}>
                  <div>
                    <strong>{pair.base}/{pair.quote}</strong>
                    <span>{pair.exchange}</span>
                  </div>
                  <span>SL {pair.stopLoss}%</span>
                  <span>TP {pair.takeProfit}%</span>
                  <span>{pair.allocation}% size</span>
                  <button type="button" aria-label={`Remove ${pair.base}/${pair.quote}`} onClick={() => removePair(pair.id)}>
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="insightsGrid">
          <div className="signalPanel">
            <div>
              <div className="panelTitle">
                <span>Bot Signal</span>
                <Zap size={18} />
              </div>
              <h2>{aiGuided ? 'Watching volume and trend strength' : 'Guidance paused'}</h2>
              <p>
                {aiGuided
                  ? 'The assistant is tracking clean entries, risk limits, and high-volume market moves.'
                  : 'Turn on guidance when you want the bot to surface trade ideas from the live feed.'}
              </p>
            </div>
            <div className="signalStats">
              <span><CircleDollarSign size={16} /> USD market view</span>
              <span><ShieldCheck size={16} /> Risk controls set</span>
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

        <section className="terminalSection">
          <div className="terminalHeader">
            <div>
              <p className="eyebrow">Trading screen</p>
              <h2>{activeTradingCoin.symbol.toUpperCase()}/USDT</h2>
            </div>
            <div className="terminalControls">
              <div className="selectWrap terminalSelect">
                <select value={activeTradingCoinId} onChange={(event) => setActiveTradingCoinId(event.target.value)}>
                  {coins.slice(0, 30).map((coin) => (
                    <option value={coin.id} key={coin.id}>
                      {coin.symbol.toUpperCase()}/USDT
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </div>
              <div className="timeframes" aria-label="Timeframes">
                {['15m', '1H', '4H', '1D'].map((timeframe) => (
                  <button className={timeframe === '15m' ? 'active' : ''} type="button" key={timeframe}>{timeframe}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="terminalGrid">
            <div className="chartPanel">
              <div className="chartStats">
                <span>Price {formatCurrency(activeTradingCoin.current_price)}</span>
                <span className={activeTradingCoin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}>
                  24h {activeTradingCoin.price_change_percentage_24h >= 0 ? '+' : ''}
                  {activeTradingCoin.price_change_percentage_24h?.toFixed(2)}%
                </span>
                <span>Volume ${formatCompact(activeTradingCoin.total_volume)}</span>
              </div>
              <div className="candleChart" aria-label={`${activeTradingCoin.name} price chart`}>
                {chartCandles.map((candle) => (
                  <div className="candleSlot" key={candle.id}>
                    <span
                      className={candle.positive ? 'wick up' : 'wick down'}
                      style={{ top: `${candle.top}%`, height: `${candle.wick}%` }}
                    />
                    <span
                      className={candle.positive ? 'candle up' : 'candle down'}
                      style={{ top: `${candle.bodyTop}%`, height: `${candle.body}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <aside className="orderBookPanel">
              <div className="panelTitle">
                <span>Order Book</span>
                <Activity size={18} />
              </div>
              <div className="bookHead">
                <span>Price</span>
                <span>Amount</span>
              </div>
              {orderBook.asks.map((row) => (
                <div className="bookRow ask" key={`ask-${row.price}`} style={{ '--depth': `${row.depth}%` }}>
                  <span>{formatCurrency(row.price)}</span>
                  <span>{row.amount}</span>
                </div>
              ))}
              <strong className="midPrice">{formatCurrency(activeTradingCoin.current_price)}</strong>
              {orderBook.bids.map((row) => (
                <div className="bookRow bid" key={`bid-${row.price}`} style={{ '--depth': `${row.depth}%` }}>
                  <span>{formatCurrency(row.price)}</span>
                  <span>{row.amount}</span>
                </div>
              ))}
            </aside>

            <aside className="ticketPanel">
              <div className="sideTabs">
                <button className={tradeSide === 'buy' ? 'buy active' : 'buy'} type="button" onClick={() => setTradeSide('buy')}>Buy</button>
                <button className={tradeSide === 'sell' ? 'sell active' : 'sell'} type="button" onClick={() => setTradeSide('sell')}>Sell</button>
              </div>
              <label>
                <span>Order type</span>
                <div className="selectWrap">
                  <select defaultValue="limit">
                    <option value="limit">Limit</option>
                    <option value="market">Market</option>
                    <option value="stop">Stop limit</option>
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>
              <label>
                <span>Price USDT</span>
                <input value={activeTradingCoin.current_price?.toFixed(2) || ''} readOnly />
              </label>
              <label>
                <span>Amount {activeTradingCoin.symbol.toUpperCase()}</span>
                <input value={tradeAmount} onChange={(event) => setTradeAmount(event.target.value)} inputMode="decimal" />
              </label>
              <button className={tradeSide === 'buy' ? 'placeOrder buy' : 'placeOrder sell'} type="button">
                {tradeSide === 'buy' ? 'Create Buy Order' : 'Create Sell Order'}
              </button>
            </aside>
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
