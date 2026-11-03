import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/Icons";
import { HomeExperience, HomeMotion } from "@/components/HomeExperience";
import {
  getFaqs,
  getPageText,
  getServices,
  getTestimonials,
} from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { serviceAreas } from "@content/fallback";
import { FaqAnswer } from "@/components/FaqAnswer";
import "./home.css";

export const revalidate = 3600;
export const metadata: Metadata = pageMetadata({
  title: "Mobile IV Therapy in Lakewood Ranch & Sarasota | Avida Luna",
  description:
    "Nurse-led mobile IV therapy at your home, office or event in Lakewood Ranch, Sarasota and Bradenton. IV drips from $99 with Shary Gonzalez, RN, BSN.",
  path: "/",
});

const previewMenu = [
  {
    name: "Hydration IV (Lactated Ringer's)",
    description: "Our starting option for IV hydration.",
    price: 99,
  },
  {
    name: "Athlete Recovery IV",
    description: "An IV option for your post-training plans.",
    price: 180,
  },
  {
    name: "Energy IV",
    description: "Personalized IV wellness, with your nurse.",
    price: 180,
  },
  {
    name: "Myers IV",
    description: "Discuss this IV option with Shary.",
    price: 199,
  },
  {
    name: "Myers with Chromium IV",
    description: "A Myers option with chromium.",
    price: 240,
  },
];
const Book = () => (
  <Link href="/book" className="home-button">
    Book an appointment <ArrowRightIcon />
  </Link>
);

export default async function HomePage() {
  const [text, faqs, services, testimonials] = await Promise.all([
    getPageText("home"),
    getFaqs(),
    getServices(),
    getTestimonials(),
  ]);
  const s = text.sections;
  const liveMenu = services.filter(
    (s) => s.category === "iv" && !s.todo && s.showPrice && s.price !== null,
  );
  const menu = liveMenu.length ? liveMenu : previewMenu;
  const questions = [
    "faq-what-is",
    "faq-cost",
    "faq-eligibility",
    "faq-book",
  ].flatMap((id) => faqs.filter((f) => f.id === id));
  return (
    <div className="home-design">
      <HomeMotion />
      <section className="home-hero home-wrap">
        <div className="hero-copy">
          <p className="home-label">
            <span className="label-line" />
            Mobile IV therapy · Lakewood Ranch · Sarasota · Bradenton
          </p>
          <h1>{text.heading}</h1>
          <p className="hero-intro">{text.intro}</p>
          <div className="hero-actions">
            <Book />
            <a className="home-text-link" href="#meet">
              Meet your nurse <ArrowRightIcon className="home-diagonal-arrow" />
            </a>
          </div>
          <p className="hero-credentials">
            RN, BSN <span>·</span> 17+ years in nursing <span>·</span> English &
            Spanish
          </p>
        </div>
        <figure className="hero-portrait">
          <div className="portrait-frame">
            <Image
              src="/brand/shary-hero.webp"
              alt="Shary Gonzalez, RN, BSN, founder of Avida Luna Wellness"
              fill
              priority
              sizes="(min-width: 900px) 42vw, 100vw"
            />
          </div>
          <figcaption>
            <span>Shary Gonzalez</span>
            <span>YOUR NURSE. YOUR NEIGHBOR.</span>
          </figcaption>
        </figure>
        <div className="hero-bottom">
          <p>Professional care. Personally delivered.</p>
          <a href="#services">
            Explore the practice <span aria-hidden>↓</span>
          </a>
        </div>
      </section>
      <section
        id="services"
        className="home-services home-wrap home-section"
        data-reveal
      >
        <div className="section-heading">
          <p className="home-label">01 / Care, on your terms</p>
          <h2>{s.services?.heading}</h2>
          <p>
            Experienced hands. Personal attention.
            <br />
            Without the trip to a clinic.
          </p>
        </div>
        <div className="service-editorial">
          <Link href="/services" className="service-main">
            <Image
              src="/services/iv-hydration.webp"
              alt=""
              fill
              className="service-photo"
              sizes="(min-width: 768px) 55vw, 100vw"
            />
            <span className="home-label">THE CORE OF OUR PRACTICE</span>
            <div>
              <h3>
                Mobile IV
                <br />
                hydration
              </h3>
              <p>
                IV drips and vitamin injections, given by your nurse at your
                home, office or event.
              </p>
            </div>
            <span className="service-bottom">
              Explore IV services <ArrowRightIcon />
            </span>
          </Link>
          <div className="service-support">
            <Link href="/services#consultation">
              <span className="home-label">LET’S TALK</span>
              <h3>
                Personalized
                <br />
                consultations
              </h3>
              <p>
                Time to discuss your goals and the services that may be right
                for you.
              </p>
              <span className="service-bottom">
                Learn more <ArrowRightIcon />
              </span>
            </Link>
            <Link href="/events">
              <span className="home-label">CARE, TOGETHER</span>
              <h3>
                Group IV &
                <br />
                corporate events
              </h3>
              <p>
                IV hydration for your workplace, bachelorette party, private
                group or event.
              </p>
              <span className="service-bottom">
                Plan a group visit <ArrowRightIcon />
              </span>
            </Link>
          </div>
        </div>
        <p className="small-addons">
          A little extra, if you’d like.{" "}
          <Link href="/add-ons">
            Explore optional red light and aromatherapy add-ons{" "}
            <ArrowRightIcon className="home-diagonal-arrow" />
          </Link>
        </p>
      </section>
      <section id="meet" className="home-meet" data-reveal>
        <div className="home-wrap meet-grid">
          <figure>
            <div className="meet-photo">
              <Image
                src="/brand/shary-meet.webp"
                alt="Shary Gonzalez, RN, BSN, smiling outdoors in black scrubs"
                fill
                sizes="(min-width: 900px) 36vw, 90vw"
              />
            </div>
            <figcaption>Shary Gonzalez, RN, BSN · Founder</figcaption>
          </figure>
          <div className="meet-copy">
            <p className="home-label">02 / Meet your nurse</p>
            <h2>{s.meet?.heading}</h2>
            <p>{s.meet?.text}</p>
            <div className="meet-credentials">
              <p>Registered Nurse, BSN · 17+ years in nursing</p>
              <p>
                Mental health, women’s health, maternal health,
                <br />
                surgery and neurology
              </p>
              <p>English & Spanish · Se habla español</p>
            </div>
            <Link href="/about" className="home-text-link">
              Get to know Shary <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>
      <section
        className="home-notes home-wrap"
        aria-labelledby="notes-heading"
        data-reveal
      >
        <div className="notes-card">
          <div>
            <p className="home-label">A complimentary guide from Shary</p>
            <h2 id="notes-heading">Wellness Notes from a Nurse</h2>
          </div>
          <div>
            <p>
              Thoughtful insights and practical reminders to support your
              long-term health, one intentional choice at a time.
            </p>
            <Link href="/join" className="home-button">
              Get your free copy <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>
      <section id="how" className="home-how home-wrap home-section" data-reveal>
        <div className="section-heading">
          <p className="home-label">03 / How a visit works</p>
          <h2>{s.how?.heading}</h2>
          <p>
            From your first hello
            <br />
            to your own front door.
          </p>
        </div>
        <HomeExperience />
      </section>
      <section className="home-menu" data-reveal>
        <div className="home-wrap home-section">
          <div className="section-heading">
            <p className="home-label">04 / The IV menu</p>
            <h2>{s.menu?.heading}</h2>
            <p>
              Clear pricing. No surprises.
              <br />
              Your options, at a glance.
              <br />
              Your nurse helps you find the right fit.
            </p>
          </div>
          <div className="iv-menu">
            {menu.map((item, i) => (
              <details key={item.name}>
                <summary>
                  <span className="menu-index">0{i + 1}</span>
                  <h3>{item.name}</h3>
                  <span className="menu-price">
                    <small>FROM</small> ${item.price}
                  </span>
                  <span className="menu-plus" aria-hidden>
                    +
                  </span>
                </summary>
                <div className="menu-detail">
                  <p>{item.description}</p>
                  <Link href="/book">
                    Book an appointment <ArrowRightIcon />
                  </Link>
                </div>
              </details>
            ))}
          </div>
          <div className="menu-foot">
            <p>
              {!liveMenu.length
                ? "Starting prices are pending Shary’s confirmation. Final service selection and pricing are confirmed when you book."
                : "Service selection and final pricing are confirmed when you book."}
            </p>
            <Link href="/services" className="home-text-link">
              View all services <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>
      {testimonials.length > 0 && (
        <section className="home-wrap home-section" data-reveal>
          <p className="home-label">Patient experiences</p>
          <h2>In their own words.</h2>
          <div className="home-quotes">
            {testimonials.map((t) => (
              <figure key={t.id}>
                <blockquote>“{t.quote}”</blockquote>
                <figcaption>{t.firstName}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      <section
        className="home-area home-wrap home-section"
        aria-labelledby="areas-heading"
        data-reveal
      >
        <div className="area-copy">
          <p className="home-label">05 / Where we provide care</p>
          <h2 id="areas-heading">{s.areas?.heading}</h2>
          <p>{s.areas?.text}</p>
          <div className="area-actions">
            <Book />
            <Link href="/contact" className="home-text-link">
              Ask about your location <ArrowRightIcon />
            </Link>
          </div>
        </div>
        <div className="area-card">
          <h3>Mobile IV near you</h3>
          <p className="area-sub">
            In-home IV hydration in Lakewood Ranch, Sarasota, Bradenton and
            nearby communities. We come to you.
          </p>
          <ul className="area-tags" aria-label="Communities we serve">
            {serviceAreas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
          <p className="area-note">
            Don’t see your neighborhood? Contact us to confirm availability and
            any applicable travel fees.
          </p>
        </div>
      </section>
      <section className="home-faq home-wrap home-section" data-reveal>
        <div>
          <p className="home-label">06 / A little clarity</p>
          <h2>{s.faq?.heading}</h2>
          <Link href="/faq" className="home-text-link">
            All your questions <ArrowRightIcon />
          </Link>
        </div>
        <div>
          {questions.map((f) => (
            <details key={f.id}>
              <summary>
                <h3>{f.question}</h3>
                <span aria-hidden>+</span>
              </summary>
              <FaqAnswer text={f.answer} />
            </details>
          ))}
        </div>
      </section>
      <section className="home-final">
        <div className="home-wrap">
          <p className="home-label">YOUR PLACE. YOUR PACE. YOUR NURSE.</p>
          <h2>{s.cta?.heading}</h2>
          <div>
            <p>{s.cta?.text}</p>
            <Book />
          </div>
        </div>
      </section>
    </div>
  );
}
