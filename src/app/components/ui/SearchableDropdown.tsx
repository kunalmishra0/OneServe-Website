import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

interface SearchableDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0); // For keyboard nav
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sort options alphabetically
  const sortedOptions = [...options].sort((a, b) => a.localeCompare(b));

  // Filter based on search
  const filteredOptions = sortedOptions.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase()),
  );

  // Reset highlight when search changes or dropdown opens
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search, open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, open]);

  // Handle keys
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Open dropdown if closed and user types
    if (!open && !disabled) {
      setOpen(true);
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions.length > 0) {
          onChange(filteredOptions[highlightedIndex]);
          setOpen(false);
          setSearch("");
        }
        break;
      case "Escape":
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className={`w-full px-4 py-2.5 border rounded-lg flex items-center justify-between text-left cursor-pointer transition-colors ${
          disabled
            ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-white border-gray-300 hover:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
        }`}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>
          {value || placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </div>

      {open && !disabled && (
        <div
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto outline-none"
          tabIndex={-1} // Make div focusable but not reachable via tab
          onKeyDown={handleKeyDown}
        >
          <div className="p-2 sticky top-0 bg-white border-b border-gray-100">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                // Stop propagation so the parent div doesn't fire handleKeyDown again
                e.stopPropagation();
                handleKeyDown(e);
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="p-1" ref={listRef}>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No results found.
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option}
                  className={`flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer ${
                    index === highlightedIndex
                      ? "bg-blue-100 ring-1 ring-blue-300"
                      : ""
                  } ${
                    value === option
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setSearch("");
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {option}
                  {value === option && <Check className="h-4 w-4" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
