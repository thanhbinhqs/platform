import { useState, type ReactNode, type FormEvent } from 'react';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose,
  Button, Input, Label,
} from '@platform/ui';
import { cn } from '@platform/ui';

// ─── Field type ──────────────────────────────────────────────────
export interface CrudField {
  name: string;
  label: string;
  type?: 'text' | 'password' | 'email' | 'select' | 'boolean' | 'textarea' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

// ─── Props ───────────────────────────────────────────────────────
interface CrudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: CrudField[];
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  isPending?: boolean;
}

export function CrudDialog({ open, onOpenChange, title, fields, initialValues = {}, onSubmit, isPending }: CrudDialogProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [loading, setLoading] = useState(false);

  // Reset form when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o) setValues({ ...initialValues });
    onOpenChange(o);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await onSubmit(values); } finally { setLoading(false); }
  };

  const set = (name: string, value: any) => setValues(p => ({ ...p, [name]: value }));
  const busy = loading || isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(f => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={`f-${f.name}`}>
                {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
              </Label>
              {f.type === 'select' ? (
                <select
                  id={`f-${f.name}`}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={values[f.name] ?? ''}
                  onChange={e => set(f.name, e.target.value)}
                  required={f.required}
                >
                  <option value="">Select...</option>
                  {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'boolean' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id={`f-${f.name}`}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={!!values[f.name]}
                    onChange={e => set(f.name, e.target.checked)}
                  />
                  <span className="text-sm text-muted-foreground">Enabled</span>
                </label>
              ) : f.type === 'textarea' ? (
                <textarea
                  id={`f-${f.name}`}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={values[f.name] ?? ''}
                  onChange={e => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              ) : (
                <Input
                  id={`f-${f.name}`}
                  type={f.type || 'text'}
                  value={values[f.name] ?? ''}
                  onChange={e => set(f.name, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              )}
            </div>
          ))}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={busy}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Confirm Delete Dialog ───────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  isPending?: boolean;
  variant?: 'danger' | 'warning';
}

export function ConfirmDialog({ open, onOpenChange, title, message, onConfirm, isPending }: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(); onOpenChange(false); } finally { setLoading(false); }
  };
  const busy = loading || isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={busy}>Cancel</Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
