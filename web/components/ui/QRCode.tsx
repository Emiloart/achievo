"use client";

import dynamic from "next/dynamic";

const QRCodeSVG = dynamic(async () => (await import("qrcode.react")).QRCodeSVG, { ssr: false });

export function QRCode({ value, size = 120 }: { value: string; size?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-3 shadow-soft">
      <QRCodeSVG value={value} size={size} bgColor="transparent" fgColor="#0f172a" />
    </div>
  );
}
