"use strict";

import { extractMarketTokens } from './utils'

const resolutionMap = {
    "1": "1m",
    "3": "3m",
    "5": "5m",
    "15": "15m",
    "30": "30m",
    "60": "1h",
    "120": "2h",
    "240": "4h",
    "360": "6h",
    "720": "12h",
    "1D": "1d",
    "3D": "3d",
    "1W": "1w",
};

class dexblueTVDatafeed {
    constructor(dbAPI, source = "internal", resolutions = resolutionMap) {
        this.source = source;
        this.resolutions = resolutions
        this.db = dbAPI;

        this.barSubscriptions = {};
    }

    onReady(callback) {
        console.log("TV ready")
        callback({
            supports_search: false,
            supports_marks: false,
            exchanges: [],
            symbolsTypes: [],
            supports_time: false,
            supported_resolutions: Object.keys(this.resolutions)
        })
    }

    resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
        if (symbolName.split(":")[1] !== undefined) { // workaround for tradingviews EXCHANGE:AMRKET format
            symbolName = symbolName.split(":")[1]
        }

        let { traded, quote } = extractMarketTokens(symbolName)
        console.log("get symbol", symbolName);
        this.db.methods.getTicker({ source: this.source, market: traded + quote }).then(({ parsed }) => {
            onSymbolResolvedCallback({
                name: `${traded}/${quote}`,
                ticker: traded + quote,
                description: `${traded}/${quote}`,
                currency_code: quote,
                exchange: 'dex.blue',
                type: 'crypto',
                session: '24x7',
                timezone: 'Etc/UTC',
                minmov: 1,
                pricescale: this.getDecimals(parsed.rate.toString()),
                has_intraday: true,
                volume_precision: 8,
                data_status: 'streaming'
            })
        }).catch(error => {
            console.error(error);
            onResolveErrorCallback(error);
        })
    }

    getBars(symbolInfo, resolution, from, to, onHistoryCallback, onErrorCallback, firstDataRequest) {
        console.log("get bars", symbolInfo, resolution, from, to)
        this.db.methods.getBarData({
            source: this.source,
            from: parseInt(from),
            to: parseInt(to + 59),
            market: symbolInfo.ticker,
            precision: this.resolutions[resolution]
        }).then(({ parsed }) => {
            let tvBars = parsed.bars.map(bar => ({
                time: bar.timestamp * 1000,
                low: bar.low,
                high: bar.high,
                open: bar.open,
                close: bar.close,
                volume: bar.tradedVolume
            })).reverse()

            onHistoryCallback(tvBars, { noData: parsed.last })
        }).catch(error => {
            console.error(error);
            onErrorCallback(error);
        })
    }

    subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
        console.log("subscribe bars", symbolInfo, resolution, subscriberUID)

        this.db.methods.subscribe({
            "markets": [symbolInfo.ticker],
            "events": [this.makeBarSubscription(resolution)]
        })

        const callback = (market, event, packet, bar) => {
            if (symbolInfo.ticker != market) return
            onRealtimeCallback({
                time: bar.timestamp * 1000,
                low: bar.low,
                high: bar.high,
                open: bar.open,
                close: bar.close,
                volume: bar.tradedVolume
            })
            console.log("got bar subscription", bar)
        }

        this.barSubscriptions[subscriberUID] = {
            markets: [symbolInfo.ticker],
            events: [this.makeBarSubscription(resolution)],
            callback: callback
        }

        this.db.on("bar", this.barSubscriptions[subscriberUID].callback)
    }

    unsubscribeBars(subscriberUID) {
        let { markets, events, callback } = this.barSubscriptions[subscriberUID]
        console.log("unsubscribe bars", subscriberUID, markets, events, callback)
        this.db.methods.unSubscribe({
            markets: markets,
            events: events
        })

        this.db.clear("bar", callback)
        delete this.barSubscriptions[subscriberUID]
    }

    makeBarSubscription(precision) {
        return `${this.source == "internal" ? "b" : this.source + "B"}arData${this.resolutions[precision]}`;
    }

    getDecimals(value) {
        var val = value.toString().split(".");
        if (val.length == 1) {
            return Math.pow(10, 1);
        }
        return Math.pow(10, val[1].length)
    }
}

export default dexblueTVDatafeed;