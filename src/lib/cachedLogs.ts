import { cache } from "react";
import { listLogs } from "@/lib/logging";

/** listLogs memoized per request, so the shelf and the entries list share one query. */
export const getLogs = cache((profileId: string) => listLogs(profileId));
