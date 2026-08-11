import Link from "next/link";
import { getCurrentUser } from "@stock-kan-kan/auth/dal";
import { Card } from "@stock-kan-kan/ui/card";
import { Icon } from "@stock-kan-kan/ui/icons";

export default async function PlanningHomePage() {
  const user = await getCurrentUser();
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <section className="planning-hero relative overflow-hidden rounded-3xl border border-line px-5 py-8 shadow-sm sm:px-8 sm:py-10">
        <div className="relative z-10 max-w-2xl">
          <p className="eyebrow">kan·kan planning</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Bonjour {user.name}</h1>
          <p className="mt-3 max-w-xl leading-7 text-muted">
            {isAdmin
              ? "Organisez l’équipe, publiez les créneaux et suivez les heures depuis un espace clair."
              : "Retrouvez votre planning et vérifiez simplement les heures enregistrées à la tablette."}
          </p>
        </div>
        <div className="planning-orbit" aria-hidden="true" />
      </section>

      <div className={isAdmin ? "grid gap-4 md:grid-cols-3" : "grid gap-4 sm:grid-cols-2"}>
        <HomeCard
          href="/planning"
          icon="calendar"
          title={isAdmin ? "Planning de l’équipe" : "Mon planning"}
          description={isAdmin ? "Créer et ajuster les créneaux de chacun." : "Voir vos horaires de la semaine ou du mois."}
          action="Consulter le planning"
        />
        <HomeCard
          href="/pointage"
          icon="clock"
          title={isAdmin ? "Heures de l’équipe" : "Mes heures"}
          description="Consulter l’historique des arrivées et des départs."
          action="Voir l’historique"
        />
        {isAdmin && (
          <HomeCard
            href="/employees"
            icon="users"
            title="Équipe"
            description="Gérer les comptes et les PIN de la borne tablette."
            action="Gérer l’équipe"
          />
        )}
      </div>

      {!isAdmin && (
        <Card className="flex items-start gap-3 p-4">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-accent/12 text-accent">
            <Icon name="clock" width={20} height={20} />
          </span>
          <div>
            <h2 className="font-semibold text-ink">Avant et après le service</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Pensez à pointer votre arrivée et votre départ avec votre PIN sur la tablette du restaurant.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function HomeCard({
  href,
  icon,
  title,
  description,
  action,
}: {
  href: string;
  icon: "calendar" | "clock" | "users";
  title: string;
  description: string;
  action: string;
}) {
  return (
    <Card className="group flex min-h-52 flex-col p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-md">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/12 text-accent">
        <Icon name={icon} width={21} height={21} />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 flex-1 text-sm leading-6 text-muted">{description}</p>
      <Link className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent" href={href}>
        {action} <span className="ml-2 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
      </Link>
    </Card>
  );
}
