import type { RegistrationAnswerHistoryEntry } from '../types';
import { formatDateTime } from '../utils/format';
import styles from './RegistrationHistoryPanel.module.css';

export interface RegistrationHistoryPanelProps {
	entries: RegistrationAnswerHistoryEntry[];
	headingId: string;
}

/** Pathologically long free-text answers are cut off rather than left to blow out the layout (data-model.md). */
const MAX_ANSWER_DISPLAY_LENGTH = 500;

function formatAnswerValue(value: string | string[]): string {
	const joined = Array.isArray(value) ? value.join(', ') : value;
	return joined.length > MAX_ANSWER_DISPLAY_LENGTH ? `${joined.slice(0, MAX_ANSWER_DISPLAY_LENGTH)}…` : joined;
}

/**
 * Registration history (013-registration-form-bridge, FE-REGFORM-001) — every follow-up answer
 * ever recorded for this Contact+Event, never overwritten by a later submission.
 *
 * `answers` values are free text authored directly by an anonymous public form submitter — the
 * first such surface in this codebase. Rendered with JSX `{text}` only, **never**
 * `dangerouslySetInnerHTML` or any other HTML-interpreting sink (spec FR-007, hard requirement).
 */
export function RegistrationHistoryPanel({ entries, headingId }: RegistrationHistoryPanelProps) {
	return (
		<section aria-labelledby={headingId}>
			<h4 id={headingId} className={styles.sectionTitle}>
				Registration history
			</h4>

			{entries.length === 0 ? (
				<p className={styles.empty}>No registration answers recorded yet.</p>
			) : (
				<ol className={styles.list}>
					{entries.map((entry, index) => (
						<li key={`${entry.observedAt}-${index}`} className={styles.entry}>
							<div className={styles.entryMeta}>
								<span className={styles.entryTimestamp}>{formatDateTime(entry.observedAt)}</span>
							</div>
							<dl className={styles.answers}>
								{Object.entries(entry.answers).map(([question, answer]) => (
									<div key={question} className={styles.answerRow}>
										<dt className={styles.question}>{question}</dt>
										<dd className={styles.answerValue}>{formatAnswerValue(answer)}</dd>
									</div>
								))}
							</dl>
						</li>
					))}
				</ol>
			)}
		</section>
	);
}
