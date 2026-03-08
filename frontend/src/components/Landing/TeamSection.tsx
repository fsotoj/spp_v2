import { Globe, Linkedin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ── People data (ported from about_spp_module.R) ──────────────────────────────
const PEOPLE = [
    {
        name: "Agustina Giraudy",
        roleKey: "team.principalInvestigator" as const,
        linkedin: "https://www.linkedin.com/in/agustina-giraudy-72a3b81a9/",
        site: "https://agustinagiraudy.com/",
        org: "American University · Tecnológico de Monterrey",
        img: "/agustina.webp",
        color: "#FFA92A",
    },
    {
        name: "Francisco Urdinez",
        roleKey: "team.collaborator" as const,
        linkedin: "https://www.linkedin.com/in/francisco-urdinez-a8061813/",
        site: "https://www.furdinez.com/",
        org: "Universidad Católica de Chile",
        img: "/francisco.webp",
        color: "#722464",
    },
    {
        name: "Guadalupe González",
        roleKey: "team.collaborator" as const,
        linkedin: "https://www.linkedin.com/in/guadag12/",
        site: "https://guadagonzalez.com/",
        org: "University of Maryland",
        img: "/guadalupe.webp",
        color: "#722464",
    },
    {
        name: "Felipe Soto Jorquera",
        roleKey: "team.collaborator" as const,
        linkedin: "https://www.linkedin.com/in/felipesotojorquera/",
        site: null,
        org: "Hertie School",
        img: "/felipe.webp",
        color: "#722464",
    },
    {
        name: "Sergio Huertas Hernández",
        roleKey: "team.researchAssistant" as const,
        linkedin: "https://www.linkedin.com/in/sergio-huertas-hern%C3%A1ndez/",
        site: "https://serhuertas.github.io/",
        org: "Universidad Católica de Chile",
        img: "/sergio.webp",
        color: "#444447",
    },
    {
        name: "Magdalena Nieto",
        roleKey: "team.researchAssistant" as const,
        linkedin: "https://www.linkedin.com/in/magdalenanieto/",
        site: null,
        org: "Universidad de Buenos Aires",
        img: "/magdalena.webp",
        color: "#444447",
    },
];

export function TeamSection() {
    const { t } = useTranslation();

    return (
        <section className="py-24 px-6 md:px-12 bg-white border-t border-slate-100 relative overflow-hidden">
            {/* Background embellishment mirroring Solution Section */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-50/50 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3 z-0 pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row-reverse gap-16">

                {/* Right Side (visually): Header Narrative */}
                <div className="w-full lg:w-1/3 flex flex-col justify-center gap-6">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-400 tracking-tight leading-tight">{t('team.title')}</h2>
                    <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed drop-shadow-sm">
                        {t('team.body')}
                    </p>
                </div>

                {/* Left Side (visually): The People Grid */}
                <div className="w-full lg:w-2/3">
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-items-center">
                        {PEOPLE.map(person => (
                            <PersonCard key={person.name} person={person} role={t(person.roleKey)} />
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
}

/** Flip-card person card — mirrors the R `spp-property-card` component exactly */
function PersonCard({ person, role }: {
    person: {
        name: string; roleKey: string; linkedin: string;
        site: string | null; org: string; img: string; color: string;
    };
    role: string;
}) {
    return (
        <div className="spp-person-card">
            {/* Photo layer */}
            <div className="spp-person-photo" style={{ backgroundImage: `url('${person.img}')` }}>
                <div className="spp-photo-overlay" />
                <div className="spp-photo-footer">
                    <div className="spp-photo-name">{person.name}</div>
                    <div className="spp-social-row">
                        <a
                            href={person.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="spp-social-btn li"
                        >
                            <Linkedin size={11} />
                            <span className="spp-btn-text">LinkedIn</span>
                        </a>
                        {person.site && (
                            <a
                                href={person.site}
                                target="_blank"
                                rel="noreferrer"
                                className="spp-social-btn web"
                            >
                                <Globe size={11} />
                                <span className="spp-btn-text">Website</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Info panel */}
            <div className="spp-person-info">
                <span className="spp-role-badge" style={{ backgroundColor: person.color }}>
                    {role}
                </span>
                <p className="spp-person-name">{person.name}</p>
                <p className="spp-person-org">{person.org}</p>
            </div>
        </div>
    );
}
