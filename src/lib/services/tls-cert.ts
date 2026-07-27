import tls from "node:tls";
import { UpstreamError } from "@/lib/services/errors";

export interface TlsCertInfo {
  subject: Record<string, string>;
  issuer: Record<string, string>;
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  subjectAltNames: string[];
  fingerprint256: string;
  serialNumber: string;
  protocol: string | null;
  cipher: tls.CipherNameAndProtocol | null;
  authorized: boolean;
  authorizationError?: string;
}

export function getTlsCertificate(host: string, port = 443, timeoutMs = 8000): Promise<TlsCertInfo> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
        rejectUnauthorized: false,
        timeout: timeoutMs,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate(true);
          if (!cert || Object.keys(cert).length === 0) {
            reject(new UpstreamError("No TLS certificate returned by host."));
            socket.end();
            return;
          }
          const now = Date.now();
          const validTo = new Date(cert.valid_to).getTime();
          resolve({
            subject: cert.subject as unknown as Record<string, string>,
            issuer: cert.issuer as unknown as Record<string, string>,
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            daysUntilExpiry: Math.round((validTo - now) / 86_400_000),
            subjectAltNames: cert.subjectaltname
              ? cert.subjectaltname.split(", ").map((s) => s.replace(/^DNS:/, ""))
              : [],
            fingerprint256: cert.fingerprint256,
            serialNumber: cert.serialNumber,
            protocol: socket.getProtocol(),
            cipher: socket.getCipher(),
            authorized: socket.authorized,
            authorizationError: socket.authorized ? undefined : String(socket.authorizationError),
          });
        } catch (err) {
          reject(err);
        } finally {
          socket.end();
        }
      }
    );

    socket.on("timeout", () => {
      socket.destroy();
      reject(new UpstreamError("Connection to host timed out while fetching TLS certificate."));
    });

    socket.on("error", (err) => {
      reject(new UpstreamError(`TLS connection failed: ${err.message}`));
    });
  });
}
