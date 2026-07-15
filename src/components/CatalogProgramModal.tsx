import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CatalogProgram, CreateCatalogProgramBody, PatchCatalogProgramBody } from '../types';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { optionalTextForPatch } from '../utils/catalogMetadata';
import { CalendarPicker } from './pickers/CalendarPicker';
import styles from './CatalogProgramModal.module.css';

export interface CatalogProgramModalProps {
	mode: 'create' | 'edit';
	open: boolean;
	program?: CatalogProgram;
	onCancel: () => void;
	onSave: (body: CreateCatalogProgramBody | PatchCatalogProgramBody) => Promise<void>;
	/** Edit mode only — archive / unarchive from the Program modal (Programs & Events). */
	onArchive?: () => Promise<void>;
}

interface ProgramFormState {
	name: string;
	description: string;
	startDate: string;
	endDate: string;
}

function emptyForm(): ProgramFormState {
	return {
		name: '',
		description: '',
		startDate: '',
		endDate: '',
	};
}

function formFromProgram(program: CatalogProgram): ProgramFormState {
	return {
		name: program.name,
		description: program.description ?? '',
		startDate: program.startDate ?? '',
		endDate: program.endDate ?? '',
	};
}

function buildCreateBody(form: ProgramFormState): CreateCatalogProgramBody {
	const body: CreateCatalogProgramBody = {
		name: form.name.trim(),
	};
	if (form.description.trim()) {
		body.description = form.description.trim();
	}
	if (form.startDate.trim()) {
		body.startDate = form.startDate.trim();
	}
	if (form.endDate.trim()) {
		body.endDate = form.endDate.trim();
	}
	return body;
}

function buildPatchBody(program: CatalogProgram, form: ProgramFormState): PatchCatalogProgramBody {
	const body: PatchCatalogProgramBody = {
		name: form.name.trim(),
	};

	const description = optionalTextForPatch(program.description, form.description);
	if (description !== undefined) {
		body.description = description;
	}
	const startDate = optionalTextForPatch(program.startDate, form.startDate);
	if (startDate !== undefined) {
		body.startDate = startDate;
	}
	const endDate = optionalTextForPatch(program.endDate, form.endDate);
	if (endDate !== undefined) {
		body.endDate = endDate;
	}

	return body;
}

export function CatalogProgramModal({
	mode,
	open,
	program,
	onCancel,
	onSave,
	onArchive,
}: CatalogProgramModalProps) {
	const titleId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);
	const firstFieldRef = useRef<HTMLInputElement>(null);
	const startDateId = useId();
	const endDateId = useId();
	const [form, setForm] = useState<ProgramFormState>(emptyForm);
	const [saving, setSaving] = useState(false);
	const [archiving, setArchiving] = useState(false);

	const handleEscape = useCallback(() => {
		onCancel();
	}, [onCancel]);

	useModalFocusTrap({ open, containerRef: dialogRef, onEscape: handleEscape });

	useEffect(() => {
		if (!open) {
			return;
		}
		setForm(mode === 'edit' && program ? formFromProgram(program) : emptyForm());
		firstFieldRef.current?.focus();
	}, [mode, open, program]);

	if (!open) {
		return null;
	}

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setSaving(true);
		try {
			if (mode === 'create') {
				await onSave(buildCreateBody(form));
			} else if (program) {
				await onSave(buildPatchBody(program, form));
			}
		} finally {
			setSaving(false);
		}
	}

	async function handleArchive() {
		if (!onArchive) {
			return;
		}
		setArchiving(true);
		try {
			await onArchive();
		} finally {
			setArchiving(false);
		}
	}

	const title = mode === 'create' ? 'Create Program' : 'Edit Program';
	const busy = saving || archiving;

	return (
		<div
			className="modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			onClick={(event) => {
				if (event.target === event.currentTarget) {
					onCancel();
				}
			}}
		>
			<div ref={dialogRef} className={`modal ${styles.modal}`}>
				<h3 id={titleId}>{title}</h3>
				<form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
					<label>
						Program name
						<span className={styles.requiredMark} aria-hidden="true">
							{' '}
							*
						</span>
						<input
							ref={firstFieldRef}
							value={form.name}
							onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
							required
							aria-required="true"
						/>
					</label>
					<label>
						Description
						<textarea
							value={form.description}
							onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
							rows={3}
						/>
					</label>
					<CalendarPicker
						id={startDateId}
						label="Start date"
						value={form.startDate}
						onChange={(startDate) => setForm((current) => ({ ...current, startDate }))}
					/>
					<CalendarPicker
						id={endDateId}
						label="End date"
						value={form.endDate}
						onChange={(endDate) => setForm((current) => ({ ...current, endDate }))}
					/>
					<div className="modal__actions">
						{mode === 'edit' && onArchive && program ? (
							<button
								type="button"
								className={`btn btn-outline ${styles.archiveButton}`}
								onClick={() => void handleArchive()}
								disabled={busy}
							>
								{archiving ? 'Updating…' : program.archived ? 'Unarchive Program' : 'Archive Program'}
							</button>
						) : null}
						<button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
							Cancel
						</button>
						<button type="submit" className="btn btn-primary" disabled={busy}>
							{saving ? 'Saving…' : 'Save Program'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
