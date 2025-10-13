// /lib/connectors/index.ts
import type { Connector } from "./types";
import { googleConnector } from "./google";
import { yelpConnector } from "./yelp";
import { redditConnector } from "./reddit";
// import { twitterConnector } from "./twitter"; // if/when you add it

type ConnectorKind = "google" | "yelp" | "reddit" | "email" | "csv" | "manual";

export const connectors: Partial<Record<ConnectorKind, Connector>> = {
  google: googleConnector,
  yelp: yelpConnector,
  reddit: redditConnector,
  // email/csv/manual handled elsewhere; omit here if not programmatic
};
