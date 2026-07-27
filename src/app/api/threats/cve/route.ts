import { handleServiceRoute } from "@/lib/services/api-utils";
import { fetchRecentCves } from "@/lib/services/threats";

export async function GET(req: Request) {
  return handleServiceRoute(async () => {
    const { searchParams } = new URL(req.url);
    return fetchRecentCves({
      keyword: searchParams.get("keyword") ?? undefined,
      severity: searchParams.get("severity") ?? undefined,
      resultsPerPage: Number(searchParams.get("limit") ?? 20),
      startIndex: Number(searchParams.get("startIndex") ?? 0),
    });
  });
}
