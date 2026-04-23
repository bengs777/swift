import { NextRequest, NextResponse } from "next/server"
import type { Template } from "@/lib/types"

// Pre-built templates
const templates: Template[] = [
  {
    id: "landing-page",
    name: "Landing Page",
    description: "A modern SaaS landing page with hero, features, and CTA sections",
    category: "Marketing",
    prompt: "Create a modern SaaS landing page with a hero section, features grid, testimonials, and call-to-action",
    files: [
      {
        path: "app/page.tsx",
        language: "tsx",
        content: `export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <section className="py-20 text-center">
        <h1 className="text-5xl font-bold">Your Product Name</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          The best solution for your needs
        </p>
      </section>
    </main>
  )
}`,
      },
    ],
  },
  {
    id: "dashboard",
    name: "Dashboard",
    description: "An admin dashboard with sidebar navigation, charts, and data tables",
    category: "Application",
    prompt: "Create an admin dashboard with sidebar navigation, overview cards, charts, and a recent activity section",
    files: [
      {
        path: "app/dashboard/page.tsx",
        language: "tsx",
        content: `export default function Dashboard() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r">
        <nav className="p-4">Dashboard Nav</nav>
      </aside>
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </main>
    </div>
  )
}`,
      },
    ],
  },
  {
    id: "pricing-page",
    name: "Pricing Page",
    description: "A pricing page with tier comparison and FAQ section",
    category: "Marketing",
    prompt: "Create a pricing page with three tiers, feature comparison, and an FAQ accordion",
    files: [
      {
        path: "app/pricing/page.tsx",
        language: "tsx",
        content: `export default function PricingPage() {
  return (
    <main className="py-20">
      <h1 className="text-center text-4xl font-bold">Pricing</h1>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {/* Pricing tiers */}
      </div>
    </main>
  )
}`,
      },
    ],
  },
  {
    id: "auth-pages",
    name: "Authentication",
    description: "Login and signup forms with validation",
    category: "Application",
    prompt: "Create login and signup pages with form validation and error handling",
    files: [
      {
        path: "app/login/page.tsx",
        language: "tsx",
        content: `export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <form className="w-full max-w-md space-y-4 p-8">
        <h1 className="text-2xl font-bold">Sign In</h1>
      </form>
    </div>
  )
}`,
      },
    ],
  },
  {
    id: "blog-layout",
    name: "Blog Layout",
    description: "A blog with article list, individual post pages, and categories",
    category: "Content",
    prompt: "Create a blog layout with featured posts, article cards, and category filtering",
    files: [
      {
        path: "app/blog/page.tsx",
        language: "tsx",
        content: `export default function BlogPage() {
  return (
    <main className="py-12">
      <h1 className="text-3xl font-bold">Blog</h1>
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Blog posts */}
      </div>
    </main>
  )
}`,
      },
    ],
  },
  {
    id: "contact-form",
    name: "Contact Form",
    description: "A contact page with form, map, and company info",
    category: "Marketing",
    prompt: "Create a contact page with a form, office location details, and social links",
    files: [
      {
        path: "app/contact/page.tsx",
        language: "tsx",
        content: `export default function ContactPage() {
  return (
    <main className="py-12">
      <h1 className="text-3xl font-bold">Contact Us</h1>
      <form className="mt-8 max-w-lg space-y-4">
        {/* Contact form fields */}
      </form>
    </main>
  )
}`,
      },
    ],
  },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")

  let filteredTemplates = templates

  if (category) {
    filteredTemplates = templates.filter(
      (t) => t.category.toLowerCase() === category.toLowerCase()
    )
  }

  return NextResponse.json({ templates: filteredTemplates })
}

async function getSingleTemplate(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const template = templates.find((t) => t.id === params.id)

  if (!template) {
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 }
    )
  }

  return NextResponse.json({ template })
}
