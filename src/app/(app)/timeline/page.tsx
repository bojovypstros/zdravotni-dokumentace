import { PlaceholderPage } from "@/components/app-shell/placeholder-page";


export const instant = false;
export const metadata = { title: "Časová osa" };

export default function TimelinePage() {
  return (
    <PlaceholderPage
      title="Časová osa"
      description="Jednotná časová osa klinických událostí (dekurz)."
    />
  );
}
