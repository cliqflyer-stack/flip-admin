import React from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductOption } from "@/lib/api-client";

interface ProductOptionsEditorProps {
  value: ProductOption[];
  onChange: (next: ProductOption[]) => void;
}

/** Editable list of product options / variants, e.g. Size: 500 g, Flavour: Original. */
export function ProductOptionsEditor({ value, onChange }: ProductOptionsEditorProps) {
  const update = (idx: number, patch: Partial<ProductOption>) =>
    onChange(value.map((o, i) => (i === idx ? { ...o, ...patch } : o)));

  return (
    <div className="rounded-lg border p-3 bg-muted/10 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Product Options (Optional)</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-[11px] gap-1"
          onClick={() => onChange([...value, { label: "", value: "" }])}
        >
          <Plus className="h-3 w-3" /> Add option
        </Button>
      </div>
      {value.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          e.g. Size: 500 g, Flavour: Original, Pack: 12
        </p>
      )}
      {value.map((opt, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            aria-label={`Option ${idx + 1} name`}
            placeholder="Name (Size)"
            value={opt.label}
            onChange={(e) => update(idx, { label: e.target.value })}
            className="text-xs h-8"
          />
          <Input
            aria-label={`Option ${idx + 1} value`}
            placeholder="Value (500 g)"
            value={opt.value}
            onChange={(e) => update(idx, { value: e.target.value })}
            className="text-xs h-8"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onChange(value.filter((_, i) => i !== idx))}
            aria-label="Remove option"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
