'use strict'

export const extractMarketTokens = market =>  ({traded: market.split("/")[0], quote: market.split("/")[1]});
