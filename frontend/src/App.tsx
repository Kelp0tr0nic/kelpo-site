import { useEffect, useState } from 'react'
import type { Resume } from './types'

export default function App() {
  const [resume, setResume] = useState<Resume | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/resume', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`)
        return res.json() as Promise<Resume>
      })
      .then(setResume)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Could not load resume')
      })
    return () => controller.abort()
  }, [])

  if (error) {
    return (
      <main className="state">
        <h1>Could not load resume</h1>
        <p>{error}</p>
        <p className="hint">Is the backend running on port 3000?</p>
      </main>
    )
  }

  if (!resume) return <main className="state">Loading…</main>

  return (
    <main className="page">
      <header className="hero">
        <h1>{resume.name}</h1>
        <p className="title">{resume.title}</p>
        <p className="meta">
          <span>{resume.location}</span>
          <a href={`mailto:${resume.email}`}>{resume.email}</a>
          {resume.links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </p>
      </header>

      <section>
        <h2>Summary</h2>
        <p>{resume.summary}</p>
      </section>

      <section>
        <h2>Experience</h2>
        {resume.experience.map((job) => (
          <article className="entry" key={`${job.company}-${job.period}`}>
            <div className="entry-head">
              <h3>{job.role} <span className="at">· {job.company}</span></h3>
              <span className="period">{job.period}</span>
            </div>
            <ul>
              {job.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
            </ul>
          </article>
        ))}
      </section>

      <section>
        <h2>Projects</h2>
        {resume.projects.map((project) => (
          <article className="entry" key={project.name}>
            <div className="entry-head">
              <h3>
                {project.url ? (
                  <a href={project.url} target="_blank" rel="noreferrer">{project.name}</a>
                ) : project.name}
              </h3>
            </div>
            <p>{project.description}</p>
            <div className="tags">
              {project.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </article>
        ))}
      </section>

      <section>
        <h2>Skills</h2>
        <div className="skills">
          {resume.skills.map((group) => (
            <div className="skill-group" key={group.group}>
              <strong>{group.group}</strong>
              <span>{group.items.join(' · ')}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Education</h2>
        {resume.education.map((edu) => (
          <article className="entry" key={`${edu.school}-${edu.period}`}>
            <div className="entry-head">
              <h3>{edu.degree} <span className="at">· {edu.school}</span></h3>
              <span className="period">{edu.period}</span>
            </div>
          </article>
        ))}
      </section>

      <footer>Data served by the Bun / Elysia API at <code>/api/resume</code></footer>
    </main>
  )
}
