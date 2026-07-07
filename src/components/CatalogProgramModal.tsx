import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CatalogProgram, CreateCatalogProgramBody, PatchCatalogProgramBody } from '../types';
import { parseFormIdsInput, formatFormIdsInput } from '../constants/hubspot';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { optionalTextForPatch } from '../utils/catalogMetadata';
import styles from './CatalogProgramModal.module.css';

export interface CatalogProgramModalProps {
	mode: 'create' | 'edit';
	open: boolean;
	program?: CatalogProgram;
	onCancel: () => void;
	onSave: (body: CreateCatalogProgramBody | PatchCatalogProgramBody) => Promise<void>;
}

interface ProgramFormState {
	name: string;
	hubspotFormIds: string;
	description: string;
	startDate: string;
	endDate: string;
	location: string;
	timezone: string;
}

function emptyForm(): ProgramFormState {
	return {
		name: '',
		hubspotFormIds: '',
		description: '',
		startDate: '',
		endDate: '',
		location: '',
		timezone: '',
	};
}

function formFromProgram(program: CatalogProgram): ProgramFormState {
	return {
		name: program.name,
		hubspotFormIds: formatFormIdsInput(program.hubspotFormIds ?? []),
		description: program.description ?? '',
		startDate: program.startDate ?? '',
		endDate: program.endDate ?? '',
		location: program.location ?? '',
		timezone: program.timezone ?? '',
	};
}

function buildCreateBody(form: ProgramFormState): CreateCatalogProgramBody {
	const formIds = parseFormIdsInput(form.hubspotFormIds);
	const body: CreateCatalogProgramBody = {
		name: form.name.trim(),
		hubspotFormIds: formIds,
	};
	if (formIds[0]) {
		body.hubspotFormId = formIds[0];
	}
	if (form.description.trim()) {
		body.description = form.description.trim();
	}
	if (form.startDate.trim()) {
		body.startDate = form.startDate.trim();
	}
	if (form.endDate.trim()) {
		body.endDate = form.endDate.trim();
	}
	if (form.location.trim()) {
		body.location = form.location.trim();
	}
	if (form.timezone.trim()) {
		body.timezone = form.timezone.trim();
	}
	return body;
}

function buildPatchBody(program: CatalogProgram, form: ProgramFormState): PatchCatalogProgramBody {
	const formIds = parseFormIdsInput(form.hubspotFormIds);
	const body: PatchCatalogProgramBody = {
		name: form.name.trim(),
		hubspotFormIds: formIds,
	};
	if (formIds[0]) {
		body.hubspotFormId = formIds[0];
	}

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
	const location = optionalTextForPatch(program.location, form.location);
	if (location !== undefined) {
		body.location = location;
	}
	const timezone = optionalTextForPatch(program.timezone, form.timezone);
	if (timezone !== undefined) {
		body.timezone = timezone;
	}

	return body;
}

export function CatalogProgramModal({ mode, open, program, onCancel, onSave }: CatalogProgramModalProps) {
	const titleId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);
	const firstFieldRef = useRef<HTMLInputElement>(null);
	const [form, setForm] = useState<ProgramFormState>(emptyForm);
	const [saving, setSaving] = useState(false);

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

	const title = mode === 'create' ? 'Create Program' : 'Edit Program';

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
						HubSpot form IDs (one per line or comma-separated)
						<span className={styles.requiredMark} aria-hidden="true">
							{' '}
							*
						</span>
						<textarea
							value={form.hubspotFormIds}
							onChange={(event) => setForm((current) => ({ ...current, hubspotFormIds: event.target.value }))}
							required
							aria-required="true"
							rows={3}
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
					<label>
						Start date
						<input
							type="date"
							value={form.startDate}
							onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
						/>
					</label>
					<label>
						End date
						<input
							type="date"
							value={form.endDate}
							onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
						/>
					</label>
					<label>
						Location
						<input
							value={form.location}
							onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
						/>
					</label>
					<label>
						Timezone
						<input
							value={form.timezone}
							onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
						/>
					</label>
					<div className="modal__actions">
						<button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>
							Cancel
						</button>
						<button type="submit" className="btn btn-primary" disabled={saving}>
							{saving ? 'Saving…' : 'Save Program'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
