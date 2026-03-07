import { Globe, Linkedin } from 'lucide-react';

// ── People data (ported from about_spp_module.R) ──────────────────────────────
const PEOPLE = [
    {
        name: "Agustina Giraudy",
        role: "Principal Investigator",
        linkedin: "https://www.linkedin.com/in/agustina-giraudy-72a3b81a9/",
        site: "https://agustinagiraudy.com/",
        org: "American University · Tecnológico de Monterrey",
        img: "/agustina.webp",
        color: "#FFA92A",
    },
    {
        name: "Francisco Urdinez",
        role: "Collaborator",
        linkedin: "https://www.linkedin.com/in/francisco-urdinez-a8061813/",
        site: "https://www.furdinez.com/",
        org: "Universidad Católica de Chile",
        img: "/francisco.webp",
        color: "#722464",
    },
    {
        name: "Guadalupe González",
        role: "Collaborator",
        linkedin: "https://www.linkedin.com/in/guadag12/",
        site: "https://guadagonzalez.com/",
        org: "University of Maryland",
        img: "/guadalupe.webp",
        color: "#722464",
    },
    {
        name: "Felipe Soto Jorquera",
        role: "Collaborator",
        linkedin: "https://www.linkedin.com/in/felipesotojorquera/",
        site: null,
        org: "Hertie School, Berlin",
        img: "/felipe.webp",
        color: "#722464",
    },
    {
        name: "Sergio Huertas Hernández",
        role: "Research Assistant",
        linkedin: "https://www.linkedin.com/in/sergio-huertas-hern%C3%A1ndez/",
        site: "https://serhuertas.github.io/",
        org: "Universidad Católica de Chile",
        img: "/sergio.webp",
        color: "#444447",
    },
    {
        name: "Magdalena Nieto",
        role: "Research Assistant",
        linkedin: "https://www.linkedin.com/in/magdalenanieto/",
        site: null,
        org: "Universidad de Buenos Aires",
        img: "/magdalena.webp",
        color: "#444447",
    },
];

export function TeamSection() {
    return (
        <section className="py-24 px-6 md:px-12 bg-spp-bgLight border-t border-slate-100 relative overflow-hidden">
            <img
                src="/background.svg"
                aria-hidden="true"
                className="pointer-events-none select-none absolute top-0 right-0 h-full w-auto rotate-90 opacity-[0.3] mix-blend-multiply"
                onLoad={() => console.log('Successfully loaded background.svg in Team section')}
                onError={(e) => console.error('Failed to load background.svg in Team section', e)}
            />
            <div className="max-w-7xl mx-auto relative z-10">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center mb-3 tracking-tight">Team</h2>
                <p className="text-center text-slate-500 text-sm font-medium mb-14 max-w-lg mx-auto">
                    A multinational research team spanning the United States, Chile, Germany, and Argentina.
                </p>

                {/* Flip-card grid — responsive: 2 cols on mobile, 3 on md, 6 on xl */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 justify-items-center">
                    {PEOPLE.map(person => (
                        <PersonCard key={person.name} person={person} />
                    ))}
                </div>
            </div>
        </section>
    );
}

/** Flip-card person card — mirrors the R `spp-property-card` component exactly */
function PersonCard({ person }: {
    person: {
        name: string; role: string; linkedin: string;
        site: string | null; org: string; img: string; color: string;
    }
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
                    {person.role}
                </span>
                <p className="spp-person-name">{person.name}</p>
                <p className="spp-person-org">{person.org}</p>
            </div>
        </div>
    );
}
