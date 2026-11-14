"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type StepPhoto = { src: string; alt: string; position?: string } | null;

// Step photos for the sticky card. A step with no photo keeps the line drawing.
const steps: {
  label: string;
  title: string;
  text: string;
  detail: string;
  visual: string;
  note: string;
  photo: StepPhoto;
}[] = [
  {
    label: "Request",
    title: "A little about you. Then a time that works.",
    text: "Tap Book and share your name and email. Your booking link appears instantly, then you pick your services and a time on our secure, HIPAA-compliant booking page. No health information is collected on this website.",
    detail: "01 / YOUR DETAILS",
    visual: "Your care starts with a conversation.",
    note: "A simple first step. About 30 seconds.",
    photo: {
      src: "/how/step-01-request.webp",
      alt: "A phone showing the Avida Luna “Book Your Visit” screen on a book beside a coffee mug in a bright Sarasota home",
      position: "40% 55%",
    },
  },
  {
    label: "Assessment",
    title: "Professional care starts with listening.",
    text: "Complete your confidential health screening and payment on our secure, HIPAA-compliant booking page. Before your IV begins, Shary reviews it with you and checks that the service is a good fit.",
    detail: "02 / BOOKING & SCREENING",
    visual: "Personal attention. From the very beginning.",
    note: "Medical screening happens on a secure, HIPAA-compliant booking page.",
    photo: {
      src: "/how/step-02-assessment.webp",
      alt: "Avida Luna vials labeled Vitamin C, B Complex, Magnesium, Zinc and B12 on a stone tray beside an Avida Luna IV bag",
      position: "45% 60%",
    },
  },
  {
    label: "Visit",
    title: "Your place. Your nurse. Your time.",
    text: "Shary comes to your home, office or event in the Lakewood Ranch area and stays with you throughout your visit.",
    detail: "03 / YOUR VISIT",
    visual: "Professional care. Personally delivered.",
    note: "Add an optional ritual after booking. Pay at your visit or online.",
    photo: {
      src: "/how/step-03-visit.webp",
      alt: "An Avida Luna IV bag on a stand, labeled vials and an Avida Luna nurse bag beside a cream armchair in a bright Sarasota home with palm trees outside",
      position: "40% 55%",
    },
  },
];

export function HomeExperience() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const elements = root.current?.querySelectorAll<HTMLElement>("[data-step]");
    if (!elements) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setActive(Number((entry.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-25% 0px -35% 0px", threshold: 0 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return (
    <div className="visit-story" ref={root}>
      <div
        className={`visit-visual${steps[active].photo ? " has-photo" : ""}`}
        aria-hidden="true"
      >
        {steps.map((step, i) =>
          step.photo ? (
            <Image
              key={step.label}
              src={step.photo.src}
              alt={step.photo.alt}
              fill
              sizes="(min-width: 768px) 40vw, 100vw"
              className={`visit-photo${i === active ? " is-active" : ""}`}
              style={{ objectPosition: step.photo.position }}
            />
          ) : null,
        )}
        <p className="home-label">{steps[active].detail}</p>
        <div className="visit-drawing">
          <span className="visit-orbit" />
          <span className="visit-point" />
          <span className="visit-path" />
        </div>
        <p className="visit-message">{steps[active].visual}</p>
        <p className="visit-note">{steps[active].note}</p>
        <div className="visit-progress">
          {steps.map((step, i) => (
            <span key={step.label} className={i <= active ? "is-active" : ""} />
          ))}
        </div>
      </div>
      <ol className="visit-steps">
        {steps.map((step, i) => (
          <li
            key={step.label}
            data-step={i}
            className={i === active ? "is-active" : ""}
          >
            {step.photo ? (
              <div className="visit-step-photo">
                <Image
                  src={step.photo.src}
                  alt={step.photo.alt}
                  fill
                  sizes="100vw"
                  style={{ objectPosition: step.photo.position }}
                />
              </div>
            ) : null}
            <span className="step-index">0{i + 1}</span>
            <div>
              <p className="home-label">{step.label}</p>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function HomeMotion() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-seen");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    document
      .querySelectorAll(".home-design [data-reveal]")
      .forEach((element) => observer.observe(element));
    const update = () => {
      document.body.classList.toggle("home-scrolled", window.scrollY > 60);
      const hero = document.querySelector(".home-hero");
      document.body.classList.toggle(
        "home-past-hero",
        !!hero && hero.getBoundingClientRect().bottom < 80,
      );
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      document.body.classList.remove("home-scrolled", "home-past-hero");
    };
  }, []);
  return null;
}
