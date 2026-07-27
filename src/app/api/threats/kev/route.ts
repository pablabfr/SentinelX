import { handleServiceRoute } from "@/lib/services/api-utils";
import { fetchKevCatalog } from "@/lib/services/threats";

export async function GET() {
  return handleServiceRoute(async () => fetchKevCatalog());
}
