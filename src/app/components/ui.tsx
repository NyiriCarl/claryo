// Reusable UI components. Sizes follow the brief: 52px buttons, 56px inputs,
// 16px card padding and radius, 44px minimum touch targets.
import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, type InputHTMLAttributes } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { AlertTriangle, Check, Clock, Loader2, MoreVertical, X, type LucideIcon } from 'lucide-react';
import { formatMinutes } from '../lib/progress';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ─── Buttons ─────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-ink hover:bg-brand-hover disabled:opacity-50',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-2 disabled:opacity-50',
  ghost: 'bg-transparent text-brand-text hover:bg-brand-soft disabled:opacity-50',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-50',
  success: 'bg-go-strong text-white hover:opacity-90 disabled:opacity-50 [:root[data-theme=dark]_&]:text-[#052e16]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: LucideIcon;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon: Icon, loading, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-2xl text-center font-semibold leading-tight transition-colors select-none disabled:cursor-not-allowed',
        size === 'md' ? 'min-h-[52px] px-5 py-2 text-[16px]' : 'min-h-11 px-4 py-1.5 text-[15px]',
        block && 'w-full',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={18} className="spin shrink-0" aria-hidden /> : Icon ? <Icon size={18} className="shrink-0" aria-hidden /> : null}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, { icon: LucideIcon; label: string } & ButtonHTMLAttributes<HTMLButtonElement>>(function IconButton(
  { icon: Icon, label, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cx('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2', className)}
      {...rest}
    >
      <Icon size={20} aria-hidden />
    </button>
  );
});

// ─── Inputs ──────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  hideLabel?: boolean;
  error?: string | null;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, FieldProps & InputHTMLAttributes<HTMLInputElement>>(function TextField(
  { label, hideLabel, error, hint, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={fid} className={cx('mb-1.5 block t-secondary font-medium text-ink', hideLabel && 'sr-only')}>
        {label}
      </label>
      <input
        ref={ref}
        id={fid}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        className={cx(
          'h-14 w-full rounded-2xl border bg-surface px-4 text-[16px] text-ink placeholder:text-ink-3 outline-none transition-colors',
          error ? 'border-danger' : 'border-line-strong focus:border-brand',
        )}
        {...rest}
      />
      {error ? (
        <p id={`${fid}-err`} role="alert" className="mt-1.5 t-meta text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fid}-hint`} className="mt-1.5 t-meta text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { label, hideLabel, error, hint, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={fid} className={cx('mb-1.5 block t-secondary font-medium text-ink', hideLabel && 'sr-only')}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={fid}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        className={cx(
          'w-full resize-none rounded-2xl border bg-surface px-4 py-3.5 text-[16px] leading-relaxed text-ink placeholder:text-ink-3 outline-none transition-colors',
          error ? 'border-danger' : 'border-line-strong focus:border-brand',
        )}
        {...rest}
      />
      {error ? (
        <p id={`${fid}-err`} role="alert" className="mt-1.5 t-meta text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fid}-hint`} className="mt-1.5 t-meta text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export function Chip({ children, selected, ...rest }: { selected?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        'inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 t-secondary font-medium transition-colors',
        selected ? 'border-brand bg-brand-soft text-brand-text' : 'border-line-strong bg-surface text-ink-2 hover:bg-surface-2',
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── Display ─────────────────────────────────────────────────────────────────

export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]', className)} {...rest}>
      {children}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-ink-2">
      <Loader2 size={20} className="spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function ProgressBar({ value, label, tone = 'brand' }: { value: number; label: string; tone?: 'brand' | 'go' }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <div
        className={cx('h-full rounded-full transition-[width] duration-500 ease-out', tone === 'go' ? 'bg-go' : 'bg-brand')}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/** Duration estimates are always labelled as estimates. */
export function DurationLabel({ minutes, className }: { minutes: number | null; className?: string }) {
  const text = formatMinutes(minutes);
  if (!text) return null;
  return (
    <span className={cx('inline-flex items-center gap-1 t-meta text-ink-3', className)} title="Estimated time">
      <Clock size={13} aria-hidden />
      <span>
        <span className="sr-only">Estimated </span>~{text}
      </span>
    </span>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warn' | 'go' | 'brand' }) {
  const tones = {
    neutral: 'bg-surface-2 text-ink-2',
    warn: 'bg-warn-soft text-warn',
    go: 'bg-go-soft text-go-strong',
    brand: 'bg-brand-soft text-brand-text',
  };
  return <span className={cx('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold', tones[tone])}>{children}</span>;
}

/** Task checkbox: state is shown by a tick and strike-through, not colour alone. */
export function TaskCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
    >
      <span
        className={cx(
          'flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-colors',
          checked ? 'border-go-strong bg-go-strong text-white' : 'border-line-strong bg-surface',
        )}
      >
        {checked && <Check size={16} strokeWidth={3} aria-hidden />}
      </span>
    </button>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-text">
        <Icon size={26} aria-hidden />
      </div>
      <h2 className="t-section text-ink">{title}</h2>
      {body && <p className="mt-2 max-w-[300px] t-secondary text-ink-2">{body}</p>}
      {action && <div className="mt-5 w-full max-w-[300px]">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, body, actions }: { title: string; body: string; actions?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warn-soft text-warn">
        <AlertTriangle size={26} aria-hidden />
      </div>
      <h2 className="t-section text-ink">{title}</h2>
      <p className="mt-2 max-w-[320px] t-secondary text-ink-2">{body}</p>
      {actions && <div className="mt-5 flex w-full max-w-[320px] flex-col gap-2.5">{actions}</div>}
    </div>
  );
}

export function Notice({ tone = 'neutral', children, action }: { tone?: 'neutral' | 'warn' | 'brand'; children: ReactNode; action?: ReactNode }) {
  const tones = { neutral: 'bg-surface-2 text-ink-2', warn: 'bg-warn-soft text-warn', brand: 'bg-brand-soft text-brand-text' };
  return (
    <div className={cx('flex items-center gap-3 rounded-2xl px-4 py-3 t-secondary', tones[tone])}>
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}

// ─── Overlays ────────────────────────────────────────────────────────────────

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--c-overlay)]" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-surface px-5 pt-3 safe-bottom shadow-[var(--shadow-raised)] outline-none"
          aria-describedby={description ? undefined : undefined}
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong" aria-hidden />
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="t-section text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 t-secondary text-ink-2">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <IconButton icon={X} label="Close" className="-mr-2 -mt-1" />
            </Dialog.Close>
          </div>
          <div className="pb-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  destructive,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--c-overlay)]" />
        <Dialog.Content
          role="alertdialog"
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-40px)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-surface p-5 shadow-[var(--shadow-raised)] outline-none"
        >
          <Dialog.Title className="t-section text-ink">{title}</Dialog.Title>
          <Dialog.Description asChild>
            <div className="mt-2 t-secondary text-ink-2">{body}</div>
          </Dialog.Description>
          <div className="mt-5 flex flex-col gap-2.5">
            <Button variant={destructive ? 'danger' : 'primary'} block onClick={onConfirm} loading={busy}>
              {confirmLabel}
            </Button>
            <Dialog.Close asChild>
              <Button variant="secondary" block>
                Cancel
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function OverflowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <IconButton icon={MoreVertical} label={label} onClick={(e) => e.stopPropagation()} />
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[200px] rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-raised)]"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it) => (
            <Dropdown.Item
              key={it.label}
              disabled={it.disabled}
              onSelect={it.onSelect}
              className={cx(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 t-body outline-none data-[highlighted]:bg-surface-2 data-[disabled]:opacity-40',
                it.destructive ? 'text-danger' : 'text-ink',
              )}
            >
              {it.icon && <it.icon size={18} aria-hidden />}
              {it.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

export { cx };
