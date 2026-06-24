"use client";

import { useState, useCallback } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebounce } from "@/hooks/useDebounce";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import type { Ledger } from "@/types";

interface LedgerComboboxProps {
  value?: string;
  onChange: (ledgerId: string, ledger?: Ledger) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function LedgerCombobox({ value, onChange, placeholder = "Select ledger...", disabled, className }: LedgerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dSearch = useDebounce(search, 300);
  const { activeCompany } = useCompanyStore();

  const { data, isLoading } = useQuery({
    queryKey: ["ledgers-combo", activeCompany?.id, dSearch],
    queryFn: async () => {
      if (!activeCompany?.id) return { ledgers: [] };
      const params = new URLSearchParams({ companyId: activeCompany.id });
      if (dSearch) params.set("search", dSearch);
      const res = await fetch(`/api/ledger?${params}`);
      return res.json() as Promise<{ ledgers: Ledger[] }>;
    },
    enabled: !!activeCompany?.id,
  });

  const ledgers = data?.ledgers || [];
  const selected = ledgers.find((l) => l.id === value);

  const handleSelect = useCallback((ledger: Ledger) => {
    onChange(ledger.id, ledger);
    setOpen(false);
    setSearch("");
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between h-9 text-[12px] font-normal", className)}
        >
          <span className="truncate">
            {selected ? selected.name : <span className="text-text-muted">{placeholder}</span>}
          </span>
          <ChevronsUpDown size={12} className="ml-2 shrink-0 text-text-muted" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search ledger..."
            value={search}
            onValueChange={setSearch}
            className="text-[13px]"
          />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-[12px] text-text-muted">Loading...</div>
            ) : (
              <>
                <CommandEmpty>
                  <div className="py-4 text-center">
                    <p className="text-[12px] text-text-muted mb-2">No ledger found</p>
                    <Button size="sm" variant="outline" className="text-[12px] gap-1">
                      <Plus size={12} /> Create &quot;{search}&quot;
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {ledgers.map((ledger) => (
                    <CommandItem
                      key={ledger.id}
                      value={ledger.name}
                      onSelect={() => handleSelect(ledger)}
                      className="text-[12px]"
                    >
                      <Check
                        size={12}
                        className={cn("mr-2", value === ledger.id ? "opacity-100" : "opacity-0")}
                      />
                      <div>
                        <p>{ledger.name}</p>
                        <p className="text-[10px] text-text-muted">{ledger.group?.name}</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
