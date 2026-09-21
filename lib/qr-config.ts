import QRCode from "qrcode";

export type QrErrorCorrection = "Q" | "H";
export type QrSizing = {
  version: number;
  modules: number;
  errorCorrection: QrErrorCorrection;
  logoAllowed: boolean;
};

export function getQrSizing(data: string): QrSizing {
  const q = QRCode.create(data, { errorCorrectionLevel: "Q" });
  const h = QRCode.create(data, { errorCorrectionLevel: "H" });
  const useH = h.modules.size === q.modules.size;
  const modules = useH ? h.modules.size : q.modules.size;
  const version = (modules - 17) / 4;
  return { version, modules, errorCorrection: useH ? "H" : "Q", logoAllowed: version < 7 };
}
