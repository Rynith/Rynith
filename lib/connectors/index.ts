// /lib/connectors/index.ts
import type { Connector } from "./types"
import { googleConnector } from "./google"
// import { yelpConnector } from "./yelp"
// import { shopifyConnector } from "./shopify"
// import { twitterConnector } from "./twitter"


// email/csv/manual already handled by your existing routes; you can add thin wrappers if you like.

export const connectors: Record<string, Connector> = {
  google: googleConnector,
  // yelp: yelpConnector,
  // twitter: twitterConnector,
  // shopify:shopifyConnector
}
