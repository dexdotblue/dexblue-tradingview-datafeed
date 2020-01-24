"use strict";

import * as utils from './utils'

class dexblueTVDatafeed {
    constructor(dbAPI) {
        console.log("new datafeed")
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
            supportedResolutions: ["1", "15", "30", "60", "1D", "2D", "3D", "1W", "3W", "1M", '6M']
        })
    }

    resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
        let { traded, quote } = utils.extractMarketTokens(symbolName)

        this.db.methods.getTokenInfo({
            token: quote
        }).then(({ parsed }) => {
            console.log("get symbol", parsed);
            onSymbolResolvedCallback({
                name: `${traded}/${quote}`,
                ticker: traded + quote,
                currency_code: quote,
                type: 'crypto',
                session: '24x7',
                timezone: 'Etc/UTC',
                minmov: 1,
                pricescale: 1000000,
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
            from: parseInt(from),
            to: parseInt(to + 59),
            market: symbolInfo.ticker,
            precision: resolution + "m"
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
            "events": ["barData1m"]
        })

        const callback = (market, event, packet, bar) => {
            if(symbolInfo.ticker != market) return
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
            events: ["barData1m"],
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
}

export default dexblueTVDatafeed;