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

export default function GabrielOwnerPortfolioPage() {
  return (
    <LanguageProvider>
      <div className="min-h-screen selection:bg-[hsl(var(--primary)/0.25)]">
        <Navbar />
        <main>
          <HeroSection />
          <AboutSection />
          <SkillsSection />
          <ProjectsSection />
          <ExperienceSection />
          <EducationSection />
          <ContactSection />
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  )
}
