import { handleServiceRoute } from "@/lib/services/api-utils";
import { getPublicIp, measureLatency } from "@/lib/services/network";
import { getSystemSnapshot } from "@/lib/services/system";
import { lookupIpGeo } from "@/lib/services/ip-geo";

export async function GET() {
  return handleServiceRoute(async () => {
    const [publicIp, latency, system] = await Promise.all([getPublicIp(), measureLatency(), getSystemSnapshot()]);
    const geo = await lookupIpGeo(publicIp).catch(() => null);
    return { publicIp, geo, latency, interfaces: system.network.interfaces, connections: system.network.connections };
  });
}
