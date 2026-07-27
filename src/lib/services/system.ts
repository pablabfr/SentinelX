import si from "systeminformation";
import os from "node:os";

export interface SystemSnapshot {
  hostname: string;
  platform: string;
  distro: string;
  arch: string;
  uptimeSeconds: number;
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    physicalCores: number;
    speedGhz: number;
    currentLoad: number | null;
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usedPercent: number;
  };
  disks: { fs: string; mount: string; sizeBytes: number; usedBytes: number; usedPercent: number }[];
  network: {
    interfaces: { iface: string; ip4: string; ip6: string; mac: string; type: string; internal: boolean }[];
    connections: { protocol: string; localPort: string; state: string; process?: string }[];
  };
  processes: { pid: number; name: string; cpu: number; mem: number }[];
  services: { name: string; running: boolean }[];
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function getSystemSnapshot(): Promise<SystemSnapshot> {
  const [cpuInfo, cpuSpeed, currentLoad, mem, fsSize, osInfo, networkInterfaces, connections, processes, services] =
    await Promise.all([
      safe(() => si.cpu(), { manufacturer: "Unknown", brand: "Unknown", cores: os.cpus().length, physicalCores: os.cpus().length } as si.Systeminformation.CpuData),
      safe(() => si.cpuCurrentSpeed(), { avg: 0 } as si.Systeminformation.CpuCurrentSpeedData),
      safe(() => si.currentLoad(), null as si.Systeminformation.CurrentLoadData | null),
      safe(() => si.mem(), null as si.Systeminformation.MemData | null),
      safe(() => si.fsSize(), [] as si.Systeminformation.FsSizeData[]),
      safe(() => si.osInfo(), null as si.Systeminformation.OsData | null),
      safe(() => si.networkInterfaces(), [] as si.Systeminformation.NetworkInterfacesData[]),
      safe(() => si.networkConnections(), [] as si.Systeminformation.NetworkConnectionsData[]),
      safe(() => si.processes(), { list: [] } as unknown as si.Systeminformation.ProcessesData),
      safe(() => si.services("*"), [] as si.Systeminformation.ServicesData[]),
    ]);

  const totalMem = mem?.total ?? os.totalmem();
  const freeMem = mem?.available ?? os.freemem();
  const usedMem = totalMem - freeMem;

  const ifaces = (Array.isArray(networkInterfaces) ? networkInterfaces : [networkInterfaces]).filter(Boolean);

  const topProcesses = [...(processes.list ?? [])]
    .sort((a, b) => (b.cpu ?? 0) - (a.cpu ?? 0))
    .slice(0, 12)
    .map((p) => ({ pid: p.pid, name: p.name, cpu: Math.round((p.cpu ?? 0) * 10) / 10, mem: Math.round((p.mem ?? 0) * 10) / 10 }));

  const listeningPorts = connections
    .filter((c) => c.state === "LISTEN")
    .slice(0, 40)
    .map((c) => ({ protocol: c.protocol, localPort: String(c.localPort), state: c.state, process: c.process }));

  return {
    hostname: osInfo?.hostname ?? os.hostname(),
    platform: osInfo?.platform ?? os.platform(),
    distro: osInfo?.distro ?? "Unknown",
    arch: osInfo?.arch ?? os.arch(),
    uptimeSeconds: os.uptime(),
    cpu: {
      manufacturer: cpuInfo.manufacturer ?? "Unknown",
      brand: cpuInfo.brand ?? "Unknown",
      cores: cpuInfo.cores ?? os.cpus().length,
      physicalCores: cpuInfo.physicalCores ?? os.cpus().length,
      speedGhz: cpuSpeed.avg ?? 0,
      currentLoad: currentLoad ? Math.round(currentLoad.currentLoad * 10) / 10 : null,
    },
    memory: {
      totalBytes: totalMem,
      usedBytes: usedMem,
      freeBytes: freeMem,
      usedPercent: totalMem > 0 ? Math.round((usedMem / totalMem) * 1000) / 10 : 0,
    },
    disks: fsSize.map((d) => ({
      fs: d.fs,
      mount: d.mount,
      sizeBytes: d.size,
      usedBytes: d.used,
      usedPercent: Math.round((d.use ?? 0) * 10) / 10,
    })),
    network: {
      interfaces: ifaces.map((i) => ({
        iface: i.iface,
        ip4: i.ip4 ?? "",
        ip6: i.ip6 ?? "",
        mac: i.mac ?? "",
        type: i.type ?? "unknown",
        internal: Boolean(i.internal),
      })),
      connections: listeningPorts,
    },
    processes: topProcesses,
    services: (Array.isArray(services) ? services : [])
      .filter((s) => s.running)
      .slice(0, 30)
      .map((s) => ({ name: s.name, running: s.running })),
  };
}
