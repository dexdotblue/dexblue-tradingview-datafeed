"use strict";

class Datafeed {
    constructor(dbAPI) {
        console.log("new datafeed")
        this.db = dbAPI;
        TouchList
    }

    onReady(callback) {
        console.log("TV ready")
        callback({
            supports_search: false,
            supports_marks: false,
            exchanges: [
                { value: "", name: "All Exchanges", desc: "" },
                { value: "XETRA", name: "XETRA", desc: "XETRA" },
                { value: "NSE", name: "NSE", desc: "NSE" }
            ],
            symbolsTypes: [
                { name: "All types", value: "" },
                { name: "Stock", value: "stock" },
                { name: "Index", value: "index" }
            ],
            supports_time: false,
            supportedResolutions: ["1", "15", "30", "60", "1D", "2D", "3D", "1W", "3W", "1M", '6M']
        })
    }

    resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
        console.log("get symbol", symbolName);
        onSymbolResolvedCallback({
            name: symbolName,
            description: '',
            type: 'crypto',
            session: '24x7',
            timezone: 'Etc/UTC',
            ticker: symbolName,
            minmov: 1,
            pricescale: 100000000,
            has_intraday: true,
            intraday_multipliers: ['1', '60'],
            supported_resolution: ["1"],
            volume_precision: 8,
            data_status: 'streaming',
            has_empty_bars: true
        })

    }

    getBars(symbolInfo, resolution, from, to, onHistoryCallback, onErrorCallback, firstDataRequest) {
        console.log("get bars", symbolInfo, resolution, from, to)
        this.db.methods.getBarData({
            from : parseInt(from),
            to   : parseInt(to + 59),
            market : symbolInfo.ticker,
            precision : resolution + "m"
        }).then(bars => {
            console.log("got bars", "length:", bars.parsed.bars.length)
            console.log(onHistoryCallback)
            let tvBars = []

            
            for(let i in bars.parsed.bars){
                let bar = bars.parsed.bars[i]
                
                tvBars.push({
                    time: bar.timestamp * 1000, //TradingView requires bar time in ms
                    low: bar.low,
                    high: bar.high,
                    open: bar.open,
                    close: bar.close,
                    volume: bar.tradedVolume 
                })
            }
            tvBars.reverse()
            console.log("bars", tvBars)
            console.log("last bar", tvBars[0])
            console.log(onHistoryCallback)
            onHistoryCallback(tvBars, {noData: bars.parsed.last})

        }).catch(error => {
            console.error(error);
            onErrorCallback(error);
        })
    }

    subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
        this.db.methods.subscribe({
            "markets": [symbolInfo.name],
            "events": ["barData1m"]
        })
        this.db.on("bar", (market, event, packet, bar) => {
            onRealtimeCallback({
                time: (bar.timestamp) * 1000,
                low: bar.low,
                high: bar.high,
                open: bar.open,
                close: bar.close,
                volume: bar.tradedVolume 
            })
            console.log("got bar subscription", bar)
        })
        console.log("subscribe bars", symbolInfo, resolution, subscriberUID)
    }

    // calculateHistoryDepth(resolution, resolutionBack, intervalBack) {
    //     console.log("calc hoistory depth", resolution, resolutionBack, intervalBack)
    //     return {
    //         resolutionBack: resolution,
    //         intervalBack: 100
    //     };
    // }
}

export default Datafeed;