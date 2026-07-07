import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import type {
	CatalogEvent,
	CatalogProgram,
	CreateCatalogEventBody,
	PatchCatalogEventBody,
} from '../types';
import { ATTENDANCE_PROPERTY_PRESETS, suggestAttendanceProperty } from '../constants/hubspot';
import { optionalNumberForPatch, optionalTextForPatch } from '../utils/catalogMetadata';
import { isAllowedHubSpotFormUrl } from '../utils/hubspotFormUrl';
import styles from './CatalogEventModal.module.css';

export interface CatalogEventModalProps {
	mode: 'create' | 'edit';
	open: boolean;
	programs: CatalogProgram[];
	event?: CatalogEvent;
	parentProgram?: CatalogProgram;
	onCancel: () => void;
	onSave: (body: CreateCatalogEventBody | PatchCatalogEventBody) => Promise<void>;
}

interface EventFormState {
	programId: string;
	name: string;
	partsAttendedOption: string;
	attendanceProperty: string;
	owner: string;
	description: string;
	date: string;
	location: string;
	capacity: string;
	walkInFormUrl: string;
}

function walkInFormUrlFieldError(url: string): string | null {
	const trimmed = url.trim();
	if (!trimmed) {
		return null;
	}
	if (isAllowedHubSpotFormUrl(trimmed)) {
		return null;
	}

	try {
		const parsed = new URL(trimmed);
		if (parsed.protocol !== 'https:') {
			return 'Walk-in form URL must use HTTPS';
		}
	} catch {
		return 'Walk-in form URL must use HTTPS';
	}

	return 'Walk-in form URL must be a HubSpot form URL';
}

function emptyForm(defaultProgramId = ''): EventFormState {
	return {
		programId: defaultProgramId,
		name: '',
		partsAttendedOption: '',
		attendanceProperty: ATTENDANCE_PROPERTY_PRESETS[0],
		owner: '',
		description: '',
		date: '',
		location: '',
		capacity: '',
		walkInFormUrl: '',
	};
}

function formFromEvent(event: CatalogEvent, programId: string): EventFormState {
	return {
		programId,
		name: event.name,
		partsAttendedOption: event.partsAttendedOption,
		attendanceProperty: event.attendanceProperty ?? ATTENDANCE_PROPERTY_PRESETS[0],
		owner: event.owner ?? '',
		description: event.description ?? '',
		date: event.date ?? '',
		location: event.location ?? '',
		capacity: event.capacity !== undefined ? String(event.capacity) : '',
		walkInFormUrl: event.walkInFormUrl ?? '',
	};
}

function buildCreateBody(form: EventFormState): CreateCatalogEventBody {
	const body: CreateCatalogEventBody = {
		programId: form.programId,
		name: form.name.trim(),
		partsAttendedOption: form.partsAttendedOption.trim(),
		attendanceProperty: form.attendanceProperty.trim(),
	};
	if (form.owner.trim()) {
		body.owner = form.owner.trim();
	}
	if (form.description.trim()) {
		body.description = form.description.trim();
	}
	if (form.date.trim()) {
		body.date = form.date.trim();
	}
	if (form.location.trim()) {
		body.location = form.location.trim();
	}
	if (form.capacity.trim()) {
		const capacity = Number(form.capacity);
		if (Number.isFinite(capacity)) {
			body.capacity = capacity;
		}
	}
	const walkInFormUrl = form.walkInFormUrl.trim();
	if (walkInFormUrl) {
		body.walkInFormUrl = walkInFormUrl;
	}
	return body;
}

function buildPatchBody(event: CatalogEvent, form: EventFormState): PatchCatalogEventBody {
	const body: PatchCatalogEventBody = {
		name: form.name.trim(),
		partsAttendedOption: form.partsAttendedOption.trim(),
		attendanceProperty: form.attendanceProperty.trim(),
	};

	const owner = optionalTextForPatch(event.owner, form.owner);
	if (owner !== undefined) {
		body.owner = owner;
	}
	const description = optionalTextForPatch(event.description, form.description);
	if (description !== undefined) {
		body.description = description;
	}
	const date = optionalTextForPatch(event.date, form.date);
	if (date !== undefined) {
		body.date = date;
	}
	const location = optionalTextForPatch(event.location, form.location);
	if (location !== undefined) {
		body.location = location;
	}
	const capacity = optionalNumberForPatch(event.capacity, form.capacity);
	if (capacity !== undefined) {
		body.capacity = capacity;
	}
	const walkInFormUrl = optionalTextForPatch(event.walkInFormUrl, form.walkInFormUrl);
	if (walkInFormUrl !== undefined) {
		body.walkInFormUrl = walkInFormUrl;
	}

	return body;
}

export function CatalogEventModal({
	mode,
	open,
	programs,
	event,
	parentProgram,
	onCancel,
	onSave,
}: CatalogEventModalProps) {
	const titleId = useId();
	const programLabelId = useId();
	const programListboxId = useId();
	const programTriggerRef = useRef<HTMLButtonElement>(null);
	const nameInputRef = useRef<HTMLInputElement>(null);
	const programFieldRef = useRef<HTMLDivElement>(null);
	const [form, setForm] = useState<EventFormState>(emptyForm());
	const [saving, setSaving] = useState(false);
	const [programMenuOpen, setProgramMenuOpen] = useState(false);
	const [walkInFormUrlError, setWalkInFormUrlError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) {
			return;
		}
		if (mode === 'edit' && event && parentProgram) {
			setForm(formFromEvent(event, parentProgram.id));
		} else {
			setForm(emptyForm(programs[0]?.id ?? ''));
		}
		setProgramMenuOpen(false);
		setWalkInFormUrlError(null);
		if (mode === 'edit') {
			nameInputRef.current?.focus();
		} else {
			programTriggerRef.current?.focus();
		}
	}, [event, mode, open, parentProgram, programs]);

	useEffect(() => {
		if (!programMenuOpen) {
			return;
		}

		function handlePointerDown(pointerEvent: MouseEvent | TouchEvent) {
			const target = pointerEvent.target;
			if (!(target instanceof Node) || !programFieldRef.current?.contains(target)) {
				setProgramMenuOpen(false);
			}
		}

		function handleEscape(keyEvent: KeyboardEvent) {
			if (keyEvent.key === 'Escape') {
				setProgramMenuOpen(false);
			}
		}

		document.addEventListener('mousedown', handlePointerDown);
		document.addEventListener('touchstart', handlePointerDown);
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('mousedown', handlePointerDown);
			document.removeEventListener('touchstart', handlePointerDown);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [programMenuOpen]);

	if (!open) {
		return null;
	}

	async function handleSubmit(submitEvent: FormEvent) {
		submitEvent.preventDefault();
		const walkInUrlError = walkInFormUrlFieldError(form.walkInFormUrl);
		if (walkInUrlError) {
			setWalkInFormUrlError(walkInUrlError);
			return;
		}
		setWalkInFormUrlError(null);
		setSaving(true);
		try {
			if (mode === 'create') {
				await onSave(buildCreateBody(form));
			} else if (event) {
				await onSave(buildPatchBody(event, form));
			}
		} finally {
			setSaving(false);
		}
	}

	const title = mode === 'create' ? 'Create Event' : 'Edit Event';
	const activePrograms = programs.filter((program) => !program.archived);
	const selectedProgramName =
		activePrograms.find((program) => program.id === form.programId)?.name ?? 'Select Program';

	return (
		<div
			className="modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			onClick={(clickEvent) => {
				if (clickEvent.target === clickEvent.currentTarget) {
					onCancel();
				}
			}}
		>
			<div className={`modal ${styles.modal}`}>
				<h3 id={titleId}>{title}</h3>
				<form
					className={styles.form}
					noValidate
					onSubmit={(submitEvent) => void handleSubmit(submitEvent)}
				>
					{mode === 'create' ? (
						<div className={styles.programField} ref={programFieldRef}>
							<span id={programLabelId} className={styles.programFieldLabel}>
								Program
							</span>
							<div className={styles.selectWrap}>
								<button
									type="button"
									ref={programTriggerRef}
									className={styles.programTrigger}
									aria-haspopup="listbox"
									aria-expanded={programMenuOpen}
									aria-labelledby={programLabelId}
									onClick={() => setProgramMenuOpen((current) => !current)}
								>
									{selectedProgramName}
								</button>
								{programMenuOpen ? (
									<ul
										id={programListboxId}
										className={styles.programMenu}
										role="listbox"
										aria-labelledby={programLabelId}
									>
										{activePrograms.map((program) => (
											<li key={program.id} role="none">
												<button
													type="button"
													role="option"
													aria-selected={form.programId === program.id}
													className={styles.programOption}
													onClick={() => {
														setForm((current) => ({ ...current, programId: program.id }));
														setProgramMenuOpen(false);
													}}
												>
													{program.name}
												</button>
											</li>
										))}
									</ul>
								) : null}
							</div>
						</div>
					) : (
						<p className={styles.readOnlyProgram}>
							Program: <strong>{parentProgram?.name ?? 'Unknown'}</strong>
						</p>
					)}
					<label>
						Event name
						<input
							ref={mode === 'edit' ? nameInputRef : undefined}
							value={form.name}
							onChange={(changeEvent) => {
								const name = changeEvent.target.value;
								setForm((current) => ({
									...current,
									name,
									attendanceProperty: name.trim()
										? suggestAttendanceProperty(name)
										: current.attendanceProperty,
								}));
							}}
							required
						/>
					</label>
					<label>
						Parts Attended option
						<input
							value={form.partsAttendedOption}
							onChange={(changeEvent) =>
								setForm((current) => ({ ...current, partsAttendedOption: changeEvent.target.value }))
							}
							required
						/>
					</label>
					<label>
						Attendance property (HubSpot internal name)
						<input
							list="catalog-event-attendance-presets"
							value={form.attendanceProperty}
							onChange={(changeEvent) =>
								setForm((current) => ({ ...current, attendanceProperty: changeEvent.target.value }))
							}
							required
						/>
						<datalist id="catalog-event-attendance-presets">
							{ATTENDANCE_PROPERTY_PRESETS.map((preset) => (
								<option key={preset} value={preset} />
							))}
						</datalist>
					</label>
					<label>
						Owner
						<input
							value={form.owner}
							onChange={(changeEvent) => setForm((current) => ({ ...current, owner: changeEvent.target.value }))}
						/>
					</label>
					<label>
						Description
						<textarea
							value={form.description}
							onChange={(changeEvent) =>
								setForm((current) => ({ ...current, description: changeEvent.target.value }))
							}
							rows={3}
						/>
					</label>
					<label>
						Date
						<input
							type="date"
							value={form.date}
							onChange={(changeEvent) => setForm((current) => ({ ...current, date: changeEvent.target.value }))}
						/>
					</label>
					<label>
						Location
						<input
							value={form.location}
							onChange={(changeEvent) =>
								setForm((current) => ({ ...current, location: changeEvent.target.value }))
							}
						/>
					</label>
					<label>
						Capacity
						<input
							type="number"
							value={form.capacity}
							onChange={(changeEvent) =>
								setForm((current) => ({ ...current, capacity: changeEvent.target.value }))
							}
						/>
					</label>
					<label>
						Walk-in form URL (HubSpot)
						<input
							type="url"
							value={form.walkInFormUrl}
							aria-invalid={walkInFormUrlError ? true : undefined}
							aria-describedby={walkInFormUrlError ? `${titleId}-walk-in-url-error` : undefined}
							onChange={(changeEvent) => {
								setWalkInFormUrlError(null);
								setForm((current) => ({ ...current, walkInFormUrl: changeEvent.target.value }));
							}}
						/>
						{walkInFormUrlError ? (
							<span id={`${titleId}-walk-in-url-error`} className={styles.fieldError} role="alert">
								{walkInFormUrlError}
							</span>
						) : null}
					</label>
					<div className="modal__actions">
						<button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>
							Cancel
						</button>
						<button type="submit" className="btn btn-primary" disabled={saving}>
							{saving ? 'Saving…' : 'Save Event'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
