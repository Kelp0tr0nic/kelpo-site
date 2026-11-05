import data from './resume.json'

// All personal data lives in resume.json. This file is only the shape contract,
// so the single source of truth stays a plain data file you can edit by hand.
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

export const resume: Resume = data
