import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import type {
	CatalogEvent,
	CatalogEventPublishState,
	CatalogEventStatus,
	CatalogProgram,
	CreateCatalogEventBody,
	PatchCatalogEventBody,
} from '../types';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { optionalNumberForPatch, optionalTextForPatch } from '../utils/catalogMetadata';
import { isAllowedHubSpotFormUrl } from '../utils/hubspotFormUrl';
import { CalendarPicker } from './pickers/CalendarPicker';
import { SelectPicker } from './pickers/SelectPicker';
import { TimePicker } from './pickers/TimePicker';
import styles from './CatalogEventModal.module.css';

export interface CatalogEventModalProps {
	mode: 'create' | 'edit';
	open: boolean;
	programs: CatalogProgram[];
	event?: CatalogEvent;
	parentProgram?: CatalogProgram | null;
	onCancel: () => void;
	onSave: (body: CreateCatalogEventBody | PatchCatalogEventBody) => Promise<void>;
	/** Edit mode only — archive / unarchive from Event Details Edit event (lock 8 / T081). */
	onArchive?: () => Promise<void>;
}

interface EventFormState {
	programId: string;
	name: string;
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	owner: string;
	location: string;
	capacity: string;
	walkInFormUrl: string;
	status: CatalogEventStatus;
	publishState: CatalogEventPublishState;
}

const NO_PROGRAM_VALUE = '';

/** HubSpot start/end are full datetimes; a date with no time picked defaults to this. */
const DEFAULT_TIME = '09:00';

const STATUS_OPTIONS: Array<{ value: CatalogEventStatus; label: string }> = [
	{ value: 'active', label: 'Active' },
	{ value: 'cancelled', label: 'Cancelled' },
];

const PUBLISH_STATE_OPTIONS: Array<{ value: CatalogEventPublishState; label: string }> = [
	{ value: 'draft', label: 'Draft' },
	{ value: 'published', label: 'Published' },
];

/** CalendarPicker/TimePicker yield `YYYY-MM-DD` / 24h `HH:MM`; HubSpot expects one ISO datetime. */
function combineDateAndTime(date: string, time: string): string {
	const trimmedDate = date.trim();
	if (!trimmedDate) {
		return '';
	}
	const trimmedTime = time.trim() || DEFAULT_TIME;
	return `${trimmedDate}T${trimmedTime}:00.000Z`;
}

function dateInputFromIso(iso: string | undefined): string {
	if (!iso) {
		return '';
	}
	return iso.split('T')[0] ?? iso;
}

function timeInputFromIso(iso: string | undefined): string {
	const match = iso ? /T(\d{2}:\d{2})/.exec(iso) : null;
	return match?.[1] ?? '';
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

function emptyForm(defaultProgramId = NO_PROGRAM_VALUE): EventFormState {
	return {
		programId: defaultProgramId,
		name: '',
		startDate: '',
		startTime: '',
		endDate: '',
		endTime: '',
		owner: '',
		location: '',
		capacity: '',
		walkInFormUrl: '',
		status: 'active',
		publishState: 'draft',
	};
}

function formFromEvent(event: CatalogEvent): EventFormState {
	return {
		programId: event.programId ?? NO_PROGRAM_VALUE,
		name: event.name,
		startDate: dateInputFromIso(event.start),
		startTime: timeInputFromIso(event.start),
		endDate: dateInputFromIso(event.end),
		endTime: timeInputFromIso(event.end),
		owner: event.owner ?? '',
		location: event.location ?? '',
		capacity: event.capacity !== undefined ? String(event.capacity) : '',
		walkInFormUrl: event.walkInFormUrl ?? '',
		status: event.status,
		publishState: event.publishState,
	};
}

function buildCreateBody(form: EventFormState): CreateCatalogEventBody {
	const body: CreateCatalogEventBody = {
		name: form.name.trim(),
		start: combineDateAndTime(form.startDate, form.startTime),
		publishState: form.publishState,
	};
	if (form.programId.trim()) {
		body.programId = form.programId.trim();
	}
	if (form.endDate.trim()) {
		body.end = combineDateAndTime(form.endDate, form.endTime);
	}
	if (form.owner.trim()) {
		body.owner = form.owner.trim();
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
		start: combineDateAndTime(form.startDate, form.startTime),
		status: form.status,
		publishState: form.publishState,
	};

	const end = optionalTextForPatch(event.end, form.endDate ? combineDateAndTime(form.endDate, form.endTime) : '');
	if (end !== undefined) {
		body.end = end;
	}
	const owner = optionalTextForPatch(event.owner, form.owner);
	if (owner !== undefined) {
		body.owner = owner;
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
	onArchive,
}: CatalogEventModalProps) {
	const titleId = useId();
	const subtitleId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);
	const programFieldId = useId();
	const startDateFieldId = useId();
	const startTimeFieldId = useId();
	const endDateFieldId = useId();
	const endTimeFieldId = useId();
	const statusFieldId = useId();
	const publishStateFieldId = useId();
	const nameInputRef = useRef<HTMLInputElement>(null);
	const [form, setForm] = useState<EventFormState>(emptyForm());
	const [saving, setSaving] = useState(false);
	const [archiving, setArchiving] = useState(false);
	const [startError, setStartError] = useState<string | null>(null);
	const [walkInFormUrlError, setWalkInFormUrlError] = useState<string | null>(null);

	const handleEscape = useCallback(() => {
		onCancel();
	}, [onCancel]);

	useModalFocusTrap({ open, containerRef: dialogRef, onEscape: handleEscape });

	useEffect(() => {
		if (!open) {
			return;
		}
		if (mode === 'edit' && event) {
			setForm(formFromEvent(event));
		} else {
			setForm(emptyForm(NO_PROGRAM_VALUE));
		}
		setStartError(null);
		setWalkInFormUrlError(null);
		nameInputRef.current?.focus();
	}, [event, mode, open]);

	if (!open) {
		return null;
	}

	async function handleSubmit(submitEvent: FormEvent) {
		submitEvent.preventDefault();
		if (!form.startDate.trim()) {
			setStartError('Start date is required');
			return;
		}
		setStartError(null);
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

	const title = mode === 'create' ? 'Create Event' : 'Edit Event';
	const subtitle =
		mode === 'edit' ? 'Update details for this event' : 'Add a standalone event or attach it to a program';
	const busy = saving || archiving;
	const activePrograms = programs.filter((program) => !program.archived);
	const programOptions = [
		{ value: NO_PROGRAM_VALUE, label: 'No program' },
		...activePrograms.map((program) => ({ value: program.id, label: program.name })),
	];
	const programDisplayName = parentProgram?.name ?? (event?.programId ? 'Unknown' : 'No program');

	return (
		<div
			className="modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={subtitleId}
			onClick={(clickEvent) => {
				if (clickEvent.target === clickEvent.currentTarget) {
					onCancel();
				}
			}}
		>
			<div ref={dialogRef} className={`modal ${styles.modal}`}>
				<div className={styles.header}>
					<div>
						<h3 id={titleId}>{title}</h3>
						<p id={subtitleId} className={styles.subtitle}>
							{subtitle}
						</p>
					</div>
					<button type="button" className={styles.closeButton} onClick={onCancel} aria-label="Close">
						×
					</button>
				</div>
				<form
					className={styles.form}
					noValidate
					onSubmit={(submitEvent) => void handleSubmit(submitEvent)}
				>
					{mode === 'create' ? (
						<SelectPicker
							id={programFieldId}
							label="Program"
							placeholder="No program"
							value={form.programId}
							options={programOptions}
							onChange={(programId) => setForm((current) => ({ ...current, programId }))}
						/>
					) : (
						<p className={styles.readOnlyProgram}>
							Program: <strong>{programDisplayName}</strong>
						</p>
					)}
					<label>
						Event name
						<input
							ref={nameInputRef}
							value={form.name}
							onChange={(changeEvent) =>
								setForm((current) => ({ ...current, name: changeEvent.target.value }))
							}
							required
						/>
					</label>
					<div className={styles.fieldRow}>
						<CalendarPicker
							id={startDateFieldId}
							label="Start Date"
							value={form.startDate}
							onChange={(startDate) => {
								setStartError(null);
								setForm((current) => ({ ...current, startDate }));
							}}
						/>
						<TimePicker
							id={startTimeFieldId}
							label="Start Time"
							value={form.startTime}
							onChange={(startTime) => setForm((current) => ({ ...current, startTime }))}
						/>
					</div>
					{startError ? (
						<span className={styles.fieldError} role="alert">
							{startError}
						</span>
					) : null}
					<div className={styles.fieldRow}>
						<CalendarPicker
							id={endDateFieldId}
							label="End Date"
							value={form.endDate}
							onChange={(endDate) => setForm((current) => ({ ...current, endDate }))}
						/>
						<TimePicker
							id={endTimeFieldId}
							label="End Time"
							value={form.endTime}
							onChange={(endTime) => setForm((current) => ({ ...current, endTime }))}
						/>
					</div>
					{mode === 'edit' ? (
						<SelectPicker
							id={statusFieldId}
							label="Status"
							placeholder="Select status"
							value={form.status}
							options={STATUS_OPTIONS}
							onChange={(status) =>
								setForm((current) => ({ ...current, status: status as CatalogEventStatus }))
							}
						/>
					) : null}
					<SelectPicker
						id={publishStateFieldId}
						label="Publish state"
						placeholder="Select publish state"
						value={form.publishState}
						options={PUBLISH_STATE_OPTIONS}
						onChange={(publishState) =>
							setForm((current) => ({
								...current,
								publishState: publishState as CatalogEventPublishState,
							}))
						}
					/>
					<label>
						Owner
						<input
							value={form.owner}
							onChange={(changeEvent) => setForm((current) => ({ ...current, owner: changeEvent.target.value }))}
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
						{mode === 'edit' && onArchive && event ? (
							<button
								type="button"
								className={`btn btn-outline ${styles.archiveButton}`}
								onClick={() => void handleArchive()}
								disabled={busy}
							>
								{archiving ? 'Updating…' : event.archived ? 'Unarchive Event' : 'Archive Event'}
							</button>
						) : null}
						<button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
							Cancel
						</button>
						<button type="submit" className="btn btn-primary" disabled={busy}>
							{saving ? 'Saving…' : 'Save Event'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
