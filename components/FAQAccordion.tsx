// components/FAQAccordion.tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is Rynith?",
    answer:
      "Rynith helps businesses turn reviews and chats into actionable insights using AI — integrating data from platforms like Google, Yelp, Shopify, and more.",
  },
  {
    question: "How easy is it to set up?",
    answer:
      "Very easy. You don't need any technical knowledge. Most teams are up and running within 10 minutes using plug-and-play integrations.",
  },
  {
    question: "Which review platforms can I connect?",
    answer:
      "We support Google Reviews, Yelp, WhatsApp, Shopify, Facebook, and more — with new integrations added regularly.",
  },
  {
    question: "What makes your AI different?",
    answer:
      "Our AI focuses on customer intent, tone, and next steps — not just sentiment. It gives you context-rich summaries and recommendations.",
  },
  {
    question: "Is my customer data secure?",
    answer:
      "Absolutely. We use end-to-end encryption and adhere to strict data privacy practices to keep your customer information safe.",
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(index === openIndex ? null : index);
  };

  return (
    <section id="faq" className="py-20">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl sm:text-4xl font-semibold mb-12">
          Frequently Asked Questions
        </h2>

        <div className="text-left divide-y divide-[var(--border)]">
          {faqs.map((item, index) => (
            <div key={index} className="py-5">
              <button
                className="w-full flex items-center justify-between text-left group"
                onClick={() => toggle(index)}
              >
                <span
                  className={`text-base sm:text-lg font-medium transition-colors duration-300 ${
                    openIndex === index
                      ? "text-[var(--primaryTo)]"
                      : "text-[var(--text)]"
                  }`}
                >
                  {item.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 transform transition-transform duration-300 ${
                    openIndex === index ? "rotate-180 text-[var(--primaryTo)]" : ""
                  }`}
                />
              </button>

              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden text-sm text-[var(--muted)] pr-6 ${
                  openIndex === index ? "mt-3 max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                {item.answer}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
