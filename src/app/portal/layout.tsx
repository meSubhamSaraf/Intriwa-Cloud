import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intriwa — Track Your Car Service",
  description:
    "Live updates. Transparent pricing. Know exactly what's happening to your car at every step.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
