import { HeroSection } from '../components/Landing/HeroSection';
import { WhySPPSection } from '../components/Landing/WhySPPSection';
import { SolutionSection } from '../components/Landing/SolutionSection';
import { TeamSection } from '../components/Landing/TeamSection';

export function LandingPage() {
    return (
        <div className="min-h-screen bg-spp-bgLight text-spp-textDark font-sans selection:bg-brand-100 selection:text-brand-900 animate-in fade-in duration-500">
            <HeroSection />
            <WhySPPSection />
            <SolutionSection />
            <TeamSection />

            {/* ── Footer ────────────────────────────────────────────────── */}
            <footer className="py-16 border-t border-slate-100 bg-slate-50/50">
                <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-8">
                    <img 
                        src="/EscuelaCienciasSocialesyGobierno_Horizontal_Blanco.webp" 
                        alt="Escuela de Ciencias Sociales y Gobierno" 
                        className="header-university-logo h-10 w-auto opacity-40 hover:opacity-100 transition-all duration-500"
                    />
                    
                    <div className="flex flex-col items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        <div>&copy; {new Date().getFullYear()} Subnational Politics Project</div>
                        <div>
                            Designed by:{' '}
                            <a href="https://www.linkedin.com/in/felipesotojorquera/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-400 transition-colors">
                                Felipe Soto Jorquera
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}


