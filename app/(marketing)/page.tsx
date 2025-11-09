"use client";

import Link from "next/link";
import Image from "next/image";
import Logo from "@/components/nav/Logo";
import "./landing.css";

export default function LandingPage() {
  return (
    <div className="landingPage">
      {/* Navigation */}
      <nav className="landingNav">
        <div className="navContent">
          <div className="navLogo">
            <Logo />
            <span className="navLogoText">Consensi</span>
          </div>
          <div className="navLinks">
            <Link href="/login" className="navLink">Sign In</Link>
            <Link href="/create-account" className="navButton">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="heroSection">
        <div className="heroContent">
          <div className="heroText">
            <h1 className="heroTitle">
              Democracy, <span className="heroTitleAccent">simplified</span>
            </h1>
            <p className="heroSubtitle">
              Cut through the noise. Understand Congress. Make your voice heard.
            </p>
            <div className="heroButtons">
              <Link href="/create-account" className="heroButtonPrimary">
                Get Started Free
              </Link>
              <Link href="/login" className="heroButtonSecondary">
                Sign In
              </Link>
            </div>
          </div>
          <div className="heroScreenshot">
            <div className="screenshotContainer">
              <Image
                src="/images/landing/feed-preview.png"
                alt="Feed Preview"
                width={800}
                height={600}
                className="screenshotImage"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="problemSection">
        <div className="sectionContent">
          <div className="problemScreenshot">
            <div className="screenshotContainer">
              <Image
                src="/images/landing/bill-details.png"
                alt="Bill Details"
                width={800}
                height={600}
                className="screenshotImage"
              />
            </div>
          </div>
          <div className="problemText">
            <h2 className="sectionTitle">
              Know your representatives? <span className="textAccent">Most don't.</span>
            </h2>
            <p className="sectionDescription">
              Congress approval hovers around 30%. This disconnect often comes from a lack of transparency. 
              Americans want a window into democracy, and that's exactly what Consensi provides.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="featuresSection">
        <div className="sectionContent">
          <div className="featuresHeader">
            <h2 className="sectionTitle">Everything you need to <span className="textAccent">stay informed</span></h2>
            <p className="sectionDescription">
              AI-powered tools that turn complex legislation into clear, actionable insights
            </p>
          </div>
          <div className="featuresGrid">
            <div className="featureCard">
              <div className="featureIcon">📋</div>
              <h3 className="featureTitle">Simplified Summaries</h3>
              <p className="featureDescription">
                AI breaks down congressional jargon into plain language you can actually understand
              </p>
            </div>
            <div className="featureCard">
              <div className="featureIcon">💬</div>
              <h3 className="featureTitle">AI Chat Assistant</h3>
              <p className="featureDescription">
                Ask questions about any bill and get instant, accurate answers powered by advanced AI
              </p>
            </div>
            <div className="featureCard">
              <div className="featureIcon">📊</div>
              <h3 className="featureTitle">Personalized Feed</h3>
              <p className="featureDescription">
                See bills that matter to you, organized by topics you care about most
              </p>
            </div>
            <div className="featureCard">
              <div className="featureIcon">✉️</div>
              <h3 className="featureTitle">Contact Representatives</h3>
              <p className="featureDescription">
                Reach out to your representatives directly to voice your opinion on legislation
              </p>
            </div>
            <div className="featureCard">
              <div className="featureIcon">👍</div>
              <h3 className="featureTitle">Show Support</h3>
              <p className="featureDescription">
                Endorse or oppose bills and see how others in your community feel
              </p>
            </div>
            <div className="featureCard">
              <div className="featureIcon">📈</div>
              <h3 className="featureTitle">Demographic Insights</h3>
              <p className="featureDescription">
                Representatives can see who supports their bills and understand their constituents better
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="howItWorksSection">
        <div className="sectionContent">
          <div className="howItWorksHeader">
            <h2 className="sectionTitle">How we built it</h2>
            <p className="sectionDescription">
              Cutting-edge technology meets real-world democracy
            </p>
          </div>
          <div className="stepsContainer">
            <div className="stepCard">
              <div className="stepNumber">1</div>
              <h3 className="stepTitle">Congressional Data</h3>
              <p className="stepDescription">
                We pull real-time legislation from the Congressional API, ensuring you always have the latest information
              </p>
            </div>
            <div className="stepCard">
              <div className="stepNumber">2</div>
              <h3 className="stepTitle">AI Classification</h3>
              <p className="stepDescription">
                Advanced zero-shot classification models automatically categorize bills by topic—no retraining needed
              </p>
            </div>
            <div className="stepCard">
              <div className="stepNumber">3</div>
              <h3 className="stepTitle">Smart Summarization</h3>
              <p className="stepDescription">
                Complex legal language gets transformed into clear, concise summaries anyone can understand
              </p>
            </div>
            <div className="stepCard">
              <div className="stepNumber">4</div>
              <h3 className="stepTitle">Modern Interface</h3>
              <p className="stepDescription">
                Built with React and TypeScript for a fast, responsive experience that works everywhere
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshot Showcase */}
      <section className="screenshotSection">
        <div className="sectionContent">
          <div className="screenshotGrid">
            <div className="screenshotContainer large">
              <Image
                src="/images/landing/chat-interface.png"
                alt="Chat Interface"
                width={800}
                height={600}
                className="screenshotImage"
              />
            </div>
            <div className="screenshotContainer large">
              <Image
                src="/images/landing/contact-representative.png"
                alt="Representative Contact"
                width={800}
                height={600}
                className="screenshotImage"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="ctaSection">
        <div className="sectionContent">
          <div className="ctaCard">
            <h2 className="ctaTitle">Ready to become a better citizen?</h2>
            <p className="ctaDescription">
              Join thousands of Americans who are taking control of their democracy
            </p>
            <Link href="/create-account" className="ctaButton">
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landingFooter">
        <div className="footerContent">
          <div className="footerLogo">
            <Logo />
            <span className="footerLogoText">Consensi</span>
          </div>
          <p className="footerText">
            Making democracy accessible, one bill at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}
