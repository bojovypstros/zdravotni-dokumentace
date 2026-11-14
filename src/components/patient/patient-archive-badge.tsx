import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Visible marker that the open chart patient is soft-archived. */
export function PatientArchiveBadge({ className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-amber-600/40 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
        className,
      )}
    >
      Archivovaný
    </Badge>
  );
}
