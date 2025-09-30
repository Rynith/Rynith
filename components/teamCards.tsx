// components/WhyTeamsLoveCards.tsx
"use client"

import {
  Sparkles,
  MessagesSquare,
  Brain,
  Rocket,
} from "lucide-react"

const benefits = [
  {
    icon: <Sparkles className="w-6 h-6 text-primary" />,
    title: "Smart Summaries",
    description:
      "Condense long chats and emails into bite-sized summaries with tone, intent, and next steps — saving your team hours of manual reading.",
  },
  {
    icon: <MessagesSquare className="w-6 h-6 text-primary" />,
    title: "Unified Feedback",
    description:
      "Aggregate reviews from Google, Yelp, and other platforms into a single view, so you never miss what customers are saying.",
  },
  {
    icon: <Brain className="w-6 h-6 text-primary" />,
    title: "AI-Powered Suggestions",
    description:
      "Let AI highlight issues, praise, or opportunities automatically — from staff performance to menu items or delivery delays.",
  },
  {
    icon: <Rocket className="w-6 h-6 text-primary" />,
    title: "Rapid Deployment",
    description:
      "No complex setup. Start analyzing customer feedback in minutes with plug-and-play integrations and zero-code onboarding.",
  },
]

export default function WhyTeamsLoveCards() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
      

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((item, idx) => (
            <div
              key={idx}
              className="p-6 border border-border rounded-xl shadow-sm transition-all duration-300 transform hover:-rotate-3 hover:scale-[1.02] hover:bg-gradient-to-br hover:from-purple-100 hover:to-indigo-100 group"
            >
              <div className="mb-4">{item.icon}</div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
