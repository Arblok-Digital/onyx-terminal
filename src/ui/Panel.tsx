/**
 * @file Panel.tsx
 * @layer ui
 * @desc Generic panel chrome — used by every panel. Header is the drag handle
 *       (className="drag-handle") for react-grid-layout.
 * @exposes default Panel
 * @deps -
 */
import type { ReactNode } from "react";
import styles from "./Panel.module.css";

type Props = {
  id: string;
  title: string;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function Panel({ id, title, badge, actions, children }: Props) {
  return (
    <section className={styles.panel} data-panel-id={id}>
      <header className={`${styles.header} drag-handle`}>
        <div className={styles.title}>
          <span className={styles.dot} aria-hidden="true" />
          <span>{title}</span>
          {badge && <span className={styles.badge}>{badge}</span>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
