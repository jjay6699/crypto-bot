import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
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
import { CandlestickSeries, createChart, HistogramSeries } from 'lightweight-charts';
import './styles.css';

const COINS_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=1h,24h,7d';

const BINANCE_REST_BASES = ['https://api.binance.com', 'https://api1.binance.com', 'https://api.binance.us'];
const BINANCE_WS_BASES = {
  'https://api.binance.com': 'wss://stream.binance.com:9443/ws',
  'https://api1.binance.com': 'wss://stream.binance.com:9443/ws',
  'https://api.binance.us': 'wss://stream.binance.us:9443/ws'
};

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

const tradingPairs = [
  { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', name: 'Bitcoin' },
  { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', name: 'Ethereum' },
  { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT', name: 'Solana' },
  { symbol: 'BNBUSDT', base: 'BNB', quote: 'USDT', name: 'BNB' },
  { symbol: 'XRPUSDT', base: 'XRP', quote: 'USDT', name: 'XRP' },
  { symbol: 'ADAUSDT', base: 'ADA', quote: 'USDT', name: 'Cardano' },
  { symbol: 'DOGEUSDT', base: 'DOGE', quote: 'USDT', name: 'Dogecoin' },
  { symbol: 'LINKUSDT', base: 'LINK', quote: 'USDT', name: 'Chainlink' }
];

const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
const quotes = ['USDT', 'USDC', 'USD', 'BTC', 'ETH'];

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'trading', label: 'Trading', icon: BarChart3 },
  { id: 'setup', label: 'Bot Setup', icon: Sparkles },
  { id: 'markets', label: 'Markets', icon: CircleDollarSign },
  { id: 'exchanges', label: 'Exchanges', icon: Link2 }
];

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value > 100 ? 2 : value > 1 ? 3 : 6
  }).format(value);
}

function formatCompact(value) {
  if (!Number.isFinite(value)) return '$0';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapKline(row) {
  return {
    time: Math.floor(row[0] / 1000),
    open: parseNumber(row[1]),
    high: parseNumber(row[2]),
    low: parseNumber(row[3]),
    close: parseNumber(row[4])
  };
}

function mapVolume(row) {
  const open = parseNumber(row[1]);
  const close = parseNumber(row[4]);
  return {
    time: Math.floor(row[0] / 1000),
    value: parseNumber(row[5]),
    color: close >= open ? 'rgba(31, 209, 132, 0.38)' : 'rgba(255, 93, 115, 0.38)'
  };
}

async function fetchFromBinance(path) {
  let lastError;
  for (const base of BINANCE_REST_BASES) {
    try {
      const response = await fetch(`${base}${path}`, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return { base, data: await response.json() };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Binance market data unavailable');
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

function TradingChart({ candles, volumes, liveCandle }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: '#080c1c' },
        textColor: '#94a3b8',
        attributionLogo: false
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' }
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.05)' },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
        secondsVisible: false
      }
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e'
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      color: 'rgba(16, 185, 129, 0.15)'
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    candleSeriesRef.current.setData(candles);
    volumeSeriesRef.current.setData(volumes);
    chartRef.current?.timeScale().fitContent();
  }, [candles, volumes]);

  useEffect(() => {
    if (!liveCandle || !candleSeriesRef.current || !volumeSeriesRef.current) return;
    candleSeriesRef.current.update(liveCandle.candle);
    volumeSeriesRef.current.update(liveCandle.volume);
  }, [liveCandle]);

  return <div className="chartCanvas" ref={containerRef} />;
}

function useTradingData(symbol, interval) {
  const [candles, setCandles] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [liveCandle, setLiveCandle] = useState(null);
  const [ticker, setTicker] = useState(null);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [trades, setTrades] = useState([]);
  const [status, setStatus] = useState('Connecting');
  const [sourceBase, setSourceBase] = useState(BINANCE_REST_BASES[0]);

  useEffect(() => {
    let cancelled = false;
    let socket;

    async function loadInitialData() {
      setStatus('Connecting');
      setLiveCandle(null);
      try {
        const [klineResult, tickerResult, depthResult, tradesResult] = await Promise.all([
          fetchFromBinance(`/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=240`),
          fetchFromBinance(`/api/v3/ticker/24hr?symbol=${symbol}`),
          fetchFromBinance(`/api/v3/depth?symbol=${symbol}&limit=20`),
          fetchFromBinance(`/api/v3/trades?symbol=${symbol}&limit=18`)
        ]);

        if (cancelled) return;

        setSourceBase(klineResult.base);
        setCandles(klineResult.data.map(mapKline));
        setVolumes(klineResult.data.map(mapVolume));
        setTicker(tickerResult.data);
        setOrderBook({
          bids: depthResult.data.bids || [],
          asks: depthResult.data.asks || []
        });
        setTrades(tradesResult.data || []);
        setStatus('Live');

        const wsBase = BINANCE_WS_BASES[klineResult.base] || BINANCE_WS_BASES[BINANCE_REST_BASES[0]];
        socket = new WebSocket(`${wsBase}/${symbol.toLowerCase()}@kline_${interval}`);

        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          const k = message.k;
          if (!k || cancelled) return;

          const candle = {
            time: Math.floor(k.t / 1000),
            open: parseNumber(k.o),
            high: parseNumber(k.h),
            low: parseNumber(k.l),
            close: parseNumber(k.c)
          };
          const volume = {
            time: Math.floor(k.t / 1000),
            value: parseNumber(k.v),
            color: parseNumber(k.c) >= parseNumber(k.o) ? 'rgba(31, 209, 132, 0.38)' : 'rgba(255, 93, 115, 0.38)'
          };

          setLiveCandle({ candle, volume });
          setTicker((current) => current ? { ...current, lastPrice: k.c, volume: k.v } : current);
        };

        socket.onopen = () => setStatus('Live');
        socket.onerror = () => setStatus('REST refresh');
        socket.onclose = () => {
          if (!cancelled) setStatus('REST refresh');
        };
      } catch (error) {
        if (!cancelled) setStatus('Market data unavailable');
      }
    }

    loadInitialData();
    const refreshTimer = setInterval(loadInitialData, 60000);

    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
      if (socket) socket.close();
    };
  }, [symbol, interval]);

  return { candles, volumes, liveCandle, ticker, orderBook, trades, status, sourceBase };
}

function App() {
  const [activeView, setActiveView] = useState('trading');
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
  const [executionMode, setExecutionMode] = useState('Balanced');
  const [maxPairs, setMaxPairs] = useState('6');
  const [dailyLossCap, setDailyLossCap] = useState('5');
  const [trailingStop, setTrailingStop] = useState('1.2');
  const [confidence, setConfidence] = useState('72');
  const [tradeSide, setTradeSide] = useState('buy');
  const [tradeAmount, setTradeAmount] = useState('0.10');
  const [ticketOpen, setTicketOpen] = useState(true);
  const [orders, setOrders] = useState([]);
  const [activeSymbol, setActiveSymbol] = useState('BTCUSDT');
  const [activeInterval, setActiveInterval] = useState('15m');
  const [activePairs, setActivePairs] = useState([
    { id: 'btc-usdt', base: 'BTC', quote: 'USDT', exchange: 'Binance', stopLoss: '3.5', takeProfit: '8', allocation: '15' },
    { id: 'eth-usdc', base: 'ETH', quote: 'USDC', exchange: 'Coinbase', stopLoss: '4', takeProfit: '9.5', allocation: '12' }
  ]);

  const tradingData = useTradingData(activeSymbol, activeInterval);

  function markUpdated() {
    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }

  async function loadMarkets() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(COINS_URL, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error('Market feed unavailable');
      const data = await response.json();
      setCoins(data);
      markUpdated();
    } catch (err) {
      setError('Live feed is warming up. Showing cached market view.');
      markUpdated();
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
    return coins.filter((coin) => coin.name.toLowerCase().includes(needle) || coin.symbol.toLowerCase().includes(needle));
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

  const activePair = tradingPairs.find((pair) => pair.symbol === activeSymbol) || tradingPairs[0];
  const ticker = tradingData.ticker;
  const lastPrice = parseNumber(ticker?.lastPrice);
  const priceChange = parseNumber(ticker?.priceChangePercent);

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
          <strong>TradePilot</strong>
          <span>Crypto command desk</span>
        </div>

        <nav className="navStack" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeView === item.id ? 'active' : ''}
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <section className="sidebarStatus">
          <div className="panelTitle">
            <span>Exchange Links</span>
            <WalletCards size={18} />
          </div>
          {exchanges.slice(0, 3).map((exchange) => (
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
        {activeView === 'dashboard' && (
          <DashboardView
            aiGuided={aiGuided}
            coins={coins}
            lastUpdated={lastUpdated}
            loading={loading}
            marketPulse={marketPulse}
            onRefresh={loadMarkets}
            setAiGuided={setAiGuided}
            topMovers={topMovers}
          />
        )}

        {activeView === 'trading' && (
          <TradingView
            activeInterval={activeInterval}
            activePair={activePair}
            activeSymbol={activeSymbol}
            lastPrice={lastPrice}
            orderBook={tradingData.orderBook}
            priceChange={priceChange}
            setActiveInterval={setActiveInterval}
            setActiveSymbol={setActiveSymbol}
            setTradeAmount={setTradeAmount}
            setTradeSide={setTradeSide}
            setTicketOpen={setTicketOpen}
            setOrders={setOrders}
            status={tradingData.status}
            ticketOpen={ticketOpen}
            ticker={ticker}
            tradeAmount={tradeAmount}
            tradeSide={tradeSide}
            orders={orders}
            tradingData={tradingData}
          />
        )}

        {activeView === 'setup' && (
          <SetupView
            activePairs={activePairs}
            addPair={addPair}
            aiGuided={aiGuided}
            allocation={allocation}
            coins={coins}
            exchanges={exchanges}
            removePair={removePair}
            selectedCoinId={selectedCoinId}
            selectedExchange={selectedExchange}
            selectedQuote={selectedQuote}
            confidence={confidence}
            dailyLossCap={dailyLossCap}
            executionMode={executionMode}
            maxPairs={maxPairs}
            setAiGuided={setAiGuided}
            setAllocation={setAllocation}
            setConfidence={setConfidence}
            setDailyLossCap={setDailyLossCap}
            setExecutionMode={setExecutionMode}
            setMaxPairs={setMaxPairs}
            setSelectedCoinId={setSelectedCoinId}
            setSelectedExchange={setSelectedExchange}
            setSelectedQuote={setSelectedQuote}
            setStopLoss={setStopLoss}
            setTakeProfit={setTakeProfit}
            setTrailingStop={setTrailingStop}
            stopLoss={stopLoss}
            takeProfit={takeProfit}
            trailingStop={trailingStop}
          />
        )}

        {activeView === 'markets' && (
          <MarketsView
            error={error}
            filteredCoins={filteredCoins}
            loading={loading}
            onRefresh={loadMarkets}
            query={query}
            setQuery={setQuery}
          />
        )}

        {activeView === 'exchanges' && <ExchangesView />}
      </section>
    </main>
  );
}

function PageHeader({ eyebrow, title, action }) {
  return (
    <header className="pageHeader">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  );
}

function OnlineStatus({ status }) {
  const online = status === 'Live';

  return (
    <span className={online ? 'onlineStatus online' : 'onlineStatus'}>
      <span className="onlineDot" />
      <span>{online ? 'Online' : 'Connecting'}</span>
    </span>
  );
}

function DashboardView({ aiGuided, coins, lastUpdated, loading, marketPulse, onRefresh, setAiGuided, topMovers }) {
  const leaders = coins.slice(0, 12);
  const totalVolume = leaders.reduce((sum, coin) => sum + parseNumber(coin.total_volume), 0);
  const gainers = leaders.filter((coin) => coin.price_change_percentage_24h >= 0).length;
  const strongest = topMovers[0];

  return (
    <>
      <PageHeader
        eyebrow="Command overview"
        title="Crypto trading bot"
        action={(
          <button className="refreshButton" type="button" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        )}
      />

      <section className="controlBand">
        <div className="aiCard">
          <div>
            <span>AI guided trading</span>
            <strong>{aiGuided ? 'Active strategy guidance' : 'Manual market view'}</strong>
          </div>
          <button type="button" className={`switch ${aiGuided ? 'on' : ''}`} aria-pressed={aiGuided} onClick={() => setAiGuided((value) => !value)}>
            <span />
          </button>
        </div>

        <div className="metricStrip">
          <div><span>Market pulse</span><strong>{marketPulse}%</strong></div>
          <div><span>Tracked assets</span><strong>{coins.length}</strong></div>
          <div><span>Updated</span><strong>{lastUpdated || 'Now'}</strong></div>
        </div>
      </section>

      <section className="marketSummary">
        <div>
          <span>Top 12 volume</span>
          <strong>${formatCompact(totalVolume)}</strong>
        </div>
        <div>
          <span>Positive movers</span>
          <strong>{gainers}/{leaders.length || 0}</strong>
        </div>
        <div>
          <span>Strongest asset</span>
          <strong>{strongest ? strongest.symbol.toUpperCase() : '-'}</strong>
        </div>
      </section>

      <section className="dashboardGrid">
        <div className="signalPanel">
          <div>
            <div className="panelTitle"><span>Bot Signal</span><Zap size={18} /></div>
            <h2>{aiGuided ? 'Watching volume and trend strength' : 'Guidance paused'}</h2>
            <p>
              {aiGuided
                ? 'The assistant is tracking clean entries, risk limits, and high-volume market moves.'
                : 'Turn on guidance when you want the bot to surface trade ideas from the live feed.'}
            </p>
          </div>
          <div className="signalStats">
            <span>USD market view</span>
            <span>Risk controls set</span>
          </div>
        </div>

        <FastMovers topMovers={topMovers} />
      </section>
    </>
  );
}

function TradingView({
  activeInterval,
  activePair,
  activeSymbol,
  lastPrice,
  orderBook,
  priceChange,
  setActiveInterval,
  setActiveSymbol,
  setTradeAmount,
  setTradeSide,
  setTicketOpen,
  setOrders,
  status,
  ticketOpen,
  ticker,
  tradeAmount,
  tradeSide,
  orders,
  tradingData
}) {
  const asks = [...orderBook.asks].slice(0, 12).reverse();
  const bids = orderBook.bids.slice(0, 12);

  function createOrder(side = tradeSide) {
    const amount = parseNumber(tradeAmount);
    if (!amount || !lastPrice) return;
    const order = {
      id: `${Date.now()}-${activeSymbol}-${side}`,
      side,
      symbol: activeSymbol,
      pair: `${activePair.base}/${activePair.quote}`,
      price: lastPrice,
      amount,
      total: amount * lastPrice,
      type: 'Limit',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setOrders((current) => [order, ...current].slice(0, 20));
  }

  return (
    <>
      <PageHeader
        eyebrow="Trading terminal"
        title={`${activePair.base}/${activePair.quote}`}
        action={<OnlineStatus status={status} />}
      />

      <section className="terminalSection fullTerminal">
        <div className="terminalToolbar">
          <div className="selectWrap terminalSelect">
            <select value={activeSymbol} onChange={(event) => setActiveSymbol(event.target.value)}>
              {tradingPairs.map((pair) => (
                <option value={pair.symbol} key={pair.symbol}>{pair.base}/{pair.quote}</option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>
          <div className="timeframes" aria-label="Timeframes">
            {timeframes.map((timeframe) => (
              <button
                className={activeInterval === timeframe ? 'active' : ''}
                type="button"
                key={timeframe}
                onClick={() => setActiveInterval(timeframe)}
              >
                {timeframe}
              </button>
            ))}
          </div>
          <button className="ticketToggle" type="button" onClick={() => setTicketOpen((value) => !value)}>
            {ticketOpen ? 'Hide Order Ticket' : 'Show Order Ticket'}
          </button>
          <span className="feedNote">Binance market feed</span>
        </div>

        <div className="tickerStrip">
          <div><span>Last price</span><strong>{formatCurrency(lastPrice)}</strong></div>
          <div><span>24h change</span><strong className={priceChange >= 0 ? 'positive' : 'negative'}>{priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%</strong></div>
          <div><span>24h high</span><strong>{formatCurrency(parseNumber(ticker?.highPrice))}</strong></div>
          <div><span>24h low</span><strong>{formatCurrency(parseNumber(ticker?.lowPrice))}</strong></div>
          <div><span>Volume</span><strong>{formatCompact(parseNumber(ticker?.quoteVolume))}</strong></div>
        </div>

        <div className={ticketOpen ? 'terminalGrid' : 'terminalGrid ticketCollapsed'}>
          <div className="chartPanel">
            <TradingChart candles={tradingData.candles} volumes={tradingData.volumes} liveCandle={tradingData.liveCandle} />
          </div>

          <aside className="orderBookPanel">
            <div className="panelTitle"><span>Order Book</span><Activity size={18} /></div>
            <div className="bookHead"><span>Price</span><span>Amount</span></div>
            {asks.map(([price, amount]) => (
              <BookRow amount={amount} key={`ask-${price}`} price={price} side="ask" />
            ))}
            <strong className="midPrice">{formatCurrency(lastPrice)}</strong>
            {bids.map(([price, amount]) => (
              <BookRow amount={amount} key={`bid-${price}`} price={price} side="bid" />
            ))}
          </aside>

          {ticketOpen && (
            <aside className="ticketPanel">
              <div className="ticketHeader">
                <strong>Order Ticket</strong>
              </div>
              <>
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
                  <input value={lastPrice ? lastPrice.toFixed(2) : ''} readOnly />
                </label>
                <label>
                  <span>Amount {activePair.base}</span>
                  <input value={tradeAmount} onChange={(event) => setTradeAmount(event.target.value)} inputMode="decimal" />
                </label>
                <div className="orderPreview">
                  <span>Estimated total</span>
                  <strong>{formatCurrency(parseNumber(tradeAmount) * lastPrice)}</strong>
                </div>
                <button
                  className={tradeSide === 'buy' ? 'placeOrder buy' : 'placeOrder sell'}
                  type="button"
                  onClick={() => createOrder(tradeSide)}
                >
                  {tradeSide === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
                </button>
              </>
            </aside>
          )}
        </div>

        <section className="tradesPanel">
          <div className="ordersHeader">
            <div>
              <span>My Orders</span>
              <strong>{orders.length} open</strong>
            </div>
            <div className="ordersSummary">
              <span>Notional {formatCurrency(orders.reduce((sum, order) => sum + order.total, 0))}</span>
              <span>Latest {orders[0]?.time || '-'}</span>
            </div>
          </div>
          {orders.length === 0 ? (
            <div className="emptyOrders">
              <WalletCards size={28} style={{ color: 'var(--muted-soft)', marginBottom: '4px' }} />
              <strong>No orders yet</strong>
              <span>Use the order ticket to create your first order.</span>
            </div>
          ) : (
            <div className="ordersGrid">
              <div className="ordersHead">
                <span>Side</span>
                <span>Pair</span>
                <span>Price</span>
                <span>Amount</span>
                <span>Total</span>
                <span>Time</span>
              </div>
              {orders.map((order) => (
                <div className="orderRow" key={order.id}>
                  <span className={order.side === 'buy' ? 'positive' : 'negative'}>{order.side.toUpperCase()}</span>
                  <span>{order.pair}</span>
                  <span>{formatCurrency(order.price)}</span>
                  <span>{order.amount.toFixed(5)}</span>
                  <span>{formatCurrency(order.total)}</span>
                  <span>{order.time}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </>
  );
}

function BookRow({ amount, price, side }) {
  const amountNumber = parseNumber(amount);
  const depth = Math.min(Math.max(amountNumber * 18, 8), 96);
  return (
    <div className={`bookRow ${side}`} style={{ '--depth': `${depth}%` }}>
      <span>{formatCurrency(parseNumber(price))}</span>
      <span>{amountNumber.toFixed(5)}</span>
    </div>
  );
}

function SetupView(props) {
  const totalAllocation = props.activePairs.reduce((sum, pair) => sum + parseNumber(pair.allocation), 0);

  return (
    <>
      <PageHeader eyebrow="Bot setup" title="Strategy controls" />
      <section className="setupOverview">
        <div className="aiCard">
          <div>
            <span>AI guided trading</span>
            <strong>{props.aiGuided ? 'Active strategy guidance' : 'Manual market view'}</strong>
          </div>
          <button type="button" className={`switch ${props.aiGuided ? 'on' : ''}`} aria-pressed={props.aiGuided} onClick={() => props.setAiGuided((value) => !value)}>
            <span />
          </button>
        </div>
        <div className="setupMetric"><span>Active pairs</span><strong>{props.activePairs.length}/{props.maxPairs}</strong></div>
        <div className="setupMetric"><span>Capital assigned</span><strong>{totalAllocation}%</strong></div>
        <div className="setupMetric"><span>Daily loss cap</span><strong>{props.dailyLossCap}%</strong></div>
      </section>
      <section className="strategyGrid">
        <div className="setupStack">
          <PairBuilder {...props} />
          <AdvancedControls {...props} />
        </div>
        <ActivePairs activePairs={props.activePairs} removePair={props.removePair} />
      </section>
    </>
  );
}

function PairBuilder({
  addPair,
  allocation,
  confidence,
  coins,
  dailyLossCap,
  executionMode,
  exchanges: exchangeOptions,
  maxPairs,
  selectedCoinId,
  selectedExchange,
  selectedQuote,
  setAllocation,
  setConfidence,
  setDailyLossCap,
  setExecutionMode,
  setMaxPairs,
  setSelectedCoinId,
  setSelectedExchange,
  setSelectedQuote,
  setStopLoss,
  setTakeProfit,
  setTrailingStop,
  stopLoss,
  takeProfit,
  trailingStop
}) {
  return (
    <div className="builderPanel">
      <div className="panelTitle"><span>Pair Builder</span><Plus size={18} /></div>
      <div className="builderForm">
        <label>
          <span>Base asset</span>
          <div className="selectWrap">
            <select value={selectedCoinId} onChange={(event) => setSelectedCoinId(event.target.value)}>
              {coins.slice(0, 40).map((coin) => (
                <option value={coin.id} key={coin.id}>{coin.symbol.toUpperCase()} - {coin.name}</option>
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
              {exchangeOptions.map((exchange) => <option value={exchange.name} key={exchange.name}>{exchange.name}</option>)}
            </select>
            <ChevronDown size={16} />
          </div>
        </label>
        <label><span>Stop loss %</span><input value={stopLoss} onChange={(event) => setStopLoss(event.target.value)} inputMode="decimal" /></label>
        <label><span>Take profit %</span><input value={takeProfit} onChange={(event) => setTakeProfit(event.target.value)} inputMode="decimal" /></label>
        <label><span>Allocation %</span><input value={allocation} onChange={(event) => setAllocation(event.target.value)} inputMode="decimal" /></label>
      </div>
      <button className="addPairButton" type="button" onClick={addPair}><Plus size={17} />Add Pair</button>
    </div>
  );
}

function AdvancedControls({
  confidence,
  dailyLossCap,
  executionMode,
  maxPairs,
  setConfidence,
  setDailyLossCap,
  setExecutionMode,
  setMaxPairs,
  setTrailingStop,
  trailingStop
}) {
  return (
    <div className="advancedPanel">
      <div className="panelTitle"><span>Advanced Rules</span><SlidersHorizontal size={18} /></div>
      <div className="advancedGrid">
        <label>
          <span>Execution mode</span>
          <div className="selectWrap">
            <select value={executionMode} onChange={(event) => setExecutionMode(event.target.value)}>
              <option>Balanced</option>
              <option>Momentum</option>
              <option>Conservative</option>
            </select>
            <ChevronDown size={16} />
          </div>
        </label>
        <label><span>Max open pairs</span><input value={maxPairs} onChange={(event) => setMaxPairs(event.target.value)} inputMode="numeric" /></label>
        <label><span>Daily loss cap %</span><input value={dailyLossCap} onChange={(event) => setDailyLossCap(event.target.value)} inputMode="decimal" /></label>
        <label><span>Trailing stop %</span><input value={trailingStop} onChange={(event) => setTrailingStop(event.target.value)} inputMode="decimal" /></label>
        <label className="wideControl">
          <span>Signal confidence</span>
          <input type="range" min="40" max="95" value={confidence} onChange={(event) => setConfidence(event.target.value)} />
          <b>{confidence}%</b>
        </label>
      </div>
    </div>
  );
}

// SlidersHorizontalIcon is replaced directly by lucide-react SlidersHorizontal

function ActivePairs({ activePairs, removePair }) {
  return (
    <div className="pairsPanel">
      <div className="panelTitle"><span>Active Pairs</span><ShieldCheck size={18} /></div>
      <div className="pairHead"><span>Pair</span><span>Risk</span><span>Target</span><span>Size</span></div>
      <div className="pairList">
        {activePairs.map((pair) => (
          <article className="pairRow" key={pair.id}>
            <div><strong>{pair.base}/{pair.quote}</strong><span>{pair.exchange}</span></div>
            <span>SL {pair.stopLoss}%</span>
            <span>TP {pair.takeProfit}%</span>
            <span>{pair.allocation}% size</span>
            <button type="button" aria-label={`Remove ${pair.base}/${pair.quote}`} onClick={() => removePair(pair.id)}><Trash2 size={16} /></button>
          </article>
        ))}
      </div>
    </div>
  );
}

function MarketsView({ error, filteredCoins, loading, onRefresh, query, setQuery }) {
  return (
    <>
      <PageHeader
        eyebrow="Market watch"
        title="Token prices"
        action={(
          <button className="refreshButton" type="button" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        )}
      />
      <section className="marketSection">
        <div className="marketHeader">
          <p>{error || `${filteredCoins.length} crypto assets from a free public market API.`}</p>
          <label className="searchBox">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search token" aria-label="Search token" />
          </label>
        </div>
        <TokenTable coins={filteredCoins} />
      </section>
    </>
  );
}

function TokenTable({ coins }) {
  return (
    <div className="tableShell">
      <div className="tableHead">
        <span>Asset</span><span>Price</span><span>24h</span><span>Volume</span><span>Trend</span>
      </div>
      <div className="tokenList">
        {coins.slice(0, 100).map((coin) => {
          const positive = coin.price_change_percentage_24h >= 0;
          return (
            <article className="tokenRow" key={coin.id}>
              <div className="assetCell">
                <img src={coin.image} alt="" />
                <div><strong>{coin.name}</strong><span>#{coin.market_cap_rank || '-'} {coin.symbol.toUpperCase()}</span></div>
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
  );
}

function ExchangesView() {
  return (
    <>
      <PageHeader eyebrow="Exchange network" title="Connections" />
      <section className="exchangeGrid">
        {exchanges.map((exchange) => (
          <article className="exchangeCard" key={exchange.name}>
            <div className="panelTitle"><span>{exchange.name}</span><Link2 size={18} /></div>
            <strong>{exchange.state}</strong>
            <p>{exchange.pairs} spot pairs available for routing.</p>
            <button type="button">Connect</button>
          </article>
        ))}
      </section>
    </>
  );
}

function FastMovers({ topMovers }) {
  return (
    <div className="moversPanel">
      <div className="panelTitle"><span>Fast Movers</span><Activity size={18} /></div>
      {topMovers.map((coin) => {
        const positive = coin.price_change_percentage_24h >= 0;
        return (
          <div className="moverRow" key={coin.id}>
            <img src={coin.image} alt="" />
            <div><strong>{coin.symbol.toUpperCase()}</strong><span>{coin.name}</span></div>
            <b className={positive ? 'positive' : 'negative'}>{positive ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2)}%</b>
          </div>
        );
      })}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
