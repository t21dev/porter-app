import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search by port number' }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses search from anywhere; Escape clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (e.key === '/' && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Only allow numbers
    if (newValue === '' || /^\d*$/.test(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <div className="group relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-subtle transition-colors duration-150 group-focus-within:text-foreground" />
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onChange('');
            inputRef.current?.blur();
          }
        }}
        className="pl-9 pr-10 font-mono tabular placeholder:font-sans"
        aria-label="Search ports"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-subtle transition-colors duration-150 hover:bg-accent hover:text-foreground animate-in fade-in zoom-in-75"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[10px] leading-4 text-subtle transition-opacity duration-150 group-focus-within:opacity-0">
          /
        </kbd>
      )}
    </div>
  );
}
