import { ChevronDown } from "lucide-react";

/** Isi tombol "Apartemen": sama persis untuk tombol pengganti dan pemicu DropdownMenu. */
export function ApartmentsTriggerContent() {
  return (
    <>
      Apartemen
      <ChevronDown
        className="size-4 shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </>
  );
}
