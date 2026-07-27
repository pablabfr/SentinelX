import { handleServiceRoute } from "@/lib/services/api-utils";
import { getSystemSnapshot } from "@/lib/services/system";

export async function POST() {
  return handleServiceRoute(async () => getSystemSnapshot());
}

export async function GET() {
  return handleServiceRoute(async () => getSystemSnapshot());
}
