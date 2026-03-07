import { HeroSection } from '../components/Landing/HeroSection';
import { WhySPPSection } from '../components/Landing/WhySPPSection';
import { TeamSection } from '../components/Landing/TeamSection';

export function LandingPage() {
    return (
        <div className="min-h-screen bg-spp-bgLight text-spp-textDark font-sans selection:bg-brand-100 selection:text-brand-900 animate-in fade-in duration-500">
            <HeroSection />
            <WhySPPSection />
            <TeamSection />

            {/* ── Footer ────────────────────────────────────────────────── */}
            <footer className="py-12 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest flex flex-col gap-2">
                    <div>&copy; {new Date().getFullYear()} Subnational Politics Project</div>
                    <div>
                        Designed by:{' '}
                        <a href="https://www.linkedin.com/in/felipesotojorquera/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-400 transition-colors">
                            Felipe Soto Jorquera
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}


