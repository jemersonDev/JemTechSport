import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X, CircleDot } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { TEAMS, findTeamById, type Team } from "@/lib/teams";

type Props = {
  value: string | null;
  onChange: (team: Team | null) => void;
};

export function TeamCombobox({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = findTeamById(value);

  const grouped = useMemo(() => {
    const groups: Record<string, Team[]> = {};
    for (const t of TEAMS) {
      (groups[t.country] ??= []).push(t);
    }
    return groups;
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between h-12 text-left"
          >
            <span className="flex items-center gap-2 truncate">
              {selected ? (
                <>
                  <img
                    src={selected.badge}
                    alt=""
                    className="w-6 h-6 object-contain"
                    loading="lazy"
                  />
                  <span className="truncate">{selected.name}</span>
                </>
              ) : (
                <>
                  <CircleDot className="w-4 h-4 opacity-50" />
                  <span className="text-muted-foreground">Escolha seu time…</span>
                </>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar time…" />
            <CommandList>
              <CommandEmpty>Nenhum time encontrado.</CommandEmpty>
              {Object.entries(grouped).map(([country, teams]) => (
                <CommandGroup key={country} heading={country}>
                  {teams.map((t) => (
                    <CommandItem
                      key={t.id}
                      value={`${t.name} ${t.country}`}
                      onSelect={() => {
                        onChange(t);
                        setOpen(false);
                      }}
                      className="gap-2"
                    >
                      <img
                        src={t.badge}
                        alt=""
                        className="w-5 h-5 object-contain"
                        loading="lazy"
                      />
                      <span className="flex-1 truncate">{t.name}</span>
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === t.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          aria-label="Limpar time"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
