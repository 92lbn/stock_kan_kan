import { PageSkeleton } from "@/components/ui/skeleton";

// Affiché instantanément à chaque navigation pendant que la page se rend côté
// serveur (streaming). Crée aussi une frontière que Next précharge en prod, donc
// le squelette apparaît sans attendre le round-trip.
export default function Loading() {
  return <PageSkeleton />;
}
