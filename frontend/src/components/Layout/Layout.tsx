import type { ReactNode } from 'react'
import styles from './Layout.module.css'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>{'</>'}</span>
          <span className={styles.logoText}>C++ Shell</span>
          <span className={styles.logoDivider} />
          <span className={styles.logoSub}>Online Compiler · WebAssembly</span>
        </div>
        <nav className={styles.nav}>
          <a href="https://emscripten.org" target="_blank" rel="noreferrer">
            Emscripten
          </a>
          <a href="https://webassembly.org" target="_blank" rel="noreferrer">
            WebAssembly
          </a>
          <a href="https://github.com" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <span>
          C++ Shell &copy; {new Date().getFullYear()} &mdash; Inspired by{' '}
          <a href="https://cpp.sh" target="_blank" rel="noreferrer">
            cpp.sh
          </a>
        </span>
      </footer>
    </div>
  )
}
