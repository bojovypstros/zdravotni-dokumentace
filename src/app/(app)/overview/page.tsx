import { PlaceholderPage } from "@/components/app-shell/placeholder-page";


export const instant = false;
export const metadata = { title: "Přehled" };

export default function OverviewPage() {
  return (
    <PlaceholderPage
      title="Přehled"
      description="Souhrn pacienta, aktivní medikace, poslední měření a nedávné události."
    />
  );
}
