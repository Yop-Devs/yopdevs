'use client'

import { LanguageProvider } from './i18n/LanguageContext'
import Navbar from './_components/Navbar'
import HeroSection from './_components/HeroSection'
import AboutSection from './_components/AboutSection'
import SkillsSection from './_components/SkillsSection'
import ProjectsSection from './_components/ProjectsSection'
import ExperienceSection from './_components/ExperienceSection'
import EducationSection from './_components/EducationSection'
import ContactSection from './_components/ContactSection'
import Footer from './_components/Footer'
import PortfolioBackdrop from './_components/PortfolioBackdrop'
import { usePortfolioReveal } from './_hooks/usePortfolioReveal'

export default function GabrielOwnerPortfolioPage() {
  usePortfolioReveal()

  return (
    <LanguageProvider>
      <div className="relative min-h-screen selection:bg-[hsl(var(--primary)/0.25)]">
        <PortfolioBackdrop />
        <Navbar />
        <div className="gop-portfolio-content relative z-10 min-w-0">
          <main>
            <HeroSection />
            <AboutSection />
            <SkillsSection />
            <ProjectsSection />
            <ExperienceSection />
            <EducationSection />
            <div className="gop-print-contact-footer">
              <ContactSection />
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </LanguageProvider>
  )
}
