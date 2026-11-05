// Mirrors the Resume interface in backend/src/resume.ts.
// If this duplication gets annoying, move the type into a shared workspace,
// or use Elysia Eden to infer it from the server instead.

export interface Resume {
  name: string
  title: string
  location: string
  email: string
  links: { label: string; url: string }[]
  summary: string
  experience: {
    role: string
    company: string
    period: string
    highlights: string[]
  }[]
  projects: {
    name: string
    description: string
    url?: string
    tags: string[]
  }[]
  skills: { group: string; items: string[] }[]
  education: { degree: string; school: string; period: string }[]
}
